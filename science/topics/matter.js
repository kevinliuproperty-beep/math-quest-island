"use strict";
// Science Quest — topic: Matter (P4 content on the PSLE track, Cycles). Data only; the helpers below just build SVG/HTML strings.
// Scope per MOE Primary Science Syllabus 2023, theme Cycles, "Cycles in Matter" (P4), examined at PSLE 0009.
// It rides the PSLE (P5-P6) track only (track: 'psle'); Charlotte's P3-P4 island is unchanged.
// Sources checked 2026-10-30 (school briefings that quote or summarise the 2023 syllabus):
//   - Junyuan Pri, 2026 P4 Science: "Cycles - Matter; Energy - Light and Shadows; Energy - Heat and Effects of Heat"
//     https://www.junyuanpri.moe.edu.sg/files/2026_P4_SCI.pdf
//   - Jurong West Pri, P4 Science Briefing Slides 2026 (Matter in Term 1)
//     https://www.jurongwestpri.moe.edu.sg/files/Slides%20and%20info/P4__Science__Briefing_Slides_2026.pdf
//   - Yuhua Pri, 2025 P4 Parent Engagement (Science): "plant system, human systems, matter and light are P4"
//     https://www.yuhuapri.moe.edu.sg/files/2025_Parent_engagement_P4_SC.pdf
//   - Henry Park Pri, 2023 P4 Science "Matters" parent briefing
//     https://www.henryparkpri.moe.edu.sg/files/2023%20P4%20SC%20Matters_Parent%20Briefing.pdf
//   (The MOE syllabus PDF itself did not load on the day.)
// In scope here: matter is anything that has mass and occupies space; living and non-living things are
//   matter; light, heat, sound and shadows are not matter; solids, liquids and gases (definite shape and
//   definite volume or not); a gas spreads out to fill its whole container; gases can be compressed,
//   solids and liquids cannot be compressed easily; compressing a gas does not change its mass; air has
//   mass and occupies space (balloon balance, upside-down cup, sealed funnel); measuring mass (balance)
//   and volume (measuring cylinder, cm3 / ml); the volume of an irregular solid by water displacement
//   (measuring cylinder, overflow can).
// Deliberately LEFT OUT: changes of state of water (melting, boiling, evaporation, condensation,
//   freezing) — the P5 water-cycle lane owns them; particle models; density as a calculation;
//   gas pressure as a named idea.
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

  const TH = 'border:1px solid #94a3b8;padding:6px 10px;background:#e2e8f0;color:#111827';
  const TD = 'border:1px solid #94a3b8;padding:6px 10px;text-align:center';
  const table = (head, rows, caption) =>
    `<table style="border-collapse:collapse;margin:0 auto;font-size:15px">` +
    (caption ? `<caption style="padding:4px 0 6px;font-weight:600">${caption}</caption>` : '') +
    `<thead><tr>${head.map((h) => `<th style="${TH}">${h}</th>`).join('')}</tr></thead>` +
    `<tbody>${rows.map((r) => `<tr>${r.map((c) => `<td style="${TD}">${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;

  const stack = (a, b) => `<div>${a}<div style="height:10px"></div>${b}</div>`;

  // Measuring cylinder at x. Scale 0..max ml from y=bot up to y=top; labels every `major`, ticks every `minor`.
  // `level` = water level in ml. `inner(Y, x, w)` draws objects inside (stones, marbles).
  const cyl = (x, max, major, minor, level, o = {}) => {
    const top = o.top || 40, bot = o.bot || 260, w = o.w || 56;
    const Y = (v) => bot - (v * (bot - top)) / max;
    let s = `<rect x="${x}" y="${Y(level).toFixed(1)}" width="${w}" height="${(bot - Y(level)).toFixed(1)}" fill="${WATER}"/>`;
    s += `<line x1="${x}" y1="${Y(level).toFixed(1)}" x2="${x + w}" y2="${Y(level).toFixed(1)}" stroke="${BLUE}" stroke-width="2"/>`;
    if (o.inner) s += o.inner(Y, x, w, bot);
    for (let k = 1; k * minor <= max; k++) {
      const v = k * minor, y = Y(v).toFixed(1), big = v % major === 0;
      s += `<line x1="${x}" y1="${y}" x2="${x + (big ? 16 : 8)}" y2="${y}" stroke="${INK}" stroke-width="${big ? 1.5 : 1}"/>`;
      if (big) s += txt(x - 6, y, v, { size: 13, anchor: 'end' });
    }
    s += `<path d="M${x} ${top - 12} L${x} ${bot} L${x + w} ${bot} L${x + w} ${top - 12}" fill="none" stroke="${GLASS}" stroke-width="2.5"/>`;
    s += `<rect x="${x - 10}" y="${bot}" width="${w + 20}" height="8" fill="${GLASS}"/>`;
    s += txt(x + w + 6, top - 12, 'ml', { size: 13, anchor: 'start' });
    if (o.cap) s += txt(x + w / 2, bot + 26, o.cap, { size: 14, bold: 1 });
    return s;
  };

  const stone = (cx, cy) => `<polygon points="${cx - 18},${cy + 10} ${cx - 14},${cy - 8} ${cx + 2},${cy - 14} ${cx + 17},${cy - 4} ${cx + 15},${cy + 10}" fill="#9ca3af" stroke="${INK}" stroke-width="1.5"/>`;

  // ---------- Figures ----------
  // One cylinder to read: 0-100 ml, minor ticks every 2 ml, level 64 ml.
  const FIG_CYL_64 = svg(200, 300, 'A measuring cylinder marked 0 to 100 ml in steps of 2 ml; the water level is at the second small mark above 60',
    cyl(80, 100, 10, 2, 64, { cap: 'water' }));

  // Before / after: a stone dropped into a cylinder, 50 ml to 72 ml.
  const FIG_DISP_STONE = svg(320, 300, 'Two measuring cylinders. Before: water at 50 ml. After a stone is put in: water at 72 ml',
    cyl(60, 100, 10, 2, 50, { cap: 'Before' }) +
    cyl(200, 100, 10, 2, 72, { cap: 'After', inner: (Y, x, w, bot) => stone(x + w / 2, bot - 14) }) +
    txt(264, 240, 'stone', { size: 13, anchor: 'start' }));

  // Three identical marbles: 40 ml to 55 ml (minor every 5 ml).
  const FIG_DISP_MARBLES = svg(320, 300, 'Two measuring cylinders. Before: water at 40 ml. After three identical marbles are put in: water at 55 ml',
    cyl(60, 100, 10, 5, 40, { cap: 'Before' }) +
    cyl(200, 100, 10, 5, 55, {
      cap: 'After', inner: (Y, x, w, bot) =>
        [x + 16, x + 40, x + 28].map((cx, i) => `<circle cx="${cx}" cy="${bot - (i === 2 ? 30 : 11)}" r="10" fill="#f87171" stroke="${INK}"/>`).join('')
    }) + txt(264, 222, '3', { size: 13, anchor: 'start' }) + txt(264, 240, 'marbles', { size: 13, anchor: 'start' }));

  // A stone: 60 ml to 85 ml (minor every 5 ml).
  const FIG_DISP_60_85 = svg(320, 300, 'Two measuring cylinders. Before: water at 60 ml. After a stone is put in: water at 85 ml',
    cyl(60, 100, 10, 5, 60, { cap: 'Before' }) +
    cyl(200, 100, 10, 5, 85, { cap: 'After', inner: (Y, x, w, bot) => stone(x + w / 2, bot - 14) }) +
    txt(264, 240, 'stone', { size: 13, anchor: 'start' }));

  // Overflow can with a stone; the water that overflows is caught in a cylinder reading 35 ml.
  const FIG_OVERFLOW = (() => {
    let s = `<rect x="30" y="100" width="130" height="150" fill="${WATER}"/>`;
    s += `<line x1="30" y1="100" x2="160" y2="100" stroke="${BLUE}" stroke-width="2"/>`;
    s += `<path d="M30 60 L30 250 L160 250 L160 60" fill="none" stroke="${GLASS}" stroke-width="3"/>`;
    s += `<path d="M160 96 L206 120 M160 106 L204 128" stroke="${GLASS}" stroke-width="3"/>`;
    s += `<path d="M206 124 L208 150" stroke="${BLUE}" stroke-width="2" stroke-dasharray="3 4"/>`;
    s += stone(95, 230) + txt(95, 200, 'stone', { size: 13 });
    s += txt(95, 40, 'overflow can', { size: 13 }) + txt(205, 92, 'spout', { size: 13 });
    s += cyl(200, 50, 10, 5, 35, { top: 160, bot: 260, w: 40 });
    s += txt(322, 210, 'measuring', { size: 13 }) + txt(322, 226, 'cylinder', { size: 13 });
    return svg(370, 280, 'An overflow can filled to the spout with a stone in it. The water that overflowed is in a measuring cylinder marked 0 to 50 ml, at 35 ml', s);
  })();

  // Syringe with the tip sealed. vol = where the plunger is (0-100 cm3 scale).
  const syringe = (vol, label, push) => {
    const X = (v) => 60 + v * 2.4;
    let s = `<rect x="60" y="50" width="240" height="44" fill="#f8fafc" stroke="${GLASS}" stroke-width="2"/>`;
    s += `<rect x="40" y="64" width="20" height="16" fill="#f8fafc" stroke="${GLASS}" stroke-width="2"/>`;
    s += `<rect x="28" y="60" width="14" height="24" rx="3" fill="#374151"/>` + txt(22, 34, 'tip sealed', { size: 13, anchor: 'start' });
    s += `<rect x="60" y="52" width="${(X(vol) - 60).toFixed(1)}" height="40" fill="#e0f2fe"/>`;
    s += txt((60 + X(vol)) / 2, 72, label, { size: 13 });
    s += `<rect x="${X(vol).toFixed(1)}" y="52" width="10" height="40" fill="#374151"/>`;
    s += `<rect x="${(X(vol) + 10).toFixed(1)}" y="67" width="${(334 - X(vol) - 10).toFixed(1)}" height="10" fill="#9ca3af" stroke="${INK}"/>`;
    s += `<rect x="334" y="46" width="10" height="52" fill="#9ca3af" stroke="${INK}"/>`;
    for (let v = 0; v <= 100; v += 10) {
      s += `<line x1="${X(v)}" y1="94" x2="${X(v)}" y2="${v % 20 ? 100 : 104}" stroke="${INK}"/>`;
      if (v % 20 === 0) s += txt(X(v), 120, v, { size: 13 });
    }
    s += txt(300, 140, 'cm³', { size: 13 });
    if (push) s += arrow(366, 30, 336, 30, { width: 2.5 }) + txt(300, 22, 'push', { size: 13 });
    return s;
  };
  const FIG_SYR_AIR = svg(372, 160, 'A syringe with its tip sealed holding 60 cubic centimetres of air; the plunger is pushed in', syringe(60, 'air', true));
  const FIG_SYR_80 = svg(372, 160, 'A syringe with its tip sealed holding 80 cubic centimetres of air', syringe(80, 'air', true));

  // Stick balance with two balloons. tilted: right balloon blown up and the right end lower.
  const balance = (x0, tilted, cap) => {
    const cx = x0 + 90, ly = tilted ? 72 : 82, ry = tilted ? 102 : 82;
    let s = `<line x1="${cx}" y1="30" x2="${cx}" y2="87" stroke="${INK}" stroke-width="1.5"/>`;
    s += `<line x1="${x0 + 15}" y1="${ly}" x2="${x0 + 155}" y2="${ry}" stroke="#92400e" stroke-width="5"/>`;
    s += `<line x1="${x0 + 20}" y1="${ly}" x2="${x0 + 20}" y2="${ly + 22}" stroke="${INK}"/>`;
    s += `<ellipse cx="${x0 + 20}" cy="${ly + 36}" rx="9" ry="14" fill="#f87171" stroke="${INK}"/>`;
    s += `<line x1="${x0 + 150}" y1="${ry}" x2="${x0 + 150}" y2="${ry + 14}" stroke="${INK}"/>`;
    s += tilted ? `<ellipse cx="${x0 + 150}" cy="${ry + 44}" rx="22" ry="30" fill="#60a5fa" stroke="${INK}"/>`
      : `<ellipse cx="${x0 + 150}" cy="${ry + 28}" rx="9" ry="14" fill="#60a5fa" stroke="${INK}"/>`;
    s += txt(x0 + 20, ly + 66, 'P', { bold: 1 }) + txt(x0 + (tilted ? 114 : 130), ry + (tilted ? 44 : 28), 'Q', { bold: 1 });
    s += txt(cx, 190, cap, { size: 13, bold: 1 });
    return s;
  };
  const FIG_BAL_BOTH = svg(370, 205, 'Before: a stick hangs level with an empty balloon P and an empty balloon Q. After balloon Q is blown up: the stick tilts down on the Q side',
    balance(0, false, 'Before') + `<line x1="185" y1="20" x2="185" y2="180" stroke="#cbd5e1"/>` + balance(185, true, 'After Q is blown up'));
  const FIG_BAL_BEFORE = svg(200, 205, 'A stick hangs level from a string with an empty balloon P at one end and an empty balloon Q at the other',
    balance(10, false, 'Balanced'));

  // Upside-down cup with a tissue pushed into a tank of water.
  const FIG_CUP = (() => {
    let s = `<rect x="30" y="80" width="300" height="160" fill="${WATER}"/>`;
    s += `<line x1="30" y1="80" x2="330" y2="80" stroke="${BLUE}" stroke-width="2"/>`;
    s += `<path d="M30 50 L30 240 L330 240 L330 50" fill="none" stroke="${GLASS}" stroke-width="3"/>`;
    s += `<polygon points="150,30 210,30 228,180 132,180" fill="#ffffff" stroke="none"/>`;
    s += `<polygon points="136,170 224,170 228,180 132,180" fill="${WATER}"/>`;
    s += `<polygon points="150,30 210,30 228,180 132,180" fill="none" stroke="${INK}" stroke-width="2.5"/>`;
    s += `<rect x="158" y="34" width="44" height="22" rx="6" fill="#fef3c7" stroke="#92400e"/>`;
    s += txt(266, 22, 'dry tissue', { size: 13 }) + `<line x1="236" y1="28" x2="204" y2="42" stroke="${LINE}"/>`;
    s += txt(180, 110, 'air?', { size: 14 });
    s += txt(282, 206, 'water', { size: 13 });
    s += txt(72, 30, 'cup pushed', { size: 13 }) + txt(72, 46, 'straight down', { size: 13 }) + arrow(118, 40, 140, 70, { width: 2 });
    return svg(360, 256, 'An upside-down cup with a dry tissue stuck at its bottom is pushed straight down into a tank of water', s);
  })();

  // Funnel sealed into a bottle with plasticine; the water stays in the funnel.
  const FIG_FUNNEL = (() => {
    let s = `<path d="M150 120 L150 110 Q150 96 166 96 L166 76 M194 76 L194 96 Q210 96 210 110 L210 120" fill="none" stroke="${GLASS}" stroke-width="2.5"/>`;
    s += `<rect x="110" y="120" width="140" height="130" rx="10" fill="#f8fafc" stroke="${GLASS}" stroke-width="2.5"/>`;
    s += `<polygon points="120,22 240,22 186,66 174,66" fill="none" stroke="${INK}" stroke-width="2"/>`;
    s += `<polygon points="133,32 227,32 186,66 174,66" fill="${WATER}"/>`;
    s += `<rect x="174" y="66" width="12" height="80" fill="#f8fafc" stroke="${INK}" stroke-width="1.5"/>`;
    s += `<rect x="175" y="66" width="10" height="6" fill="${WATER}"/>`;
    s += `<rect x="156" y="64" width="48" height="16" rx="6" fill="#fb923c" stroke="#9a3412"/>`;
    s += txt(285, 28, 'funnel', { size: 13 }) + txt(285, 50, 'water', { size: 13 }) + `<line x1="256" y1="50" x2="214" y2="44" stroke="${LINE}"/>`;
    s += txt(285, 76, 'plasticine', { size: 13 }) + `<line x1="248" y1="76" x2="206" y2="72" stroke="${LINE}"/>`;
    s += txt(180, 210, 'bottle', { size: 13 });
    return svg(340, 266, 'A funnel fixed into the mouth of a bottle; plasticine seals the gap round the neck. Water poured into the funnel stays in the funnel', s);
  })();

  const TBL_STATES_XYZ = table(['Substance', 'Definite shape?', 'Definite volume?'],
    [['X', 'Yes', 'Yes'], ['Y', 'No', 'Yes'], ['Z', 'No', 'No']], 'Properties');

  const TBL_BALL = table(['Football', 'Mass (g)'], [['Before pumping', '425'], ['After pumping in more air', '431']], 'Results');

  const TBL_STATES_JKL = table(['Substance', 'Takes the shape of its container?', 'Can be compressed easily?'],
    [['J', 'No', 'No'], ['K', 'Yes', 'No'], ['L', 'Yes', 'Yes']], 'Properties');

  const TBL_SYR = table(['Number of masses on the plunger', 'Volume of air in the syringe (cm³)'],
    [['0', '60'], ['1', '50'], ['2', '42'], ['3', '36']], 'Results');

  SCI.registerTopic({
    id: 'matter',
    title: 'Matter',
    emoji: '🧊',
    theme: 'Cycles',
    level: 'P4',
    track: 'psle',
    moeRef: 'Cycles in Matter (P4), MOE Primary Science Syllabus 2023, examined at PSLE: recognise that matter is anything that has mass and occupies space; differentiate the three states of matter (solid, liquid, gas) by definite shape and definite volume; show that air has mass and occupies space; recognise that gases can be compressed but solids and liquids cannot be compressed easily; measure mass and volume (including the volume of an irregular solid by displacement). Scope checked against Junyuan Pri 2026 P4 Science, Jurong West Pri 2026 P4 Science briefing and Yuhua Pri 2025 P4 Science engagement slides.',
    skills: {
      matter: 'What matter is',
      states: 'Solids, liquids and gases',
      gases: 'Compressing gases',
      air: 'Air has mass and takes up space',
      volume: 'Measuring mass and volume'
    },
    misconceptions: {
      'energy-is-matter': 'Light, heat, sound or a shadow is matter.',
      'air-not-matter': 'Air and other gases are not matter, or are nothing, because we cannot see them.',
      'air-no-mass': 'Air has no mass, so it cannot make anything heavier.',
      'matter-must-be-solid': 'Only solids, or only things we can hold, are matter.',
      'mass-is-volume': 'Mass and volume are the same thing: a bigger object always has more mass.',
      'states-mixup': 'Mixing up which states have a definite shape and which have a definite volume.',
      'liquid-definite-shape': 'A liquid keeps its own fixed shape.',
      'gas-definite-volume': 'A gas has a fixed volume of its own, like a liquid.',
      'gas-partial-fill': 'A gas fills only part of a closed container.',
      'empty-means-nothing': 'An "empty" container has nothing at all inside it.',
      'pour-means-liquid': 'Anything that can be poured, like sand or sugar, is a liquid.',
      'shape-change-volume-change': 'Pouring a liquid into a different container changes its volume.',
      'liquid-compressible': 'Liquids and solids can be squashed into a smaller space as easily as gases.',
      'gas-not-compressible': 'A gas cannot be compressed into a smaller space.',
      'compress-changes-mass': 'Compressing a gas changes its mass.',
      'difference-mixup': 'Using one reading as the answer instead of the difference between the before and after readings.',
      'per-item-mixup': 'Forgetting to share a total volume among identical objects.',
      'scale-misread': 'Reading a scale wrongly, such as counting each small mark as 1 when it stands for more.',
      'unit-mixup': 'Mixing up units of mass (g, kg), length (cm) and volume (cm³, ml).',
      'tool-mixup': 'Mixing up what each measuring instrument measures.'
    },
    notes: [
      { title: 'What is matter?',
        body: 'Matter is anything that has mass and occupies space (takes up space).\nLiving things (plants, animals, you) and non-living things (water, air, rocks) are all matter.\nLight, heat, sound and shadows are NOT matter: they have no mass and take up no space.' },
      { title: 'Mass and volume',
        body: 'Mass is the amount of matter in an object. Measure it with a balance, in grams (g) or kilograms (kg).\nVolume is the amount of space an object occupies. Measure a liquid with a measuring cylinder, in cubic centimetres (cm³) or millilitres (ml). 1 ml = 1 cm³.\nA big object does not always have more mass: a ball of cotton wool can be bigger than a nail but lighter.' },
      { title: 'Three states of matter',
        body: 'SOLID: definite shape, definite volume.\nLIQUID: no definite shape (takes the shape of its container), definite volume.\nGAS: no definite shape, no definite volume (spreads out to fill the whole container).\nSand and sugar can be poured, but each grain is a solid with its own shape.' },
      { title: 'Compressing',
        body: 'To compress something is to squash it into a smaller space.\nGases can be compressed: push the plunger of a sealed syringe of air and it moves in.\nSolids and liquids cannot be compressed easily: a sealed syringe of water hardly moves.\nCompressing a gas makes its volume smaller, but its mass stays the same if none escapes.' },
      { title: 'Air has mass',
        body: 'Blow up one of two balanced balloons and that side goes down: the air inside has mass.\nPump more air into a football and its mass goes up a little.' },
      { title: 'Air occupies space',
        body: 'An "empty" bottle is full of air.\nPush an upside-down cup into water: the air inside takes up space, so the water cannot fill the cup and a tissue at the bottom stays dry.\nSeal a funnel into a bottle with plasticine: water stays in the funnel because the air in the bottle cannot get out. Make a hole and the air escapes, so the water flows in.' },
      { title: 'Volume of an odd-shaped solid',
        body: 'Use displacement.\n1. Pour some water into a measuring cylinder. Read the level.\n2. Lower the object in until it is fully under water. Read the new level.\n3. Volume of object = new level - first level.\nExample: 50 ml rises to 72 ml, so the stone is 72 - 50 = 22 cm³.\nOverflow can: fill it to the spout, put the object in, and catch the water that flows out. Its volume equals the object\'s volume.' },
      { title: 'Reading a measuring cylinder',
        body: 'Read at eye level, at the flat water surface.\nWork out what each small mark stands for: if there are 5 spaces between 60 and 70, each mark is 2 ml.' }
    ],
    items: [
      // ----- What matter is -----
      { id: 'mtr-001', type: 'mcq', level: 1, syl: 'P4', skill: 'matter',
        stem: 'Which of these is matter?',
        figure: null,
        options: ['The light from a torch', 'The heat from the Sun', 'The air inside a balloon', 'The sound of a school bell'],
        answer: 2,
        miscon: { 0: 'energy-is-matter', 1: 'energy-is-matter', 3: 'energy-is-matter' },
        optionFeedback: {
          0: 'Light has no mass and takes up no space. Look for the one that fills a space and has mass.',
          1: 'Heat warms things up, but it has no mass and takes up no space.',
          3: 'Sound can travel through matter, but sound itself has no mass and takes up no space.' },
        explain: 'Air has mass and occupies space, so it is matter. Light, heat and sound are not matter.' },
      { id: 'mtr-002', type: 'mcq', level: 1, syl: 'P4', skill: 'matter',
        stem: 'Matter is anything that ______.',
        figure: null,
        options: ['can be seen and touched', 'has mass and occupies space', 'is either a solid or a liquid', 'has a definite shape'],
        answer: 1,
        miscon: { 0: 'air-not-matter', 2: 'air-not-matter', 3: 'matter-must-be-solid' },
        optionFeedback: {
          0: 'We cannot see air, yet air is matter. What do air, water and rocks all have?',
          2: 'Gases such as air are matter too. Think of what ALL three states share.',
          3: 'Water has no definite shape, but it is still matter.' },
        explain: 'Matter is anything that has mass and occupies space. Solids, liquids and gases are all matter.' },
      { id: 'mtr-003', type: 'mcq', level: 2, syl: 'P4', skill: 'matter',
        stem: 'Which of these are NOT matter?\nA: a shadow on the wall\nB: the oxygen in a tank\nC: the light from a lamp\nD: a raindrop',
        figure: null,
        options: ['B and D only', 'A, B and C only', 'C only', 'A and C only'],
        answer: 3,
        miscon: { 0: 'air-not-matter', 1: 'air-not-matter', 2: 'energy-is-matter' },
        technique: 'Tick or cross',
        steps: ['I take one thing at a time.', 'Does it have mass and take up space?', 'If yes, it is matter: cross it out. If no, tick it.', 'I choose the option with only the ticks.'],
        optionFeedback: {
          0: 'Oxygen and a raindrop both have mass and take up space, so they ARE matter. The question asks for the ones that are NOT.',
          1: 'A and C are right. But oxygen is a gas, and gases have mass and take up space.',
          2: 'C is right. Can a shadow be weighed, or fill a box?' },
        explain: 'A shadow (A) and light (C) have no mass and take up no space, so they are not matter. Oxygen (B) and a raindrop (D) are matter.' },
      { id: 'mtr-004', type: 'mcq', level: 3, syl: 'P4', skill: 'matter',
        stem: 'A ball of cotton wool and an iron nail have the same mass. The ball of cotton wool is much bigger. Which statement is correct?',
        figure: null,
        options: ['They occupy the same amount of space.', 'The iron nail contains more matter.', 'The cotton wool has a greater volume.', 'The cotton wool has a greater mass.'],
        answer: 2,
        miscon: { 0: 'mass-is-volume', 1: 'mass-is-volume', 3: 'mass-is-volume' },
        technique: 'Read, compare, conclude',
        steps: ['Read: what is the SAME? The mass.', 'Compare: which one takes up more space?', 'Conclude: more space means a greater volume.'],
        optionFeedback: {
          0: 'Same mass does not mean same space. The stem tells you which one is bigger.',
          1: 'Mass is the amount of matter. Same mass means the same amount of matter.',
          3: 'The stem says the masses are the same. Being bigger is about volume, not mass.' },
        explain: 'Mass is the amount of matter; volume is the space occupied. They have the same mass, but the cotton wool occupies more space, so it has the greater volume.' },
      { id: 'mtr-005', type: 'mcq', level: 1, syl: 'P4', skill: 'matter',
        stem: 'An "empty" glass bottle is sitting on a table. What is inside it?',
        figure: null,
        options: ['Nothing at all', 'Air', 'Only light', 'Only heat'],
        answer: 1,
        miscon: { 0: 'empty-means-nothing', 2: 'energy-is-matter', 3: 'energy-is-matter' },
        optionFeedback: {
          0: 'We cannot see it, but something fills the bottle. Push the bottle mouth-down into water and watch the bubbles.',
          2: 'Light can shine through the bottle, but it does not fill the space. Something with mass does.',
          3: 'Heat is not matter. What invisible matter fills every "empty" container around us?' },
        explain: 'The "empty" bottle is filled with air. Air is matter: it has mass and occupies space.' },

      // ----- Solids, liquids and gases -----
      { id: 'mtr-006', type: 'mcq', level: 1, syl: 'P4', skill: 'states',
        stem: 'Which state of matter has a definite volume but no definite shape?',
        figure: null,
        options: ['Liquid', 'Solid', 'Gas', 'All three states'],
        answer: 0,
        miscon: { 1: 'states-mixup', 2: 'gas-definite-volume', 3: 'states-mixup' },
        optionFeedback: {
          1: 'A solid keeps its shape, like a wooden block. Which state flows and takes the shape of its container?',
          2: 'A gas spreads out to fill any container, so its volume is not fixed either.',
          3: 'A solid keeps its own shape, so not all three fit.' },
        explain: 'A liquid has a definite volume but takes the shape of its container, so it has no definite shape.' },
      { id: 'mtr-007', type: 'mcq', level: 1, syl: 'P4', skill: 'states',
        stem: 'The table shows the properties of three substances, X, Y and Z. Which of these correctly identifies them?',
        figure: TBL_STATES_XYZ,
        options: ['X: gas, Y: liquid, Z: solid', 'X: liquid, Y: solid, Z: gas', 'X: solid, Y: gas, Z: liquid', 'X: solid, Y: liquid, Z: gas'],
        answer: 3,
        miscon: { 0: 'states-mixup', 1: 'liquid-definite-shape', 2: 'gas-definite-volume' },
        technique: 'Read, compare, conclude',
        steps: ['Read X: shape fixed and volume fixed.', 'Read Y: volume fixed, shape not fixed.', 'Read Z: neither fixed.', 'Match each to solid, liquid or gas.'],
        optionFeedback: {
          0: 'A gas has no definite shape and no definite volume. Which row says "No" twice?',
          1: 'Y has no definite shape, so it cannot be a solid.',
          2: 'Y has a definite volume. A gas does not, so Y is not the gas.' },
        explain: 'X keeps both shape and volume (solid). Y keeps its volume only (liquid). Z keeps neither (gas).' },
      { id: 'mtr-008', type: 'mcq', level: 2, syl: 'P4', skill: 'states',
        stem: 'Hui Min pours 50 ml of water from a tall, narrow glass into a wide, shallow bowl. Which statement is correct?',
        figure: null,
        options: ['Its shape changes, and its volume is still 50 ml.', 'Its shape and its volume both change.', 'Its volume becomes smaller because the bowl is wider.', 'Its shape stays the same, but its volume changes.'],
        answer: 0,
        miscon: { 1: 'shape-change-volume-change', 2: 'shape-change-volume-change', 3: 'liquid-definite-shape' },
        optionFeedback: {
          1: 'The water spreads out, but no water is added or lost. Is there still 50 ml?',
          2: 'A wide bowl makes the water look shallower, but the amount of space it takes up is the same.',
          3: 'Water takes the shape of whatever holds it, so its shape does change.' },
        explain: 'A liquid has no definite shape, so it takes the shape of the bowl. It has a definite volume, so it is still 50 ml.' },
      { id: 'mtr-009', type: 'mcq', level: 2, syl: 'P4', skill: 'states',
        stem: 'Sand can be poured, and it takes the shape of the bottom of a jar. Which statement is correct?',
        figure: null,
        options: ['Sand is a liquid, because it can be poured.', 'Sand has no definite volume.', 'Each grain of sand is a solid with a definite shape and volume.', 'Sand is a gas, because it spreads out.'],
        answer: 2,
        miscon: { 0: 'pour-means-liquid', 1: 'states-mixup', 3: 'pour-means-liquid' },
        technique: 'Can we be sure?',
        steps: ['Look closely at ONE grain of sand.', 'Does that grain change its shape in the jar?', 'Decide what state each grain is in.'],
        optionFeedback: {
          0: 'Sand pours because it is made of many tiny grains. Look at one grain on its own.',
          1: 'A cup of sand stays a cup of sand in any jar. Its volume does not spread out like a gas.',
          3: 'A gas fills its whole container. Sand settles at the bottom.' },
        explain: 'Each grain of sand keeps its own shape and volume, so it is a solid. The heap of tiny grains can be poured, which is why it seems to take the shape of the jar.' },
      { id: 'mtr-010', type: 'mcq', level: 1, syl: 'P4', skill: 'states',
        stem: 'Which of these is a gas at room temperature?',
        figure: null,
        options: ['Cooking oil', 'Sugar', 'Oxygen', 'Butter'],
        answer: 2,
        miscon: { 0: 'states-mixup', 1: 'pour-means-liquid', 3: 'states-mixup' },
        optionFeedback: {
          0: 'Cooking oil flows and stays in its bottle: it is a liquid.',
          1: 'Sugar can be poured, but each grain is a solid.',
          3: 'Butter keeps its shape in the fridge: it is a solid.' },
        explain: 'Oxygen is a gas. Cooking oil is a liquid; sugar and butter are solids.' },
      { id: 'mtr-011', type: 'mcq', level: 2, syl: 'P4', skill: 'states',
        stem: 'A closed 500 ml bottle is full of air. How much space does the air in it occupy?',
        figure: null,
        options: ['Only the top part of the bottle', 'About half of the bottle', 'None, as air takes up no space', 'The whole 500 ml of the bottle'],
        answer: 3,
        miscon: { 0: 'gas-partial-fill', 1: 'gas-partial-fill', 2: 'air-not-matter' },
        optionFeedback: {
          0: 'Air is not like water sitting at the bottom. A gas spreads out in every direction.',
          1: 'A gas does not stop half-way. It spreads out until it fills the container.',
          2: 'Air is matter, so it does take up space.' },
        explain: 'A gas has no definite volume. It spreads out to fill the whole container, so the air occupies all 500 ml.' },
      { id: 'mtr-012', type: 'mcq', level: 3, syl: 'P4', skill: 'states',
        stem: 'Which of these statements are correct?\nA: A solid has a definite shape.\nB: A liquid can be compressed easily.\nC: A gas has no definite volume.\nD: All matter has mass.',
        figure: null,
        options: ['A and C only', 'B and D only', 'A, C and D only', 'A, B, C and D'],
        answer: 2,
        miscon: { 0: 'air-no-mass', 1: 'liquid-compressible', 3: 'liquid-compressible' },
        technique: 'Tick or cross',
        steps: ['I take one statement at a time.', 'Tick it if it is true for that state.', 'Cross it if it is false.', 'I choose the option with only the ticks.'],
        optionFeedback: {
          0: 'A and C are true. But every kind of matter, even air, has mass, so D is true too.',
          1: 'D is true. Try squashing water in a sealed syringe: does B still hold?',
          3: 'A, C and D are true. A liquid cannot be squashed into a smaller space easily, so cross out B.' },
        explain: 'A, C and D are true. B is false: liquids cannot be compressed easily.' },
      { id: 'mtr-013', type: 'mcq', level: 2, syl: 'P4', skill: 'states',
        stem: 'Some properties of substances J, K and L are shown in the table. Which of these could J, K and L be?',
        figure: TBL_STATES_JKL,
        options: ['J: water, K: stone, L: air', 'J: stone, K: water, L: air', 'J: air, K: water, L: stone', 'J: stone, K: air, L: water'],
        answer: 1,
        miscon: { 0: 'liquid-definite-shape', 2: 'gas-not-compressible', 3: 'liquid-compressible' },
        technique: 'Read, compare, conclude',
        steps: ['Which one keeps its shape and cannot be squashed? A solid.', 'Which one takes the container\'s shape but cannot be squashed easily? A liquid.', 'Which one can be compressed easily? A gas.'],
        optionFeedback: {
          0: 'J does not take the shape of its container. Water does, so J is not water.',
          2: 'J cannot be compressed easily, but air can. Look for the substance that can be squashed.',
          3: 'L can be compressed easily. Water cannot, so L is not water.' },
        explain: 'J keeps its shape and cannot be compressed (stone, a solid). K takes the shape of its container but cannot be compressed easily (water, a liquid). L takes the container\'s shape and can be compressed (air, a gas).' },

      // ----- Compressing gases -----
      { id: 'mtr-014', type: 'mcq', level: 2, syl: 'P4', skill: 'gases',
        stem: 'Ravi sealed the tip of a syringe holding 60 cm³ of air. He then pushed the plunger as shown. What happens?',
        figure: FIG_SYR_AIR,
        options: ['The plunger cannot move at all, because the air takes up space.', 'The plunger moves in a little, because the air can be compressed.', 'The plunger moves all the way in, because the air disappears.', 'The plunger moves in a little, because the air loses mass.'],
        answer: 1,
        miscon: { 0: 'gas-not-compressible', 2: 'air-not-matter', 3: 'compress-changes-mass' },
        optionFeedback: {
          0: 'Air does take up space, but a gas can be squashed into a smaller space. Try it with a sealed syringe.',
          2: 'The tip is sealed, so the air cannot leave. It is squashed, not gone.',
          3: 'No air can leave the sealed syringe, so its mass does not change. Only its volume does.' },
        explain: 'Air is a gas and can be compressed into a smaller space, so the plunger moves in a little. The air still occupies space, so the plunger cannot go all the way in.' },
      { id: 'mtr-015', type: 'mcq', level: 2, syl: 'P4', skill: 'gases',
        stem: 'Ravi filled a syringe with 60 cm³ of water instead and sealed the tip. When he pushed the plunger hard, it hardly moved. Why?',
        figure: null,
        options: ['Water has a definite shape.', 'Water has no mass.', 'Water occupies less space when pushed.', 'Water cannot be compressed easily.'],
        answer: 3,
        miscon: { 0: 'liquid-definite-shape', 1: 'air-no-mass', 2: 'liquid-compressible' },
        optionFeedback: {
          0: 'Water takes the shape of the syringe, so it has no definite shape.',
          1: 'Water is matter, so it has mass. Think about whether it can be squashed.',
          2: 'If water squashed into less space, the plunger would move in. It hardly moved.' },
        explain: 'Liquids cannot be compressed easily, so the water cannot be pushed into a smaller space and the plunger hardly moves.' },
      { id: 'mtr-016', type: 'mcq', level: 2, syl: 'P4', skill: 'gases',
        stem: 'Which of these can be compressed easily?\nA: air in a bicycle pump with its end blocked\nB: water in a sealed syringe\nC: cooking oil in a sealed syringe\nD: oxygen in a sealed syringe',
        figure: null,
        options: ['A only', 'A and D only', 'B and C only', 'A, B, C and D'],
        answer: 1,
        miscon: { 0: 'gas-not-compressible', 2: 'liquid-compressible', 3: 'liquid-compressible' },
        technique: 'Tick or cross',
        steps: ['For each one, is it a solid, a liquid or a gas?', 'Tick the gases: they can be compressed.', 'Cross the liquids: they cannot be compressed easily.', 'I choose the option with only the ticks.'],
        optionFeedback: {
          0: 'A is right. Oxygen is a gas too, and every gas can be compressed.',
          2: 'Water and cooking oil are liquids. Liquids cannot be compressed easily.',
          3: 'A and D are gases. B and C are liquids, which cannot be compressed easily.' },
        explain: 'Air (A) and oxygen (D) are gases, so they can be compressed. Water (B) and cooking oil (C) are liquids and cannot be compressed easily.' },
      { id: 'mtr-017', type: 'mcq', level: 3, syl: 'P4', skill: 'gases',
        stem: 'A syringe holds 80 cm³ of air and its tip is sealed. Siti pushes the plunger in until it reaches the 50 cm³ mark. Which statement about the air is correct?',
        figure: FIG_SYR_80,
        options: ['Its volume is now 50 cm³ and its mass is the same.', 'Its volume is still 80 cm³ and its mass is the same.', 'Its volume is now 50 cm³ and its mass is less.', 'Its volume is now 50 cm³ and its mass is greater.'],
        answer: 0,
        miscon: { 1: 'gas-definite-volume', 2: 'compress-changes-mass', 3: 'compress-changes-mass' },
        technique: 'Can we be sure?',
        steps: ['Can any air get in or out? The tip is sealed.', 'So does the amount of air (its mass) change?', 'How much space does the air fill now?'],
        optionFeedback: {
          1: 'A gas has no definite volume. The air now fills only the space up to the 50 cm³ mark.',
          2: 'The tip is sealed, so no air escaped. The same air is just squashed into less space.',
          3: 'No air was added through the sealed tip. Squashing changes the space, not the amount of air.' },
        explain: 'The air is compressed into 50 cm³ of space. No air got in or out, so its mass stays the same.' },
      { id: 'mtr-018', type: 'mcq', level: 2, syl: 'P4', skill: 'gases',
        stem: 'Bubble wrap is used to protect a glass vase in a parcel. Which property of air makes bubble wrap useful?',
        figure: null,
        options: ['Air can be compressed.', 'Air has no mass.', 'Air has a definite volume.', 'Air has a definite shape.'],
        answer: 0,
        miscon: { 1: 'air-no-mass', 2: 'gas-definite-volume', 3: 'states-mixup' },
        optionFeedback: {
          1: 'Air does have mass. What happens to the bubbles when the parcel is knocked?',
          2: 'A gas has no definite volume. When a bubble is pressed, the air inside is squashed.',
          3: 'Air takes the shape of whatever holds it. Think of what happens when a bubble is pressed.' },
        explain: 'The air in the bubbles can be compressed. When the parcel is knocked, the bubbles squash and cushion the vase.' },

      // ----- Air has mass and takes up space -----
      { id: 'mtr-019', type: 'mcq', level: 1, syl: 'P4', skill: 'air',
        stem: 'A stick hung level with an empty balloon at each end. Balloon Q was then blown up and hung back in the same place. What does this show?',
        figure: FIG_BAL_BOTH,
        options: ['Air has no mass.', 'Air has a definite shape.', 'Bigger things always have more mass.', 'Air has mass.'],
        answer: 3,
        miscon: { 0: 'air-no-mass', 1: 'states-mixup', 2: 'mass-is-volume' },
        optionFeedback: {
          0: 'If air had no mass, the stick would stay level. Which way did it tilt?',
          1: 'The air takes the shape of the balloon. The test is about which side is heavier.',
          2: 'A cotton-wool ball is big but light. This test is about what was added to Q.' },
        explain: 'Only air was added to balloon Q, and the Q side went down. So the air in Q has mass.' },
      { id: 'mtr-020', type: 'mcq', level: 2, syl: 'P4', skill: 'air',
        stem: 'Mei pushed an upside-down cup with a dry tissue stuck at its bottom straight down into a tank of water, as shown. When she lifted it out, the tissue was still dry. Why?',
        figure: FIG_CUP,
        options: ['The tissue is waterproof.', 'Water cannot move upwards.', 'The air in the cup occupies space, so water cannot fill the cup.', 'Air has no mass, so it floats on top of the water.'],
        answer: 2,
        miscon: { 0: 'air-not-matter', 1: 'air-not-matter', 3: 'air-no-mass' },
        optionFeedback: {
          0: 'A tissue soaks up water very easily. Something kept the water away from it.',
          1: 'Water rises up a straw when you sip. Something inside the cup is in the way.',
          3: 'Air does have mass. What fills the cup before it goes into the water?' },
        explain: 'The cup is full of air. The air occupies space and cannot escape, so the water cannot fill the cup and the tissue stays dry.' },
      { id: 'mtr-021', type: 'mcq', level: 2, syl: 'P4', skill: 'air',
        stem: 'Arif sealed a funnel into a bottle with plasticine. Water poured into the funnel stayed in the funnel. He then made a small hole in the plasticine, and the water flowed into the bottle. Why did the water flow in after the hole was made?',
        figure: FIG_FUNNEL,
        options: ['Air could escape through the hole, leaving space for the water.', 'The hole let more water into the funnel.', 'The water became lighter.', 'The plasticine soaked up the air in the bottle.'],
        answer: 0,
        miscon: { 1: 'air-not-matter', 2: 'air-no-mass', 3: 'air-not-matter' },
        technique: 'Follow the arrows',
        steps: ['Before the hole: what filled the bottle?', 'Could it get out?', 'After the hole: where does the air go, and what takes its place?'],
        optionFeedback: {
          1: 'The hole is in the plasticine at the bottle\'s neck, not in the funnel. What can now leave the bottle?',
          2: 'The water is the same water. What changed is that something in the bottle can now get out.',
          3: 'Plasticine does not soak up air. The air leaves through the hole.' },
        explain: 'The bottle was full of air, which occupies space. Once the hole let the air escape, the water could flow in and take its place.' },
      { id: 'mtr-022', type: 'mcq', level: 2, syl: 'P4', skill: 'air',
        stem: 'Kumar measured the mass of a football. He then pumped more air into it and measured it again. How much air did he pump in?',
        figure: TBL_BALL,
        options: ['425 g', '431 g', '6 g', '856 g'],
        answer: 2,
        miscon: { 0: 'difference-mixup', 1: 'difference-mixup', 3: 'difference-mixup' },
        technique: 'Start minus left',
        steps: ['Mass after pumping: 431 g.', 'Mass before pumping: 425 g.', 'Mass of air added = after - before.'],
        optionFeedback: {
          0: '425 g is the ball before any extra air. Find how much the mass went UP.',
          1: '431 g is the ball with all its air. Take away the mass before pumping.',
          3: 'Adding the two readings counts the ball twice. Find the difference.' },
        explain: '431 g - 425 g = 6 g of air was pumped in. This shows that air has mass.' },
      { id: 'mtr-023', type: 'mcq', level: 3, syl: 'P4', skill: 'air',
        stem: 'Which of these show that air occupies space?\nA: A balloon gets bigger as air is blown into it.\nB: Bubbles rise when an "empty" bottle is pushed into water mouth-down and tilted.\nC: A blown-up balloon makes one side of a balanced stick go down.\nD: A tissue stays dry in an upside-down cup pushed into water.',
        figure: null,
        options: ['A and C only', 'A, B and D only', 'B and C only', 'A, B, C and D'],
        answer: 1,
        miscon: { 0: 'mass-is-volume', 2: 'mass-is-volume', 3: 'mass-is-volume' },
        technique: 'Tick or cross',
        steps: ['For each one, ask: does it show air taking up SPACE, or air having MASS?', 'Tick the ones about space.', 'Cross the ones about mass.', 'I choose the option with only the ticks.'],
        optionFeedback: {
          0: 'A is right. But C shows that air has mass, which is a different property.',
          2: 'B is right. C shows mass, not space. Look again at A and D.',
          3: 'A, B and D are right. C is about mass: a heavier side going down.' },
        explain: 'A, B and D show that air takes up space. C shows that air has mass.' },

      // ----- Measuring mass and volume -----
      { id: 'mtr-024', type: 'mcq', level: 1, syl: 'P4', skill: 'volume',
        stem: 'Which of these units can be used for the volume of a liquid?',
        figure: null,
        options: ['g', 'kg', 'cm', 'ml'],
        answer: 3,
        miscon: { 0: 'unit-mixup', 1: 'unit-mixup', 2: 'unit-mixup' },
        optionFeedback: {
          0: 'Grams measure mass, the amount of matter.',
          1: 'Kilograms measure mass too.',
          2: 'Centimetres measure length. Volume needs cubic centimetres (cm³) or millilitres.' },
        explain: 'Volume is measured in millilitres (ml) or cubic centimetres (cm³). Grams and kilograms are for mass; centimetres are for length.' },
      { id: 'mtr-025', type: 'mcq', level: 1, syl: 'P4', skill: 'volume',
        stem: 'Which instrument is used to measure the mass of a stone?',
        figure: null,
        options: ['An electronic balance', 'A measuring cylinder', 'A ruler', 'A thermometer'],
        answer: 0,
        miscon: { 1: 'tool-mixup', 2: 'tool-mixup', 3: 'tool-mixup' },
        optionFeedback: {
          1: 'A measuring cylinder measures volume, the space something takes up.',
          2: 'A ruler measures length.',
          3: 'A thermometer measures temperature.' },
        explain: 'A balance measures mass. A measuring cylinder measures volume.' },
      { id: 'mtr-026', type: 'mcq', level: 2, syl: 'P4', skill: 'volume',
        stem: 'What is the volume of water in the measuring cylinder?',
        figure: FIG_CYL_64,
        options: ['62 ml', '63 ml', '64 ml', '66 ml'],
        answer: 2,
        miscon: { 0: 'scale-misread', 1: 'scale-misread', 3: 'scale-misread' },
        technique: 'Count, then check',
        steps: ['How many spaces are there between 60 and 70? Five.', 'So each small mark stands for 10 ÷ 5 = 2 ml.', 'Count the marks from 60 up to the water level.'],
        optionFeedback: {
          0: 'That is only one mark above 60. Count again from 60 to the water surface.',
          1: 'Each small mark is 2 ml, not 1 ml. Count the marks and multiply by 2.',
          3: 'That is one mark too many. Count carefully from 60 to the water surface.' },
        explain: 'Each small mark is 2 ml. The water is 2 marks above 60, so 60 + 4 = 64 ml.' },
      { id: 'mtr-027', type: 'mcq', level: 2, syl: 'P4', skill: 'volume',
        stem: 'Lina put a stone into a measuring cylinder of water. What is the volume of the stone?',
        figure: FIG_DISP_STONE,
        options: ['50 cm³', '72 cm³', '122 cm³', '22 cm³'],
        answer: 3,
        miscon: { 0: 'difference-mixup', 1: 'difference-mixup', 2: 'difference-mixup' },
        technique: 'Start minus left',
        steps: ['Read the level before: 50 ml.', 'Read the level after: 72 ml.', 'The stone pushed the water up by after - before.'],
        optionFeedback: {
          0: '50 ml is the water alone. How much did the level go UP?',
          1: '72 ml is the water and stone together. Take away the water.',
          2: 'Adding the readings counts the water twice. Find the difference.' },
        explain: 'Volume of stone = 72 - 50 = 22 cm³ (1 ml = 1 cm³).' },
      { id: 'mtr-028', type: 'mcq', level: 3, syl: 'P4', skill: 'volume',
        stem: 'Wei put three identical marbles into a measuring cylinder of water. What is the volume of ONE marble?',
        figure: FIG_DISP_MARBLES,
        options: ['5 cm³', '15 cm³', '55 cm³', '18 cm³'],
        answer: 0,
        miscon: { 1: 'per-item-mixup', 2: 'difference-mixup', 3: 'per-item-mixup' },
        technique: 'Start minus left',
        steps: ['Before: 40 ml. After: 55 ml.', 'Volume of all three marbles = 55 - 40.', 'Share that volume equally among the three marbles.'],
        optionFeedback: {
          1: '15 cm³ is all three marbles together. The question asks for one.',
          2: '55 ml is the water and marbles together. Start by finding the rise.',
          3: 'Find the rise first (55 - 40), then share it among three marbles.' },
        explain: 'All three marbles: 55 - 40 = 15 cm³. One marble: 15 ÷ 3 = 5 cm³.' },
      { id: 'mtr-029', type: 'mcq', level: 2, syl: 'P4', skill: 'volume',
        stem: 'Ben filled an overflow can with water up to the spout. He gently put a stone in, and the water that flowed out was collected, as shown. What is the volume of the stone?',
        figure: FIG_OVERFLOW,
        options: ['30 cm³', '35 cm³', '40 cm³', '50 cm³'],
        answer: 1,
        miscon: { 0: 'scale-misread', 2: 'scale-misread', 3: 'scale-misread' },
        technique: 'Count, then check',
        steps: ['What does each small mark on the cylinder stand for?', 'Read the water level.', 'The water that overflowed has the same volume as the stone.'],
        optionFeedback: {
          0: 'Each small mark is 5 ml. The water is one mark ABOVE 30.',
          2: 'Look again: the water is below the 40 mark.',
          3: '50 ml is the top of the scale, not the water level.' },
        explain: 'The overflowed water reads 35 ml. The stone pushed out water equal to its own volume, so the stone is 35 cm³.' },

      // ----- OEQs -----
      { id: 'mtr-030', type: 'oeq', level: 1, marks: 2, syl: 'P4', skill: 'matter',
        stem: 'A rock, a glass of water and the air in a room are all matter. State the two things that all matter has.',
        figure: null,
        model: 'All matter has mass and occupies space.',
        keys: [['has mass', 'mass'], ['occupies space', 'takes up space', 'has volume']],
        watchFor: ['matter-must-be-solid', 'air-not-matter'],
        technique: 'Count, then check',
        steps: ['The question wants two things.', 'Can the rock, the water AND the air all be weighed?', 'Do all three fill up some space?', 'Check you wrote both.'],
        explain: 'One mark for "has mass". One mark for "occupies space" (takes up space).' },
      { id: 'mtr-031', type: 'oeq', level: 2, marks: 2, syl: 'P4', skill: 'matter',
        stem: 'Jun Kai says, "My water bottle is empty, so there is nothing in it." Explain why he is not correct.',
        figure: null,
        model: 'The bottle is filled with air. Air is matter because it has mass and occupies space.',
        keys: [['air'], ['occupies space', 'takes up space', 'has mass']],
        watchFor: ['empty-means-nothing', 'air-not-matter'],
        technique: 'Claim, evidence, reason',
        steps: ['Claim: what is really inside the bottle?', 'Reason: why does that count as matter?', 'Use the words "mass" or "space".'],
        explain: 'One mark for saying the bottle contains air. One mark for saying air is matter that has mass or occupies space.' },
      { id: 'mtr-032', type: 'oeq', level: 2, marks: 3, syl: 'P4', skill: 'states',
        stem: 'The table shows some properties of substances J, K and L. What state of matter is K? Give two reasons from the table.',
        figure: TBL_STATES_JKL,
        model: 'K is a liquid. It takes the shape of its container, so it has no definite shape. It cannot be compressed easily, so it has a definite volume.',
        keys: [['liquid'], ['no definite shape', 'takes the shape of its container'], ['cannot be compressed easily', 'definite volume', 'cannot be compressed']],
        watchFor: ['states-mixup', 'liquid-compressible'],
        technique: 'Claim, evidence, reason',
        steps: ['Claim: name the state.', 'Evidence 1: what does the table say about its shape?', 'Evidence 2: what does the table say about compressing it?'],
        explain: 'One mark for "liquid". One mark for no definite shape (takes the shape of its container). One mark for "cannot be compressed easily" (a definite volume), which rules out a gas.' },
      { id: 'mtr-033', type: 'oeq', level: 2, marks: 2, syl: 'P4', skill: 'states',
        stem: 'Siti pours 200 ml of orange juice from a jug into a tall glass.\n(a) What happens to the shape of the juice? (1 mark)\n(b) What is the volume of the juice in the glass? (1 mark)',
        figure: null,
        model: '(a) The juice takes the shape of the glass. (b) It is still 200 ml, because a liquid has a definite volume.',
        keys: [['takes the shape of the glass', 'shape changes', 'shape of the glass', 'changes shape'], ['still 200 ml', 'same volume', 'volume stays the same', 'volume does not change']],
        watchFor: ['shape-change-volume-change', 'liquid-definite-shape'],
        technique: 'Claim, evidence, reason',
        steps: ['A liquid: does it keep its own shape?', 'A liquid: does it keep its own volume?', 'Write one answer for (a) and one for (b).'],
        explain: '(a) It takes the shape of the glass (no definite shape). (b) Still 200 ml (definite volume).' },
      { id: 'mtr-034', type: 'oeq', level: 2, marks: 2, syl: 'P4', skill: 'states',
        stem: 'A small amount of air is pumped into a sealed box that had all its air taken out. Explain why we say a gas has no definite volume.',
        figure: null,
        model: 'The gas spreads out to fill the whole box. So its volume is the volume of the container it is in.',
        keys: [['spreads out', 'fills the whole', 'fills the box'], ['volume of the container', 'whole container', 'size of the container']],
        watchFor: ['gas-partial-fill', 'gas-definite-volume'],
        technique: 'Follow the arrows',
        steps: ['What does the air do once it is in the box?', 'How much of the box does it fill?', 'So what decides the volume of a gas?'],
        explain: 'One mark for "spreads out to fill the whole container". One mark for linking its volume to the container it is in.' },
      { id: 'mtr-035', type: 'oeq', level: 2, marks: 2, syl: 'P4', skill: 'gases',
        stem: 'Ravi sealed the tips of two syringes. Syringe A held 60 cm³ of air and syringe B held 60 cm³ of water. When he pushed both plungers, only the plunger of syringe A moved in. Explain the difference.',
        figure: null,
        model: 'The air in syringe A can be compressed into a smaller space. The water in syringe B cannot be compressed easily, so its plunger hardly moves.',
        keys: [['air in syringe A can be compressed', 'can be compressed', 'air can be squashed'], ['cannot be compressed easily', 'cannot be squashed', 'cannot be compressed']],
        watchFor: ['liquid-compressible', 'gas-not-compressible'],
        technique: 'Claim, evidence, reason',
        steps: ['A gas and a liquid: which one can be squashed?', 'Write one sentence about the air in A.', 'Write one sentence about the water in B.'],
        explain: 'One mark: air (a gas) can be compressed. One mark: water (a liquid) cannot be compressed easily.' },
      { id: 'mtr-036', type: 'oeq', level: 3, marks: 2, syl: 'P4', skill: 'gases', chain: true,
        stem: 'A glass vase is packed in bubble wrap. Explain how the air in the bubbles helps to protect the vase when the parcel is knocked.',
        figure: null,
        model: 'The air in the bubbles can be compressed. When the parcel is knocked, the bubbles squash and cushion the vase, so less of the knock reaches it.',
        keys: [['can be compressed', 'compressed', 'squashed'], ['cushion', 'absorbs', 'softens', 'less of the knock']],
        watchFor: ['gas-not-compressible'],
        technique: 'Follow the arrows',
        steps: ['What is special about air when it is pressed?', 'So what do the bubbles do when the parcel is knocked?', 'How does that help the vase?'],
        explain: 'In order: air can be compressed -> the bubbles squash and cushion the vase.' },
      { id: 'mtr-037', type: 'oeq', level: 3, marks: 5, syl: 'P4', skill: 'gases',
        stem: 'Hafiz sealed the tip of a syringe of air and stood it upright. He placed masses on the plunger one at a time and recorded the volume of air in the syringe.\n(a) What happens to the volume of the air as more masses are added? (1 mark)\n(b) Explain why the volume can change. (2 marks)\n(c) How does the mass of the air with 3 masses compare with the mass of the air at the start? (1 mark)\n(d) He repeats the test with water in the syringe. Predict what will happen to the volume of the water. (1 mark)',
        figure: TBL_SYR,
        model: '(a) The volume decreases. (b) Air can be compressed, so the masses squash it into a smaller space. (c) The mass stays the same, because the tip is sealed and no air escapes. (d) The volume hardly changes, because water cannot be compressed easily.',
        keys: [['decreases', 'gets smaller', 'becomes smaller'], ['air can be compressed', 'can be compressed'], ['smaller space', 'less space'], ['mass stays the same', 'same mass', 'mass does not change', 'mass is the same'], ['hardly changes', 'stays about the same', 'does not decrease', 'cannot be compressed easily']],
        watchFor: ['compress-changes-mass', 'liquid-compressible'],
        technique: 'Read, compare, conclude',
        steps: ['Read the table from top to bottom: what happens to the volume?', 'Why can air be squashed at all?', 'Is the tip sealed? Then can the amount of air change?', 'Water is a liquid: can it be squashed easily?'],
        explain: '(a) Volume decreases (1). (b) Air can be compressed (1) into a smaller space (1). (c) Same mass: no air got in or out (1). (d) Hardly changes: water cannot be compressed easily (1).' },
      { id: 'mtr-038', type: 'oeq', level: 2, marks: 3, syl: 'P4', skill: 'air', chain: true,
        stem: 'A stick hangs level from a string, with an empty balloon P at one end and an empty balloon Q at the other. Balloon Q is then blown up and hung back in the same place. What will happen to the stick? Explain why.',
        figure: FIG_BAL_BEFORE,
        model: 'Balloon Q now contains air. Air has mass, so the Q side becomes heavier and moves down.',
        keys: [['contains air', 'has air', 'filled with air', 'air inside'], ['air has mass'], ['moves down', 'goes down', 'tilts down', 'drops']],
        watchFor: ['air-no-mass', 'mass-is-volume'],
        technique: 'Follow the arrows',
        steps: ['What was added to balloon Q?', 'Does that have mass?', 'So which side of the stick goes down?'],
        explain: 'In order: Q now contains air -> air has mass -> the Q side moves down.' },
      { id: 'mtr-039', type: 'oeq', level: 3, marks: 5, syl: 'P4', skill: 'air',
        stem: 'Mei pushed an upside-down cup with a dry tissue stuck at its bottom straight down into a tank of water, as shown.\n(a) When she lifted the cup straight out, the tissue was dry. Explain why. (3 marks)\n(b) She did it again, but this time she tilted the cup under the water. Bubbles rose and the tissue became wet. Explain why. (2 marks)',
        figure: FIG_CUP,
        model: '(a) The cup was full of air. The air occupies space and is trapped, so the water cannot enter the cup and reach the tissue. (b) When the cup was tilted, the air escaped as bubbles. The water then entered the cup to take its place and wet the tissue.',
        keys: [['full of air', 'cup had air', 'contains air', 'air in the cup'], ['occupies space', 'takes up space'], ['cannot enter', 'cannot get in', 'cannot fill', 'cannot reach'], ['air escaped', 'air escapes', 'air came out', 'air left'], ['water then entered', 'water entered', 'water filled', 'take its place', 'water took its place']],
        watchFor: ['air-not-matter', 'empty-means-nothing'],
        chain: true,
        technique: 'Follow the arrows',
        steps: ['(a) What filled the cup before it went in?', 'What does that do to the space inside?', 'So can the water get to the tissue?', '(b) What were the bubbles? What took their place?'],
        explain: '(a) Air in the cup (1) occupies space (1), so water cannot enter (1). (b) Tilting lets the air escape as bubbles (1), so water enters and wets the tissue (1).' },
      { id: 'mtr-040', type: 'oeq', level: 2, marks: 3, syl: 'P4', skill: 'air', chain: true,
        stem: 'Arif sealed a funnel into a bottle with plasticine, as shown. When he poured water into the funnel, the water stayed in the funnel. Explain why.',
        figure: FIG_FUNNEL,
        model: 'The bottle is full of air. The air occupies space and cannot escape past the plasticine, so the water cannot flow into the bottle.',
        keys: [['full of air', 'contains air', 'air in the bottle', 'filled with air'], ['occupies space', 'takes up space'], ['cannot escape', 'cannot get out', 'no way out', 'trapped']],
        watchFor: ['air-not-matter', 'empty-means-nothing'],
        technique: 'Follow the arrows',
        steps: ['What is already inside the "empty" bottle?', 'What does it do to the space inside?', 'Can it get out past the plasticine?'],
        explain: 'In order: the bottle is full of air -> air occupies space -> it cannot escape, so the water stays in the funnel.' },
      { id: 'mtr-041', type: 'oeq', level: 2, marks: 2, syl: 'P4', skill: 'volume', chain: true,
        stem: 'When Lina lowered a stone into a measuring cylinder of water, the water level went up. Explain why.',
        figure: null,
        model: 'The stone occupies space. It pushes aside some of the water, so the water level rises.',
        keys: [['occupies space', 'takes up space'], ['pushes aside', 'displaces', 'pushes the water up', 'moves the water']],
        watchFor: [],
        technique: 'Follow the arrows',
        steps: ['What does every piece of matter do to space?', 'So what happens to the water where the stone now is?', 'Where can that water go?'],
        explain: 'In order: the stone occupies space -> it pushes aside (displaces) water -> the level rises.' },
      { id: 'mtr-042', type: 'oeq', level: 3, marks: 3, syl: 'P4', skill: 'volume',
        stem: 'Describe how to find the volume of a small, odd-shaped stone using a measuring cylinder and some water.',
        figure: null,
        model: 'Pour some water into the measuring cylinder and record the first reading. Lower the stone in so that it is fully under water, and record the new reading. Subtract the first reading from the new reading to get the volume of the stone.',
        keys: [['first reading', 'record the reading', 'read the level', 'initial reading'], ['fully under water', 'completely under water', 'fully covered', 'completely covered'], ['subtract', 'difference', 'minus', 'take away']],
        watchFor: ['difference-mixup'],
        technique: 'Start minus left',
        steps: ['Step 1: water in, then read the level.', 'Step 2: stone in, all the way under, then read again.', 'Step 3: how do the two readings give the volume?'],
        explain: 'One mark for the first reading of the water alone. One mark for the stone fully under water before the second reading. One mark for subtracting (new reading - first reading).' },
      { id: 'mtr-043', type: 'oeq', level: 3, marks: 4, syl: 'P4', skill: 'volume',
        stem: 'Ali put a stone into a measuring cylinder of water, as shown.\n(a) What is the volume of the stone? (1 mark)\n(b) Ali then puts in a second stone with a volume of 10 cm³. Predict the new water level. (1 mark)\n(c) A cork floats on water. Suggest how Ali could make sure he measures the whole volume of the cork, and explain why. (2 marks)',
        figure: FIG_DISP_60_85,
        model: '(a) 85 - 60 = 25 cm³. (b) 95 ml. (c) He could push it fully under with a thin pin, so that all of the cork pushes aside water. Or he could tie it to a sinker, measure the cork and sinker together, and subtract the sinker\'s volume.',
        keys: [['25 cm³', '25'], ['95 ml', '95'], ['push it fully under with a thin pin', 'hold it under', 'completely under', 'tie it to a sinker', 'tie it to a heavy object'], ['all of the cork pushes aside water', 'displaces water', 'part above the water would not be measured', 'whole cork is under water']],
        watchFor: ['difference-mixup'],
        technique: 'Start minus left',
        steps: ['(a) Before 60 ml, after 85 ml: find the rise.', '(b) Count on 10 ml from the new level.', '(c) A floating cork is partly above water. How can all of it go under?'],
        explain: '(a) 25 cm³. (b) 85 + 10 = 95 ml. (c) Push the cork fully under with a thin pin, or tie it to a sinker and subtract the sinker\'s volume (1), so that all of the cork pushes aside water and no part above the water is missed (1).' },
      { id: 'mtr-044', type: 'oeq', level: 3, marks: 3, syl: 'P4', skill: 'volume',
        stem: 'Ben filled an overflow can up to the spout and put a stone in. The water that flowed out was collected in a measuring cylinder, as shown.\n(a) What is the volume of the stone? (1 mark)\n(b) Why must the can be filled exactly up to the spout before the stone is put in? (2 marks)',
        figure: FIG_OVERFLOW,
        model: '(a) 35 cm³. (b) If the can is filled to the spout, every bit of water the stone pushes aside flows out. So the volume of water collected equals the volume of the stone.',
        keys: [['35 cm³', '35'], ['every bit of water', 'all the water', 'pushes aside', 'displaces'], ['equals the volume', 'same as the volume', 'equal to the volume']],
        watchFor: ['difference-mixup', 'scale-misread'],
        technique: 'Claim, evidence, reason',
        steps: ['(a) Read the cylinder: what is each small mark worth?', '(b) What if the can was not full? Would the first water pushed aside flow out?', 'So what is the link between the water collected and the stone?'],
        explain: '(a) 35 cm³. (b) Filled to the spout, all the water the stone displaces flows out (1), so the water collected equals the stone\'s volume (1).' }
    ]
  });
})();
