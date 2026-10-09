"use strict";
/* =====================================================================
   مستشار الدورة الزراعية الذكي
   الجزء 1: البيانات + محرك التقييم + مولّد الخطط + الشرح + الاختبارات
   ⚠️ كل القيم الزراعية هنا تجريبية توضيحية، وليست بيانات زراعية معتمدة.
   ===================================================================== */

const SOILS = ["رملية", "طينية", "طميية", "غرينية"];
const SEASONS = ["شتوي", "صيفي"];
const UNKNOWN = "غير معروف";
const FERT_OPTS = [UNKNOWN, "منخفضة", "متوسطة", "عالية"];
const ORG_OPTS = [UNKNOWN, "منخفضة", "متوسطة", "مرتفعة"];
const WATER_OPTS = ["ري كافي", "ري محدود", "مطري فقط"];
const FERT_LEVEL = { "منخفضة": 1, "متوسطة": 2, "عالية": 3 };
const LEVEL_AR = { 1: "منخفض", 2: "متوسط", 3: "مرتفع" };
const FAMILY_AR = { Poaceae: "النجيلية", Fabaceae: "البقولية", Malvaceae: "الخبازية", Asteraceae: "المركّبة" };
const PRIORITY_LABELS = {
  yield: "زيادة الإنتاجية",
  water: "تقليل استهلاك المياه",
  soil: "تحسين خصوبة التربة",
  fert: "تقليل الحاجة للأسمدة",
  profit: "تعظيم الربح المتوقع"
};
const PRIORITY_KEYS = Object.keys(PRIORITY_LABELS);

const DEFAULT_WEIGHTS = { soil: 15, ph: 15, temp: 15, water: 20, nutrient: 10, rotation: 15, priorities: 10 };
const WEIGHT_LABELS = {
  soil: "توافق نوع التربة",
  ph: "حموضة التربة (pH)",
  temp: "درجة الحرارة",
  water: "المياه والري",
  nutrient: "العناصر الغذائية",
  rotation: "توافق التتابع",
  priorities: "أولويات المزارع"
};

const CROPS = [
  { name: "قمح", family: "Poaceae", season: "شتوي", soils: ["طميية", "طينية", "غرينية"], marginal: ["رملية"], ph: [6.0, 7.8], temp: [10, 25], water: 2, days: 150, nutrient: 2, legume: false, soilEffect: -1, yieldIdx: 4, profitIdx: 3 },
  { name: "برسيم", family: "Fabaceae", season: "شتوي", soils: ["طميية", "طينية", "غرينية"], marginal: ["رملية"], ph: [6.0, 8.0], temp: [8, 27], water: 3, days: 180, nutrient: 1, legume: true, soilEffect: 2, yieldIdx: 4, profitIdx: 3 },
  { name: "فول", family: "Fabaceae", season: "شتوي", soils: ["طميية", "طينية"], marginal: ["غرينية"], ph: [6.0, 8.0], temp: [8, 24], water: 2, days: 150, nutrient: 1, legume: true, soilEffect: 1, yieldIdx: 3, profitIdx: 3 },
  { name: "حمص", family: "Fabaceae", season: "شتوي", soils: ["رملية", "طميية"], marginal: ["غرينية", "طينية"], ph: [6.0, 8.5], temp: [10, 28], water: 1, days: 130, nutrient: 1, legume: true, soilEffect: 1, yieldIdx: 2, profitIdx: 3 },
  { name: "ذرة", family: "Poaceae", season: "صيفي", soils: ["طميية", "غرينية"], marginal: ["طينية", "رملية"], ph: [5.8, 7.5], temp: [18, 32], water: 3, days: 120, nutrient: 3, legume: false, soilEffect: -2, yieldIdx: 5, profitIdx: 4 },
  { name: "أرز", family: "Poaceae", season: "صيفي", soils: ["طينية", "غرينية"], marginal: ["طميية"], ph: [5.5, 7.5], temp: [20, 35], water: 3, days: 140, nutrient: 2, legume: false, soilEffect: -1, yieldIdx: 4, profitIdx: 3 },
  { name: "قطن", family: "Malvaceae", season: "صيفي", soils: ["طميية", "طينية"], marginal: ["غرينية", "رملية"], ph: [5.8, 8.0], temp: [20, 35], water: 2, days: 180, nutrient: 2, legume: false, soilEffect: -1, yieldIdx: 3, profitIdx: 4 },
  { name: "فول الصويا", family: "Fabaceae", season: "صيفي", soils: ["طميية", "غرينية"], marginal: ["طينية", "رملية"], ph: [6.0, 7.5], temp: [20, 32], water: 2, days: 120, nutrient: 1, legume: true, soilEffect: 1, yieldIdx: 3, profitIdx: 3 },
  { name: "ذرة رفيعة", family: "Poaceae", season: "صيفي", soils: ["رملية", "طميية", "طينية"], marginal: ["غرينية"], ph: [5.5, 8.5], temp: [20, 35], water: 1, days: 110, nutrient: 2, legume: false, soilEffect: -1, yieldIdx: 3, profitIdx: 2 },
  { name: "عباد الشمس", family: "Asteraceae", season: "صيفي", soils: ["طميية", "رملية", "غرينية"], marginal: ["طينية"], ph: [6.0, 7.8], temp: [18, 30], water: 2, days: 110, nutrient: 2, legume: false, soilEffect: -1, yieldIdx: 3, profitIdx: 3 }
];
const CROP_NAMES = CROPS.map(c => c.name);

const DEFAULT_FORM = {
  soil: "طميية", ph: 7, fertility: UNKNOWN, organic: UNKNOWN, prev: UNKNOWN,
  temp: 25, rain: 50, water: "ري كافي", season: "صيفي", area: 5,
  excluded: [], preferred: [],
  priorities: { yield: 6, water: 5, soil: 5, fert: 5, profit: 5 }
};

const SAMPLES = [
  { title: "مزرعة طميية — ري كافي", farm: { soil: "طميية", ph: 7.4, fertility: "متوسطة", organic: "متوسطة", prev: "قمح", temp: 28, rain: 5, water: "ري كافي", season: "صيفي", area: 5, excluded: [], preferred: [], priorities: { yield: 8, water: 5, soil: 6, fert: 5, profit: 7 } } },
  { title: "مزرعة رملية — ري محدود", farm: { soil: "رملية", ph: 7.8, fertility: "منخفضة", organic: "منخفضة", prev: "ذرة", temp: 22, rain: 30, water: "ري محدود", season: "شتوي", area: 3, excluded: [], preferred: [], priorities: { yield: 4, water: 9, soil: 8, fert: 7, profit: 5 } } },
  { title: "مزرعة مطرية — بيانات ناقصة", farm: { soil: "طينية", ph: 7.0, fertility: UNKNOWN, organic: UNKNOWN, prev: UNKNOWN, temp: 20, rain: 300, water: "مطري فقط", season: "شتوي", area: 2, excluded: [], preferred: [], priorities: { yield: 5, water: 6, soil: 5, fert: 5, profit: 5 } } }
];

/* ---------- أدوات مساعدة ---------- */
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const round = x => Math.round(x);
const mean = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
const cropByName = n => CROPS.find(c => c.name === n) || null;
const deepClone = o => JSON.parse(JSON.stringify(o));
function devFromRange(v, range) { return v < range[0] ? range[0] - v : (v > range[1] ? v - range[1] : 0); }

/* ---------- الأوزان ---------- */
function normalizeWeights(w) {
  const keys = Object.keys(DEFAULT_WEIGHTS);
  const clean = k => { const v = Number(w[k]); return (isFinite(v) && v > 0) ? v : 0; };
  const sum = keys.reduce((s, k) => s + clean(k), 0);
  if (sum <= 0) return null;
  const out = {};
  keys.forEach(k => { out[k] = clean(k) / sum * 100; });
  return out;
}

