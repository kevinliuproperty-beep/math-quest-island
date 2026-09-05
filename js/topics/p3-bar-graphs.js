"use strict";
/* Math Quest Island topic: p3bargraph (P3). Self-contained. MC numeric.
 * Authoring rules + registration shape: js/topics/README.md
 * Scope limit (MOE Oct 2025, p.36): reading and interpreting data from bar
 * graphs, and using different scales on the axis. Reading only. No drawing of
 * graphs, no tables/line graphs/pie charts (P4), no average (P6).
 *
 * The graph is rendered into q.extra as fully self-contained inline-styled HTML:
 * a category axis down the left, a value axis along the bottom with one tick per
 * scale unit and a number under every tick, gridlines through the plot, and a
 * numeric value label at the end of each bar. NOTHING is carried in a data-*
 * attribute: the harness oracle re-derives every value by parsing the same
 * labels and ticks a child reads off the screen.
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

  const LBL = 156, PLOTW = 240;   /* px: category column, plot area */

  function makeGraph(scale, nBars){
    const set = pick(SETS);
    const cats = shuffle(set.cats).slice(0, nBars);
    const units = [];
    while (units.length < nBars){
      const u = ri(2, 9);
      if (!units.includes(u)) units.push(u);
    }
    const maxU = Math.max(...units);
    const x = k => Math.round(k / maxU * PLOTW);
    const thing = scale === 1 ? set.thing.replace(/s$/, '') : set.thing;

    let html = '<div class="bargraph" style="text-align:left;font-size:13px;line-height:1.3;' +
      'color:#0f172a;background:#fff;padding:10px 12px 6px;border-radius:8px;display:inline-block">' +
      '<div style="font-weight:600;margin-bottom:8px">' + set.title + '</div>' +
      '<div style="position:relative;padding-left:' + LBL + 'px">' +
      '<div style="position:absolute;left:' + LBL + 'px;top:0;bottom:0;width:' + PLOTW + 'px">';
    for (let k = 0; k <= maxU; k++){
      html += '<div style="position:absolute;left:' + x(k) + 'px;top:0;bottom:0;width:1px;background:' +
        (k === 0 ? '#64748b' : '#e2e8f0') + '"></div>';
    }
    html += '</div>';
    for (let i = 0; i < nBars; i++){
      html += '<div class="bg-row" style="position:relative;display:flex;align-items:center;height:20px;margin:4px 0">' +
        '<span class="bg-cat" style="position:absolute;left:-' + LBL + 'px;width:' + (LBL - 8) +
        'px;text-align:right;white-space:nowrap">' + cats[i] + '</span>' +
        '<span class="bg-bar" style="display:inline-block;height:15px;background:#4c8bf5;border-radius:0 2px 2px 0;width:' +
        x(units[i]) + 'px"></span>' +
        '<span class="bg-val" style="margin-left:6px;font-weight:600">' + (units[i]*scale) + '</span>' +
        '</div>';
    }
    html += '</div>' +
      '<div style="position:relative;height:24px;margin-left:' + LBL + 'px;width:' + (PLOTW + 30) +
      'px;border-top:2px solid #475569">';
    for (let k = 0; k <= maxU; k++){
      html += '<span style="position:absolute;left:' + x(k) + 'px;top:0;width:1px;height:5px;background:#475569"></span>' +
        '<span class="bg-tick" style="position:absolute;left:' + x(k) +
        'px;top:7px;transform:translateX(-50%);font-size:11px;color:#475569">' + (k*scale) + '</span>';
    }
    html += '</div>' +
      '<div style="margin-top:2px;font-size:.85em;color:#475569">Each unit along the bottom of the graph stands for ' +
      scale + ' ' + thing + '.</div></div>';
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
