/* ORACLE PLUG-IN: p5problems (Paper Two Point, js/topics/p5-exam-problems.js).
 *
 * Exhaustive: every stem the topic emits must match one shape below, or the draw fails.
 * Each key is re-derived from the RENDERED stem (fraction spans read back as n/d) by a
 * route other than the generator's:
 *   - numbers in words are parsed back by a word-by-word accumulator (the generator
 *     only ever writes words, never reads them);
 *   - decimal measurements are converted by shifting digits in the STRING, not by
 *     floating multiplication;
 *   - every problem with a division or a fraction is solved by SEARCHING for the
 *     whole-number answer that satisfies the stem's conditions (cross-multiplied, no
 *     division), so a generator formula slip cannot pass through.
 * Also held on every draw: q.syl === 'P5'; MCQ - every distractor carries a tag from the
 * topic's misconceptions map plus a coaching line, the key carries none, and exactly one
 * option is defensible; typed - no slip equals the key and every slip tag is defined;
 * Paper 2 shapes - band 3, exam 'problem', >= 12 words, technique and 3-5 steps, and a
 * money stem declares '$'. */
export const topic = 'p5problems';

const NAME = "([A-Z][a-z]+(?: [A-Z][a-z]+)?)";
const WORDS = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90
};
function readWords(s) {
  const toks = String(s).toLowerCase().split(/[\s,\-]+/).filter(t => t && t !== 'and');
  if (!toks.length) return null;
  let total = 0, cur = 0;
  for (const t of toks) {
    if (t in WORDS) cur += WORDS[t];
    else if (t === 'hundred') { if (!cur) return null; cur *= 100; }
    else if (t === 'thousand') { total += cur * 1000; cur = 0; }
    else if (t === 'million') { total += cur * 1e6; cur = 0; }
    else return null;
  }
  return total + cur;
}
const digitsOf = s => { const t = String(s).replace(/,/g, ''); return /^\d+$/.test(t) ? Number(t) : null; };
/* "2.035" -> 2035 thousandths, by the string alone */
function thousandths(s) {
  const m = String(s).match(/^(\d+)(?:\.(\d{1,3}))?$/);
  if (!m) return null;
  return Number(m[1]) * 1000 + Number(((m[2] || '') + '000').slice(0, 3));
}
const FACTOR = { kg: ['g', 1000], km: ['m', 1000], 'ℓ': ['ml', 1000], m: ['cm', 100] };
const BIGWORD = { kilograms: 'kg', kilometres: 'km', litres: 'ℓ', metres: 'm' };
const SMALLWORD = { grams: 'g', metres: 'm', millilitres: 'ml', centimetres: 'cm' };