/* ---------- التحقق من المدخلات ---------- */
function validateFarm(f) {
  const e = [];
  if (!SOILS.includes(f.soil)) e.push("اختر نوع التربة.");
  if (!isFinite(f.area) || f.area <= 0) e.push("مساحة المزرعة لازم تكون رقماً أكبر من صفر.");
  if (!isFinite(f.ph) || f.ph < 3 || f.ph > 10) e.push("درجة حموضة التربة (pH) لازم تكون بين 3 و 10.");
  if (!isFinite(f.temp) || f.temp < -10 || f.temp > 55) e.push("متوسط الحرارة لازم يكون بين -10 و 55 درجة مئوية.");
  if (!isFinite(f.rain) || f.rain < 0 || f.rain > 3000) e.push("كمية المطر لازم تكون بين 0 و 3000 ملم.");
  if (!SEASONS.includes(f.season)) e.push("اختر الموسم.");
  if (!WATER_OPTS.includes(f.water)) e.push("اختر توفر الري.");
  PRIORITY_KEYS.forEach(k => {
    const v = f.priorities && f.priorities[k];
    if (!isFinite(v) || v < 0 || v > 10) e.push(`أولوية "${PRIORITY_LABELS[k]}" لازم تكون بين 0 و 10.`);
  });
  SEASONS.forEach(s => {
    const left = CROPS.filter(c => c.season === s && !(f.excluded || []).includes(c.name));
    if (left.length === 0) e.push(`استبعدت كل محاصيل الموسم ${s}. اترك محصولاً واحداً على الأقل.`);
  });
  return e;
}

/* ---------- المياه المتاحة ---------- */
function waterSupply(farm, slotSeason) {
  if (farm.water === "ري كافي") return 3;
  if (farm.water === "ري محدود") return 2;
  if (slotSeason !== farm.season) return null;
  return farm.rain >= 400 ? 3 : (farm.rain >= 200 ? 2 : 1);
}

/* ---------- الفلاتر الصارمة ---------- */
function hardFilter(crop, farm, slotSeason) {
  if (crop.season !== slotSeason) return "خارج الموسم";
  if ((farm.excluded || []).includes(crop.name)) return "مستبعد بواسطتك";
  if (!crop.soils.includes(farm.soil) && !crop.marginal.includes(farm.soil)) return `لا يناسب تربة ${farm.soil}`;
  if (devFromRange(farm.ph, crop.ph) > 1.5) return `الحموضة (${farm.ph}) بعيدة عن نطاقه (${crop.ph[0]}–${crop.ph[1]})`;
  if (slotSeason === farm.season && devFromRange(farm.temp, crop.temp) > 8) return `الحرارة (${farm.temp}°م) بعيدة عن نطاقه (${crop.temp[0]}–${crop.temp[1]}°م)`;
  const sup = waterSupply(farm, slotSeason);
  if (sup !== null && crop.water - sup >= 2) return "احتياجه للمياه أعلى بكثير من المتاح";
  return null;
}

/* ---------- توافق التتابع ---------- */
function rotationScore(crop, prev) {
  if (!prev) return null;
  if (crop.name === prev.name) return 0;
  let s = crop.family === prev.family ? 30 : 80;
  if (crop.legume && !prev.legume) s += 20;
  if (!crop.legume && crop.nutrient === 3 && prev.legume) s += 20;
  if (crop.nutrient === 3 && prev.nutrient === 3) s -= 15;
  return clamp(s, 0, 100);
}

/* ---------- أولويات المزارع ---------- */
function priorityScore(crop, farm) {
  const p = farm.priorities || {};
  const metric = {
    yield: crop.yieldIdx / 5 * 100,
    water: (4 - crop.water) / 3 * 100,
    soil: (crop.soilEffect + 2) / 4 * 100,
    fert: (3 - crop.nutrient) / 2 * 100,
    profit: crop.profitIdx / 5 * 100
  };
  let num = 0, den = 0;
  PRIORITY_KEYS.forEach(k => { const v = Number(p[k]) || 0; num += v * metric[k]; den += v; });
  let s = den > 0 ? num / den : 50;
  if ((farm.preferred || []).includes(crop.name)) s += 15;
  return clamp(s, 0, 100);
}

/* ---------- تقييم محصول واحد ---------- */
function evalCrop(crop, farm, w, prev, slotSeason) {
  const comps = {};
  comps.soil = { score: crop.soils.includes(farm.soil) ? 100 : 60 };
  comps.ph = { score: clamp(100 - devFromRange(farm.ph, crop.ph) * 50, 0, 100) };
  comps.temp = { score: slotSeason === farm.season ? clamp(100 - devFromRange(farm.temp, crop.temp) * 12, 0, 100) : null };
  const sup = waterSupply(farm, slotSeason);
  comps.water = { score: sup === null ? null : (crop.water <= sup ? 100 : clamp(100 - (crop.water - sup) * 45, 0, 100)) };
  const fl = FERT_LEVEL[farm.fertility];
  comps.nutrient = { score: fl ? (fl >= crop.nutrient ? 100 : clamp(100 - (crop.nutrient - fl) * 45, 0, 100)) : null };
  comps.rotation = { score: rotationScore(crop, prev) };
  comps.priorities = { score: priorityScore(crop, farm) };
  let num = 0, den = 0, all = 0;
  Object.keys(w).forEach(k => {
    all += w[k];
    const s = comps[k].score;
    if (s !== null) { num += w[k] * s; den += w[k]; }
  });
  return { crop, comps, prev, slotSeason, total: den ? num / den : 0, confidence: all ? den / all * 100 : 0 };
}

/* ---------- توليد الخطط ---------- */
function hamming(a, b) {
  let d = 0;
  for (let i = 0; i < a.cycles.length; i++) if (a.cycles[i].crop.name !== b.cycles[i].crop.name) d++;
  return d;
}

function buildPlan(seq, evals) {
  const water = mean(seq.map(c => c.water));
  const soil = mean(seq.map(c => c.soilEffect));
  return {
    cycles: seq.map((crop, i) => ({ crop, season: evals[i].slotSeason, eval: evals[i] })),
    score: mean(evals.map(e => e.total)),
    confidence: mean(evals.map(e => e.confidence)),
    waterAvg: water,
    waterClass: water < 1.67 ? "منخفض" : (water < 2.34 ? "متوسط" : "مرتفع"),
    soilAvg: soil,
    soilClass: soil > 0.25 ? "محسّن للخصوبة" : (soil < -0.25 ? "مستنزف نسبياً" : "متوازن"),
    legumeCount: seq.filter(c => c.legume).length
  };
}

function generatePlans(farm, weights) {
  const w = normalizeWeights(weights);
  if (!w) return { plans: [], error: "مجموع الأوزان لازم يكون أكبر من صفر." };
  const prev0 = cropByName(farm.prev);
  const other = farm.season === "شتوي" ? "صيفي" : "شتوي";

  const bySeason = {};
  for (const s of SEASONS) {
    bySeason[s] = CROPS.filter(c => hardFilter(c, farm, s) === null);
    if (bySeason[s].length === 0) {
      const reasons = CROPS.filter(c => c.season === s).map(c => `• ${c.name}: ${hardFilter(c, farm, s)}`).join("\n");
      return { plans: [], error: `لا يوجد محصول مناسب لموسم ${s} بعد تطبيق القيود:\n${reasons}\nجرّب تعديل المدخلات (الري، الحموضة، المحاصيل المستبعدة).` };
    }
  }

  for (const n of [4, 3]) {
    const seasons = Array.from({ length: n }, (_, i) => i % 2 === 0 ? farm.season : other);
    const memo = new Map();
    const scoreFor = (crop, prev, slot) => {
      const key = crop.name + "|" + (prev ? prev.name : "-");
      if (!memo.has(key)) memo.set(key, evalCrop(crop, farm, w, prev, seasons[slot]));
      return memo.get(key);
    };
    const all = [];
    const seq = [], evals = [];
    const dfs = slot => {
      if (slot === n) { all.push(buildPlan(seq.slice(), evals.slice())); return; }
      const prev = slot === 0 ? prev0 : seq[slot - 1];
      for (const crop of bySeason[seasons[slot]]) {
        if (seq.some(c => c.name === crop.name)) continue;
        const ev = scoreFor(crop, prev, slot);
        const rs = ev.comps.rotation.score;
        if (rs !== null && rs < 25) continue;
        seq.push(crop); evals.push(ev);
        dfs(slot + 1);
        seq.pop(); evals.pop();
      }
    };
    dfs(0);
    if (all.length === 0) continue;

    all.sort((a, b) => b.score - a.score);
    const chosen = [];
    for (const p of all) {
      if (chosen.length >= 3) break;
      if (chosen.every(c => hamming(c, p) >= 2)) chosen.push(p);
    }
    let note = n === 3 ? "تم تكوين خطط من 3 دورات فقط لأن القيود الحالية لا تسمح بـ 4 دورات متتالية." : "";
    if (chosen.length < 2) {
      for (const p of all) {
        if (chosen.length >= 2) break;
        if (!chosen.includes(p) && hamming(chosen[0], p) >= 1) chosen.push(p);
      }
      note += (note ? " " : "") + "الخيارات المتاحة محدودة بسبب القيود، لذلك الخطط متقاربة.";
    }

    const ORD = ["الأولى", "الثانية", "الثالثة"];
    chosen.forEach((p, i) => { p.name = "الخطة " + ORD[i]; p.tag = i === 0 ? "الأعلى ملاءمة" : "بديل متنوع"; });
    if (chosen.length > 1) {
      let iW = 0, iS = 0;
      chosen.forEach((p, i) => { if (p.waterAvg < chosen[iW].waterAvg) iW = i; if (p.soilAvg > chosen[iS].soilAvg) iS = i; });
      if (iW > 0 && chosen[iW].waterAvg < chosen[0].waterAvg) chosen[iW].tag = "الأقل استهلاكاً للمياه";
      if (iS > 0 && iS !== iW && chosen[iS].soilAvg > chosen[0].soilAvg) chosen[iS].tag = "الأفضل لتحسين الخصوبة";
    }
    return { plans: chosen, error: null, note, cycles: n };
  }
  return { plans: [], error: "لا يمكن تكوين تتابع بمحاصيل مختلفة في كل دورة مع القيود الحالية. جرّب تقليل المحاصيل المستبعدة أو تحسين توفر الري." };
}

