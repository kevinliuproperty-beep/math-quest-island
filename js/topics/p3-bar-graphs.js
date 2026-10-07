"use strict";
/* Math Quest Island topic: p3bargraph (P3). Self-contained. MC numeric.
 * Authoring rules + registration shape: js/topics/README.md
 * Scope limit (MOE Oct 2025, p.36): reading and interpreting data from bar
 * graphs, and using different scales on the axis. Reading only. No drawing of
 * graphs, no tables/line graphs/pie charts (P4), no average (P6).
 *
 * The graph leaves this file as PURE DATA on `q.figure` ({type:'bar', ...}); the
 * shared renderer js/figures.js draws it: a category axis down the left, a value
 * axis along the bottom with one tick per scale unit and a number under every
 * tick, gridlines through the plot, and a numeric value label at the end of each
 * bar. NOTHING is carried in a data-* attribute: the harness oracle re-derives
 * every value by parsing the same rendered labels and ticks a child reads off
 * the screen. Spec fields are documented in js/topics/README.md.
 */
(function () {
  const G = MQI.gen;
  const ri = G.ri, pick = G.pick, shuffle = G.shuffle, finishNum = G.finishNum;

  /* attach a figure spec to a finished question */
  const fig = (q, figure) => (q.figure = figure, q);

  const SETS = [
    { title:'Favourite hawker dish in Primary 3 Resilience', thing:'pupils',
      cats:['Chicken rice','Laksa','Nasi lemak','Char kway teow','Mee goreng'] },
    { title:'How Primary 3 pupils travel to school', thing:'pupils',
      cats:['MRT','Bus','Walk','Car','Bicycle'] },
    { title:'CCA chosen by Primary 3 pupils', thing:'pupils',
      cats:['Football','Choir','Art club','Badminton','Scouts'] },
    { title:'Drinks sold at the school canteen on Monday', thing:'packets',
      cats:['Milo','Soya bean','Bandung','Barley','Chrysanthemum tea'] },
    { title:'Durians sold at the stall this week', thing:'durians',
      cats:['Monday','Tuesday','Wednesday','Thursday','Friday'] }
  ];

  function makeGraph(scale, nBars){
    const set = pick(SETS);
    const cats = shuffle(set.cats).slice(0, nBars);
    const units = [];
    while (units.length < nBars){
      const u = ri(2, 9);
      if (!units.includes(u)) units.push(u);
    }
    /* the note under the graph says "stands for 1 pupil" but "stands for 5 pupils" */
    const unitLabel = scale === 1 ? set.thing.replace(/s$/, '') : set.thing;

    const figure = { type:'bar', title:set.title, cats, units, scale,
                     maxUnit: Math.max.apply(null, units), unitLabel };
    return { figure, cats, units, scale, thing:set.thing,
             val: i => units[i]*scale };
  }

  function gReadOne(){
    const g = makeGraph(1, 4);
    const i = ri(0, 3);
    return fig(finishNum('How many ' + g.thing + ' does the graph show for ' + g.cats[i] + '?', '', g.val(i),
      [g.val((i+1)%4), g.val((i+2)%4), g.val(i) + 1, g.val(i) + 2], '',
      'Follow the ' + g.cats[i] + ' bar across to the scale. It reaches ' + g.val(i) + '.'), g.figure);
  }
  function gDiffOne(){
    const g = makeGraph(1, 4);
    const order = shuffle([0,1,2,3]);
    let a = order[0], b = order[1];
    if (g.val(a) < g.val(b)) { const t = a; a = b; b = t; }
    return fig(finishNum('How many more ' + g.thing + ' are shown for ' + g.cats[a] + ' than for ' + g.cats[b] + '?',
      '', g.val(a) - g.val(b),
      [g.val(a) + g.val(b), g.val(a), g.val(b), g.val(a) - g.val(b) + 1], '',
      g.cats[a] + ' shows ' + g.val(a) + ' and ' + g.cats[b] + ' shows ' + g.val(b) + '. ' +
      g.val(a) + ' - ' + g.val(b) + ' = ' + (g.val(a) - g.val(b)) + '.'), g.figure);
  }
  function gReadScaled(){
    const g = makeGraph(pick([2, 5]), 4);
    const i = ri(0, 3);
    return fig(finishNum('How many ' + g.thing + ' does the graph show for ' + g.cats[i] + '?', '', g.val(i),
      [g.units[i], g.val(i) + g.scale, g.val((i+1)%4), g.val(i) + 1], '',
      'The ' + g.cats[i] + ' bar is ' + g.units[i] + ' units long and each unit stands for ' + g.scale +
      ', so ' + g.units[i] + ' x ' + g.scale + ' = ' + g.val(i) + '.'), g.figure);
  }
  function gDiffScaled(){
    const g = makeGraph(pick([2, 5]), 4);
    const order = shuffle([0,1,2,3]);
    let a = order[0], b = order[1];
    if (g.val(a) < g.val(b)) { const t = a; a = b; b = t; }
    return fig(finishNum('How many more ' + g.thing + ' are shown for ' + g.cats[a] + ' than for ' + g.cats[b] + '?',
      '', g.val(a) - g.val(b),
      [g.units[a] - g.units[b], g.val(a) + g.val(b), g.val(a), g.val(b)], '',
      'Read both bars with the scale first: ' + g.val(a) + ' and ' + g.val(b) + '. Then ' + g.val(a) + ' - ' + g.val(b) +
      ' = ' + (g.val(a) - g.val(b)) + '. Counting units instead of values is the usual slip.'), g.figure);
  }
  function gTotalScaled(){
    const g = makeGraph(pick([5, 10]), 5);
    const order = shuffle([0,1,2,3,4]);
    const a = order[0], b = order[1];
    return std(fig(finishNum('How many ' + g.thing + ' are shown for ' + g.cats[a] + ' and ' + g.cats[b] + ' altogether?',
      '', g.val(a) + g.val(b),
      [g.units[a] + g.units[b], Math.abs(g.val(a) - g.val(b)), g.val(a) + g.val(b) + g.scale, g.val(a)], '',
      g.cats[a] + ' is ' + g.units[a] + ' x ' + g.scale + ' = ' + g.val(a) + ' and ' + g.cats[b] + ' is ' +
      g.units[b] + ' x ' + g.scale + ' = ' + g.val(b) + '. Altogether ' + (g.val(a) + g.val(b)) + '.'), g.figure));
  }
  function gTotalMixed(){
    const g = makeGraph(pick([2, 5, 10]), 5);
    const order = shuffle([0,1,2,3,4]);
    const a = order[0], b = order[1];
    return std(fig(finishNum('How many ' + g.thing + ' are shown for ' + g.cats[a] + ' and ' + g.cats[b] + ' altogether?',
      '', g.val(a) + g.val(b),
      [g.units[a] + g.units[b], g.val(a) + g.val(b) + g.scale, Math.abs(g.val(a) - g.val(b)), g.val(b)], '',
      'Each unit stands for ' + g.scale + '. ' + g.val(a) + ' + ' + g.val(b) + ' = ' + (g.val(a) + g.val(b)) + '.'), g.figure));
  }

  /* ===== B1 HARD LANE (2026-10-07): multi-step bar graph problems ===========
   * Exam-hard (q.band = 3) shapes from the P3 EOY calibration, card B1:
   *   value x price, a missing bar given by a stated relation, two-step comparisons.
   * Every graph is a week of sales, Monday to Friday, with a scale of 2, 5 or 10.
   * Distractors are named slips: counting bar units instead of values (scale read
   * as 1), forgetting the price, stopping one step early, adding for "how many more".
   * The oracle in tools/gen-sanity.mjs re-reads the RENDERED bar labels and recomputes. */
  const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday'];
  const SALES = [
    { title:'Cups of sugarcane juice sold at a hawker stall', thing:'cups', one:'cup', full:'cups of sugarcane juice',
      seller:'the stall', prices:[2, 3] },
    { title:'Bowls of ice kachang sold at a dessert stall', thing:'bowls', one:'bowl', full:'bowls of ice kachang',
      seller:'the stall', prices:[3, 4] },
    { title:'Curry puffs sold at a bakery', thing:'curry puffs', one:'curry puff', full:'curry puffs',
      seller:'the bakery', prices:[2, 3] },
    { title:'Kaya toast sets sold at a coffee shop', thing:'sets', one:'set', full:'kaya toast sets',
      seller:'the coffee shop', prices:[4, 5] },
    { title:'Packets of chicken rice sold at a hawker stall', thing:'packets', one:'packet', full:'packets of chicken rice',
      seller:'the stall', prices:[4, 5] },
    { title:'Storybooks sold at the school bookshop', thing:'storybooks', one:'storybook', full:'storybooks',
      seller:'the bookshop', prices:[3, 4, 5] }
  ];
  const OWNERS = [['Mr Tan','he'],['Mrs Lim','she'],['Madam Rahimah','she'],['Mr Kumar','he'],['Auntie Mei Ling','she']];
  const std  = q => (q.band = 2, q);
  const hard = q => (q.band = 3, q);
  const money = n => '$' + n;

  /* five bar lengths (2..9) in weekday order; day `hide` (or -1) is left OUT of the
     drawing - cats and units both - and is given in words instead. */
  function salesGraph(scale, units, hide, set){
    set = set || pick(SALES);
    const cats = [], shown = [];
    for (let i = 0; i < 5; i++) if (i !== hide) { cats.push(DAYS[i]); shown.push(units[i]); }
    const figure = { type:'bar', title:set.title, cats, units:shown, scale,
                     maxUnit: Math.max.apply(null, shown), unitLabel:set.thing };
    return { set, figure, units, scale, val: i => units[i]*scale };
  }
  function distinctUnits(n, avoid){
    const out = [];
    while (out.length < n){
      const u = ri(2, 9);
      if (!out.includes(u) && !(avoid || []).includes(u)) out.push(u);
    }
    return out;
  }
  /* MC over numbers: the key plus the first three valid AUTHORED distractors, or
     null so the caller re-rolls. Nothing is ever padded in. */
  function mcNum(stem, key, dists, fmt, explain){
    const vals = [key];
    for (const d of dists){
      if (d > 0 && Number.isInteger(d) && !vals.includes(d)) vals.push(d);
      if (vals.length === 4) break;
    }
    if (vals.length < 4) return null;
    const order = shuffle([0,1,2,3]);
    const q = { q:stem, extra:'', choices:order.map(i => fmt(vals[i])), correct:order.indexOf(0),
                explain, answerText:fmt(key) };
    if (fmt === String) q.authored = vals.slice(1);
    return q;
  }
  const retry = build => { for (let t = 0; t < 400; t++){ const q = build(); if (q) return q; } throw new Error('no valid draw'); };
  const intro = g => 'The bar graph shows the number of ' + g.set.full + ' sold at ' + g.set.seller + ' from Monday to Friday.';
  const readOut = (g, i) => DAYS[i] + ' is ' + g.units[i] + ' × ' + g.scale + ' = ' + g.val(i);

  /* value x price: "how much more money" or "how much money altogether" */
  function gSalesMoney(){
    return retry(() => {
      const g = salesGraph(pick([2, 5, 10]), distinctUnits(5), -1);
      const p = pick(g.set.prices), one = g.set.one, th = g.set.thing;
      let [a, b] = shuffle([0,1,2,3,4]).slice(0, 2);
      const lead = intro(g) + ' Each ' + one + ' was sold for ' + money(p) + '. ';
      let q;
      if (Math.random() < 0.5){
        if (g.val(a) < g.val(b)) { const t = a; a = b; b = t; }
        const d = g.val(a) - g.val(b), key = d * p;
        q = mcNum(lead + 'How much more money did ' + g.set.seller + ' collect on ' + DAYS[a] + ' than on ' + DAYS[b] + '?',
          key, [(g.units[a] - g.units[b]) * p, d, (g.val(a) + g.val(b)) * p], money,
          'Step 1: read both bars with the scale. ' + readOut(g, a) + ' ' + th + ' and ' + readOut(g, b) + ' ' + th + '. ' +
          'Step 2: ' + DAYS[a] + ' sold ' + g.val(a) + ' − ' + g.val(b) + ' = ' + d + ' more ' + th + '. ' +
          'Step 3: each ' + one + ' is ' + money(p) + ', so the extra money is ' + d + ' × ' + money(p) + ' = ' + money(key) + '. ' +
          'Counting bar units instead of ' + th + ', or stopping before the price, are the usual slips.');
      } else {
        if (a > b) { const t = a; a = b; b = t; }
        const s = g.val(a) + g.val(b), key = s * p;
        q = mcNum(lead + 'How much money did ' + g.set.seller + ' collect on ' + DAYS[a] + ' and ' + DAYS[b] + ' altogether?',
          key, [(g.units[a] + g.units[b]) * p, s, g.val(a) * p + g.val(b)], money,
          'Step 1: read both bars with the scale. ' + readOut(g, a) + ' ' + th + ' and ' + readOut(g, b) + ' ' + th + '. ' +
          'Step 2: altogether ' + g.val(a) + ' + ' + g.val(b) + ' = ' + s + ' ' + th + '. ' +
          'Step 3: each ' + one + ' is ' + money(p) + ', so ' + s + ' × ' + money(p) + ' = ' + money(key) + '. ' +
          'Multiply the whole total by the price, not just one day.');
      }
      return q && hard(fig(q, g.figure));
    });
  }

  /* work backwards from money to a bar: "On which day did the stall collect $45?" */
  function gSalesWhichDay(){
    return retry(() => {
      const scale = pick([2, 5, 10]);
      const set = pick(SALES), p = pick(set.prices), th = set.thing;
      const ansU = ri(2, 9);
      const trapP = ansU * p, trapS = ansU * scale;      /* bar lengths a slip lands on */
      const traps = [];
      if (trapP <= 9) traps.push(trapP);                 /* reads the $ amount as a number of items */
      if (trapS <= 9 && trapS !== trapP) traps.push(trapS); /* reads every bar with a scale of 1 */
      if (!traps.length) return null;
      const units = new Array(5);
      const days = shuffle([0,1,2,3,4]);
      const ad = days[0];
      units[ad] = ansU;
      traps.forEach((u, k) => { units[days[1 + k]] = u; });
      const rest = distinctUnits(4 - traps.length, [ansU].concat(traps));
      for (let k = 1 + traps.length, r = 0; k < 5; k++, r++) units[days[k]] = rest[r];
      const g = salesGraph(scale, units, -1, set);
      const items = ansU * scale, target = items * p;
      /* options: the key, every trap day, then other days, listed in weekday order */
      const optDays = days.slice(0, 1 + traps.length);
      for (const d of shuffle(days.slice(1 + traps.length))) if (optDays.length < 4) optDays.push(d);
      optDays.sort((x, y) => x - y);
      const slip = trapP <= 9
        ? ' The day whose bar shows ' + target + ' ' + th + ' is a trap: the question is about money, not ' + th + '.'
        : ' Read every bar with the scale, not as a count of units.';
      const q = { q: intro(g) + ' Each ' + set.one + ' was sold for ' + money(p) + '. On which day did ' + set.seller +
                  ' collect ' + money(target) + '?',
        extra:'', choices: optDays.map(d => DAYS[d]), correct: optDays.indexOf(ad), answerText: DAYS[ad],
        explain: 'Work backwards. Step 1: ' + money(target) + ' ÷ ' + money(p) + ' = ' + items + ', so ' + set.seller + ' sold ' +
          items + ' ' + th + ' that day. Step 2: each unit stands for ' + scale + ' ' + th + ', so ' + items + ' ÷ ' + scale +
          ' = ' + ansU + ' units. The bar that is ' + ansU + ' units long is ' + DAYS[ad] + '. Check: ' + ansU + ' × ' + scale +
          ' = ' + items + ' and ' + items + ' × ' + money(p) + ' = ' + money(target) + '.' + slip };
      return hard(fig(q, g.figure));
    });
  }

  /* a missing bar given by a stated relation */
  function gMissingBar(){
    return retry(() => {
      const scale = pick([2, 5, 10]);
      const units = distinctUnits(5);
      const [h, r] = shuffle([0,1,2,3,4]).slice(0, 2);
      const g = salesGraph(scale, units, h);
      const th = g.set.thing, vr = g.val(r);
      const kind = pick(['twice', 'three', 'more', 'fewer']);
      let k = 0, rel, relText, how;
      if (kind === 'twice')      { rel = x => 2*x; relText = 'twice as many ' + th + ' as on ' + DAYS[r]; how = '2 × ' + vr; }
      else if (kind === 'three') { if (vr > 30) return null; rel = x => 3*x; relText = 'three times as many ' + th + ' as on ' + DAYS[r]; how = '3 × ' + vr; }
      else if (kind === 'more')  { k = pick([4, 6, 8, 12, 15, 20, 25]); rel = x => x + k; relText = k + ' more ' + th + ' than on ' + DAYS[r]; how = vr + ' + ' + k; }
      else                       { k = pick([3, 4, 6, 8, 12, 15]); if (vr - k < 2) return null; rel = x => x - k; relText = k + ' fewer ' + th + ' than on ' + DAYS[r]; how = vr + ' − ' + k; }
      const relU = rel(units[r]), hv = rel(vr);
      const shownIdx = [0,1,2,3,4].filter(i => i !== h);
      const shownSum = shownIdx.reduce((s, i) => s + g.val(i), 0);
      const shownU = shownIdx.reduce((s, i) => s + units[i], 0);
      const lead = 'The bar graph shows the number of ' + g.set.full + ' sold at ' + g.set.seller + ' on four days. The bar for ' +
        DAYS[h] + ' has been left out. On ' + DAYS[h] + ', ' + g.set.seller + ' sold ' + relText + '. ';
      const step12 = 'Step 1: read ' + DAYS[r] + ' with the scale: ' + units[r] + ' × ' + scale + ' = ' + vr + '. ' +
        'Step 2: ' + DAYS[h] + ' is ' + how + ' = ' + hv + ' ' + th + '. ';
      let q;
      if (Math.random() < 0.6){
        const key = shownSum + hv;
        q = mcNum(lead + 'How many ' + th + ' did ' + g.set.seller + ' sell altogether from Monday to Friday?',
          key, [shownSum, shownSum + vr, shownU + relU], String,
          step12 + 'Step 3: the four bars on the graph come to ' + shownIdx.map(i => g.val(i)).join(' + ') + ' = ' + shownSum +
          '. Step 4: add ' + DAYS[h] + ': ' + shownSum + ' + ' + hv + ' = ' + key + '. ' +
          'The missing day still counts - it is in the words, not on the graph.');
      } else {
        const x = pick(shownIdx.filter(i => i !== r && g.val(i) < hv));
        if (x === undefined) return null;
        const key = hv - g.val(x);
        q = mcNum(lead + 'How many more ' + th + ' did ' + g.set.seller + ' sell on ' + DAYS[h] + ' than on ' + DAYS[x] + '?',
          key, [vr - g.val(x), hv, hv + g.val(x), relU - units[x]], String,
          step12 + 'Step 3: ' + readOut(g, x) + '. Step 4: ' + hv + ' − ' + g.val(x) + ' = ' + key + '. ' +
          'Find the missing bar first, then compare.');
      }
      return q && hard(fig(q, g.figure));
    });
  }

  /* two-step comparisons: two days against one, or how far short of a target */
  function gTwoStepCompare(){
    return retry(() => {
      const g = salesGraph(pick([2, 5, 10]), distinctUnits(5), -1);
      const th = g.set.thing, all = [0,1,2,3,4];
      let q;
      if (Math.random() < 0.5){
        const [a0, b0, c] = shuffle(all.slice()).slice(0, 3);
        const a = Math.min(a0, b0), b = Math.max(a0, b0);
        const s = g.val(a) + g.val(b), key = s - g.val(c);
        if (key <= 0) return null;
        q = mcNum(intro(g) + ' How many more ' + th + ' were sold on ' + DAYS[a] + ' and ' + DAYS[b] + ' together than on ' + DAYS[c] + '?',
          key, [g.units[a] + g.units[b] - g.units[c], s + g.val(c), s], String,
          'Step 1: read the three bars with the scale. ' + readOut(g, a) + ', ' + readOut(g, b) + ' and ' + readOut(g, c) + '. ' +
          'Step 2: ' + DAYS[a] + ' and ' + DAYS[b] + ' together: ' + g.val(a) + ' + ' + g.val(b) + ' = ' + s + '. ' +
          'Step 3: "how many more" means subtract: ' + s + ' − ' + g.val(c) + ' = ' + key + '.');
      } else {
        const sum = all.reduce((t, i) => t + g.val(i), 0);
        const sumU = g.units.reduce((t, u) => t + u, 0);
        const T = Math.ceil((sum + 5) / 50) * 50 + pick([0, 50]);
        const key = T - sum;
        const [who, pr] = pick(OWNERS);
        q = mcNum(intro(g) + ' ' + who + ', who runs ' + g.set.seller + ', hoped to sell ' + T + ' ' + th +
          ' from Monday to Friday. How many more ' + th + ' did ' + pr + ' need to sell to reach that number?',
          key, [T - sumU, sum, T - (sum - g.val(4))], String,
          'Step 1: read all five bars with the scale: ' + all.map(i => g.val(i)).join(', ') + '. ' +
          'Step 2: the total is ' + all.map(i => g.val(i)).join(' + ') + ' = ' + sum + '. ' +
          'Step 3: ' + T + ' − ' + sum + ' = ' + key + ' more ' + th + '.');
      }
      return q && hard(fig(q, g.figure));
    });
  }

  MQI.registerTopic({
    id:'p3bargraph', level:'P3', strand:'Statistics',
    moeSubTopic:"Bar Graphs: reading and interpreting data from bar graphs; using different scales on axis",
    label:'Data Docks', short:'Bar graphs', e:'📊',
    skills:{
      read:   {label:'Reading a bar graph',  tip:'Point at the bar, then slide your finger across to the scale. Read, do not guess.'},
      compare:{label:'Comparing bars',       tip:'"How many more" is always a subtraction. Say the two values out loud before taking them away.'},
      scale:  {label:'Different scales',     tip:'Check what one unit stands for before reading any bar. A scale of 5 turns 6 units into 30, not 6.'}
    },
    pools:{
      1:[[gReadOne,'read'],[gDiffOne,'compare']],
      2:[[gReadScaled,'scale'],[gDiffScaled,'compare']],
      3:[[gTotalScaled,'scale'],[gTotalMixed,'compare'],
         [gSalesMoney,'scale'],[gSalesWhichDay,'scale'],[gMissingBar,'compare'],[gTwoStepCompare,'compare']]
    }
  });
})();