export function oracle(q, kit) {
  const { strip, near } = kit;
  const T = kit.TOPICS.p5problems, MIS = (T && T.misconceptions) || {};
  const text = strip(String(q.q).replace(/<span class="frac"><span class="n">(\d+)<\/span><span class="d">(\d+)<\/span><\/span>/g, '$1/$2'));
  const fail = s => 'p5problems: ' + s + ' :: ' + text;
  if (q.syl !== 'P5') return fail('every item must carry syl P5');

  if (!q.typed) {
    const n = (q.choices || []).length;
    if (n !== 4) return fail('an MCQ has 4 choices');
    for (let i = 0; i < n; i++) {
      if (i === q.correct) { if (q.miscon && q.miscon[i] != null) return fail('the key carries a misconception tag'); continue; }
      const t = q.miscon && q.miscon[i];
      if (!t || !MIS[t]) return fail(`distractor ${i} has no misconception tag from the dictionary (${t})`);
      if (!q.optionFeedback || typeof q.optionFeedback[i] !== 'string' || !q.optionFeedback[i].trim()) return fail(`distractor ${i} has no coaching line`);
    }
  } else {
    if (!q.slips || typeof q.slips !== 'object') return fail('a typed item carries q.slips');
    for (const [v, t] of Object.entries(q.slips)) {
      if (near(Number(v), q.answer)) return fail('a slip equals the key');
      if (!MIS[t]) return fail(`slip tag ${t} is not in the dictionary`);
    }
  }
  const paper2 = () => {
    if (!q.typed) return fail('a Paper 2 problem is typed');
    if (q.band !== 3 || q.exam !== 'problem') return fail('a Paper 2 problem is band 3 and exam:problem');
    if (text.split(/\s+/).length < 12) return fail('a Paper 2 problem has at least 12 words');
    if (!q.technique || !Array.isArray(q.steps) || q.steps.length < 3 || q.steps.length > 5) return fail('a Paper 2 problem is coached (technique + 3-5 steps)');
    if (!Number.isInteger(q.answer) || q.answer <= 0) return fail('a Paper 2 key is a positive whole number');
    return null;
  };
  const short = () => (q.band === 3 || q.exam === 'problem') ? fail('a short item is not tagged as a Paper 2 problem') : null;
  const dollars = () => q.unit === '$' ? null : fail('a dollar answer declares $');
  const want = (v, extra) => {
    const e = extra && extra();
    if (e) return e;
    if (v === null || v === undefined || !Number.isFinite(v)) return fail('no whole-number solution exists');
    return near(q.answer, v) ? null : fail(`expected ${v}, got ${q.answer}`);
  };
  const searchInt = (lo, hi, ok) => { const s = []; for (let x = lo; x <= hi; x++) if (ok(x)) s.push(x); return s.length === 1 ? s[0] : null; };
  let m;

  /* ---------- whole numbers 1.1 ---------- */
  if ((m = text.match(/^Write the number "([a-z ,\-]+)" in numerals\. \(Write it with commas or with no spaces, e\.g\. 1,234,567\.\)$/))) {
    const v = readWords(m[1]);
    if (v === null || v < 1e6 || v >= 1e7) return fail('the words do not read as a number in the millions');
    return short() || want(v);
  }
  if ((m = text.match(/^Which of these is the number "([a-z ,\-]+)" written in numerals\?$/))) {
    const v = readWords(m[1]);
    if (v === null || v < 1e6 || v >= 1e7) return fail('the words do not read as a number in the millions');
    if (q.choices.some(c => !(digitsOf(c) >= 1e6))) return fail('an option is not a 7-digit number, so it is ruled out at a glance');
    const hits = q.choices.map((c, i) => digitsOf(c) === v ? i : -1).filter(i => i >= 0);
    if (hits.length !== 1 || hits[0] !== q.correct) return fail(`${hits.length} options match, key index ${q.correct}`);
    return short();
  }
  if ((m = text.match(/^How is ([\d,]+) written in words\?$/))) {
    const v = digitsOf(m[1]);
    if (v === null || v < 1e6 || v >= 1e7) return fail('the numeral is not in the millions');
    if (q.choices.some(c => !/million/.test(c))) return fail('an option never says million, so it is ruled out at a glance');
    const hits = q.choices.map((c, i) => readWords(c) === v ? i : -1).filter(i => i >= 0);
    if (hits.length !== 1 || hits[0] !== q.correct) return fail(`${hits.length} options read as ${v}, key index ${q.correct}`);
    return short();
  }

  /* ---------- decimals 1.2 ---------- */
  if ((m = text.match(/^Write (\d+) (kg|km|ℓ|m) (\d+) (g|m|ml|cm) in (kilograms|kilometres|litres|metres)\.$/))) {
    const big = m[2], fx = FACTOR[big];
    if (!fx || fx[0] !== m[4] || BIGWORD[m[5]] !== big) return fail('not one of the four MOE unit pairs');
    const small = Number(m[3]);
    if (small >= fx[1]) return fail('the smaller part is a whole big unit or more');
    const totalSmall = Number(m[1]) * fx[1] + small;
    const hits = q.choices.map((c, i) => {
      const cm = String(c).match(/^([\d.]+) (\S+)$/);
      if (!cm || cm[2] !== big) return -1;
      const th = thousandths(cm[1]);
      return th !== null && th * fx[1] === totalSmall * 1000 ? i : -1;
    }).filter(i => i >= 0);
    if (hits.length !== 1 || hits[0] !== q.correct) return fail(`${hits.length} options equal ${totalSmall} ${m[4]}`);
    return short();
  }
  if ((m = text.match(/^(?:A parcel has a mass of|A cycling path is|A jug holds|A ribbon is) ([\d.]+) (kg|km|ℓ|m|g|ml|cm)(?: long| of water)?\. Write this in (kilograms|kilometres|litres|metres|grams|millilitres|centimetres)\.$/))) {
    const val = m[1], u = m[2], target = m[3];
    if (q.dp !== 3) return fail('a decimal conversion declares q.dp = 3');
    let ans;
    if (FACTOR[u] && SMALLWORD[target] === FACTOR[u][0] && !(u === 'm' && target === 'metres')) {
      const th = thousandths(val);                  /* big -> small: answer = th * f / 1000 */
      if (th === null) return fail('unreadable decimal');
      ans = th * FACTOR[u][1] / 1000;
      if (!Number.isInteger(ans)) return fail('the conversion is not a whole number of the smaller unit');
      if (q.unit !== FACTOR[u][0]) return fail('the unit asked for is not declared');
    } else {
      const bigU = BIGWORD[target];
      if (!bigU || FACTOR[bigU][0] !== u || !/^\d+$/.test(val)) return fail('not one of the four MOE unit pairs');
      const f = FACTOR[bigU][1], N = Number(val);
      /* small -> big, by the digit string: put the point f's zeros from the right */
      const z = String(f).length - 1, s = val.padStart(z + 1, '0');
      ans = Number(s.slice(0, s.length - z) + '.' + s.slice(s.length - z));
      if (!near(ans * f, N)) return fail('digit shift disagrees');
      if (q.unit !== bigU) return fail('the unit asked for is not declared');
    }
    return short() || want(ans);
  }

  /* ---------- short worded items ---------- */
  if ((m = text.match(new RegExp('^' + NAME + ' had (\\d+) stickers\\. \\1 gave (\\d+)/(\\d+) of them to a friend\\. How many stickers did \\1 have left\\?$')))) {
    const N = +m[2], a = +m[3], b = +m[4];
    if (a >= b) return fail('the fraction is not proper');
    return short() || want(searchInt(0, N, x => (N - x) * b === N * a));
  }
  if ((m = text.match(/^There are (\d+) pupils in a class\. (\d+) of them walk to school\. What percentage of the pupils walk to school\? \(answer in %, e\.g\. 35\)$/))) {
    const N = +m[1], P = +m[2];
    if (q.unit !== '%') return fail('a percentage answer declares %');
    return short() || want(searchInt(0, 100, x => x * N === P * 100));
  }
  if ((m = text.match(/^A printer prints (\d+) pages in (\d+) minutes\. At the same rate, how many pages does it print in (\d+) minutes\?$/))) {
    const A = +m[1], mm = +m[2], n = +m[3];
    const r = searchInt(1, A, x => x * mm === A);
    return short() || want(r === null ? null : r * n);
  }

  /* ---------- Paper 2 structured problems ---------- */
  if ((m = text.match(/^A concert sold (\d+) tickets at \$(\d+) each and (\d+) tickets at \$(\d+) each\. The organisers paid \$(\d+) to rent the hall\. How much money was left after paying for the hall\? \(in dollars\) \(You may use a calculator\.\)$/))) {
    const A = +m[1], p = +m[2], B = +m[3], c = +m[4], C = +m[5];
    const v = (A * p - C) + B * c;                  /* regrouped: hall off the first takings */
    return paper2() || dollars() || want(v > 0 ? v : null);
  }
  if ((m = text.match(/^A factory made (\d+) ([a-z ]+)\. They were packed into boxes of (\d+) \2 each, and every (\d+) boxes were packed into a carton\. Each carton was sold for \$(\d+)\. How much money did the factory collect for all the cartons\? \(in dollars\) \(You may use a calculator\.\)$/))) {
    const N = +m[1], b = +m[3], k = +m[4], s = +m[5];
    const c = searchInt(1, N, x => x * b * k === N);
    return paper2() || dollars() || want(c === null ? null : c * s);
  }
  if ((m = text.match(new RegExp('^' + NAME + ' had \\$(\\d+)\\. \\1 spent (\\d+)/(\\d+) of the money on (a rice cooker|a holiday) and (\\d+)/(\\d+) of the remainder on (a fan|a television)\\. How much money did \\1 have left\\? \\(in dollars\\)$')))) {
    const Tt = +m[2], a = +m[3], b = +m[4], c = +m[6], d = +m[7];
    if ((m[5] === 'a rice cooker') !== (m[8] === 'a fan')) return fail('the two purchases are from different price bands');
    if (a >= b || c >= d) return fail('fractions must be proper');
    {
      const s1 = Tt * a / b, s2 = (Tt - s1) * c / d;
      if (m[5] === 'a rice cooker' ? (s1 > 400 || s2 > 300) : (s1 < 400 || s2 < 300)) return fail(`implausible prices: ${m[5]} $${s1}, ${m[8]} $${s2}`);
    }
    if ((Tt * a) % b || ((Tt - Tt * a / b) * c) % d) return fail('a share is not a whole number of dollars');
    return paper2() || dollars() || want(searchInt(0, Tt, x => x * b * d === Tt * (b - a) * (d - c)));
  }
  if ((m = text.match(new RegExp('^' + NAME + ' had some money\\. \\1 spent (\\d+)/(\\d+) of it on (a book|a watch|a bicycle) and (\\d+)/(\\d+) of the remainder on (a pen|a bag|a pair of shoes)\\. \\1 had \\$(\\d+) left\\. How much money did \\1 have at first\\? \\(in dollars\\)$')))) {
    const a = +m[2], b = +m[3], c = +m[5], d = +m[6], L = +m[8];
    if (a >= b || c >= d) return fail('fractions must be proper');
    const Tt = searchInt(1, L * b * d, x => x * (b - a) * (d - c) === L * b * d);
    if (Tt !== null && ((Tt * a) % b || ((Tt * (b - a) / b) * c) % d)) return fail('a share is not a whole number of dollars');
    if (Tt !== null) {
      const s1 = Tt * a / b, s2 = (Tt - s1) * c / d;
      const cap1 = { 'a book': 30, 'a watch': 150, 'a bicycle': 600 }[m[4]], cap2 = { 'a pen': 40, 'a bag': 120, 'a pair of shoes': 250 }[m[7]];
      if (s1 > cap1 || s2 > cap2) return fail(`implausible prices: ${m[4]} $${s1}, ${m[7]} $${s2}`);
    }
    return paper2() || dollars() || want(Tt);
  }
  if ((m = text.match(new RegExp('^A (bag of rice has a mass of|bottle holds) ([\\d.]+) (kg|ℓ)(?: of juice)?\\. ' + NAME + ' bought (\\d+) such (?:bags of rice and a packet of beans of mass (\\d+) g\\. What was the total mass of the rice and beans, in grams|bottles of juice and a carton of milk holding (\\d+) ml\\. What was the total volume of the juice and milk, in millilitres)\\?$')))) {
    const per = thousandths(m[2]), n = +m[5], extra = +(m[6] || m[7]);
    const isKg = m[3] === 'kg';
    if (isKg !== (m[1] === 'bag of rice has a mass of') || isKg !== (m[6] !== undefined)) return fail('the units do not match the objects');
    if (q.unit !== (isKg ? 'g' : 'ml')) return fail('the unit asked for is not declared');
    let v = 0; for (let i = 0; i < n; i++) v += per;  /* add n bags, not multiply */
    return paper2() || want(v + extra);
  }
  if ((m = text.match(new RegExp('^' + NAME + ' had a ribbon ([\\d.]+) m long\\. \\1 cut (\\d+) pieces, each (\\d+) cm long, from it\\. How long was the ribbon that was left, in centimetres\\?$')))) {
    const th = thousandths(m[2]), n = +m[3], c = +m[4];
    if (th === null || th % 10) return fail('the ribbon length is not a whole number of cm');
    const v = th / 10 - n * c;
    if (q.unit !== 'cm') return fail('cm not declared');
    return paper2() || want(v > 0 ? v : null);
  }
  if ((m = text.match(new RegExp('^An? ([a-z\\-]+(?: [a-z\\-]+)?) is priced at \\$(\\d+)\\. During a sale, it is sold at a (\\d+)% discount\\. GST of 9% is then charged on the sale price\\. How much does ' + NAME + ' pay for the \\1\\? \\(in dollars\\)$')))) {
    const P = +m[2], d = +m[3];
    if ((P * d) % 100 || ((P - P * d / 100) * 9) % 100) return fail('the discount or the GST is not whole dollars');
    return paper2() || dollars() || want(searchInt(1, 2 * P, x => x * 10000 === P * (100 - d) * 109));
  }
  if ((m = text.match(new RegExp('^' + NAME + ' put \\$(\\d+) in a bank account that pays (\\d+)% interest per year and \\$(\\d+) in another account that pays (\\d+)% interest per year\\. How (much money did \\1 have in the two accounts altogether|much interest did \\1 receive altogether) after 1 year\\? \\(in dollars\\)$')))) {
    const A = +m[2], a = +m[3], B = +m[4], b = +m[5];
    const total = /money/.test(m[6]);
    const hund = A * a + B * b;                     /* interest x 100 */
    const I = searchInt(0, A + B, x => x * 100 === hund);
    return paper2() || dollars() || want(I === null ? null : total ? A + B + I : I);
  }
  if ((m = text.match(/^There are (\d+) pupils in a school hall\. (\d+)% of them are girls\. (\d+)% of the girls wear spectacles\. How many girls do not wear spectacles\?$/))) {
    const N = +m[1], p = +m[2], s = +m[3];
    if ((N * p) % 100 || (N * p * s) % 10000) return fail('a count is not a whole number');
    return paper2() || want(searchInt(0, N, x => x * 10000 === N * p * (100 - s)));
  }
  if ((m = text.match(new RegExp('^Printer A prints (\\d+) pages per minute and Printer B prints (\\d+) pages per minute\\. ' + NAME + ' uses both printers together to print (\\d+) copies of a booklet that has (\\d+) pages\\. How many minutes do they take\\?$')))) {
    const a = +m[1], b = +m[2], c = +m[4], p = +m[5];
    if (q.unit !== 'min') return fail('min not declared');
    if (a === b) return fail('the two printers have the same rate');
    return paper2() || want(searchInt(1, c * p, x => x * (a + b) === c * p));
  }
  if ((m = text.match(new RegExp('^' + NAME + '\'s car travels (\\d+) km on 1 ℓ of petrol\\. Petrol costs \\$(\\d+)\\.(\\d\\d) per litre\\. How much does the petrol cost for a trip of (\\d+) km\\? \\(in dollars\\)$')))) {
    const d = +m[2], cents = +m[3] * 100 + +m[4], D = +m[5];
    const L = searchInt(1, D, x => x * d === D);
    return paper2() || dollars() || want(L === null ? null : searchInt(1, L * cents, x => x * 100 === L * cents));
  }
  if ((m = text.match(/^A rectangular garden is (\d+) m long and (\d+) m wide\. A triangular flower bed with a base of (\d+) m and a height of (\d+) m is inside the garden\. The rest of the garden is covered with grass\. What is the area of the grass, in m²\?$/))) {
    const L = +m[1], B = +m[2], b = +m[3], h = +m[4];
    if (b > L || h > B) return fail('the flower bed does not fit in the garden');
    if (q.unit !== 'm²') return fail('m² not declared');
    return paper2() || want(searchInt(1, L * B, x => 2 * x === 2 * L * B - b * h));
  }
  if ((m = text.match(/^A triangle has an area of (\d+) cm² and a base of (\d+) cm\. A rectangle has the same height as the triangle and a length of (\d+) cm\. What is the area of the rectangle, in cm²\?$/))) {
    const A = +m[1], b = +m[2], L = +m[3];
    const h = searchInt(1, 2 * A, x => b * x === 2 * A);
    if (q.unit !== 'cm²') return fail('cm² not declared');
    return paper2() || want(h === null ? null : L * h);
  }
  if ((m = text.match(/^A rectangular tank is (\d+) cm long, (\d+) cm wide and (\d+) cm high\. It contains water to a depth of (\d+) cm\. How many more litres of water are needed to fill the tank completely\? \(1 ℓ = 1000 cm³\)$/))) {
    const L = +m[1], W = +m[2], H = +m[3], d = +m[4];
    if (d >= H) return fail('the water is not below the brim');
    if (q.unit !== 'ℓ') return fail('ℓ not declared');
    return paper2() || want(searchInt(1, Math.ceil(L * W * H / 1000), x => x * 1000 === L * W * (H - d)));
  }
  if ((m = text.match(new RegExp('^A rectangular tank is (\\d+) cm long, (\\d+) cm wide and (\\d+) cm high\\. It is filled with water to a depth of (\\d+) cm\\. ' + NAME + ' pours all the water equally into (\\d+) jugs\\. How many millilitres of water are there in each jug\\? \\(1 cm³ = 1 ml\\)$')))) {
    const L = +m[1], W = +m[2], H = +m[3], d = +m[4], n = +m[6];
    if (d >= H) return fail('the water is deeper than the tank');
    if (!Array.isArray(q.unit) || q.unit[0] !== 'ml') return fail('ml not declared first');
    if (L * W * d > 3000 * n) return fail('more than 3000 ml per jug');
    return paper2() || want(searchInt(1, L * W * d, x => x * n === L * W * d));
  }
  return false;
}