/* ---------- الشرح ---------- */
function describePlan(plan, farm) {
  const crops = plan.cycles.map(c => c.crop);
  const why = [], benefits = [], risks = [], lowered = [], seen = new Set();
  const add = (text, tip) => { if (!seen.has(text)) { seen.add(text); lowered.push({ text, tip }); } };

  const fullSoil = crops.filter(c => c.soils.includes(farm.soil)).length;
  why.push(fullSoil === crops.length
    ? `كل محاصيل الخطة مناسبة لنوع التربة (${farm.soil}) حسب بيانات المشروع.`
    : `${fullSoil} من ${crops.length} محاصيل مناسبة تماماً لتربة ${farm.soil}، والباقي مناسب جزئياً.`);
  const phOk = crops.filter(c => devFromRange(farm.ph, c.ph) === 0).length;
  why.push(`درجة الحموضة (${farm.ph}) داخل النطاق المفضل لـ ${phOk} من ${crops.length} محاصيل.`);

  const ws = plan.cycles.map(c => c.eval.comps.water.score).filter(s => s !== null);
  if (ws.length) {
    why.push(ws.every(s => s === 100)
      ? `احتياج الخطة للمياه (${plan.waterClass}) متوافق مع المتاح (${farm.water}).`
      : `احتياج الخطة للمياه (${plan.waterClass}) متوافق جزئياً فقط مع المتاح (${farm.water}).`);
  }
  const legs = crops.filter(c => c.legume).map(c => c.name);
  if (legs.length) {
    why.push(`وجود محصول بقولي (${legs.join("، ")}) قد يساعد في إدارة النيتروجين عندما يأتي في موضعه المناسب من التتابع.`);
    benefits.push("إدخال محاصيل بقولية قد يدعم إدارة النيتروجين.");
  }
  const fams = [...new Set(crops.map(c => FAMILY_AR[c.family]))];
  if (fams.length >= 2) {
    why.push(`تنويع العائلات النباتية (${fams.join("، ")}) قد يقلل بعض مخاطر الأمراض المرتبطة بتكرار نفس العائلة، حسب الظروف المحلية.`);
    benefits.push(`تنوّع العائلات النباتية (${fams.length} عائلات).`);
  }
  const first = plan.cycles[0];
  if (first.eval.prev && first.eval.comps.rotation.score >= 80) {
    why.push(`المحصول الأول (${first.crop.name}) يتوافق مع المحصول السابق (${first.eval.prev.name}).`);
  }
  const top = Object.entries(farm.priorities || {}).filter(e => e[1] > 0).sort((a, b) => b[1] - a[1]).slice(0, 2);
  if (top.length) why.push(`راعينا أولوياتك الأعلى: ${top.map(e => `${PRIORITY_LABELS[e[0]]} (${e[1]}/10)`).join("، ")}.`);

  if (plan.soilAvg > 0.25) benefits.push("مؤشر الأثر على الخصوبة إيجابي (مؤشر توضيحي وليس قياساً).");
  if (plan.waterClass === "منخفض") benefits.push("احتياج مياه منخفض نسبياً.");
  if (!benefits.length) benefits.push("خطة متوازنة دون ميزة بارزة واحدة.");

  plan.cycles.forEach(c => {
    const cr = c.crop, k = c.eval.comps, prev = c.eval.prev;
    if (cr.water === 3) risks.push(`${cr.name}: استهلاك مياه مرتفع.`);
    if (cr.nutrient === 3) risks.push(`${cr.name}: احتياج مرتفع للعناصر الغذائية.`);
    if (cr.soilEffect <= -2) risks.push(`${cr.name}: قد يستنزف خصوبة التربة.`);

    if (k.soil.score < 80) add(`${cr.name}: مناسب جزئياً فقط لتربة ${farm.soil}`, "اختر محصولاً أنسب للتربة أو حسّن التربة.");
    if (k.ph.score < 80) add(`${cr.name}: حموضة التربة (${farm.ph}) خارج نطاقه المفضل (${cr.ph[0]}–${cr.ph[1]})`, "راجع تحليل التربة وصحّح الحموضة إن أمكن.");
    if (k.temp.score !== null && k.temp.score < 80) add(`${cr.name}: الحرارة (${farm.temp}°م) خارج نطاقه المفضل (${cr.temp[0]}–${cr.temp[1]}°م)`, "جرّب موسماً أنسب أو محصولاً أقل حساسية للحرارة.");
    if (k.water.score !== null && k.water.score < 80) add(`${cr.name}: احتياجه للمياه (${LEVEL_AR[cr.water]}) أعلى من المتاح (${farm.water})`, "زِد توفر الري أو اختر محصولاً أقل استهلاكاً للمياه.");
    if (k.nutrient.score !== null && k.nutrient.score < 80) add(`${cr.name}: احتياجه للعناصر الغذائية (${LEVEL_AR[cr.nutrient]}) أعلى من خصوبة التربة (${farm.fertility})`, "خطّط لتسميد مناسب أو ابدأ بمحصول بقولي لتحسين الخصوبة.");
    if (k.rotation.score !== null && k.rotation.score < 80 && prev) {
      add(`${cr.name} بعد ${prev.name}: ${cr.family === prev.family ? "من نفس العائلة النباتية (احتمال انتقال أمراض التربة)" : "تتابع أقل توافقاً"}`, "بدّل المحصول بآخر من عائلة مختلفة إن أمكن.");
    }
  });
  if (plan.confidence < 75) risks.push("ثقة التقييم منخفضة بسبب بيانات ناقصة.");
  risks.push("القيم المستخدمة تجريبية وليست بيانات زراعية معتمدة.");

  const uncertainty = [];
  if (farm.fertility === UNKNOWN) uncertainty.push("خصوبة التربة غير معروفة، فلم يُقيَّم توافق العناصر الغذائية. أدخلها لرفع الثقة.");
  if (!farm.prev || farm.prev === UNKNOWN) uncertainty.push("المحصول السابق غير معروف، فلم يُقيَّم توافق أول محصول. أدخله لرفع الثقة.");
  uncertainty.push(`الحرارة المُدخلة تخص الموسم ${farm.season} فقط، ولم تُقيَّم للمواسم الأخرى.`);
  if (farm.water === "مطري فقط") uncertainty.push(`المطر المُدخل يخص الموسم ${farm.season} فقط، فلم يُقيَّم توفر المياه للمواسم الأخرى.`);

  return { why, benefits, risks: [...new Set(risks)], lowered: lowered.slice(0, 8), uncertainty };
}

function compareText(plans) {
  if (plans.length < 2) return [];
  const b = plans[0];
  return plans.slice(1).map(p => {
    const d = round(b.score - p.score);
    const extras = [];
    if (p.waterAvg < b.waterAvg - 0.01) extras.push("أقل استهلاكاً للمياه");
    if (p.soilAvg > b.soilAvg + 0.01) extras.push("أفضل لخصوبة التربة");
    if (p.legumeCount > b.legumeCount) extras.push("أكثر اعتماداً على المحاصيل البقولية");
    return `${p.name}: ${d > 0 ? `أقل بـ ${d} نقطة من ${b.name}` : `قريبة جداً من ${b.name} في الدرجة`}${extras.length ? "، لكنها " + extras.join(" و") : ""}.`;
  });
}

