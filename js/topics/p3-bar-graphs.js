"use strict";
/* Math Quest Island topic: p3bargraph (P3). Self-contained. MC numeric.
 * Authoring rules + registration shape: js/topics/README.md
 * Scope limit (MOE Oct 2025, p.36): reading and interpreting data from bar
 * graphs, and using different scales on the axis. Reading only. No drawing of
 * graphs, no tables/line graphs/pie charts (P4), no average (P6).
 *
 * The graph is rendered into q.extra as plain inline-styled HTML. Each bar
 * carries data-cat / data-units, and the wrapper carries data-scale, so the
 * harness oracle can re-derive every value as units x scale from the RENDERED
 * markup without reading answerText.
 */
(function () {
  const G = MQI.gen;
  const ri = G.ri, pick = G.pick, shuffle = G.shuffle, finishNum = G.finishNum;

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
    const maxU = Math.max(...units);
    let html = '<div class="bargraph" data-scale="' + scale + '" style="text-align:left">' +
      '<div style="font-weight:600;margin-bottom:6px">' + set.title + '</div>';
    for (let i = 0; i < nBars; i++){
      html += '<div style="display:flex;align-items:center;gap:8px;margin:3px 0">' +
        '<span style="display:inline-block;min-width:130px">' + cats[i] + '</span>' +
        '<span class="bar" data-cat="' + cats[i] + '" data-units="' + units[i] + '" ' +
        'style="display:inline-block;height:14px;background:#4c8bf5;width:' + Math.round(units[i]/maxU*180) + 'px"></span>' +
        '</div>';
    }
    html += '<div style="margin-top:6px;font-size:.85em">Each unit on the side of the graph stands for ' +
      scale + ' ' + set.thing + '.</div></div>';
    return { html, cats, units, scale, thing:set.thing,
             val: i => units[i]*scale };
  }

  function gReadOne(){
    const g = makeGraph(1, 4);
    const i = ri(0, 3);
    return finishNum('How many ' + g.thing + ' does the graph show for ' + g.cats[i] + '?', g.html, g.val(i),
      [g.val((i+1)%4), g.val((i+2)%4), g.val(i) + 1, g.val(i) + 2], '',
      'Follow the ' + g.cats[i] + ' bar across to the scale. It reaches ' + g.val(i) + '.');
  }
  function gDiffOne(){
    const g = makeGraph(1, 4);
    const order = shuffle([0,1,2,3]);
    let a = order[0], b = order[1];
    if (g.val(a) < g.val(b)) { const t = a; a = b; b = t; }
    return finishNum('How many more ' + g.thing + ' are shown for ' + g.cats[a] + ' than for ' + g.cats[b] + '?',
      g.html, g.val(a) - g.val(b),
      [g.val(a) + g.val(b), g.val(a), g.val(b), g.val(a) - g.val(b) + 1], '',
      g.cats[a] + ' shows ' + g.val(a) + ' and ' + g.cats[b] + ' shows ' + g.val(b) + '. ' +
      g.val(a) + ' - ' + g.val(b) + ' = ' + (g.val(a) - g.val(b)) + '.');
  }
  function gReadScaled(){
    const g = makeGraph(pick([2, 5]), 4);
    const i = ri(0, 3);
    return finishNum('How many ' + g.thing + ' does the graph show for ' + g.cats[i] + '?', g.html, g.val(i),
      [g.units[i], g.val(i) + g.scale, g.val((i+1)%4), g.val(i) + 1], '',
      'The ' + g.cats[i] + ' bar is ' + g.units[i] + ' units long and each unit stands for ' + g.scale +
      ', so ' + g.units[i] + ' x ' + g.scale + ' = ' + g.val(i) + '.');
  }
  function gDiffScaled(){
    const g = makeGraph(pick([2, 5]), 4);
    const order = shuffle([0,1,2,3]);
    let a = order[0], b = order[1];
    if (g.val(a) < g.val(b)) { const t = a; a = b; b = t; }
    return finishNum('How many more ' + g.thing + ' are shown for ' + g.cats[a] + ' than for ' + g.cats[b] + '?',
      g.html, g.val(a) - g.val(b),
      [g.units[a] - g.units[b], g.val(a) + g.val(b), g.val(a), g.val(b)], '',
      'Read both bars with the scale first: ' + g.val(a) + ' and ' + g.val(b) + '. Then ' + g.val(a) + ' - ' + g.val(b) +
      ' = ' + (g.val(a) - g.val(b)) + '. Counting units instead of values is the usual slip.');
  }
  function gTotalScaled(){
    const g = makeGraph(pick([5, 10]), 5);
    const order = shuffle([0,1,2,3,4]);
    const a = order[0], b = order[1];
    return finishNum('How many ' + g.thing + ' are shown for ' + g.cats[a] + ' and ' + g.cats[b] + ' altogether?',
      g.html, g.val(a) + g.val(b),
      [g.units[a] + g.units[b], Math.abs(g.val(a) - g.val(b)), g.val(a) + g.val(b) + g.scale, g.val(a)], '',
      g.cats[a] + ' is ' + g.units[a] + ' x ' + g.scale + ' = ' + g.val(a) + ' and ' + g.cats[b] + ' is ' +
      g.units[b] + ' x ' + g.scale + ' = ' + g.val(b) + '. Altogether ' + (g.val(a) + g.val(b)) + '.');
  }
  function gTotalMixed(){
    const g = makeGraph(pick([2, 5, 10]), 5);
    const order = shuffle([0,1,2,3,4]);
    const a = order[0], b = order[1];
    return finishNum('How many ' + g.thing + ' are shown for ' + g.cats[a] + ' and ' + g.cats[b] + ' altogether?',
      g.html, g.val(a) + g.val(b),
      [g.units[a] + g.units[b], g.val(a) + g.val(b) + g.scale, Math.abs(g.val(a) - g.val(b)), g.val(b)], '',
      'Each unit stands for ' + g.scale + '. ' + g.val(a) + ' + ' + g.val(b) + ' = ' + (g.val(a) + g.val(b)) + '.');
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
