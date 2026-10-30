"use strict";
// Science Quest — topic: Cycles in water (P5, Cycles). Data only; the helpers below just build SVG/HTML strings.
// Scope per MOE Primary Science Syllabus 2023, theme Cycles, "Cycles in Matter and Water (Water)" (P5),
// examined at PSLE 0009 from 2026. Sources checked 2026-10-30:
//   - MOE Primary Science Syllabus 2023 (structure: Cycles in Matter and Water (Water) at P5)
//     https://www.moe.gov.sg/-/media/files/primary/syllabus/2023-primary-science.pdf (did not load in full on the day)
//   - Shuqun Pri, P5 Science Handbook (CPDD 2023 framework): water exists in three interchangeable states
//     https://www.shuqunpri.moe.edu.sg/files/P5_Science_Handbook.pdf
//   - First Toa Payoh Pri, 2023 P5 Science assessment plan: water and changes of state at P5
//     https://www.firsttoapayohpri.moe.edu.sg/files/Parents'%20Corner/Holistic%20Assessment%20Plans/2023/P5/Standard%20Subjects/2023_P5_ASSESSMENT%20PLAN_FOR_SCIENCE%20(STANDARD).pdf
//   - Admiralty Pri, P5 Science site: "Water and changes of states"  https://sites.google.com/moe.edu.sg/admps-science/primary-5
//   - Syllabus summaries (secondary): melting point of ice 0 °C, boiling point of water 100 °C; factors that
//     affect the rate of evaporation; roles of evaporation and condensation in the water cycle.
//   The P4 'matter' lane (matter.js) covers states of matter, mass and volume and leaves every change of
//   state to this file; heat.js leaves melting and boiling points to this file too.
// In scope here: water as solid (ice), liquid (water) and gas (water vapour); melting, freezing,
//   evaporation, boiling and condensation, with heat gained or lost; melting point 0 °C, boiling point
//   100 °C, temperature stays the same while ice melts or water boils; mass stays the same when water
//   changes state; evaporation vs boiling; factors affecting the rate of evaporation (temperature of the
//   surroundings, wind, exposed surface area, amount of water vapour in the air) as fair tests;
//   condensation on cold surfaces; visible "steam" is tiny water droplets; the water cycle; why water
//   is important; saving water.
// Deliberately LEFT OUT (unsure at P5 level): water pollution (not found in the sources checked),
//   sublimation, pressure and boiling point, particle models, transpiration as a named process,
//   Singapore's four national taps as examinable facts, the word "humidity" in marking keys.
(function () {
  const INK = '#1f2937', LINE = '#475569', BLUE = '#2563eb', WATER = '#bfdbfe', GLASS = '#64748b';

  const svg = (w, h, label, inner) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="100%" style="max-width:${w}px;display:block;margin:0 auto" role="img" aria-label="${label}">` +
    `<rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="10" fill="#ffffff" stroke="#cbd5e1"/>${inner}</svg>`;

  const txt = (x, y, s, o = {}) =>
    `<text x="${x}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="${o.size || 15}" font-weight="${o.bold ? 700 : 400}" fill="${o.fill || INK}" text-anchor="${o.anchor || 'middle'}" dominant-baseline="middle">${s}</text>`;

  const arrow = (x1, y1, x2, y2, o = {}) => {
    const a = Math.atan2(y2 - y1, x2 - x1), L = 11, W = 6;
    const bx = x2 - L * Math.cos(a), by = y2 - L * Math.sin(a);
    const px = W * Math.sin(a), py = -W * Math.cos(a);
    const c = o.colour || INK;
    return `<line x1="${x1}" y1="${y1}" x2="${bx.toFixed(1)}" y2="${by.toFixed(1)}" stroke="${c}" stroke-width="${o.width || 3}"${o.dash ? ' stroke-dasharray="6 4"' : ''}/>` +
      `<polygon points="${x2},${y2} ${(bx + px).toFixed(1)},${(by + py).toFixed(1)} ${(bx - px).toFixed(1)},${(by - py).toFixed(1)}" fill="${c}"/>`;
  };

  const lead = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${LINE}" stroke-width="1.5"/>`;

  const TH = 'border:1px solid #94a3b8;padding:6px 10px;background:#e2e8f0;color:#111827';
  const TD = 'border:1px solid #94a3b8;padding:6px 10px;text-align:center';
  const table = (head, rows, caption) =>
    `<table style="border-collapse:collapse;margin:0 auto;font-size:15px">` +
    (caption ? `<caption style="padding:4px 0 6px;font-weight:600">${caption}</caption>` : '') +
    `<thead><tr>${head.map((h) => `<th style="${TH}">${h}</th>`).join('')}</tr></thead>` +
    `<tbody>${rows.map((r) => `<tr>${r.map((c) => `<td style="${TD}">${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;

  // Line graph with a y-axis that may start below zero.
  const graph = (pts, xmax, xstep, ymin, ymax, ystep, xLabel, yLabel, label) => {
    const w = 360, h = 280, x0 = 62, y0 = 220, x1 = 340, top = 24;
    const X = (v) => x0 + (v / xmax) * (x1 - x0), Y = (v) => y0 - ((v - ymin) / (ymax - ymin)) * (y0 - top);
    let s = '';
    for (let v = ymin; v <= ymax; v += ystep) s += `<line x1="${x0}" y1="${Y(v)}" x2="${x1}" y2="${Y(v)}" stroke="${v === 0 ? '#94a3b8' : '#e5e7eb'}"/>` + txt(x0 - 8, Y(v), v, { anchor: 'end', size: 13 });
    for (let v = 0; v <= xmax; v += xstep) s += `<line x1="${X(v)}" y1="${top}" x2="${X(v)}" y2="${y0}" stroke="#e5e7eb"/>` + txt(X(v), y0 + 15, v, { size: 13 });
    s += `<line x1="${x0}" y1="${top - 4}" x2="${x0}" y2="${y0}" stroke="${INK}" stroke-width="2"/><line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y0}" stroke="${INK}" stroke-width="2"/>`;
    s += `<polyline points="${pts.map(([a, b]) => `${X(a)},${Y(b)}`).join(' ')}" fill="none" stroke="${BLUE}" stroke-width="2.5"/>`;
    pts.forEach(([a, b]) => { s += `<circle cx="${X(a)}" cy="${Y(b)}" r="4" fill="${BLUE}"/>`; });
    s += txt((x0 + x1) / 2, y0 + 40, xLabel, { size: 13 });
    s += `<text x="18" y="${(top + y0) / 2}" font-family="Arial, Helvetica, sans-serif" font-size="13" fill="${INK}" text-anchor="middle" transform="rotate(-90 18 ${(top + y0) / 2})">${yLabel}</text>`;
    return svg(w, h, label, s);
  };

  // ---------- Figures ----------
  // Heating ice until the water boils.
  const GRAPH_HEAT = graph([[0, -10], [2, 0], [6, 0], [10, 100], [14, 100]], 16, 2, -20, 120, 20,
    'Time (min)', 'Temperature (°C)', 'Line graph: temperature of ice being heated; -10 °C at 0 min, 0 °C from 2 to 6 min, rising to 100 °C at 10 min, 100 °C until 14 min');

  // Three states with four arrows P, Q, R, S.
  const FIG_STATES = (() => {
    const box = (x, y, l1, l2) => `<rect x="${x}" y="${y}" width="110" height="48" rx="8" fill="#eff6ff" stroke="${BLUE}" stroke-width="1.5"/>` +
      txt(x + 55, y + 16, l1, { size: 15, bold: 1 }) + txt(x + 55, y + 34, l2, { size: 13 });
    let s = box(10, 142, 'solid', '(ice)') + box(125, 18, 'liquid', '(water)') + box(240, 142, 'gas', '(water vapour)');
    s += arrow(55, 138, 130, 70) + txt(74, 92, 'P', { bold: 1, size: 17 });
    s += arrow(150, 74, 78, 140) + txt(132, 122, 'Q', { bold: 1, size: 17 });
    s += arrow(230, 70, 305, 138) + txt(288, 92, 'R', { bold: 1, size: 17 });
    s += arrow(282, 140, 210, 74) + txt(228, 122, 'S', { bold: 1, size: 17 });
    return svg(360, 200, 'Solid, liquid and gas boxes. P: solid to liquid. Q: liquid to solid. R: liquid to gas. S: gas to liquid', s);
  })();

  // Glass of ice water with droplets on the outside.
  const FIG_GLASS = (() => {
    let s = `<polygon points="110,40 210,40 200,190 120,190" fill="#f8fafc" stroke="${GLASS}" stroke-width="2.5"/>`;
    s += `<polygon points="112,70 208,70 200,188 120,188" fill="${WATER}"/>`;
    s += `<rect x="128" y="62" width="26" height="24" rx="3" fill="#e0f2fe" stroke="#7dd3fc"/><rect x="164" y="78" width="26" height="24" rx="3" fill="#e0f2fe" stroke="#7dd3fc"/>`;
    [[106, 80], [104, 110], [110, 140], [112, 168], [214, 76], [212, 104], [208, 132], [205, 160]].forEach(([x, y]) => {
      s += `<ellipse cx="${x}" cy="${y}" rx="4" ry="5.5" fill="${BLUE}" opacity="0.8"/>`;
    });
    s += lead(214, 104, 252, 92) + txt(256, 84, 'water', { size: 13, anchor: 'start' }) + txt(256, 100, 'droplets', { size: 13, anchor: 'start' });
    s += lead(141, 74, 70, 50) + txt(64, 42, 'ice', { size: 13, anchor: 'end' });
    s += txt(160, 206, 'glass of ice water', { size: 13 });
    return svg(320, 220, 'A glass of ice water with water droplets on the outside of the glass', s);
  })();

  // Kettle: clear gap X just above the spout, white mist Y further away.
  const FIG_KETTLE = (() => {
    let s = `<rect x="40" y="110" width="130" height="90" rx="20" fill="#cbd5e1" stroke="${INK}" stroke-width="1.5"/>`;
    s += `<path d="M60 110 Q 105 60 150 110" fill="none" stroke="${INK}" stroke-width="5"/>`;
    s += `<polygon points="168,150 214,104 222,112 170,168" fill="#cbd5e1" stroke="${INK}" stroke-width="1.5"/>`;
    s += `<rect x="30" y="200" width="150" height="8" fill="#9ca3af"/>`;
    s += `<ellipse cx="236" cy="92" rx="16" ry="12" fill="none" stroke="${LINE}" stroke-dasharray="4 3"/>`;
    [[270, 66, 14], [290, 56, 16], [312, 48, 15], [300, 72, 13], [324, 64, 12]].forEach(([x, y, r]) => {
      s += `<circle cx="${x}" cy="${y}" r="${r}" fill="#e5e7eb" stroke="#9ca3af"/>`;
    });
    s += lead(232, 104, 214, 140) + txt(212, 152, 'X', { bold: 1, size: 17 });
    s += lead(300, 86, 300, 120) + txt(300, 134, 'Y', { bold: 1, size: 17 });
    s += txt(286, 168, 'X looks clear.', { size: 13 }) + txt(286, 186, 'Y looks like white mist.', { size: 13 });
    return svg(360, 220, 'A kettle of boiling water. Just above the spout, X looks clear. Further away, Y looks like white mist', s);
  })();

  // Beaker of hot water covered by a glass plate with ice cubes on top.
  const FIG_HOTPLATE = (() => {
    let s = `<rect x="90" y="84" width="120" height="120" fill="#f8fafc" stroke="${GLASS}" stroke-width="2.5"/>`;
    s += `<rect x="92" y="130" width="116" height="72" fill="${WATER}"/>`;
    s += `<rect x="72" y="76" width="156" height="8" fill="#e2e8f0" stroke="${GLASS}"/>`;
    s += `<rect x="108" y="52" width="24" height="24" rx="3" fill="#e0f2fe" stroke="#7dd3fc"/><rect x="152" y="52" width="24" height="24" rx="3" fill="#e0f2fe" stroke="#7dd3fc"/>`;
    [104, 122, 140, 158, 176, 194].forEach((x) => { s += `<ellipse cx="${x}" cy="90" rx="3.5" ry="4.5" fill="${BLUE}" opacity="0.8"/>`; });
    s += lead(132, 60, 250, 40) + txt(254, 40, 'ice cubes', { size: 13, anchor: 'start' });
    s += lead(228, 80, 250, 70) + txt(254, 70, 'glass plate', { size: 13, anchor: 'start' });
    s += lead(194, 92, 250, 100) + txt(254, 100, 'water', { size: 13, anchor: 'start' }) + txt(254, 116, 'droplets', { size: 13, anchor: 'start' });
    s += txt(150, 168, 'hot water', { size: 14 });
    return svg(340, 220, 'A beaker of hot water covered with a glass plate with ice cubes on it; water droplets form under the plate', s);
  })();

  // The water cycle with four lettered arrows.
  const FIG_CYCLE = (() => {
    let s = `<circle cx="44" cy="42" r="22" fill="#fde047" stroke="#ca8a04"/>` + txt(44, 78, 'Sun', { size: 13 });
    s += `<rect x="8" y="196" width="210" height="48" fill="#93c5fd"/>` + txt(60, 226, 'sea', { size: 14 });
    s += `<polygon points="200,246 290,120 352,140 352,246" fill="#bbf7d0" stroke="#16a34a"/>`;
    [[236, 44, 20], [260, 34, 24], [288, 42, 20], [256, 54, 18]].forEach(([x, y, r]) => { s += `<circle cx="${x}" cy="${y}" r="${r}" fill="#e5e7eb" stroke="#9ca3af"/>`; });
    s += txt(262, 46, 'cloud', { size: 13 });
    s += arrow(100, 190, 100, 110) + txt(116, 150, 'A', { bold: 1, size: 17 });
    s += arrow(112, 100, 210, 58) + txt(150, 66, 'B', { bold: 1, size: 17 });
    for (let k = 0; k < 4; k++) s += `<line x1="${244 + k * 14}" y1="${84}" x2="${238 + k * 14}" y2="${110}" stroke="${BLUE}" stroke-width="2" stroke-dasharray="4 3"/>`;
    s += arrow(262, 112, 256, 140, { colour: BLUE, width: 2 }) + txt(228, 126, 'C', { bold: 1, size: 17 });
    s += `<path d="M296 136 Q 270 180 226 206" fill="none" stroke="${BLUE}" stroke-width="5"/>`;
    s += arrow(236, 200, 216, 212, { colour: BLUE, width: 2 }) + txt(276, 190, 'D', { bold: 1, size: 17 });
    s += txt(320, 226, 'land', { size: 13 });
    return svg(360, 250, 'The water cycle: A rises from the sea, B goes up into the cloud, C falls from the cloud onto land, D is a river flowing back to the sea', s);
  })();

  const TBL_AREA = table(['Container', 'Exposed surface area (cm²)', 'Volume of water left after 3 days (mL)'],
    [['A', '20', '92'], ['B', '50', '80'], ['C', '100', '60']], 'Each container started with 100 mL of water');

  const TBL_SETUPS = table(['Set-up', 'Container', 'Place', 'Fan'], [
    ['A', 'narrow cup', 'in the sun', 'on'],
    ['B', 'wide dish', 'in the sun', 'on'],
    ['C', 'wide dish', 'in the shade', 'off'],
    ['D', 'narrow cup', 'in the shade', 'off']], 'Each container starts with 50 mL of water');

  const TBL_FREEZE = table(['Time (min)', '0', '5', '10', '15', '20', '25'],
    [['Temperature (°C)', '20', '10', '0', '0', '0', '-5']], 'Water in a freezer');

  const TBL_COVER = table(['Dish', 'Covered?', 'Volume at the start (mL)', 'Volume after 3 days (mL)'],
    [['P', 'no', '100', '60'], ['Q', 'yes, with a lid', '100', '98']]);

  SCI.registerTopic({
    id: 'water-cycle',
    title: 'Water and Its Changes',
    emoji: '💧',
    theme: 'Cycles',
    level: 'P5',
    moeRef: 'Cycles in Matter and Water (Water) (P5), MOE Primary Science Syllabus 2023: recognise that water can exist in three interchangeable states; show an understanding that water changes state (melting, freezing, evaporation, boiling, condensation) when it gains or loses heat; recognise the melting point of ice (0 °C) and boiling point of water (100 °C); differentiate between evaporation and boiling; investigate the factors that affect the rate of evaporation; describe the roles of evaporation and condensation in the water cycle; recognise the importance of water and show concern for water as a limited resource. Scope checked against school briefings (Shuqun Pri P5 Science Handbook; First Toa Payoh Pri 2023 P5 assessment plan; Admiralty Pri P5 Science site).',
    skills: {
      states: 'Water in three states',
      changes: 'Changes of state',
      evaporation: 'Rate of evaporation',
      condensation: 'Condensation',
      watercycle: 'The water cycle',
      care: 'Saving water'
    },
    misconceptions: {
      'state-mixup': 'Mixing up which form of water is a solid, a liquid or a gas, such as calling mist or rain a gas.',
      'state-name-mixup': 'Mixing up the names of the changes of state, such as condensation and evaporation, or melting and freezing.',
      'heat-direction': 'Thinking water loses heat when it melts or evaporates, or gains heat when it freezes or condenses.',
      'mp-bp-mixup': 'Mixing up the melting point of ice (0 °C) and the boiling point of water (100 °C).',
      'temp-rises-during-change': 'Thinking the temperature keeps rising while ice melts or water boils.',
      'evap-needs-boil': 'Thinking water must be heated to 100 °C before it can evaporate.',
      'boil-evap-same': 'Thinking boiling and evaporation are the same, or both happen only at 100 °C.',
      'water-disappears': 'Thinking water that evaporates is destroyed or lost from the Earth.',
      'mass-changes-state': 'Thinking the mass of water changes when it changes state.',
      'surface-area-mixup': 'Thinking a smaller exposed surface area makes water evaporate faster.',
      'wind-no-effect': 'Thinking wind does not affect how fast water evaporates.',
      'temp-evap-mixup': 'Thinking water evaporates more slowly in warmer surroundings.',
      'still-humid-faster': 'Thinking water evaporates faster in still, damp or closed-in air.',
      'evap-all-or-nothing': 'Thinking evaporation either happens or stops completely, rather than going faster or slower.',
      'steam-visible': 'Thinking the white mist or "steam" we see is water vapour, which is really invisible.',
      'condensation-from-glass': 'Thinking droplets on a cold surface came from liquid water passing through or splashing, not from water vapour in the air.',
      'cold-transfer': 'Thinking "coldness" moves out of a cold object, instead of heat moving into it.',
      'clouds-vapour': 'Thinking clouds are made of water vapour rather than tiny water droplets.',
      'cycle-step-mixup': 'Mixing up the steps of the water cycle.',
      'water-unlimited': 'Thinking clean water is unlimited, so saving water does not matter.',
      'changed-measured-mixup': 'Mixing up the variable that is changed, the variable that is measured and the variables kept the same.',
      'graph-misread': 'Reading the wrong part of a graph or table, or drawing a conclusion the results do not show.'
    },
    notes: [
      { title: 'Three states of water',
        body: 'Solid: ice. Liquid: water. Gas: water vapour.\nWater vapour is invisible. The white mist above a kettle and the clouds in the sky are tiny droplets of LIQUID water.' },
      { title: 'Gaining heat',
        body: 'Melting: solid -> liquid (ice melts at 0 °C).\nEvaporation: liquid -> gas, at any temperature, only at the surface, slowly.\nBoiling: liquid -> gas at 100 °C, all through the water, quickly, with bubbles.' },
      { title: 'Losing heat',
        body: 'Freezing: liquid -> solid (water freezes at 0 °C).\nCondensation: gas -> liquid. Water vapour loses heat to a cooler surface and condenses into water droplets.' },
      { title: 'Flat parts of a graph',
        body: 'While ice is melting, the temperature stays at 0 °C. While water is boiling, it stays at 100 °C. The heat gained is used to change the state, not to raise the temperature.\nThe mass of the water stays the same when it changes state.' },
      { title: 'Faster evaporation',
        body: 'Water evaporates faster when:\n- the surroundings are warmer\n- there is wind (moving air)\n- the exposed surface area is larger\n- the air around has less water vapour in it (drier air).\nFair test: change ONE factor, measure the water left or the time taken, keep everything else the same.' },
      { title: 'Droplets on cold things',
        body: 'Droplets outside a glass of ice water come from water vapour in the surrounding air, not from inside the glass. The water vapour loses heat to the cold glass and condenses. So the glass gets heavier.' },
      { title: 'The water cycle',
        body: 'The Sun heats water in seas, rivers and reservoirs, and it evaporates. Water vapour rises, loses heat and condenses into tiny droplets that form clouds. Droplets join into bigger, heavier drops that fall as rain. Rain flows into rivers, reservoirs and the sea, and the cycle goes on. No water is lost: it just changes state and moves.' },
      { title: 'Water matters',
        body: 'All living things need water. People and animals drink it. Plants need it to make food. Many animals live in water.\nSingapore has little land to collect and store rainwater, so we must save water: turn off the tap while brushing teeth, take shorter showers, wash a full load, reuse water from rinsing vegetables to water plants.' }
    ],
    items: [
      // ----- Three states -----
      { id: 'wat-001', type: 'mcq', level: 1, syl: 'P5', skill: 'states',
        stem: "Which of these is water in the gas state?",
        figure: null,
        options: ["Ice", "Mist", "Water vapour", "Rain"],
        answer: 2,
        miscon: { 0: 'state-mixup', 1: 'steam-visible', 3: 'state-mixup' },
        optionFeedback: {
          0: "Ice keeps its own shape: it is the solid state.",
          1: "Mist is made of tiny droplets you can see. Water as a gas cannot be seen.",
          3: "Rain is falling drops of liquid water." },
        explain: "Water vapour is water in the gas state. It is invisible." },
      { id: 'wat-002', type: 'mcq', level: 1, syl: 'P5', skill: 'changes',
        stem: "What is the change from liquid water to ice called?",
        figure: null,
        options: ["Freezing", "Melting", "Condensation", "Boiling"],
        answer: 0,
        miscon: { 1: 'state-name-mixup', 2: 'state-name-mixup', 3: 'state-name-mixup' },
        optionFeedback: {
          1: "Melting goes the other way: ice to water.",
          2: "Condensation turns water vapour into water.",
          3: "Boiling turns water into water vapour." },
        explain: "Freezing is the change from liquid to solid. Water freezes at 0 °C." },
      { id: 'wat-003', type: 'mcq', level: 2, syl: 'P5', skill: 'changes',
        stem: "The diagram shows changes between the three states of water. Which arrows show water GAINING heat?",
        figure: FIG_STATES,
        options: ["P and Q only", "Q and S only", "R and S only", "P and R only"],
        answer: 3,
        miscon: { 0: 'heat-direction', 1: 'heat-direction', 2: 'heat-direction' },
        technique: 'Follow the arrows',
        steps: ["Follow each arrow from its start to its end.", "Melting (solid to liquid) and evaporating or boiling (liquid to gas) need heat.", "Pick the two arrows that go that way."],
        optionFeedback: {
          0: "P is right: melting needs heat. Q goes back to ice, so the water loses heat.",
          1: "Q and S both LOSE heat: freezing and condensing.",
          2: "R is right. S turns gas back into liquid, which means losing heat." },
        explain: "P (melting) and R (evaporation or boiling) need water to gain heat. Q (freezing) and S (condensation) happen when water loses heat." },
      { id: 'wat-004', type: 'mcq', level: 2, syl: 'P5', skill: 'changes',
        stem: "Which arrow in the diagram shows freezing?",
        figure: FIG_STATES,
        options: ["P", "Q", "R", "S"],
        answer: 1,
        miscon: { 0: 'state-name-mixup', 2: 'state-name-mixup', 3: 'state-name-mixup' },
        optionFeedback: {
          0: "P goes from solid to liquid: that is melting.",
          2: "R goes from liquid to gas: evaporation or boiling.",
          3: "S goes from gas to liquid: condensation." },
        explain: "Freezing is liquid to solid, which is arrow Q." },
      { id: 'wat-005', type: 'mcq', level: 1, syl: 'P5', skill: 'states',
        stem: "At what temperature does pure water boil?",
        figure: null,
        options: ["0 °C", "50 °C", "100 °C", "120 °C"],
        answer: 2,
        miscon: { 0: 'mp-bp-mixup', 1: 'boil-evap-same', 3: 'mp-bp-mixup' },
        optionFeedback: {
          0: "0 °C is where ice melts and water freezes.",
          1: "Water can evaporate at 50 °C, but it does not boil yet.",
          3: "Boiling water stays at one temperature while it boils. It is lower than this." },
        explain: "Pure water boils at 100 °C. Ice melts at 0 °C." },
      { id: 'wat-006', type: 'mcq', level: 2, syl: 'P5', skill: 'changes',
        stem: "Mei heated some ice and recorded its temperature until the water boiled. Between which times was the ice melting?",
        figure: GRAPH_HEAT,
        options: ["0 to 2 min", "2 to 6 min", "6 to 10 min", "10 to 14 min"],
        answer: 1,
        miscon: { 0: 'graph-misread', 2: 'graph-misread', 3: 'mp-bp-mixup' },
        technique: 'Read, compare, conclude',
        steps: ["Find the flat parts of the line.", "Read the temperature of each flat part.", "Which flat part is at the melting point of ice?"],
        optionFeedback: {
          0: "From 0 to 2 min the ice is warming up to 0 °C. It has not started melting yet.",
          2: "From 6 to 10 min the temperature rises: the ice has already melted.",
          3: "The flat part at 100 °C is boiling, not melting." },
        explain: "The temperature stays at 0 °C from 2 to 6 minutes while the ice melts." },
      { id: 'wat-007', type: 'mcq', level: 3, syl: 'P5', skill: 'changes',
        stem: "Look at the graph again. What happened to the temperature from 10 to 14 minutes while the water was boiling, and why?",
        figure: GRAPH_HEAT,
        options: ["It kept rising, because the water was still gaining heat.", "It dropped, because water vapour was escaping.", "It stayed at 0 °C, because the water was changing state.", "It stayed at 100 °C, as heat was changing water to vapour."],
        answer: 3,
        miscon: { 0: 'temp-rises-during-change', 1: 'temp-rises-during-change', 2: 'mp-bp-mixup' },
        technique: 'Read, compare, conclude',
        steps: ["Read the line from 10 to 14 minutes.", "Is it going up, down or flat? At what value?", "Where does the heat go while water boils?"],
        optionFeedback: {
          0: "The water was still gaining heat, but look: the line is flat.",
          1: "The line does not go down. Read the value at 10 and at 14 minutes.",
          2: "0 °C is where the ice melted. Read the value of the later flat part." },
        explain: "While water boils, its temperature stays at 100 °C. The heat gained is used to change the water into water vapour." },
      { id: 'wat-008', type: 'mcq', level: 2, syl: 'P5', skill: 'changes',
        stem: "Which of these is an example of evaporation?",
        figure: null,
        options: ["Wet clothes drying on a clothes line", "Ice cubes melting in a glass", "Droplets forming on a cold can", "Water turning to ice in a freezer"],
        answer: 0,
        miscon: { 1: 'state-name-mixup', 2: 'state-name-mixup', 3: 'state-name-mixup' },
        optionFeedback: {
          1: "Ice turning into water is melting.",
          2: "Droplets forming from water vapour is condensation.",
          3: "Water turning to ice is freezing." },
        explain: "As clothes dry, the water in them evaporates into water vapour." },
      { id: 'wat-009', type: 'mcq', level: 3, syl: 'P5', skill: 'changes',
        stem: "Which of these statements about evaporation and boiling are correct?\nA: Evaporation can take place at any temperature.\nB: Water boils only at its boiling point, 100 °C.\nC: Evaporation takes place only at the surface of the water.\nD: During boiling, water loses heat.",
        figure: null,
        options: ["A and B only", "A, B and C only", "B, C and D only", "A, B, C and D"],
        answer: 1,
        miscon: { 0: 'boil-evap-same', 2: 'heat-direction', 3: 'heat-direction' },
        technique: 'Tick or cross',
        steps: ["Take one statement at a time.", "Think of a puddle drying on a normal day: what temperature is it?", "Does water need to gain or lose heat to boil?", "Choose the option with only the ticks."],
        optionFeedback: {
          0: "A and B are right. Where does evaporation happen: at the surface or all through the water?",
          2: "B and C are right. But boiling needs heat, so D does not hold. Check A again.",
          3: "D does not hold: water must GAIN heat to boil." },
        explain: "A, B and C are correct. D is not: water gains heat while it boils." },
      { id: 'wat-010', type: 'mcq', level: 2, syl: 'P5', skill: 'changes',
        stem: "A puddle of rainwater on a footpath dries up by the afternoon. Which statement best explains this?",
        figure: null,
        options: ["The water boiled because the sun was very hot.", "The water turned into mist that hangs in the air.", "The water evaporated, though it never reached 100 °C.", "The water was destroyed and no longer exists."],
        answer: 2,
        miscon: { 0: 'evap-needs-boil', 1: 'steam-visible', 3: 'water-disappears' },
        optionFeedback: {
          0: "A footpath never gets to 100 °C. Water can turn into a gas below that.",
          1: "Mist is liquid droplets you can see. The puddle turned into something invisible.",
          3: "The water still exists as water vapour in the air." },
        explain: "The water evaporated into water vapour. Evaporation happens at any temperature, so it does not need to boil." },
      { id: 'wat-011', type: 'mcq', level: 3, syl: 'P5', skill: 'changes',
        stem: "Kumar sealed 200 g of ice in a container. He left it until all the ice had melted. What is the mass of the water in the container now?",
        figure: null,
        options: ["200 g", "Less than 200 g", "More than 200 g", "0 g, because the ice is gone"],
        answer: 0,
        miscon: { 1: 'mass-changes-state', 2: 'mass-changes-state', 3: 'water-disappears' },
        optionFeedback: {
          1: "The container is sealed, so nothing can escape. Does melting remove any water?",
          2: "Nothing was added to the sealed container. Melting only changes the state.",
          3: "The ice did not vanish: it became liquid water." },
        explain: "Melting changes the state, not the amount of matter. The container was sealed, so the mass stays 200 g." },

      // ----- Rate of evaporation -----
      { id: 'wat-012', type: 'mcq', level: 1, syl: 'P5', skill: 'evaporation',
        stem: "Which of these would help wet clothes to dry faster?",
        figure: null,
        options: ["Folding them up", "Putting them in a closed plastic bag", "Hanging them in a windy place", "Leaving them in a shady, still room"],
        answer: 2,
        miscon: { 0: 'surface-area-mixup', 1: 'still-humid-faster', 3: 'still-humid-faster' },
        optionFeedback: {
          0: "Folding makes the exposed surface area smaller, so they dry more slowly.",
          1: "In a closed bag the water vapour cannot get away, so they stay damp.",
          3: "Still, cool air dries clothes slowly. What moving air could help?" },
        explain: "Wind carries water vapour away from the clothes, so the water evaporates faster." },
      { id: 'wat-013', type: 'mcq', level: 2, syl: 'P5', skill: 'evaporation',
        stem: "Three containers, A, B and C, were left in the same place. What can you conclude from the results?",
        figure: TBL_AREA,
        options: ["The smaller the exposed surface area, the faster the water evaporates.", "The larger the exposed surface area, the faster the water evaporates.", "Exposed surface area does not affect evaporation.", "The more water at the start, the faster it evaporates."],
        answer: 1,
        miscon: { 0: 'surface-area-mixup', 2: 'graph-misread', 3: 'changed-measured-mixup' },
        technique: 'Read, compare, conclude',
        steps: ["Read: which container has the largest exposed surface area?", "Compare: which one has the least water left?", "Conclude: link the two."],
        optionFeedback: {
          0: "Container A, with the smallest area, has the MOST water left.",
          2: "The volume left changes a lot from A to C. The area made a difference.",
          3: "Every container started with 100 mL, so that was kept the same." },
        explain: "C has the largest exposed surface area and the least water left (60 mL). The larger the exposed surface area, the faster the water evaporates." },
      { id: 'wat-014', type: 'mcq', level: 2, syl: 'P5', skill: 'evaporation',
        stem: "Ravi wants to find out whether wind affects how fast water evaporates. He uses two dishes of water. What should be different between the two dishes?",
        figure: null,
        options: ["The amount of water in each dish", "The size of the dishes", "How long he leaves them", "Whether a fan blows over the dish"],
        answer: 3,
        miscon: { 0: 'changed-measured-mixup', 1: 'changed-measured-mixup', 2: 'changed-measured-mixup' },
        technique: 'Change one thing',
        steps: ["What is he testing? Wind.", "Change only that between the two dishes.", "Keep everything else the same."],
        optionFeedback: {
          0: "The amount of water must be the same, or the test is not fair.",
          1: "A bigger dish has a larger surface area. Keep the dishes the same.",
          2: "Both dishes must be left for the same time." },
        explain: "He is testing wind, so only the wind should be different: one dish with a fan blowing over it, one without." },
      { id: 'wat-015', type: 'mcq', level: 3, syl: 'P5', skill: 'evaporation',
        stem: "On a rainy day, Mrs Tan's clothes take much longer to dry, even though they hang under a shelter. Which is the best explanation?",
        figure: null,
        options: ["The air holds a lot of water vapour, so water evaporates more slowly.", "Rainy air is hotter, so water evaporates more slowly.", "Damp air speeds up evaporation, so the clothes stay wet.", "Evaporation stops completely whenever it rains."],
        answer: 0,
        miscon: { 1: 'temp-evap-mixup', 2: 'still-humid-faster', 3: 'evap-all-or-nothing' },
        optionFeedback: {
          1: "Rainy days are usually cooler, and warmer air speeds evaporation up.",
          2: "If damp air sped evaporation up, the clothes would dry faster.",
          3: "The clothes still dry in the end, just more slowly." },
        explain: "On a rainy day the air already has a lot of water vapour in it and is cooler, so water from the clothes evaporates more slowly." },
      { id: 'wat-016', type: 'mcq', level: 2, syl: 'P5', skill: 'evaporation',
        stem: "Four set-ups are shown in the table. In which set-up will the water evaporate fastest?",
        figure: TBL_SETUPS,
        options: ["A", "B", "C", "D"],
        answer: 1,
        miscon: { 0: 'surface-area-mixup', 2: 'wind-no-effect', 3: 'temp-evap-mixup' },
        technique: 'Read, compare, conclude',
        steps: ["Which container has the larger exposed surface area?", "Which place is warmer?", "Which set-up has wind?", "Find the set-up with all three."],
        optionFeedback: {
          0: "A is in the sun with a fan, but a narrow cup has a small exposed surface area.",
          2: "C has a wide dish, but it is in the shade with no wind.",
          3: "D has a narrow cup, shade and no wind: it will be the slowest." },
        explain: "B has a large exposed surface area, warm surroundings and wind, so its water evaporates fastest." },

      // ----- Condensation -----
      { id: 'wat-017', type: 'mcq', level: 1, syl: 'P5', skill: 'condensation',
        stem: "What is condensation?",
        figure: null,
        options: ["Water gaining heat and changing into water vapour", "Ice gaining heat and changing into water", "Water losing heat and changing into ice", "Water vapour losing heat and changing into water"],
        answer: 3,
        miscon: { 0: 'state-name-mixup', 1: 'state-name-mixup', 2: 'state-name-mixup' },
        optionFeedback: {
          0: "That is evaporation (or boiling).",
          1: "That is melting.",
          2: "That is freezing." },
        explain: "Condensation is the change from gas to liquid: water vapour loses heat and becomes water." },
      { id: 'wat-018', type: 'mcq', level: 2, syl: 'P5', skill: 'condensation',
        stem: "Water droplets formed on the outside of a glass of ice water. Where did the water come from?",
        figure: FIG_GLASS,
        options: ["Water inside the glass seeping through", "Ice melting through the glass", "Water vapour in the surrounding air", "Coldness leaking out of the glass"],
        answer: 2,
        miscon: { 0: 'condensation-from-glass', 1: 'condensation-from-glass', 3: 'cold-transfer' },
        optionFeedback: {
          0: "Glass does not let water through. A glass of warm water stays dry outside.",
          1: "The ice stays inside the glass. What is in the air all around it?",
          3: "Cold does not leak out. Heat moves INTO the cold glass." },
        explain: "Water vapour in the surrounding air loses heat to the cold glass and condenses into droplets on the outside." },
      { id: 'wat-019', type: 'mcq', level: 3, syl: 'P5', skill: 'condensation',
        stem: "The glass of ice water had a mass of 300 g when Lina first set it down. After 10 minutes, there were water droplets all over the outside. What is its mass now (with the droplets)?",
        figure: FIG_GLASS,
        options: ["More than 300 g", "Less than 300 g", "300 g", "300 g at first, then less as the ice melts"],
        answer: 0,
        miscon: { 1: 'water-disappears', 2: 'condensation-from-glass', 3: 'mass-changes-state' },
        technique: 'Claim, evidence, reason',
        steps: ["Where did the droplets come from: inside or outside?", "Has anything been added to the glass?", "So does the mass go up, down or stay the same?"],
        optionFeedback: {
          1: "Nothing left the glass. Something was ADDED to its outside.",
          2: "That would be true only if the droplets came from inside. Where did they come from?",
          3: "Melting inside the glass does not change its mass. What was added outside?" },
        explain: "Water vapour from the air condensed on the outside, adding water to the glass, so its mass is now more than 300 g." },
      { id: 'wat-020', type: 'mcq', level: 2, syl: 'P5', skill: 'condensation',
        stem: "Water is boiling in a kettle. Just above the spout (X) the air looks clear. Further away (Y) there is white mist. What is at X and at Y?",
        figure: FIG_KETTLE,
        options: ["X: tiny water droplets, Y: water vapour", "X: air only, Y: smoke", "X: water vapour, Y: water vapour too", "X: water vapour, Y: tiny water droplets"],
        answer: 3,
        miscon: { 0: 'steam-visible', 1: 'state-mixup', 2: 'steam-visible' },
        optionFeedback: {
          0: "Swap them: droplets can be seen, vapour cannot.",
          1: "Nothing is burning. The water is boiling, so what leaves the spout?",
          2: "X is right. But if Y were vapour, you could not see it either." },
        explain: "X is invisible water vapour. As it moves away it loses heat to the cooler air and condenses into tiny water droplets, the white mist at Y." },
      { id: 'wat-021', type: 'mcq', level: 2, syl: 'P5', skill: 'condensation',
        stem: "In which of these does condensation take place?",
        figure: null,
        options: ["Butter melting in a hot pan", "A bathroom mirror misting up after a hot shower", "A wet floor drying", "Water in an ice-cube tray turning to ice"],
        answer: 1,
        miscon: { 0: 'state-name-mixup', 2: 'state-name-mixup', 3: 'state-name-mixup' },
        optionFeedback: {
          0: "Solid to liquid is melting.",
          2: "A floor drying is evaporation: liquid to gas.",
          3: "Liquid to solid is freezing." },
        explain: "Water vapour from the hot shower loses heat to the cooler mirror and condenses into tiny droplets." },
      { id: 'wat-022', type: 'mcq', level: 3, syl: 'P5', skill: 'condensation',
        stem: "Ben covered a beaker of hot water with a glass plate and put ice cubes on the plate. Soon, water droplets formed under the plate. Why?",
        figure: FIG_HOTPLATE,
        options: ["Hot water splashed up onto the plate.", "Ice on the plate melted through it.", "Coldness from the plate passed into the hot water.", "Water vapour lost heat to the cold plate and condensed."],
        answer: 3,
        miscon: { 0: 'condensation-from-glass', 1: 'condensation-from-glass', 2: 'cold-transfer' },
        technique: 'Follow the arrows',
        steps: ["What leaves the hot water surface?", "What does it touch?", "What happens when it loses heat there?"],
        optionFeedback: {
          0: "The water is hot but not splashing. Something invisible rises from it.",
          1: "Glass does not let water through. Look at the underside of the plate.",
          2: "Cold does not move. Heat moves from the warm vapour into the cold plate." },
        explain: "Water from the hot water evaporates. The water vapour rises, loses heat to the cold glass plate and condenses into droplets on its underside." },

      // ----- The water cycle -----
      { id: 'wat-023', type: 'mcq', level: 1, syl: 'P5', skill: 'watercycle',
        stem: "The diagram shows the water cycle. Which letter shows evaporation?",
        figure: FIG_CYCLE,
        options: ["A", "B", "C", "D"],
        answer: 0,
        miscon: { 1: 'cycle-step-mixup', 2: 'cycle-step-mixup', 3: 'cycle-step-mixup' },
        optionFeedback: {
          1: "B shows the water vapour going up to form a cloud. Where does it start?",
          2: "C shows rain falling from the cloud.",
          3: "D shows a river flowing back to the sea." },
        explain: "A shows water from the sea gaining heat from the Sun and evaporating." },
      { id: 'wat-024', type: 'mcq', level: 2, syl: 'P5', skill: 'watercycle',
        stem: "Look at the water cycle. What happens to the water vapour at B as it forms the cloud?",
        figure: FIG_CYCLE,
        options: ["It gains heat and evaporates.", "It loses heat and condenses.", "It falls as rain.", "It flows back to the sea."],
        answer: 1,
        miscon: { 0: 'cycle-step-mixup', 2: 'cycle-step-mixup', 3: 'cycle-step-mixup' },
        optionFeedback: {
          0: "Evaporation happened at A. Higher up the air is cooler.",
          2: "Falling rain is C. First the cloud has to form.",
          3: "Flowing back to the sea is D." },
        explain: "As water vapour rises, it loses heat and condenses into tiny water droplets that form a cloud." },
      { id: 'wat-025', type: 'mcq', level: 2, syl: 'P5', skill: 'watercycle',
        stem: "What are clouds made of?",
        figure: null,
        options: ["Water vapour", "Smoke", "Tiny water droplets", "Air only"],
        answer: 2,
        miscon: { 0: 'clouds-vapour', 1: 'state-mixup', 3: 'state-mixup' },
        optionFeedback: {
          0: "Water vapour is invisible, but you can see clouds.",
          1: "Nothing is burning in the sky. Clouds are part of the water cycle.",
          3: "Rain falls from clouds, so they must hold water." },
        explain: "Clouds are made of tiny water droplets formed when water vapour condenses." },
      { id: 'wat-026', type: 'mcq', level: 3, syl: 'P5', skill: 'watercycle',
        stem: "Which statements about the water cycle are correct?\nA: The Sun's heat makes water in the sea evaporate.\nB: Water vapour rises, loses heat and condenses to form clouds.\nC: Water is lost from the Earth during the water cycle.\nD: Rainwater flows into rivers, reservoirs and the sea.",
        figure: null,
        options: ["A and B only", "B, C and D only", "A, B and D only", "A, B, C and D"],
        answer: 2,
        miscon: { 0: 'cycle-step-mixup', 1: 'water-disappears', 3: 'water-disappears' },
        technique: 'Tick or cross',
        steps: ["Take one statement at a time.", "Follow the water: sea, air, cloud, rain, river.", "Is any water destroyed on the way?", "Choose the option with only the ticks."],
        optionFeedback: {
          0: "A and B are right. Where does the rain go after it falls? Check D.",
          1: "B and D are right, but water is never lost, so C does not hold. Check A.",
          3: "C does not hold: the water only changes state and moves around." },
        explain: "A, B and D are correct. C is not: water changes state and moves, but it is not lost." },

      // ----- Saving water -----
      { id: 'wat-027', type: 'mcq', level: 2, syl: 'P5', skill: 'care',
        stem: "Which of these is a way to save water at home?",
        figure: null,
        options: ["Turning off the tap while brushing your teeth", "Washing the car with a running hose", "Running the washing machine with a few clothes", "Taking long showers"],
        answer: 0,
        miscon: { 1: 'water-unlimited', 2: 'water-unlimited', 3: 'water-unlimited' },
        optionFeedback: {
          1: "A running hose wastes lots of water. A pail would use less.",
          2: "Each wash uses a lot of water. Wait for a full load.",
          3: "Long showers use more water. Shorter showers save it." },
        explain: "Turning off the tap while brushing stops clean water from going down the drain." },
      { id: 'wat-028', type: 'mcq', level: 2, syl: 'P5', skill: 'care',
        stem: "It rains often in Singapore. Why must Singapore still save water?",
        figure: null,
        options: ["Rain falls only into the sea, never on land.", "Water on Earth keeps increasing every year.", "Sea water can be drunk straight from the sea.", "Singapore has limited land to collect and store rain."],
        answer: 3,
        miscon: { 0: 'cycle-step-mixup', 1: 'water-unlimited', 2: 'water-unlimited' },
        optionFeedback: {
          0: "Rain falls on land too, and flows into reservoirs.",
          1: "The water on Earth goes round the water cycle; it does not keep growing.",
          2: "Sea water is salty and not safe to drink straight away." },
        explain: "Singapore is small, so it has limited land to collect and store rainwater. Clean water is precious and must be saved." },

      // ----- Open-ended -----
      { id: 'wat-029', type: 'oeq', level: 1, marks: 2, syl: 'P5', skill: 'changes',
        stem: "Name the change of state when:\n(a) water turns into water vapour at 100 °C (1 mark)\n(b) ice turns into water (1 mark)",
        figure: null,
        model: "(a) Boiling. (b) Melting.",
        keys: [["(a) boiling", "(a) boils"], ["(b) melting", "(b) melts"]],
        watchFor: ['state-name-mixup'],
        technique: 'Tick or cross',
        steps: ["(a) Liquid to gas at 100 °C: which name?", "(b) Solid to liquid: which name?", "Check you have not swapped them."],
        explain: "(a) Boiling. (b) Melting." },
      { id: 'wat-030', type: 'oeq', level: 2, marks: 2, syl: 'P5', skill: 'changes', chain: true,
        stem: "Mdm Lee hung her wet clothes in the sun. By the evening they were dry. Explain how the clothes became dry.",
        figure: null,
        model: "The water in the clothes gains heat from the sun. The water evaporates and changes into water vapour, which goes into the surrounding air.",
        keys: [["gains heat", "gain heat", "absorbs heat", "gained heat"], ["evaporates", "evaporated", "evaporation", "water vapour"]],
        watchFor: ['evap-needs-boil', 'heat-direction'],
        technique: 'Follow the arrows',
        steps: ["What does the water in the clothes get from the sun?", "What change of state does that cause?", "Where does the water go?"],
        explain: "In order: the water gains heat -> it evaporates into water vapour in the air." },
      { id: 'wat-031', type: 'oeq', level: 2, marks: 3, syl: 'P5', skill: 'condensation', chain: true,
        stem: "Explain how water droplets formed on the outside of the glass of ice water.",
        figure: FIG_GLASS,
        model: "Water vapour in the surrounding air came into contact with the cold outer surface of the glass. The water vapour lost heat to the cold glass and condensed into water droplets.",
        keys: [["water vapour in the surrounding air", "water vapour in the air", "water vapour from the air", "water vapour around"], ["lost heat", "loses heat", "lose heat"], ["condensed", "condenses", "condensation"]],
        watchFor: ['condensation-from-glass', 'cold-transfer'],
        technique: 'Follow the arrows',
        steps: ["Where does the water come from? Not from inside the glass.", "What happens to it when it touches the cold glass?", "Name the change of state."],
        explain: "In order: water vapour in the air -> loses heat to the cold glass -> condenses into droplets." },
      { id: 'wat-032', type: 'oeq', level: 3, marks: 4, syl: 'P5', skill: 'evaporation',
        stem: "Containers A, B and C each started with 100 mL of water and were left in the same place for 3 days.\n(a) Which variable was changed? (1 mark)\n(b) What was measured? (1 mark)\n(c) Which container lost the most water, and why? (2 marks)",
        figure: TBL_AREA,
        model: "(a) The exposed surface area of the water. (b) The volume of water left after 3 days. (c) Container C. It had the largest exposed surface area, so the water evaporated fastest.",
        keys: [["exposed surface area", "surface area", "size of the opening", "area of the water"], ["volume of water left", "amount of water left", "volume of water remaining", "amount of water remaining", "water left"], ["Container C"], ["largest exposed surface area, so the water evaporated fastest", "largest surface area, so", "biggest surface area, so"]],
        watchFor: ['surface-area-mixup', 'changed-measured-mixup'],
        technique: 'Change one thing',
        steps: ["(a) Which column changes from A to C on purpose?", "(b) Which column is the result?", "(c) Which container has the least water left?", "Link it to the column you named in (a)."],
        explain: "(a) Exposed surface area. (b) Volume of water left. (c) One mark for C, one mark for linking it to the largest exposed surface area." },
      { id: 'wat-033', type: 'oeq', level: 3, marks: 5, syl: 'P5', skill: 'evaporation',
        stem: "Ravi put 50 mL of water in dish A and 50 mL in dish B. He placed dish A in front of a switched-on fan and dish B where no fan was blowing. After 2 hours he measured the water left in each dish.\n(a) Which variable did he change? (1 mark)\n(b) Name two variables he must keep the same. (2 marks)\n(c) Which dish will have less water left? (1 mark)\n(d) Explain your answer to (c). (1 mark)",
        figure: null,
        model: "(a) Whether there is wind blowing over the dish. (b) He must keep the same size of dish (exposed surface area) and the same temperature of the surroundings. (c) Dish A. (d) The wind makes the water evaporate faster.",
        keys: [["wind", "moving air", "air movement", "the fan"], ["same size of dish (exposed surface area)", "same temperature of the surroundings", "same amount of water at the start"], ["same temperature of the surroundings", "a SECOND, different variable from that list"], ["Dish A"], ["wind makes the water evaporate faster", "moving air speeds up evaporation", "wind carries the water vapour away"]],
        watchFor: ['wind-no-effect', 'changed-measured-mixup'],
        technique: 'Change one thing',
        steps: ["(a) What is different between the two dishes?", "(b) What else could change how fast water evaporates? Keep it the same.", "(c) and (d) Which dish has moving air over it, and what does that do?"],
        explain: "(a) Presence of wind. (b) Any two different ones of: same size of dish (exposed surface area), same temperature of the surroundings, same place (room). (c) Dish A. (d) Wind makes water evaporate faster. The amount of water (50 mL) and the time (2 hours) are given in the question, so naming them earns no mark." },
      { id: 'wat-034', type: 'oeq', level: 2, marks: 2, syl: 'P5', skill: 'evaporation', chain: true,
        stem: "A puddle dries up faster on a hot, sunny day than on a cool, cloudy day. Explain why.",
        figure: null,
        model: "On a sunny day the temperature of the surroundings is higher. So the water in the puddle evaporates faster.",
        keys: [["temperature of the surroundings is higher", "higher temperature", "temperature is higher", "warmer surroundings", "gains heat faster", "gains more heat"], ["evaporates faster", "faster rate of evaporation", "evaporates more quickly", "evaporation is faster"]],
        watchFor: ['temp-evap-mixup', 'evap-needs-boil'],
        technique: 'Follow the arrows',
        steps: ["What is different about the surroundings on the two days?", "Does the water gain heat faster or slower?", "How does that affect the rate of evaporation?"],
        explain: "In order: higher temperature of the surroundings -> water evaporates faster." },
      { id: 'wat-035', type: 'oeq', level: 2, marks: 3, syl: 'P5', skill: 'changes',
        stem: "Look at Mei's graph of ice being heated until the water boiled.\n(a) How long did the ice take to melt completely? (1 mark)\n(b) In what state was the water from 6 to 10 minutes? (1 mark)\n(c) Why does the temperature stay the same from 10 to 14 minutes? (1 mark)",
        figure: GRAPH_HEAT,
        model: "(a) 4 minutes. (b) Liquid. (c) The heat is used to change the water into water vapour, so the temperature does not rise.",
        keys: [["4 minutes", "4 min", "four minutes"], ["liquid"], ["heat is used to change the water into water vapour", "heat used to change state", "used to change"]],
        watchFor: ['temp-rises-during-change', 'graph-misread'],
        technique: 'Read, compare, conclude',
        steps: ["(a) Find the flat part at 0 °C. When does it start and end?", "(b) After melting and before boiling, what state is water in?", "(c) Where does the heat go during the flat part at 100 °C?"],
        explain: "(a) From 2 to 6 minutes = 4 minutes. (b) Liquid. (c) The heat is used to change the state, not to raise the temperature." },
      { id: 'wat-036', type: 'oeq', level: 3, marks: 3, syl: 'P5', skill: 'condensation', chain: true,
        stem: "Look at the kettle. Explain why the white mist at Y can be seen, but the space at X looks clear.",
        figure: FIG_KETTLE,
        model: "At X there is water vapour, which is invisible. As the water vapour moves away from the spout, it loses heat to the cooler surrounding air. It condenses into tiny water droplets, which we can see as the white mist at Y.",
        keys: [["invisible", "cannot be seen", "can't be seen"], ["loses heat", "lost heat", "lose heat"], ["condenses", "condensed", "condensation", "tiny water droplets"]],
        watchFor: ['steam-visible'],
        technique: 'Follow the arrows',
        steps: ["What leaves the spout? Can we see it?", "What happens to it in the cooler air?", "What does it turn into that we CAN see?"],
        explain: "In order: invisible water vapour at X -> loses heat to the cooler air -> condenses into tiny droplets (mist) at Y." },
      { id: 'wat-037', type: 'oeq', level: 3, marks: 4, syl: 'P5', skill: 'watercycle', chain: true,
        stem: "Describe how water from the sea becomes rain.",
        figure: FIG_CYCLE,
        model: "The sea water gains heat from the Sun and evaporates into water vapour. The water vapour rises, loses heat and condenses into tiny water droplets. The tiny water droplets form clouds. The droplets join into bigger, heavier drops that fall as rain.",
        keys: [["evaporates", "evaporation", "evaporate"], ["loses heat and condenses", "condenses", "condensation", "condense"], ["tiny water droplets form clouds", "condenses into tiny water droplets"], ["droplets join into bigger, heavier drops", "become heavier and fall"]],
        watchFor: ['cycle-step-mixup', 'clouds-vapour'],
        technique: 'Follow the arrows',
        steps: ["What does the Sun do to the sea water?", "What happens as the water vapour rises?", "What forms in the sky?", "Why do drops fall?"],
        explain: "In order: evaporates -> condenses -> forms clouds -> droplets join, become heavier and fall as rain." },
      { id: 'wat-038', type: 'oeq', level: 1, marks: 2, syl: 'P5', skill: 'care',
        stem: "Give two reasons why water is important to living things.",
        figure: null,
        model: "Any two of: people and animals need water for drinking; plants need it to make food; water is a home or habitat for water animals; we also use water for keeping cool.",
        keys: [["drinking"], ["plants need it to make food"], ["home or habitat for water animals"], ["keeping cool", "another valid use: growing, germination"]],
        watchFor: [],
        technique: 'Claim, evidence, reason',
        steps: ["Think of people and animals: what do they do with water every day?", "Think of plants: what do they need water for?", "Write one reason for each."],
        explain: "One mark each for two different reasons, e.g. for drinking, for plants to make food, as a home for water animals." },
      { id: 'wat-039', type: 'oeq', level: 2, marks: 2, syl: 'P5', skill: 'care',
        stem: "Suggest two ways a family living in an HDB flat can save water.",
        figure: null,
        model: "Any two of: turn off the tap while brushing teeth; take shorter showers; wash full loads; reuse rinse water to water plants; use a pail instead of a running hose; fix leaking taps or fit water-saving devices.",
        keys: [["turn off the tap while brushing"], ["shorter showers"], ["wash full loads"], ["reuse rinse water"], ["pail instead of a running hose"], ["fix leaking taps", "water-saving devices"]],
        watchFor: ['water-unlimited'],
        technique: 'Tick or cross',
        steps: ["Picture the bathroom, kitchen and laundry.", "Where is water wasted?", "Write two DIFFERENT ways to save it."],
        explain: "One mark each for two different ways, e.g. turning off the tap while brushing, shorter showers, washing full loads, reusing water to water plants, using a pail instead of a running hose." },
      { id: 'wat-040', type: 'oeq', level: 2, marks: 3, syl: 'P5', skill: 'watercycle', chain: true,
        stem: "Singapore collects rainwater in its reservoirs. Explain how the water cycle keeps refilling them.",
        figure: null,
        model: "Water from the sea and reservoirs evaporates when it gains heat from the Sun. The water vapour rises and condenses into clouds. The water then falls back as rain and flows into the reservoirs.",
        keys: [["evaporates", "evaporation", "evaporate"], ["condenses", "condensation", "condense"], ["falls back as rain", "falls as rain", "rains", "rain falls"]],
        watchFor: ['cycle-step-mixup', 'water-disappears'],
        technique: 'Follow the arrows',
        steps: ["How does water get into the air?", "How does it form clouds?", "How does it get back down to the reservoirs?"],
        explain: "In order: evaporation -> condensation into clouds -> rain refills the reservoirs." },
      { id: 'wat-041', type: 'oeq', level: 3, marks: 3, syl: 'P5', skill: 'condensation', chain: true,
        stem: "Joan dried a can of cold drink taken from the fridge and put it on a balance. After 5 minutes, droplets had formed on it and its mass had increased. Explain why the mass increased.",
        figure: null,
        model: "Water vapour in the surrounding air lost heat to the cold can and condensed on its surface. The water droplets added mass to the can.",
        keys: [["water vapour"], ["condensed", "condenses", "condensation"], ["added mass", "added to the mass", "adds mass", "extra water", "added water"]],
        watchFor: ['condensation-from-glass', 'mass-changes-state'],
        technique: 'Follow the arrows',
        steps: ["Where did the droplets come from?", "Name the change of state.", "What did the droplets do to the mass?"],
        explain: "In order: water vapour from the air -> condensed on the cold can -> the droplets added mass." },
      { id: 'wat-042', type: 'oeq', level: 2, marks: 2, syl: 'P5', skill: 'changes',
        stem: "State two differences between boiling and evaporation.",
        figure: null,
        model: "Any two of: evaporation at any temperature, boiling only at 100 °C; evaporation only at the surface, boiling throughout the water; evaporation is slow, boiling is fast; boiling has bubbles, evaporation does not.",
        keys: [["evaporation at any temperature, boiling only at 100 °C"], ["evaporation only at the surface, boiling throughout"], ["evaporation is slow, boiling is fast"], ["boiling has bubbles"]],
        watchFor: ['boil-evap-same', 'evap-needs-boil'],
        technique: 'Tick or cross',
        steps: ["Compare WHEN each happens (temperature).", "Compare WHERE each happens in the water.", "Or compare how fast each happens."],
        explain: "One mark for the temperature difference (any temperature vs only at 100 °C). One mark for where (surface vs throughout) or speed (slow vs fast)." },
      { id: 'wat-043', type: 'oeq', level: 3, marks: 4, syl: 'P5', skill: 'states',
        stem: "Lisa put a cup of water in a freezer and recorded its temperature every 5 minutes.\n(a) Between which times was the water freezing? (1 mark)\n(b) In what state was it at 25 minutes? (1 mark)\n(c) Does water gain or lose heat when it freezes? (1 mark)\n(d) What happens to the mass of the water when it freezes? (1 mark)",
        figure: TBL_FREEZE,
        model: "(a) Between 10 and 20 minutes. (b) Solid (ice). (c) It loses heat. (d) The mass stays the same.",
        keys: [["10 and 20", "10 to 20", "10 min and 20 min", "10th and 20th"], ["solid", "ice"], ["loses heat", "lost heat", "it loses"], ["stays the same", "same mass", "does not change", "remains the same", "unchanged"]],
        watchFor: ['heat-direction', 'mass-changes-state', 'graph-misread'],
        technique: 'Read, compare, conclude',
        steps: ["(a) Find where the temperature stays at 0 °C.", "(b) Below 0 °C, what state is water in?", "(c) A freezer takes heat away. Gain or lose?", "(d) Was any water added or taken away?"],
        explain: "(a) 10 to 20 minutes, while it stays at 0 °C. (b) Solid. (c) It loses heat. (d) Mass stays the same: only the state changes." },
      { id: 'wat-044', type: 'oeq', level: 2, marks: 2, syl: 'P5', skill: 'changes', chain: true,
        stem: "Ice cubes are put into a glass of orange juice at room temperature. After a while they disappear. Explain what happened to the ice cubes.",
        figure: null,
        model: "The ice cubes gained heat from the warmer juice and the surrounding air. They melted into water, which mixed with the juice.",
        keys: [["gained heat", "gain heat", "gains heat", "absorbed heat"], ["melted", "melts", "melting"]],
        watchFor: ['cold-transfer', 'water-disappears'],
        technique: 'Follow the arrows',
        steps: ["Which is warmer: the ice or the juice?", "Which way does heat move?", "What change of state does that cause?"],
        explain: "In order: the ice gains heat from the warmer juice and air -> it melts into water, which mixes into the juice." },
      { id: 'wat-045', type: 'oeq', level: 3, marks: 5, syl: 'P5', skill: 'evaporation',
        stem: "Hui Min left two identical dishes of water, P and Q, side by side for 3 days. Dish Q was covered with a lid.\n(a) Which dish lost more water? (1 mark)\n(b) Explain why dish Q lost so little water. (1 mark)\n(c) Droplets formed on the inside of the lid. Explain how they formed. (2 marks)\n(d) Suggest one way to make the water in dish P evaporate even faster. (1 mark)",
        figure: TBL_COVER,
        model: "(a) Dish P. (b) The water vapour could not escape: it was trapped by the lid. (c) Water vapour from the water lost heat to the cooler lid and condensed into droplets. (d) Place a fan blowing over dish P.",
        keys: [["Dish P"], ["water vapour could not escape", "water vapour was trapped by the lid", "lid stopped the water vapour escaping"], ["lost heat", "loses heat", "lose heat"], ["condensed", "condenses", "condensation"], ["fan", "wind", "in the sun", "warmer place", "wider dish", "larger surface area"]],
        watchFor: ['still-humid-faster', 'condensation-from-glass'],
        technique: 'Claim, evidence, reason',
        steps: ["(a) Compare the volumes after 3 days.", "(b) Where does evaporated water go? What blocks it?", "(c) What happens to water vapour that touches a cooler surface?", "(d) Name one factor that speeds up evaporation."],
        explain: "(a) P. (b) The lid trapped the water vapour. (c) One mark for losing heat to the lid, one for condensing. (d) Any one: wind or a fan, a warmer place, a wider dish (larger exposed surface area)." }
    ]
  });
})();