/* ---------- اختبارات ذاتية ---------- */
function runTests() {
  const T = [];
  const t = (name, fn) => { try { T.push({ name, ok: !!fn() }); } catch (e) { T.push({ name, ok: false }); } };
  const C = cropByName;
  const farm = deepClone(SAMPLES[0].farm);
  const w = normalizeWeights(DEFAULT_WEIGHTS);

  t("تطبيع الأوزان يعطي مجموعاً = 100", () => Math.abs(Object.values(normalizeWeights({ soil: 3, ph: 1, temp: 1, water: 1, nutrient: 1, rotation: 1, priorities: 1 })).reduce((a, b) => a + b, 0) - 100) < 1e-9);
  t("الأوزان الصفرية مرفوضة", () => normalizeWeights({ soil: 0, ph: 0, temp: 0, water: 0, nutrient: 0, rotation: 0, priorities: 0 }) === null);
  t("تكرار نفس المحصول يعطي توافق تتابع = 0", () => rotationScore(C("قمح"), C("قمح")) === 0);
  t("بقولي بعد نجيلي أفضل من نجيلي بعد نجيلي", () => rotationScore(C("فول الصويا"), C("ذرة")) > rotationScore(C("ذرة رفيعة"), C("ذرة")));
  t("توافق التتابع مجهول عند غياب المحصول السابق", () => rotationScore(C("قمح"), null) === null);
  t("كل الدرجات بين 0 و 100", () => CROPS.every(c => { const e = evalCrop(c, farm, w, C("قمح"), c.season); return e.total >= 0 && e.total <= 100 && e.confidence > 0 && e.confidence <= 100; }));
  t("نقص بيانات الخصوبة يقلل الثقة", () => evalCrop(C("ذرة"), { ...farm, fertility: UNKNOWN }, w, C("قمح"), "صيفي").confidence < evalCrop(C("ذرة"), farm, w, C("قمح"), "صيفي").confidence);
  t("الفلتر يستبعد المحصول المستبعد", () => hardFilter(C("ذرة"), { ...farm, excluded: ["ذرة"] }, "صيفي") !== null);
  t("الفلتر يستبعد محصولاً خارج الموسم", () => hardFilter(C("قمح"), farm, "صيفي") !== null);
  t("التحقق يرفض مساحة سالبة", () => validateFarm({ ...farm, area: -1 }).length > 0);
  t("التحقق يقبل مزرعة سليمة", () => validateFarm(farm).length === 0);

  SAMPLES.forEach((s, idx) => {
    const r = generatePlans(deepClone(s.farm), DEFAULT_WEIGHTS);
    t(`المثال ${idx + 1}: يُنتج خطتين إلى ثلاث`, () => r.plans.length >= 2 && r.plans.length <= 3);
    t(`المثال ${idx + 1}: لا تكرار للمحصول والمواسم متعاقبة`, () => r.plans.every(p => new Set(p.cycles.map(c => c.crop.name)).size === p.cycles.length && p.cycles.every((c, i) => c.season === (i % 2 === 0 ? s.farm.season : (s.farm.season === "شتوي" ? "صيفي" : "شتوي")))));
    t(`المثال ${idx + 1}: الخطط مختلفة فعلاً`, () => r.plans.every((p, i) => r.plans.every((q, j) => i === j || hamming(p, q) >= 1)));
    t(`المثال ${idx + 1}: كل تتابع مقبول زراعياً`, () => r.plans.every(p => p.cycles.every(c => c.eval.comps.rotation.score === null || c.eval.comps.rotation.score >= 25)));
  });
  t("لا خطط عند استبعاد كل محاصيل موسم", () => generatePlans({ ...farm, excluded: CROPS.filter(c => c.season === "شتوي").map(c => c.name) }, DEFAULT_WEIGHTS).plans.length === 0);
  return T;
}

/* =====================================================================
   الجزء 2: واجهة المستخدم (الصفحات، الرسومات، الحفظ، التصدير)
   ===================================================================== */

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
const opts = (list, sel) => list.map(v => `<option${v === sel ? " selected" : ""}>${esc(v)}</option>`).join("");
const msg = (type, text) => `<div class="msg ${type}">${text}</div>`;
const scoreClass = s => s >= 75 ? "good" : (s >= 55 ? "mid" : "low");

function store(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); return true; } catch (e) { return false; } }
function load(key, def) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch (e) { return def; } }

const PAGES = [
  ["home", "🏠 الرئيسية"], ["assessment", "📋 تقييم المزرعة"], ["recs", "🌱 التوصيات"],
  ["compare", "⚖️ مقارنة الخطط"], ["crops", "🌾 قاعدة المحاصيل"],
  ["method", "📖 المنهجية"], ["saved", "💾 الخطط المحفوظة"]
];

const state = {
  page: "home",
  form: load("cra_form", null) || deepClone(DEFAULT_FORM),
  weights: load("cra_weights", null) || { ...DEFAULT_WEIGHTS },
  farm: load("cra_farm", null),
  result: null,
  saved: load("cra_saved", []),
  filter: { season: "الكل", soil: "الكل", q: "" },
  tests: null,
  weather: null
};

function ensureResult() {
  if (!state.result && state.farm) {
    try { state.result = generatePlans(state.farm, state.weights); }
    catch (e) { console.error(e); state.result = { plans: [], error: "حدث خطأ أثناء الحساب. أعد إدخال بيانات المزرعة." }; }
  }
}

/* ---------- الرسومات ---------- */
function bars(items, max, unit) {
  return `<div class="bars">` + items.map(i => `
    <div class="bar-row">
      <span class="bar-label">${esc(i.label)}</span>
      <div class="bar-track"><div class="bar-fill ${i.cls || ""}" style="width:${clamp(i.value / max * 100, 0, 100)}%"></div></div>
      <span class="bar-val">${i.text !== undefined ? esc(i.text) : round(i.value) + (unit || "")}</span>
    </div>`).join("") + `</div>`;
}

function timeline(plan) {
  return `<div class="timeline">` + plan.cycles.map((c, i) => `
    <div class="tl-item ${c.season === "شتوي" ? "winter" : "summer"}">
      <div class="tl-n">الدورة ${i + 1} • ${c.season === "شتوي" ? "❄️" : "☀️"} ${c.season}</div>
      <div class="tl-crop">${esc(c.crop.name)}</div>
      <div class="tl-meta">حوالي ${c.crop.days} يوماً</div>
      <div class="tl-score ${scoreClass(c.eval.total)}">${round(c.eval.total)}/100</div>
    </div>`).join(`<div class="tl-arrow">⟵</div>`) + `</div>`;
}

function compCell(s) { return s === null ? `<td class="na">—</td>` : `<td class="${scoreClass(s)}">${round(s)}</td>`; }

function detailTable(plan) {
  return `<details><summary>تفاصيل درجات كل محصول (شفافية الحساب)</summary>
    <div class="table-wrap"><table class="tbl">
    <thead><tr><th>المحصول</th>${Object.keys(DEFAULT_WEIGHTS).map(k => `<th>${WEIGHT_LABELS[k]}</th>`).join("")}<th>الدرجة</th><th>الثقة</th></tr></thead>
    <tbody>${plan.cycles.map(c => `<tr><td><b>${esc(c.crop.name)}</b></td>${Object.keys(DEFAULT_WEIGHTS).map(k => compCell(c.eval.comps[k].score)).join("")}<td><b>${round(c.eval.total)}</b></td><td>${round(c.eval.confidence)}%</td></tr>`).join("")}</tbody>
    </table></div>
    <p class="muted">الخلية "—" تعني أن المعلومة غير متوفرة، فلم تدخل في الحساب وانخفضت الثقة.</p></details>`;
}

function listHtml(arr) { return `<ul>${arr.map(x => `<li>${esc(x)}</li>`).join("")}</ul>`; }

