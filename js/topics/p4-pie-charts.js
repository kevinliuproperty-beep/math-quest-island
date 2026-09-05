"use strict";
/* Math Quest Island topic: p4pie (P4). Self-contained. MC.
 * Authoring rules + registration shape: js/topics/README.md
 *
 * Scope (MOE Oct 2025, p.40, STATISTICS / DATA REPRESENTATION AND INTERPRETATION /
 * 1. Tables, Line Graphs and Pie Charts):
 *   1.2 reading and interpreting data from tables/line graphs/PIE CHARTS
 * This closes the pie-chart half of 1.2, which `p4data` deliberately left out (see
 * P4 Area+Graphs Refutation finding 4: under-coverage, not a kill).
 *
 * IN SCOPE at P4, and nothing else is generated here:
 *   - reading a value off a sector that PRINTS that value (a count);
 *   - comparing sectors that print their values (largest / smallest / how many more);
 *   - combining sectors (addition) and recovering a missing sector from a stated
 *     total (subtraction);
 *   - a sector labelled with a FRACTION of the whole (1/6, 1/4, 1/3, 5/12, 1/2,
 *     7/12, 2/3) with the size of the whole stated or asked for, i.e. fraction of a
 *     set and finding the whole, which is P4 Fractions (p.38).
 * OUT OF SCOPE, never generated: ANGLES of sectors (pie charts drawn with sector
 * angles are P6, p.44) and PERCENTAGE of a whole (P5, p.41, sub-strand PERCENTAGE).
 * A child here never measures an angle and never converts to a percentage.
 *
 * RENDERED SURFACE ONLY. Every number the child needs is printed on screen twice:
 * inside its own sector (`pie-lab`) and in the legend beside the category name
 * (`pie-cat` + `pie-val`). Nothing rides in a data-* attribute; the oracle in
 * tools/gen-sanity.mjs re-derives every answer from those printed labels and
 * cross-checks the two copies. A bare pie with no printed values is unreadable and
 * is the exact kill pattern the P3 pilot refutation named for bar graphs.
 *
 * READABILITY CLAMP: every sector is at least 1/6 of the circle (60 degrees), so an
 * in-sector label never crowds a boundary; category names live in the legend, never
 * on a slice, so two labels can never collide.
 *
 * VARIETY (Kevin's ruling 2026-09-05, "one dimensional, repeats, too easy"): every
 * skill carries at least THREE distinct stem shapes, not three sets of numbers, and
 * every pool-3 generator needs TWO OR MORE steps.
 */
