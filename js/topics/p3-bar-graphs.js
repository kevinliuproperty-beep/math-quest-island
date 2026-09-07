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
    return fig(finishNum('How many ' + g.thing + ' are shown for ' + g.cats[a] + ' and ' + g.cats[b] + ' altogether?',
      '', g.val(a) + g.val(b),
      [g.units[a] + g.units[b], Math.abs(g.val(a) - g.val(b)), g.val(a) + g.val(b) + g.scale, g.val(a)], '',
      g.cats[a] + ' is ' + g.units[a] + ' x ' + g.scale + ' = ' + g.val(a) + ' and ' + g.cats[b] + ' is ' +
      g.units[b] + ' x ' + g.scale + ' = ' + g.val(b) + '. Altogether ' + (g.val(a) + g.val(b)) + '.'), g.figure);
  }
  function gTotalMixed(){
    const g = makeGraph(pick([2, 5, 10]), 5);
    const order = shuffle([0,1,2,3,4]);
    const a = order[0], b = order[1];
    return fig(finishNum('How many ' + g.thing + ' are shown for ' + g.cats[a] + ' and ' + g.cats[b] + ' altogether?',
      '', g.val(a) + g.val(b),
      [g.units[a] + g.units[b], g.val(a) + g.val(b) + g.scale, Math.abs(g.val(a) - g.val(b)), g.val(b)], '',
      'Each unit stands for ' + g.scale + '. ' + g.val(a) + ' + ' + g.val(b) + ' = ' + (g.val(a) + g.val(b)) + '.'), g.figure);
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
      3:[[gTotalScaled,'scale'],[gTotalMixed,'compare']]
    }
  });
})();