function planCard(plan, farm) {
  const d = describePlan(plan, farm);
  return `<article class="card plan">
    <div class="plan-head">
      <div><h2>${esc(plan.name)}</h2><span class="badge">${esc(plan.tag)}</span></div>
      <div class="score-ring ${scoreClass(plan.score)}"><b>${round(plan.score)}</b><small>من 100</small></div>
    </div>
    ${timeline(plan)}
    <div class="metrics">
      <div><small>الثقة في التقييم</small><b>${round(plan.confidence)}%</b></div>
      <div><small>احتياج المياه</small><b>${plan.waterClass}</b></div>
      <div><small>أثر الخصوبة (مؤشر)</small><b>${plan.soilClass}</b></div>
      <div><small>محاصيل بقولية</small><b>${plan.legumeCount}</b></div>
    </div>
    <h3>✅ الفوائد الرئيسية</h3>${listHtml(d.benefits)}
    <h3>⚠️ المخاطر والقيود</h3>${listHtml(d.risks)}
    <h3>💡 لماذا هذه الخطة مناسبة؟</h3>${listHtml(d.why)}
    <h3>📉 عوامل خفّضت الدرجة وكيف تحسّنها</h3>
    ${d.lowered.length ? `<ul>${d.lowered.map(l => `<li>${esc(l.text)}<br><span class="tip">كيف تحسّنها: ${esc(l.tip)}</span></li>`).join("")}</ul>` : `<p class="muted">لا توجد عوامل كبيرة خفّضت الدرجة.</p>`}
    ${d.uncertainty.length ? `<h3>❓ ما الذي يقلل الثقة؟</h3>${listHtml(d.uncertainty)}` : ""}
    ${detailTable(plan)}
  </article>`;
}

function farmSummary(f) {
  const rows = [
    ["نوع التربة", f.soil], ["pH", f.ph], ["الخصوبة", f.fertility], ["المادة العضوية", f.organic],
    ["المحصول السابق", f.prev], ["الموسم", f.season], ["الحرارة", f.temp + " °م"], ["المطر المتوقع", f.rain + " ملم"],
    ["الري", f.water], ["المساحة", f.area + " فدان"],
    ["محاصيل مفضلة", (f.preferred || []).join("، ") || "—"], ["محاصيل مستبعدة", (f.excluded || []).join("، ") || "—"]
  ];
  return `<div class="card"><h2>📌 ملخص بيانات المزرعة</h2><div class="kv">${rows.map(r => `<div><small>${r[0]}</small><b>${esc(r[1])}</b></div>`).join("")}</div></div>`;
}

function noFarm() {
  return `<h1>لسه مفيش بيانات</h1>${msg("info", "ابدأ بإدخال بيانات المزرعة عشان نطلّع الخطط.")}
    <button class="btn" onclick="navigate('assessment')">اذهب إلى تقييم المزرعة</button>`;
}

/* ---------- الصفحات ---------- */
function pageHome() {
  ensureResult();
  const r = state.result;
  let h = `<h1>🌾 مستشار الدورة الزراعية الذكي</h1>
    <div class="card hero">
      <p>يساعدك على اختيار وتقارن 2–3 خطط دورة زراعية مناسبة لمزرعتك حسب التربة والمناخ والمياه وأولوياتك، مع شرح واضح لسبب كل توصية.</p>
      ${msg("warn", "⚠️ كل البيانات الزراعية في المشروع تجريبية للعرض فقط، وليست توصيات زراعية معتمدة. راجع مهندساً زراعياً قبل أي قرار.")}
      <div class="actions">
        <button class="btn" onclick="navigate('assessment')">ابدأ تقييم المزرعة</button>
        ${r && r.plans.length ? `<button class="btn alt" onclick="navigate('recs')">عرض التوصيات</button>` : ""}
      </div>
    </div>`;
  if (state.farm) h += farmSummary(state.farm);
  if (r && r.plans.length) {
    const best = r.plans[0];
    h += `<div class="card"><h2>🏆 أفضل خطة حالياً: ${esc(best.name)}</h2>${timeline(best)}
      <div class="metrics"><div><small>الدرجة</small><b>${round(best.score)}/100</b></div><div><small>الثقة</small><b>${round(best.confidence)}%</b></div><div><small>المياه</small><b>${best.waterClass}</b></div><div><small>الخصوبة</small><b>${best.soilClass}</b></div></div></div>
      <div class="card"><h2>📊 مقارنة الخطط</h2>
      <h3>الدرجة الكلية (من 100)</h3>${bars(r.plans.map(p => ({ label: p.name, value: p.score, cls: scoreClass(p.score) })), 100)}
      <h3>احتياج المياه (1 منخفض – 3 مرتفع، مؤشر تقريبي)</h3>${bars(r.plans.map(p => ({ label: p.name, value: p.waterAvg, text: p.waterClass })), 3)}
      </div>`;
  } else if (state.farm && r && r.error) {
    h += msg("error", esc(r.error).replace(/\n/g, "<br>"));
  }
  return h;
}

function cropSelectRows() {
  const f = state.form;
  return CROPS.map((c, i) => {
    const v = (f.excluded || []).includes(c.name) ? "x" : ((f.preferred || []).includes(c.name) ? "p" : "n");
    return `<div class="crop-pick"><span>${esc(c.name)} <small>(${c.season})</small></span>
      <select id="c_${i}"><option value="n"${v === "n" ? " selected" : ""}>عادي</option><option value="p"${v === "p" ? " selected" : ""}>مفضّل</option><option value="x"${v === "x" ? " selected" : ""}>مستبعد</option></select></div>`;
  }).join("");
}

function pageAssessment() {
  const f = state.form, w = state.weights;
  const nw = normalizeWeights(w);
  return `<h1>📋 تقييم المزرعة</h1>
  <div class="card">
    <h3>تحميل مثال تجريبي</h3>
    <div class="actions">${SAMPLES.map((s, i) => `<button class="btn ghost" onclick="loadSample(${i})">${esc(s.title)}</button>`).join("")}</div>
  </div>
  <div class="card">
    <h2>🪨 التربة</h2>
    <div class="grid">
      <div><label for="f_soil">نوع التربة</label><select id="f_soil">${opts(SOILS, f.soil)}</select></div>
      <div><label for="f_ph">درجة حموضة التربة (pH)</label><input type="number" id="f_ph" value="${esc(f.ph)}" step="0.1" min="3" max="10"></div>
      <div><label for="f_fertility">خصوبة التربة</label><select id="f_fertility">${opts(FERT_OPTS, f.fertility)}</select></div>
      <div><label for="f_organic">المادة العضوية <small>(للتسجيل فقط حالياً)</small></label><select id="f_organic">${opts(ORG_OPTS, f.organic)}</select></div>
    </div>
    <label for="f_prev">المحصول السابق في الحقل</label>
    <select id="f_prev">${opts([UNKNOWN, ...CROP_NAMES], f.prev)}</select>
  </div>
  <div class="card">
    <h2>🌦️ المناخ والمياه</h2>
    <div class="grid">
      <div><label for="f_season">موسم الزراعة القادم</label><select id="f_season">${opts(SEASONS, f.season)}</select></div>
      <div><label for="f_temp">متوسط الحرارة في هذا الموسم (°م)</label><input type="number" id="f_temp" value="${esc(f.temp)}" step="0.5"></div>
      <div><label for="f_rain">المطر المتوقع في هذا الموسم (ملم)</label><input type="number" id="f_rain" value="${esc(f.rain)}" step="10" min="0"></div>
      <div><label for="f_water">توفر الري</label><select id="f_water">${opts(WATER_OPTS, f.water)}</select></div>
    </div>
    <details><summary>اختياري: جلب الطقس من الإنترنت</summary>
      <p class="muted">يستخدم خدمة Open-Meteo المجانية (توقعات 16 يوماً فقط، وليست متوسط موسم كامل). لو مفيش نت، كمّل بإدخال القيم يدوياً.</p>
      <div class="grid"><div><label for="wx_lat">خط العرض</label><input type="number" id="wx_lat" value="26.56" step="0.01"></div>
      <div><label for="wx_lon">خط الطول</label><input type="number" id="wx_lon" value="31.69" step="0.01"></div></div>
      <button class="btn ghost" onclick="fetchWeather()">جلب الطقس</button>
      <div id="wx_out"></div>
    </details>
  </div>
  <div class="card">
    <h2>🚜 المزرعة</h2>
    <label for="f_area">المساحة (فدان)</label><input type="number" id="f_area" value="${esc(f.area)}" step="0.5" min="0">
    <h3>المحاصيل: مفضّل / مستبعد</h3>
    <div class="crop-picks">${cropSelectRows()}</div>
  </div>
  <div class="card">
    <h2>🎯 أولوياتك (0 = غير مهم، 10 = مهم جداً)</h2>
    ${PRIORITY_KEYS.map(k => `<div class="slider"><label for="p_${k}">${PRIORITY_LABELS[k]}</label>
      <div class="slider-row"><input type="range" id="p_${k}" min="0" max="10" step="1" value="${esc(f.priorities[k])}" oninput="this.nextElementSibling.textContent=this.value"><span>${esc(f.priorities[k])}</span></div></div>`).join("")}
  </div>
  <div class="card">
    <details><summary>⚙️ أوزان معايير التقييم (متقدم)</summary>
      <p class="muted">أي أرقام تدخلها تُحوَّل تلقائياً لنسب مجموعها 100%.</p>
      <div class="grid">${Object.keys(DEFAULT_WEIGHTS).map(k => `<div><label for="w_${k}">${WEIGHT_LABELS[k]} ${nw ? `<small>(${round(nw[k])}%)</small>` : ""}</label><input type="number" id="w_${k}" value="${esc(w[k])}" min="0" step="1"></div>`).join("")}</div>
    </details>
  </div>
  <div id="formMsgs"></div>
  <div class="actions sticky">
    <button class="btn" onclick="generate()">🚀 توليد التوصيات</button>
    <button class="btn gray" onclick="resetForm()">🔄 إعادة تعيين</button>
  </div>`;
}

