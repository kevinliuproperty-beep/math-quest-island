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

  // Line graph with grid lines so values can be read exactly.
  function lineGraph(aria, title, xTitle, yTitle, pts, xmax, xstep, ymax, ystep) {
    const W = 360, H = 272, L = 52, R = 18, Tp = 34, B = 58;
    const pw = W - L - R, ph = H - Tp - B;
    const X = x => L + x / xmax * pw, Y = y => Tp + ph - y / ymax * ph;
    let s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="100%" style="max-width:380px;display:block;margin:0 auto;" role="img" aria-label="' + aria + '" font-family="system-ui,sans-serif" font-size="13" fill="none" stroke="currentColor" stroke-width="1.5">';
    s += T(W / 2, 18, title, 'bold', 14);
    for (let v = 0; v <= ymax; v += ystep) {
      s += '<path d="M' + L + ' ' + Y(v) + ' H' + (W - R) + '" stroke-opacity="0.25" stroke-width="1"/>';
      s += '<text x="' + (L - 6) + '" y="' + (Y(v) + 4) + '" text-anchor="end" fill="currentColor" stroke="none" font-size="13">' + v + '</text>';
    }
    for (let x = 0; x <= xmax; x += xstep) {
      s += '<path d="M' + X(x) + ' ' + Tp + ' V' + (Tp + ph) + '" stroke-opacity="0.25" stroke-width="1"/>';
      s += T(X(x), Tp + ph + 18, x, null, 13);
    }
    s += '<path d="M' + L + ' ' + Tp + ' V' + (Tp + ph) + ' H' + (W - R) + '" stroke-width="2"/>';
    s += '<polyline points="' + pts.map(p => X(p[0]) + ',' + Y(p[1])).join(' ') + '" stroke="#2f7fbf" stroke-width="2.5"/>';
    pts.forEach(p => { s += '<circle cx="' + X(p[0]) + '" cy="' + Y(p[1]) + '" r="3.5" fill="#2f7fbf" stroke="none"/>'; });
    s += '<text transform="translate(14 ' + (Tp + ph / 2) + ') rotate(-90)" text-anchor="middle" fill="currentColor" stroke="none" font-size="13">' + yTitle + '</text>';
    s += T(L + pw / 2, H - 12, xTitle, null, 13);
    return s + '</svg>';
  }

  // Blank "tick the box" variable table (the child ticks on paper; nothing is pre-filled).
  function tickTable(vars) {
    return table(['Variable', 'Changed', 'Measured', 'Kept the same'], vars.map(v => [v, '', '', '']));
  }

  /* ---------- set-up texts (every item repeats its own set-up: the mock paper draws items singly) ---------- */

  const TXT_MARY = 'Mary placed three pots, A, B and C, each with the same type of plant, near a window. She gave the plants 20 ml, 40 ml and 60 ml of water each day and measured the increase in height of each plant after 2 weeks.';
  const TXT_ALI = 'Ali dipped three magnets, P, Q and R, into a box of steel paper clips and counted the paper clips each magnet attracted. The bar chart shows his results.';
  const TXT_SITI = 'Siti placed 5 green bean seeds on cotton wool in each of three dishes, A, B and C, as shown. She counted the seeds that germinated after 5 days.';
  const TXT_HUIMIN = 'Hui Min covered the left half of a tray with black paper. She placed 10 mealworms in the middle of the tray and counted the mealworms on each side after 15 minutes. She did this three times (three trials).';
  const TXT_RAVI = 'Ravi cut strips of materials K, L and M of the same length, width and thickness. He hung 50 g weights on each strip one by one until it broke.';
  const TXT_MEILING = 'Mei Ling shone the same torch, from the same distance, at sheets of different materials of the same thickness. She looked for a patch of light on a screen behind each sheet.';
  const TXT_JUNKAI = 'Jun Kai hung four strips of the same size, made of different materials, with their ends dipped in water. He measured how high the water rose up each strip in 5 minutes.';
  const TXT_SOIL = 'Priya set up four pots, A, B, C and D, each with the same type of plant, as shown in the table.';
  const TXT_JOHN = 'John tested three magnets, A, B and C. For each magnet, he held the same paper clip to it through sheets of paper, adding one sheet at a time until the clip fell.';
  const TXT_OBJECTS = 'Kumar tested five objects to find out if each one was attracted by a magnet and if it floated on water.';

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

  // Ben: plant in a closed box with a hole on one side (responds to light)
  const FIG_BOX = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 214" width="100%" style="max-width:380px;display:block;margin:0 auto;" role="img" aria-label="A potted plant inside a closed box with a small hole in the right side. Light shines in through the hole. The tip of the stem has bent towards the hole." font-family="system-ui,sans-serif" font-size="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<rect x="60" y="34" width="200" height="160" fill="currentColor" fill-opacity="0.12" stroke="none"/>' +
    '<path d="M260 64 V34 H60 V194 H260 V90"/>' +
    T(160, 24, 'closed box', 'bold') +
    sun(326, 77) + T(326, 50, 'light') +
    '<path d="M308 77 H272 M280 71 L272 77 L280 83" stroke="#d99a00" stroke-width="2.5"/>' +
    T(294, 112, 'hole') +
    '<path d="M150 192 V118 Q150 86 192 79 Q222 74 246 77" stroke="#3a9d4a" stroke-width="2.5"/>' +
    leaf(150, 168, -1, true) + leaf(150, 148, 1, true) + leaf(150, 128, -1, true) + leaf(196, 79, 1, true) +
    '<path d="M122 166 H178 L170 194 H130Z" fill="#b5651d" fill-opacity="0.35"/>' +
    '</svg>';

  // Mira: germination over time (running total)
  const FIG_GERM_GRAPH = lineGraph('Line graph: total number of seeds germinated. Day 0: 0, Day 2: 0, Day 4: 6, Day 6: 14, Day 8: 18, Day 10: 18, Day 12: 18',
    'Total number of seeds germinated', 'Day', 'Number of seeds', [[0, 0], [2, 0], [4, 6], [6, 14], [8, 18], [10, 18], [12, 18]], 12, 2, 20, 4);

  // Wen Hui: length of a young beetle after hatching
  const FIG_BEETLE_GRAPH = lineGraph('Line graph: length of the young beetle. Day 0: 3 mm, Day 5: 8, Day 10: 14, Day 15: 20, Day 20: 24, then 24 mm on Days 25, 30 and 35',
    'Length of the young beetle', 'Days after hatching', 'Length (mm)', [[0, 3], [5, 8], [10, 14], [15, 20], [20, 24], [25, 24], [30, 24], [35, 24]], 35, 5, 30, 5);

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
        body: 'Use the exact words from the question and the table. "Why use the same amount of water?" - answer "to make it a fair test, so that only the [changed variable] is changed." "Why repeat?" - "to get more reliable results." For "which is best" or "Do you agree?", write three things: your answer (claim), the results that show it (evidence), and why that matters for the use (reason). When you compare, say BOTH sides: "8 cm up the cotton but only 5 cm up the wool".' },
      { title: 'Line graphs and missing values',
        body: 'A line going up means the value is increasing. A FLAT part means there was no change. Read the axis titles carefully: "days after hatching" starts when the young hatches, so the egg stage is not on the graph at all. To suggest a missing value in a table, use the pattern: the value must fit between the values before and after it.' }
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
      { id: 'ps-003', type: 'mcq', level: 2,
        stem: 'Siti put two slices of the same bread into two plastic bags. She sprinkled water on one slice and left the other slice dry. She sealed both bags and kept them in the same cupboard. After 5 days, the damp slice had black, fuzzy spots on it but the dry slice had none. Which is the best inference?',
        figure: null,
        options: ['The spots are dust that fell on the bread in the cupboard', 'Mould grows better on damp bread than on dry bread', 'Mould is a kind of plant that needs water', 'The damp slice was kept in a warmer place'],
        answer: 1,
        explain: 'The only difference between the two slices was water, and only the damp slice grew mould (the black, fuzzy spots). So we infer that mould grows better where there is moisture. Mould is a fungus, not a plant. Both bags were sealed and kept in the same cupboard, so dust and warmth were the same for both slices.' },
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
        stem: TXT_ALI + ' Which magnet is the strongest?',
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
        stem: TXT_MARY + ' Which variable did Mary change?',
        figure: FIG_MARY,
        options: ['The amount of water given each day', 'The type of plant', 'The amount of sunlight', 'The increase in height of the plant'],
        answer: 0,
        explain: 'Pots A, B and C were given 20 ml, 40 ml and 60 ml of water. That is the only thing Mary changed. The increase in height is what she measured.' },
      { id: 'ps-009', type: 'mcq', level: 1,
        stem: TXT_HUIMIN + ' In all three trials, where did most of the mealworms go?',
        figure: FIG_HUIMIN,
        options: ['To the bright side', 'They stayed in the middle', 'Equally to both sides', 'To the dark side'],
        answer: 3,
        explain: 'In every trial more mealworms were on the dark side (8, 9 and 7) than on the bright side.' },
      { id: 'ps-010', type: 'oeq', level: 2, marks: 2,
        stem: 'Hui Min brought a bar magnet near some objects one at a time. She sorted the objects into two groups, as shown in the table. Suggest a suitable heading for Group X and for Group Y.',
        figure: table(['Group X', 'Group Y'], [['iron nail', 'copper wire'], ['steel paper clip', 'plastic ruler'], ['steel pin', 'wooden pencil'], ['', 'aluminium can']]),
        model: 'Group X: attracted by a magnet (made of magnetic materials). Group Y: not attracted by a magnet (made of non-magnetic materials).',
        keys: [['X: attracted by a magnet', 'magnetic materials', 'attracted by a magnet'], ['not attracted by a magnet', 'non-magnetic']],
        explain: 'Look for what EVERY object in a group shares. Iron and steel are magnetic materials, so Group X is "attracted by a magnet". Copper, plastic, wood and aluminium are not. A heading like "metal / not metal" is wrong: copper and aluminium are metals, but they are not attracted by a magnet.' },
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
        stem: TXT_JUNKAI + ' Which material absorbed water the best?',
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
        stem: 'Ben put a potted plant inside a closed box that had a small hole in one side. Light could enter the box only through the hole. After one week, he opened the box and saw that the tip of the stem had grown and bent towards the hole. Which is the best inference?',
        figure: FIG_BOX,
        options: ['The plant was given too much water', 'The plant needs darkness to grow well', 'The plant grew away from the light', 'The plant grew towards the light'],
        answer: 3,
        explain: 'Light came in only through the hole, and the stem bent towards the hole. So we infer that the plant grows towards light. Plants are living things, and living things respond to changes around them, such as light. "Bent towards the hole" is the observation; "grew towards the light" is the inference that explains it.' },
      { id: 'ps-017', type: 'mcq', level: 2,
        stem: 'Lina made stacks of 1, 2 and 3 layers of the same paper towel. She dipped each stack into water for 10 seconds, then squeezed out the water it had absorbed and measured it. Predict the volume of water a stack of 4 layers would absorb.',
        figure: table(['Number of layers of paper towel', 'Volume of water absorbed (ml)'], [['1', '8'], ['2', '16'], ['3', '24'], ['4', '?']], 'Results'),
        options: ['24 ml', '28 ml', '32 ml', '48 ml'],
        answer: 2,
        explain: 'Each extra layer absorbed 8 ml more: 8, 16, 24. So 4 layers should absorb about 24 + 8 = 32 ml. Predicting means using the pattern in the results. 24 ml would mean the fourth layer absorbed nothing.' },
      { id: 'ps-018', type: 'mcq', level: 2,
        stem: TXT_ALI + ' Which is the measured variable?',
        figure: FIG_ALI,
        options: ['The number of paper clips attracted', 'The size of the paper clips', 'The magnet used', 'The material of the paper clips'],
        answer: 0,
        explain: 'Ali counted the paper clips each magnet attracted, so that is what he measured. The magnet used is the changed variable. The size and material of the clips are kept the same.' },
      { id: 'ps-019', type: 'oeq', level: 2, marks: 1,
        stem: TXT_ALI + ' Ali used the same type and size of paper clips for all three magnets. Why?',
        figure: FIG_ALI,
        model: 'To make it a fair test, so that only the magnet is changed.',
        keys: [['fair test', 'fair']],
        explain: 'Markers look for "fair test". Bigger clips are heavier, so a magnet might attract fewer of them. Then the result would not show the strength of the magnet only.' },
      { id: 'ps-020', type: 'oeq', level: 3, marks: 4,
        stem: TXT_ALI + ' He did the whole experiment two more times and got the same pattern each time.\n(a) Which variable did Ali change in his experiment? (1 mark)\n(b) Why did Ali do the experiment two more times? (1 mark)\n(c) Ali wants to use one of the magnets to hold a thick stack of papers onto a steel cabinet door. Which magnet should he use? Explain using the results. (2 marks)',
        figure: FIG_ALI,
        model: '(a) The magnet used (P, Q or R). (b) To get more reliable results. (c) Magnet Q. It attracted the most paper clips (9), so it is the strongest magnet and can hold the thick stack of papers on the door without letting it slip down.',
        keys: [['magnet used', 'type of magnet'], ['reliable'], ['most paper clips', '9'], ['strongest']],
        explain: '(a) The magnet is the only thing Ali changed. The number of clips is what he measured. (b) Repeating makes the results more reliable. Do not write "to make it fair": that is a different idea. (c) Mark 1: Magnet Q with the evidence (it attracted the most clips, 9). Mark 2: the reason linked to the use (it is the strongest, so it can hold the heavy stack).' },
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
        stem: TXT_MARY + ' Which variable must she keep the same?',
        figure: FIG_MARY,
        options: ['The amount of water given each day', 'The type of plant', 'The increase in height of the plant', 'The number of leaves at the end'],
        answer: 1,
        explain: 'The type of plant must be the same in all pots. The amount of water is the changed variable. The increase in height (and the leaves at the end) are results, not things she keeps the same.' },
      { id: 'ps-026', type: 'oeq', level: 2, marks: 2,
        stem: TXT_MARY + ' What is the aim of the experiment?',
        figure: FIG_MARY,
        model: 'To find out how the amount of water given affects the growth (increase in height) of the plant.',
        keys: [['amount of water'], ['height', 'growth', 'grow']],
        explain: 'Name both: the changed variable (amount of water given) and the measured variable (increase in height / growth of the plant).' },
      { id: 'ps-027', type: 'oeq', level: 2, marks: 2,
        stem: TXT_MARY + ' Why did Mary use the same type of plant in all three pots?',
        figure: FIG_MARY,
        model: 'To make it a fair test, so that only the amount of water given is changed.',
        keys: [['fair test', 'fair'], ['only the amount of water', 'only one variable', 'only one thing']],
        explain: 'Different types of plants grow at different speeds. Keeping the plant the same makes it a fair test, so only the amount of water can cause the difference in growth.' },
      { id: 'ps-028', type: 'mcq', level: 2,
        stem: TXT_MARY + ' Which is the BEST way to write the changed variable in Mary\'s experiment?',
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
        stem: TXT_AHMAD + ' Ahmad wants his results to be more reliable. What should he do?',
        figure: FIG_AHMAD,
        options: ['Move plant Q to the window as well', 'Give plant P more water than plant Q', 'Use more plants of the same type in each place', 'Use a different type of plant for Q'],
        answer: 2,
        explain: 'Using more plants (or repeating the experiment) makes results more reliable. The other choices would spoil the experiment or make it unfair.' },
      { id: 'ps-031', type: 'oeq', level: 3, marks: 3,
        stem: TXT_SITI + '\n(a) Why did Siti put 5 seeds in each dish instead of just 1 seed? (1 mark)\n(b) After the 5 days, Siti took dish C out of the fridge and put it in the dark cupboard next to dish B. She kept its cotton wool moist. Predict what would happen to the seeds in dish C after a few more days. Explain your prediction. (2 marks)',
        figure: FIG_SITI,
        model: '(a) To get more reliable results. One seed might not germinate even under good conditions. (b) The seeds in dish C would germinate, because now they have both water and warmth, just like the seeds in dish B.',
        keys: [['reliable'], ['would germinate', 'will germinate'], ['water and warmth', 'warmth', 'warm']],
        explain: '(a) Using more seeds is like repeating the experiment. If only one seed were used and it was dead, Siti would get the wrong idea. (b) Mark 1: the prediction (they will germinate). Mark 2: the reason (they now get water AND warmth, the conditions that made the seeds in B germinate). The fridge only stopped them because it was cold.' },
      { id: 'ps-032', type: 'oeq', level: 3, marks: 3,
        stem: TXT_HUIMIN + '\n(a) What can Hui Min infer about the kind of place mealworms prefer? (1 mark)\n(b) Hui Min keeps mealworms in a box as food for her pet bird. Should she keep the box in a dark cupboard or on a sunny window ledge? Explain using her results. (2 marks)',
        figure: FIG_HUIMIN,
        model: '(a) Mealworms prefer dark places. (b) In a dark cupboard. In every trial most of the mealworms moved to the dark side (8, 9 and 7 out of 10), so the mealworms prefer the dark and will stay in the box more happily in the cupboard.',
        keys: [['dark places', 'away from light'], ['dark cupboard'], ['most of the mealworms moved to the dark side', 'dark side', 'prefer the dark']],
        explain: '(a) Most mealworms moved to the dark side in every trial, so we infer that mealworms prefer dark places. (b) Mark 1: the choice (dark cupboard). Mark 2: the evidence and reason from the results (most moved to the dark side in every trial, so they prefer the dark).' },
      { id: 'ps-033', type: 'mcq', level: 2,
        stem: TXT_HUIMIN + ' Why did Hui Min do the experiment three times (three trials)?',
        figure: FIG_HUIMIN,
        options: ['To make the tray darker', 'To change the number of mealworms', 'To get more reliable results', 'To make the mealworms move faster'],
        answer: 2,
        explain: 'Doing more trials and checking that the results agree makes them more reliable.' },
      { id: 'ps-034', type: 'mcq', level: 2,
        stem: TXT_RAVI + ' Which material is the strongest?',
        figure: FIG_RAVI,
        options: ['K', 'L', 'M', 'They are equally strong'],
        answer: 1,
        explain: 'L held 12 weights before it broke, more than K (5) and M (8), so L is the strongest.' },
      { id: 'ps-035', type: 'oeq', level: 2, marks: 1,
        stem: TXT_RAVI + ' What did Ravi measure?',
        figure: FIG_RAVI,
        model: 'The number of 50 g weights each strip could hold before it broke.',
        keys: [['number of weights', 'number of 50 g weights', 'weights']],
        explain: 'The measured variable is the number of weights the strip held before breaking. This tells us how strong the material is.' },
      { id: 'ps-036', type: 'mcq', level: 2,
        stem: 'Ravi cut strips of materials K, L and M and hung 50 g weights on each strip one by one until it broke. Which variable must Ravi keep the same for strips K, L and M?',
        figure: FIG_RAVI,
        options: ['The type of material', 'The number of weights hung', 'The thickness of the strip', 'Whether the strip broke'],
        answer: 2,
        explain: 'The thickness (and length and width) of the strips must be the same. The type of material is changed and the number of weights is measured.' },
      { id: 'ps-037', type: 'mcq', level: 2,
        stem: TXT_MEILING + ' Which material allows the least light to pass through?',
        figure: TAB_MEILING,
        options: ['Glass', 'Tracing paper', 'Cardboard', 'Clear plastic'],
        answer: 2,
        explain: 'No patch of light was seen with cardboard, so no light passed through it: cardboard is opaque. Tracing paper gave a dim patch, so some light passed through: it is translucent. Glass and clear plastic gave bright patches: they are transparent.' },
      { id: 'ps-038', type: 'oeq', level: 2, marks: 2,
        stem: TXT_MEILING + ' Which material is suitable for making a window that we can see through clearly? Explain using the results.',
        figure: TAB_MEILING,
        model: 'Glass (or clear plastic). It gave a bright patch of light, so it is transparent: it allows most light to pass through.',
        keys: [['glass', 'clear plastic'], ['transparent', 'most light', 'bright']],
        explain: 'Glass and clear plastic both gave a bright patch, so they are transparent: they allow most light to pass through. Either material earns the first mark. For the second, "transparent", "allows most light to pass through" or the bright patch from the results all earn it.' },
      { id: 'ps-075', type: 'mcq', level: 2,
        stem: TXT_MEILING + ' Which material is translucent?',
        figure: TAB_MEILING,
        options: ['Glass', 'Cardboard', 'Clear plastic', 'Tracing paper'],
        answer: 3,
        explain: 'Translucent means it allows some light to pass through. Tracing paper gave a dim patch, so only some light passed through. Glass and clear plastic are transparent (bright patch: most light passes through). Cardboard is opaque (no patch: no light passes through).' },
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
      { id: 'ps-042', type: 'oeq', level: 3, marks: 3,
        stem: TXT_JUNKAI + '\n(a) No water rose up the plastic strip. Why? (1 mark)\n(b) Jun Kai\'s sister said, "Wool absorbs more water than cotton." Do you agree? Explain using the results. (2 marks)',
        figure: FIG_JUNKAI,
        model: '(a) Plastic does not absorb water. It is waterproof. (b) No, I do not agree. The water rose 8 cm up the cotton strip but only 5 cm up the wool strip, so cotton absorbs more water than wool.',
        keys: [['does not absorb', 'not absorbent', 'waterproof', 'cannot absorb'], ['8 cm up the cotton', '8 cm'], ['cotton absorbs more']],
        explain: '(a) Water rises up a strip only if the material absorbs water. Plastic is waterproof, so the water stayed at 0 cm. (b) Mark 1: disagree, with the evidence for BOTH materials (8 cm for cotton, 5 cm for wool). Mark 2: the conclusion that cotton absorbs more water than wool, so the sister is wrong. "No" on its own gets no marks.' },
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
      { id: 'ps-045', type: 'oeq', level: 3, marks: 4,
        stem: 'Siti wanted to find out which fabric is the most waterproof. She stretched pieces of fabric P, Q and R of the same size over three identical beakers. She poured 10 ml of water onto each piece and measured the volume of water that dripped into the beaker after 1 minute. She did the experiment only once.\n(a) Which variable did Siti change? (1 mark)\n(b) Her teacher said that the results may not be reliable. What should Siti do? (1 mark)\n(c) Which fabric is the most suitable for making a tent? Explain using the results. (2 marks)',
        figure: table(['Fabric', 'Volume of water that dripped into the beaker (ml)'], [['P', '9'], ['Q', '0'], ['R', '4']], 'Results'),
        model: '(a) The type of fabric. (b) Repeat the experiment a few more times and compare the results. (c) Fabric Q. No water (0 ml) passed through fabric Q, so it is waterproof and will keep the people inside the tent dry when it rains.',
        keys: [['type of fabric', 'kind of fabric'], ['repeat', 'do it again', 'more times'], ['0 ml', 'no water'], ['waterproof', 'keep the people inside the tent dry']],
        explain: '(a) P, Q and R are different fabrics, so the changed variable is the type of fabric. (b) Repeating the experiment and checking that the results agree makes them more reliable. (c) Mark 1: Fabric Q with the evidence (0 ml dripped through). Mark 2: the reason linked to the use (it is waterproof, so the people inside stay dry).' },

      /* ===== Level 3: exam-hard / experiment ===== */
      { id: 'ps-046', type: 'oeq', level: 2, marks: 2,
        stem: TXT_MARY + ' Based on the results, what can you conclude about the amount of water given and the growth of the plant?',
        figure: FIG_MARY,
        model: 'The more water the plant was given each day, the greater the increase in height of the plant.',
        keys: [['more water'], ['increase in height', 'taller', 'grew more', 'more growth']],
        explain: 'Read the pattern: 20 ml gave 3 cm, 40 ml gave 5 cm, 60 ml gave 8 cm. A good conclusion links both variables: "the more ..., the more ...". It is only true for the amounts tested.' },
      { id: 'ps-047', type: 'mcq', level: 3,
        stem: TXT_MARY + ' Mary wrote the conclusion: "Plants need sunlight to grow." Why is this conclusion NOT supported by her experiment?',
        figure: FIG_MARY,
        options: ['Plant C grew the tallest', 'She did not give plant A enough water to grow well', 'Plants do not need sunlight to grow', 'All three plants got the same sunlight, so sunlight was not tested'],
        answer: 3,
        explain: 'A conclusion must come from what was changed in the experiment. Mary only changed the amount of water, so her results cannot tell us anything about sunlight.' },
      { id: 'ps-048', type: 'oeq', level: 2, marks: 2,
        stem: TXT_ALI + ' Arrange the magnets from the strongest to the weakest. Explain how you know.',
        figure: FIG_ALI,
        model: 'Q, R, P. Q attracted the most paper clips and P attracted the fewest. The more paper clips a magnet attracts, the stronger it is.',
        keys: [['Q, R, P', 'Q R P', 'QRP', 'Q, R and P'], ['most paper clips', 'more paper clips', 'number of paper clips']],
        explain: 'Q has 9 clips, R has 6 and P has 4. A stronger magnet attracts more paper clips.' },
      { id: 'ps-049', type: 'mcq', level: 3,
        stem: TXT_ALI + ' Which change would make Ali\'s experiment NOT a fair test?',
        figure: FIG_ALI,
        options: ['Repeating the experiment three times', 'Using the same box of paper clips for every magnet', 'Using bigger paper clips for magnet Q only', 'Dipping each magnet into the clips for the same length of time'],
        answer: 2,
        explain: 'If magnet Q used bigger clips, both the magnet AND the size of clips would change. Then we could not tell what caused the result.' },
      { id: 'ps-050', type: 'oeq', level: 2, marks: 2,
        stem: TXT_ALI + ' Write a suitable aim for Ali\'s experiment.',
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
        stem: 'Priya\'s friend cut four materials, W, X, Y and Z, into pieces of the same size. She put each piece into a beaker of 100 ml of water for 1 minute, took it out, and measured the volume of water LEFT in the beaker. Which material is the most absorbent?',
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
      { id: 'ps-055', type: 'mcq', level: 2,
        stem: TXT_SITI + ' Siti wants to find out if seeds need water to germinate. Which two dishes should she compare?',
        figure: FIG_SITI,
        options: ['A and B', 'A and C', 'B and C', 'A, B and C'],
        answer: 0,
        explain: 'A and B are both in the dark cupboard; the ONLY difference is dry or moist cotton wool. A and C differ in both water and temperature, so they cannot be compared.' },
      { id: 'ps-056', type: 'oeq', level: 3, marks: 2,
        stem: TXT_SITI + ' Siti wants to find out if seeds need warmth to germinate. Which two dishes should she compare? Explain your answer.',
        figure: FIG_SITI,
        model: 'Dishes B and C. Both have moist cotton wool and both are dark; the only difference is that B is in a warm cupboard and C is in the cold fridge.',
        keys: [['B and C', 'C and B', 'B, C'], ['only difference', 'only the temperature', 'both have moist cotton wool', 'warm', 'cold']],
        explain: 'To test one variable, choose two set-ups that differ in only that variable. B and C differ only in temperature. (Both are dark too: the cupboard is dark and a closed fridge is dark, so light is kept the same.)' },
      { id: 'ps-057', type: 'mcq', level: 3,
        stem: TXT_SITI + ' Why can Siti NOT compare dishes A and C to find out if seeds need water to germinate?',
        figure: FIG_SITI,
        options: ['No seeds germinated in either dish', 'Dish A has fewer seeds than dish C', 'Both the water and the temperature are different', 'The fridge is too small'],
        answer: 2,
        explain: 'A is dry and warm (cupboard); C is moist and cold (fridge). Two variables are different, so it is not a fair comparison. (It is true no seeds germinated in either, but that is not the reason.)' },
      { id: 'ps-058', type: 'oeq', level: 2, marks: 2,
        stem: TXT_SITI + ' Based on the results, what can she conclude about what seeds need to germinate?',
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
        stem: TXT_HUIMIN + ' Why did Hui Min place all the mealworms in the middle of the tray at the start of each trial?',
        figure: FIG_HUIMIN,
        model: 'So that every mealworm was the same distance from the dark side and the bright side, making it a fair test.',
        keys: [['same distance', 'middle', 'equal chance'], ['fair']],
        explain: 'If the mealworms started near the dark side, they might end up there just because it was closer. Starting in the middle makes it fair.' },
      { id: 'ps-061', type: 'mcq', level: 3,
        stem: TXT_HUIMIN + ' In Trial 3, three mealworms stayed on the bright side. Which statement is correct?',
        figure: FIG_HUIMIN,
        options: ['The experiment is wrong and must be thrown away', 'Mealworms prefer bright places', 'Mealworms like the dark and bright sides equally', 'Most mealworms still went to the dark side, so the conclusion stays the same'],
        answer: 3,
        explain: 'Living things do not all behave the same way. Look at the overall pattern across all trials: most mealworms chose the dark side each time.' },
      { id: 'ps-062', type: 'oeq', level: 3, marks: 3,
        stem: 'Hui Min found that mealworms move to dark places. Now she wants to find out if mealworms prefer damp or dry places. She has a tray, some paper towels, water, black paper and 10 mealworms. Describe how she should set up her tray.',
        figure: null,
        model: 'Put damp paper on one half of the tray and dry paper on the other half. Keep both halves the same in light (for example, both covered so both are dark). Place the mealworms in the middle and count how many are on each side after 15 minutes.',
        keys: [['damp', 'wet', 'moist'], ['dry'], ['both dark', 'same light', 'same amount of light', 'both covered']],
        explain: 'Change only ONE variable (damp or dry). Light must now be kept the same on both sides, or the mealworms might move because of the light instead.' },
      { id: 'ps-063', type: 'oeq', level: 3, marks: 3,
        stem: TXT_RAVI + ' Ravi\'s friend said he should use a THICKER strip of material K because K is weak. Do you agree? Explain.',
        figure: FIG_RAVI,
        model: 'No. Then both the type of material and the thickness of the strip would be changed. It would not be a fair test, and Ravi could not tell which variable caused the result.',
        keys: [['no', 'disagree', 'do not agree'], ['thickness', 'two variables', 'both'], ['fair test', 'not fair', 'unfair']],
        explain: 'Only the type of material should be changed. A thicker strip would hold more weights, so the comparison would no longer be fair.' },
      { id: 'ps-064', type: 'mcq', level: 3,
        stem: TXT_SOIL + ' To find out if the type of soil affects the growth of the plant, which two set-ups should she compare?',
        figure: TAB_SOIL,
        options: ['A and B', 'A and C', 'B and C', 'C and D'],
        answer: 0,
        explain: 'A and B have the same amount of water (50 ml) and the same place (near window). Only the type of soil is different. C and D differ in soil AND place.' },
      { id: 'ps-065', type: 'oeq', level: 3, marks: 2,
        stem: TXT_SOIL + ' Which two set-ups should she compare to find out if the amount of water affects the growth of the plant? Explain.',
        figure: TAB_SOIL,
        model: 'A and D. Only the amount of water is different; both have sandy soil and are placed near the window.',
        keys: [['A and D', 'D and A', 'A, D'], ['only the amount of water', 'only', 'same soil', 'same place']],
        explain: 'A (50 ml) and D (100 ml) differ only in water. B and C also differ in water, but C is in a cupboard, so the place is different too.' },
      { id: 'ps-066', type: 'mcq', level: 3,
        stem: TXT_SOIL + ' Why can Priya NOT use set-ups B and C to find out if the amount of water affects plant growth?',
        figure: TAB_SOIL,
        options: ['Both have garden soil', 'B was given less water than C', 'Both the amount of water and the place where they were put are different', 'C was put in a cupboard, so the plant in C will not grow at all'],
        answer: 2,
        explain: 'B is near the window and C is in a cupboard, so the amount of light is also different. Two variables changed, so it is not a fair test.' },
      { id: 'ps-067', type: 'oeq', level: 3, marks: 2,
        stem: 'Mary put three different plants near a window: a rose plant in pot A, a hibiscus in pot B and a bean plant in pot C. She gave them 20 ml, 40 ml and 60 ml of water each day, as shown in the table. After 2 weeks, plant C had grown the most. Can she conclude that more water makes plants grow taller? Explain.',
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
      { id: 'ps-069', type: 'oeq', level: 2, marks: 2,
        stem: 'John tested three magnets, A, B and C. For each magnet, he held the same paper clip to it through sheets of paper, adding one sheet at a time until the clip fell. What can John conclude about the strength of the magnets? Explain.',
        figure: TAB_JOHN,
        model: 'Magnet B is the strongest and magnet A is the weakest, because the clip was still attracted through the most sheets of paper with B and the fewest with A.',
        keys: [['B is the strongest', 'B strongest', 'magnet B'], ['most sheets', 'more sheets', 'number of sheets']],
        explain: 'The stronger the magnet, the more sheets of paper it can attract the clip through. B (14) > C (9) > A (6).' },
      { id: 'ps-070', type: 'mcq', level: 2,
        stem: TXT_JOHN + ' Which is the measured variable?',
        figure: TAB_JOHN,
        options: ['The number of sheets of paper the clip was still attracted through', 'The magnet used', 'The size of the paper clip', 'The type of paper'],
        answer: 0,
        explain: 'John counted sheets of paper. The magnet is the changed variable; the paper clip and type of paper are kept the same.' },
      { id: 'ps-071', type: 'mcq', level: 3,
        stem: TXT_OBJECTS + ' Using the table, which object is NOT attracted by a magnet AND sinks in water?',
        figure: TAB_OBJECTS,
        options: ['Rubber eraser', 'Plastic bottle cap', 'Steel pin', 'Wooden block'],
        answer: 0,
        explain: 'Look for "no" in BOTH columns. Only the rubber eraser is not attracted by a magnet and does not float. The bottle cap and wooden block float; the steel pin is attracted by a magnet.' },
      { id: 'ps-072', type: 'oeq', level: 3, marks: 2,
        stem: TXT_OBJECTS + ' Classify the objects into two groups using ONE characteristic. Name the characteristic and list the objects in each group.',
        figure: TAB_OBJECTS,
        model: 'Attracted by a magnet: steel pin, iron nail. Not attracted by a magnet: plastic bottle cap, wooden block, rubber eraser. (Or: Floats: plastic bottle cap, wooden block. Sinks: steel pin, iron nail, rubber eraser.)',
        keys: [['attracted by a magnet', 'magnet', 'floats', 'float'], ['steel pin, iron nail', 'steel pin and iron nail', 'bottle cap and wooden block', 'bottle cap, wooden block']],
        explain: 'Pick one characteristic. Every object in a group must share it, and every object must go into a group.' },
      { id: 'ps-073', type: 'mcq', level: 2,
        stem: 'Jun Kai hung strips of different materials with their ends dipped in water and measured how high the water rose up each strip. Which variable must he keep the same?',
        figure: FIG_JUNKAI,
        options: ['The material of each strip', 'The height the water rose', 'The length of time each strip was left in the water', 'The material that absorbed the most water'],
        answer: 2,
        explain: 'Every strip must be left in the water for the same time (5 minutes). The material is the changed variable and the height of water is the measured variable.' },
      { id: 'ps-074', type: 'oeq', level: 2, marks: 2,
        stem: TXT_JUNKAI + ' Which strip of material would be best for wiping up spilt water? Give a reason based on the results.',
        figure: FIG_JUNKAI,
        model: 'Paper towel, because the water rose the highest up the paper towel strip, so it absorbs water the best.',
        keys: [['paper towel'], ['rose the highest', 'highest', 'absorbs the most', 'most absorbent']],
        explain: 'One mark for the material, one for the reason taken from the results (12 cm, the highest).' },

      /* ===== Exam-format additions: tick tables, choosing set-ups, procedure order, patterns, graphs, statement combinations ===== */
      { id: 'ps-076', type: 'oeq', level: 2, marks: 3,
        stem: 'Wei Ming wanted to find out which materials float on water. He used blocks of wood, plastic, steel and rubber, all of the same size. He placed each block into the same tank of water and observed whether it floated or sank.\nFor each variable in the table, tick ONE box to show whether it was changed, measured (observed) or kept the same. (3 marks)',
        figure: tickTable(['Material of the block', 'Whether the block floats or sinks', 'Size of the block', 'Amount of water in the tank']),
        model: 'Changed: material of the block. Measured: whether the block floats or sinks. Kept the same: size of the block and amount of water in the tank.',
        keys: [['Changed: material of the block'], ['Measured: whether the block floats or sinks'], ['Kept the same: size of the block and amount of water in the tank']],
        explain: 'One mark for each column. Changed: only the material of the block (wood, plastic, steel, rubber). Measured: what Wei Ming observed, whether each block floats or sinks. Kept the same: BOTH the size of the block and the amount of water in the tank (he used the same tank for every block).' },
      { id: 'ps-077', type: 'oeq', level: 2, marks: 3,
        stem: 'Nadia put three slices of the same type of bread, all the same size, into three plastic bags. She sprinkled 0, 5 and 10 drops of water on the slices, sealed the bags and kept them in the same cupboard. After 5 days she checked how much of each slice was covered with mould.\nFor each variable in the table, tick ONE box: changed, measured or kept the same. (3 marks)',
        figure: tickTable(['Number of drops of water', 'Area of the slice covered with mould', 'Type of bread']),
        model: 'Number of drops of water: changed. Area of the slice covered with mould: measured. Type of bread: kept the same.',
        keys: [['Number of drops of water: changed'], ['Area of the slice covered with mould: measured'], ['Type of bread: kept the same']],
        explain: 'One mark for each correct row. Nadia changed the number of drops of water (0, 5, 10). She measured how much of the slice was covered with mould. The type of bread (and its size and the cupboard) were kept the same, so only the water could cause a difference.' },
      { id: 'ps-078', type: 'oeq', level: 2, marks: 2,
        stem: 'Daniel clamped a strip of material to the edge of a table so that 20 cm of the strip stuck out. He hung a 100 g weight at the end of the strip and measured how far the end moved down. He did this with strips of plastic, wood, steel and rubber of the same length, width and thickness.\nFor each variable in the table, tick ONE box: changed, measured or kept the same. (2 marks)',
        figure: tickTable(['Type of material of the strip', 'Distance the end of the strip moved down', 'Mass of the weight hung', 'Thickness of the strip']),
        model: 'Changed: type of material of the strip. Measured: distance the end of the strip moved down. Kept the same: mass of the weight hung and thickness of the strip.',
        keys: [['Changed: type of material of the strip. Measured: distance the end of the strip moved down'], ['Kept the same: mass of the weight hung and thickness of the strip']],
        explain: 'Mark 1: the changed variable (type of material) AND the measured variable (distance moved down) both ticked correctly. Mark 2: both "kept the same" rows ticked (mass of the weight and thickness of the strip). The further the end moves down, the more the strip bends, so the distance tells Daniel how flexible each material is.' },
      { id: 'ps-079', type: 'oeq', level: 3, marks: 4,
        stem: 'Kim wanted to find out if temperature affects how fast mould grows on bread. She prepared five set-ups, A to E, as shown in the table. Every slice of bread was the same size and was sealed in a plastic bag. The cupboard and the fridge were both dark.\n(a) Which two set-ups should Kim compare? (1 mark)\n(b) What should Kim observe or measure in each set-up to find out how fast mould grows? (1 mark)\n(c) After 5 days, the bread kept in the cupboard was mostly covered with mould, but the bread kept in the fridge had only a few tiny spots of mould. Kim said, "Mould grows faster in a warm place." Do you agree? Explain using the results. (2 marks)',
        figure: table(['Set-up', 'Type of bread', 'Water sprinkled on bread', 'Where kept'],
          [['A', 'white', '5 drops', 'cupboard (warm)'], ['B', 'white', 'none', 'cupboard (warm)'], ['C', 'white', '5 drops', 'fridge (cold)'],
           ['D', 'wholemeal', '5 drops', 'fridge (cold)'], ['E', 'wholemeal', 'none', 'cupboard (warm)']]),
        model: '(a) Set-ups A and C. (b) The area of the bread covered with mould after 5 days. (c) Yes, I agree. The bread in the warm cupboard was mostly covered with mould but the bread in the cold fridge had only a few tiny spots, so mould grows faster when it is warm; the cold slows down the growth of mould.',
        keys: [['A and C', 'C and A'], ['area of the bread covered with mould', 'amount of mould', 'how much mould'], ['mostly covered with mould but', 'only a few tiny spots'], ['grows faster when it is warm', 'cold slows down']],
        explain: '(a) A and C are the same (white bread, 5 drops of water) except for the temperature (cupboard or fridge). D and E differ in water AND place; B and C differ in water AND place. (b) Measure how much of the bread is covered with mould. (c) Mark 1: agree, with the results for BOTH places (warm: mostly covered; cold: a few tiny spots). Mark 2: the reason (mould grows faster when warm / the cold slows it down).' },
      { id: 'ps-080', type: 'oeq', level: 3, marks: 4,
        stem: 'Gopal set up four dishes, P, Q, R and S, as shown in the table. Each dish had 10 seeds on cotton wool. The cupboard and the fridge were both dark.\n(a) Gopal wants to find out if seeds need warmth to germinate. Which two dishes should he compare? (1 mark)\n(b) What should Gopal count after 5 days to get his results? (1 mark)\n(c) Gopal used dish Q to find out if seeds need water to germinate. Which dish is the control set-up for dish Q? Explain your choice. (2 marks)',
        figure: table(['Dish', 'Type of seed', 'Cotton wool', 'Where kept'],
          [['P', 'green bean', 'moist', 'cupboard (warm)'], ['Q', 'green bean', 'dry', 'cupboard (warm)'],
           ['R', 'red bean', 'moist', 'fridge (cold)'], ['S', 'green bean', 'moist', 'fridge (cold)']]),
        model: '(a) Dishes P and S. (b) The number of seeds that germinated in each dish. (c) Dish P. It is the same as dish Q (same type of seed, same warm cupboard) except that its cotton wool is moist, so the only difference is water.',
        keys: [['P and S', 'S and P'], ['number of seeds that germinated', 'number of seeds germinated'], ['Dish P'], ['only difference is water', 'same as dish Q', 'except']],
        explain: '(a) P and S are both green beans on moist cotton wool; the only difference is warm cupboard or cold fridge. R cannot be used: it has a different type of seed. (b) Count how many seeds germinated. (c) Mark 1: Dish P. Mark 2: the reason: P is the same as Q in every way except the variable being tested (water). S is not the control for Q, because S is also in the fridge, so two things would be different.' },
      { id: 'ps-081', type: 'mcq', level: 2,
        stem: 'Farah wants to make an iron nail into a magnet by the stroke method and then test it. Her steps are shown below, but they are not in order.\nP: Stroke the iron nail 20 times with the N pole of a bar magnet, from one end to the other, in the same direction each time.\nQ: Bring the nail near a dish of steel pins and count the pins it attracts.\nR: Bring the iron nail near the steel pins first, to check that it attracts none.\nWhich is the correct order of the steps?',
        figure: null,
        options: ['P, Q, R', 'R, P, Q', 'P, R, Q', 'Q, R, P'],
        answer: 1,
        explain: 'First check that the nail is not already a magnet (R). If it already attracted pins, Farah could not tell whether her stroking had made it a magnet. Then stroke it (P), and last, test it by counting the pins it attracts (Q).' },
      { id: 'ps-082', type: 'oeq', level: 3, marks: 4,
        stem: 'Mr Lim wants to choose a cloth for a mop head. He tested two cloths, F and G, to find out which one absorbs more water. His steps are below, but they are not in order.\nW: Squeeze the water out of the cloth into a measuring cylinder and read the volume.\nX: Cut cloths F and G into pieces of the same size.\nY: Write the volume in a table, then do the same steps with the other cloth.\nZ: Soak one piece of cloth in 100 ml of water for 1 minute.\n(a) Write the letters W, X, Y and Z in the correct order. (1 mark)\n(b) Why must both pieces of cloth be the same size? (1 mark)\n(c) Mr Lim squeezed 30 ml of water out of cloth F and 12 ml out of cloth G. Which cloth should he use for the mop head? Explain. (2 marks)',
        figure: null,
        model: '(a) X, Z, W, Y. (b) To make it a fair test. A bigger piece can absorb more water, so only the type of cloth should be changed. (c) Cloth F. 30 ml of water was squeezed out of F but only 12 ml out of G, so F absorbs more water and the mop will soak up more spilt water.',
        keys: [['X, Z, W, Y', 'XZWY', 'X Z W Y'], ['fair test', 'fair'], ['30 ml', 'only 12 ml out of G'], ['absorbs more water', 'soak up more']],
        explain: '(a) Cut the pieces first (X), soak (Z), squeeze and measure (W), then record and repeat with the other cloth (Y). (b) A fair test changes only the type of cloth; size must stay the same. (c) Mark 1: Cloth F with the evidence for BOTH cloths (30 ml and 12 ml). Mark 2: the reason linked to the use (F absorbs more water, so the mop soaks up more spills).' },
      { id: 'ps-083', type: 'oeq', level: 2, marks: 3,
        stem: 'Kumar stroked an iron nail with a bar magnet. After every 10 strokes, he counted the steel pins the nail could attract. He forgot to write down one result.\n(a) Suggest the missing number of pins. (1 mark)\n(b) Describe the relationship between the number of strokes and the number of pins attracted. (1 mark)\n(c) What do the results tell Kumar about the nail as the number of strokes increased? (1 mark)',
        figure: table(['Number of strokes', 'Number of pins attracted'], [['10', '3'], ['20', '6'], ['30', '?'], ['40', '12']], 'Results'),
        model: '(a) 9 pins. (b) As the number of strokes increased, the number of pins attracted increased. (c) The nail became a stronger magnet.',
        keys: [['9'], ['as the number of strokes increased', 'more strokes'], ['stronger magnet', 'stronger']],
        explain: '(a) The number of pins goes up by 3 for every 10 strokes: 3, 6, 9, 12. (b) Link BOTH variables: "As the number of strokes increased, the number of pins attracted increased." (c) A magnet that attracts more pins is stronger, so the nail became a stronger magnet with more strokes.' },
      { id: 'ps-084', type: 'mcq', level: 3,
        stem: 'Aisha dipped the end of a strip of paper towel into water. Every minute, she measured how high the water had risen up the strip. One of her results was smudged. Which is the most likely height of the water at 4 minutes?',
        figure: table(['Time (min)', 'Height of water up the strip (cm)'], [['1', '4'], ['2', '7'], ['3', '9'], ['4', '?'], ['5', '11'], ['6', '11']], 'Results'),
        options: ['8 cm', '12 cm', '13 cm', '10 cm'],
        answer: 3,
        explain: 'The water kept rising until it stopped at 11 cm. So at 4 minutes it must be higher than 9 cm (at 3 minutes) and not higher than 11 cm (at 5 minutes). Only 10 cm fits. 8 cm would mean the water went DOWN, and 12 or 13 cm is higher than the final height.' },
      { id: 'ps-085', type: 'mcq', level: 3,
        stem: 'Wen Hui measured the length of the young of a beetle every 5 days, starting on the day it hatched from its egg. The young went through the larva and pupa stages. Her results are shown in the graph.\nA: The young grew longer from Day 0 to Day 20.\nB: The young was most likely a pupa from Day 20 to Day 35.\nC: The graph shows that the egg stage lasted 20 days.\nWhich of the statements are correct?',
        figure: FIG_BEETLE_GRAPH,
        options: ['A and B only', 'A and C only', 'B and C only', 'A, B and C'],
        answer: 0,
        explain: 'A is correct: the line goes up from Day 0 to Day 20, so the larva grew. B is correct: the line is flat from Day 20 to Day 35, so the length did not change. A pupa does not feed or grow, so this is most likely the pupa stage. C is wrong: the graph starts on the day the young HATCHED, so the egg stage is not shown at all.' },
      { id: 'ps-086', type: 'oeq', level: 3, marks: 3,
        stem: 'Mira placed 20 bean seeds on moist cotton wool in a warm place. Every 2 days she counted the total number of seeds that had germinated so far. Her results are shown in the line graph.\n(a) Between which two days did the first seeds germinate? (1 mark)\n(b) After which day did no more seeds germinate? (1 mark)\n(c) By the end, 2 of the 20 seeds had still not germinated, even though they got the same water and warmth as the others. Suggest a reason why. (1 mark)',
        figure: FIG_GERM_GRAPH,
        model: '(a) Between Day 2 and Day 4. (b) After Day 8. (c) The 2 seeds may be dead or damaged.',
        keys: [['Day 2 and Day 4', '2 and 4'], ['Day 8'], ['dead', 'damaged', 'not alive']],
        explain: '(a) The total was 0 on Day 2 and 6 on Day 4, so the first seeds germinated between Day 2 and Day 4. (b) The line is flat at 18 from Day 8 onwards, so no more seeds germinated after Day 8. (c) The seeds got water and warmth like the others, so the problem is the seeds themselves: they may be dead or damaged. (The flat part from Day 0 to Day 2 is before ANY seed germinated, which is why (b) asks "after which day".)' },
      { id: 'ps-087', type: 'mcq', level: 2,
        stem: 'Kumar wants to find out if the number of times an iron nail is stroked with a magnet affects how strong a magnet the nail becomes. Which of these must he keep the same?\nA: The size of the iron nail\nB: The number of strokes\nC: The magnet used for stroking',
        figure: null,
        options: ['A and B only', 'A and C only', 'B and C only', 'A, B and C'],
        answer: 1,
        explain: 'The number of strokes (B) is the variable Kumar changes, so it must NOT be kept the same. The size of the nail (A) and the magnet used for stroking (C) must be kept the same, so that only the number of strokes can cause a difference in strength.' },
      { id: 'ps-088', type: 'mcq', level: 3,
        stem: TXT_RAVI + ' Based on his results, which statements are correct?\nA: A rope made of material K would be the best for lifting a heavy bucket.\nB: Material L is the strongest of the three materials.\nC: Material M is stronger than material K.',
        figure: FIG_RAVI,
        options: ['A and B only', 'A and C only', 'B and C only', 'A, B and C'],
        answer: 2,
        explain: 'B is correct: L held the most weights (12). C is correct: M held 8 weights and K held only 5. A is wrong: K broke with the fewest weights (5), so it is the WEAKEST; a rope for a heavy bucket should be made of the strongest material, L.' },
      { id: 'ps-089', type: 'mcq', level: 2,
        stem: 'Ben wants to find out if seeds need water to germinate. He put 1 green bean seed on moist cotton wool in one dish and 1 green bean seed on dry cotton wool in another dish. Both dishes were in the same warm cupboard. Which of these changes would make his results more reliable?\nA: Use 10 seeds in each dish instead of 1 seed.\nB: Repeat the whole experiment two more times.\nC: Put the dish with the dry cotton wool in the fridge.',
        figure: null,
        options: ['A and B only', 'A and C only', 'B and C only', 'A, B and C'],
        answer: 0,
        explain: 'Using more seeds (A) and repeating the experiment (B) both give more reliable results, because one seed might not germinate by chance. C is wrong: putting one dish in the fridge changes a second variable (temperature), so the test would no longer be fair.' },
      { id: 'ps-090', type: 'mcq', level: 3,
        stem: TXT_JUNKAI + ' Which statements about his results are correct?\nA: Wool absorbed more water than cotton.\nB: Plastic does not absorb water, so it is suitable for making a raincoat.\nC: Paper towel is the most absorbent of the four materials.',
        figure: FIG_JUNKAI,
        options: ['A and B only', 'A and C only', 'B and C only', 'A, B and C'],
        answer: 2,
        explain: 'A is wrong: the water rose 8 cm up the cotton but only 5 cm up the wool, so cotton absorbed more. B is correct: no water rose up the plastic (0 cm), so it is waterproof and keeps the wearer dry. C is correct: the water rose highest up the paper towel (12 cm).' },
      { id: 'ps-091', type: 'mcq', level: 2,
        stem: 'Lily brought a magnet near four objects. Her results are shown in the table. Which statements are correct?\nA: Iron and steel are magnetic materials.\nB: Not all metals are attracted by a magnet.\nC: Copper is a non-magnetic material.',
        figure: table(['Object', 'Material', 'Attracted by the magnet?'], [['nail', 'iron', 'yes'], ['drink can', 'aluminium', 'no'], ['paper clip', 'steel', 'yes'], ['wire', 'copper', 'no']], 'Results'),
        options: ['A and B only', 'A and C only', 'B and C only', 'A, B and C'],
        answer: 3,
        explain: 'All three are correct. A: the iron nail and steel clip were attracted. B: aluminium and copper are metals, but they were not attracted, so not all metals are magnetic. C: the copper wire was not attracted, so copper is a non-magnetic material.' }
    ]
  });
})();
