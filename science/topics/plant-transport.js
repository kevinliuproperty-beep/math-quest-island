"use strict";
// Science Quest — topic: Plant transport system (P5, Systems). Data only; the helpers below just build SVG/HTML strings.
// Scope per MOE Primary Science Syllabus 2023, theme Systems, "Plant System (plant transport system)" (P5 block,
// examined at PSLE 0009 from 2026). Sources checked 2026-10-30 (school briefings quoting the 2023 syllabus;
// the PDFs themselves would not download on the day, so search-result summaries were used):
//   - Shuqun Pri, P5 Science Handbook / P5 Foundation Science Handbook: P5 "Plant System" and "Human System
//     (respiratory and circulatory systems)"; "identify the parts of the plant transport system and describe
//     their functions"  https://www.shuqunpri.moe.edu.sg/files/P5_Science_Handbook.pdf
//   - Jurong West Pri, P5 Science Briefing Slides 2026: plant transport under "Systems"
//     https://www.jurongwestpri.moe.edu.sg/files/Slides%20and%20info/P5__Science__Briefing_Slides_2026.pdf
//   - Lianhua Pri, P5 Parents' Briefing 2026: plant transport system taught in P5 Term 3
//     https://lianhuapri.moe.edu.sg/files/Resources/P5_Parents__Briefing_2026_Part1_LHPS_Student_Outcomes.pdf
//   - Tampines North Pri, 2023 P5 Science SOW Outline: "Plant Transport System"
//     https://www.tampinesnorthpri.moe.edu.sg/files/2023%20P5%20SOW/P5%20Science%20SOW%20Outline.pdf
//   (The MOE PDF itself, moe.gov.sg 2023-primary-science.pdf, did not load on the day.)
// In scope here: water-carrying tubes carry water and mineral salts from the roots to all other parts;
//   food-carrying tubes carry food made in the leaves to all other parts (down to the roots and up to
//   flowers and fruits); roots take in water and mineral salts; leaves make food and their veins hold
//   both kinds of tube; both kinds of tube run through roots, stem, leaves and flowers; removing a ring of
//   bark removes the food-carrying tubes (nearer the outside) but leaves the water-carrying tubes; a
//   swelling forms above the ring; the roots starve and the plant dies in time; dyed-water experiments
//   with celery and white flowers, including a split stalk; fair tests on water taken in by leafy shoots.
// The primary terms "water-carrying tubes" and "food-carrying tubes" are used throughout; xylem and phloem
//   are not named (secondary-school terms).
// Deliberately LEFT OUT (uncertain at P5 level): root hairs, the word "transpiration", stomata, how plants
//   take in oxygen (plant respiration), photosynthesis details (P5 Energy topic). Items on a leafy shoot
//   losing water from its leaves are kept to "water evaporates from the leaves" (borderline, see report).
(function () {
  const INK = '#1f2937', LINE = '#475569', GREEN = '#4d9a3a', LEAF = '#7cc46a', BARK = '#8b5a2b', WOOD = '#ead3a8';
  const SOIL = '#ead9b8', RED = '#f87171', BLUEW = '#93c5fd', REDW = '#fca5a5', OIL = '#fde68a';

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
    return `<line x1="${x1}" y1="${y1}" x2="${bx.toFixed(1)}" y2="${by.toFixed(1)}" stroke="${c}" stroke-width="${o.width || 3}"/>` +
      `<polygon points="${x2},${y2} ${(bx + px).toFixed(1)},${(by + py).toFixed(1)} ${(bx - px).toFixed(1)},${(by - py).toFixed(1)}" fill="${c}"/>`;
  };
  const lead = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${LINE}" stroke-width="1.4"/><circle cx="${x2}" cy="${y2}" r="2.5" fill="${LINE}"/>`;

  const TH = 'border:1px solid #94a3b8;padding:6px 10px;background:#e2e8f0;color:#111827';
  const TD = 'border:1px solid #94a3b8;padding:6px 10px;text-align:center';
  const table = (head, rows, caption) =>
    `<table style="border-collapse:collapse;margin:0 auto;font-size:15px">` +
    (caption ? `<caption style="padding:4px 0 6px;font-weight:600">${caption}</caption>` : '') +
    `<thead><tr>${head.map((h) => `<th style="${TH}">${h}</th>`).join('')}</tr></thead>` +
    `<tbody>${rows.map((r) => `<tr>${r.map((c) => `<td style="${TD}">${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  const stack = (a, b) => `<div>${a}<div style="height:10px"></div>${b}</div>`;

  const flower = (cx, cy, fill = '#ffffff') => {
    let s = '';
    for (let k = 0; k < 6; k++) {
      const a = (k * Math.PI) / 3;
      s += `<circle cx="${(cx + 13 * Math.cos(a)).toFixed(1)}" cy="${(cy + 13 * Math.sin(a)).toFixed(1)}" r="10" fill="${fill}" stroke="${LINE}" stroke-width="1.3"/>`;
    }
    return s + `<circle cx="${cx}" cy="${cy}" r="7" fill="#f6c90e" stroke="${LINE}"/>`;
  };

  // ---------- Figures ----------
  // A plant with four arrows: P up the stem, Q from a leaf down the stem, R from the soil into the roots.
  const FIG_ARROWS = (() => {
    let s = `<rect x="2" y="190" width="356" height="86" fill="${SOIL}"/><line x1="2" y1="190" x2="358" y2="190" stroke="#8b6b3e" stroke-width="2"/>`;
    s += `<line x1="180" y1="190" x2="180" y2="62" stroke="${GREEN}" stroke-width="8"/>`;
    s += `<ellipse cx="140" cy="100" rx="42" ry="14" fill="${LEAF}" stroke="${GREEN}" transform="rotate(20 140 100)"/>`;
    s += `<ellipse cx="220" cy="88" rx="42" ry="14" fill="${LEAF}" stroke="${GREEN}" transform="rotate(-20 220 88)"/>`;
    s += `<circle cx="180" cy="48" r="15" fill="#fb923c" stroke="${INK}"/>`;
    s += `<g stroke="${BARK}" stroke-width="3" fill="none"><path d="M180 190 L150 248 L132 262"/><path d="M180 190 L212 246 L232 258"/><path d="M180 190 L182 266"/><path d="M160 228 L140 232"/><path d="M202 228 L222 234"/></g>`;
    s += txt(214, 40, 'fruit', { size: 13, anchor: 'start' }) + txt(100, 74, 'leaf', { size: 13 }) + txt(300, 254, 'soil', { size: 13 });
    s += arrow(198, 178, 198, 118) + txt(214, 150, 'P', { bold: 1, size: 17 });
    s += arrow(162, 118, 162, 178) + txt(146, 150, 'Q', { bold: 1, size: 17 });
    s += arrow(84, 238, 136, 236) + txt(70, 238, 'R', { bold: 1, size: 17 });
    return svg(360, 280, 'A plant with a fruit, two leaves and roots in the soil. Arrow P points up the stem, arrow Q points down the stem from a leaf, arrow R points from the soil to the roots', s);
  })();

  // Cross-section of a young stem: a ring of tube groups, X nearer the outside, Y nearer the centre.
  const FIG_SECTION = (() => {
    let s = `<circle cx="140" cy="120" r="92" fill="#e3f1d6" stroke="${BARK}" stroke-width="8"/>`;
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4 + Math.PI / 8;
      s += `<circle cx="${(140 + 72 * Math.cos(a)).toFixed(1)}" cy="${(120 + 72 * Math.sin(a)).toFixed(1)}" r="7" fill="#f6c26b" stroke="${LINE}"/>`;
      s += `<circle cx="${(140 + 54 * Math.cos(a)).toFixed(1)}" cy="${(120 + 54 * Math.sin(a)).toFixed(1)}" r="8" fill="${BLUEW}" stroke="${LINE}"/>`;
    }
    const ax = 140 + 72 * Math.cos(-Math.PI * 3 / 8), ay = 120 + 72 * Math.sin(-Math.PI * 3 / 8);
    s += lead(268, 34, ax.toFixed(1), ay.toFixed(1)) + txt(282, 34, 'X', { bold: 1, size: 17 });
    const bx = 140 + 54 * Math.cos(Math.PI * 3 / 8), by = 120 + 54 * Math.sin(Math.PI * 3 / 8);
    s += lead(268, 214, bx.toFixed(1), by.toFixed(1)) + txt(282, 214, 'Y', { bold: 1, size: 17 });
    s += txt(140, 232, 'bark on the outside', { size: 13 });
    return svg(310, 246, 'A cut stem seen from above: a ring of small tube groups. Tubes X are nearer the outside, tubes Y are nearer the centre', s);
  })();

  // A young tree with a ring of bark removed from its trunk; A above the ring, B below. swell: a bulge above.
  const ring = (swell) => {
    let s = `<line x1="2" y1="244" x2="358" y2="244" stroke="#8b6b3e" stroke-width="2"/><rect x="2" y="245" width="356" height="32" fill="${SOIL}"/>`;
    s += `<circle cx="128" cy="56" r="38" fill="${LEAF}" stroke="${GREEN}"/><circle cx="212" cy="56" r="38" fill="${LEAF}" stroke="${GREEN}"/><circle cx="170" cy="40" r="40" fill="${LEAF}" stroke="${GREEN}"/>`;
    s += `<rect x="150" y="84" width="40" height="160" fill="${BARK}"/>`;
    if (swell) s += `<ellipse cx="170" cy="138" rx="30" ry="12" fill="${BARK}"/>`;
    s += `<rect x="150" y="146" width="40" height="22" fill="${WOOD}" stroke="${LINE}"/>`;
    s += `<g stroke="${BARK}" stroke-width="4" fill="none"><path d="M160 244 L136 268"/><path d="M180 244 L206 270"/><path d="M170 244 L170 274"/></g>`;
    s += lead(232, 157, 190, 157) + txt(238, 150, 'ring of bark', { size: 13, anchor: 'start' }) + txt(238, 166, 'removed', { size: 13, anchor: 'start' });
    s += lead(110, 110, 150, 110) + txt(96, 110, 'A', { bold: 1, size: 17 });
    s += lead(110, 206, 150, 206) + txt(96, 206, 'B', { bold: 1, size: 17 });
    if (swell) s += lead(262, 124, 196, 136) + txt(268, 118, 'swelling', { size: 13, anchor: 'start' });
    return svg(360, 280, swell ? 'A young tree with a ring of bark removed from its trunk and a swelling just above the ring. A is above the ring and B is below it' : 'A young tree with a ring of bark removed from its trunk. Part A of the trunk is above the ring and part B is below it', s);
  };
  const FIG_RING = ring(false), FIG_RING_SWELL = ring(true);

  // A white flower with its stalk in a beaker of blue-coloured water.
  const FIG_FLOWER = (() => {
    let s = `<rect x="96" y="140" width="128" height="100" fill="none" stroke="${LINE}" stroke-width="2"/>`;
    s += `<rect x="98" y="168" width="124" height="70" fill="${BLUEW}"/>`;
    s += `<line x1="160" y1="230" x2="160" y2="60" stroke="${GREEN}" stroke-width="5"/>`;
    s += `<ellipse cx="136" cy="120" rx="22" ry="8" fill="${LEAF}" stroke="${GREEN}" transform="rotate(25 136 120)"/>`;
    s += flower(160, 48);
    s += txt(194, 34, 'white flower', { size: 13, anchor: 'start' });
    s += txt(160, 256, 'blue-coloured water', { size: 13 });
    return svg(320, 270, 'A white flower with its stalk standing in a beaker of blue-coloured water', s);
  })();

  // A white flower whose stalk is split into two halves: one half in red water, the other in blue water.
  const FIG_SPLIT = (() => {
    let s = `<rect x="34" y="160" width="110" height="86" fill="none" stroke="${LINE}" stroke-width="2"/><rect x="36" y="186" width="106" height="58" fill="${REDW}"/>`;
    s += `<rect x="216" y="160" width="110" height="86" fill="none" stroke="${LINE}" stroke-width="2"/><rect x="218" y="186" width="106" height="58" fill="${BLUEW}"/>`;
    s += `<g stroke="${GREEN}" stroke-width="5" fill="none"><path d="M180 64 L180 112"/><path d="M178 112 L92 236"/><path d="M182 112 L268 236"/></g>`;
    s += flower(180, 48);
    s += txt(214, 34, 'white flower', { size: 13, anchor: 'start' });
    s += txt(202, 120, 'stalk split', { size: 13, anchor: 'start' }) + txt(202, 136, 'into two halves', { size: 13, anchor: 'start' });
    s += txt(89, 260, 'red water', { size: 13 }) + txt(271, 260, 'blue water', { size: 13 });
    return svg(360, 274, 'A white flower whose stalk is split into two halves. One half stands in red-coloured water and the other half in blue-coloured water', s);
  })();

  // Two measuring cylinders with a layer of oil: A has a leafy shoot, B the same kind of shoot with all leaves removed.
  const FIG_CYL = (() => {
    const cyl = (x, leaves, tag) => {
      let s = `<rect x="${x - 30}" y="70" width="60" height="170" fill="none" stroke="${LINE}" stroke-width="2"/>`;
      s += `<rect x="${x - 28}" y="116" width="56" height="122" fill="${BLUEW}"/><rect x="${x - 28}" y="108" width="56" height="8" fill="${OIL}" stroke="#b45309" stroke-width="0.8"/>`;
      for (let m = 0; m < 6; m++) s += `<line x1="${x + 22}" y1="${130 + m * 18}" x2="${x + 30}" y2="${130 + m * 18}" stroke="${LINE}"/>`;
      s += `<line x1="${x}" y1="210" x2="${x}" y2="30" stroke="${GREEN}" stroke-width="4"/>`;
      if (leaves) [[-22, 44, 25], [22, 56, -25], [-22, 80, 25], [22, 90, -25]].forEach(([dx, y, r]) => { s += `<ellipse cx="${x + dx}" cy="${y}" rx="20" ry="8" fill="${LEAF}" stroke="${GREEN}" transform="rotate(${r} ${x + dx} ${y})"/>`; });
      return s + txt(x, 256, tag, { bold: 1, size: 16 });
    };
    let s = cyl(90, true, 'A') + cyl(270, false, 'B');
    s += txt(180, 96, 'layer of oil', { size: 13 }) + lead(146, 104, 118, 111) + lead(214, 104, 242, 111);
    s += txt(180, 180, 'water', { size: 13 });
    return svg(360, 270, 'Two measuring cylinders of water, each with a layer of oil on top. Cylinder A holds a leafy shoot; cylinder B holds the same kind of shoot with all its leaves removed', s);
  })();

  // A branch with a ring of bark removed between the trunk and a bunch of fruits.
  const FIG_BRANCH = (() => {
    let s = `<rect x="20" y="20" width="34" height="222" fill="${BARK}"/>`;
    s += `<rect x="54" y="104" width="290" height="16" fill="${BARK}"/><rect x="112" y="104" width="18" height="16" fill="${WOOD}" stroke="${LINE}"/>`;
    [[176, 90, -30], [236, 88, 30], [300, 90, -30], [270, 136, 25]].forEach(([x, y, r]) => { s += `<ellipse cx="${x}" cy="${y}" rx="24" ry="9" fill="${LEAF}" stroke="${GREEN}" transform="rotate(${r} ${x} ${y})"/>`; });
    [[196, 146], [222, 152], [208, 172]].forEach(([x, y]) => { s += `<line x1="${x}" y1="120" x2="${x}" y2="${y - 12}" stroke="${GREEN}" stroke-width="2"/><circle cx="${x}" cy="${y}" r="12" fill="#fb923c" stroke="${INK}"/>`; });
    s += lead(121, 64, 121, 104) + txt(121, 52, 'ring of bark removed', { size: 13 });
    s += txt(210, 204, 'fruits', { size: 13 }) + txt(70, 228, 'trunk', { size: 13, anchor: 'start' });
    return svg(360, 246, 'A tree branch with leaves and a bunch of fruits. A ring of bark has been removed from the branch between the trunk and the fruits', s);
  })();

  const TBL_FOUR = table(['Plant', 'What was done to it'], [
    ['W', 'Nothing'],
    ['X', 'A ring of bark removed near the base of the stem'],
    ['Y', 'All roots cut off; stem pushed back into moist soil'],
    ['Z', 'Half of its leaves cut off']], 'Four similar potted plants, watered every day');

  const TBL_LEAVES = table(['Number of leaves on the shoot', 'Volume of water taken in after 2 days (ml)'],
    [['0', '2'], ['4', '7'], ['8', '12'], ['12', '17']], 'Results');

  const TBL_DYE = table(['Temperature of the dyed water (°C)', 'Time for the leaves to start turning red (min)'],
    [['20', '60'], ['30', '45'], ['40', '30']], 'Results');

  SCI.registerTopic({
    id: 'plant-transport',
    title: 'Plant transport',
    emoji: '🌿',
    theme: 'Systems',
    level: 'P5',
    moeRef: 'Plant System: plant transport system (P5), MOE Primary Science Syllabus 2023, theme Systems: identify the parts of the plant transport system and describe their functions (roots take in water and mineral salts; water-carrying tubes carry water and mineral salts from the roots to the other parts; food-carrying tubes carry food from the leaves to the other parts); investigate the movement of water in plants (dyed-water experiments) and the effect of removing a ring of bark. Scope checked against 2025/2026 school briefings (Shuqun, Jurong West, Lianhua, Tampines North; URLs in the file header).',
    skills: {
      tubes: 'Water- and food-carrying tubes',
      roots: 'Roots, water and mineral salts',
      leaves: 'Leaves and food',
      ringing: 'Removing a ring of bark',
      dye: 'Dyed-water experiments',
      fairtest: 'Fair tests and results'
    },
    misconceptions: {
      'tubes-swap': 'Mixing up the water-carrying tubes and the food-carrying tubes.',
      'one-tube': 'Water and food travel in the same tubes.',
      'water-down': 'Water travels from the leaves down to the roots.',
      'food-down-only': 'Food in a plant travels only downwards, so it never reaches flowers or fruits.',
      'food-from-soil': 'Plants take in their food from the soil through their roots.',
      'mineral-is-food': 'Mineral salts are the food of the plant.',
      'roots-skipped': 'Forgets that the roots take in the water first, before it travels up the stem.',
      'tubes-only-stem': 'The transport tubes are found only in the stem.',
      'no-transport-needed': 'Every part of a plant gets its own food and water, so nothing needs to be carried.',
      'leaves-water-source': 'Leaves are where a plant gets its water, from the air or by making it.',
      'ring-cuts-water': 'Removing a ring of bark cuts off the water supply, so the leaves wilt at once.',
      'ring-swell-below': 'The swelling forms below the ring instead of above it.',
      'ring-no-harm': 'Removing a ring of bark does no lasting harm to the plant.',
      'ring-stops-leaves': 'Without the bark ring, the leaves can no longer make food.',
      'dye-everywhere': 'The dye spreads evenly through the whole stem, not just along the tubes.',
      'dye-food-tubes': 'The dyed water travels in the food-carrying tubes.',
      'dye-only-stem': 'The dyed water stays in the stem and does not reach the leaves or petals.',
      'tubes-mix': 'Water from different tubes mixes together before it reaches the flower.',
      'setup-purpose-mixup': 'Mixing up why a part of a set-up is there, such as the layer of oil.',
      'graph-misread': 'Reading a value from the wrong row or column of a table.',
      'read-wrong-end': 'Picking a middle value when the question needs the largest or the smallest.',
      'changed-measured-mixup': 'Mixing up the variable that is changed, the variable that is measured and the variables kept the same.'
    },
    notes: [
      { title: 'Two kinds of tubes',
        body: 'A plant has a transport system made of tubes.\n- Water-carrying tubes carry water and mineral salts from the roots to the stem, leaves, flowers and fruits.\n- Food-carrying tubes carry food made in the leaves to all the other parts of the plant.\nWater moves UP from the roots. Food moves from the leaves to wherever it is needed: down to the roots and up to the flowers and fruits.' },
      { title: 'Roots',
        body: 'Roots take in water and mineral salts from the soil. Mineral salts are dissolved in the water. Roots also hold the plant firmly in the soil. Roots cannot make food, so food must be carried to them from the leaves.' },
      { title: 'Leaves',
        body: 'Leaves make food for the plant. They need water, which travels up from the roots in the water-carrying tubes. The veins of a leaf hold both kinds of tubes: they bring water in and carry food out. Plants do NOT take in food from the soil.' },
      { title: 'Where are the tubes?',
        body: 'Both kinds of tubes run through the roots, stem, leaves and flowers. In a stem, the food-carrying tubes are nearer the outside, just under the bark. The water-carrying tubes are deeper inside.' },
      { title: 'Removing a ring of bark',
        body: 'Peel a ring of bark off a trunk and you remove the food-carrying tubes there. The water-carrying tubes are deeper, so they are not removed.\n- Water still reaches the leaves: the leaves stay fresh for a long time.\n- Food from the leaves cannot pass down the ring. It collects just ABOVE the ring, which swells.\n- The roots get no food. In time they die, stop taking in water, and the whole plant dies.' },
      { title: 'Dyed-water experiments',
        body: 'Stand a celery stalk or a white flower in coloured water. After some hours the leaves or petals become coloured: water travels up the water-carrying tubes. Cut across the stalk and you see coloured dots: these are the water-carrying tubes.\nSplit a stalk into two halves, one in red water and one in blue: some petals turn red and some turn blue, because each tube carries water to certain parts only.' },
      { title: 'More leaves, more water',
        body: 'A leafy shoot in a measuring cylinder takes in water. A layer of oil on the water stops water evaporating from the water surface, so any drop in level is water taken in by the shoot. Water is lost from the leaves, so a shoot with more leaves takes in more water.' },
      { title: 'Fair tests',
        body: 'Change ONE variable (for example, the number of leaves). Measure ONE thing (for example, the volume of water taken in). Keep everything else the same: the same kind of plant, the same starting volume of water, the same place and the same time.' }
    ],
    items: [
      // ----- Water- and food-carrying tubes -----
      { id: 'ptr-001', type: 'mcq', level: 1, syl: 'P5', skill: 'tubes',
        stem: 'Which statement about the water-carrying tubes of a plant is correct?',
        figure: null,
        options: ['They carry water and mineral salts from the roots to other parts.', 'They carry food from the leaves to other parts.', 'They carry water from the leaves down to the roots.', 'They carry food from the soil up to the leaves.'],
        answer: 0,
        miscon: { 1: 'tubes-swap', 2: 'water-down', 3: 'food-from-soil' },
        optionFeedback: {
          1: 'That is the job of the other kind of tube, the food-carrying tubes.',
          2: 'Water enters at the roots, so it travels UP from the roots, not down from the leaves.',
          3: 'Plants make their own food in the leaves. The soil gives water and mineral salts, not food.' },
        explain: 'Water-carrying tubes carry water and mineral salts, taken in by the roots, up to the stem, leaves, flowers and fruits.' },
      { id: 'ptr-002', type: 'mcq', level: 1, syl: 'P5', skill: 'tubes',
        stem: 'Food made in the leaves is carried to the other parts of a plant by the ...',
        figure: null,
        options: ['water-carrying tubes', 'mineral salts in the water', 'food-carrying tubes', 'tiny holes in the roots'],
        answer: 2,
        miscon: { 0: 'tubes-swap', 1: 'mineral-is-food', 3: 'food-from-soil' },
        optionFeedback: {
          0: 'Water-carrying tubes carry water and mineral salts. Food has its own tubes.',
          1: 'Mineral salts are not food, and they cannot carry anything. Think about tubes.',
          3: 'Roots take in water and mineral salts. The food comes from the leaves, so look for tubes.' },
        explain: 'Food-carrying tubes carry the food made in the leaves to all other parts of the plant.' },
      { id: 'ptr-003', type: 'mcq', level: 1, syl: 'P5', skill: 'roots',
        stem: 'Which two things does a plant take in from the soil through its roots?',
        figure: null,
        options: ['Water and mineral salts', 'Water and food', 'Food and mineral salts', 'Food and sunlight'],
        answer: 0,
        miscon: { 1: 'food-from-soil', 2: 'food-from-soil', 3: 'food-from-soil' },
        optionFeedback: {
          1: 'Water, yes. But a plant makes its own food in the leaves; it does not take food from the soil.',
          2: 'Mineral salts, yes. But food is made in the leaves, not taken in from the soil.',
          3: 'Sunlight falls on the leaves, not the roots, and food is made in the leaves.' },
        explain: 'Roots take in water and mineral salts (dissolved in the water) from the soil. Food is made in the leaves.' },
      { id: 'ptr-004', type: 'mcq', level: 2, syl: 'P5', skill: 'tubes',
        stem: 'Look at the arrows on the plant. Which arrow shows the direction in which food made in the leaf travels to the roots?',
        figure: FIG_ARROWS,
        options: ['P', 'R', 'P and R', 'Q'],
        answer: 3,
        miscon: { 0: 'tubes-swap', 1: 'food-from-soil', 2: 'food-from-soil' },
        technique: 'Follow the arrows',
        steps: ['Where is the food made? In the leaf.', 'Where must it go? Down to the roots.', 'Find the arrow that starts at the leaf and points down the stem.'],
        optionFeedback: {
          0: 'P points UP from the roots. That is the way water travels.',
          1: 'R goes from the soil into the roots. Food is not taken in from the soil.',
          2: 'P and R both show water moving: from the soil, into the roots, and up the stem.' },
        explain: 'Arrow Q starts at the leaf, where food is made, and points down the stem towards the roots.' },
      { id: 'ptr-005', type: 'mcq', level: 2, syl: 'P5', skill: 'tubes',
        stem: 'Look at the arrows on the plant again. Which arrows show the movement of water?',
        figure: FIG_ARROWS,
        options: ['P only', 'Q only', 'P and R', 'Q and R'],
        answer: 2,
        miscon: { 0: 'roots-skipped', 1: 'water-down', 3: 'water-down' },
        technique: 'Follow the arrows',
        steps: ['Where does water first enter the plant? From the soil into the roots.', 'Then which way does it travel in the stem?', 'Pick every arrow on that path.'],
        optionFeedback: {
          0: 'P is right. But the water first has to get from the soil into the roots. Which arrow shows that?',
          1: 'Q points down from the leaf. Water travels UP from the roots.',
          3: 'R is right, but Q points down from the leaf. Water goes up the stem.' },
        explain: 'R shows water going from the soil into the roots, and P shows water travelling up the stem to the leaves and fruit.' },
      { id: 'ptr-006', type: 'mcq', level: 2, syl: 'P5', skill: 'leaves',
        stem: 'A ripe mango from Mr Tan\'s tree tastes very sweet. Where was the sugar in the mango made, and how did it reach the fruit?',
        figure: null,
        options: ['In the roots, from the soil, then up the water-carrying tubes', 'In the leaves, then carried to the fruit by the food-carrying tubes', 'In the fruit itself, from mineral salts in the water', 'In the leaves, then carried to the fruit by the water-carrying tubes'],
        answer: 1,
        miscon: { 0: 'food-from-soil', 2: 'mineral-is-food', 3: 'tubes-swap' },
        optionFeedback: {
          0: 'Roots take in water and mineral salts, not sugar. Where is a plant\'s food made?',
          2: 'Mineral salts are not food. Food, such as sugar, is made in one part of the plant only.',
          3: 'The leaves part is right. Check which tubes carry food.' },
        explain: 'Food (sugar) is made in the leaves and carried to the fruit by the food-carrying tubes.' },
      { id: 'ptr-007', type: 'mcq', level: 2, syl: 'P5', skill: 'tubes',
        stem: 'Which statement about the food-carrying tubes is correct?',
        figure: null,
        options: ['They carry food only downwards, to the roots.', 'They carry water from the roots to the leaves.', 'They carry food from the leaves to all other parts.', 'They carry mineral salts from the soil to the leaves.'],
        answer: 2,
        miscon: { 0: 'food-down-only', 1: 'tubes-swap', 3: 'tubes-swap' },
        optionFeedback: {
          0: 'Food does go down to the roots, but flowers and fruits above the leaves need food too.',
          1: 'That is the job of the water-carrying tubes.',
          3: 'Mineral salts travel with water, in the water-carrying tubes.' },
        explain: 'Food-carrying tubes carry food from the leaves to every part that needs it: down to the roots, and up to buds, flowers and fruits.' },
      { id: 'ptr-008', type: 'mcq', level: 2, syl: 'P5', skill: 'tubes',
        stem: 'In which parts of a flowering plant are water-carrying tubes found?\nA: roots\nB: stem\nC: leaves\nD: flowers',
        figure: null,
        options: ['A and B only', 'B and C only', 'A, B and C only', 'A, B, C and D'],
        answer: 3,
        miscon: { 0: 'tubes-only-stem', 1: 'tubes-only-stem', 2: 'tubes-only-stem' },
        technique: 'Tick or cross',
        steps: ['Take one part at a time.', 'Does water have to reach or pass through this part?', 'Remember the white flower in dyed water: its petals changed colour.', 'Choose the option with every tick.'],
        optionFeedback: {
          0: 'Water must also reach the leaves, and the petals of a flower in dyed water change colour too.',
          1: 'Water enters at the roots, so the tubes start there. And think of the dyed petals.',
          2: 'A white flower in dyed water gets coloured petals. So the flower has these tubes too.' },
        explain: 'Water-carrying tubes run from the roots, through the stem, into the leaves and flowers. All four parts have them.' },
      { id: 'ptr-009', type: 'mcq', level: 3, syl: 'P5', skill: 'ringing',
        stem: 'The diagram shows a cut stem with two kinds of tubes, X and Y. Lina removed a ring of bark from a similar stem. This removed tubes X but not tubes Y. After two weeks, a swelling formed just above the ring. What are tubes X?',
        figure: FIG_SECTION,
        options: ['Water-carrying tubes, because water collected above the ring', 'Food-carrying tubes, because food collected above the ring', 'Food-carrying tubes, because the leaves above the ring wilted at once', 'Water-carrying tubes, because the roots stopped taking in water'],
        answer: 1,
        miscon: { 0: 'tubes-swap', 2: 'ring-cuts-water', 3: 'tubes-swap' },
        technique: 'Claim, evidence, reason',
        steps: ['Evidence: something collected above the ring and made it swell.', 'What travels DOWN the stem from the leaves?', 'Claim: X carries that, so X must be ...'],
        optionFeedback: {
          0: 'Water travels UP from the roots, so it would not pile up above the ring. What comes down from the leaves?',
          2: 'X are food-carrying tubes, but the leaves do not wilt at once: water still goes up through tubes Y.',
          3: 'The roots kept taking in water for a long time. What travels down from the leaves and got stuck?' },
        explain: 'Food made in the leaves travels down the food-carrying tubes. With tubes X removed, food could not pass the ring, so it collected above it and caused a swelling. X are the food-carrying tubes.' },

      // ----- Removing a ring of bark -----
      { id: 'ptr-010', type: 'mcq', level: 1, syl: 'P5', skill: 'ringing',
        stem: 'Kumar removed a ring of bark from the trunk of a young tree, as shown. Which tubes did he remove at the ring?',
        figure: FIG_RING,
        options: ['Water-carrying tubes only', 'Food-carrying tubes only', 'Both kinds of tubes', 'Neither kind of tube'],
        answer: 1,
        miscon: { 0: 'tubes-swap', 2: 'ring-cuts-water', 3: 'ring-no-harm' },
        optionFeedback: {
          0: 'The water-carrying tubes are deeper inside the stem. Which tubes are just under the bark?',
          2: 'Only the tubes near the outside come off with the bark. The deeper ones stay.',
          3: 'The tubes just under the bark come off with it. Which kind are they?' },
        explain: 'The food-carrying tubes lie just under the bark, so they are removed with it. The water-carrying tubes are deeper and stay.' },
      { id: 'ptr-011', type: 'mcq', level: 2, syl: 'P5', skill: 'ringing',
        stem: 'Look at Kumar\'s tree. After a few weeks, a swelling appeared on the trunk. Where did it appear, and why?',
        figure: FIG_RING,
        options: ['At B, because water from the roots could not pass up the ring', 'At B, because food from the leaves collected there', 'At A, because water from the roots collected there', 'At A, because food from the leaves could not pass down the ring'],
        answer: 3,
        miscon: { 0: 'ring-cuts-water', 1: 'ring-swell-below', 2: 'tubes-swap' },
        technique: 'Follow the arrows',
        steps: ['Food is made in the leaves at the top.', 'It travels down the trunk towards the roots.', 'It reaches the ring, where its tubes are missing.', 'So on which side of the ring does it pile up?'],
        optionFeedback: {
          0: 'The water-carrying tubes are still there, so water passes the ring. Think about food instead.',
          1: 'Food comes DOWN from the leaves. It gets stuck before it passes the ring, so which side is that?',
          2: 'Water is still carried up past the ring. What travels down and gets stuck?' },
        explain: 'Food travels down from the leaves in the food-carrying tubes. At the ring these tubes are gone, so the food collects just above the ring, at A, and the trunk swells there.' },
      { id: 'ptr-012', type: 'mcq', level: 2, syl: 'P5', skill: 'ringing',
        stem: 'After Kumar removed the ring of bark, the leaves of the tree stayed fresh and green for many weeks. Why?',
        figure: FIG_RING,
        options: ['The leaves took in all the water they needed from the air.', 'The food-carrying tubes carried water up to the leaves.', 'Removing the ring helped the roots take in more water.', 'The water-carrying tubes were not removed, so water still reached the leaves.'],
        answer: 3,
        miscon: { 0: 'leaves-water-source', 1: 'tubes-swap', 2: 'ring-no-harm' },
        optionFeedback: {
          0: 'Leaves get their water from the roots, through tubes. Which tubes are still there?',
          1: 'Food-carrying tubes carry food, and they were removed at the ring anyway.',
          2: 'The ring does not help the roots. Which tubes did the ring leave behind?' },
        explain: 'The water-carrying tubes lie deeper in the trunk and were not removed. Water and mineral salts still travelled up past the ring to the leaves.' },
      { id: 'ptr-013', type: 'mcq', level: 3, syl: 'P5', skill: 'ringing',
        stem: 'Many months after the ring of bark was removed, Kumar\'s tree died. Which is the best explanation?',
        figure: null,
        options: ['The roots got no food, so in time they died and stopped taking in water.', 'The leaves could no longer get water, so they wilted at once.', 'The leaves could no longer make food once the bark was gone.', 'Food from the soil could no longer reach the leaves.'],
        answer: 0,
        miscon: { 1: 'ring-cuts-water', 2: 'ring-stops-leaves', 3: 'food-from-soil' },
        technique: 'Follow the arrows',
        steps: ['Which tubes were removed at the ring?', 'Which part of the tree is cut off from its food?', 'What happens to that part in time?', 'Then what happens to the water supply?'],
        optionFeedback: {
          1: 'The leaves stayed green for months, so water was still reaching them. Look below the ring.',
          2: 'The leaves still had water and light, so they kept making food. Where could that food not go?',
          3: 'Plants do not take food from the soil. Food is made in the leaves and must travel down.' },
        explain: 'Food could not pass the ring, so the roots got no food. In time the roots died, could no longer take in water, and the whole tree died.' },
      { id: 'ptr-014', type: 'mcq', level: 3, syl: 'P5', skill: 'ringing',
        stem: 'A farmer removed a ring of bark from one branch of a fruit tree, between the trunk and a bunch of fruits, as shown. The fruits on this branch grew bigger than the fruits on the other branches. Why?',
        figure: FIG_BRANCH,
        options: ['More water reached the fruits, because the ring removed the water-carrying tubes.', 'The roots sent more food up the branch to the fruits.', 'Food made by the leaves on this branch could not leave it, so more went to the fruits.', 'The fruits began to make their own food once the bark was removed.'],
        answer: 2,
        miscon: { 0: 'tubes-swap', 1: 'food-from-soil', 3: 'no-transport-needed' },
        technique: 'Follow the arrows',
        steps: ['Where is the food for the fruits made?', 'Before the ring, where could some of that food go?', 'After the ring, can it pass towards the trunk?', 'So where does more of it end up?'],
        optionFeedback: {
          0: 'The ring removes the food-carrying tubes, not the water-carrying ones. Think about food.',
          1: 'Roots do not make food. The food comes from the leaves.',
          3: 'Fruits do not make their own food. Which part on the branch makes it?' },
        explain: 'The ring removed the food-carrying tubes on that branch. Food made by its leaves could not pass the ring to the rest of the tree, so more of it went to the fruits, which grew bigger.' },

      // ----- Dyed-water experiments -----
      { id: 'ptr-015', type: 'mcq', level: 2, syl: 'P5', skill: 'dye',
        stem: 'Mei stood a white flower in blue-coloured water, as shown. A day later, the petals had turned light blue. What does this show?',
        figure: FIG_FLOWER,
        options: ['Food travels down the stalk from the petals.', 'The petals took in blue water from the air.', 'Water travels from the petals down to the beaker.', 'Water travels up the stalk to the petals.'],
        answer: 3,
        miscon: { 0: 'dye-food-tubes', 1: 'leaves-water-source', 2: 'water-down' },
        optionFeedback: {
          0: 'The blue colour came from the water in the beaker, not from food. Which way did it travel?',
          1: 'The blue water is in the beaker, not the air. How did it reach the petals?',
          2: 'The colour started in the beaker at the bottom and ended up in the petals. Which way is that?' },
        explain: 'The blue water was taken up the water-carrying tubes in the stalk to the petals. Water travels upwards in a plant.' },
      { id: 'ptr-016', type: 'mcq', level: 2, syl: 'P5', skill: 'dye',
        stem: 'After her experiment, Mei cut across the stalk of the flower and looked at the cut end. What did she most likely see?',
        figure: FIG_FLOWER,
        options: ['The whole cut end evenly blue', 'Blue dots in some places only', 'Blue only in the food-carrying tubes', 'No blue at all, as the dye had passed through'],
        answer: 1,
        miscon: { 0: 'dye-everywhere', 2: 'dye-food-tubes', 3: 'dye-only-stem' },
        optionFeedback: {
          0: 'The blue water does not soak the whole stalk. It travels only along certain tubes.',
          2: 'Food-carrying tubes carry food from the leaves. The blue water went up in the other tubes.',
          3: 'The tubes are still full of blue water, so their colour shows on the cut end.' },
        explain: 'The blue water travels only in the water-carrying tubes, so the cut end shows blue dots where those tubes are.' },
      { id: 'ptr-017', type: 'mcq', level: 3, syl: 'P5', skill: 'dye',
        stem: 'Jun split the stalk of a white flower into two halves. He put one half in red water and the other half in blue water, as shown. What did the petals most likely look like after a day?',
        figure: FIG_SPLIT,
        options: ['All the petals were red.', 'Some petals were red and some were blue.', 'All the petals were purple, a mix of red and blue.', 'The petals stayed white.'],
        answer: 1,
        miscon: { 0: 'tubes-mix', 2: 'tubes-mix', 3: 'dye-only-stem' },
        technique: 'Follow the arrows',
        steps: ['Follow the red water up its half of the stalk.', 'Follow the blue water up the other half.', 'Do the tubes from the two halves join and mix?', 'So what colours do the petals show?'],
        optionFeedback: {
          0: 'Both halves of the stalk still take up water, so where does the blue water go?',
          2: 'Each tube carries its water to certain petals. The two colours do not mix in the tubes.',
          3: 'The water-carrying tubes in each half still carry water to the petals.' },
        explain: 'Each half of the stalk has its own water-carrying tubes. Red water reached some petals and blue water reached others, so some petals turned red and some turned blue.' },
      { id: 'ptr-018', type: 'mcq', level: 3, syl: 'P5', skill: 'dye',
        stem: 'Jun\'s split-stalk flower ended up with some red petals and some blue petals. What does this result show?',
        figure: FIG_SPLIT,
        options: ['Each water-carrying tube carries water to certain parts of the flower only.', 'Water travels down from the petals to the beakers.', 'The dyed water travels in the food-carrying tubes.', 'The petals make the red and blue colours themselves.'],
        answer: 0,
        miscon: { 1: 'water-down', 2: 'dye-food-tubes', 3: 'no-transport-needed' },
        optionFeedback: {
          1: 'The colours started in the beakers and ended in the petals. Which way did the water go?',
          2: 'Dyed water is still water, so it travels in the water-carrying tubes.',
          3: 'White petals do not turn red or blue on their own. The colour came from the beakers.' },
        explain: 'The water-carrying tubes in each half of the stalk carried water to different petals and did not mix, so the colours ended up in separate petals.' },

      // ----- Roots, leaves and the whole system -----
      { id: 'ptr-019', type: 'mcq', level: 2, syl: 'P5', skill: 'roots',
        stem: 'Look at the table. Four similar potted plants were set up and watered every day. Which plant most likely wilted first?',
        figure: TBL_FOUR,
        options: ['W', 'X', 'Y', 'Z'],
        answer: 2,
        miscon: { 0: 'no-transport-needed', 1: 'ring-cuts-water', 3: 'no-transport-needed' },
        technique: 'Tick or cross',
        steps: ['For each plant, ask: can water still get in and travel up to the leaves?', 'Which plant has lost the part that takes in water?', 'Choose that plant.'],
        optionFeedback: {
          0: 'Nothing was done to W, so it can still take in water and make food.',
          1: 'The ring removes food-carrying tubes only. Water still goes up, so X stays fresh for a long time.',
          3: 'Z still has roots and half its leaves. Water still gets in. Which plant cannot take in water?' },
        explain: 'Plant Y has no roots, so it cannot take in water from the soil. Its leaves get no water and it wilts first.' },
      { id: 'ptr-020', type: 'mcq', level: 2, syl: 'P5', skill: 'roots',
        stem: 'Uncle Tan mixed some fertiliser, which contains mineral salts, into the soil around his chilli plant. How do the mineral salts reach the leaves?',
        figure: null,
        options: ['Taken in by the roots with water, then up the food-carrying tubes', 'Taken in by the leaves from the air, then down the stem', 'Taken in by the roots with water, then up the water-carrying tubes', 'Made in the leaves, then carried down by the food-carrying tubes'],
        answer: 2,
        miscon: { 0: 'tubes-swap', 1: 'leaves-water-source', 3: 'mineral-is-food' },
        optionFeedback: {
          0: 'The roots part is right. Mineral salts travel with the water, so which tubes carry them?',
          1: 'The fertiliser is in the soil, so it must enter through the part in the soil.',
          3: 'Mineral salts are not food made in the leaves. They come from the soil.' },
        explain: 'Mineral salts dissolve in the soil water. The roots take them in with the water, and the water-carrying tubes carry them up to the leaves.' },
      { id: 'ptr-021', type: 'mcq', level: 2, syl: 'P5', skill: 'leaves',
        stem: 'The veins of a leaf contain ...',
        figure: null,
        options: ['water-carrying tubes only', 'food-carrying tubes only', 'both water-carrying and food-carrying tubes', 'no tubes; they only keep the leaf flat'],
        answer: 2,
        miscon: { 0: 'one-tube', 1: 'one-tube', 3: 'tubes-only-stem' },
        optionFeedback: {
          0: 'Water does come into the leaf. But the food made in the leaf must also get out.',
          1: 'Food does leave the leaf. But how does the water get in to the leaf?',
          3: 'Veins do help support the leaf, but they also carry things in and out.' },
        explain: 'Leaf veins hold both kinds of tubes: water-carrying tubes bring water in, and food-carrying tubes carry the food made in the leaf out to the rest of the plant.' },
      { id: 'ptr-022', type: 'mcq', level: 3, syl: 'P5', skill: 'tubes',
        stem: 'Which of these statements are correct?\nA: Food-carrying tubes carry food to the roots.\nB: Water-carrying tubes carry mineral salts.\nC: Water travels from the leaves to the roots.\nD: A plant takes in food through its roots.',
        figure: null,
        options: ['A and B only', 'A and C only', 'B and D only', 'A, B and C only'],
        answer: 0,
        miscon: { 1: 'water-down', 2: 'food-from-soil', 3: 'water-down' },
        technique: 'Tick or cross',
        steps: ['Take one statement at a time.', 'Ask: which way does water go? Where is food made?', 'Tick the true ones, cross the false ones.', 'Choose the option with only the ticks.'],
        optionFeedback: {
          1: 'A is right. But water travels UP from the roots, so C is false. Check B.',
          2: 'B is right. But plants make their own food in the leaves, so D is false. Check A.',
          3: 'A and B are right. But water travels UP from the roots, so C is false.' },
        explain: 'A and B are true. C is false: water travels up from the roots. D is false: food is made in the leaves, not taken in from the soil.' },
      { id: 'ptr-023', type: 'mcq', level: 2, syl: 'P5', skill: 'roots',
        stem: 'Why must the food-carrying tubes carry food all the way down to the roots?',
        figure: null,
        options: ['The roots turn the food into mineral salts for the leaves.', 'The roots cannot make food, but they need it to stay alive and grow.', 'The roots send the food back out into the soil.', 'The roots do not need food; it is only stored for the leaves.'],
        answer: 1,
        miscon: { 0: 'mineral-is-food', 2: 'food-from-soil', 3: 'no-transport-needed' },
        optionFeedback: {
          0: 'Mineral salts come from the soil. They are not made from food.',
          2: 'Food is not sent out to the soil. The roots themselves use it.',
          3: 'Roots are living parts. Like every living part, they need food.' },
        explain: 'Roots are underground and cannot make food. They are living parts, so they need food from the leaves to stay alive and grow.' },
      { id: 'ptr-024', type: 'mcq', level: 1, syl: 'P5', skill: 'roots',
        stem: 'Which shows the path taken by mineral salts from the soil to a fruit?',
        figure: null,
        options: ['soil → roots → stem → fruit', 'soil → leaves → stem → fruit', 'soil → fruit → stem → roots', 'soil → stem → roots → fruit'],
        answer: 0,
        miscon: { 1: 'leaves-water-source', 2: 'water-down', 3: 'water-down' },
        optionFeedback: {
          1: 'Mineral salts are in the soil, so which part touches the soil first?',
          2: 'Mineral salts travel UP the plant from the roots.',
          3: 'Which part of the plant is in the soil? Mineral salts must enter there first.' },
        explain: 'Mineral salts are taken in by the roots with water and carried up the stem in the water-carrying tubes to the fruit.' },

      // ----- Fair tests -----
      { id: 'ptr-025', type: 'mcq', level: 2, syl: 'P5', skill: 'fairtest',
        stem: 'Siti wants to find out whether the number of leaves on a shoot affects the volume of water it takes in. Which must she keep the same?\nA: the kind of plant\nB: the number of leaves\nC: the volume of water at the start\nD: the place where the set-ups are kept',
        figure: null,
        options: ['A and B only', 'A, C and D only', 'B, C and D only', 'A, B, C and D'],
        answer: 1,
        miscon: { 0: 'changed-measured-mixup', 2: 'changed-measured-mixup', 3: 'changed-measured-mixup' },
        technique: 'Change one thing',
        steps: ['What is she changing on purpose? The number of leaves.', 'What is she measuring? The volume of water taken in.', 'Everything else stays the same.'],
        optionFeedback: {
          0: 'A must stay the same. But B, the number of leaves, is what she changes on purpose.',
          2: 'C and D must stay the same, but B is what she changes. And A must stay the same.',
          3: 'Almost. But the number of leaves (B) is the one thing she changes on purpose.' },
        explain: 'She changes the number of leaves (B). The kind of plant (A), the starting volume of water (C) and the place (D) must be kept the same.' },
      { id: 'ptr-026', type: 'mcq', level: 3, syl: 'P5', skill: 'fairtest',
        stem: 'Siti put leafy shoots of the same kind of plant into measuring cylinders of water, each with a layer of oil on top. Each shoot had a different number of leaves. Look at her results. What can she conclude?',
        figure: TBL_LEAVES,
        options: ['The more leaves on the shoot, the less water it took in.', 'A shoot with no leaves takes in no water at all.', 'The leaves made water for the shoot.', 'The more leaves on the shoot, the more water it took in.'],
        answer: 3,
        miscon: { 0: 'graph-misread', 1: 'graph-misread', 2: 'leaves-water-source' },
        technique: 'Read, compare, conclude',
        steps: ['Read: as the number of leaves goes up, what happens to the water taken in?', 'Compare the first and last rows.', 'Conclude with a "the more ..., the more ..." sentence.'],
        optionFeedback: {
          0: 'Look again: 2 ml, 7 ml, 12 ml, 17 ml. Is that going up or down?',
          1: 'Check the first row: the shoot with 0 leaves still took in 2 ml.',
          2: 'The water came from the cylinder, so the leaves did not make it.' },
        explain: 'As the number of leaves increased from 0 to 12, the water taken in increased from 2 ml to 17 ml. The more leaves, the more water the shoot took in.' },
      { id: 'ptr-027', type: 'mcq', level: 2, syl: 'P5', skill: 'fairtest',
        stem: 'In set-ups A and B, there is a layer of oil on top of the water. Why?',
        figure: FIG_CYL,
        options: ['To stop water evaporating from the water surface', 'To give the shoots food', 'To stop the shoots taking in water', 'To make the water level easier to read'],
        answer: 0,
        miscon: { 1: 'setup-purpose-mixup', 2: 'setup-purpose-mixup', 3: 'setup-purpose-mixup' },
        optionFeedback: {
          1: 'Oil is not food for the shoot, and the shoot makes its own food in its leaves.',
          2: 'The shoots still take in water through their cut ends below the oil. The oil covers the open water surface.',
          3: 'The level is read the same way with or without oil. What would happen to an open water surface?' },
        explain: 'The oil covers the water surface so no water evaporates from it. Then any drop in water level is due to water taken in by the shoot.' },
      { id: 'ptr-028', type: 'mcq', level: 3, syl: 'P5', skill: 'fairtest',
        stem: 'Look at set-ups A and B. Both started with the same volume of water. After two days, in which cylinder did the water level drop more, and why?',
        figure: FIG_CYL,
        options: ['B, because a shoot with no leaves takes in more water', 'Both the same, because the shoots are the same kind', 'A, because the oil on A was thinner', 'A, because water is lost from the leaves, so the leafy shoot takes in more water'],
        answer: 3,
        miscon: { 0: 'leaves-water-source', 1: 'changed-measured-mixup', 2: 'setup-purpose-mixup' },
        technique: 'Change one thing',
        steps: ['What is different between A and B?', 'Where is water lost from a plant?', 'So which shoot takes in more water?'],
        optionFeedback: {
          0: 'Without leaves, little water is lost from the shoot, so it takes in less.',
          1: 'The kind of shoot is the same, but one difference was set up on purpose. What is it?',
          2: 'The oil layers are the same. The only difference is the leaves.' },
        explain: 'The only difference is the leaves. Water is lost from the leaves, so the leafy shoot in A takes in more water and the level in A drops more.' },
      { id: 'ptr-029', type: 'mcq', level: 3, syl: 'P5', skill: 'dye',
        stem: 'Rahim put three similar celery stalks into red-coloured water at different temperatures. He timed how long the leaves took to start turning red. What do his results show?',
        figure: TBL_DYE,
        options: ['The warmer the water, the longer the dyed water took to reach the leaves.', 'The temperature made no difference to how fast the dyed water reached the leaves.', 'The warmer the water, the faster the dyed water reached the leaves.', 'At 20 °C the dyed water did not reach the leaves.'],
        answer: 2,
        miscon: { 0: 'graph-misread', 1: 'graph-misread', 3: 'dye-only-stem' },
        technique: 'Read, compare, conclude',
        steps: ['Read: as the temperature goes up, what happens to the time?', 'A shorter time means the water travelled faster.', 'Conclude with a "the warmer ..., the ..." sentence.'],
        optionFeedback: {
          0: 'The times go 60, 45, 30 minutes: they get SHORTER. A shorter time means faster.',
          1: 'The times change from 60 to 30 minutes, so temperature did make a difference.',
          3: 'At 20 °C the leaves did turn red, after 60 minutes.' },
        explain: 'As the temperature rose from 20 °C to 40 °C, the time fell from 60 min to 30 min. The warmer the water, the faster the dyed water reached the leaves.' },

      // ----- Open-ended -----
      { id: 'ptr-030', type: 'oeq', level: 2, marks: 4, syl: 'P5', skill: 'tubes',
        stem: 'Name the two kinds of tubes in the transport system of a plant. For each, state what it carries.',
        figure: null,
        model: 'Water-carrying tubes carry water and mineral salts from the roots. Food-carrying tubes carry food made in the leaves to the other parts.',
        keys: [['water-carrying tubes', 'water-carrying', 'water carrying'], ['water and mineral salts', 'mineral salts'], ['food-carrying tubes', 'food-carrying', 'food carrying'], ['food made in the leaves', 'food from the leaves', 'food made by the leaves']],
        watchFor: ['tubes-swap', 'one-tube'],
        technique: 'Claim, evidence, reason',
        steps: ['Name the first kind of tube.', 'Say what it carries, and from where.', 'Name the second kind of tube.', 'Say what it carries, and from where.'],
        explain: 'One mark each: water-carrying tubes; they carry water AND mineral salts; food-carrying tubes; they carry food made in the leaves. Naming a tube does not earn the mark for what it carries.' },
      { id: 'ptr-031', type: 'oeq', level: 2, marks: 2, syl: 'P5', skill: 'roots', chain: true,
        stem: 'Explain how water in the soil reaches the leaves of a plant.',
        figure: null,
        model: 'The roots take in water from the soil. The water-carrying tubes then carry the water up the stem to the leaves.',
        keys: [['roots take in', 'taken in by the roots', 'absorbed by the roots', 'roots absorb', 'roots'], ['water-carrying tubes', 'water-carrying', 'water carrying']],
        watchFor: ['water-down', 'leaves-water-source'],
        technique: 'Follow the arrows',
        steps: ['Which part takes the water in?', 'Which tubes carry it up?', 'Write the two steps in order.'],
        explain: 'In order: the roots take in the water -> the water-carrying tubes carry it up the stem to the leaves.' },
      { id: 'ptr-032', type: 'oeq', level: 3, marks: 3, syl: 'P5', skill: 'ringing', chain: true,
        stem: 'Kumar removed a ring of bark from the trunk of a young tree. The leaves stayed green for months, but in the end the whole tree died. Explain why the tree died.',
        figure: FIG_RING,
        model: 'Removing the bark removed the food-carrying tubes. Food made in the leaves could not reach the roots. The roots died, so the tree could not take in water and died.',
        keys: [['food-carrying tubes', 'food-carrying', 'food carrying'], ['could not reach the roots', 'cannot reach the roots', 'not reach the roots', 'roots got no food', 'roots get no food', 'roots did not get food', 'roots do not get food', 'no food for the roots'], ['roots died', 'roots die', 'roots will die', 'could not take in water', 'cannot take in water']],
        watchFor: ['ring-cuts-water', 'ring-stops-leaves'],
        technique: 'Follow the arrows',
        steps: ['Which tubes come off with the bark?', 'Which part of the tree is now cut off from food?', 'What happens to that part, and then to the water supply?'],
        hints: ['The leaves stayed green, so water was still getting up. What could not get down?', 'What happens to roots that get no food?'],
        explain: 'Three links in order: food-carrying tubes removed -> food cannot reach the roots -> roots die (so no water is taken in and the tree dies).' },
      { id: 'ptr-033', type: 'oeq', level: 3, marks: 2, syl: 'P5', skill: 'ringing',
        stem: 'Look at Kumar\'s tree. Explain why the leaves stayed fresh for many weeks after the ring of bark was removed.',
        figure: FIG_RING,
        model: 'The water-carrying tubes are deeper inside the trunk, so they were not removed. Water could still reach the leaves.',
        keys: [['water-carrying tubes', 'water-carrying', 'water carrying'], ['still reach the leaves', 'still reached the leaves', 'still carried to the leaves', 'still be carried', 'still get water', 'still got water', 'still go up', 'still went up', 'still travel up', 'still travelled up']],
        watchFor: ['ring-cuts-water'],
        technique: 'Claim, evidence, reason',
        steps: ['Which tubes were NOT removed with the bark?', 'What do those tubes carry?', 'So what can still reach the leaves?'],
        explain: 'One mark for the water-carrying tubes not being removed. One mark for water still reaching the leaves.' },
      { id: 'ptr-034', type: 'oeq', level: 3, marks: 3, syl: 'P5', skill: 'ringing', chain: true,
        stem: 'A few weeks after a ring of bark was removed from a tree trunk, a swelling formed just above the ring, as shown. Explain why the swelling formed above the ring.',
        figure: FIG_RING_SWELL,
        model: 'The food-carrying tubes were removed at the ring. Food made in the leaves travelling down could not pass the ring. The food collected just above the ring, so it swelled.',
        keys: [['food-carrying tubes', 'food-carrying', 'food carrying'], ['could not pass', 'cannot pass', 'could not move down', 'cannot move down', 'could not travel down', 'cannot travel down', 'could not go past', 'cannot go past', 'blocked'], ['collected', 'collects', 'built up', 'builds up', 'piled up', 'accumulated', 'gathered', 'stuck']],
        watchFor: ['ring-swell-below', 'tubes-swap'],
        technique: 'Follow the arrows',
        steps: ['Which tubes were removed at the ring?', 'Which way does food travel in the trunk?', 'Where does the food get stuck?'],
        explain: 'In order: food-carrying tubes removed -> food from the leaves cannot pass down the ring -> it collects above the ring.' },
      { id: 'ptr-035', type: 'oeq', level: 2, marks: 2, syl: 'P5', skill: 'dye', chain: true,
        stem: 'Mei stood a white flower in blue-coloured water. A day later the petals were light blue. Explain how the petals turned blue.',
        figure: FIG_FLOWER,
        model: 'The blue water was taken in at the cut end and carried up the stalk to the petals by the water-carrying tubes.',
        keys: [['carried up', 'travelled up', 'moved up', 'went up', 'goes up', 'up the stalk', 'up the stem'], ['water-carrying tubes', 'water-carrying', 'water carrying']],
        watchFor: ['dye-food-tubes', 'water-down'],
        technique: 'Follow the arrows',
        steps: ['Where does the blue water start?', 'Which way does it travel?', 'Which tubes carry it?'],
        explain: 'One mark for the blue water travelling up the stalk to the petals. One mark for naming the water-carrying tubes.' },
      { id: 'ptr-036', type: 'oeq', level: 3, marks: 2, syl: 'P5', skill: 'dye',
        stem: 'Jun split the stalk of a white flower into two halves, with one half in red water and the other in blue water. After a day, some petals were red and some were blue. Explain this result.',
        figure: FIG_SPLIT,
        model: 'Each half of the stalk has its own water-carrying tubes, and the water in them does not mix. The tubes from each half carry water to different petals.',
        keys: [['water-carrying tubes', 'water-carrying', 'water carrying'], ['does not mix', 'do not mix', 'did not mix', 'not mix', 'separate', 'different petals', 'different parts', 'certain petals']],
        watchFor: ['tubes-mix'],
        technique: 'Follow the arrows',
        steps: ['Follow the red water up its half.', 'Follow the blue water up the other half.', 'Do they meet and mix? Where does each one go?'],
        explain: 'One mark for the water-carrying tubes in each half carrying the water up. One mark for the tubes going to different petals without mixing.' },
      { id: 'ptr-037', type: 'oeq', level: 2, marks: 2, syl: 'P5', skill: 'leaves', chain: true,
        stem: 'The fruits on a tall papaya tree grow on the trunk, below the leaves. Explain how the fruits get food.',
        figure: null,
        model: 'The food is made in the leaves. The food-carrying tubes carry it from the leaves to the fruits.',
        keys: [['made in the leaves', 'leaves make', 'leaves made'], ['food-carrying tubes', 'food-carrying', 'food carrying']],
        watchFor: ['food-from-soil', 'tubes-swap'],
        technique: 'Follow the arrows',
        steps: ['Where is the food made?', 'Which tubes carry food?', 'Write the two steps in order.'],
        explain: 'In order: food is made in the leaves -> the food-carrying tubes carry it to the fruits.' },
      { id: 'ptr-038', type: 'oeq', level: 3, marks: 5, syl: 'P5', skill: 'fairtest',
        stem: 'Siti set up leafy shoots in measuring cylinders of water, with a layer of oil on each, and recorded her results in the table.\n(a) Which variable did she change? (1 mark)\n(b) What did she measure? (1 mark)\n(c) Name one variable she must keep the same. (1 mark)\n(d) Why did she put a layer of oil on the water? (1 mark)\n(e) What can she conclude from her results? (1 mark)',
        figure: TBL_LEAVES,
        model: '(a) The number of leaves. (b) The volume of water taken in. (c) The same kind of plant. (d) To stop water evaporating from the water surface. (e) The more leaves, the more water the shoot takes in.',
        keys: [['number of leaves'], ['volume of water', 'amount of water', 'water taken in', 'water level', 'drop in'], ['same kind of plant', 'same plant', 'same type of plant', 'same volume', 'same amount of water', 'same starting', 'same place', 'same time', 'same size', 'same length', 'same temperature'], ['evaporating', 'evaporate', 'evaporation'], ['the more leaves, the more water', 'more leaves, more water', 'more leaves took in more water']],
        watchFor: ['changed-measured-mixup', 'setup-purpose-mixup', 'graph-misread'],
        technique: 'Change one thing',
        steps: ['What did she change on purpose?', 'What did she measure to see the result?', 'What else could change the result? Keep it the same.', 'What would happen to an open water surface?', 'Read the table from top to bottom and write the pattern.'],
        explain: '(a) number of leaves; (b) volume of water taken in; (c) any one variable kept the same: kind of plant, size of shoot, starting volume of water, place, time; (d) stops evaporation from the water surface; (e) the more leaves, the more water taken in.' },
      { id: 'ptr-039', type: 'oeq', level: 2, marks: 3, syl: 'P5', skill: 'roots', chain: true,
        stem: 'Uncle Tan mixed some fertiliser, which contains mineral salts, into the soil around his chilli plant. Explain how the mineral salts reach the leaves.',
        figure: null,
        model: 'The mineral salts dissolve in the water in the soil. The roots take in the water with the mineral salts. The water-carrying tubes carry them up the stem to the leaves.',
        keys: [['dissolve', 'dissolved', 'with the water', 'in the water'], ['roots'], ['water-carrying tubes', 'water-carrying', 'water carrying']],
        watchFor: ['mineral-is-food', 'tubes-swap'],
        technique: 'Follow the arrows',
        steps: ['What happens to the mineral salts in moist soil?', 'Which part takes them in?', 'Which tubes carry them up?'],
        explain: 'In order: the mineral salts dissolve in soil water -> the roots take them in -> the water-carrying tubes carry them to the leaves.' },
      { id: 'ptr-040', type: 'oeq', level: 3, marks: 4, syl: 'P5', skill: 'ringing',
        stem: 'A farmer removed a ring of bark from one branch of a fruit tree, between the trunk and a bunch of fruits, as shown.\n(a) Which tubes did he remove at the ring? (1 mark)\n(b) The fruits on this branch grew bigger than those on other branches. Explain why. (2 marks)\n(c) Did the leaves on this branch wilt? Explain. (1 mark)',
        figure: FIG_BRANCH,
        model: '(a) The food-carrying tubes. (b) Food made by the leaves on this branch could not pass the ring to the rest of the tree, so more food went to the fruits. (c) No, because the water-carrying tubes were not removed, so water still reached the leaves.',
        keys: [['food-carrying tubes', 'food-carrying', 'food carrying'], ['could not pass', 'cannot pass', 'could not leave', 'cannot leave', 'could not go', 'cannot go', 'stayed in the branch', 'stays in the branch'], ['more food went to the fruits', 'more food', 'more of the food'], ['water-carrying tubes', 'water-carrying', 'water carrying', 'water still reached', 'still get water', 'still got water']],
        watchFor: ['tubes-swap', 'ring-cuts-water'],
        technique: 'Follow the arrows',
        steps: ['Which tubes lie just under the bark?', 'Where does food from these leaves usually go?', 'With the ring there, where does it go instead?', 'Which tubes still carry water up?'],
        explain: '(a) food-carrying tubes; (b) food from the leaves on the branch cannot pass the ring, so more of it goes to the fruits; (c) no wilting: the water-carrying tubes are still there.' },
      { id: 'ptr-041', type: 'oeq', level: 2, marks: 2, syl: 'P5', skill: 'tubes',
        stem: 'Ravi says, "The food-carrying tubes carry food from the roots up to the leaves." Explain why Ravi is not correct.',
        figure: null,
        model: 'Food is made in the leaves, not taken in by the roots. The food-carrying tubes carry the food from the leaves to the other parts, such as the roots.',
        keys: [['made in the leaves', 'leaves make', 'leaves made'], ['from the leaves to', 'to the roots', 'to other parts', 'to the other parts', 'to all parts']],
        watchFor: ['food-from-soil', 'food-down-only'],
        technique: 'Claim, evidence, reason',
        steps: ['Where is a plant\'s food made?', 'So which way must the food travel?', 'Say what Ravi got the wrong way round.'],
        explain: 'One mark for food being made in the leaves. One mark for the food being carried from the leaves to other parts, such as the roots.' },
      { id: 'ptr-042', type: 'oeq', level: 2, marks: 2, syl: 'P5', skill: 'leaves',
        stem: 'Explain why a plant needs tubes that carry water up to its leaves.',
        figure: null,
        model: 'The leaves need water to make food. The leaves are far from the soil, so the water taken in by the roots must be carried up to them.',
        keys: [['make food', 'making food', 'to make its food', 'lose water', 'replace water', 'would wilt', 'not wilt'], ['far from the soil', 'not in the soil', 'do not touch the soil', 'away from the soil', 'taken in by the roots', 'roots take in']],
        watchFor: ['leaves-water-source'],
        technique: 'Claim, evidence, reason',
        steps: ['What do leaves use water for?', 'Where is the water taken in?', 'So why must it be carried?'],
        explain: 'One mark for the leaves needing water to make food, or to replace water lost from the leaves. One mark for the water being taken in at the roots, far from the leaves.' },
      { id: 'ptr-043', type: 'oeq', level: 3, marks: 4, syl: 'P5', skill: 'roots',
        stem: 'Look at the table. Four similar potted plants were set up and watered every day.\n(a) Which plant most likely wilted first? (1 mark)\n(b) Explain your answer. (2 marks)\n(c) Plant X\'s leaves stayed fresh for many weeks. Explain why. (1 mark)',
        figure: TBL_FOUR,
        model: '(a) Plant Y. (b) It has no roots, so it cannot take in water from the soil, and its leaves get no water. (c) The ring removed only the food-carrying tubes; the water-carrying tubes still carried water to the leaves.',
        keys: [['plant Y', 'Y'], ['no roots', 'roots were cut', 'roots cut off', 'without roots', 'roots were removed'], ['cannot take in water', 'could not take in water', 'no water', 'not take in water'], ['water-carrying tubes', 'water-carrying', 'water carrying']],
        watchFor: ['ring-cuts-water', 'no-transport-needed'],
        technique: 'Claim, evidence, reason',
        steps: ['Claim: name the plant.', 'Evidence: what was done to it?', 'Reason: what can it no longer do?', 'For X: which tubes did the ring leave?'],
        explain: '(a) Y; (b) no roots, so it cannot take in water; (c) the water-carrying tubes in X were not removed, so water still reached the leaves.' },
      { id: 'ptr-044', type: 'oeq', level: 3, marks: 5, syl: 'P5', skill: 'fairtest',
        stem: 'Rahim put three similar celery stalks into red-coloured water and recorded his results in the table.\n(a) Which variable did he change? (1 mark)\n(b) What did he measure? (1 mark)\n(c) Name two variables he must keep the same. (2 marks)\n(d) In which tubes did the red water travel? (1 mark)',
        figure: TBL_DYE,
        model: '(a) The temperature of the water. (b) The time taken for the leaves to start turning red. (c) First variable kept the same: the same volume of water. A second, different variable kept the same: the same amount of dye. (d) The water-carrying tubes.',
        keys: [['temperature'], ['time taken', 'time', 'how long'], ['first variable kept the same', 'same volume of water', 'same amount of water', 'same amount of dye', 'same colour', 'same size', 'same length', 'same number of leaves', 'same kind', 'same type', 'same celery'], ['a second, different variable kept the same', 'same amount of dye', 'same volume of water', 'same amount of water', 'same colour', 'same size', 'same length', 'same number of leaves', 'same kind', 'same type', 'same celery'], ['water-carrying tubes', 'water-carrying', 'water carrying']],
        watchFor: ['changed-measured-mixup', 'dye-food-tubes'],
        technique: 'Change one thing',
        steps: ['What did he change on purpose?', 'What did he measure?', 'What else could change the time? Keep two of them the same.', 'Dyed water is still water: which tubes carry it?'],
        explain: '(a) temperature of the water; (b) time for the leaves to start turning red; (c) one mark each for two DIFFERENT variables kept the same: volume of water, amount of dye, size or length of stalk, number of leaves; (d) water-carrying tubes.' },
      { id: 'ptr-045', type: 'oeq', level: 3, marks: 2, syl: 'P5', skill: 'tubes',
        stem: 'Food-carrying tubes carry food both downwards and upwards in a plant. Give one example of each.',
        figure: null,
        model: 'Downwards: food is carried from the leaves down to the roots. Upwards: food is carried from the leaves up to the flowers and fruits.',
        keys: [['down to the roots', 'to the roots', 'to the root'], ['up to the flowers', 'to the flowers', 'to the fruits', 'to the fruit', 'to the buds', 'to the young leaves', 'to the shoot', 'to the flower']],
        watchFor: ['food-down-only'],
        technique: 'Claim, evidence, reason',
        steps: ['Food starts in the leaves.', 'Name a part BELOW the leaves that needs food.', 'Name a part ABOVE the leaves that needs food.'],
        explain: 'One mark for food going down to the roots. One mark for food going up to the flowers, fruits, buds or young leaves.' }
    ]
  });
})();
