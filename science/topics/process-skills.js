"use strict";
/* P3 Science Quest - Skills and Processes (fair test, variables, aim, repeat,
   observe / compare / classify / infer / predict, reading tables and bar charts,
   control set-up). Data only: the helpers below build figure STRINGS, no DOM. */
(function () {

  /* ---------- figure helpers (return strings) ---------- */

  const CELL = 'border:1px solid currentColor;padding:4px 8px;text-align:center;';
  function table(head, rows, caption) {
    return '<table style="border-collapse:collapse;margin:0 auto;font-size:14px;">' +
      (caption ? '<caption style="font-weight:bold;padding-bottom:4px;">' + caption + '</caption>' : '') +
      '<thead><tr>' + head.map(h => '<th style="' + CELL + '">' + h + '</th>').join('') + '</tr></thead>' +
      '<tbody>' + rows.map(r => '<tr>' + r.map(c => '<td style="' + CELL + '">' + c + '</td>').join('') + '</tr>').join('') +
      '</tbody></table>';
  }

  function T(x, y, txt, weight, size) {
    return '<text x="' + x + '" y="' + y + '" text-anchor="middle" fill="currentColor" stroke="none"' +
      (weight ? ' font-weight="' + weight + '"' : '') + (size ? ' font-size="' + size + '"' : '') + '>' + txt + '</text>';
  }
  const WATER = 'fill="#4aa3df" fill-opacity="0.4" stroke="none"';

  function sun(x, y) {
    return '<circle cx="' + x + '" cy="' + y + '" r="7" fill="#f2b705" fill-opacity="0.7"/>' +
      '<path d="M' + (x - 12) + ' ' + y + 'h-4M' + (x + 12) + ' ' + y + 'h4M' + x + ' ' + (y - 12) + 'v-4M' + x + ' ' + (y + 12) + 'v4" stroke-width="1.5"/>';
  }
  function darkBox(cx, y) {
    return '<rect x="' + (cx - 58) + '" y="' + (y + 2) + '" width="116" height="96" rx="4" fill="currentColor" fill-opacity="0.22" stroke-dasharray="4 3" stroke-width="1.5"/>';
  }
  function leaf(x, y, dir, filled) {
    const f = filled ? ' fill="#3a9d4a" fill-opacity="0.55"' : ' stroke-dasharray="3 2"';
    return '<path d="M' + x + ' ' + y + ' q' + (dir * 18) + ' -2 ' + (dir * 22) + ' -14 q' + (dir * -16) + ' -2 ' + (dir * -22) + ' 14Z"' + f + '/>';
  }

  const SHAPES = {
    pot(cx, y, p) {
      let s = '';
      if (p.dark) s += darkBox(cx, y);
      if (p.sun) s += sun(cx + 44, y + 14);
      const top = y + 62;
      if (p.plant === 'wilted') {
        const LF = ' fill="#9a8f3a" fill-opacity="0.5" stroke-width="1.5"';
        s += '<path d="M' + cx + ' ' + top + ' V' + (y + 34) + ' Q' + cx + ' ' + (y + 22) + ' ' + (cx + 12) + ' ' + (y + 24) + ' Q' + (cx + 22) + ' ' + (y + 28) + ' ' + (cx + 22) + ' ' + (y + 42) + '"/>';
        s += '<path d="M' + cx + ' ' + (y + 48) + ' q-4 4 -10 16 q8 -4 10 -16Z"' + LF + '/>';
        s += '<path d="M' + cx + ' ' + (y + 38) + ' q8 4 10 16 q-8 -2 -10 -16Z"' + LF + '/>';
        s += '<path d="M' + (cx + 22) + ' ' + (y + 42) + ' q3 8 -1 16 q-5 -8 1 -16Z"' + LF + '/>';
      } else if (p.plant !== 'none') {
        const filled = p.plant !== 'pale';
        s += '<path d="M' + cx + ' ' + top + ' V' + (y + 20) + '"/>';
        s += leaf(cx, y + 46, -1, filled) + leaf(cx, y + 34, 1, filled) + leaf(cx, y + 24, -1, filled);
      }
      s += '<path d="M' + (cx - 28) + ' ' + top + ' H' + (cx + 28) + ' L' + (cx + 20) + ' ' + (y + 94) + ' H' + (cx - 20) + 'Z" fill="#b5651d" fill-opacity="0.35"/>';
      return s;
    },
    beaker(cx, y, p) {
      const lvl = p.level == null ? 0.6 : p.level, h = 64 * lvl;
      return '<rect x="' + (cx - 29) + '" y="' + (y + 94 - h) + '" width="58" height="' + h + '" ' + WATER + '/>' +
        '<path d="M' + (cx - 30) + ' ' + (y + 28) + ' V' + (y + 94) + ' H' + (cx + 30) + ' V' + (y + 28) + '"/>';
    },
    strip(cx, y, p) {
      const rise = p.rise || 0; // 0..1 fraction of strip above water that got wet
      let s = SHAPES.beaker(cx, y, { level: 0.45 });
      s += '<path d="M' + (cx - 44) + ' ' + (y + 12) + ' H' + (cx + 44) + '" stroke-width="3"/>';
      const stripTop = y + 12, waterY = y + 94 - 64 * 0.45, stripBot = y + 86;
      const wetTop = waterY - (waterY - stripTop) * rise;
      s += '<rect x="' + (cx - 8) + '" y="' + wetTop + '" width="16" height="' + (stripBot - wetTop) + '" ' + WATER + '/>';
      s += '<rect x="' + (cx - 8) + '" y="' + stripTop + '" width="16" height="' + (stripBot - stripTop) + '" stroke-width="1.5"/>';
      return s;
    },
    dish(cx, y, p) {
      let s = '';
      if (p.dark) s += darkBox(cx, y);
      if (p.cold) s += '<rect x="' + (cx - 58) + '" y="' + (y + 2) + '" width="116" height="96" rx="6" stroke-width="1.5"/>' + T(cx, y + 22, 'fridge', null, 12);
      if (p.sun) s += sun(cx + 44, y + 14);
      if (p.moist) s += '<rect x="' + (cx - 43) + '" y="' + (y + 78) + '" width="86" height="11" ' + WATER + '/>';
      s += '<path d="M' + (cx - 42) + ' ' + (y + 80) + ' q7 -8 14 0 t14 0 t14 0 t14 0 t14 0 t14 0" stroke-width="1.5"/>';
      [-22, 0, 22].forEach(dx => {
        s += '<ellipse cx="' + (cx + dx) + '" cy="' + (y + 72) + '" rx="6" ry="4" fill="#b5651d" fill-opacity="0.5" stroke-width="1.5"/>';
        if (p.sprout) s += '<path d="M' + (cx + dx) + ' ' + (y + 68) + ' q2 -10 6 -14" stroke="#3a9d4a"/>';
      });
      s += '<path d="M' + (cx - 46) + ' ' + (y + 62) + ' V' + (y + 90) + ' H' + (cx + 46) + ' V' + (y + 62) + '"/>';
      return s;
    },
    magnet(cx, y, p) {
      let s = '<rect x="' + (cx - 42) + '" y="' + (y + 22) + '" width="84" height="24" fill="currentColor" fill-opacity="0.12"/>' +
        '<path d="M' + cx + ' ' + (y + 22) + ' V' + (y + 46) + '"/>' +
        T(cx - 21, y + 39, 'N', 'bold') + T(cx + 21, y + 39, 'S', 'bold');
      for (let k = 0; k < (p.clips || 0); k++) {
        s += '<rect x="' + (cx - 38) + '" y="' + (y + 48 + k * 16) + '" width="8" height="14" rx="4" stroke-width="1.5"/>';
      }
      return s;
    },
    hang(cx, y, p) {
      let s = '<path d="M' + (cx - 46) + ' ' + (y + 94) + ' H' + (cx + 20) + 'M' + (cx - 40) + ' ' + (y + 94) + ' V' + (y + 6) + ' H' + (cx + 4) + '"/>';
      s += '<rect x="' + (cx - 2) + '" y="' + (y + 6) + '" width="12" height="44" fill="currentColor" fill-opacity="0.15" stroke-width="1.5"/>';
      s += '<path d="M' + (cx + 4) + ' ' + (y + 50) + ' V' + (y + 58) + '"/>';
      for (let k = 0; k < 3; k++) s += '<rect x="' + (cx - 6) + '" y="' + (y + 58 + k * 11) + '" width="20" height="10" fill="currentColor" fill-opacity="0.3" stroke-width="1.5"/>';
      return s;
    },
    tray(cx, y, p) {
      let s = '<rect x="' + (cx - 56) + '" y="' + (y + 40) + '" width="56" height="44" fill="currentColor" fill-opacity="0.45" stroke="none"/>';
      s += '<rect x="' + (cx - 56) + '" y="' + (y + 40) + '" width="112" height="44" stroke-width="2"/>';
      s += sun(cx + 30, y + 18);
      s += T(cx - 28, y + 34, 'dark', null, 12) + T(cx + 28, y + 100, 'bright', null, 12);
      [[-4, 56], [4, 64], [0, 72]].forEach(([dx, dy]) => s += '<ellipse cx="' + (cx + dx) + '" cy="' + (y + dy) + '" rx="7" ry="2.5" fill="#b5651d" stroke="none"/>');
      return s;
    }
  };

  function setup(aria, panels) {
    const W = 130, n = panels.length;
    const nl = Math.max(0, ...panels.map(p => (p.lines || []).length));
    const H = 132 + nl * 17;
    let s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + (n * W) + ' ' + H + '" width="100%" style="max-width:' + (n * W + 30) + 'px;display:block;margin:0 auto;" role="img" aria-label="' + aria + '" font-family="system-ui,sans-serif" font-size="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">';
    panels.forEach((p, i) => {
      const cx = i * W + W / 2;
      s += T(cx, 16, p.label, 'bold', 15);
      s += SHAPES[p.kind](cx, 22, p);
      (p.lines || []).forEach((l, k) => { s += T(cx, 140 + k * 17, l); });
    });
    return s + '</svg>';
  }

  function bars(aria, title, yTitle, data, max, step, xTitle) {
    const W = 360, H = 250, L = 52, R = 10, Tp = 34, B = xTitle ? 56 : 40;
    const pw = W - L - R, ph = H - Tp - B, bw = pw / data.length;
    let s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="100%" style="max-width:380px;display:block;margin:0 auto;" role="img" aria-label="' + aria + '" font-family="system-ui,sans-serif" font-size="13" fill="none" stroke="currentColor" stroke-width="1.5">';
    s += T(W / 2, 18, title, 'bold', 14);
    for (let v = 0; v <= max; v += step) {
      const yy = Tp + ph - v / max * ph;
      s += '<path d="M' + L + ' ' + yy + ' H' + (W - R) + '" stroke-opacity="0.25" stroke-width="1"/>';
      s += '<text x="' + (L - 6) + '" y="' + (yy + 4) + '" text-anchor="end" fill="currentColor" stroke="none" font-size="12">' + v + '</text>';
    }
    data.forEach((d, i) => {
      const h = d[1] / max * ph, x = L + i * bw + bw * 0.2;
      s += '<rect x="' + x + '" y="' + (Tp + ph - h) + '" width="' + (bw * 0.6) + '" height="' + h + '" fill="#4aa3df" fill-opacity="0.55"/>';
      s += T(L + i * bw + bw / 2, Tp + ph + 18, d[0]);
    });
    s += '<path d="M' + L + ' ' + Tp + ' V' + (Tp + ph) + ' H' + (W - R) + '" stroke-width="2"/>';
    s += '<text transform="translate(14 ' + (Tp + ph / 2) + ') rotate(-90)" text-anchor="middle" fill="currentColor" stroke="none" font-size="12">' + yTitle + '</text>';
    if (xTitle) s += T(L + pw / 2, H - 8, xTitle, null, 12);
    return s + '</svg>';
  }

  function cylinder(ml) {
    const x = 120, y0 = 214, per = 3.6; // 0 ml at y0, 50 ml at y0-180
    let s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 236" width="100%" style="max-width:260px;display:block;margin:0 auto;" role="img" aria-label="Measuring cylinder with water" font-family="system-ui,sans-serif" font-size="13" fill="none" stroke="currentColor" stroke-width="2">';
    s += '<rect x="' + (x + 1) + '" y="' + (y0 - ml * per) + '" width="58" height="' + (ml * per) + '" ' + WATER + '/>';
    s += '<path d="M' + x + ' 20 V' + (y0 + 4) + ' H' + (x + 60) + ' V20"/><path d="M' + (x - 20) + ' ' + (y0 + 4) + ' H' + (x + 80) + '" stroke-width="3"/>';
    for (let v = 0; v <= 50; v += 5) {
      const yy = y0 - v * per, big = v % 10 === 0;
      s += '<path d="M' + (x + 60) + ' ' + yy + ' h' + (big ? -16 : -9) + '" stroke-width="1.5"/>';
      if (big) s += '<text x="' + (x + 68) + '" y="' + (yy + 4) + '" fill="currentColor" stroke="none">' + v + '</text>';
    }
    s += T(x + 100, 20, 'ml', null, 13);
    return s + '</svg>';
  }

  /* ---------- shared figures ---------- */

  // Mary: plants and amount of water
  const FIG_MARY = setup('Three pots A, B and C with the same type of plant near a window, given 20, 40 and 60 ml of water each day', [
    { label: 'A', kind: 'pot', sun: true, lines: ['20 ml water', 'each day'] },
    { label: 'B', kind: 'pot', sun: true, lines: ['40 ml water', 'each day'] },
    { label: 'C', kind: 'pot', sun: true, lines: ['60 ml water', 'each day'] }
  ]) + table(['Pot', 'Amount of water given each day (ml)', 'Increase in height after 2 weeks (cm)'],
    [['A', '20', '3'], ['B', '40', '5'], ['C', '60', '8']], 'Results');

  // Ali: strength of magnets
  const FIG_ALI = bars('Bar chart: magnet P attracted 4 paper clips, Q attracted 9, R attracted 6',
    'Paper clips attracted by each magnet', 'Number of paper clips', [['P', 4], ['Q', 9], ['R', 6]], 10, 2, 'Magnet');

  // Priya: absorbency, water squeezed out
  const TAB_PRIYA = table(['Material', 'Volume of water squeezed out (ml)'],
    [['W', '15'], ['X', '40'], ['Y', '5'], ['Z', '25']], 'Results');
  const TXT_PRIYA = 'Priya cut four materials, W, X, Y and Z, into pieces of the same size. She soaked each piece in 100 ml of water for 1 minute, then squeezed the water from the piece into a measuring cylinder.';

  // Siti: germination (water, warmth)
  const FIG_SITI = setup('Three dishes of 5 green bean seeds: A on dry cotton wool in a dark cupboard, B on moist cotton wool in a dark cupboard, C on moist cotton wool in a fridge', [
    { label: 'A', kind: 'dish', dark: true, lines: ['dry cotton wool', 'dark cupboard'] },
    { label: 'B', kind: 'dish', dark: true, moist: true, sprout: true, lines: ['moist cotton wool', 'dark cupboard'] },
    { label: 'C', kind: 'dish', moist: true, cold: true, lines: ['moist cotton wool', 'fridge (dark, cold)'] }
  ]) + table(['Dish', 'Number of seeds that germinated after 5 days'], [['A', '0'], ['B', '5'], ['C', '0']], 'Results');

  // Hui Min: mealworms, dark and bright
  const FIG_HUIMIN = setup('A tray with the left half covered with black paper (dark) and the right half uncovered (bright), mealworms placed in the middle', [
    { label: '', kind: 'tray', lines: [] }
  ]) + table(['Trial', 'Mealworms on dark side', 'Mealworms on bright side'],
    [['1', '8', '2'], ['2', '9', '1'], ['3', '7', '3']], 'Number of mealworms after 15 minutes (10 mealworms each trial)');

  const TXT_AHMAD = 'Ahmad took two plants of the same type and size and gave them the same amount of water each day. He placed plant P near a window and plant Q in a dark cupboard.';
  // Ahmad: plant in light and in dark
  const FIG_AHMAD = setup('Plant P near a window and plant Q in a dark cupboard. After 1 week the leaves of Q turned yellow', [
    { label: 'P', kind: 'pot', sun: true, lines: ['near a window', 'green leaves'] },
    { label: 'Q', kind: 'pot', dark: true, plant: 'pale', lines: ['dark cupboard', 'yellow leaves'] }
  ]);

  // Ravi: strength of materials
  const FIG_RAVI = setup('A strip of material clamped to a stand with 50 g weights hung below it', [
    { label: '', kind: 'hang', lines: ['50 g weights', 'added one by one'] }
  ]) + table(['Material', 'Number of 50 g weights held before the strip broke'], [['K', '5'], ['L', '12'], ['M', '8']], 'Results');

  // Mei Ling: light through materials (results table)
  const TAB_MEILING = table(['Material', 'Patch of light seen on the screen'],
    [['Glass', 'bright'], ['Tracing paper', 'dim'], ['Cardboard', 'none'], ['Clear plastic', 'bright']], 'Results');

  // Jun Kai: strips in water (absorbency by water rising)
  const FIG_JUNKAI = setup('Strips of material hanging with their ends in water', [
    { label: '', kind: 'strip', rise: 0.6, lines: ['strip dipped', 'in water'] }
  ]) + bars('Bar chart: water rose 8 cm up cotton, 12 cm up paper towel, 0 cm up plastic and 5 cm up wool',
    'Height water rose up each strip in 5 min', 'Height (cm)', [['cotton', 8], ['paper towel', 12], ['plastic', 0], ['wool', 5]], 14, 2, 'Material of strip');

  // Priya plants: choose the two set-ups
  const TAB_SOIL = table(['Set-up', 'Type of soil', 'Amount of water each day', 'Where placed'],
    [['A', 'sandy soil', '50 ml', 'near window'], ['B', 'garden soil', '50 ml', 'near window'],
     ['C', 'garden soil', '100 ml', 'in cupboard'], ['D', 'sandy soil', '100 ml', 'near window']]);

  // John: magnet holding a clip through sheets of paper
  const TAB_JOHN = table(['Magnet', 'Greatest number of sheets of paper the clip was still attracted through'],
    [['A', '6'], ['B', '14'], ['C', '9']], 'Results');

  // Seedling height over days (predicting)
  const TAB_GROW = table(['Day', '2', '4', '6', '8'], [['Height of seedling (cm)', '1', '3', '5', '?']]);

  // Classifying table: magnets and floating
  const TAB_OBJECTS = table(['Object', 'Attracted by a magnet?', 'Floats on water?'],
    [['Steel pin', 'yes', 'no'], ['Plastic bottle cap', 'no', 'yes'], ['Wooden block', 'no', 'yes'],
     ['Iron nail', 'yes', 'no'], ['Rubber eraser', 'no', 'no']], 'Results of tests');

  const TAB_ANIMALS = table(['Group X', 'Group Y'], [['ant', 'spider'], ['butterfly', 'snail'], ['grasshopper', 'earthworm']]);

  const TAB_COMPARE = table(['', 'Butterfly', 'Spider'],
    [['Number of legs', '6', '8'], ['Has wings', 'yes', 'no'], ['Lays eggs', 'yes', 'yes']]);

  /* ---------- topic ---------- */

  SCI.registerTopic({
    id: 'process-skills',
    title: 'Science Skills & Experiments', emoji: '🔬',
    theme: 'Skills',
    moeRef: '(para) MOE Primary Science Syllabus 2023, Skills and Processes: observing, comparing, classifying, using apparatus and equipment, communicating, inferring, predicting, analysing and evaluating; the investigation process, including fair tests where only one variable is changed.',
    notes: [
      { title: 'What is a fair test?',
        body: 'In a fair test you change only ONE variable and keep all the other variables the same. Then any difference in the results must be caused by the one thing you changed. If two things are changed, you cannot tell which one caused the difference.' },
      { title: 'Three kinds of variables',
        body: 'Changed variable: the ONE thing you change on purpose (e.g. the type of material). Measured variable: what you measure or observe to get the results (e.g. the amount of water absorbed). Variables kept the same: everything else (e.g. size of material, amount of water, time). Name a variable fully: write "the amount of water given each day", not just "water".' },
      { title: 'Writing the aim',
        body: 'The aim says what the experiment is trying to find out. Use this sentence: "To find out how the [changed variable] affects the [measured variable]." Example: "To find out how the type of material affects the amount of water it absorbs." Markers look for BOTH variables in the aim.' },
      { title: 'Why repeat an experiment?',
        body: 'Repeating the experiment (or using more seeds, plants or animals in each set-up) gives more RELIABLE results. One plant or one seed could be unusual by chance. Careful: repeating does NOT make a test fair. "Fair" means only one variable is changed.' },
      { title: 'The control set-up',
        body: 'A control set-up is exactly the same as the test set-up except for the ONE variable being tested. We compare the two set-ups to show that the result was caused by that variable. Example: a plant kept in the dark (test) and the same kind of plant in the light (control), with the same amount of water.' },
      { title: 'Reading tables and bar charts',
        body: 'First read the headings and units. Find the biggest and smallest values, then look for a pattern. Write conclusions only about what was tested: "The more water given, the greater the increase in height." Do not add ideas the results do not show. On a bar chart, read the scale on the side carefully.' },
      { title: 'Observe, infer, predict',
        body: 'Observing: using your senses to notice something ("The leaves turned yellow."). Inferring: giving a reason that explains what you observed ("The plant did not get enough light."). Predicting: saying what will happen next by using a pattern in the results ("On Day 8 it will be about 7 cm tall.").' },
      { title: 'Comparing and classifying',
        body: 'Comparing: finding similarities (how things are the same) and differences (how they are not). Classifying: sorting things into groups by a common characteristic, such as "attracted by a magnet" or "has six legs". Every member of a group must have that characteristic.' },
      { title: 'Booklet B answer tips',
        body: 'Use the exact words from the question and the table. "Why use the same amount of water?" - answer "to make it a fair test, so that only the [changed variable] is changed." "Why repeat?" - "to get more reliable results." For "which is best", name it AND give the reason from the results.' }
    ],
    items: [
      /* ===== Level 1: recall the basics ===== */
      { id: 'ps-001', type: 'mcq', level: 1,
        stem: 'In a fair test, how many variables should you change?',
        figure: null,
        options: ['Only one', 'Two', 'Three', 'All of them'],
        answer: 0,
        explain: 'A fair test changes only ONE variable. Everything else is kept the same, so we know the change in the results was caused by that one variable.' },
      { id: 'ps-002', type: 'mcq', level: 1,
        stem: 'Why do scientists repeat an experiment?',
        figure: null,
        options: ['To make the test fair', 'To get more reliable results', 'To change another variable', 'To finish the experiment faster'],
        answer: 1,
        explain: 'Repeating gives more reliable results. It does not make the test fair: a test is fair when only one variable is changed.' },
      { id: 'ps-003', type: 'mcq', level: 1,
        stem: 'Siti looked at a leaf through a magnifying glass and saw tiny hairs on it. Which skill was she using?',
        figure: null,
        options: ['Predicting', 'Classifying', 'Inferring', 'Observing'],
        answer: 3,
        explain: 'Using your senses (here, sight) to notice details is observing. She did not sort, explain or say what will happen next.' },
      { id: 'ps-004', type: 'oeq', level: 1, marks: 2,
        stem: 'What is a fair test?',
        figure: null,
        model: 'A fair test is one where only one variable is changed and all the other variables are kept the same.',
        keys: [['only one variable', 'one variable', 'only one thing'], ['kept the same', 'other variables the same', 'constant']],
        explain: 'Two marking points: (1) only ONE variable is changed, (2) all other variables are kept the same.' },
      { id: 'ps-005', type: 'mcq', level: 1,
        stem: 'Jun Kai wants to find out which of his magnets is the strongest. What should he measure?',
        figure: null,
        options: ['The colour of each magnet', 'The shape of each magnet', 'The number of paper clips each magnet attracts', 'The number of magnets he has'],
        answer: 2,
        explain: 'A stronger magnet attracts more paper clips, so the number of paper clips attracted tells us how strong each magnet is.' },
      { id: 'ps-006', type: 'mcq', level: 1,
        stem: 'Ali dipped three magnets, P, Q and R, into a box of steel paper clips and counted the clips each magnet attracted. Which magnet is the strongest?',
        figure: FIG_ALI,
        options: ['Magnet P', 'Magnet Q', 'Magnet R', 'All the magnets are equally strong'],
        answer: 1,
        explain: 'Magnet Q attracted the most paper clips (9), so it is the strongest.' },
      { id: 'ps-007', type: 'mcq', level: 1,
        stem: TXT_PRIYA + ' Which material is the most absorbent?',
        figure: TAB_PRIYA,
        options: ['W', 'X', 'Y', 'Z'],
        answer: 1,
        explain: 'The more water squeezed out, the more water the material had absorbed. X gave 40 ml, the most, so X is the most absorbent.' },
      { id: 'ps-008', type: 'mcq', level: 1,
        stem: 'Mary gave three pots of the same type of plant different amounts of water. Which variable did Mary change?',
        figure: FIG_MARY,
        options: ['The amount of water given each day', 'The type of plant', 'The amount of sunlight', 'The increase in height of the plant'],
        answer: 0,
        explain: 'Pots A, B and C were given 20 ml, 40 ml and 60 ml of water. That is the only thing Mary changed. The increase in height is what she measured.' },
      { id: 'ps-009', type: 'mcq', level: 1,
        stem: 'Hui Min placed 10 mealworms in the middle of a tray. Half the tray was covered with black paper. She counted the mealworms on each side after 15 minutes. In all three trials, where did most of the mealworms go?',
        figure: FIG_HUIMIN,
        options: ['To the bright side', 'They stayed in the middle', 'Equally to both sides', 'To the dark side'],
        answer: 3,
        explain: 'In every trial more mealworms were on the dark side (8, 9 and 7) than on the bright side.' },
      { id: 'ps-010', type: 'oeq', level: 1, marks: 1,
        stem: 'Hui Min sorted some objects into two groups: "attracted by a magnet" and "not attracted by a magnet". Which science skill was she using?',
        figure: null,
        model: 'Classifying.',
        keys: [['classifying', 'classify']],
        explain: 'Sorting things into groups by a common characteristic is classifying. Write the name of the skill, "classifying": just copying "sorting" from the question may not get the mark.' },
      { id: 'ps-011', type: 'oeq', level: 1, marks: 1,
        stem: TXT_PRIYA + ' Which variable did Priya change in her experiment?',
        figure: TAB_PRIYA,
        model: 'The type of material.',
        keys: [['type of material', 'kind of material']],
        explain: 'W, X, Y and Z are different materials, so the changed variable is the type of material. Saying "the material" alone may not get the mark; say "the TYPE of material".' },
      { id: 'ps-012', type: 'oeq', level: 1, marks: 1,
        stem: TXT_AHMAD + ' State one observation about plant Q after one week.',
        figure: FIG_AHMAD,
        model: 'The leaves of plant Q turned yellow.',
        keys: [['yellow', 'pale']],
        explain: 'An observation is what you can see. The leaves of Q turned yellow. Saying WHY (no light) is an inference, not an observation.' },
      { id: 'ps-013', type: 'mcq', level: 1,
        stem: 'Which apparatus should Priya use to measure 100 ml of water?',
        figure: null,
        options: ['A ruler', 'A thermometer', 'A measuring cylinder', 'A magnifying glass'],
        answer: 2,
        explain: 'A measuring cylinder measures volume of liquid in ml. A ruler measures length and a thermometer measures temperature.' },
      { id: 'ps-014', type: 'mcq', level: 1,
        stem: 'Jun Kai dipped the ends of four strips of the same size, made of different materials, into water. He measured how high the water rose up each strip in 5 minutes. Which material absorbed water the best?',
        figure: FIG_JUNKAI,
        options: ['Cotton', 'Paper towel', 'Plastic', 'Wool'],
        answer: 1,
        explain: 'Water rose highest up the paper towel (12 cm), so paper towel is the most absorbent of the four.' },

      /* ===== Level 2: apply ===== */
      { id: 'ps-015', type: 'mcq', level: 2,
        stem: 'Ravi sorted some animals into two groups. Which characteristic did he use to sort them?',
        figure: TAB_ANIMALS,
        options: ['Whether they have six legs', 'Whether they have a shell', 'Whether they have legs', 'Whether they live on land'],
        answer: 0,
        explain: 'Ant, butterfly and grasshopper all have six legs. Spider has 8 legs and snail and earthworm have no legs. "Has a shell" is wrong because only the snail has a shell. "Has legs" is wrong because the spider has legs too, and all six animals live on land.' },
      { id: 'ps-016', type: 'mcq', level: 2,
        stem: 'Which of these is an OBSERVATION, not an inference?',
        figure: null,
        options: ['The plant did not get enough sunlight.', 'The plant was not given enough water.', 'The plant is sick because of insects.', 'The leaves of the plant are yellow.'],
        answer: 3,
        explain: 'You can see that the leaves are yellow, so that is an observation. The other three are reasons we think of to explain what we see, so they are inferences.' },
      { id: 'ps-017', type: 'mcq', level: 2,
        stem: 'Which of these statements is a PREDICTION?',
        figure: null,
        options: ['The seed is brown and hard.', 'The seed is bigger than the rice grain.', 'The seed will germinate in about three days.', 'The seed germinated because it was given water.'],
        answer: 2,
        explain: 'A prediction says what WILL happen. "Brown and hard" is an observation, "bigger than" is a comparison, and "because it was given water" is an inference.' },
      { id: 'ps-018', type: 'mcq', level: 2,
        stem: 'Look at Ali\'s experiment. Which is the measured variable?',
        figure: FIG_ALI,
        options: ['The number of paper clips attracted', 'The size of the paper clips', 'The magnet used', 'The material of the paper clips'],
        answer: 0,
        explain: 'Ali counted the paper clips each magnet attracted, so that is what he measured. The magnet used is the changed variable. The size and material of the clips are kept the same.' },
      { id: 'ps-019', type: 'oeq', level: 2, marks: 1,
        stem: 'Ali used the same type and size of paper clips for all three magnets. Why?',
        figure: FIG_ALI,
        model: 'To make it a fair test, so that only the magnet is changed.',
        keys: [['fair test', 'fair']],
        explain: 'Markers look for "fair test". Bigger clips are heavier, so a magnet might attract fewer of them. Then the result would not show the strength of the magnet only.' },
      { id: 'ps-020', type: 'oeq', level: 2, marks: 1,
        stem: 'Ali repeated his experiment two more times. Why did he do this?',
        figure: FIG_ALI,
        model: 'To get more reliable results.',
        keys: [['reliable']],
        explain: 'Repeating an experiment makes the results more reliable. Do not write "to make it fair": that is a different idea.' },
      { id: 'ps-021', type: 'mcq', level: 2,
        stem: TXT_PRIYA + ' Which material would be best for making a kitchen towel?',
        figure: TAB_PRIYA,
        options: ['W', 'X', 'Y', 'Z'],
        answer: 1,
        explain: 'A kitchen towel must absorb a lot of water. X gave out the most water (40 ml), so X absorbed the most.' },
      { id: 'ps-022', type: 'oeq', level: 2, marks: 2,
        stem: TXT_PRIYA + ' Which material is most suitable for making an umbrella? Give a reason based on the results.',
        figure: TAB_PRIYA,
        model: 'Material Y, because it absorbed the least water.',
        keys: [['Y'], ['least water', 'absorbed the least', 'least absorbent']],
        explain: 'An umbrella should not soak up rain. Y gave out only 5 ml, so it absorbed the least water. One mark for Y, one mark for the reason from the results.' },
      { id: 'ps-023', type: 'oeq', level: 2, marks: 2,
        stem: TXT_PRIYA + ' What is the aim of Priya\'s experiment?',
        figure: TAB_PRIYA,
        model: 'To find out how the type of material affects the amount of water it absorbs.',
        keys: [['type of material'], ['amount of water', 'water absorbed', 'absorbs']],
        explain: 'An aim names the changed variable (type of material) AND the measured variable (amount of water absorbed). Writing only "to find out about materials" gets no marks.' },
      { id: 'ps-024', type: 'mcq', level: 2,
        stem: TXT_PRIYA + ' Which of these did Priya NOT need to keep the same?',
        figure: TAB_PRIYA,
        options: ['The size of each piece of material', 'The amount of water each piece was soaked in', 'The time each piece was left in the water', 'The type of material'],
        answer: 3,
        explain: 'The type of material is the changed variable, so it must be different. The size, the amount of water and the time must all be kept the same.' },
      { id: 'ps-025', type: 'mcq', level: 2,
        stem: 'Look at Mary\'s experiment. Which variable must she keep the same?',
        figure: FIG_MARY,
        options: ['The amount of water given each day', 'The type of plant', 'The increase in height of the plant', 'The number of leaves at the end'],
        answer: 1,
        explain: 'The type of plant must be the same in all pots. The amount of water is the changed variable. The increase in height (and the leaves at the end) are results, not things she keeps the same.' },
      { id: 'ps-026', type: 'oeq', level: 2, marks: 2,
        stem: 'Look at Mary\'s experiment. What is the aim of the experiment?',
        figure: FIG_MARY,
        model: 'To find out how the amount of water given affects the growth (increase in height) of the plant.',
        keys: [['amount of water'], ['height', 'growth', 'grow']],
        explain: 'Name both: the changed variable (amount of water given) and the measured variable (increase in height / growth of the plant).' },
      { id: 'ps-027', type: 'oeq', level: 2, marks: 2,
        stem: 'Why did Mary use the same type of plant in all three pots?',
        figure: FIG_MARY,
        model: 'To make it a fair test, so that only the amount of water given is changed.',
        keys: [['fair test', 'fair'], ['only the amount of water', 'only one variable', 'only one thing']],
        explain: 'Different types of plants grow at different speeds. Keeping the plant the same makes it a fair test, so only the amount of water can cause the difference in growth.' },
      { id: 'ps-028', type: 'mcq', level: 2,
        stem: 'Which is the BEST way to write the changed variable in Mary\'s experiment?',
        figure: FIG_MARY,
        options: ['Water', 'The amount of water given each day', 'The plants', 'The pots'],
        answer: 1,
        explain: 'Name the variable fully. "Water" alone does not say what about the water was changed. Mary changed the AMOUNT of water given each day.' },
      { id: 'ps-029', type: 'mcq', level: 2,
        stem: TXT_AHMAD + ' What was Ahmad trying to find out?',
        figure: FIG_AHMAD,
        options: ['Whether a plant needs water to stay healthy', 'Whether bigger plants grow faster', 'Whether the cupboard is cold', 'Whether a plant needs light to stay healthy'],
        answer: 3,
        explain: 'The only difference between P and Q is light (window or dark cupboard), so Ahmad was finding out whether a plant needs light.' },
      { id: 'ps-030', type: 'mcq', level: 2,
        stem: 'Ahmad wants his results to be more reliable. What should he do?',
        figure: FIG_AHMAD,
        options: ['Move plant Q to the window as well', 'Give plant P more water than plant Q', 'Use more plants of the same type in each place', 'Use a different type of plant for Q'],
        answer: 2,
        explain: 'Using more plants (or repeating the experiment) makes results more reliable. The other choices would spoil the experiment or make it unfair.' },
      { id: 'ps-031', type: 'oeq', level: 2, marks: 1,
        stem: 'Siti put 5 seeds in each dish instead of just 1 seed. Why?',
        figure: FIG_SITI,
        model: 'To get more reliable results. One seed might not germinate even under good conditions.',
        keys: [['reliable']],
        explain: 'Using more seeds is like repeating the experiment. If only one seed were used and it was dead, Siti would get the wrong idea.' },
      { id: 'ps-032', type: 'oeq', level: 2, marks: 1,
        stem: 'Look at Hui Min\'s results. What can she infer about mealworms?',
        figure: FIG_HUIMIN,
        model: 'Mealworms prefer dark places.',
        keys: [['dark', 'away from light']],
        explain: 'Most mealworms moved to the dark side in every trial, so we infer that mealworms prefer dark places.' },
      { id: 'ps-033', type: 'mcq', level: 2,
        stem: 'Why did Hui Min do the experiment three times (three trials)?',
        figure: FIG_HUIMIN,
        options: ['To make the tray darker', 'To change the number of mealworms', 'To get more reliable results', 'To make the mealworms move faster'],
        answer: 2,
        explain: 'Doing more trials and checking that the results agree makes them more reliable.' },
      { id: 'ps-034', type: 'mcq', level: 2,
        stem: 'Ravi cut strips of materials K, L and M of the same length, width and thickness. He hung 50 g weights on each strip one by one until it broke. Which material is the strongest?',
        figure: FIG_RAVI,
        options: ['K', 'L', 'M', 'They are equally strong'],
        answer: 1,
        explain: 'L held 12 weights before it broke, more than K (5) and M (8), so L is the strongest.' },
      { id: 'ps-035', type: 'oeq', level: 2, marks: 1,
        stem: 'Look at Ravi\'s experiment. What did Ravi measure?',
        figure: FIG_RAVI,
        model: 'The number of 50 g weights each strip could hold before it broke.',
        keys: [['number of weights', 'number of 50 g weights', 'weights']],
        explain: 'The measured variable is the number of weights the strip held before breaking. This tells us how strong the material is.' },
      { id: 'ps-036', type: 'mcq', level: 2,
        stem: 'Which variable must Ravi keep the same for strips K, L and M?',
        figure: FIG_RAVI,
        options: ['The type of material', 'The number of weights hung', 'The thickness of the strip', 'Whether the strip broke'],
        answer: 2,
        explain: 'The thickness (and length and width) of the strips must be the same. The type of material is changed and the number of weights is measured.' },
      { id: 'ps-037', type: 'mcq', level: 2,
        stem: 'Mei Ling shone the same torch, from the same distance, at sheets of different materials of the same thickness. She looked for a patch of light on a screen behind each sheet. Which material allows the least light to pass through?',
        figure: TAB_MEILING,
        options: ['Glass', 'Tracing paper', 'Cardboard', 'Clear plastic'],
        answer: 2,
        explain: 'No patch of light was seen with cardboard, so no light passed through it. Tracing paper gave a dim patch, so some light passed through.' },
      { id: 'ps-038', type: 'oeq', level: 2, marks: 2,
        stem: 'Look at Mei Ling\'s results. Which material is suitable for making a window that we can see through clearly? Explain using the results.',
        figure: TAB_MEILING,
        model: 'Glass (or clear plastic), because it allows most light to pass through, giving a bright patch of light.',
        keys: [['glass', 'clear plastic'], ['most light', 'light to pass through', 'bright']],
        explain: 'Glass and clear plastic both gave a bright patch, so they allow most light to pass through. Either one earns the first mark; the reason earns the second.' },
      { id: 'ps-039', type: 'mcq', level: 2,
        stem: 'Ahmad measured the height of a seedling every 2 days. Predict the height of the seedling on Day 8.',
        figure: TAB_GROW,
        options: ['6 cm', '7 cm', '9 cm', '10 cm'],
        answer: 1,
        explain: 'The seedling grew 2 cm every 2 days: 1, 3, 5, so on Day 8 it should be about 7 cm. Predicting means using the pattern.' },
      { id: 'ps-040', type: 'mcq', level: 2,
        stem: 'What is the volume of water in the measuring cylinder?',
        figure: cylinder(35),
        options: ['30 ml', '35 ml', '40 ml', '45 ml'],
        answer: 1,
        explain: 'The water is halfway between 30 ml and 40 ml, at the short line that stands for 35 ml. Read at eye level.' },
      { id: 'ps-041', type: 'oeq', level: 2, marks: 2,
        stem: 'Using the table, state one similarity and one difference between a butterfly and a spider.',
        figure: TAB_COMPARE,
        model: 'Similarity: both lay eggs. Difference: a butterfly has 6 legs but a spider has 8 legs (or: a butterfly has wings but a spider does not).',
        keys: [['lay eggs'], ['legs', 'wings']],
        explain: 'A similarity is the same for both (both lay eggs). A difference must say what EACH animal has: 6 legs and 8 legs, or wings and no wings.' },
      { id: 'ps-042', type: 'oeq', level: 2, marks: 1,
        stem: 'Jun Kai saw that no water rose up the plastic strip. Why?',
        figure: FIG_JUNKAI,
        model: 'Plastic does not absorb water. It is waterproof.',
        keys: [['does not absorb', 'not absorbent', 'waterproof', 'cannot absorb']],
        explain: 'Water rises up a strip only if the material absorbs water. Plastic is waterproof, so the water stayed at 0 cm.' },
      { id: 'ps-043', type: 'oeq', level: 2, marks: 1,
        stem: 'Mei Ling saw that the soil in a pot was very dry and the leaves of the plant were drooping. Give one inference from her observations.',
        figure: setup('A plant with drooping leaves in a pot of dry soil', [{ label: '', kind: 'pot', plant: 'wilted', lines: ['dry soil'] }]),
        model: 'The plant did not get enough water.',
        keys: [['enough water', 'lack of water', 'needs water', 'no water']],
        explain: 'An inference is a reason that explains what you observed. Dry soil and drooping leaves suggest the plant has not been watered enough.' },
      { id: 'ps-044', type: 'oeq', level: 2, marks: 2,
        stem: 'John wanted to find out which brand of paper towel absorbs the most water. He poured 20 ml of water onto brand A and 30 ml of water onto brand B. Is this a fair test? Explain.',
        figure: null,
        model: 'No, it is not a fair test. He used different amounts of water, so two variables (the brand and the amount of water) were changed.',
        keys: [['not a fair test', 'not fair', 'unfair', 'no'], ['amount of water', 'two variables']],
        explain: 'Only the brand of paper towel should change. The amount of water must be the same for both brands.' },
      { id: 'ps-045', type: 'oeq', level: 2, marks: 1,
        stem: 'Siti did her germination experiment only once. Her teacher said the results may not be reliable. What should Siti do?',
        figure: null,
        model: 'Repeat the experiment a few more times and compare the results.',
        keys: [['repeat', 'do it again', 'more times', 'more seeds']],
        explain: 'Repeating (or using more seeds) and checking that the results agree makes them more reliable.' },

      /* ===== Level 3: exam-hard / experiment ===== */
      { id: 'ps-046', type: 'oeq', level: 3, marks: 2,
        stem: 'Look at Mary\'s results. Based on the results, what can you conclude about the amount of water given and the growth of the plant?',
        figure: FIG_MARY,
        model: 'The more water the plant was given each day, the greater the increase in height of the plant.',
        keys: [['more water'], ['increase in height', 'taller', 'grew more', 'more growth']],
        explain: 'Read the pattern: 20 ml gave 3 cm, 40 ml gave 5 cm, 60 ml gave 8 cm. A good conclusion links both variables: "the more ..., the more ...". It is only true for the amounts tested.' },
      { id: 'ps-047', type: 'mcq', level: 3,
        stem: 'Mary wrote the conclusion: "Plants need sunlight to grow." Why is this conclusion NOT supported by her experiment?',
        figure: FIG_MARY,
        options: ['Plant C grew the tallest', 'She did not give plant A enough water to grow well', 'Plants do not need sunlight to grow', 'All three plants got the same sunlight, so sunlight was not tested'],
        answer: 3,
        explain: 'A conclusion must come from what was changed in the experiment. Mary only changed the amount of water, so her results cannot tell us anything about sunlight.' },
      { id: 'ps-048', type: 'oeq', level: 3, marks: 2,
        stem: 'Look at Ali\'s bar chart. Arrange the magnets from the strongest to the weakest. Explain how you know.',
        figure: FIG_ALI,
        model: 'Q, R, P. Q attracted the most paper clips and P attracted the fewest. The more paper clips a magnet attracts, the stronger it is.',
        keys: [['Q, R, P', 'Q R P', 'QRP', 'Q, R and P'], ['most paper clips', 'more paper clips', 'number of paper clips']],
        explain: 'Q has 9 clips, R has 6 and P has 4. A stronger magnet attracts more paper clips.' },
      { id: 'ps-049', type: 'mcq', level: 3,
        stem: 'Which change would make Ali\'s experiment NOT a fair test?',
        figure: FIG_ALI,
        options: ['Repeating the experiment three times', 'Using the same box of paper clips for every magnet', 'Using bigger paper clips for magnet Q only', 'Dipping each magnet into the clips for the same length of time'],
        answer: 2,
        explain: 'If magnet Q used bigger clips, both the magnet AND the size of clips would change. Then we could not tell what caused the result.' },
      { id: 'ps-050', type: 'oeq', level: 3, marks: 2,
        stem: 'Write a suitable aim for Ali\'s experiment.',
        figure: FIG_ALI,
        model: 'To find out which magnet is the strongest by counting the number of paper clips each magnet attracts.',
        keys: [['magnet'], ['strongest', 'strength', 'number of paper clips']],
        explain: 'The aim must mention what was changed (the magnet) and what it tells us (strength, measured by the number of paper clips). "To find out how the type of magnet affects the number of paper clips attracted" also earns full marks.' },
      { id: 'ps-051', type: 'oeq', level: 3, marks: 2,
        stem: TXT_PRIYA + ' Why did Priya cut all the materials to the same size?',
        figure: TAB_PRIYA,
        model: 'To make it a fair test. A bigger piece of material can absorb more water, so only the type of material should be changed.',
        keys: [['fair test', 'fair'], ['bigger piece', 'more water', 'only the type of material']],
        explain: 'Mark 1: fair test. Mark 2: the reason. The size of a material affects how much water it can hold, so size must be kept the same.' },
      { id: 'ps-052', type: 'mcq', level: 3,
        stem: 'Priya\'s friend did a different test. She put each material into a beaker of 100 ml of water for 1 minute, took it out, and measured the water LEFT in the beaker. Which material is the most absorbent?',
        figure: table(['Material', 'Volume of water left in the beaker (ml)'], [['W', '85'], ['X', '60'], ['Y', '95'], ['Z', '75']], 'Results'),
        options: ['W', 'X', 'Y', 'Z'],
        answer: 1,
        explain: 'Watch out! This table shows water LEFT behind. The material that absorbed the most leaves the LEAST water behind. X left only 60 ml, so it absorbed 40 ml, the most.' },
      { id: 'ps-053', type: 'oeq', level: 3, marks: 2,
        stem: TXT_AHMAD + ' Which plant, P or Q, is the control set-up? Explain why it is needed.',
        figure: FIG_AHMAD,
        model: 'Plant P is the control. It is the same as Q except that it gets light, so Ahmad can compare the two and show that the yellow leaves of Q were caused by the lack of light.',
        keys: [['P'], ['compare', 'only difference', 'same except']],
        explain: 'The control is set up the same way except for the one variable being tested. Comparing with it shows the change was caused by that variable.' },
      { id: 'ps-054', type: 'oeq', level: 3, marks: 2,
        stem: TXT_AHMAD + ' After one week, the leaves of Q had turned yellow. Based on the results, what can you conclude?',
        figure: FIG_AHMAD,
        model: 'Plants need light to stay healthy and green.',
        keys: [['need light', 'needs light', 'light'], ['healthy', 'green', 'grow well']],
        explain: 'The only difference was light, and the plant without light turned yellow. So plants need light to stay healthy.' },
      { id: 'ps-055', type: 'mcq', level: 3,
        stem: 'Siti wants to find out if seeds need water to germinate. Which two dishes should she compare?',
        figure: FIG_SITI,
        options: ['A and B', 'A and C', 'B and C', 'A, B and C'],
        answer: 0,
        explain: 'A and B are both in the dark cupboard; the ONLY difference is dry or moist cotton wool. A and C differ in both water and temperature, so they cannot be compared.' },
      { id: 'ps-056', type: 'oeq', level: 3, marks: 2,
        stem: 'Siti wants to find out if seeds need warmth to germinate. Which two dishes should she compare? Explain your answer.',
        figure: FIG_SITI,
        model: 'Dishes B and C. Both have moist cotton wool and both are dark; the only difference is that B is in a warm cupboard and C is in the cold fridge.',
        keys: [['B and C', 'C and B', 'B, C'], ['only difference', 'only the temperature', 'both have moist cotton wool', 'warm', 'cold']],
        explain: 'To test one variable, choose two set-ups that differ in only that variable. B and C differ only in temperature. (Both are dark too: the cupboard is dark and a closed fridge is dark, so light is kept the same.)' },
      { id: 'ps-057', type: 'mcq', level: 3,
        stem: 'Why can Siti NOT compare dishes A and C to find out if seeds need water to germinate?',
        figure: FIG_SITI,
        options: ['No seeds germinated in either dish', 'Dish A has fewer seeds than dish C', 'Both the water and the temperature are different', 'The fridge is too small'],
        answer: 2,
        explain: 'A is dry and warm (cupboard); C is moist and cold (fridge). Two variables are different, so it is not a fair comparison. (It is true no seeds germinated in either, but that is not the reason.)' },
      { id: 'ps-058', type: 'oeq', level: 3, marks: 2,
        stem: 'Based on Siti\'s results, what can she conclude about what seeds need to germinate?',
        figure: FIG_SITI,
        model: 'Seeds need water and warmth to germinate.',
        keys: [['water'], ['warmth', 'warm', 'suitable temperature']],
        explain: 'Only dish B (water + warmth) germinated. A (no water) and C (cold) did not. So seeds need both water and warmth.' },
      { id: 'ps-059', type: 'mcq', level: 3,
        stem: 'Jun Kai put 10 seeds on moist cotton wool in each of two dishes. Dish D was kept in a dark cupboard and dish E near a window. Both were in the same warm room. After 5 days, all 10 seeds in each dish had germinated. What can he conclude?',
        figure: setup('Dish D in a dark cupboard and dish E near a window, both with moist cotton wool and 10 seeds', [
          { label: 'D', kind: 'dish', moist: true, dark: true, sprout: true, lines: ['dark cupboard', '10 germinated'] },
          { label: 'E', kind: 'dish', moist: true, sun: true, sprout: true, lines: ['near window', '10 germinated'] }
        ]),
        options: ['Seeds do not need light to germinate', 'Seeds need light to germinate', 'Seeds germinate only in the dark', 'Seeds need darkness to germinate'],
        answer: 0,
        explain: 'All the seeds germinated with or without light, so light is not needed for germination. Many pupils wrongly think seeds need light; the young plant needs light only after it grows leaves.' },
      { id: 'ps-060', type: 'oeq', level: 3, marks: 2,
        stem: 'Why did Hui Min place all the mealworms in the middle of the tray at the start of each trial?',
        figure: FIG_HUIMIN,
        model: 'So that every mealworm was the same distance from the dark side and the bright side, making it a fair test.',
        keys: [['same distance', 'middle', 'equal chance'], ['fair']],
        explain: 'If the mealworms started near the dark side, they might end up there just because it was closer. Starting in the middle makes it fair.' },
      { id: 'ps-061', type: 'mcq', level: 3,
        stem: 'In Trial 3, three mealworms stayed on the bright side. Which statement is correct?',
        figure: FIG_HUIMIN,
        options: ['The experiment is wrong and must be thrown away', 'Mealworms prefer bright places', 'Mealworms like the dark and bright sides equally', 'Most mealworms still went to the dark side, so the conclusion stays the same'],
        answer: 3,
        explain: 'Living things do not all behave the same way. Look at the overall pattern across all trials: most mealworms chose the dark side each time.' },
      { id: 'ps-062', type: 'oeq', level: 3, marks: 3,
        stem: 'Hui Min now wants to find out if mealworms prefer damp or dry places. Describe how she should set up her tray.',
        figure: null,
        model: 'Put damp paper on one half of the tray and dry paper on the other half. Keep both halves the same in light (for example, both covered so both are dark). Place the mealworms in the middle and count how many are on each side after 15 minutes.',
        keys: [['damp', 'wet', 'moist'], ['dry'], ['both dark', 'same light', 'same amount of light', 'both covered']],
        explain: 'Change only ONE variable (damp or dry). Light must now be kept the same on both sides, or the mealworms might move because of the light instead.' },
      { id: 'ps-063', type: 'oeq', level: 3, marks: 3,
        stem: 'Ravi\'s friend said he should use a THICKER strip of material K because K is weak. Do you agree? Explain.',
        figure: FIG_RAVI,
        model: 'No. Then both the type of material and the thickness of the strip would be changed. It would not be a fair test, and Ravi could not tell which variable caused the result.',
        keys: [['no', 'disagree', 'do not agree'], ['thickness', 'two variables', 'both'], ['fair test', 'not fair', 'unfair']],
        explain: 'Only the type of material should be changed. A thicker strip would hold more weights, so the comparison would no longer be fair.' },
      { id: 'ps-064', type: 'mcq', level: 3,
        stem: 'Priya set up four pots of the same type of plant. To find out if the type of soil affects the growth of the plant, which two set-ups should she compare?',
        figure: TAB_SOIL,
        options: ['A and B', 'A and C', 'B and C', 'C and D'],
        answer: 0,
        explain: 'A and B have the same amount of water (50 ml) and the same place (near window). Only the type of soil is different. C and D differ in soil AND place.' },
      { id: 'ps-065', type: 'oeq', level: 3, marks: 2,
        stem: 'Look at Priya\'s four set-ups. Which two set-ups should she compare to find out if the amount of water affects the growth of the plant? Explain.',
        figure: TAB_SOIL,
        model: 'A and D. Only the amount of water is different; both have sandy soil and are placed near the window.',
        keys: [['A and D', 'D and A', 'A, D'], ['only the amount of water', 'only', 'same soil', 'same place']],
        explain: 'A (50 ml) and D (100 ml) differ only in water. B and C also differ in water, but C is in a cupboard, so the place is different too.' },
      { id: 'ps-066', type: 'mcq', level: 3,
        stem: 'Why can Priya NOT use set-ups B and C to find out if the amount of water affects plant growth?',
        figure: TAB_SOIL,
        options: ['Both have garden soil', 'B was given less water than C', 'Both the amount of water and the place where they were put are different', 'C was put in a cupboard, so the plant in C will not grow at all'],
        answer: 2,
        explain: 'B is near the window and C is in a cupboard, so the amount of light is also different. Two variables changed, so it is not a fair test.' },
      { id: 'ps-067', type: 'oeq', level: 3, marks: 2,
        stem: 'Mary repeated her experiment but this time used a rose plant in pot A, a hibiscus in pot B and a bean plant in pot C. Plant C grew the most. Can she conclude that more water makes plants grow taller? Explain.',
        figure: table(['Pot', 'Type of plant', 'Water each day (ml)'], [['A', 'rose', '20'], ['B', 'hibiscus', '40'], ['C', 'bean', '60']]),
        model: 'No. Two variables were changed (the type of plant and the amount of water), so she cannot tell whether the water or the type of plant made plant C grow more.',
        keys: [['no', 'cannot'], ['two variables', 'type of plant', 'both']],
        explain: 'When two variables change together, we cannot tell which one caused the result. Bean plants may simply grow faster than roses.' },
      { id: 'ps-068', type: 'mcq', level: 3,
        stem: 'Ahmad wants to find out if fertiliser helps plants grow taller. Set-up X is a plant given fertiliser. What should the control set-up be?',
        figure: null,
        options: ['The same type of plant with more fertiliser', 'A different type of plant, same water and light, with no fertiliser', 'The same type of plant with fertiliser, kept in a dark cupboard', 'The same type of plant, same water and light, but no fertiliser'],
        answer: 3,
        explain: 'The control is the same as set-up X in every way except the variable being tested (fertiliser). A different plant or a dark place would change a second variable.' },
      { id: 'ps-069', type: 'oeq', level: 3, marks: 2,
        stem: 'John tested three magnets, A, B and C. For each magnet, he held the same paper clip to it through sheets of paper, adding one sheet at a time until the clip fell. What can John conclude about the strength of the magnets? Explain.',
        figure: TAB_JOHN,
        model: 'Magnet B is the strongest and magnet A is the weakest, because the clip was still attracted through the most sheets of paper with B and the fewest with A.',
        keys: [['B is the strongest', 'B strongest', 'magnet B'], ['most sheets', 'more sheets', 'number of sheets']],
        explain: 'The stronger the magnet, the more sheets of paper it can attract the clip through. B (14) > C (9) > A (6).' },
      { id: 'ps-070', type: 'mcq', level: 3,
        stem: 'Look at John\'s experiment. Which is the measured variable?',
        figure: TAB_JOHN,
        options: ['The number of sheets of paper the clip was still attracted through', 'The magnet used', 'The size of the paper clip', 'The type of paper'],
        answer: 0,
        explain: 'John counted sheets of paper. The magnet is the changed variable; the paper clip and type of paper are kept the same.' },
      { id: 'ps-071', type: 'mcq', level: 3,
        stem: 'Using the table, which object is NOT attracted by a magnet AND sinks in water?',
        figure: TAB_OBJECTS,
        options: ['Rubber eraser', 'Plastic bottle cap', 'Steel pin', 'Wooden block'],
        answer: 0,
        explain: 'Look for "no" in BOTH columns. Only the rubber eraser is not attracted by a magnet and does not float. The bottle cap and wooden block float; the steel pin is attracted by a magnet.' },
      { id: 'ps-072', type: 'oeq', level: 3, marks: 2,
        stem: 'Look at the table. Classify the objects into two groups using ONE characteristic. Name the characteristic and list the objects in each group.',
        figure: TAB_OBJECTS,
        model: 'Attracted by a magnet: steel pin, iron nail. Not attracted by a magnet: plastic bottle cap, wooden block, rubber eraser. (Or: Floats: plastic bottle cap, wooden block. Sinks: steel pin, iron nail, rubber eraser.)',
        keys: [['attracted by a magnet', 'magnet', 'floats', 'float'], ['steel pin, iron nail', 'steel pin and iron nail', 'bottle cap and wooden block', 'bottle cap, wooden block']],
        explain: 'Pick one characteristic. Every object in a group must share it, and every object must go into a group.' },
      { id: 'ps-073', type: 'mcq', level: 3,
        stem: 'Look at Jun Kai\'s experiment. Which variable must he keep the same?',
        figure: FIG_JUNKAI,
        options: ['The material of each strip', 'The height the water rose', 'The length of time each strip was left in the water', 'The material that absorbed the most water'],
        answer: 2,
        explain: 'Every strip must be left in the water for the same time (5 minutes). The material is the changed variable and the height of water is the measured variable.' },
      { id: 'ps-074', type: 'oeq', level: 3, marks: 2,
        stem: 'Look at Jun Kai\'s experiment. Which strip of material would be best for wiping up spilt water? Give a reason based on the results.',
        figure: FIG_JUNKAI,
        model: 'Paper towel, because the water rose the highest up the paper towel strip, so it absorbs water the best.',
        keys: [['paper towel'], ['rose the highest', 'highest', 'absorbs the most', 'most absorbent']],
        explain: 'One mark for the material, one for the reason taken from the results (12 cm, the highest).' }
    ]
  });
})();