(function () {
  const G = MQI.gen;
  const ri = G.ri, pick = G.pick, shuffle = G.shuffle, gcd = G.gcd, finishNum = G.finishNum;

  const SETS = [
    { title: 'How the P4 pupils travel to school', thing: 'pupils',
      cats: ['Walk', 'Bus', 'MRT', 'Car', 'Bicycle'] },
    { title: 'Favourite fruit of the pupils in 4A', thing: 'pupils',
      cats: ['Apple', 'Banana', 'Mango', 'Papaya', 'Pear'] },
    { title: 'Drinks sold at the school canteen', thing: 'drinks',
      cats: ['Milo', 'Water', 'Juice', 'Soya bean', 'Iced tea'] },
    { title: 'CCAs chosen by the pupils', thing: 'pupils',
      cats: ['Choir', 'Netball', 'Scouts', 'Art Club', 'Chess'] },
    { title: 'Books borrowed from the school library', thing: 'books',
      cats: ['Comics', 'Science', 'History', 'Poetry', 'Sports'] }
  ];

  const FILL = ['#93c5fd', '#fdba74', '#86efac', '#f9a8d4', '#fcd34d'];

  /* n distinct share weights, every one at least 1/6 of the whole (60 degrees).
     `gap` also forces the largest and the smallest clear by 2 weights, so "which
     sector is biggest" has one unarguable answer. */
  function shares(n, gap) {
    for (let t = 0; t < 500; t++) {
      const u = [];
      for (let i = 0; i < n; i++) u.push(ri(4, 14));
      const S = u.reduce((a, b) => a + b, 0);
      if (new Set(u).size !== n) continue;
      if (Math.min.apply(null, u) * 6 < S) continue;
      if (gap) {
        const s = u.slice().sort((a, b) => b - a);
        if (s[0] - s[1] < 2 || s[n - 2] - s[n - 1] < 2) continue;
      }
      return u;
    }
    return n === 3 ? [5, 7, 9] : (n === 4 ? [5, 6, 7, 8] : [10, 11, 12, 13, 14]);
  }

  /* Twelfths: 3 distinct parts, each at least 2/12, so every printed fraction is a
     P4 fraction and every sector still clears 60 degrees.
     Wave-3 pie wound 1 (W3 Pie+Cosmetics Refutation): [2,4,6] is 1/6 + 1/3 + 1/2, every
     part a UNIT fraction, so "1/2 of the whole is 30" collapsed the pool-3 fraction
     items to one mental step in 378-380 of 500 draws. That set is gone, and every
     remaining set carries exactly one non-unit part (5/12 or 7/12) which askIndex()
     picks most of the time. */
  const TWELFTHS = [[2, 3, 7], [3, 4, 5]];

  /* Index of the non-unit twelfth (5/12 or 7/12) in a shuffled weight list, chosen
     3 draws in 4 so the fraction items are genuinely two-step. */
  function askIndex(w) {
    const hard = w.findIndex(x => x === 5 || x === 7);
    if (hard < 0 || Math.random() < 0.25) return ri(0, w.length - 1);
    return hard;
  }

  const CX = 112, CY = 112, R = 92, LR = 57;
  const px = a => CX + R * Math.cos(a), py = a => CY + R * Math.sin(a);

  /* makePie: `labels[i]` is the STRING printed inside sector i AND in the legend
     beside cats[i] - a count, a fraction like "1/4", or "?" for a hidden sector. */
  function makePie(set, cats, weights, labels, caption) {
    const S = weights.reduce((a, b) => a + b, 0);
    let a0 = -Math.PI / 2, svg = '', lab = '';
    for (let i = 0; i < cats.length; i++) {
      const sweep = weights[i] / S * Math.PI * 2, a1 = a0 + sweep;
      svg += '<path class="pie-sec" d="M ' + CX + ' ' + CY + ' L ' + px(a0).toFixed(1) + ' ' +
        py(a0).toFixed(1) + ' A ' + R + ' ' + R + ' 0 ' + (sweep > Math.PI ? 1 : 0) + ' 1 ' +
        px(a1).toFixed(1) + ' ' + py(a1).toFixed(1) + ' Z" fill="' + FILL[i % FILL.length] +
        '" stroke="#ffffff" stroke-width="2"/>';
      const am = a0 + sweep / 2;
      lab += '<text class="pie-lab" x="' + (CX + LR * Math.cos(am)).toFixed(1) + '" y="' +
        (CY + LR * Math.sin(am) + 5).toFixed(1) + '" text-anchor="middle" font-size="15" ' +
        'font-weight="700" fill="#0f172a">' + labels[i] + '</text>';
      a0 = a1;
    }
    let legend = '<div class="pie-legend" style="display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:8px">';
    for (let i = 0; i < cats.length; i++) {
      legend += '<span class="pie-key" style="display:inline-flex;align-items:center;gap:6px;font-size:13px">' +
        '<span style="width:13px;height:13px;border-radius:3px;background:' + FILL[i % FILL.length] +
        ';border:1px solid #94a3b8;display:inline-block"></span>' +
        '<span class="pie-cat" style="color:#0f172a">' + cats[i] + '</span>' +
        '<b class="pie-val" style="color:#0f172a">' + labels[i] + '</b></span>';
    }
    legend += '</div>';
    return '<div class="piechart" style="display:inline-block;background:#fff;color:#0f172a;' +
      'padding:12px 14px;border-radius:8px;font-size:13px;text-align:left;max-width:100%">' +
      '<div style="font-weight:600;margin-bottom:6px">' + set.title + '</div>' +
      '<svg width="230" height="230" viewBox="0 0 230 230" style="display:block;font-family:inherit">' +
      svg + lab + '</svg>' + legend +
      '<div style="margin-top:6px;font-size:.85em;color:#475569">' + caption + '</div></div>';
  }

  /* A count pie: n sectors, each printing its own number. */
  function countPie(n, gap) {
    const set = pick(SETS);
    const cats = shuffle(set.cats.slice()).slice(0, n);
    const w = shares(n, gap);
    const m = pick([1, 1, 2, 5]);
    const vals = w.map(x => x * m);
    return { set, cats, vals, thing: set.thing,
      html: makePie(set, cats, w, vals.map(String),
        'Number of ' + set.thing + '. Each sector is labelled with its number of ' + set.thing + '.'),
      val: c => vals[cats.indexOf(c)],
      total: vals.reduce((a, b) => a + b, 0) };
  }

  function fracText(n, d) { const g = gcd(n, d); return (n / g) + '/' + (d / g); }

  /* A fraction pie: 3 sectors, each printing its fraction of the whole circle. */
  function fracPie() {
    const set = pick(SETS);
    const w = shuffle(pick(TWELFTHS).slice());
    const cats = shuffle(set.cats.slice()).slice(0, 3);
    const labels = w.map(x => fracText(x, 12));
    return { set, cats, w, labels, thing: set.thing,
      html: makePie(set, cats, w, labels,
        'Each sector is labelled with its fraction of the whole circle.') };
  }

  /* Text-choice MC. finishNum only builds numeric options; these items answer with a
     category name or a whole sentence, so they need their own finisher. */
  function finishText(qHtml, extraHtml, correct, distractors, explain) {
    const opts = [correct];
    for (const d of shuffle(distractors.slice())) {
      if (opts.length >= 4) break;
      if (!opts.includes(d)) opts.push(d);
    }
    if (opts.length < 4) return null;
    const order = shuffle(opts.map((_, i) => i));
    return { q: qHtml, extra: extraHtml || '', choices: order.map(i => opts[i]),
             correct: order.indexOf(0), explain, answerText: correct };
  }

  /* ---------------- skill: read (3 stem shapes) ---------------- */

  function gPieRead() {                                    /* shape 1: named sector */
    const p = countPie(pick([3, 4, 5]), false);
    const i = ri(0, p.cats.length - 1);
    const o = p.vals.filter((_, j) => j !== i);
    return finishNum('On the pie chart, how many ' + p.thing + ' are shown for ' + p.cats[i] + '?',
      p.html, p.vals[i], [o[0], o[1], o.length > 2 ? o[2] : p.total, p.vals[i] + 1], '',
      'Find ' + p.cats[i] + ' in the key, then read the number printed inside that sector of the circle: ' +
      p.vals[i] + '.');
  }

  function gPieWhichCat() {                                /* shape 2: value -> name */
    /* 4 or 5 sectors, never 3: the three wrong options are the OTHER category names,
       so a 3-sector pie could not fill four distinct choices. */
    const p = countPie(pick([4, 5]), false);
    const i = ri(0, p.cats.length - 1);
    const others = p.cats.filter((_, j) => j !== i);
    return finishText('On the pie chart, one sector shows ' + p.vals[i] + ' ' + p.thing +
      '. Which one is it?', p.html, p.cats[i], others,
      'Look along the key for the sector labelled ' + p.vals[i] + '. That is ' + p.cats[i] + '.');
  }

  function gPieTotal() {                                   /* shape 3: whole circle */
    const p = countPie(pick([3, 4]), false);
    return finishNum('How many ' + p.thing + ' are shown on the whole pie chart altogether?',
      p.html, p.total,
      [p.total - p.vals[0], p.total + p.vals[0], p.total - 1, Math.max.apply(null, p.vals)], '',
      'The sectors together make the whole circle, so add every one: ' + p.vals.join(' + ') +
      ' = ' + p.total + '.');
  }

  /* ---------------- skill: compare (3 stem shapes) ---------------- */

  function gPieMost() {                                    /* shape 1: biggest slice */
    const p = countPie(pick([3, 4]), true);
    const big = Math.max.apply(null, p.vals);
    const cat = p.cats[p.vals.indexOf(big)];
    const o = p.vals.filter(v => v !== big);
    return finishNum('On the pie chart, one sector is bigger than all the others. How many ' +
      p.thing + ' does that sector show?', p.html, big, [o[0], o[1], big + 1, p.total], '',
      'The biggest sector takes up the most of the circle. It is ' + cat +
      ', and the number printed inside it is ' + big + '.');
  }

  function gPieLeast() {                                   /* shape 2: smallest slice */
    const p = countPie(pick([3, 4]), true);
    const small = Math.min.apply(null, p.vals);
    const cat = p.cats[p.vals.indexOf(small)];
    const o = p.vals.filter(v => v !== small);
    return finishNum('On the pie chart, one sector is smaller than all the others. How many ' +
      p.thing + ' does that sector show?', p.html, small, [o[0], o[1], small + 1, p.total], '',
      'The smallest sector takes up the least of the circle. It is ' + cat +
      ', and the number printed inside it is ' + small + '.');
  }

  function gPieCountAbove() {                              /* shape 3: count sectors */
    const p = countPie(pick([4, 5]), false);
    const sorted = p.vals.slice().sort((a, b) => a - b);
    const k = ri(1, p.vals.length - 1);                    /* 1..n-1 sectors above */
    const cut = sorted[p.vals.length - k] - 1;             /* strictly below the kth largest */
    const above = p.vals.filter(v => v > cut).length;
    const cands = [1, 2, 3, 4, 5].filter(v => v !== above);
    return finishNum('How many sectors of the pie chart show more than ' + cut + ' ' + p.thing + '?',
      p.html, above, cands, '',
      'Read every sector, then count only the ones bigger than ' + cut + ': ' +
      p.vals.filter(v => v > cut).join(', ') + '. That is ' + above + ' sector' +
      (above === 1 ? '' : 's') + '.');
  }

  /* ---------------- skill: interpret (3 stem shapes) ---------------- */

  function gPieCombine() {                                 /* shape 1: altogether */
    const p = countPie(pick([3, 4, 5]), false);
    const ord = shuffle(p.cats.map((_, i) => i));
    const a = ord[0], b = ord[1], s = p.vals[a] + p.vals[b];
    return finishNum('On the pie chart, how many ' + p.thing + ' are shown for ' + p.cats[a] +
      ' and ' + p.cats[b] + ' altogether?', p.html, s,
      [Math.abs(p.vals[a] - p.vals[b]), p.vals[a], p.vals[b], s + 1, p.total], '',
      'Read both sectors first: ' + p.cats[a] + ' shows ' + p.vals[a] + ' and ' + p.cats[b] +
      ' shows ' + p.vals[b] + '. Then ' + p.vals[a] + ' + ' + p.vals[b] + ' = ' + s + '.');
  }

  function gPieDiff() {                                    /* shape 2: how many more */
    const p = countPie(pick([3, 4]), false);
    const ord = shuffle(p.cats.map((_, i) => i));
    let a = ord[0], b = ord[1];
    if (p.vals[a] < p.vals[b]) { const t = a; a = b; b = t; }
    const d = p.vals[a] - p.vals[b];
    return finishNum('On the pie chart, how many more ' + p.thing + ' are shown for ' + p.cats[a] +
      ' than for ' + p.cats[b] + '?', p.html, d,
      [p.vals[a] + p.vals[b], p.vals[a], p.vals[b], d + 1], '',
      p.cats[a] + ' shows ' + p.vals[a] + ' and ' + p.cats[b] + ' shows ' + p.vals[b] + '. ' +
      p.vals[a] + ' − ' + p.vals[b] + ' = ' + d + '. "How many more" is always a subtraction.');
  }

  /* shape 3, POOL 3, TWO STEPS: add two sectors, then compare that total with a
     third sector. Neither step alone answers the question. */
  function gPieTwoThenCompare() {
    for (let t = 0; t < 60; t++) {
      const p = countPie(pick([3, 4]), false);
      const ord = shuffle(p.cats.map((_, i) => i));
      const a = ord[0], b = ord[1], c = ord[2];
      const s = p.vals[a] + p.vals[b], d = s - p.vals[c];
      if (d <= 0) continue;
      return finishNum('On the pie chart, ' + p.cats[a] + ' and ' + p.cats[b] +
        ' are put together. How many more ' + p.thing + ' is that than ' + p.cats[c] + ' alone?',
        p.html, d, [s, p.vals[c], s + p.vals[c], d + 1, p.vals[a]], '',
        'First add the two sectors: ' + p.vals[a] + ' + ' + p.vals[b] + ' = ' + s + '. Then take ' +
        p.cats[c] + ' away: ' + s + ' − ' + p.vals[c] + ' = ' + d +
        '. Two steps, and the first answer is not the final one.');
    }
    return gPieCombine();
  }

  /* shape 4, POOL 3: spot the false claim. Three statements are true of the printed
     chart and one is not; the child must check all four. */
  function gPieWrongStatement() {
    const p = countPie(pick([3, 4]), true);
    const cats = p.cats, vals = p.vals;
    const big = Math.max.apply(null, vals), small = Math.min.apply(null, vals);
    const bigC = cats[vals.indexOf(big)], smallC = cats[vals.indexOf(small)];
    const ord = shuffle(cats.map((_, i) => i));
    const a = ord[0], b = ord[1];
    const hi = vals[a] > vals[b] ? a : b, lo = vals[a] > vals[b] ? b : a;
    const T = [
      bigC + ' shows the most ' + p.thing + '.',
      smallC + ' shows the fewest ' + p.thing + '.',
      cats[hi] + ' shows more ' + p.thing + ' than ' + cats[lo] + '.',
      cats[a] + ' and ' + cats[b] + ' together show ' + (vals[a] + vals[b]) + ' ' + p.thing + '.',
      'There are ' + p.total + ' ' + p.thing + ' altogether on the chart.'
    ];
    const F = [
      smallC + ' shows the most ' + p.thing + '.',
      bigC + ' shows the fewest ' + p.thing + '.',
      cats[lo] + ' shows more ' + p.thing + ' than ' + cats[hi] + '.',
      cats[a] + ' and ' + cats[b] + ' together show ' + (vals[a] + vals[b] + big) + ' ' + p.thing + '.',
      'There are ' + (p.total + small) + ' ' + p.thing + ' altogether on the chart.'
    ];
    const wrong = F[ri(0, F.length - 1)];
    /* Wave-3 pie wound 2 (W3 Pie+Cosmetics Refutation): filtering on exact string left
       the false claim's own TRUE twin in the options in 113 of 500 draws ("... together
       show 14 pupils." beside "... show 22 pupils."), so a child could narrow four
       options to two without reading the chart. Filter on the DIGIT-MASKED form. */
    const mask = str => String(str).replace(/\d+/g, '#');
    const wrongMask = mask(wrong);
    const trues = shuffle([...new Set(T.filter(s => mask(s) !== wrongMask))]);
    if (trues.length < 3) return gPieWrongStatement();
    return finishText('One of these statements about the pie chart is WRONG. Which one is it?',
      p.html, wrong, trues,
      'Check each statement against the numbers printed on the chart (' +
      cats.map((c, i) => c + ' ' + vals[i]).join(', ') + '). Only one does not match: "' +
      wrong + '"');
  }

  /* Wave-3 pie wound 3 (W3 Pie+Cosmetics Refutation): gPieWrongStatement had exactly
     one masked stem shape, so the statement skill leaned on a single sentence a child
     recognises instantly. This is its mirror: THREE false claims and one true one, so
     the child must still check all four but the reading task is inverted. */
  function gPieTrueStatement() {
    const p = countPie(pick([3, 4]), true);
    const cats = p.cats, vals = p.vals;
    const big = Math.max.apply(null, vals), small = Math.min.apply(null, vals);
    const bigC = cats[vals.indexOf(big)], smallC = cats[vals.indexOf(small)];
    const ord = shuffle(cats.map((_, i) => i));
    const a = ord[0], b = ord[1];
    if (vals[a] === vals[b]) return gPieTrueStatement();
    const hi = vals[a] > vals[b] ? a : b, lo = vals[a] > vals[b] ? b : a;
    const T = [
      bigC + ' shows the most ' + p.thing + '.',
      smallC + ' shows the fewest ' + p.thing + '.',
      cats[hi] + ' shows more ' + p.thing + ' than ' + cats[lo] + '.',
      cats[a] + ' and ' + cats[b] + ' together show ' + (vals[a] + vals[b]) + ' ' + p.thing + '.',
      'There are ' + p.total + ' ' + p.thing + ' altogether on the chart.'
    ];
    const F = [
      smallC + ' shows the most ' + p.thing + '.',
      bigC + ' shows the fewest ' + p.thing + '.',
      cats[lo] + ' shows more ' + p.thing + ' than ' + cats[hi] + '.',
      cats[a] + ' and ' + cats[b] + ' together show ' + (vals[a] + vals[b] + big) + ' ' + p.thing + '.',
      'There are ' + (p.total + small) + ' ' + p.thing + ' altogether on the chart.'
    ];
    const right = T[ri(0, T.length - 1)];
    const mask = str => String(str).replace(/\d+/g, '#');
    const rightMask = mask(right);
    const falses = shuffle([...new Set(F.filter(s => mask(s) !== rightMask))]);
    if (falses.length < 3) return gPieTrueStatement();
    return finishText('Three of these statements about the pie chart are WRONG. Which one is TRUE?',
      p.html, right, falses,
      'Check each statement against the numbers printed on the chart (' +
      cats.map((c, i) => c + ' ' + vals[i]).join(', ') + '). Only one matches: "' +
      right + '"');
  }

  /* Wave-3 pie wound 3, third shape: every statement is a "how many more" claim about
     one PAIR of sectors, so the child does a subtraction on each option instead of a
     max/min scan. Exactly one claim is false and it is always the key. */
  function gPieCompareStatement() {
    const p = countPie(4, true);
    const cats = p.cats, vals = p.vals;
    const ord = shuffle(cats.map((_, i) => i));
    const pairs = [[ord[0], ord[1]], [ord[1], ord[2]], [ord[2], ord[3]], [ord[3], ord[0]]];
    const say = (i, j, n) => cats[i] + ' shows ' + n + ' more ' + p.thing + ' than ' + cats[j] + '.';
    const opts = [];
    for (const [i, j] of pairs) {
      const hi = vals[i] >= vals[j] ? i : j, lo = vals[i] >= vals[j] ? j : i;
      const d = vals[hi] - vals[lo];
      if (d < 1) return gPieCompareStatement();
      opts.push({ i: hi, j: lo, d });
    }
    const k = ri(0, 3);
    const seen = new Set();
    let wrong = null;
    const trues = [];
    for (let x = 0; x < 4; x++) {
      const o = opts[x];
      const off = pick([1, 2, 3]) * (Math.random() < 0.5 ? 1 : -1);
      const n = x === k ? o.d + off : o.d;
      if (n < 1) return gPieCompareStatement();
      const line = say(o.i, o.j, n);
      if (seen.has(line)) return gPieCompareStatement();
      seen.add(line);
      if (x === k) wrong = line; else trues.push(line);
    }
    if (!wrong || trues.length !== 3) return gPieCompareStatement();
    return finishText('Each statement below compares two sectors of the pie chart. Which one is WRONG?',
      p.html, wrong, trues,
      'Work out each difference from the numbers printed on the chart (' +
      cats.map((c, i) => c + ' ' + vals[i]).join(', ') + '). Every statement checks out except "' +
      wrong + '"');
  }

  /* ---------------- skill: whole (3 stem shapes, all POOL 3, all multi-step) ------ */

  function gPieMissing() {                                 /* shape 1: missing sector */
    const set = pick(SETS);
    const n = pick([3, 4]);
    const cats = shuffle(set.cats.slice()).slice(0, n);
    const w = shares(n, false), m = pick([1, 2, 5]);
    const vals = w.map(x => x * m);
    const total = vals.reduce((a, b) => a + b, 0);
    const h = ri(0, n - 1);
    const labels = vals.map((v, i) => (i === h ? '?' : String(v)));
    const html = makePie(set, cats, w, labels,
      'Number of ' + set.thing + '. One sector is marked with a ?.');
    const known = vals.filter((_, i) => i !== h);
    const knownSum = known.reduce((a, b) => a + b, 0);
    return finishNum('Altogether there are ' + total + ' ' + set.thing +
      ' on the pie chart. How many ' + set.thing + ' are shown for ' + cats[h] + '?',
      html, vals[h], [knownSum, total, vals[h] + 1, known[0], known[1]], '',
      'First add the sectors you can read: ' + known.join(' + ') + ' = ' + knownSum +
      '. The whole circle is ' + total + ', so the ? sector is ' + total + ' − ' + knownSum +
      ' = ' + vals[h] + '.');
  }

  function gPieFracOfSet() {                               /* shape 2: fraction of a set */
    const p = fracPie();
    const m = ri(2, 8), total = 12 * m;
    const i = askIndex(p.w);
    const ans = p.w[i] * m;
    return finishNum('The pie chart shows how all ' + total + ' ' + p.thing +
      ' are shared out. How many ' + p.thing + ' are shown for ' + p.cats[i] + '?',
      p.html, ans, [p.w[(i + 1) % 3] * m, p.w[(i + 2) % 3] * m, total, ans + 1], '',
      p.cats[i] + ' is ' + p.labels[i] + ' of the whole circle and the whole circle is ' + total +
      ' ' + p.thing + '. Split ' + total + ' into equal parts first, then take ' + p.labels[i] +
      ' of them: ' + ans + '.');
  }

  function gPieFindWhole() {                               /* shape 3: find the whole */
    const p = fracPie();
    const m = ri(2, 8), total = 12 * m;
    const i = askIndex(p.w);
    const part = p.w[i] * m;
    return finishNum('On the pie chart, the ' + p.cats[i] + ' sector stands for ' + part + ' ' +
      p.thing + '. How many ' + p.thing + ' are there altogether?',
      p.html, total, [part, p.w[(i + 1) % 3] * m, total - part, total + 1], '',
      p.cats[i] + ' is ' + p.labels[i] + ' of the whole circle, and that is ' + part + ' ' +
      p.thing + '. So one twelfth of the circle is ' + m + ', and the whole circle is 12 × ' +
      m + ' = ' + total + '.');
  }

  MQI.registerTopic({
    id: 'p4pie', level: 'P4', strand: 'Statistics',
    moeSubTopic: 'Tables, Line Graphs and Pie Charts: reading and interpreting data from pie charts',
    label: 'Pie Chart Point', short: 'Pie charts', e: '🥧',
    skills: {
      read: { label: 'Reading a pie chart', tip: 'Match the name in the key to the sector, then read the number printed inside it. Never judge from the size of the slice alone.' },
      compare: { label: 'Comparing sectors', tip: 'The bigger the slice, the bigger the number. Check your eye against the printed numbers before you answer.' },
      interpret: { label: 'Using the whole chart', tip: '"Altogether" is an addition, "how many more" is a subtraction. For a two-step question, say the first answer out loud before you use it.' },
      whole: { label: 'The whole circle', tip: 'Every sector together makes one whole circle. If a sector is missing, take the ones you can read away from the total.' }
    },
    pools: {
      1: [[gPieRead, 'read'], [gPieMost, 'compare'], [gPieWhichCat, 'read']],
      2: [[gPieTotal, 'read'], [gPieLeast, 'compare'], [gPieCountAbove, 'compare'], [gPieCombine, 'interpret']],
      3: [[gPieDiff, 'interpret'], [gPieTwoThenCompare, 'interpret'], [gPieWrongStatement, 'interpret'],
          [gPieTrueStatement, 'interpret'], [gPieCompareStatement, 'interpret'],
          [gPieMissing, 'whole'], [gPieFracOfSet, 'whole'], [gPieFindWhole, 'whole']]
    }
  });
})();