function pageRecs() {
  ensureResult();
  if (!state.farm) return noFarm();
  const r = state.result;
  if (r.error) return `<h1>🌱 التوصيات</h1>${msg("error", esc(r.error).replace(/\n/g, "<br>"))}<button class="btn" onclick="navigate('assessment')">عدّل بيانات المزرعة</button>`;
  return `<h1>🌱 توصيات الدورة الزراعية</h1>
    ${r.note ? msg("warn", esc(r.note)) : ""}
    <div class="actions">
      <button class="btn" onclick="navigate('compare')">⚖️ قارن الخطط</button>
      <button class="btn ghost" onclick="saveCurrent()">💾 احفظ التوصيات</button>
      <button class="btn ghost" onclick="exportCSV()">⬇️ CSV</button>
      <button class="btn ghost" onclick="exportReport()">📄 تقرير</button>
    </div>
    <div id="recMsgs"></div>
    ${r.plans.map(p => planCard(p, state.farm)).join("")}`;
}

function pageCompare() {
  ensureResult();
  if (!state.farm) return noFarm();
  const r = state.result;
  if (r.error || !r.plans.length) return `<h1>⚖️ مقارنة الخطط</h1>${msg("error", esc(r.error || "لا توجد خطط للمقارنة.").replace(/\n/g, "<br>"))}`;
  const P = r.plans;
  return `<h1>⚖️ مقارنة الخطط</h1>
    <div class="card"><div class="table-wrap"><table class="tbl">
      <thead><tr><th>الخطة</th><th>التتابع</th><th>الدرجة</th><th>الثقة</th><th>المياه</th><th>الخصوبة</th><th>بقوليات</th></tr></thead>
      <tbody>${P.map(p => `<tr><td><b>${esc(p.name)}</b><br><small>${esc(p.tag)}</small></td><td>${p.cycles.map(c => esc(c.crop.name)).join(" ← ")}</td><td class="${scoreClass(p.score)}"><b>${round(p.score)}</b></td><td>${round(p.confidence)}%</td><td>${p.waterClass}</td><td>${p.soilClass}</td><td>${p.legumeCount}</td></tr>`).join("")}</tbody>
    </table></div></div>
    <div class="card"><h2>الدرجة الكلية (من 100)</h2>${bars(P.map(p => ({ label: p.name, value: p.score, cls: scoreClass(p.score) })), 100)}
      <h2>الثقة في التقييم (%)</h2>${bars(P.map(p => ({ label: p.name, value: p.confidence })), 100, "%")}
      <h2>احتياج المياه (مؤشر تقريبي: 1 منخفض – 3 مرتفع)</h2>${bars(P.map(p => ({ label: p.name, value: p.waterAvg, text: p.waterClass })), 3)}
      <h2>أثر الخصوبة (مؤشر توضيحي: يمين = أفضل)</h2>${bars(P.map(p => ({ label: p.name, value: p.soilAvg + 2, text: p.soilClass })), 4)}
      <p class="muted">المؤشرات تقريبية ومبنية على قيم تجريبية، ولا تعني دقة علمية.</p></div>
    <div class="card"><h2>الجدول الزمني للتتابع</h2>${P.map(p => `<h3>${esc(p.name)}</h3>${timeline(p)}`).join("")}</div>
    <div class="card"><h2>أهم الفروق</h2>${listHtml(compareText(P))}</div>
    <div class="actions"><button class="btn ghost" onclick="exportCSV()">⬇️ CSV</button><button class="btn ghost" onclick="exportReport()">📄 تقرير</button><button class="btn ghost" onclick="saveCurrent()">💾 احفظ</button></div>
    <div id="recMsgs"></div>`;
}

function cropRows() {
  const q = state.filter.q.trim();
  const list = CROPS.filter(c =>
    (state.filter.season === "الكل" || c.season === state.filter.season) &&
    (state.filter.soil === "الكل" || c.soils.includes(state.filter.soil) || c.marginal.includes(state.filter.soil)) &&
    (!q || c.name.includes(q)));
  if (!list.length) return `<tr><td colspan="10" class="na">لا توجد محاصيل مطابقة للفلتر.</td></tr>`;
  const eff = v => v >= 2 ? "يحسّن كثيراً" : v === 1 ? "يحسّن" : v === 0 ? "محايد" : v === -1 ? "يستنزف قليلاً" : "يستنزف";
  return list.map(c => `<tr><td><b>${esc(c.name)}</b></td><td>${FAMILY_AR[c.family]}</td><td>${c.season}</td>
    <td>${c.soils.join("، ")}<br><small>جزئياً: ${c.marginal.join("، ") || "—"}</small></td>
    <td>${c.ph[0]}–${c.ph[1]}</td><td>${c.temp[0]}–${c.temp[1]}°م</td><td>${LEVEL_AR[c.water]}</td><td>${c.days}</td>
    <td>${LEVEL_AR[c.nutrient]}</td><td>${eff(c.soilEffect)}</td></tr>`).join("");
}

function pageCrops() {
  return `<h1>🌾 قاعدة المحاصيل</h1>
    ${msg("warn", "كل القيم هنا <b>تجريبية توضيحية</b> لأغراض العرض، وليست بيانات زراعية معتمدة. راجع مصادر موثوقة (مثل FAO أو وزارة الزراعة) قبل الاعتماد عليها.")}
    <div class="card"><div class="grid">
      <div><label for="cf_q">بحث بالاسم</label><input type="text" id="cf_q" value="${esc(state.filter.q)}" oninput="state.filter.q=this.value;updateCropTable()"></div>
      <div><label for="cf_s">الموسم</label><select id="cf_s" onchange="state.filter.season=this.value;updateCropTable()">${opts(["الكل", ...SEASONS], state.filter.season)}</select></div>
      <div><label for="cf_t">نوع التربة</label><select id="cf_t" onchange="state.filter.soil=this.value;updateCropTable()">${opts(["الكل", ...SOILS], state.filter.soil)}</select></div>
    </div></div>
    <div class="card"><div class="table-wrap"><table class="tbl">
      <thead><tr><th>المحصول</th><th>العائلة</th><th>الموسم</th><th>التربة المناسبة</th><th>pH</th><th>الحرارة</th><th>المياه</th><th>المدة (يوم)</th><th>العناصر الغذائية</th><th>أثر الخصوبة (مؤشر)</th></tr></thead>
      <tbody id="cropTable">${cropRows()}</tbody></table></div></div>`;
}
function updateCropTable() { const t = $("cropTable"); if (t) t.innerHTML = cropRows(); }

