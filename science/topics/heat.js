"use strict";
// Science Quest — topic: Heat (P4 content on the PSLE track, Energy). Data only; the helpers below just build SVG/HTML strings.
// Scope per MOE Primary Science Syllabus 2023, theme Energy, "Heat energy" (P4 block, examined at PSLE 0009
// from 2026). Level checked 2026-10-30: heat IS P4 in the 2023 syllabus (school briefings that summarise it):
//   - Junyuan Pri, 2026 P4 Science briefing: P4 topics "Cycles - Matter", "Energy - Light and Shadows",
//     "Energy - Heat and Effects of Heat"  https://www.junyuanpri.moe.edu.sg/files/2026_P4_SCI.pdf
//   - Jurong West Pri, P4 Science Briefing Slides 2026 (Matter Term 1, Heat Term 2, Light Term 4)
//     https://www.jurongwestpri.moe.edu.sg/files/Slides%20and%20info/P4__Science__Briefing_Slides_2026.pdf
//   - Junyuan Pri, 2023 P4 Science Curriculum Briefing ("Heat and Temperature", Terms 3-4)
//     https://junyuanpri.moe.edu.sg/files/2023%20P4%20SCI%20Curriculum%20Briefing.pdf
//   (The MOE PDF itself did not load on the day; the decks above were read from search summaries.)
// In scope here: the Sun is our main source of heat; heat is a form of energy, temperature is how hot or
//   cold something is, measured in degrees Celsius with a thermometer; reading a thermometer scale; heat
//   flows from a hotter object or place to a colder one until both are at the same temperature; gaining
//   heat raises temperature, losing heat lowers it; objects expand when they gain heat and contract when
//   they lose heat (solids, liquids, air); good conductors (metals) and poor conductors of heat (plastic,
//   wood, styrofoam, wool, air); everyday uses; fair tests with tables and temperature-time graphs.
// Deliberately LEFT OUT: changes of state of water and melting / boiling points (P5 water-cycle lane),
//   the words convection and radiation, particle explanations of expansion, and heat measured in joules.
(function () {
  const INK = '#1f2937', LINE = '#475569', RED = '#dc2626', BLUE = '#2563eb', WATER = '#bfdbfe', HOTW = '#fecaca', METAL = '#9ca3af';

  const svg = (w, h, label, inner) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="100%" style="max-width:${w}px;display:block;margin:0 auto" role="img" aria-label="${label}">` +
    `<rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="10" fill="#ffffff" stroke="#cbd5e1"/>${inner}</svg>`;

  const txt = (x, y, s, o = {}) =>
    `<text x="${x}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="${o.size || 15}" font-weight="${o.bold ? 700 : 400}" fill="${o.fill || INK}" text-anchor="${o.anchor || 'middle'}" dominant-baseline="middle">${s}</text>`;

  const TH = 'border:1px solid #94a3b8;padding:6px 10px;background:#e2e8f0;color:#111827';
  const TD = 'border:1px solid #94a3b8;padding:6px 10px;text-align:center';
  const table = (head, rows, caption) =>
    `<table style="border-collapse:collapse;margin:0 auto;font-size:15px">` +
    (caption ? `<caption style="padding:4px 0 6px;font-weight:600">${caption}</caption>` : '') +
    `<thead><tr>${head.map((h) => `<th style="${TH}">${h}</th>`).join('')}</tr></thead>` +
    `<tbody>${rows.map((r) => `<tr>${r.map((c) => `<td style="${TD}">${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;

  const stack = (a, b) => `<div>${a}<div style="height:10px"></div>${b}</div>`;

  // Line graph. pts: [[x, y], ...]; axes from 0 to xmax / ymax.
  const graph = (pts, xmax, xstep, ymax, ystep, xLabel, yLabel, label) => {
    const w = 360, h = 270, x0 = 62, y0 = 210, x1 = 340, top = 24;
    const X = (v) => x0 + (v / xmax) * (x1 - x0), Y = (v) => y0 - (v / ymax) * (y0 - top);
    let s = '';
    for (let v = 0; v <= ymax; v += ystep) s += `<line x1="${x0}" y1="${Y(v)}" x2="${x1}" y2="${Y(v)}" stroke="#e5e7eb"/>` + txt(x0 - 8, Y(v), v, { anchor: 'end', size: 13 });
    for (let v = 0; v <= xmax; v += xstep) s += `<line x1="${X(v)}" y1="${top}" x2="${X(v)}" y2="${y0}" stroke="#e5e7eb"/>` + txt(X(v), y0 + 15, v, { size: 13 });
    s += `<line x1="${x0}" y1="${top - 4}" x2="${x0}" y2="${y0}" stroke="${INK}" stroke-width="2"/><line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y0}" stroke="${INK}" stroke-width="2"/>`;
    s += `<polyline points="${pts.map(([a, b]) => `${X(a)},${Y(b)}`).join(' ')}" fill="none" stroke="${RED}" stroke-width="2.5"/>`;
    pts.forEach(([a, b]) => { s += `<circle cx="${X(a)}" cy="${Y(b)}" r="4" fill="${RED}"/>`; });
    s += txt((x0 + x1) / 2, y0 + 40, xLabel, { size: 13 });
    s += `<text x="18" y="${(top + y0) / 2}" font-family="Arial, Helvetica, sans-serif" font-size="13" fill="${INK}" text-anchor="middle" transform="rotate(-90 18 ${(top + y0) / 2})">${yLabel}</text>`;
    return svg(w, h, label, s);
  };

  // Vertical thermometer at x, scale from lo to hi between yTop and yBot; small mark every `minor`,
  // number every `major`; red liquid up to `reading`.
  const thermo = (x, yTop, yBot, lo, hi, minor, major, reading) => {
    const Y = (v) => yBot - ((v - lo) / (hi - lo)) * (yBot - yTop);
    let s = `<rect x="${x - 8}" y="${yTop - 12}" width="16" height="${yBot - yTop + 24}" rx="8" fill="#f8fafc" stroke="${INK}" stroke-width="1.5"/>`;
    s += `<circle cx="${x}" cy="${yBot + 24}" r="14" fill="${RED}" stroke="${INK}" stroke-width="1.5"/>`;
    s += `<rect x="${x - 3}" y="${Y(reading)}" width="6" height="${yBot + 14 - Y(reading)}" fill="${RED}"/>`;
    for (let v = lo; v <= hi + 0.001; v += minor) {
      const big = Math.abs((v - lo) % major) < 0.001;
      s += `<line x1="${x + 8}" y1="${Y(v)}" x2="${x + (big ? 22 : 15)}" y2="${Y(v)}" stroke="${INK}" stroke-width="${big ? 1.5 : 1}"/>`;
      if (big) s += txt(x + 27, Y(v), v, { size: 13, anchor: 'start' });
    }
    return s;
  };

  // A beaker outline with liquid; returns svg inner string.
  const beaker = (x, y, w, h, fill, level = 0.7) =>
    `<rect x="${x}" y="${y + h * (1 - level)}" width="${w}" height="${h * level}" fill="${fill}"/>` +
    `<path d="M${x} ${y} L${x} ${y + h} L${x + w} ${y + h} L${x + w} ${y}" fill="none" stroke="${INK}" stroke-width="2"/>`;

  // ---------- Figures ----------
  // Thermometer reading 34 °C, small mark every 2 °C.
  const FIG_THERMO_34 = (() => {
    let s = thermo(120, 30, 230, 0, 50, 2, 10, 34);
    s += txt(220, 40, '°C', { size: 15, bold: 1 });
    s += txt(250, 140, 'Each small', { size: 13 }) + txt(250, 158, 'mark is 2 °C', { size: 13 });
    return svg(320, 290, 'A thermometer marked 0 to 50 degrees Celsius with a small mark every 2 degrees; the red liquid reaches two marks above 30', s);
  })();

  // Two thermometers: before 24 °C and after 58 °C heating; scale 0-80, small mark every 2 °C.
  const FIG_TWO_THERMO = (() => {
    let s = thermo(90, 52, 262, 0, 80, 2, 10, 24) + thermo(250, 52, 262, 0, 80, 2, 10, 58);
    s += txt(90, 322, 'Before', { size: 14, bold: 1 }) + txt(250, 322, 'After 5 minutes', { size: 14, bold: 1 });
    s += txt(180, 20, 'Each small mark is 2 °C', { size: 13 });
    return svg(360, 338, 'Two thermometers marked 0 to 80 degrees Celsius, a small mark every 2 degrees. Before: liquid at 24. After 5 minutes: liquid at 58', s);
  })();

  // Cooling curve: hot water left on a table in a room.
  const GRAPH_COOL = graph([[0, 80], [5, 62], [10, 48], [15, 38], [20, 32], [25, 30], [30, 30]], 30, 5, 90, 10,
    'Time (min)', 'Temperature (°C)', 'Line graph of the temperature of hot water against time: 80 at 0 minutes, falling to 30 at 25 minutes, then staying at 30 at 30 minutes');

  // Dented ping-pong ball in a beaker of hot water.
  const FIG_PINGPONG = (() => {
    let s = beaker(110, 50, 140, 140, HOTW, 0.75);
    s += txt(180, 172, 'hot water', { size: 14 });
    s += `<path d="M150 108 A30 30 0 1 0 205 96 Q186 110 172 92 Q160 100 150 108 Z" fill="#fff7ed" stroke="${INK}" stroke-width="1.5"/>`;
    s += txt(300, 50, 'dent', { size: 13 }) + `<line x1="290" y1="58" x2="186" y2="100" stroke="${LINE}"/>`;
    s += txt(66, 34, 'dented ping-pong ball', { size: 13, anchor: 'start' }) + `<line x1="130" y1="42" x2="160" y2="88" stroke="${LINE}"/>`;
    return svg(360, 210, 'A dented ping-pong ball floating in a beaker of hot water', s);
  })();

  // Flask with a balloon on its mouth, standing in a basin of hot water.
  const FIG_BALLOON = (() => {
    let s = `<rect x="60" y="130" width="240" height="70" fill="${HOTW}"/><path d="M50 100 L50 200 L310 200 L310 100" fill="none" stroke="${INK}" stroke-width="2"/>`;
    s += `<path d="M168 60 L168 100 L130 190 L230 190 L192 100 L192 60" fill="#f1f5f9" fill-opacity="0.8" stroke="${INK}" stroke-width="2"/>`;
    s += `<path d="M166 60 Q160 30 180 22 Q200 30 194 60 Z" fill="#fca5a5" stroke="${INK}" stroke-width="1.5"/>`;
    s += txt(204, 26, 'balloon', { size: 13, anchor: 'start' });
    s += txt(240, 84, 'flask', { size: 13, anchor: 'start' }) + `<line x1="238" y1="86" x2="200" y2="110" stroke="${LINE}"/>`;
    s += txt(100, 84, 'air', { size: 13 }) + `<line x1="108" y1="90" x2="170" y2="150" stroke="${LINE}"/>`;
    s += txt(270, 176, 'hot water', { size: 13 });
    return svg(360, 215, 'An empty flask with a balloon stretched over its mouth stands in a basin of hot water', s);
  })();

  // Two sections of railway track with a gap.
  const FIG_RAIL = (() => {
    let s = `<rect x="20" y="70" width="150" height="16" fill="${METAL}" stroke="${INK}"/><rect x="182" y="70" width="158" height="16" fill="${METAL}" stroke="${INK}"/>`;
    for (let i = 0; i < 6; i++) s += `<rect x="${30 + i * 55}" y="90" width="24" height="40" fill="#b45309" stroke="#78350f"/>`;
    s += txt(176, 40, 'gap', { size: 14, bold: 1 }) + `<line x1="176" y1="50" x2="176" y2="68" stroke="${INK}"/>`;
    s += txt(95, 150, 'steel rail', { size: 13 }) + txt(260, 150, 'steel rail', { size: 13 });
    return svg(360, 170, 'Two steel rails laid end to end with a small gap between them', s);
  })();

  // Metal pot with a plastic handle on a stove flame.
  const FIG_POT = (() => {
    let s = `<path d="M90 70 L90 140 Q90 150 100 150 L220 150 Q230 150 230 140 L230 70" fill="${METAL}" stroke="${INK}" stroke-width="2"/>`;
    s += `<rect x="230" y="80" width="100" height="16" rx="7" fill="#111827"/>`;
    s += txt(280, 116, 'plastic handle', { size: 13 }) + txt(160, 108, 'metal pot', { size: 14 });
    s += `<path d="M130 168 Q138 152 146 168 Z M155 168 Q163 148 171 168 Z M180 168 Q188 152 196 168 Z" fill="#f97316"/>`;
    s += txt(160, 186, 'flame', { size: 13 });
    return svg(360, 200, 'A metal pot with a plastic handle over a flame', s);
  })();

  // Four rods in hot water, temperature sensors at the far ends.
  const FIG_RODS = (() => {
    let s = beaker(30, 90, 110, 100, HOTW, 0.7) + txt(62, 178, 'hot water', { size: 13 });
    const ends = [[295, 40, 'P'], [311, 80, 'Q'], [319, 120, 'R'], [319, 160, 'S']];   // all on a 210 px radius from (110,140): equal length
    ends.forEach(([x, y, n]) => {
      s += `<line x1="110" y1="140" x2="${x}" y2="${y}" stroke="#6b7280" stroke-width="5" stroke-linecap="round"/>`;
      s += `<rect x="${x - 6}" y="${y - 7}" width="12" height="14" fill="${BLUE}"/>` + txt(x + 22, y, n, { bold: 1, size: 16 });
    });
    s += txt(190, 22, 'sensor at the far end of each rod', { size: 13 });
    return svg(370, 200, 'Four rods, P, Q, R and S, stand in a beaker of hot water with a temperature sensor at the far end of each rod', s);
  })();
  const TBL_RODS = table(['Rod', 'Time for the far end to reach 40 °C (min)'], [['P', '3'], ['Q', '12'], ['R', '6'], ['S', '20']], 'Results');

  // Two identical cups of hot water, wrapped in materials X and Y.
  const FIG_CUPS = (() => {
    let s = '';
    [[60, 'X', '#c4b5fd'], [210, 'Y', '#fde68a']].forEach(([x, n, c]) => {
      s += `<rect x="${x - 8}" y="70" width="106" height="100" rx="6" fill="${c}" stroke="${INK}"/>`;
      s += `<rect x="${x}" y="80" width="90" height="90" fill="${HOTW}" stroke="${INK}"/>`;
      s += `<rect x="${x + 40}" y="30" width="10" height="110" rx="5" fill="#f8fafc" stroke="${INK}"/><circle cx="${x + 45}" cy="140" r="8" fill="${RED}"/>`;
      s += txt(x + 45, 190, 'wrapped in ' + n, { size: 14 });
    });
    s += txt(180, 18, 'thermometer', { size: 13 });
    return svg(360, 210, 'Two identical cups of hot water with a thermometer in each; one cup is wrapped in material X, the other in material Y', s);
  })();
  const TBL_CUPS = table(['Time (min)', 'Cup wrapped in X (°C)', 'Cup wrapped in Y (°C)'],
    [['0', '80', '80'], ['5', '70', '75'], ['10', '62', '71'], ['15', '55', '68']], 'Results');

  // Two beakers of water in a room at 30 °C.
  const FIG_BEAKERS = (() => {
    let s = beaker(50, 70, 100, 100, HOTW, 0.7) + beaker(210, 70, 100, 100, WATER, 0.7);
    s += txt(100, 190, 'P: 70 °C', { size: 14, bold: 1 }) + txt(260, 190, 'Q: 10 °C', { size: 14, bold: 1 });
    s += `<rect x="96" y="40" width="8" height="110" rx="4" fill="#f8fafc" stroke="${INK}"/><rect x="256" y="40" width="8" height="110" rx="4" fill="#f8fafc" stroke="${INK}"/>`;
    s += txt(180, 22, 'Room temperature: 30 °C', { size: 14 });
    return svg(360, 210, 'Beaker P holds 200 ml of water at 70 degrees Celsius and beaker Q holds 200 ml of water at 10 degrees Celsius, in a room at 30 degrees Celsius', s);
  })();

  SCI.registerTopic({
    id: 'heat',
    title: 'Heat',
    emoji: '🔥',
    theme: 'Energy',
    level: 'P4',
    track: 'psle',
    moeRef: 'Energy: Heat energy (P4, examined at PSLE), MOE Primary Science Syllabus 2023: the Sun is our main source of heat; heat is a form of energy and temperature is a measure of how hot or cold something is, measured with a thermometer in degrees Celsius; heat flows from a hotter to a colder object or place; gain or loss of heat changes temperature and can cause expansion or contraction; good and poor conductors of heat and their everyday uses. Level confirmed in Junyuan Pri 2026 P4 Science briefing ("Energy - Heat and Effects of Heat") and Jurong West Pri P4 Science Briefing 2026. Changes of state are left to the P5 water-cycle topic.',
    skills: {
      temperature: 'Heat and temperature',
      flow: 'Heat flow',
      expand: 'Expansion and contraction',
      conduct: 'Conductors of heat',
      fairtest: 'Fair tests and results'
    },
    misconceptions: {
      'heat-is-temp': 'Heat and temperature are the same thing.',
      'source-mixup': 'An object that only receives heat, such as the Moon or a spoon in hot soup, is a source of heat.',
      'tool-mixup': 'Mixing up measuring instruments, such as using a measuring cylinder or a balance to measure temperature.',
      'thermo-misread': 'Reading a thermometer wrongly, such as counting each small mark as 1 °C when it stands for 2 °C.',
      'gain-lose-mixup': 'Mixing up gaining heat and losing heat, such as saying something that cools down has gained heat.',
      'cold-flows': '"Cold" flows from a cold object into a warmer one.',
      'flow-cold-to-hot': 'Heat flows from a colder object or place to a hotter one.',
      'flow-forever': 'Heat keeps flowing after two objects reach the same temperature, or flows until the colder one becomes hotter.',
      'metal-is-colder': 'A metal object in the same room is at a lower temperature than a wooden or plastic one, because it feels colder.',
      'expand-on-cool': 'Objects expand when they lose heat, or contract when they gain heat.',
      'expand-mass': 'An object gains or loses mass when it expands or contracts.',
      'same-expansion': 'All materials expand by the same amount when they gain heat.',
      'other-cause': 'Giving a cause that is not about heat, such as hot water making a lid slippery or gaps being for rainwater.',
      'conductor-mixup': 'Mixing up good and poor conductors of heat, such as thinking plastic, wood or styrofoam is a good conductor.',
      'insulator-makes-heat': 'Wool, a blanket or a flask gives out heat of its own to keep things warm.',
      'insulator-only-warm': 'Poor conductors can only keep things warm; they cannot help keep cold things cold.',
      'graph-misread': 'Reading a value from the wrong axis, row or point on a graph or table.',
      'read-wrong-end': 'Picking the largest value from a table when the question needs the smallest, or the other way round.',
      'changed-measured-mixup': 'Mixing up the variable that is changed, the variable that is measured and the variables kept the same.'
    },
    notes: [
      { title: 'Sources of heat',
        body: 'The Sun is our main source of heat. Other sources: a burning fire or candle, a stove, an electric heater, our own bodies. A spoon in hot soup is NOT a source: it only receives heat from the soup.' },
      { title: 'Heat and temperature',
        body: 'Heat is a form of energy. Temperature tells us how hot or cold something is. We measure temperature with a thermometer, in degrees Celsius (°C).\nWhen something gains heat, its temperature rises. When it loses heat, its temperature falls.' },
      { title: 'Reading a thermometer',
        body: '1. Find two numbered marks.\n2. Count the small marks between them and work out how much each small mark stands for (1 °C? 2 °C?).\n3. Read where the top of the liquid is, with your eye level with it.\nRise in temperature = final temperature - starting temperature.' },
      { title: 'Heat flows from hot to cold',
        body: 'Heat always flows from a hotter object or place to a colder one. It stops flowing when both are at the same temperature.\nA cup of hot tea loses heat to the cooler air until it is at room temperature. A cold drink gains heat from the warmer air.\n"Cold" does not flow. Only heat flows.' },
      { title: 'Expansion and contraction',
        body: 'Most things expand (get bigger) when they gain heat, and contract (get smaller) when they lose heat. Solids, liquids and air all do this. The mass stays the same.\nExamples: gaps between rails and in bridges; the liquid in a thermometer rises; a dented ping-pong ball pops out in hot water; a tight metal lid loosens under hot water.\nDifferent materials expand by different amounts: metal expands more than glass for the same heating.' },
      { title: 'Good and poor conductors',
        body: 'Good conductors of heat let heat flow through them quickly: metals such as copper, steel and aluminium.\nPoor conductors let heat flow through slowly: plastic, wood, rubber, styrofoam, cloth, wool and air.' },
      { title: 'Using conductors in daily life',
        body: 'Metal pot (good conductor): heat flows quickly to the food. Plastic or wooden handle (poor conductor): the handle stays cool enough to hold.\nA flask or styrofoam cooler box slows heat flowing IN, so cold drinks stay cold, and slows heat flowing OUT, so hot drinks stay hot.\nWool traps air, and air is a poor conductor, so less body heat is lost.' },
      { title: 'Why metal feels colder',
        body: 'A metal railing and a wooden bench in the same place are at the same temperature. The metal feels colder because it is a better conductor: it carries heat away from your hand faster.' },
      { title: 'Fair tests with heat',
        body: 'Change ONE variable (for example, the wrapping material). Measure ONE thing (for example, the temperature of the water every 5 minutes). Keep the rest the same: the same cup, the same volume of water, the same starting temperature.' }
    ],
    items: [
      // ----- Heat and temperature -----
      { id: 'hea-001', type: 'mcq', level: 1, syl: 'P4', skill: 'temperature',
        stem: 'What is the main source of heat for the Earth?',
        figure: null,
        options: ['The Sun', 'The Moon', 'The sea', 'The clouds'],
        answer: 0,
        miscon: { 1: 'source-mixup', 2: 'source-mixup', 3: 'source-mixup' },
        optionFeedback: {
          1: 'The Moon gives out no heat or light of its own. Which object in the sky gives us heat every day?',
          2: 'The sea gets warm because it receives heat. Where does that heat come from?',
          3: 'Clouds can block heat, but they do not give it out. Look up on a sunny day.' },
        explain: 'The Sun is our main source of heat (and light). The sea and the clouds only receive heat.' },
      { id: 'hea-002', type: 'mcq', level: 1, syl: 'P4', skill: 'temperature',
        stem: 'Nurul wants to find out how hot the water in a basin is. Which instrument should she use?',
        figure: null,
        options: ['A measuring cylinder', 'A thermometer', 'An electronic balance', 'A ruler'],
        answer: 1,
        miscon: { 0: 'tool-mixup', 2: 'tool-mixup', 3: 'tool-mixup' },
        optionFeedback: {
          0: 'A measuring cylinder measures volume. Which instrument has a scale in °C?',
          2: 'An electronic balance measures mass. How hot something is needs a different instrument.',
          3: 'A ruler measures length. Which instrument has a scale in °C?' },
        explain: 'A thermometer measures temperature, in degrees Celsius (°C).' },
      { id: 'hea-003', type: 'mcq', level: 1, syl: 'P4', skill: 'temperature',
        stem: 'Which statement about heat and temperature is correct?',
        figure: null,
        options: ['Heat and temperature mean the same thing.', 'Temperature is a form of energy.', 'Heat is a form of energy.', 'Heat tells us how hot or cold something is.'],
        answer: 2,
        miscon: { 0: 'heat-is-temp', 1: 'heat-is-temp', 3: 'heat-is-temp' },
        optionFeedback: {
          0: 'They are linked but different. One is energy; the other tells how hot or cold something is.',
          1: 'Temperature tells how hot or cold something is. Which one is the energy?',
          3: 'That describes temperature. Heat is the energy that flows.' },
        explain: 'Heat is a form of energy. Temperature is a measure of how hot or cold something is.' },
      { id: 'hea-004', type: 'mcq', level: 2, syl: 'P4', skill: 'temperature',
        stem: 'What temperature does the thermometer show?',
        figure: FIG_THERMO_34,
        options: ['32 °C', '34 °C', '36 °C', '40 °C'],
        answer: 1,
        miscon: { 0: 'thermo-misread', 2: 'thermo-misread', 3: 'thermo-misread' },
        technique: 'Count, then check',
        steps: ['Find the numbered mark just below the top of the liquid: 30.', 'Each small mark stands for 2 °C.', 'Count the small marks above 30, then add 2 °C for each.', 'Check: is the answer between 30 and 40?'],
        optionFeedback: {
          0: 'You counted 2 marks above 30. Each small mark is 2 °C, not 1 °C.',
          2: 'Count again: the liquid is 2 small marks above 30, and each mark is 2 °C.',
          3: 'The liquid has not reached the 40 mark. Count the small marks above 30.' },
        explain: 'The liquid is 2 small marks above 30. Each small mark is 2 °C, so the reading is 30 + 4 = 34 °C.' },
      { id: 'hea-005', type: 'mcq', level: 2, syl: 'P4', skill: 'temperature',
        stem: 'The temperature of a cup of tea fell from 80 °C to 35 °C. What happened to the tea?',
        figure: null,
        options: ['It lost heat.', 'It gained heat.', 'It gained cold.', 'Its heat stayed the same.'],
        answer: 0,
        miscon: { 1: 'gain-lose-mixup', 2: 'cold-flows', 3: 'heat-is-temp' },
        optionFeedback: {
          1: 'Gaining heat makes the temperature rise. Here it fell.',
          2: '"Cold" is not something that flows. Only heat flows. What does a falling temperature tell you?',
          3: 'If the temperature changed, the amount of heat changed too.' },
        explain: 'Its temperature fell, so the tea lost heat (to the cooler air around it).' },
      { id: 'hea-006', type: 'mcq', level: 2, syl: 'P4', skill: 'temperature',
        stem: 'Ravi heated some water. The thermometers show the water before heating and after 5 minutes. By how much did the temperature rise?',
        figure: FIG_TWO_THERMO,
        options: ['82 °C', '58 °C', '24 °C', '34 °C'],
        answer: 3,
        miscon: { 0: 'graph-misread', 1: 'graph-misread', 2: 'graph-misread' },
        technique: 'Count, then check',
        steps: ['Read the first thermometer: each small mark is 2 °C.', 'Read the second thermometer the same way.', 'Rise = after - before.', 'Check: is the rise smaller than the final reading?'],
        optionFeedback: {
          0: 'That adds the two readings. A rise is the difference: subtract.',
          1: '58 °C is the temperature after heating, not the rise.',
          2: '24 °C is the starting temperature. How much higher did it go?' },
        explain: 'Before: 24 °C. After: 58 °C. Rise = 58 - 24 = 34 °C.' },

      // ----- Heat flow -----
      { id: 'hea-007', type: 'mcq', level: 2, syl: 'P4', skill: 'flow',
        stem: 'A hot metal block is put into a beaker of cool water. Which statement is correct?',
        figure: null,
        options: ['Heat flows from the water to the block until the block is cold.', 'Cold flows from the water to the block until they are equal.', 'Heat flows from the block to the water until both are equally hot.', 'Heat flows from the block to the water until the water is hotter.'],
        answer: 2,
        miscon: { 0: 'flow-cold-to-hot', 1: 'cold-flows', 3: 'flow-forever' },
        optionFeedback: {
          0: 'Heat flows from the hotter object to the colder one. Which is hotter here?',
          1: '"Cold" does not flow. Think about which way the heat goes.',
          3: 'Heat stops flowing once both are at the same temperature. The water never ends up hotter than the block.' },
        explain: 'Heat flows from the hotter block to the cooler water until both are at the same temperature.' },
      { id: 'hea-008', type: 'mcq', level: 2, syl: 'P4', skill: 'flow',
        stem: 'Mei puts some ice cubes into a glass of orange juice. The juice becomes cooler. Why?',
        figure: null,
        options: ['The ice cubes give cold to the juice.', 'The juice loses heat to the ice cubes.', 'The juice gains heat from the ice cubes.', 'The ice cubes give heat to the juice.'],
        answer: 1,
        miscon: { 0: 'cold-flows', 2: 'flow-cold-to-hot', 3: 'flow-cold-to-hot' },
        optionFeedback: {
          0: '"Cold" does not flow. Ask: which is hotter, the juice or the ice?',
          2: 'Gaining heat would make the juice warmer. Heat flows from the hotter juice to the colder ice.',
          3: 'Heat flows from hotter to colder. The ice is colder, so it receives heat.' },
        explain: 'The juice is hotter than the ice, so heat flows from the juice to the ice. The juice loses heat, so it becomes cooler.' },
      { id: 'hea-009', type: 'mcq', level: 2, syl: 'P4', skill: 'flow',
        stem: 'Kumar left a cup of hot water on a table. The graph shows its temperature. What is most likely the temperature of the room?',
        figure: GRAPH_COOL,
        options: ['0 °C', '50 °C', '30 °C', '80 °C'],
        answer: 2,
        miscon: { 0: 'graph-misread', 1: 'graph-misread', 3: 'graph-misread' },
        technique: 'Read, compare, conclude',
        steps: ['Read: where does the line stop falling?', 'Compare: why would it stop falling there?', 'Conclude: the water stops losing heat when it reaches the temperature of the room.'],
        optionFeedback: {
          0: '0 °C is the bottom of the axis, not a reading. Where does the line level off?',
          1: 'At 50 °C the water is still cooling. Look where the line stops falling.',
          3: '80 °C is where the water started. Where does it end up?' },
        explain: 'The water cools until it is at the same temperature as the room, then stays there. The line levels off at 30 °C.' },
      { id: 'hea-010', type: 'mcq', level: 3, syl: 'P4', skill: 'flow',
        stem: 'Jun puts a metal spoon into a bowl of hot soup. Which statements are correct?\nA: Heat flows from the soup to the spoon.\nB: The temperature of the spoon rises.\nC: The soup gains heat from the spoon.\nD: The handle of the spoon becomes warmer.',
        figure: null,
        options: ['A and B only', 'C and D only', 'A, B and D only', 'B, C and D only'],
        answer: 2,
        miscon: { 0: 'conductor-mixup', 1: 'flow-cold-to-hot', 3: 'flow-cold-to-hot' },
        technique: 'Tick or cross',
        steps: ['Which is hotter at the start, the soup or the spoon?', 'Tick each statement where heat goes from hot to cold.', 'Metal is a good conductor: does heat travel up to the handle?', 'Choose the option with only the ticks.'],
        optionFeedback: {
          0: 'A and B are right. Metal is a good conductor, so heat also travels up to the handle (D).',
          1: 'D is right, but C has heat flowing from the cooler spoon to the hotter soup.',
          3: 'B and D are right. C has heat flowing the wrong way: the soup is the hotter one.' },
        explain: 'A, B and D. Heat flows from the hot soup into the cooler spoon, so the spoon\'s temperature rises, and the metal carries heat up to the handle. The soup loses heat; it does not gain it.' },
      { id: 'hea-011', type: 'mcq', level: 3, syl: 'P4', skill: 'flow',
        stem: 'Beaker P has water at 70 °C and beaker Q has water at 10 °C. Both are left in a room at 30 °C for a long time. Which statements are correct?\nA: The water in P loses heat to the surroundings.\nB: The water in Q gains heat from the surroundings.\nC: In the end, both are at 30 °C.\nD: In the end, the water in Q is hotter than the water in P.',
        figure: FIG_BEAKERS,
        options: ['A, B and C only', 'A and C only', 'B and D only', 'A, B, C and D'],
        answer: 0,
        miscon: { 1: 'gain-lose-mixup', 2: 'flow-forever', 3: 'flow-forever' },
        technique: 'Tick or cross',
        steps: ['Compare each beaker with the room: hotter or colder?', 'Heat flows from hotter to colder: tick A and B if they match.', 'When does the heat stop flowing?', 'Choose the option with only the ticks.'],
        optionFeedback: {
          1: 'A and C are right. Q is colder than the room, so it gains heat from the surroundings too.',
          2: 'B is right, but heat stops flowing at the same temperature, so Q never becomes hotter than P.',
          3: 'A, B and C are right. Heat stops flowing once both reach room temperature, so D cannot happen.' },
        explain: 'A, B and C. P is hotter than the room, so it loses heat; Q is colder, so it gains heat. Both end at room temperature, 30 °C.' },

      // ----- Expansion and contraction -----
      { id: 'hea-012', type: 'mcq', level: 1, syl: 'P4', skill: 'expand',
        stem: 'When a metal rod gains heat, what usually happens to it?',
        figure: null,
        options: ['It contracts.', 'It gains mass.', 'It loses mass.', 'It expands.'],
        answer: 3,
        miscon: { 0: 'expand-on-cool', 1: 'expand-mass', 2: 'expand-mass' },
        optionFeedback: {
          0: 'Contracting happens when something loses heat. This rod is gaining heat.',
          1: 'No matter is added to the rod. Think about its size.',
          2: 'No matter leaves the rod. Think about its size.' },
        explain: 'Most solids expand (get slightly bigger) when they gain heat. The mass stays the same.' },
      { id: 'hea-013', type: 'mcq', level: 2, syl: 'P4', skill: 'expand',
        stem: 'Small gaps are left between sections of steel railway track, as shown. Why?',
        figure: FIG_RAIL,
        options: ['So rainwater can drain away', 'So the rails can contract on hot days', 'So the rails can expand on hot days', 'So the track is lighter'],
        answer: 2,
        miscon: { 0: 'other-cause', 1: 'expand-on-cool', 3: 'other-cause' },
        optionFeedback: {
          0: 'Rainwater can drain off the sides. Think about what happens to steel on a hot day.',
          1: 'On a hot day the rails gain heat. Do they get longer or shorter?',
          3: 'A tiny gap hardly changes the mass. Think about what heat does to steel.' },
        explain: 'On hot days the rails gain heat and expand. The gaps give them room to expand so the track does not bend.' },
      { id: 'hea-014', type: 'mcq', level: 2, syl: 'P4', skill: 'expand',
        stem: 'A dented ping-pong ball is put into hot water, as shown. What happens?',
        figure: FIG_PINGPONG,
        options: ['The dent pops out, as the air inside gains heat and expands.', 'The dent pops out, as hot water enters the ball and fills it.', 'The dent gets deeper, as the air inside gains heat and contracts.', 'The dent pops out, as the air inside loses heat and expands.'],
        answer: 0,
        miscon: { 1: 'other-cause', 2: 'expand-on-cool', 3: 'gain-lose-mixup' },
        optionFeedback: {
          1: 'The ball is sealed: no water gets in. What is inside the ball already?',
          2: 'Gaining heat makes air expand, not contract.',
          3: 'The water is hot, so does the air gain or lose heat?' },
        explain: 'The air inside the ball gains heat from the hot water and expands. It pushes the dented part back out.' },
      { id: 'hea-015', type: 'mcq', level: 2, syl: 'P4', skill: 'expand',
        stem: 'Lina put an empty flask with a balloon on its mouth into a basin of hot water. The balloon became bigger. Why?',
        figure: FIG_BALLOON,
        options: ['The air in the flask lost heat and contracted.', 'The hot water gave the air more mass.', 'Hot water flowed into the balloon.', 'The air in the flask gained heat and expanded.'],
        answer: 3,
        miscon: { 0: 'gain-lose-mixup', 1: 'expand-mass', 2: 'other-cause' },
        optionFeedback: {
          0: 'The water is hot, so the air gains heat. And contracting would make the balloon smaller.',
          1: 'No air was added, so the mass stayed the same. Think about the space the air takes up.',
          2: 'The water stays in the basin. What is inside the flask?' },
        explain: 'The air in the flask gained heat from the hot water and expanded. It took up more space and pushed into the balloon.' },
      { id: 'hea-016', type: 'mcq', level: 3, syl: 'P4', skill: 'expand',
        stem: 'The metal lid of a glass jar is stuck. Mum runs hot water over the lid, and then it opens easily. What is the best explanation?',
        figure: null,
        options: ['The hot water makes the lid slippery.', 'The metal lid contracts and becomes loose.', 'The glass jar expands more than the metal lid.', 'The metal lid expands more than the glass jar.'],
        answer: 3,
        miscon: { 0: 'other-cause', 1: 'expand-on-cool', 2: 'same-expansion' },
        optionFeedback: {
          0: 'Wet hands would make it harder, not easier. What does heat do to the metal lid?',
          1: 'The lid gains heat. Does it expand or contract?',
          2: 'If the jar grew more than the lid, the lid would grip even more tightly.' },
        explain: 'The metal lid gains heat and expands more than the glass jar, so the lid becomes looser.' },
      { id: 'hea-017', type: 'mcq', level: 2, syl: 'P4', skill: 'expand',
        stem: 'Why does the liquid in a thermometer rise when the thermometer is put into hot water?',
        figure: null,
        options: ['The liquid gains mass.', 'The liquid loses heat and expands.', 'The glass tube contracts and squeezes the liquid.', 'The liquid gains heat and expands.'],
        answer: 3,
        miscon: { 0: 'expand-mass', 1: 'gain-lose-mixup', 2: 'expand-on-cool' },
        optionFeedback: {
          0: 'No liquid is added. The same liquid takes up more space.',
          2: 'The glass gains heat too, so it would not contract.',
          1: 'In hot water the liquid gains heat. Which way does heat flow?' },
        explain: 'The liquid gains heat from the hot water and expands, so it moves up the narrow tube.' },
      { id: 'hea-018', type: 'mcq', level: 3, syl: 'P4', skill: 'expand',
        stem: 'Which of these are examples of contraction?\nA: Overhead cables sag more on a hot afternoon.\nB: A balloon gets smaller when taken into a cold, air-conditioned room.\nC: The liquid in a thermometer falls when put into ice water.\nD: A dented ping-pong ball becomes round in hot water.',
        figure: null,
        options: ['A and D only', 'A, B and C only', 'B and C only', 'B, C and D only'],
        answer: 2,
        miscon: { 0: 'expand-on-cool', 1: 'expand-on-cool', 3: 'expand-on-cool' },
        technique: 'Tick or cross',
        steps: ['For each one: is the thing gaining or losing heat?', 'Losing heat means contracting: tick it.', 'Gaining heat means expanding: cross it.', 'Choose the option with only the ticks.'],
        optionFeedback: {
          0: 'A and D both gain heat, so they show expansion. Look for things that lose heat.',
          1: 'B and C are right. In A the cables gain heat and get longer: that is expansion.',
          3: 'B and C are right. In D the air in the ball gains heat and expands.' },
        explain: 'B and C lose heat and contract. A (longer, sagging cables) and D (ball pops out) show expansion.' },

      // ----- Conductors of heat -----
      { id: 'hea-019', type: 'mcq', level: 1, syl: 'P4', skill: 'conduct',
        stem: 'Which of these is a good conductor of heat?',
        figure: null,
        options: ['Copper', 'Plastic', 'Wood', 'Styrofoam'],
        answer: 0,
        miscon: { 1: 'conductor-mixup', 2: 'conductor-mixup', 3: 'conductor-mixup' },
        optionFeedback: {
          2: 'Wood is used for spoon handles because it is a poor conductor. Look for a metal.',
          1: 'Plastic is a poor conductor of heat. Look for a metal.',
          3: 'Styrofoam is used in cooler boxes because it is a poor conductor. Look for a metal.' },
        explain: 'Copper is a metal. Metals are good conductors of heat.' },
      { id: 'hea-020', type: 'mcq', level: 2, syl: 'P4', skill: 'conduct',
        stem: 'Why is this metal pot fitted with a plastic handle?',
        figure: FIG_POT,
        options: ['Plastic is a good conductor of heat.', 'Plastic is a poor conductor of heat.', 'Plastic makes the pot heat up faster.', 'Plastic gives out cold to cool the hand.'],
        answer: 1,
        miscon: { 0: 'conductor-mixup', 2: 'conductor-mixup', 3: 'cold-flows' },
        optionFeedback: {
          0: 'A good conductor would carry heat to your hand quickly. Is that what we want in a handle?',
          2: 'The handle is outside the flame. Its job is to stay cool enough to hold.',
          3: '"Cold" does not flow. Think about how fast heat travels through plastic.' },
        explain: 'Plastic is a poor conductor of heat, so little heat flows through the handle and it stays cool enough to hold.' },
      { id: 'hea-021', type: 'mcq', level: 2, syl: 'P4', skill: 'conduct',
        stem: 'Hafiz stood four rods of the same length and thickness, made of different materials, P, Q, R and S, in the same hot water. He timed how long the far end of each rod took to reach 40 °C. Which rod is the best conductor of heat?',
        figure: stack(FIG_RODS, TBL_RODS),
        options: ['P', 'Q', 'R', 'S'],
        answer: 0,
        miscon: { 1: 'graph-misread', 2: 'graph-misread', 3: 'read-wrong-end' },
        technique: 'Read, compare, conclude',
        steps: ['Read: what was measured? The time to reach 40 °C.', 'Compare: which rod took the shortest time?', 'Conclude: heat flows fastest through the best conductor.'],
        optionFeedback: {
          1: 'Q took 12 minutes. Find the rod whose far end heated up soonest.',
          2: 'R is in the middle. Find the rod whose far end heated up soonest.',
          3: 'S took the LONGEST time, so heat flowed through it most slowly.' },
        explain: 'Rod P reached 40 °C in the shortest time (3 min), so heat flowed through it fastest: it is the best conductor.' },
      { id: 'hea-022', type: 'mcq', level: 3, syl: 'P4', skill: 'conduct',
        stem: 'Using Hafiz\'s results, which rod would make the best handle for a frying pan?',
        figure: stack(FIG_RODS, TBL_RODS),
        options: ['P', 'Q', 'R', 'S'],
        answer: 3,
        miscon: { 0: 'conductor-mixup', 1: 'graph-misread', 2: 'graph-misread' },
        technique: 'Read, compare, conclude',
        steps: ['A handle should stay cool: we want a poor conductor.', 'Read: which rod took the longest to heat up?', 'Conclude: that rod lets heat through most slowly.'],
        optionFeedback: {
          0: 'P heats up fastest. A handle made of P would soon be too hot to hold.',
          1: 'Q is slow, but one rod took even longer to heat up.',
          2: 'R heated up in only 6 minutes. Look for the slowest rod.' },
        explain: 'Rod S took the longest time (20 min) to heat up, so it is the poorest conductor and would keep the handle coolest.' },
      { id: 'hea-023', type: 'mcq', level: 2, syl: 'P4', skill: 'conduct',
        stem: 'At night, a metal railing and a wooden bench at the same void deck are both at 27 °C. The railing feels colder to touch. Why?',
        figure: null,
        options: ['The metal railing is at a lower temperature.', 'The metal railing gives out cold to the hand.', 'Metal carries heat away from the hand faster.', 'The wooden bench gives out its own heat.'],
        answer: 2,
        miscon: { 0: 'metal-is-colder', 1: 'cold-flows', 3: 'insulator-makes-heat' },
        optionFeedback: {
          0: 'The stem says both are at 27 °C. Feeling colder is not the same as being colder.',
          1: '"Cold" does not flow. Which way does heat flow between your warm hand and the railing?',
          3: 'Wood does not make heat. Think about how fast heat leaves your hand on each material.' },
        explain: 'Both are at 27 °C. Metal is a better conductor, so heat flows from the hand into the metal faster and the hand feels colder.' },
      { id: 'hea-024', type: 'mcq', level: 2, syl: 'P4', skill: 'conduct',
        stem: 'Siti pours cold milk into a vacuum flask. The milk stays cold for many hours. Why?',
        figure: null,
        options: ['The flask slows heat flowing from the surroundings into the milk.', 'The flask gives out cold to the milk.', 'The flask makes heat flow out of the milk faster.', 'The flask is a good conductor of heat.'],
        answer: 0,
        miscon: { 1: 'cold-flows', 2: 'flow-cold-to-hot', 3: 'conductor-mixup' },
        optionFeedback: {
          1: '"Cold" does not flow. Ask which is warmer, the milk or the air outside.',
          2: 'The milk is colder than the air, so heat flows INTO the milk, not out.',
          3: 'A good conductor would let heat in quickly and warm the milk.' },
        explain: 'The surroundings are warmer than the milk. The flask is a poor conductor of heat, so it slows the heat flowing in.' },
      { id: 'hea-025', type: 'mcq', level: 2, syl: 'P4', skill: 'conduct',
        stem: 'On a cold trip, a woollen sweater helps keep Daniel warm. Why?',
        figure: null,
        options: ['Wool makes heat of its own.', 'Wool traps air, a poor conductor of heat.', 'Wool lets heat flow in from the cold air.', 'Wool is a good conductor of heat.'],
        answer: 1,
        miscon: { 0: 'insulator-makes-heat', 2: 'flow-cold-to-hot', 3: 'conductor-mixup' },
        optionFeedback: {
          0: 'A sweater on a chair stays at room temperature. Wool does not make heat.',
          2: 'Heat flows from hotter to colder: from Daniel\'s body to the cold air.',
          3: 'A good conductor would let body heat escape quickly.' },
        explain: 'Wool traps air. Wool and air are poor conductors, so less heat is lost from Daniel\'s body to the cold surroundings.' },
      { id: 'hea-026', type: 'mcq', level: 3, syl: 'P4', skill: 'fairtest',
        stem: 'Wei Jie filled two identical cups with the same volume of water at 80 °C. He wrapped one cup in material X and the other in material Y. Which material is better at keeping the water hot, and why?',
        figure: stack(FIG_CUPS, TBL_CUPS),
        options: ['X, because its water cooled more.', 'Y, because its water lost heat more slowly.', 'X, because it is the better conductor.', 'Y, because it gave heat to the water.'],
        answer: 1,
        miscon: { 0: 'read-wrong-end', 2: 'conductor-mixup', 3: 'insulator-makes-heat' },
        technique: 'Read, compare, conclude',
        steps: ['Read: what was the temperature of each cup after 15 minutes?', 'Compare: which cup lost less heat?', 'Conclude: the poorer conductor slows heat loss.'],
        optionFeedback: {
          0: 'Cooling more means it lost more heat, so X kept the water hot less well.',
          2: 'A better conductor lets heat escape faster. That is not what we want here.',
          3: 'Wrapping materials do not make heat. They only slow down heat loss.' },
        explain: 'After 15 minutes the water in Y was 68 °C and in X only 55 °C. Y slowed the heat loss more, so it is the poorer conductor and better at keeping the water hot.' },
      { id: 'hea-027', type: 'mcq', level: 2, syl: 'P4', skill: 'fairtest',
        stem: 'Wei Jie is testing which wrapping material keeps water hot longer. Which of these must he keep the same?\nA: the volume of water\nB: the starting temperature of the water\nC: the type of wrapping material\nD: the size of the cup',
        figure: FIG_CUPS,
        options: ['A and B only', 'A, B and D only', 'B, C and D only', 'A, B, C and D'],
        answer: 1,
        miscon: { 0: 'changed-measured-mixup', 2: 'changed-measured-mixup', 3: 'changed-measured-mixup' },
        technique: 'Change one thing',
        steps: ['What does he change on purpose? The wrapping material.', 'What does he measure? The temperature of the water.', 'Everything else that could affect the result stays the same.'],
        optionFeedback: {
          0: 'A and B are right. A bigger cup could change the result too, so D must be kept the same.',
          2: 'B and D are right, but the material (C) is the one thing he changes on purpose.',
          3: 'The material (C) is the variable he changes. The others stay the same.' },
        explain: 'He changes the wrapping material (C). The volume of water (A), the starting temperature (B) and the size of the cup (D) must stay the same.' },

      // ----- OEQ -----
      { id: 'hea-028', type: 'oeq', level: 1, marks: 2, syl: 'P4', skill: 'temperature',
        stem: 'Explain the difference between heat and temperature.',
        figure: null,
        model: 'Heat is a form of energy. Temperature is a measure of how hot or cold something is.',
        keys: [['form of energy', 'energy'], ['how hot or cold', 'hotness', 'how hot']],
        watchFor: ['heat-is-temp'],
        technique: 'Claim, evidence, reason',
        steps: ['Say what heat is.', 'Say what temperature tells us.', 'Write them as two separate sentences.'],
        explain: 'One mark: heat is a form of energy. One mark: temperature is how hot or cold something is.' },
      { id: 'hea-029', type: 'oeq', level: 2, marks: 2, syl: 'P4', skill: 'temperature',
        stem: 'Ravi heated some water. The thermometers show its temperature before heating and after 5 minutes. By how much did the temperature change, and did the water gain or lose heat?',
        figure: FIG_TWO_THERMO,
        model: 'The temperature rose by 34 °C, from 24 °C to 58 °C, so the water gained heat.',
        keys: [['34 °C', '34'], ['gained heat', 'gain heat', 'gains heat']],
        watchFor: ['thermo-misread', 'gain-lose-mixup'],
        technique: 'Count, then check',
        steps: ['Each small mark is 2 °C. Read both thermometers.', 'Change = after - before.', 'Did the temperature go up or down? Then say gain or lose.'],
        explain: 'One mark for 34 °C (58 - 24). One mark for gained heat, since the temperature rose.' },
      { id: 'hea-030', type: 'oeq', level: 2, marks: 2, syl: 'P4', skill: 'flow', chain: true,
        stem: 'Mrs Tan puts a hot boiled egg into a bowl of tap water. After a while the egg is cooler. Explain why.',
        figure: null,
        model: 'The egg is hotter than the water, so heat flows from the egg to the water. The egg loses heat, so its temperature falls.',
        keys: [['heat flows from the egg', 'egg gives heat to the water', 'water gains heat from the egg'], ['loses heat', 'lost heat']],
        watchFor: ['cold-flows', 'flow-cold-to-hot'],
        technique: 'Follow the arrows',
        steps: ['Which is hotter, the egg or the water?', 'Which way does heat flow?', 'So does the egg gain or lose heat?'],
        explain: 'In order: heat flows from the hotter egg to the water -> the egg loses heat (its temperature falls).' },
      { id: 'hea-031', type: 'oeq', level: 3, marks: 3, syl: 'P4', skill: 'flow', chain: true,
        stem: 'Kumar left a cup of hot water on a table. The graph shows its temperature. Explain why the temperature stopped falling after 25 minutes.',
        figure: GRAPH_COOL,
        model: 'The water lost heat to the surroundings until it reached the same temperature as the surroundings, 30 °C. Then no more heat flowed, so its temperature stayed the same.',
        keys: [['lost heat', 'loses heat', 'gave heat to the air'], ['same temperature as the surroundings', 'same temperature as the room', 'same temperature as the air', 'room temperature'], ['no more heat flowed', 'heat stopped flowing', 'no heat flows', 'no more heat']],
        watchFor: ['flow-forever'],
        technique: 'Follow the arrows',
        steps: ['Where does the heat from the hot water go?', 'When does heat stop flowing between two things?', 'So what happens to the temperature after that?'],
        explain: 'In order: the water lost heat to the surroundings -> it reached room temperature (30 °C) -> no more heat flowed, so the temperature stayed the same.' },
      { id: 'hea-032', type: 'oeq', level: 2, marks: 3, syl: 'P4', skill: 'expand', chain: true,
        stem: 'Look at the gap between the two steel rails. Explain why railway tracks are laid with gaps like this.',
        figure: FIG_RAIL,
        model: 'On a hot day the rails gain heat. They expand and become longer. The gaps give them space to expand, so the rails do not bend.',
        keys: [['gain heat', 'gains heat', 'heated', 'get hot'], ['expand', 'become longer'], ['do not bend', 'not bend', 'buckle', 'not push against each other']],
        watchFor: ['expand-on-cool', 'other-cause'],
        technique: 'Follow the arrows',
        steps: ['What happens to the rails on a hot day?', 'What does steel do when it gains heat?', 'What would happen with no gap?'],
        explain: 'In order: the rails gain heat -> they expand -> the gap stops them from bending.' },
      { id: 'hea-033', type: 'oeq', level: 2, marks: 3, syl: 'P4', skill: 'expand', chain: true,
        stem: 'Lina put an empty flask with a balloon on its mouth into a basin of hot water. The balloon became bigger. Explain why.',
        figure: FIG_BALLOON,
        model: 'The air in the flask gains heat from the hot water. The air expands and takes up more space, so some of it moves up and pushes into the balloon.',
        keys: [['gains heat', 'gained heat', 'heat flows from the hot water'], ['expands', 'expand'], ['takes up more space', 'pushes into the balloon', 'moves into the balloon']],
        watchFor: ['gain-lose-mixup', 'expand-mass'],
        technique: 'Follow the arrows',
        steps: ['What is inside the "empty" flask?', 'What does the air gain from the hot water?', 'What does the air do when it gains heat?', 'Where does the extra air go?'],
        explain: 'In order: air gains heat -> air expands -> it takes up more space and pushes into the balloon.' },
      { id: 'hea-034', type: 'oeq', level: 3, marks: 3, syl: 'P4', skill: 'expand', chain: true,
        stem: 'The metal lid of a glass jar is stuck. After Mum runs hot water over the lid, it opens easily. Explain why.',
        figure: null,
        model: 'The metal lid gains heat from the hot water. The metal lid expands more than the glass jar. So the lid becomes looser and is easier to turn.',
        keys: [['gains heat', 'gain heat', 'heated'], ['expands', 'expand', 'gets bigger'], ['looser', 'loose', 'less tight']],
        watchFor: ['expand-on-cool', 'same-expansion', 'other-cause'],
        technique: 'Follow the arrows',
        steps: ['What does the lid gain from the hot water?', 'What does metal do when it gains heat?', 'Compare the lid with the glass: which grows more?', 'So what happens to the grip of the lid?'],
        explain: 'In order: the lid gains heat -> it expands (more than the glass) -> it becomes looser.' },
      { id: 'hea-035', type: 'oeq', level: 3, marks: 3, syl: 'P4', skill: 'expand', chain: true,
        stem: 'Workers put up overhead electric cables on a hot afternoon. They leave the cables hanging loosely instead of pulling them tight. Explain why.',
        figure: null,
        model: 'At night or on a cool day the cables lose heat. They contract and become shorter. If the cables were pulled tight, they could snap or pull on the poles.',
        keys: [['lose heat', 'loses heat', 'cool down'], ['contract', 'become shorter', 'get shorter'], ['snap', 'break', 'pull on the poles', 'pull down the poles']],
        watchFor: ['expand-on-cool'],
        technique: 'Follow the arrows',
        steps: ['Later, at night, is the air cooler or hotter?', 'Do the cables gain or lose heat?', 'What happens to their length?', 'What could happen to a tight cable that gets shorter?'],
        explain: 'In order: the cables lose heat when it is cooler -> they contract -> tight cables could snap, so they are left loose.' },
      { id: 'hea-036', type: 'oeq', level: 3, marks: 4, syl: 'P4', skill: 'expand', chain: true,
        stem: 'Ah Boy puts a dented ping-pong ball into hot water.\n(a) What happens to the dent? (1 mark)\n(b) Explain why. (3 marks)',
        figure: FIG_PINGPONG,
        model: '(a) The dent pops out. (b) The air inside the ball gains heat from the hot water. The air expands and pushes the dented part outwards.',
        keys: [['pops out', 'disappears', 'goes back', 'becomes round', 'regains its shape'], ['gains heat', 'gained heat'], ['expands', 'expand'], ['pushes the dented part outwards', 'pushes outwards', 'pushes out', 'pushes the dent']],
        watchFor: ['expand-on-cool', 'other-cause'],
        technique: 'Follow the arrows',
        steps: ['(a) Predict what you would see.', '(b) What is inside the ball?', 'What does the air gain from the hot water, and what does it then do?', 'How does that change the dent?'],
        explain: '(a) The dent pops out (1). (b) In order: air inside gains heat (1) -> air expands (1) -> it pushes the dent outwards (1).' },
      { id: 'hea-037', type: 'oeq', level: 1, marks: 2, syl: 'P4', skill: 'conduct',
        stem: 'Name one good conductor of heat and one poor conductor of heat.',
        figure: null,
        model: 'Good conductor: copper (or another metal such as steel, iron or aluminium). Poor conductor: plastic (or wood, rubber, styrofoam, wool or air).',
        keys: [['copper', 'steel', 'iron', 'aluminium', 'metal', 'silver', 'gold'], ['plastic', 'wood', 'rubber', 'styrofoam', 'wool', 'air', 'cloth', 'cork']],
        watchFor: ['conductor-mixup'],
        technique: 'Tick or cross',
        steps: ['Think of a cooking pot: what is the body made of?', 'Think of its handle: what is that made of?', 'Write one of each, and check each is in the right group.'],
        explain: 'One mark for any metal as the good conductor. One mark for any poor conductor (plastic, wood, rubber, styrofoam, wool, cloth, air).' },
      { id: 'hea-038', type: 'oeq', level: 2, marks: 4, syl: 'P4', skill: 'conduct',
        stem: 'Look at the pot. Explain why the pot is made of metal, and why the handle is made of plastic.',
        figure: FIG_POT,
        model: 'Metal is a good conductor of heat, so heat flows quickly from the flame to the food and it cooks faster. Plastic is a poor conductor of heat, so the handle does not get too hot to hold.',
        keys: [['good conductor'], ['flows quickly', 'cooks faster', 'heats up quickly', 'heats the food quickly'], ['poor conductor', 'insulator'], ['does not get too hot', 'not too hot', 'safe to hold', 'will not burn', 'stays cool']],
        watchFor: ['conductor-mixup'],
        technique: 'Claim, evidence, reason',
        steps: ['Is metal a good or poor conductor of heat?', 'How does that help the cooking?', 'Is plastic a good or poor conductor?', 'How does that help the person holding it?'],
        explain: 'Metal: good conductor (1) so heat reaches the food quickly (1). Plastic: poor conductor (1) so the handle does not get too hot to hold (1).' },
      { id: 'hea-039', type: 'oeq', level: 2, marks: 2, syl: 'P4', skill: 'conduct', chain: true,
        stem: 'A metal railing and a wooden bench at a bus stop are both at 28 °C. When Priya touches them, the railing feels colder. Explain why.',
        figure: null,
        model: 'Metal is a better conductor of heat than wood. So heat flows from her hand to the railing faster, and her hand loses heat more quickly.',
        keys: [['better conductor', 'good conductor'], ['heat flows from her hand to the railing faster', 'her hand loses heat faster', 'heat flows from her hand faster', 'takes heat away from her hand faster']],
        watchFor: ['metal-is-colder', 'cold-flows'],
        technique: 'Follow the arrows',
        steps: ['They are at the same temperature, so look for another difference.', 'Which material is the better conductor?', 'So from which one does heat leave her hand faster?'],
        explain: 'In order: metal is the better conductor -> heat flows from her hand into it faster, so it feels colder.' },
      { id: 'hea-040', type: 'oeq', level: 2, marks: 2, syl: 'P4', skill: 'conduct', chain: true,
        stem: 'A cooler box has thick styrofoam walls. Explain how it keeps canned drinks cold on a hot day.',
        figure: null,
        model: 'Styrofoam is a poor conductor of heat. It slows down heat flowing from the warm surroundings into the drinks.',
        keys: [['poor conductor', 'insulator', 'bad conductor'], ['slows down heat', 'slows heat', 'less heat', 'heat flows in more slowly']],
        watchFor: ['insulator-only-warm', 'cold-flows'],
        technique: 'Follow the arrows',
        steps: ['Is styrofoam a good or poor conductor of heat?', 'Which is warmer, the air outside or the drinks?', 'So which way would heat flow, and what does styrofoam do to it?'],
        explain: 'In order: styrofoam is a poor conductor -> it slows heat flowing in from the warm surroundings, so the drinks stay cold.' },
      { id: 'hea-041', type: 'oeq', level: 3, marks: 3, syl: 'P4', skill: 'conduct',
        stem: 'Ali says, "My woollen blanket keeps me warm because it gives out heat." Is he right? Explain your answer.',
        figure: null,
        model: 'Ali is not right: the blanket does not produce heat. Wool traps air, and wool and air are poor conductors of heat. So less heat from his body is lost to the cold surroundings.',
        keys: [['does not produce heat', 'does not give out heat', 'no heat of its own', 'does not make heat'], ['poor conductor', 'traps air', 'insulator'], ['less heat', 'heat is lost more slowly', 'slows down heat loss', 'keeps his body heat']],
        watchFor: ['insulator-makes-heat'],
        technique: 'Claim, evidence, reason',
        steps: ['Claim: is he right?', 'Evidence: does a blanket on a chair get warm by itself?', 'Reason: what do wool and the trapped air do to his body heat?'],
        explain: 'One mark: the blanket does not produce heat. One mark: wool traps air / is a poor conductor. One mark: less body heat is lost.' },
      { id: 'hea-042', type: 'oeq', level: 3, marks: 4, syl: 'P4', skill: 'fairtest',
        stem: 'Hafiz stood four rods of the same length and thickness, made of different materials, P, Q, R and S, in the same hot water and timed how long the far end of each rod took to reach 40 °C.\n(a) Which rod is the best conductor of heat? (1 mark)\n(b) Use his results to explain your answer to (a). (1 mark)\n(c) Which rod should be used for the handle of a frying pan? Explain why. (2 marks)',
        figure: stack(FIG_RODS, TBL_RODS),
        model: '(a) Rod P. (b) The far end of P reached 40 °C in the shortest time, 3 minutes. (c) Rod S. It took the longest time to heat up, so it is the poorest conductor and the handle would stay cool.',
        keys: [['rod P', 'P'], ['shortest time', '3 minutes', 'fastest'], ['rod S', 'S'], ['poorest conductor', 'longest time', 'poor conductor', 'stay cool']],
        watchFor: ['read-wrong-end', 'conductor-mixup'],
        technique: 'Claim, evidence, reason',
        steps: ['(a) Claim: which rod let heat through fastest?', '(b) Evidence: quote its time from the table.', '(c) A handle needs a poor conductor: which rod took the longest?', 'Give the reason in one sentence.'],
        explain: '(a) P (1). (b) Shortest time, 3 min (1). (c) S (1) + longest time, so poorest conductor and the handle stays cool (1).' },
      { id: 'hea-043', type: 'oeq', level: 3, marks: 5, syl: 'P4', skill: 'fairtest',
        stem: 'Wei Jie filled two identical cups with the same volume of water at 80 °C. He wrapped one cup in material X and the other in material Y, and recorded the temperatures.\n(a) What variable did he change? (1 mark)\n(b) Name two variables he kept the same. (2 marks)\n(c) Which material is better for keeping food hot? Use the results to explain. (2 marks)',
        figure: stack(FIG_CUPS, TBL_CUPS),
        model: '(a) The type of wrapping material. (b) The volume of water and the starting temperature of the water. (c) Material Y. After 15 minutes its water was still at 68 °C but the water in X was at 55 °C, so heat was lost more slowly through Y.',
        keys: [['type of wrapping material', 'wrapping material', 'material'], ['volume of water', 'starting temperature', 'same cup', 'size of cup', 'type of cup', 'same room', 'thickness'], ['starting temperature', 'volume of water', 'same cup', 'size of cup', 'type of cup', 'same room', 'thickness'], ['material Y', 'Y'], ['lost more slowly', '68 °C', 'dropped less', 'smaller drop', 'stayed hotter']],
        watchFor: ['changed-measured-mixup', 'read-wrong-end'],
        technique: 'Change one thing',
        steps: ['(a) What is different between the two cups?', '(b) What else could change the result? Name two things kept the same.', '(c) Read both temperatures at 15 minutes.', 'The cup that stayed hotter lost heat more slowly.'],
        explain: '(a) Wrapping material (1). (b) Any two DIFFERENT variables kept the same (the two key slots share one list, so the same variable cannot score twice): volume of water, starting temperature, cup size or type, same room, same thickness of wrapping (1 each). (c) Y (1) + its water stayed hotter / lost heat more slowly, 68 °C vs 55 °C (1).' },
      { id: 'hea-044', type: 'oeq', level: 3, marks: 5, syl: 'P4', skill: 'flow',
        stem: 'Beaker P has 200 ml of water at 70 °C and beaker Q has 200 ml of water at 10 °C. Both are left in a room at 30 °C for a long time.\n(a) What temperature will both beakers show in the end? (1 mark)\n(b) Did the water in Q gain or lose heat? Where did the heat flow from? (2 marks)\n(c) Which beaker\'s temperature changed by more, and by how many degrees? (2 marks)',
        figure: FIG_BEAKERS,
        model: '(a) 30 °C. (b) The water in Q gained heat. The heat flowed from the warmer surroundings into the water. (c) Beaker P. Its temperature fell by 40 °C, while Q rose by only 20 °C.',
        keys: [['30 °C'], ['gained heat', 'gains heat'], ['from the warmer surroundings', 'from the surroundings', 'from the air', 'from the room'], ['beaker P', 'P'], ['40 °C', '40']],
        watchFor: ['flow-forever', 'flow-cold-to-hot', 'gain-lose-mixup'],
        technique: 'Start minus left',
        steps: ['(a) Heat flows until both reach the temperature of the room.', '(b) Is Q colder or hotter than the room?', '(c) Change for P = 70 - 30. Change for Q = 30 - 10.', 'Compare the two changes.'],
        explain: '(a) 30 °C (1). (b) Gained heat (1), from the warmer surroundings (1). (c) P (1), by 40 °C (1).' }
    ]
  });
})();
