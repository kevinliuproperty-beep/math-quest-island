"use strict";
/* Math Quest Island topic: p4data (P4). Self-contained. MC numeric.
 * Authoring rules + registration shape: js/topics/README.md
 *
 * Scope (MOE Oct 2025, p.40, STATISTICS / DATA REPRESENTATION AND INTERPRETATION /
 * 1. Tables, Line Graphs and Pie Charts):
 *   1.1 completing a table from given data
 *   1.2 reading and interpreting data from tables/line graphs/pie charts
 * Pie charts are in the sub-topic but are NOT generated here: a pie chart cannot be
 * read off a rendered figure without angle or fraction work that sits outside P4.
 * NOT here: bar graphs (P3, topic `p3bargraph`); average (P6).
 *
 * Both surfaces leave this file as PURE DATA on `q.figure` ({type:'table'} and
 * {type:'line'}); the shared renderer js/figures.js draws them, with EVERY number a
 * child needs printed as on-screen text: the table prints each cell, the line graph
 * prints a value axis with a number under every tick, a gridline through every tick,
 * a category under every point, and the value beside every point, LEVEL WITH ITS OWN
 * gridline (the P4 Area+Graphs kill fix now lives in the renderer). Nothing is carried
 * in a data-* attribute: the harness oracle re-derives every answer by parsing those
 * same rendered labels. Spec fields are documented in js/topics/README.md.
 */