function pageMethod() {
  const nw = normalizeWeights(state.weights) || normalizeWeights(DEFAULT_WEIGHTS);
  let testsHtml = "";
  if (state.tests) {
    const okN = state.tests.filter(x => x.ok).length;
    testsHtml = msg(okN === state.tests.length ? "ok" : "error", `نجح ${okN} من ${state.tests.length} اختباراً`) +
      `<ul class="tests">${state.tests.map(x => `<li class="${x.ok ? "pass" : "fail"}">${x.ok ? "✅" : "❌"} ${esc(x.name)}</li>`).join("")}</ul>`;
  }
  return `<h1>📖 المنهجية</h1>
  <div class="card"><h2>كيف تُحسب الدرجة؟</h2>
    <p>كل محصول يأخذ درجة من 0 إلى 100 في 7 معايير، ثم تُجمع بأوزان مجموعها 100%. درجة الخطة = متوسط درجات محاصيلها.</p>
    ${bars(Object.keys(nw).map(k => ({ label: WEIGHT_LABELS[k], value: nw[k], text: round(nw[k]) + "%" })), 40)}
    <p class="muted">تقدر تغيّر الأوزان من صفحة تقييم المزرعة، وتُطبَّع تلقائياً.</p></div>
  <div class="card"><h2>القواعد المستخدمة</h2><ul>
    <li><b>فلاتر صارمة قبل الترتيب:</b> محصول خارج الموسم، أو مستبعد، أو لا يناسب التربة، أو الحموضة أبعد من 1.5 وحدة عن نطاقه، أو الحرارة أبعد من 8 درجات، أو احتياجه للمياه أعلى بمستويين من المتاح.</li>
    <li><b>التربة:</b> 100 لو مناسبة، و60 لو مناسبة جزئياً.</li>
    <li><b>pH والحرارة:</b> 100 داخل النطاق، وتقل تدريجياً بالابتعاد عنه.</li>
    <li><b>المياه:</b> الري الكافي = مرتفع، المحدود = متوسط، المطري يعتمد على المطر المُدخل (≥400 ملم مرتفع، ≥200 متوسط، غير ذلك منخفض). هذه الحدود افتراضات توضيحية.</li>
    <li><b>العناصر الغذائية:</b> مقارنة احتياج المحصول بخصوبة التربة.</li>
    <li><b>التتابع:</b> نفس المحصول = 0 (مرفوض). نفس العائلة = 30. عائلة مختلفة = 80. مكافأة لمحصول بقولي بعد غير بقولي، ولمحصول مجهِد غذائياً بعد بقولي، وخصم لمحصولين مجهدين متتاليين.</li>
    <li><b>الأولويات:</b> متوسط مرجّح لمؤشرات المحصول حسب أهمية كل أولوية عندك.</li>
    <li><b>الخطط:</b> نجرّب كل التتابعات الصالحة، ونختار أعلاها درجة بشرط أن تختلف الخطط في محصولين على الأقل.</li>
  </ul></div>
  <div class="card"><h2>البيانات الناقصة والثقة</h2>
    <p>أي معلومة غير معروفة <b>لا تُعتبر مطابقة تامة</b>؛ تُستبعد من الحساب وتنخفض "الثقة" بنسبة وزنها. الحرارة والمطر المُدخلان يخصان الموسم المختار فقط.</p></div>
  <div class="card"><h2>الافتراضات والقيود</h2><ul>
    <li>قيم المحاصيل تجريبية توضيحية وليست بيانات معتمدة.</li>
    <li>المؤشرات (الإنتاجية، الربح، الخصوبة) نسبية من 1 إلى 5 وليست أرقاماً حقيقية.</li>
    <li>المادة العضوية تُسجَّل حالياً ولا تدخل في الحساب.</li>
    <li>لا يوجد تعلّم آلي: لا توجد بيانات موثوقة لتدريبه، وتدريبه على بيانات مختلقة سيعطي نتائج مضللة.</li>
    <li>لا توجد بيانات سوق أو تكلفة فعلية، فلا تُعرض أرباح بالجنيه.</li>
    <li>القرار الزراعي النهائي يحتاج استشارة مهندس زراعي ومعرفة الظروف المحلية.</li>
  </ul>
  <h3>تحسينات مستقبلية</h3><ul><li>استبدال القيم التجريبية ببيانات مرجعية موثقة.</li><li>إضافة نموذج تعلّم آلي عند توفر بيانات حقيقية.</li><li>إدخال أسعار وتكاليف محلية.</li><li>ربط أرصاد موسمية بدل توقعات الأيام القريبة.</li></ul></div>
  <div class="card"><h2>🧪 اختبارات ذاتية</h2><button class="btn ghost" onclick="state.tests=runTests();render()">تشغيل الاختبارات</button>${testsHtml}</div>`;
}

function pageSaved() {
  const S = state.saved;
  return `<h1>💾 الخطط المحفوظة</h1>
    ${S.length ? `<div class="actions"><button class="btn ghost" onclick="exportSavedCSV()">⬇️ تصدير الكل CSV</button></div>` : ""}
    <div id="savedMsgs"></div>
    ${S.length ? S.map((s, i) => `<div class="card"><div class="plan-head"><div><h3>${esc(s.date)}</h3>
      <p class="muted">تربة ${esc(s.farm.soil)} • موسم ${esc(s.farm.season)} • ${esc(s.farm.area)} فدان • ري: ${esc(s.farm.water)}</p></div></div>
      ${s.summary.map(p => `<p><b>${esc(p.name)}</b> (${p.score}/100): ${p.seq.map(esc).join(" ← ")}</p>`).join("")}
      <div class="actions"><button class="btn" onclick="loadSaved(${i})">عرض</button><button class="btn gray" onclick="deleteSaved(${i})">حذف</button></div></div>`).join("")
      : msg("info", "لا توجد خطط محفوظة بعد. ولّد توصيات واضغط 'احفظ التوصيات'.")}`;
}

/* ---------- العرض والتنقل ---------- */
function render() {
  const fn = { home: pageHome, assessment: pageAssessment, recs: pageRecs, compare: pageCompare, crops: pageCrops, method: pageMethod, saved: pageSaved }[state.page];
  try { $("app").innerHTML = fn(); }
  catch (e) { console.error(e); $("app").innerHTML = msg("error", "حدث خطأ في عرض الصفحة. حدّث الصفحة وحاول مرة أخرى."); }
  document.querySelectorAll("#menu button").forEach(b => b.classList.toggle("active", b.dataset.id === state.page));
  window.scrollTo(0, 0);
}
function navigate(id) {
  if (state.page === "assessment") captureForm();
  state.page = id;
  const m = $("menu"); if (m) m.classList.remove("open");
  render();
}
function setMsgs(html, id) { const el = $(id || "formMsgs"); if (el) el.innerHTML = html; }

/* ---------- النموذج ---------- */
function captureForm() {
  if (!$("f_soil")) return null;
  const num = id => $(id).value === "" ? NaN : Number($(id).value);
  const f = {
    soil: $("f_soil").value, ph: num("f_ph"), fertility: $("f_fertility").value, organic: $("f_organic").value,
    prev: $("f_prev").value, temp: num("f_temp"), rain: num("f_rain"), water: $("f_water").value,
    season: $("f_season").value, area: num("f_area"), excluded: [], preferred: [], priorities: {}
  };
  CROPS.forEach((c, i) => { const v = $("c_" + i).value; if (v === "x") f.excluded.push(c.name); if (v === "p") f.preferred.push(c.name); });
  PRIORITY_KEYS.forEach(k => { f.priorities[k] = Number($("p_" + k).value); });
  state.form = f;
  const w = {};
  Object.keys(DEFAULT_WEIGHTS).forEach(k => { w[k] = Number($("w_" + k).value); });
  state.weights = w;
  return f;
}

function generate() {
  const f = captureForm();
  if (!f) return;
  const errs = validateFarm(f);
  if (!normalizeWeights(state.weights)) errs.push("مجموع الأوزان لازم يكون أكبر من صفر.");
  if (errs.length) { setMsgs(errs.map(e => msg("error", esc(e))).join("")); return; }
  setMsgs(msg("info", "⏳ جاري إنشاء الخطط..."));
  setTimeout(() => {
    try {
      state.farm = deepClone(f);
      state.result = generatePlans(state.farm, state.weights);
      store("cra_form", state.form); store("cra_weights", state.weights); store("cra_farm", state.farm);
      state.page = "recs"; render();
    } catch (e) { console.error(e); setMsgs(msg("error", "حدث خطأ غير متوقع أثناء الحساب. أعد المحاولة.")); }
  }, 30);
}

function resetForm() {
  state.form = deepClone(DEFAULT_FORM);
  state.weights = { ...DEFAULT_WEIGHTS };
  state.farm = null; state.result = null;
  try { localStorage.removeItem("cra_form"); localStorage.removeItem("cra_weights"); localStorage.removeItem("cra_farm"); } catch (e) { }
  render();
  setMsgs(msg("ok", "✅ تمت إعادة تعيين النموذج."));
}

function loadSample(i) {
  state.form = deepClone(SAMPLES[i].farm);
  render();
  setMsgs(msg("ok", `✅ تم تحميل: ${esc(SAMPLES[i].title)}. اضغط "توليد التوصيات".`));
}

