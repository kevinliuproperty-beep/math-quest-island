/* Oracle for Percentage Peak (topic 'percent', P6). EXHAUSTIVE: every stem the topic emits
 * must match one pattern below, or the draw fails.
 * Method: re-derive every key from the RENDERED stem by an independent route - a search
 * over whole numbers for the value that satisfies the stem's condition (never the
 * generator's divide-then-multiply), or, for two changes in a row, the product of the two
 * multipliers instead of the generator's add-then-subtract. MCQ: exactly one option equals
 * the derived key and it is the marked one. Plus: syl 'P6', a dictionary tag + coaching
 * line on every distractor, slips never equal the key, the declared unit, and band-3
 * Paper 2 shape on the problem stems. */
export const topic = 'percent';

const NAME = '([A-Z][a-z]+(?: [A-Z][a-z]+)?)';
const ITEM = '([a-z ]+?)';
const LIM = 200000;

function search(pred) {
  for (let x = 1; x <= LIM; x++) if (pred(x)) return x;
  return null;
}

export function oracle(q, kit) {
  const text = kit.strip(q.q);
  const fail = s => 'percent: ' + s + ' :: ' + text;
  const T = kit.TOPICS.percent, MIS = (T && T.misconceptions) || {};
  if (q.syl !== 'P6') return fail('every item must carry syl P6');
  if (!q.typed) {
    const n = (q.choices || []).length;
    if (n !== 4) return fail('MCQ needs 4 choices');
    for (let i = 0; i < n; i++) {
      if (i === q.correct) { if (q.miscon && q.miscon[i] != null) return fail('the key carries a misconception tag'); continue; }
      const t = q.miscon && q.miscon[i];
      if (!t || !MIS[t]) return fail(`distractor ${i} has no misconception tag from the dictionary (${t})`);
      if (!q.optionFeedback || typeof q.optionFeedback[i] !== 'string' || !q.optionFeedback[i].trim()) return fail(`distractor ${i} has no coaching line`);
    }
  } else {
    if (!q.slips || typeof q.slips !== 'object') return fail('typed item has no slips map');
    for (const [v, t] of Object.entries(q.slips)) {
      if (Number(v) === q.answer) return fail('a slip equals the key');
      if (!MIS[t]) return fail(`slip tag ${t} is not in the dictionary`);
    }
  }

  /* MCQ: the options read with `read`, exactly one equals want, and it is the key */
  /* no key may be a number the stem prints (a given value, a percentage or the e.g. hint) */
  const inStem = v => (text.match(/\d+/g) || []).map(Number).indexOf(v) !== -1;
  const mcqCheck = (want, read) => {
    if (q.typed) return fail('expected an MCQ');
    if (want === null) return fail('no whole-number answer exists');
    if (inStem(want)) return fail(`the key ${want} is printed in the stem`);
    const vals = q.choices.map(c => read(kit.strip(c)));
    if (vals.some(v => v === null)) return fail('an option could not be read: ' + q.choices.join(' | '));
    const hits = vals.map((v, i) => (v === want ? i : -1)).filter(i => i >= 0);
    if (hits.length !== 1) return fail(`${hits.length} options equal ${want}`);
    return hits[0] === q.correct ? null : fail(`the marked option is ${q.choices[q.correct]}, expected ${want}`);
  };
  const plain = s => (/^\d+$/.test(s) ? Number(s) : null);
  const dollars = s => { const m = s.match(/^\$(\d+)$/); return m ? Number(m[1]) : null; };
  const percent = s => { const m = s.match(/^(\d+)%$/); return m ? Number(m[1]) : null; };
  const typedCheck = (want, unit, shown) => {
    if (!q.typed) return fail('expected a typed item');
    if (want === null) return fail('no whole-number answer exists');
    if (inStem(want)) return fail(`the key ${want} is printed in the stem`);
    if (q.unit !== unit) return fail(`unit ${JSON.stringify(q.unit)}, expected ${unit}`);
    if (q.answer !== want) return fail(`expected ${want}, got ${q.answer}`);
    if (shown !== undefined && q.answerText !== shown) return fail(`answerText ${q.answerText}, expected ${shown}`);
    return null;
  };
  const problem = () => (q.band === 3 && q.exam === 'problem' && Array.isArray(q.steps) && q.technique) ? null : fail('a Paper 2 problem must be band 3, exam problem, coached');
  /* the whole w whose pct% is part: w x pct = part x 100 */
  const wholeOf = (part, pct) => search(w => w * pct === part * 100);
  /* the percentage p that a change from a to b is of a */
  const pctChange = (a, b) => { const d = Math.abs(b - a); for (let p = 1; p <= 1000; p++) if (d * 100 === p * a) return p; return null; };
  const dirOk = (word, a, b) => (word === 'increase' || word === 'up' || word === 'rose') ? b > a : b < a;

  let m;
  if ((m = text.match(/^(\d+)% of a number is (\d+)\. What is the number\?$/)))
    return mcqCheck(wholeOf(+m[2], +m[1]), plain);
  if ((m = text.match(new RegExp('^' + NAME + ' has saved \\$(\\d+)\\. This is (\\d+)% of the money needed to buy a new ' + ITEM + '\\. How much money is needed to buy it\\?$'))))
    return mcqCheck(wholeOf(+m[2], +m[3]), dollars);
  if ((m = text.match(new RegExp('^The price of a ' + ITEM + ' went (up|down) from \\$(\\d+) to \\$(\\d+)\\. What is the percentage (increase|decrease) in the price\\?$')))) {
    const a = +m[3], b = +m[4];
    if (!dirOk(m[2], a, b) || !dirOk(m[5], a, b)) return fail('the direction words disagree with the values');
    return mcqCheck(pctChange(a, b), percent);
  }
  if ((m = text.match(/^The number of visitors to a library (rose|fell) from (\d+) to (\d+)\. What is the percentage (increase|decrease) in the number of visitors\?$/))) {
    const a = +m[2], b = +m[3];
    if (!dirOk(m[1], a, b) || !dirOk(m[4], a, b)) return fail('the direction words disagree with the values');
    return mcqCheck(pctChange(a, b), percent);
  }
  if ((m = text.match(new RegExp('^' + NAME + ' has read (\\d+) pages of a storybook\\. That is (\\d+)% of the book\\. How many pages are there in the book\\?$'))))
    return typedCheck(wholeOf(+m[2], +m[3]), 'pages');
  if ((m = text.match(new RegExp('^' + NAME + ' spent \\$(\\d+) on a ' + ITEM + '\\. This was (\\d+)% of \\1\'s savings\\. How much were \\1\'s savings before buying it\\? \\(in dollars, e\\.g\\. 240\\)$')))) {
    const w = wholeOf(+m[2], +m[4]);
    return typedCheck(w, '$', '$' + w);
  }
  if ((m = text.match(new RegExp('^' + NAME + ' spent (\\d+)% of the money in a savings tin on a ' + ITEM + ' and had \\$(\\d+) left\\. How much money was in the tin at first\\?$')))) {
    const pct = +m[2], left = +m[4];
    return mcqCheck(search(w => w * 100 - w * pct === left * 100), dollars);
  }
  if ((m = text.match(/^The number of members of a badminton club (rose|fell) from (\d+) to (\d+)\. Find the percentage (increase|decrease) in the number of members\. \(answer in %, e\.g\. 7\)$/))
      || (m = text.match(new RegExp('^The price of a ' + ITEM.replace('(', '(?:') + ' went (up|down) from \\$(\\d+) to \\$(\\d+)\\. Find the percentage (increase|decrease) in the price\\. \\(answer in %, e\\.g\\. 7\\)$')))) {
    const a = +m[2], b = +m[3];
    if (!dirOk(m[1], a, b) || !dirOk(m[4], a, b)) return fail('the direction words disagree with the values');
    const p = pctChange(a, b);
    return typedCheck(p, '%', p + '%');
  }
  if ((m = text.match(new RegExp('^During a sale, every item in a shop was sold at a (\\d+)% discount\\. ' + NAME + ' paid \\$(\\d+) for a ' + ITEM + ' during the sale\\. What was the price of the \\4 before the discount\\? \\(in dollars, e\\.g\\. 150\\)$')))) {
    const pct = +m[1], S = +m[3];
    const O = search(x => x * 100 - x * pct === S * 100);
    return typedCheck(O, '$', '$' + O) || problem();
  }
  if ((m = text.match(new RegExp('^' + NAME + ' paid \\$(\\d+) for a ' + ITEM + '\\. This price included 9% GST\\. (?:What was the price of the \\3 before GST\\? \\(in dollars, e\\.g\\. 200\\)|How much GST did \\1 pay\\? \\(in dollars, e\\.g\\. 18\\))$')))) {
    const paid = +m[2];
    const B = search(x => x * 109 === paid * 100);
    if (B === null) return fail('no whole-dollar price before GST');
    const want = /before GST\?/.test(text) ? B : paid - B;
    return typedCheck(want, '$', '$' + want) || problem();
  }
  if ((m = text.match(new RegExp('^In January, the price of a ' + ITEM + ' was \\$(\\d+)\\. In March, the price was increased by (\\d+)%\\. In June, the new price was decreased by (\\d+)%\\. What was the price of the \\1 in June\\? \\(in dollars, e\\.g\\. 90\\)$')))) {
    const P = +m[2], a = +m[3], b = +m[4];
    const num = P * (100 + a) * (100 - b);                 /* product of the multipliers */
    if (num % 10000) return fail('the June price is not whole dollars');
    if ((P * (100 + a)) % 100) return fail('the March price is not whole dollars');
    const F = num / 10000;
    return typedCheck(F, '$', '$' + F) || problem();
  }
  if ((m = text.match(/^In 2024, a swimming club had (\d+) members\. In 2025, it had (\d+) members\. In 2026, the club had (\d+)% fewer members than in 2025\. What is the percentage (increase|decrease) in the number of members from 2024 to 2026\? \(answer in %, e\.g\. 15\)$/))) {
    const A = +m[1], B = +m[2], c = +m[3];
    const C = search(x => x * 100 === B * (100 - c));
    if (C === null) return fail('the 2026 number is not whole');
    if (!dirOk(m[4], A, C)) return fail('the direction word disagrees with the values');
    const p = pctChange(A, C);
    return typedCheck(p, '%', p + '%') || problem();
  }
  if ((m = text.match(/^In a school, (\d+)% of the pupils are boys and the rest are girls\. There are (\d+) more girls than boys\. How many pupils are there in the school altogether\?$/))) {
    const bp = +m[1], diff = +m[2];
    const N = search(x => (x * bp) % 100 === 0 && (x - x * bp / 100) - x * bp / 100 === diff);
    return typedCheck(N, 'pupils') || problem();
  }
  return fail('no pattern matched this stem');
}