(function () {
  const G = MQI.gen;
  const ri = G.ri, pick = G.pick, shuffle = G.shuffle, finishNum = G.finishNum;

  /* attach a figure spec to a finished question */
  const fig = (q, figure) => (q.figure = figure, q);

  const SETS = [
    { title: 'Books borrowed from the school library', thing: 'books', group: 'days',
      cats: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] },
    { title: 'Ice cream cones sold at the Bedok stall', thing: 'cones', group: 'days',
      cats: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] },
    { title: 'Pupils at badminton training each week', thing: 'pupils', group: 'weeks',
      cats: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'] },
    { title: 'Visitors to the Gardens by the Bay dome', thing: 'visitors', group: 'months',
      cats: ['January', 'February', 'March', 'April', 'May'] },
    { title: 'Bubble tea cups sold at the Junction', thing: 'cups', group: 'days',
      cats: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] }
  ];

  /* ---------------- table ---------------- */

  function makeTable(n, step, showQ) {
    const set = pick(SETS);
    const cats = set.cats.slice(0, n);
    const vals = [];
    while (vals.length < n) {
      const v = ri(1, 12) * step;
      if (!vals.includes(v)) vals.push(v);
    }
    const hidden = showQ ? ri(0, n - 1) : -1;
    /* `hidden` is the column the renderer prints as '?' (-1 = none). */
    const figure = { type: 'table', title: set.title, cats, values: vals, hidden,
                     unitLabel: set.thing };
    return { figure, cats, vals, hidden, thing: set.thing, group: set.group,
             total: vals.reduce((a, b) => a + b, 0) };
  }

  function gTableRead() {
    const t = makeTable(5, 1, false);
    const i = ri(0, 4);
    const others = t.vals.filter((_, j) => j !== i);
    return fig(finishNum('In the table, how many ' + t.thing + ' are recorded for ' + t.cats[i] + '?',
      '', t.vals[i], [others[0], others[1], others[2], t.vals[i] + 1], '',
      'Find the ' + t.cats[i] + ' column, then read the number directly underneath it: ' +
      t.vals[i] + '.'), t.figure);
  }

  function gTableTotal() {
    const t = makeTable(4, 1, false);
    return fig(finishNum('What is the total number of ' + t.thing + ' in the table?',
      '', t.total,
      [t.total - t.vals[0], t.total + t.vals[0], t.total - 1, Math.max(...t.vals)], '',
      'Add every column: ' + t.vals.join(' + ') + ' = ' + t.total + '.'), t.figure);
  }

  function gTableComplete() {
    const t = makeTable(5, 1, true);
    const i = t.hidden, missing = t.vals[i];
    const known = t.vals.filter((_, j) => j !== i);
    const knownSum = known.reduce((a, b) => a + b, 0);
    return fig(finishNum('The table is not complete. Altogether there were ' + t.total + ' ' +
      t.thing + ' over the 5 ' + t.group + '. How many ' + t.thing + ' were there for ' +
      t.cats[i] + '?',
      '', missing,
      [knownSum, t.total, missing + 1, known[0], known[1]], '',
      'The four columns you can read add up to ' + known.join(' + ') + ' = ' + knownSum +
      '. Take that away from the total: ' + t.total + ' − ' + knownSum + ' = ' + missing + '.'), t.figure);
  }

  /* ---------------- line graph ---------------- */

  /* The value axis always runs 0 to 8 units whatever the step, so a step-5 graph is
     the same picture with a different scale printed up the side. */
  const LINE_MAX_UNIT = 8;

  function makeLine(n, step) {
    const set = pick(SETS);
    const cats = set.cats.slice(0, n);
    const units = [];
    while (units.length < n) {
      const u = ri(1, LINE_MAX_UNIT);
      if (!units.includes(u)) units.push(u);
    }
    const vals = units.map(u => u * step);
    const figure = { type: 'line', title: set.title, cats, units, step,
                     maxUnit: LINE_MAX_UNIT, unitLabel: set.thing };
    return { figure, cats, vals, thing: set.thing,
             val: i => vals[i], idx: c => cats.indexOf(c) };
  }

  function gLineRead() {
    const g = makeLine(5, 1);
    const i = ri(0, 4);
    const o = g.vals.filter((_, j) => j !== i);
    return fig(finishNum('On the line graph, how many ' + g.thing + ' are shown for ' + g.cats[i] + '?',
      '', g.val(i), [o[0], o[1], o[2], g.val(i) + 1], '',
      'Go up from ' + g.cats[i] + ' until you reach the dot, then read the number printed beside it: ' +
      g.val(i) + '.'), g.figure);
  }

  function gLineReadScaled() {
    const g = makeLine(5, pick([2, 5, 10]));
    const i = ri(0, 4);
    const o = g.vals.filter((_, j) => j !== i);
    return fig(finishNum('On the line graph, how many ' + g.thing + ' are shown for ' + g.cats[i] + '?',
      '', g.val(i), [o[0], o[1], o[2], g.val(i) + 1], '',
      'Find the dot above ' + g.cats[i] + '. Check the numbers up the side of the graph, then read the value printed at the dot: ' +
      g.val(i) + '.'), g.figure);
  }

  function gLineDiff() {
    const g = makeLine(5, pick([1, 2, 5]));
    const ord = shuffle([0, 1, 2, 3, 4]);
    let a = ord[0], b = ord[1];
    if (g.val(a) < g.val(b)) { const t = a; a = b; b = t; }
    const d = g.val(a) - g.val(b);
    return fig(finishNum('On the line graph, how many more ' + g.thing + ' are shown for ' +
      g.cats[a] + ' than for ' + g.cats[b] + '?',
      '', d, [g.val(a) + g.val(b), g.val(a), g.val(b), d + 1], '',
      g.cats[a] + ' shows ' + g.val(a) + ' and ' + g.cats[b] + ' shows ' + g.val(b) + '. ' +
      g.val(a) + ' − ' + g.val(b) + ' = ' + d + '. "How many more" is always a subtraction.'), g.figure);
  }

  function gLineTotal() {
    const g = makeLine(5, pick([2, 5, 10]));
    const ord = shuffle([0, 1, 2, 3, 4]);
    const a = ord[0], b = ord[1];
    const s = g.val(a) + g.val(b);
    return fig(finishNum('On the line graph, how many ' + g.thing + ' are shown for ' +
      g.cats[a] + ' and ' + g.cats[b] + ' altogether?',
      '', s, [Math.abs(g.val(a) - g.val(b)), g.val(a), g.val(b), s + 1], '',
      'Read both dots first: ' + g.val(a) + ' and ' + g.val(b) + '. Then ' + g.val(a) + ' + ' +
      g.val(b) + ' = ' + s + '.'), g.figure);
  }

  MQI.registerTopic({
    id: 'p4data', level: 'P4', strand: 'Statistics',
    moeSubTopic: 'Tables, Line Graphs and Pie Charts: completing a table from given data; reading and interpreting data from tables/line graphs/pie charts',
    label: 'Line Graph Lagoon', short: 'Tables & line graphs', e: '📈',
    skills: {
      table: { label: 'Reading a table', tip: 'Find the column heading first, then slide straight down. Reading the wrong column is the commonest slip.' },
      complete: { label: 'Completing a table', tip: 'Add every number you can read, then take that away from the total given. The gap is the missing entry.' },
      line: { label: 'Reading a line graph', tip: 'A line graph shows change. Go up from the label at the bottom to the dot, then read the value printed at the dot.' },
      interpret: { label: 'Comparing points', tip: '"How many more" is a subtraction, "altogether" is an addition. Say the two values out loud before working.' }
    },
    pools: {
      1: [[gTableRead, 'table'], [gLineRead, 'line']],
      2: [[gTableTotal, 'table'], [gLineReadScaled, 'line']],
      3: [[gTableComplete, 'complete'], [gLineDiff, 'interpret'], [gLineTotal, 'interpret']]
    }
  });
})();