/* ---------- الطقس الاختياري ---------- */
async function fetchWeather() {
  const box = $("wx_out");
  const lat = Number($("wx_lat").value), lon = Number($("wx_lon").value);
  if (!isFinite(lat) || !isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) { box.innerHTML = msg("error", "إحداثيات غير صحيحة."); return; }
  box.innerHTML = msg("info", "⏳ جاري الاتصال...");
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_mean,precipitation_sum&forecast_days=16&timezone=auto`;
    const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), 10000);
    const res = await fetch(url, { signal: ctrl.signal }); clearTimeout(timer);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const j = await res.json();
    const temps = j.daily.temperature_2m_mean.filter(x => x !== null);
    const rains = j.daily.precipitation_sum.filter(x => x !== null);
    if (!temps.length) throw new Error("no data");
    state.weather = { t: mean(temps).toFixed(1), r: rains.reduce((a, b) => a + b, 0).toFixed(1), n: temps.length, time: new Date().toLocaleString("ar-EG") };
    box.innerHTML = msg("ok", `المصدر: Open-Meteo • وقت الجلب: ${esc(state.weather.time)}<br>متوسط الحرارة المتوقع (${state.weather.n} يوماً): <b>${state.weather.t}°م</b> • مجموع المطر المتوقع: <b>${state.weather.r} ملم</b><br><button class="btn ghost" onclick="useWeather()">استخدم متوسط الحرارة</button>`);
  } catch (e) {
    box.innerHTML = msg("warn", "تعذّر جلب الطقس (لا يوجد اتصال أو الخدمة غير متاحة). كمّل بإدخال القيم يدوياً.");
  }
}
function useWeather() { if (state.weather && $("f_temp")) $("f_temp").value = state.weather.t; }

/* ---------- الحفظ والتصدير ---------- */
function saveCurrent() {
  const r = state.result;
  if (!r || !r.plans.length) { setMsgs(msg("error", "لا توجد توصيات لحفظها."), "recMsgs"); return; }
  state.saved.unshift({
    id: Date.now(), date: new Date().toLocaleString("ar-EG"), farm: deepClone(state.farm), weights: { ...state.weights },
    summary: r.plans.map(p => ({ name: p.name, score: round(p.score), seq: p.cycles.map(c => c.crop.name) }))
  });
  const ok = store("cra_saved", state.saved);
  setMsgs(ok ? msg("ok", "✅ تم حفظ التوصيات في هذا المتصفح.") : msg("warn", "تعذّر الحفظ الدائم (المتصفح يمنع التخزين)، والحفظ مؤقت لحد ما تقفل الصفحة."), "recMsgs");
}
function loadSaved(i) {
  const s = state.saved[i]; if (!s) return;
  state.form = deepClone(s.farm); state.farm = deepClone(s.farm); state.weights = { ...s.weights };
  state.result = generatePlans(state.farm, state.weights);
  navigate("recs");
}
function deleteSaved(i) {
  if (!confirm("متأكد إنك عايز تحذف الخطة دي؟")) return;
  state.saved.splice(i, 1); store("cra_saved", state.saved); render();
}

function downloadFile(name, content, mime) {
  try {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    return true;
  } catch (e) { return false; }
}
const csvCell = v => `"${String(v).replace(/"/g, '""')}"`;

function exportCSV() {
  const r = state.result;
  if (!r || !r.plans.length) { setMsgs(msg("error", "لا توجد نتائج للتصدير."), "recMsgs"); return; }
  const rows = [["الخطة", "الوصف", "الدورة", "الموسم", "المحصول", "درجة المحصول", "درجة الخطة", "الثقة %", "احتياج المياه", "أثر الخصوبة"]];
  r.plans.forEach(p => p.cycles.forEach((c, i) => rows.push([p.name, p.tag, i + 1, c.season, c.crop.name, round(c.eval.total), round(p.score), round(p.confidence), p.waterClass, p.soilClass])));
  const ok = downloadFile("crop-rotation-plans.csv", "\uFEFF" + rows.map(r2 => r2.map(csvCell).join(",")).join("\r\n"), "text/csv;charset=utf-8");
  setMsgs(ok ? msg("ok", "✅ تم تنزيل ملف CSV.") : msg("error", "تعذّر تنزيل الملف."), "recMsgs");
}
function exportSavedCSV() {
  const rows = [["التاريخ", "التربة", "الموسم", "المساحة", "الخطة", "الدرجة", "التتابع"]];
  state.saved.forEach(s => s.summary.forEach(p => rows.push([s.date, s.farm.soil, s.farm.season, s.farm.area, p.name, p.score, p.seq.join(" ← ")])));
  const ok = downloadFile("saved-crop-plans.csv", "\uFEFF" + rows.map(r2 => r2.map(csvCell).join(",")).join("\r\n"), "text/csv;charset=utf-8");
  setMsgs(ok ? msg("ok", "✅ تم تنزيل ملف CSV.") : msg("error", "تعذّر تنزيل الملف."), "savedMsgs");
}
function exportReport() {
  const r = state.result, f = state.farm;
  if (!r || !r.plans.length || !f) { setMsgs(msg("error", "لا توجد نتائج لعمل تقرير."), "recMsgs"); return; }
  const body = r.plans.map(p => {
    const d = describePlan(p, f);
    return `<h2>${esc(p.name)} — ${esc(p.tag)} (${round(p.score)}/100، ثقة ${round(p.confidence)}%)</h2>
      <p><b>التتابع:</b> ${p.cycles.map((c, i) => `${i + 1}) ${esc(c.crop.name)} (${c.season})`).join(" ← ")}</p>
      <p>احتياج المياه: ${p.waterClass} • أثر الخصوبة (مؤشر): ${p.soilClass}</p>
      <h3>لماذا هذه الخطة مناسبة؟</h3>${listHtml(d.why)}<h3>الفوائد</h3>${listHtml(d.benefits)}<h3>المخاطر والقيود</h3>${listHtml(d.risks)}
      <h3>عوامل خفّضت الدرجة</h3>${d.lowered.length ? `<ul>${d.lowered.map(l => `<li>${esc(l.text)} — ${esc(l.tip)}</li>`).join("")}</ul>` : "<p>لا يوجد.</p>"}`;
  }).join("<hr>");
  const html = `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>تقرير الدورة الزراعية</title>
    <style>body{font-family:Tahoma,Arial,sans-serif;max-width:800px;margin:20px auto;padding:0 16px;line-height:1.8;color:#222}h1,h2{color:#1f4d2b}td,th{border:1px solid #ccc;padding:6px 10px}table{border-collapse:collapse}.w{background:#fff8e1;padding:10px;border-radius:6px}</style></head><body>
    <h1>تقرير مستشار الدورة الزراعية الذكي</h1><p>تاريخ التقرير: ${esc(new Date().toLocaleString("ar-EG"))}</p>
    <p class="w">⚠️ البيانات الزراعية تجريبية للعرض فقط وليست توصيات معتمدة.</p>
    <h2>بيانات المزرعة</h2><table>${[["نوع التربة", f.soil], ["pH", f.ph], ["الخصوبة", f.fertility], ["المادة العضوية", f.organic], ["المحصول السابق", f.prev], ["الموسم", f.season], ["الحرارة (°م)", f.temp], ["المطر (ملم)", f.rain], ["الري", f.water], ["المساحة (فدان)", f.area], ["مفضلة", (f.preferred || []).join("، ") || "—"], ["مستبعدة", (f.excluded || []).join("، ") || "—"]].map(x => `<tr><th>${x[0]}</th><td>${esc(x[1])}</td></tr>`).join("")}</table>
    ${body}</body></html>`;
  const ok = downloadFile("crop-rotation-report.html", html, "text/html;charset=utf-8");
  setMsgs(ok ? msg("ok", "✅ تم تنزيل التقرير. افتحه واطبعه PDF لو عايز.") : msg("error", "تعذّر تنزيل التقرير."), "recMsgs");
}

/* ---------- التشغيل ---------- */
function init() {
  PAGES.forEach(p => {
    const b = document.createElement("button");
    b.textContent = p[1]; b.dataset.id = p[0];
    b.onclick = () => navigate(p[0]);
    $("menu").appendChild(b);
  });
  const t = $("menuToggle");
  if (t) t.onclick = () => $("menu").classList.toggle("open");
  render();
}
init();