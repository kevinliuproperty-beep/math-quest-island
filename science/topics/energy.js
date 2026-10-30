"use strict";
// Science Quest — topic: Energy (P6, Energy). Data only; the helpers below just build SVG/HTML strings.
// Scope per MOE Primary Science Syllabus 2023, theme Energy, "Energy Forms and Uses" (P5-P6 block,
// examined at PSLE 0009 from 2026). Sources checked 2026-10-30 (school briefings that summarise it):
//   - Westspring Pri, 2025 Curriculum Briefing P6 Science: Energy Forms and Uses = Energy in Food;
//     Forms and Uses of Energy; Energy Conversion (Energy Conversion not in Foundation Science)
//     https://www.westspringpri.moe.edu.sg/files/Curriculum%20Briefing%20Slides/2025/2025_Curriculum_Briefing_P6_Science.pdf
//   - Westspring Pri, 2024 Primary 6 Curriculum Briefing Science (Sources of Energy as a sub-topic)
//     https://www.westspringpri.moe.edu.sg/files/Curriculum%20Briefing%20Slides/2024/2024_Primary_6_Curriculum_Briefing___Science.pdf
//   - Jurong West Pri, P6 Science Briefing Slides 2026: Term 1 Energy in Food; Forms of Energy,
//     Sources of Energy and Conversion of Energy (Standard)
//     https://www.jurongwestpri.moe.edu.sg/files/Slides%20and%20info/P6__Science__Briefing_Slides_2026.pdf
//   - Admiralty Pri, P6 Science Lesson Focus: Term 1 Theme Energy, Energy Conversion
//     https://www.admiraltypri.moe.edu.sg/files/Level%20Matters/Content/P6_Science_Lesson_Focus.pdf
//   (The MOE PDF itself did not load on the day.)
// In scope here: living things need energy for life processes; photosynthesis (light, water, carbon
//   dioxide, chlorophyll -> sugar and oxygen); starch test with iodine on a destarched leaf; oxygen
//   bubbles from a water plant; plants as the source of food energy for animals; the Sun as the main
//   source of energy; forms of energy (kinetic, gravitational and elastic potential, chemical
//   potential, light, heat, sound, electrical); energy conversion in devices and activities (torch,
//   solar-powered fan, hydroelectric dam, falling and bouncing ball, swing, catapult, hair dryer);
//   energy sources that will or will not run out; saving energy.
// Deliberately LEFT OUT (uncertain at P6 level): the law of conservation of energy stated as a rule,
//   the glowing-splint test for oxygen, efficiency as a number or percentage, how fossil fuels formed,
//   named pores (stomata), word equations with arrows to glucose, respiration as an energy process.
(function () {
  const INK = '#1f2937', LINE = '#475569', LEAF = '#4ade80', LEAFD = '#166534', BLUE = '#2563eb', WATER = '#bfdbfe';

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

  // A sun drawn at (x, y).
  const sun = (x, y, r = 18) => {
    let s = `<circle cx="${x}" cy="${y}" r="${r}" fill="#fde047" stroke="#ca8a04" stroke-width="1.5"/>`;
    for (let k = 0; k < 8; k++) {
      const a = k * Math.PI / 4;
      s += `<line x1="${(x + (r + 4) * Math.cos(a)).toFixed(1)}" y1="${(y + (r + 4) * Math.sin(a)).toFixed(1)}" x2="${(x + (r + 11) * Math.cos(a)).toFixed(1)}" y2="${(y + (r + 11) * Math.sin(a)).toFixed(1)}" stroke="#ca8a04" stroke-width="2"/>`;
    }
    return s;
  };

  // A leaf shape (pointed ellipse) centred on (cx, cy), lying left to right.
  const leafPath = (cx, cy, w, h) =>
    `M${cx - w / 2} ${cy} Q${cx} ${cy - h} ${cx + w / 2} ${cy} Q${cx} ${cy + h} ${cx - w / 2} ${cy} Z`;

  // ---------- Figures ----------
  // A leaf with a strip of foil over part P (both sides); part Q is uncovered.
  const FIG_LEAF_FOIL = (() => {
    let s = `<line x1="20" y1="100" x2="60" y2="100" stroke="${LEAFD}" stroke-width="4"/>` + txt(36, 122, 'stalk', { size: 13 });
    s += `<path d="${leafPath(190, 100, 260, 110)}" fill="${LEAF}" stroke="${LEAFD}" stroke-width="2"/>`;
    s += `<line x1="60" y1="100" x2="318" y2="100" stroke="${LEAFD}" stroke-width="1.5"/>`;
    s += `<rect x="150" y="38" width="70" height="124" fill="#cbd5e1" fill-opacity="0.92" stroke="#475569" stroke-width="1.5"/>`;
    s += txt(185, 100, 'P', { bold: 1, size: 18 }) + txt(265, 100, 'Q', { bold: 1, size: 18 });
    s += txt(185, 22, 'strip of foil (both sides)', { size: 13 });
    s += txt(265, 172, 'uncovered', { size: 13 });
    return svg(340, 190, 'A leaf with a strip of aluminium foil covering part P on both sides; part Q is not covered', s);
  })();

  // A variegated leaf: green middle G, white edge W.
  const FIG_VARIEGATED = (() => {
    let s = `<path d="${leafPath(180, 100, 290, 130)}" fill="#f8fafc" stroke="${LEAFD}" stroke-width="2"/>`;
    s += `<path d="${leafPath(180, 100, 200, 74)}" fill="${LEAF}" stroke="${LEAFD}" stroke-width="1"/>`;
    s += `<line x1="20" y1="100" x2="35" y2="100" stroke="${LEAFD}" stroke-width="4"/>`;
    s += txt(180, 100, 'G (green)', { size: 14, bold: 1 });
    s += txt(300, 140, 'W (white)', { size: 14, bold: 1 }) + `<line x1="290" y1="130" x2="276" y2="112" stroke="${LINE}"/>`;
    return svg(360, 190, 'A leaf with a green middle part G and a white edge part W', s);
  })();

  // A water plant in a beaker under a funnel and test tube, with a lamp at distance d.
  const FIG_WATERPLANT = (() => {
    let s = `<rect x="160" y="80" width="150" height="140" fill="${WATER}" stroke="${INK}" stroke-width="2"/>`;
    s += txt(235, 232, 'beaker of water', { size: 13 });
    s += `<polygon points="190,205 280,205 245,150 225,150" fill="none" stroke="${LINE}" stroke-width="2"/>` + txt(330, 178, 'funnel', { size: 13, anchor: 'start' });
    s += `<line x1="282" y1="178" x2="326" y2="178" stroke="${LINE}"/>`;
    s += `<rect x="225" y="40" width="20" height="112" rx="8" fill="#e0f2fe" stroke="${INK}" stroke-width="1.5"/>`;
    s += txt(250, 28, 'test tube collects gas', { size: 13 });
    // plant
    s += `<path d="M235 205 C230 190 240 180 233 165" stroke="${LEAFD}" stroke-width="3" fill="none"/>`;
    s += `<ellipse cx="226" cy="190" rx="7" ry="3" fill="${LEAF}"/><ellipse cx="243" cy="182" rx="7" ry="3" fill="${LEAF}"/><ellipse cx="228" cy="172" rx="6" ry="3" fill="${LEAF}"/>`;
    s += `<circle cx="235" cy="135" r="3" fill="#fff" stroke="${BLUE}"/><circle cx="233" cy="118" r="3" fill="#fff" stroke="${BLUE}"/><circle cx="237" cy="100" r="3" fill="#fff" stroke="${BLUE}"/>`;
    s += txt(150, 120, 'bubbles', { size: 13, anchor: 'end' }) + `<line x1="152" y1="120" x2="228" y2="120" stroke="${LINE}"/>`;
    s += txt(150, 200, 'water plant', { size: 13, anchor: 'end' }) + `<line x1="152" y1="200" x2="224" y2="190" stroke="${LINE}"/>`;
    // lamp
    s += `<polygon points="40,110 80,95 80,165 40,150" fill="#fef08a" stroke="${INK}"/>` + `<rect x="20" y="118" width="20" height="24" fill="#9ca3af" stroke="${INK}"/>`;
    s += txt(48, 182, 'lamp', { size: 13 });
    s += `<line x1="80" y1="60" x2="80" y2="90" stroke="${INK}"/><line x1="235" y1="60" x2="235" y2="66" stroke="${INK}"/>`;
    s += arrow(140, 70, 82, 70, { width: 2 }) + arrow(150, 70, 222, 70, { width: 2 }) + txt(145, 56, 'd', { bold: 1, size: 16 });
    return svg(380, 250, 'A water plant in a beaker of water under a funnel and test tube; a lamp shines on it from distance d; bubbles rise into the test tube', s);
  })();

  const TBL_BUBBLES = table(['Distance d of lamp (cm)', 'Number of bubbles in 1 minute'], [['10', '40'], ['20', '26'], ['30', '15'], ['40', '8']], 'Results');

  // Two sealed glass jars, X and Y, each with a potted plant and a dish.
  const FIG_JARS = (() => {
    const jar = (x, lab, dish1, dish2) => {
      let s = `<path d="M${x} 200 L${x} 70 Q${x} 40 ${x + 30} 40 L${x + 110} 40 Q${x + 140} 40 ${x + 140} 70 L${x + 140} 200" fill="#f0f9ff" stroke="${INK}" stroke-width="2"/>`;
      s += `<rect x="${x - 6}" y="200" width="152" height="8" fill="#9ca3af" stroke="${INK}"/>`;
      s += `<polygon points="${x + 20},200 ${x + 70},200 ${x + 64},170 ${x + 26},170" fill="#c2410c" stroke="${INK}"/>`;
      s += `<line x1="${x + 45}" y1="170" x2="${x + 45}" y2="110" stroke="${LEAFD}" stroke-width="3"/>`;
      s += `<path d="${leafPath(x + 30, 125, 30, 14)}" fill="${LEAF}" stroke="${LEAFD}"/><path d="${leafPath(x + 60, 112, 30, 14)}" fill="${LEAF}" stroke="${LEAFD}"/>`;
      s += `<rect x="${x + 85}" y="186" width="42" height="14" fill="#e5e7eb" stroke="${INK}"/>`;
      s += txt(x + 70, 22, lab, { bold: 1, size: 17 });
      s += txt(x + 70, 226, dish1, { size: 13 }) + txt(x + 70, 242, dish2, { size: 13 });
      return s;
    };
    let s = jar(20, 'Jar X', 'dish of chemical that', 'absorbs carbon dioxide') + jar(200, 'Jar Y', 'dish of water', '');
    return svg(370, 256, 'Two sealed glass jars in sunlight, each with a potted plant. Jar X has a dish of a chemical that absorbs carbon dioxide; jar Y has a dish of water', s);
  })();

  // A food chain drawn top to bottom, starting from the Sun.
  const foodChain = (names, label) => {
    let s = sun(60, 44, 16) + txt(100, 44, 'Sun', { size: 15, anchor: 'start', bold: 1 });
    names.forEach((n, i) => {
      const y = 100 + i * 62;
      s += `<rect x="90" y="${y}" width="160" height="38" rx="8" fill="#ecfccb" stroke="${LEAFD}"/>` + txt(170, y + 19, n, { size: 15 });
      s += arrow(170, y - 22, 170, y - 2, { width: 2 });
    });
    s = s.replace(arrow(170, 78, 170, 98, { width: 2 }), arrow(84, 60, 140, 98, { width: 2 }));
    return svg(300, 100 + names.length * 62, label, s);
  };
  const FIG_CHAIN_BIRD = foodChain(['grass', 'grasshopper', 'bird'], 'Food chain: the Sun shines on grass; grass is eaten by grasshopper; grasshopper is eaten by bird');
  const FIG_CHAIN_LION = foodChain(['grass', 'zebra', 'lion'], 'Food chain: the Sun shines on grass; grass is eaten by zebra; zebra is eaten by lion');

  // A ball let go at P falls past Q to R just above the floor.
  const FIG_BALL_DROP = (() => {
    let s = `<line x1="20" y1="236" x2="300" y2="236" stroke="${LINE}" stroke-width="3"/>` + txt(250, 222, 'floor', { size: 13 });
    s += `<line x1="140" y1="52" x2="140" y2="212" stroke="${LINE}" stroke-dasharray="4 4"/>`;
    [[40, 'P'], [130, 'Q'], [220, 'R']].forEach(([y, l]) => {
      s += `<circle cx="140" cy="${y}" r="13" fill="#f87171" stroke="${INK}"${l === 'P' ? '' : ' fill-opacity="0.6"'}/>` + txt(176, y, l, { bold: 1, size: 18 });
    });
    s += txt(96, 40, 'let go', { size: 13, anchor: 'end' });
    s += txt(96, 220, 'just above', { size: 13, anchor: 'end' }) + txt(96, 204, 'R is', { size: 13, anchor: 'end' });
    s += arrow(230, 90, 230, 170, { width: 2, dash: 1 }) + txt(244, 130, 'falls', { size: 13, anchor: 'start' });
    return svg(310, 252, 'A ball is let go at P, falls past Q and reaches R just above the floor', s);
  })();

  // A torch: two batteries, a switch and a bulb, with light coming out.
  const FIG_TORCH = (() => {
    let s = `<rect x="20" y="60" width="210" height="50" rx="10" fill="#e5e7eb" stroke="${INK}" stroke-width="2"/>`;
    s += `<polygon points="230,55 280,35 280,135 230,115" fill="#e5e7eb" stroke="${INK}" stroke-width="2"/>`;
    s += `<rect x="34" y="70" width="70" height="30" rx="4" fill="#60a5fa" stroke="${INK}"/><rect x="108" y="70" width="70" height="30" rx="4" fill="#60a5fa" stroke="${INK}"/>`;
    s += txt(105, 132, 'batteries', { size: 13 }) + `<line x1="105" y1="122" x2="105" y2="102" stroke="${LINE}"/>`;
    s += `<rect x="190" y="50" width="22" height="10" fill="#475569"/>` + txt(201, 36, 'switch', { size: 13 });
    s += `<circle cx="252" cy="85" r="12" fill="#fef9c3" stroke="${INK}"/>` + txt(252, 152, 'bulb', { size: 13 }) + `<line x1="252" y1="142" x2="252" y2="98" stroke="${LINE}"/>`;
    s += arrow(290, 60, 340, 40, { width: 2, colour: '#ca8a04' }) + arrow(290, 85, 345, 85, { width: 2, colour: '#ca8a04' }) + arrow(290, 110, 340, 130, { width: 2, colour: '#ca8a04' });
    return svg(360, 170, 'A torch with two batteries, a switch and a bulb; light comes out of the front', s);
  })();

  // A solar panel wired to a small fan in sunlight.
  const FIG_SOLAR_FAN = (() => {
    let s = sun(40, 40, 16);
    s += `<polygon points="60,130 150,100 170,140 80,170" fill="#1e3a8a" stroke="${INK}" stroke-width="1.5"/>`;
    s += `<line x1="115" y1="120" x2="125" y2="155" stroke="#93c5fd"/><line x1="90" y1="128" x2="100" y2="164" stroke="#93c5fd"/><line x1="140" y1="110" x2="152" y2="147" stroke="#93c5fd"/>`;
    s += `<line x1="115" y1="155" x2="115" y2="190" stroke="${INK}" stroke-width="3"/>` + txt(115, 206, 'solar panel', { size: 13 });
    s += arrow(58, 56, 96, 104, { width: 2, colour: '#ca8a04' });
    s += `<path d="M170 140 C210 140 220 160 260 160" fill="none" stroke="${INK}" stroke-width="2"/>` + txt(214, 176, 'wires', { size: 13 });
    s += `<line x1="290" y1="110" x2="290" y2="190" stroke="${INK}" stroke-width="3"/><rect x="270" y="186" width="40" height="8" fill="#9ca3af" stroke="${INK}"/>`;
    s += `<circle cx="290" cy="100" r="8" fill="#9ca3af" stroke="${INK}"/>`;
    s += `<ellipse cx="290" cy="72" rx="9" ry="24" fill="#bae6fd" stroke="${INK}"/><ellipse cx="290" cy="128" rx="9" ry="24" fill="#bae6fd" stroke="${INK}"/>`;
    s += txt(290, 28, 'fan', { size: 13 });
    return svg(340, 220, 'A solar panel in sunlight is joined by wires to a small electric fan', s);
  })();

  // A hydroelectric dam: water high behind the dam flows down a pipe to a turbine and generator.
  const FIG_DAM = (() => {
    let s = `<polygon points="20,60 140,60 140,210 20,210" fill="${WATER}" stroke="none"/>` + txt(80, 90, 'water stored', { size: 13 }) + txt(80, 106, 'high up', { size: 13 });
    s += `<polygon points="140,40 170,40 210,210 140,210" fill="#9ca3af" stroke="${INK}" stroke-width="2"/>` + txt(160, 26, 'dam', { size: 13 });
    s += `<path d="M140 150 L190 190 L230 190" fill="none" stroke="${BLUE}" stroke-width="8"/>`;
    s += `<rect x="230" y="172" width="44" height="36" fill="#fde68a" stroke="${INK}"/>` + txt(252, 160, 'turbine', { size: 13 });
    s += `<rect x="290" y="166" width="54" height="42" fill="#c7d2fe" stroke="${INK}"/>` + txt(317, 152, 'generator', { size: 13 });
    s += `<line x1="274" y1="190" x2="290" y2="190" stroke="${INK}" stroke-width="3"/>`;
    s += `<line x1="317" y1="166" x2="317" y2="96" stroke="${INK}" stroke-width="2"/><line x1="317" y1="96" x2="350" y2="96" stroke="${INK}" stroke-width="2"/>`;
    s += txt(300, 80, 'wires to homes', { size: 13 });
    s += `<rect x="210" y="210" width="150" height="16" fill="${WATER}"/>`;
    return svg(370, 236, 'A hydroelectric dam: water stored high up behind the dam flows down a pipe to turn a turbine joined to a generator; wires carry electricity to homes', s);
  })();

  const TBL_BOUNCE = table(['Bounce', 'Height reached (cm)'], [['1st', '70'], ['2nd', '49'], ['3rd', '34']], 'Ball let go from a height of 100 cm');

  // A pendulum (swing) with the bob at X (high, left), Y (lowest) and Z (high, right).
  const FIG_SWING = (() => {
    let s = `<line x1="80" y1="24" x2="260" y2="24" stroke="${INK}" stroke-width="4"/>`;
    const px = 170, py = 26, L = 150;
    [[-40, 'X'], [0, 'Y'], [40, 'Z']].forEach(([deg, l]) => {
      const a = deg * Math.PI / 180, bx = px + L * Math.sin(a), by = py + L * Math.cos(a);
      s += `<line x1="${px}" y1="${py}" x2="${bx.toFixed(1)}" y2="${by.toFixed(1)}" stroke="${LINE}" stroke-width="2"${l === 'Y' ? '' : ' stroke-dasharray="5 4"'}/>`;
      s += `<circle cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" r="13" fill="#a78bfa" stroke="${INK}"/>`;
      s += txt((bx + (deg < 0 ? -26 : deg > 0 ? 26 : 0)).toFixed(1), (by + (deg === 0 ? 28 : 0)).toFixed(1), l, { bold: 1, size: 18 });
    });
    s += `<path d="M73.6 140.9 Q170 205 266.4 140.9" fill="none" stroke="${LINE}" stroke-dasharray="3 4"/>`;
    return svg(340, 220, 'A pendulum bob swinging from X, high on the left, through Y, the lowest point, to Z, high on the right', s);
  })();

  // A catapult with its rubber band pulled back holding a stone.
  const FIG_CATAPULT = (() => {
    let s = `<path d="M200 190 L200 120 L170 60 M200 120 L230 60" fill="none" stroke="#92400e" stroke-width="10" stroke-linecap="round"/>`;
    s += `<path d="M170 60 L90 104 M230 60 L90 104" fill="none" stroke="#f97316" stroke-width="3"/>`;
    s += `<circle cx="84" cy="106" r="11" fill="#6b7280" stroke="${INK}"/>` + txt(84, 134, 'stone', { size: 13 });
    s += txt(270, 110, 'rubber band', { size: 13 }) + txt(270, 126, 'pulled back', { size: 13 });
    s += `<line x1="236" y1="112" x2="168" y2="88" stroke="${LINE}"/>`;
    s += arrow(70, 70, 30, 70, { width: 2, dash: 1 }) + txt(50, 54, 'pull', { size: 13 });
    return svg(320, 200, 'A catapult with its rubber band stretched back, holding a stone', s);
  })();

  SCI.registerTopic({
    id: 'energy',
    title: 'Energy',
    emoji: '⚡',
    theme: 'Energy',
    level: 'P6',
    moeRef: 'Energy Forms and Uses (P6), MOE Primary Science Syllabus 2023: Energy in Food (photosynthesis; plants need light, water, carbon dioxide and chlorophyll to make food, giving out oxygen; animals get energy from plants directly or indirectly; the Sun as the main source of energy); Forms and Uses of Energy (kinetic, potential, light, heat, sound, electrical, chemical potential); Energy Conversion; Sources of Energy and saving energy. Scope checked against Westspring Pri P6 Science briefings 2024-2025, Jurong West Pri P6 Science Briefing 2026 and Admiralty Pri P6 Lesson Focus.',
    skills: {
      photo: 'Photosynthesis',
      food: 'Energy in food',
      forms: 'Forms of energy',
      convert: 'Energy conversion',
      sources: 'Sources of energy and saving energy',
      fairtest: 'Fair tests and results'
    },
    misconceptions: {
      'photo-inputs-mixup': 'Mixing up what a plant takes in and what it gives out when it makes food.',
      'photo-gives-co2': 'Plants give out carbon dioxide when they make food.',
      'plants-food-from-soil': 'Plants get their food from the soil instead of making it.',
      'chlorophyll-mixup': 'Chlorophyll takes in water or carbon dioxide, or stores food, instead of trapping light energy.',
      'no-light-photo': 'A plant can make food without light.',
      'non-green-photo': 'The white parts of a leaf cannot make food because they get no light or water, not because they have no chlorophyll.',
      'iodine-mixup': 'Mixing up what the iodine test shows: blue-black means starch is present.',
      'destarch-mixup': 'Not knowing that a plant kept in the dark uses up the starch already in its leaves.',
      'animals-make-food': 'Animals can make their own food from sunlight, like plants.',
      'sun-not-source': 'The energy in a food chain starts with the plant or an animal, not the Sun.',
      'food-not-chemical': 'Food stores heat, light or kinetic energy instead of chemical potential energy.',
      'energy-forms-mixup': 'Mixing up the forms of energy, such as calling a moving object\'s energy potential energy.',
      'still-no-energy': 'An object that is not moving has no energy at all.',
      'height-gpe-mixup': 'An object lower down has more gravitational potential energy than one higher up.',
      'battery-electrical': 'A battery stores electrical energy, not chemical potential energy.',
      'conversion-reversed': 'Writing an energy conversion in the wrong order.',
      'conversion-missing-step': 'Leaving out a step in an energy conversion, such as skipping electrical energy.',
      'only-useful-output': 'All the energy becomes the useful form; none becomes heat or sound.',
      'energy-used-up': 'Energy simply disappears or gets used up instead of changing into other forms.',
      'gravity-stops': 'Gravity stops pulling an object once it bounces or moves upwards.',
      'sun-not-main-source': 'Power stations, fuels or the Moon, not the Sun, are the main source of energy for the Earth.',
      'renewable-mixup': 'Mixing up energy sources that will run out with sources that will not.',
      'saving-mixup': 'Thinking an action that wastes energy will save it.',
      'changed-measured-mixup': 'Mixing up the variable that is changed, the variable that is measured and the variables kept the same.',
      'graph-misread': 'Reading a table or graph the wrong way round, or reading the wrong row.',
      'conclusion-overreach': 'Concluding more than the experiment tested, such as naming a factor that was the same in both setups.',
      'control-mixup': 'Not seeing that the control setup is there for comparison, so reading it as the factor being tested.'
    },
    notes: [
      { title: 'Why living things need energy',
        body: 'All living things need energy to carry out life processes: to grow, move, reproduce and repair their bodies. Plants need energy too. Animals get energy from the food they eat. Plants make their own food.' },
      { title: 'Photosynthesis',
        body: 'Green plants make their own food by photosynthesis.\nThey need: light, water (taken in by the roots), carbon dioxide (taken in by the leaves) and chlorophyll (the green substance that traps light energy).\nThey make: sugar (food) and oxygen.\nSome sugar is used for energy; some is changed into starch and stored.' },
      { title: 'Testing a leaf for starch',
        body: 'First keep the plant in the dark for 2 days. It cannot make food, so it uses up the starch already in its leaves.\nThen put it in light for a few hours and test a leaf with iodine.\nBlue-black = starch is present, so food was made.\nStays brown = no starch.\nOnly the green parts that got light turn blue-black.' },
      { title: 'Oxygen bubbles',
        body: 'A water plant in light gives off bubbles of oxygen. The brighter the light (lamp nearer), the more bubbles in one minute, because the plant makes food faster. In a fair test, change ONE thing (the distance of the lamp), count the bubbles for the SAME length of time, and keep the plant and the water the same.' },
      { title: 'Energy in food chains',
        body: 'The Sun is the main source of energy. Plants trap light energy and store it as chemical potential energy in food. Animals get this energy by eating plants (directly), or by eating animals that ate plants (indirectly).\nSun -> grass -> grasshopper -> bird.' },
      { title: 'Forms of energy',
        body: 'Kinetic energy: energy of a moving object.\nPotential energy: stored energy.\n- gravitational potential energy: because of height (higher = more)\n- elastic potential energy: in a stretched or squashed object\n- chemical potential energy: in food, fuels and batteries\nAlso: light, heat, sound and electrical energy.' },
      { title: 'Energy conversion',
        body: 'Energy can be converted from one form to another.\nTorch: chemical potential (batteries) -> electrical -> light + heat.\nSolar-powered fan: light -> electrical -> kinetic.\nHydroelectric dam: gravitational potential -> kinetic -> electrical.\nFalling ball: gravitational potential -> kinetic.\nCatapult: elastic potential -> kinetic.' },
      { title: 'Not all energy is useful',
        body: 'Most devices also give out heat or sound that we do not need. A bouncing ball bounces lower each time because some of its energy is converted into heat and sound when it hits the floor, so less is left to lift it up again. The energy is not lost; it changes form.' },
      { title: 'Sources of energy and saving energy',
        body: 'Will run out: coal, petrol, natural gas (fuels from the ground).\nWill not run out: sunlight, wind, moving water.\nMost of Singapore\'s electricity comes from burning natural gas, which will run out and gives out carbon dioxide.\nSave energy: switch off lights and fans, use a fan instead of the air-conditioner, set the air-conditioner to 25 °C, choose energy-efficient appliances.' }
    ],
    items: [
      // ----- Photosynthesis -----
      { id: 'ene-001', type: 'mcq', level: 1, syl: 'P6', skill: 'photo',
        stem: 'Besides chlorophyll, which of these does a green plant need to make its food?',
        figure: null,
        options: ['Light, water and carbon dioxide', 'Light, water and oxygen', 'Soil, water and oxygen', 'Heat, sugar and carbon dioxide'],
        answer: 0,
        miscon: { 1: 'photo-inputs-mixup', 2: 'plants-food-from-soil', 3: 'photo-inputs-mixup' },
        optionFeedback: {
          1: 'Oxygen is what the plant GIVES OUT when it makes food. Which gas does it take in?',
          2: 'A plant makes its own food; it does not take food from the soil. Think about what it needs from the air and the Sun.',
          3: 'Sugar is the food the plant MAKES. And it is light, not heat, that the plant traps.' },
        explain: 'A plant needs light, water, carbon dioxide and chlorophyll to make food.' },
      { id: 'ene-002', type: 'mcq', level: 1, syl: 'P6', skill: 'photo',
        stem: 'What does a green plant produce during photosynthesis?',
        figure: null,
        options: ['Oxygen and water', 'Sugar and carbon dioxide', 'Sugar and oxygen', 'Carbon dioxide and water'],
        answer: 2,
        miscon: { 0: 'photo-inputs-mixup', 1: 'photo-gives-co2', 3: 'photo-inputs-mixup' },
        optionFeedback: {
          0: 'Oxygen is right, but water is something the plant takes IN. What food does it make?',
          1: 'Sugar is right, but carbon dioxide is taken in, not given out, during photosynthesis.',
          3: 'Both of these are taken IN by the plant. What comes OUT?' },
        explain: 'Photosynthesis produces sugar (food) and oxygen.' },
      { id: 'ene-003', type: 'mcq', level: 1, syl: 'P6', skill: 'photo',
        stem: 'What is the job of chlorophyll in a leaf?',
        figure: null,
        options: ['To absorb water from the soil', 'To take in carbon dioxide from the air', 'To store the food the plant makes', 'To trap light energy to make food'],
        answer: 3,
        miscon: { 0: 'chlorophyll-mixup', 1: 'chlorophyll-mixup', 2: 'chlorophyll-mixup' },
        optionFeedback: {
          0: 'Water is taken in by the roots. Chlorophyll is the green substance in the leaves.',
          1: 'Carbon dioxide enters through the leaves, but chlorophyll does a different job. What does the green colour catch?',
          2: 'Food is stored as starch. Chlorophyll helps to MAKE the food in the first place.' },
        explain: 'Chlorophyll traps light energy, which the plant uses to make food.' },
      { id: 'ene-004', type: 'mcq', level: 2, syl: 'P6', skill: 'photo',
        stem: 'Hui Min kept a potted plant in the dark for 2 days. She then covered part P of one leaf with a strip of foil on both sides and placed the plant in sunlight for 6 hours. She tested the leaf for starch with iodine. Which part(s) of the leaf turned blue-black?',
        figure: FIG_LEAF_FOIL,
        options: ['P only', 'Q only', 'Both P and Q', 'Neither P nor Q'],
        answer: 1,
        miscon: { 0: 'no-light-photo', 2: 'no-light-photo', 3: 'iodine-mixup' },
        optionFeedback: {
          0: 'P was under the foil, so no light reached it. Which part could make food?',
          2: 'A plant needs light to make food. Did P get any light?',
          3: 'Q was in sunlight for 6 hours, so it made food, stored as starch. What colour does iodine turn with starch?' },
        explain: 'Only Q got light, so only Q made food (stored as starch). Starch turns iodine blue-black.' },
      { id: 'ene-005', type: 'mcq', level: 2, syl: 'P6', skill: 'fairtest',
        stem: 'In Hui Min\'s experiment, why did she keep the plant in the dark for 2 days before she started?',
        figure: FIG_LEAF_FOIL,
        options: ['To let the leaves take in more carbon dioxide', 'To make the leaves grow more chlorophyll', 'To let the plant use up the starch in its leaves', 'To stop the leaves from losing water'],
        answer: 2,
        miscon: { 0: 'destarch-mixup', 1: 'destarch-mixup', 3: 'destarch-mixup' },
        optionFeedback: {
          0: 'Think about what the plant cannot do in the dark, and what it then has to use instead.',
          1: 'Chlorophyll does not grow in the dark. What happens to the food already stored in the leaves?',
          3: 'Water is not what the test checks. The iodine test looks for starch: why remove the old starch first?' },
        explain: 'In the dark the plant cannot make food, so it uses up the starch already in its leaves. Any starch found later must have been made during the experiment.' },
      { id: 'ene-006', type: 'mcq', level: 2, syl: 'P6', skill: 'photo',
        stem: 'A plant with green-and-white leaves was kept in the dark for 2 days, then placed in sunlight. After 6 hours, one leaf was tested with iodine. Part G turned blue-black but part W did not. Which statement explains why?',
        figure: FIG_VARIEGATED,
        options: ['Part W has no chlorophyll to trap light energy.', 'Part W did not receive any light.', 'Part W did not receive any water.', 'Part W made food but cannot store it.'],
        answer: 0,
        miscon: { 1: 'non-green-photo', 2: 'non-green-photo', 3: 'non-green-photo' },
        optionFeedback: {
          1: 'The whole leaf was in the same sunlight. What does the white part NOT have?',
          2: 'Water reaches the whole leaf through the same tubes. Look at the colour of W.',
          3: 'Without starch in W, there is no sign that W made food at all. What does W lack?' },
        explain: 'The white part has no chlorophyll, so it cannot trap light energy to make food. No food made means no starch.' },
      { id: 'ene-007', type: 'mcq', level: 2, syl: 'P6', skill: 'photo',
        stem: 'Arun set up a water plant in a beaker under a lamp. Bubbles of gas rose from the plant and collected in the test tube. Which gas are the bubbles mainly made of?',
        figure: FIG_WATERPLANT,
        options: ['Carbon dioxide', 'Water vapour', 'Nitrogen', 'Oxygen'],
        answer: 3,
        miscon: { 0: 'photo-gives-co2', 1: 'photo-inputs-mixup', 2: 'photo-inputs-mixup' },
        optionFeedback: {
          0: 'Carbon dioxide is taken IN by the plant to make food. Which gas is given out?',
          1: 'The plant is in light and making food. Which gas does photosynthesis give out?',
          2: 'Photosynthesis gives out one gas. It is the gas we need to breathe.' },
        explain: 'A plant in light makes food and gives out oxygen, which forms the bubbles.' },
      { id: 'ene-008', type: 'mcq', level: 3, syl: 'P6', skill: 'fairtest',
        stem: 'Arun moved the lamp to different distances from the water plant and counted the bubbles given out in 1 minute. Which conclusion do his results support?',
        figure: stack(FIG_WATERPLANT, TBL_BUBBLES),
        options: ['The further the lamp, the more bubbles the plant gives out.', 'The nearer the lamp, the more bubbles the plant gives out.', 'The plant gives out the same number of bubbles at every distance.', 'The plant gives out bubbles only when the lamp is 10 cm away.'],
        answer: 1,
        miscon: { 0: 'graph-misread', 2: 'graph-misread', 3: 'conclusion-overreach' },
        optionFeedback: {
          0: 'Read the table again: at 40 cm there were only 8 bubbles. Does a bigger distance give more or fewer?',
          2: 'The numbers change from 40 down to 8. Look at which way they change.',
          3: 'There were bubbles at every distance, just fewer further away.' },
        technique: 'Read, compare, conclude',
        steps: ['Read: as the distance goes up, what happens to the bubble count?', 'Compare 10 cm with 40 cm.', 'Conclude: choose the statement that matches every row.'],
        explain: 'As the lamp gets nearer (10 cm), the number of bubbles goes up (40). The nearer the lamp, the brighter the light and the faster the plant makes food.' },
      { id: 'ene-009', type: 'mcq', level: 3, syl: 'P6', skill: 'fairtest',
        stem: 'In Arun\'s experiment, he changed only the distance of the lamp. Which of these must he keep the same to make it a fair test?\nA: the type and size of water plant\nB: the amount of water in the beaker\nC: the distance of the lamp from the plant\nD: the time for which he counts the bubbles',
        figure: TBL_BUBBLES,
        options: ['A, B and D only', 'A and C only', 'C and D only', 'A, B, C and D'],
        answer: 0,
        miscon: { 1: 'changed-measured-mixup', 2: 'changed-measured-mixup', 3: 'changed-measured-mixup' },
        technique: 'Tick or cross',
        steps: ['Find the ONE thing he changed on purpose.', 'Cross that one out: it cannot be kept the same.', 'Tick every other thing that could change the bubble count.', 'Choose the option with only the ticks.'],
        optionFeedback: {
          1: 'C is the variable he CHANGED, so it cannot be kept the same. And look again at B and D.',
          2: 'C is the variable he changed. Keeping it the same would leave nothing to compare.',
          3: 'Nearly there, but C is the variable he changed on purpose.' },
        explain: 'He changed C (the distance). A, B and D must be kept the same so that only the distance affects the number of bubbles.' },
      { id: 'ene-010', type: 'mcq', level: 3, syl: 'P6', skill: 'fairtest',
        stem: 'Two plants were kept in the dark for 2 days, then placed in sealed jars X and Y in sunlight for 6 hours. A leaf from each was tested with iodine. The leaf from jar X stayed brown; the leaf from jar Y turned blue-black. What does this experiment show?',
        figure: FIG_JARS,
        options: ['Plants need water to make food.', 'Plants need light to make food.', 'Plants need carbon dioxide to make food.', 'Plants give out oxygen when they make food.'],
        answer: 2,
        miscon: { 0: 'control-mixup', 1: 'conclusion-overreach', 3: 'conclusion-overreach' },
        optionFeedback: {
          0: 'The dish of water in Y only replaces the chemical in X, so the jars are alike. What is missing from jar X?',
          1: 'Both jars were in the same sunlight, so light was not tested here.',
          3: 'Nobody measured oxygen. The test was for starch. What was different between X and Y?' },
        technique: 'Change one thing',
        steps: ['Spot the ONE difference between jar X and jar Y.', 'What does the chemical in X take away?', 'Which jar made starch?', 'So what did the plant need?'],
        explain: 'The only difference is that the air in X had no carbon dioxide. X made no starch, Y did, so plants need carbon dioxide to make food.' },

      // ----- Energy in food -----
      { id: 'ene-011', type: 'mcq', level: 2, syl: 'P6', skill: 'food',
        stem: 'Look at the food chain. Where did the energy in the bird ORIGINALLY come from?',
        figure: FIG_CHAIN_BIRD,
        options: ['The grass', 'The grasshopper', 'The soil', 'The Sun'],
        answer: 3,
        miscon: { 0: 'sun-not-source', 1: 'sun-not-source', 2: 'plants-food-from-soil' },
        optionFeedback: {
          0: 'The grass passed the energy on, but where did the grass get it from?',
          1: 'The bird got its energy from eating the grasshopper. Follow the arrows back to the very start.',
          2: 'Plants do not get food energy from the soil. What does the grass use to make food?' },
        technique: 'Follow the arrows',
        steps: ['Start at the bird.', 'Follow the arrows backwards, one step at a time.', 'Where does the chain begin?'],
        explain: 'The grass trapped light energy from the Sun to make food; the energy then passed to the grasshopper and the bird.' },
      { id: 'ene-012', type: 'mcq', level: 2, syl: 'P6', skill: 'food',
        stem: 'Which statements about energy are correct?\nA: Animals get energy by eating plants or other animals.\nB: Plants get their food energy by absorbing food from the soil.\nC: Plants trap light energy and store it as chemical potential energy in food.\nD: Animals can make their own food using sunlight.',
        figure: null,
        options: ['A and B only', 'A and C only', 'B and D only', 'A, C and D only'],
        answer: 1,
        miscon: { 0: 'plants-food-from-soil', 2: 'plants-food-from-soil', 3: 'animals-make-food' },
        technique: 'Tick or cross',
        steps: ['Read A. Tick or cross.', 'B and C are about plants: which one is how plants really get food?', 'D: can animals make food from sunlight?', 'Choose the option with only the ticks.'],
        optionFeedback: {
          0: 'A is right. But plants MAKE their food; they do not take it from the soil.',
          2: 'Plants make their own food, and animals cannot make food from sunlight. Try again from A.',
          3: 'A and C are right, but animals cannot make food from sunlight. Only green plants can.' },
        explain: 'A and C. Plants make food using light energy; animals get energy by eating plants or other animals.' },
      { id: 'ene-013', type: 'mcq', level: 1, syl: 'P6', skill: 'food',
        stem: 'In which form is energy stored in food such as rice and bread?',
        figure: null,
        options: ['Chemical potential energy', 'Heat energy', 'Kinetic energy', 'Light energy'],
        answer: 0,
        miscon: { 1: 'food-not-chemical', 2: 'food-not-chemical', 3: 'food-not-chemical' },
        optionFeedback: {
          1: 'Rice gives out heat when we cook or burn it, but the energy is stored in it in another form.',
          2: 'Kinetic energy is the energy of moving things. A bowl of rice is not moving.',
          3: 'The plant trapped light energy, but then changed it into a stored form in the food.' },
        explain: 'Food stores chemical potential energy.' },

      // ----- Forms of energy -----
      { id: 'ene-014', type: 'mcq', level: 1, syl: 'P6', skill: 'forms',
        stem: 'Which of these has kinetic energy?',
        figure: null,
        options: ['A book resting on a high shelf', 'A stretched rubber band held still', 'A bus moving along a road', 'A battery lying in a drawer'],
        answer: 2,
        miscon: { 0: 'energy-forms-mixup', 1: 'energy-forms-mixup', 3: 'energy-forms-mixup' },
        optionFeedback: {
          0: 'The book has stored energy because of its height, but it is not moving.',
          1: 'The band stores elastic potential energy. Kinetic energy needs movement.',
          3: 'The battery stores chemical potential energy. Which object is moving?' },
        explain: 'Kinetic energy is the energy of a moving object, such as a moving bus.' },
      { id: 'ene-015', type: 'mcq', level: 2, syl: 'P6', skill: 'forms',
        stem: 'A durian is hanging high up on a tree. Which form of energy does it have because of its height?',
        figure: null,
        options: ['Kinetic energy', 'Gravitational potential energy', 'Elastic potential energy', 'No energy, as it is not moving'],
        answer: 1,
        miscon: { 0: 'energy-forms-mixup', 2: 'energy-forms-mixup', 3: 'still-no-energy' },
        optionFeedback: {
          0: 'The durian is hanging still, so it has no kinetic energy yet.',
          2: 'Elastic potential energy is stored in stretched or squashed things. Think about height.',
          3: 'A still object can still STORE energy. If the durian drops, where does its speed come from?' },
        explain: 'An object high up has gravitational potential energy. The higher it is, the more it has.' },
      { id: 'ene-016', type: 'mcq', level: 2, syl: 'P6', skill: 'forms',
        stem: 'Kai Xin pulls back the rubber band of a catapult and holds it still. Which form of energy is stored in the stretched rubber band?',
        figure: FIG_CATAPULT,
        options: ['Kinetic energy', 'Gravitational potential energy', 'Sound energy', 'Elastic potential energy'],
        answer: 3,
        miscon: { 0: 'energy-forms-mixup', 1: 'energy-forms-mixup', 2: 'energy-forms-mixup' },
        optionFeedback: {
          0: 'She is holding it still, so it is not moving yet. The energy is stored.',
          1: 'Gravitational potential energy comes from height. What has been done to the band?',
          2: 'A held band makes no sound. Which stored energy comes from stretching?' },
        explain: 'A stretched (or squashed) object stores elastic potential energy.' },
      { id: 'ene-017', type: 'mcq', level: 2, syl: 'P6', skill: 'forms',
        stem: 'Which of these store chemical potential energy?\nA: a battery\nB: a slice of bread\nC: petrol\nD: a squashed spring',
        figure: null,
        options: ['A, B and C only', 'A and D only', 'B and C only', 'B, C and D only'],
        answer: 0,
        miscon: { 1: 'energy-forms-mixup', 2: 'battery-electrical', 3: 'energy-forms-mixup' },
        technique: 'Tick or cross',
        steps: ['Food, fuels and batteries store chemical potential energy.', 'Tick each one that fits.', 'A squashed spring stores a different kind of energy: cross it.', 'Choose the option with only the ticks.'],
        optionFeedback: {
          1: 'A squashed spring stores elastic potential energy. And bread and petrol are both stores of chemical potential energy.',
          2: 'B and C are right. A battery also stores chemical potential energy until it is used in a circuit.',
          3: 'B and C are right, but a squashed spring stores elastic potential energy. Look again at the battery.' },
        explain: 'A battery, food and fuels store chemical potential energy. A squashed spring stores elastic potential energy.' },
      { id: 'ene-018', type: 'mcq', level: 3, syl: 'P6', skill: 'forms',
        stem: 'A ball is let go at P. It falls past Q to R, just above the floor. At which positions does the ball have the most gravitational potential energy (GPE) and the most kinetic energy (KE)?',
        figure: FIG_BALL_DROP,
        options: ['Most GPE at R, most KE at P', 'Most GPE at Q, most KE at Q', 'Most GPE at P, most KE at R', 'Most GPE at P, most KE at P'],
        answer: 2,
        miscon: { 0: 'height-gpe-mixup', 1: 'height-gpe-mixup', 3: 'energy-forms-mixup' },
        optionFeedback: {
          0: 'Gravitational potential energy depends on height. Which position is highest?',
          1: 'Q is halfway. Which position is highest, and where has the ball been falling the longest?',
          3: 'At P the ball is just let go, so it is not moving yet. Where is it moving fastest?' },
        technique: 'Follow the arrows',
        steps: ['GPE depends on height: find the highest point.', 'As it falls, GPE changes into KE.', 'KE is greatest where it is moving fastest: just before the floor.'],
        explain: 'P is highest, so most GPE. As the ball falls, GPE is converted into KE, so it is moving fastest at R.' },

      // ----- Energy conversion -----
      { id: 'ene-019', type: 'mcq', level: 1, syl: 'P6', skill: 'convert',
        stem: 'Jia Hui switches on her torch. Which shows the energy conversion that takes place? (Each word is a form of energy.)',
        figure: FIG_TORCH,
        options: ['Electrical → chemical potential → light and heat', 'Chemical potential → electrical → light and heat', 'Chemical potential → light and heat', 'Electrical → light only'],
        answer: 1,
        miscon: { 0: 'conversion-reversed', 2: 'conversion-missing-step', 3: 'battery-electrical' },
        optionFeedback: {
          0: 'The right forms, but in the wrong order. What is stored in the batteries to begin with?',
          2: 'Something has to flow through the wires from the batteries to the bulb. Which step is missing?',
          3: 'The batteries store chemical potential energy, and the bulb also gets hot.' },
        explain: 'Chemical potential energy in the batteries -> electrical energy in the circuit -> light and heat energy in the bulb.' },
      { id: 'ene-020', type: 'mcq', level: 2, syl: 'P6', skill: 'convert',
        stem: 'A small fan is powered by a solar panel. Which shows the main energy conversion?',
        figure: FIG_SOLAR_FAN,
        options: ['Heat → electrical → kinetic', 'Light → kinetic', 'Electrical → light → kinetic', 'Light → electrical → kinetic'],
        answer: 3,
        miscon: { 0: 'energy-forms-mixup', 1: 'conversion-missing-step', 2: 'conversion-reversed' },
        optionFeedback: {
          0: 'A solar panel works with sunlight, not heat. Which form does it take in?',
          1: 'The panel and the fan are joined by wires. What travels along them?',
          2: 'The Sun gives out light first. The panel then changes it. Try the order again.' },
        explain: 'The solar panel converts light energy into electrical energy; the fan\'s motor converts electrical energy into kinetic energy.' },
      { id: 'ene-021', type: 'mcq', level: 2, syl: 'P6', skill: 'convert',
        stem: 'At a hydroelectric dam, water stored high up flows down to turn a turbine joined to a generator. Which shows the energy conversion?',
        figure: FIG_DAM,
        options: ['Gravitational potential → kinetic → electrical', 'Kinetic → gravitational potential → electrical', 'Gravitational potential → electrical', 'Chemical potential → kinetic → electrical'],
        answer: 0,
        miscon: { 1: 'conversion-reversed', 2: 'conversion-missing-step', 3: 'energy-forms-mixup' },
        optionFeedback: {
          1: 'The water starts high up and still. Which energy does it have first?',
          2: 'The water must move to turn the turbine. Which step is missing?',
          3: 'Water is not a fuel or food. Its stored energy comes from its height.' },
        explain: 'Water high up has gravitational potential energy -> it flows down with kinetic energy -> the generator produces electrical energy.' },
      { id: 'ene-022', type: 'mcq', level: 3, syl: 'P6', skill: 'convert',
        stem: 'Rizwan lets go of a ball from a height of 100 cm. It bounces up to only 70 cm. Why does it not bounce back to 100 cm?',
        figure: null,
        options: ['All of its energy was used up when it hit the floor.', 'Gravity stopped acting on it after the bounce.', 'Some of its energy was converted to heat and sound.', 'Its gravitational potential energy grew as it fell.'],
        answer: 2,
        miscon: { 0: 'energy-used-up', 1: 'gravity-stops', 3: 'height-gpe-mixup' },
        optionFeedback: {
          0: 'If ALL of its energy were gone, it would not bounce at all. It still rose 70 cm.',
          1: 'Gravity pulls on the ball all the time, on the way up too.',
          3: 'As it falls, it loses height, so its gravitational potential energy goes down.' },
        explain: 'When the ball hits the floor, some of its energy is converted to heat and sound (you hear the bounce). Less energy is left to lift it, so it rises less high.' },
      { id: 'ene-023', type: 'mcq', level: 2, syl: 'P6', skill: 'convert',
        stem: 'A pendulum bob is let go at X. Which energy conversion takes place as it swings from X down to Y?',
        figure: FIG_SWING,
        options: ['Gravitational potential energy to kinetic energy', 'Kinetic energy to gravitational potential energy', 'Elastic potential energy to kinetic energy', 'Heat energy to kinetic energy'],
        answer: 0,
        miscon: { 1: 'conversion-reversed', 2: 'energy-forms-mixup', 3: 'energy-forms-mixup' },
        optionFeedback: {
          1: 'That happens from Y UP to Z. From X to Y, the bob goes down and speeds up.',
          2: 'Nothing is stretched or squashed here. What changes as the bob goes down?',
          3: 'The bob is not heated to make it move. What does it lose as it goes down?' },
        explain: 'From X to Y the bob loses height and gains speed: gravitational potential energy is converted into kinetic energy.' },
      { id: 'ene-024', type: 'mcq', level: 3, syl: 'P6', skill: 'convert',
        stem: 'A hair dryer is switched on. Its electrical energy is converted into which forms of energy?\nA: heat energy\nB: kinetic energy\nC: sound energy\nD: chemical potential energy',
        figure: null,
        options: ['A only', 'A, B and C only', 'A and B only', 'A, B, C and D'],
        answer: 1,
        miscon: { 0: 'only-useful-output', 2: 'only-useful-output', 3: 'energy-forms-mixup' },
        technique: 'Tick or cross',
        steps: ['Imagine using a hair dryer. What do you feel?', 'What moves inside it to blow the air?', 'What do you hear?', 'Is anything stored as fuel? Tick or cross each.'],
        optionFeedback: {
          0: 'Heat is right. But a fan inside spins and blows air. What else do you notice?',
          2: 'Heat and movement are right. Does a hair dryer make any noise?',
          3: 'A hair dryer does not make a fuel or food, so no chemical potential energy is stored.' },
        explain: 'Electrical energy -> heat energy (hot air), kinetic energy (spinning fan and moving air) and sound energy.' },

      // ----- Sources of energy and saving energy -----
      { id: 'ene-025', type: 'mcq', level: 1, syl: 'P6', skill: 'sources',
        stem: 'What is the main source of energy for the Earth?',
        figure: null,
        options: ['Power stations', 'The Moon', 'Fossil fuels such as coal', 'The Sun'],
        answer: 3,
        miscon: { 0: 'sun-not-main-source', 1: 'sun-not-main-source', 2: 'sun-not-main-source' },
        optionFeedback: {
          0: 'Power stations make electricity from other sources. Where does almost all energy on Earth start?',
          1: 'The Moon does not give out its own light or heat.',
          2: 'Coal is burned for energy, but it is not where most of Earth\'s energy comes from.' },
        explain: 'The Sun is the main source of energy. It gives out light and heat, and plants trap its light to make food.' },
      { id: 'ene-026', type: 'mcq', level: 2, syl: 'P6', skill: 'sources',
        stem: 'Which of these energy sources will NOT run out?\nA: sunlight\nB: coal\nC: wind\nD: petrol',
        figure: null,
        options: ['B and D only', 'A, B and C only', 'A and C only', 'C and D only'],
        answer: 2,
        miscon: { 0: 'renewable-mixup', 1: 'renewable-mixup', 3: 'renewable-mixup' },
        technique: 'Tick or cross',
        steps: ['Ask for each one: once we use it, can it come back naturally?', 'Fuels dug out of the ground take millions of years to form: cross them.', 'Choose the option with only the ticks.'],
        optionFeedback: {
          0: 'Coal and petrol are dug out of the ground and burned. Once used, are they gone?',
          1: 'Sunlight and wind are right, but coal will run out.',
          3: 'Wind is right, but petrol will run out. Look again at sunlight.' },
        explain: 'Sunlight and wind will not run out. Coal and petrol are fuels that will run out.' },
      { id: 'ene-027', type: 'mcq', level: 1, syl: 'P6', skill: 'sources',
        stem: 'Which of these helps a family in an HDB flat to save energy?',
        figure: null,
        options: ['Setting the air-conditioner to 18 °C instead of 25 °C', 'Switching off the lights and fan when leaving a room', 'Leaving the television on standby overnight', 'Opening the fridge door often to check the food'],
        answer: 1,
        miscon: { 0: 'saving-mixup', 2: 'saving-mixup', 3: 'saving-mixup' },
        optionFeedback: {
          0: 'A colder setting makes the air-conditioner work harder and use more electricity.',
          2: 'Standby still uses electricity all night.',
          3: 'Each time the door opens, cold air escapes and the fridge uses more electricity to cool down again.' },
        explain: 'Switching off lights and fans that are not needed saves electricity.' },

      // ----- OEQ -----
      { id: 'ene-028', type: 'oeq', level: 1, marks: 2, syl: 'P6', skill: 'photo',
        stem: 'Besides light and chlorophyll, name two other things a green plant needs to make food.',
        figure: null,
        model: 'Water and carbon dioxide.',
        keys: [['water'], ['carbon dioxide', 'co2']],
        watchFor: ['photo-inputs-mixup', 'plants-food-from-soil'],
        technique: 'Claim, evidence, reason',
        steps: ['Think of the word picture: what goes IN to a leaf?', 'One comes up from the roots.', 'One comes in from the air.'],
        explain: 'One mark each: water; carbon dioxide. Oxygen is given out, not taken in.' },
      { id: 'ene-029', type: 'oeq', level: 2, marks: 3, syl: 'P6', skill: 'photo', chain: true,
        stem: 'In Hui Min\'s experiment, part P of the leaf did not turn blue-black with iodine. Explain why.',
        figure: FIG_LEAF_FOIL,
        model: 'Part P did not receive light because of the foil. Without light, part P could not make food. So there was no starch in part P to turn the iodine blue-black.',
        keys: [['did not receive light', 'did not get light', 'no light', 'light could not reach', 'blocked the light', 'blocked light'], ['could not make food', 'cannot make food', 'did not make food', 'no food', 'could not photosynthesise', 'no photosynthesis'], ['no starch', 'did not have starch', 'did not contain starch']],
        watchFor: ['no-light-photo', 'iodine-mixup'],
        technique: 'Follow the arrows',
        steps: ['What did the foil stop from reaching P?', 'Without that, can P make food?', 'No food made: is there any starch for the iodine to show?'],
        explain: 'In order: no light reached P -> P could not make food -> no starch, so the iodine did not turn blue-black.' },
      { id: 'ene-030', type: 'oeq', level: 3, marks: 3, syl: 'P6', skill: 'fairtest',
        stem: 'Before her experiment, Hui Min kept the plant in the dark for 2 days.\n(a) Explain why she did this. (2 marks)\n(b) Why did she cover part P on BOTH sides of the leaf? (1 mark)',
        figure: FIG_LEAF_FOIL,
        model: '(a) In the dark, the plant could not make food, so it used up the starch already in its leaves. Then any starch found later must have been made during the experiment. (b) So that light could not reach part P at all, from above or below.',
        keys: [['used up the starch', 'use up the starch', 'used up', 'remove the starch', 'removed the starch', 'no starch left'], ['made during the experiment', 'made in the 6 hours', 'made in sunlight', 'made in the light', 'new starch'], ['light could not reach', 'no light', 'block light', 'blocked light', 'block all light']],
        watchFor: ['destarch-mixup'],
        technique: 'Claim, evidence, reason',
        steps: ['What can a plant NOT do in the dark?', 'So what happens to the starch already stored?', 'Why does that make the starch test fair?', 'For (b): light can enter a leaf from which sides?'],
        explain: '(a) The plant uses up its old starch (1), so any starch found must have been made during the experiment (1). (b) To stop light reaching P from either side (1).' },
      { id: 'ene-031', type: 'oeq', level: 3, marks: 5, syl: 'P6', skill: 'fairtest',
        stem: 'Arun counted the bubbles given out by a water plant in 1 minute, with the lamp at different distances.\n(a) Describe how the number of bubbles changes as the lamp is moved nearer. (1 mark)\n(b) Explain this result. (3 marks)\n(c) Name one variable he must keep the same. (1 mark)',
        figure: stack(FIG_WATERPLANT, TBL_BUBBLES),
        model: '(a) The nearer the lamp, the more bubbles there are in 1 minute. (b) When the lamp is nearer, the plant receives more light. It makes food faster, so it gives out more oxygen, which forms the bubbles. (c) He must use the same plant.',
        keys: [['more bubbles', 'number of bubbles increases', 'bubbles increase'], ['more light', 'brighter light', 'light is brighter', 'stronger light'], ['makes food faster', 'makes more food', 'photosynthesis is faster', 'more photosynthesis', 'photosynthesises faster'], ['more oxygen'], ['same plant', 'same type of plant', 'same size of plant', 'same amount of water', 'same beaker', 'same lamp', 'same time', 'same temperature']],
        watchFor: ['graph-misread', 'photo-gives-co2', 'changed-measured-mixup'],
        technique: 'Read, compare, conclude',
        steps: ['Read: compare the bubble count at 10 cm and at 40 cm.', 'Nearer lamp: more or less light on the plant?', 'More light: what happens to food-making?', 'Which gas is in the bubbles?', 'For (c): what else could change the count?'],
        explain: '(a) More bubbles when nearer (1). (b) More light (1) -> makes food faster (1) -> more oxygen given out (1). (c) Any one: same plant, same amount of water, same counting time, same lamp, same temperature (1).' },
      { id: 'ene-032', type: 'oeq', level: 2, marks: 3, syl: 'P6', skill: 'food', chain: true,
        stem: 'Look at the food chain. Explain how the lion gets energy that first came from the Sun.',
        figure: FIG_CHAIN_LION,
        model: 'The grass uses light energy from the Sun to make food. The zebra gets the energy by eating the grass. The lion gets the energy by eating the zebra.',
        keys: [['light energy', 'uses sunlight', 'traps light', 'makes food', 'make food', 'photosynthesis'], ['eating the grass', 'eats the grass', 'feeds on the grass', 'zebra eats', 'eats grass'], ['eating the zebra', 'eats the zebra', 'feeds on the zebra', 'lion eats']],
        watchFor: ['sun-not-source', 'animals-make-food'],
        technique: 'Follow the arrows',
        steps: ['Start with the Sun: what does the grass do with its light?', 'Next arrow: how does the zebra get the energy?', 'Last arrow: how does the lion get it?'],
        explain: 'In order: grass makes food using light energy -> zebra eats the grass -> lion eats the zebra.' },
      { id: 'ene-033', type: 'oeq', level: 2, marks: 3, syl: 'P6', skill: 'convert', chain: true,
        stem: 'Jia Hui switches on her torch and the bulb lights up. Describe the energy conversion, starting from the batteries.',
        figure: FIG_TORCH,
        model: 'The chemical potential energy in the batteries is converted into electrical energy. In the bulb, the electrical energy is converted into light energy and heat energy.',
        keys: [['chemical potential energy', 'chemical energy'], ['electrical energy', 'electrical'], ['light energy']],
        watchFor: ['battery-electrical', 'conversion-missing-step', 'conversion-reversed'],
        technique: 'Follow the arrows',
        steps: ['What form of energy is stored in a battery?', 'What flows along the wires to the bulb?', 'What does the bulb give out?'],
        explain: 'In order: chemical potential energy -> electrical energy -> light energy (and heat energy).' },
      { id: 'ene-034', type: 'oeq', level: 2, marks: 3, syl: 'P6', skill: 'convert', chain: true,
        stem: 'A small fan joined to a solar panel spins on a sunny day. Describe the energy conversion that makes the fan spin.',
        figure: FIG_SOLAR_FAN,
        model: 'The solar panel converts light energy from the Sun into electrical energy. The fan converts the electrical energy into kinetic energy, so its blades spin.',
        keys: [['light energy', 'light'], ['electrical energy', 'electrical'], ['kinetic energy', 'kinetic']],
        watchFor: ['conversion-missing-step', 'energy-forms-mixup'],
        technique: 'Follow the arrows',
        steps: ['What does the Sun give the panel?', 'What does the panel send along the wires?', 'What form of energy do the spinning blades have?'],
        explain: 'In order: light energy -> electrical energy -> kinetic energy.' },
      { id: 'ene-035', type: 'oeq', level: 3, marks: 3, syl: 'P6', skill: 'convert', chain: true,
        stem: 'Explain how electrical energy is produced at the hydroelectric dam. Name the forms of energy in order.',
        figure: FIG_DAM,
        model: 'The water stored high up behind the dam has gravitational potential energy. As the water flows down, this is converted into kinetic energy. The moving water turns the turbine, and the generator converts the kinetic energy into electrical energy.',
        keys: [['gravitational potential energy', 'potential energy'], ['kinetic energy'], ['kinetic energy into electrical', 'kinetic energy to electrical', 'kinetic to electrical']],
        watchFor: ['conversion-reversed', 'conversion-missing-step'],
        technique: 'Follow the arrows',
        steps: ['The water starts high up and still: what energy does it have?', 'As it flows down, what energy does it gain?', 'What does the generator produce?'],
        explain: 'In order: gravitational potential energy (water high up) -> kinetic energy (moving water) -> electrical energy (generator).' },
      { id: 'ene-036', type: 'oeq', level: 3, marks: 2, syl: 'P6', skill: 'convert', chain: true,
        stem: 'Kai Xin pulls the rubber band of her catapult further back than before. When she lets go, the stone travels further. Explain why.',
        figure: FIG_CATAPULT,
        model: 'The rubber band is stretched more, so it stores more elastic potential energy. When she lets go, this is converted into more kinetic energy of the stone, so the stone moves off faster.',
        keys: [['more elastic potential energy', 'more potential energy', 'more energy stored', 'stores more energy'], ['more kinetic energy', 'moves off faster', 'faster']],
        watchFor: ['energy-forms-mixup', 'still-no-energy'],
        technique: 'Follow the arrows',
        steps: ['A band stretched further stores more or less energy? Which form?', 'When she lets go, what does that energy become?', 'More of it: what happens to the stone\'s speed?'],
        explain: 'In order: more stretch -> more elastic potential energy -> more kinetic energy, so the stone moves faster and travels further.' },
      { id: 'ene-037', type: 'oeq', level: 3, marks: 5, syl: 'P6', skill: 'convert',
        stem: 'Rizwan let a ball go from a height of 100 cm and recorded how high it bounced each time.\n(a) Describe the pattern in his results. (1 mark)\n(b) Explain the pattern you described in (a). (2 marks)\n(c) As the ball falls, which form of energy is converted into which? (2 marks)',
        figure: TBL_BOUNCE,
        model: '(a) Each bounce is lower than the one before. (b) Each time the ball hits the floor, some of its energy is converted into heat and sound energy. So less energy is left to lift the ball up. (c) Gravitational potential energy is converted into kinetic energy.',
        keys: [['lower', 'height decreases', 'smaller'], ['heat', 'sound'], ['less energy', 'less kinetic energy', 'energy left is less'], ['gravitational potential energy', 'potential energy'], ['into kinetic energy', 'to kinetic energy']],
        watchFor: ['energy-used-up', 'gravity-stops', 'conversion-reversed'],
        technique: 'Read, compare, conclude',
        steps: ['Read: 70, 49, 34. Which way do the heights go?', 'What do you hear when a ball hits the floor? What else is produced?', 'So is there more or less energy left to rise?', 'For (c): falling = losing height and gaining speed.'],
        explain: '(a) Lower each time (1). (b) Energy converted to heat and sound at each bounce (1), so less energy is left to rise (1). (c) Gravitational potential energy (1) into kinetic energy (1).' },
      { id: 'ene-038', type: 'oeq', level: 2, marks: 2, syl: 'P6', skill: 'forms',
        stem: 'Darius sits at the top of a playground slide, then slides down. (a) What form of energy does he have at the top because of his height? (b) As he slides down, what is it converted into?',
        figure: null,
        model: '(a) Gravitational potential energy. (b) It is converted into kinetic energy (and some heat energy).',
        keys: [['gravitational potential energy', 'potential energy'], ['kinetic energy']],
        watchFor: ['energy-forms-mixup', 'still-no-energy'],
        technique: 'Claim, evidence, reason',
        steps: ['At the top: he is high up and still. Which stored energy?', 'Sliding down: he loses height and speeds up.', 'Which form of energy does a moving object have?'],
        explain: '(a) Gravitational potential energy (1). (b) Kinetic energy (1). Some energy also becomes heat because of friction with the slide.' },
      { id: 'ene-039', type: 'oeq', level: 2, marks: 3, syl: 'P6', skill: 'sources',
        stem: 'Most of Singapore\'s electricity is made by burning natural gas.\n(a) Suggest two different ways a family can use less electricity at home. (2 marks)\n(b) Give one reason why it is important to use less electricity. (1 mark)',
        figure: null,
        model: '(a) Switch off lights and fans when leaving a room. Use a fan instead of the air-conditioner. (b) Natural gas will run out one day, and burning it gives out carbon dioxide.',
        keys: [['switch off', 'turn off', 'not on standby', 'off standby', 'unplug'], ['fan instead', '25', 'energy-efficient', 'open the windows', 'shorter'], ['run out', 'used up', 'cannot be replaced', 'carbon dioxide', 'pollut']],
        watchFor: ['saving-mixup', 'renewable-mixup'],
        technique: 'Claim, evidence, reason',
        steps: ['Picture your home: which things use electricity?', 'Give two DIFFERENT changes.', 'For (b): what happens to natural gas once it is burned?'],
        explain: '(a) Two DIFFERENT actions: one mark for switching things off (lights, fans, standby, unplugging) and one for using less when on (fan instead of air-conditioner, 25 °C setting, energy-efficient appliances, open windows, shorter use). (b) Natural gas will run out, or burning it gives out carbon dioxide / pollutes (1).' },
      { id: 'ene-040', type: 'oeq', level: 3, marks: 3, syl: 'P6', skill: 'food', chain: true,
        stem: 'Mei Ling eats a bowl of rice and then runs in a race. Explain how energy from the Sun ends up in her moving legs. Name the forms of energy in order.',
        figure: null,
        model: 'The rice plant trapped light energy from the Sun to make food. The energy is stored in the rice as chemical potential energy. When Mei Ling runs, her body converts this chemical potential energy into kinetic energy.',
        keys: [['light energy'], ['chemical potential energy', 'chemical energy'], ['kinetic energy']],
        watchFor: ['food-not-chemical', 'sun-not-source'],
        technique: 'Follow the arrows',
        steps: ['What did the rice plant take from the Sun?', 'How is that energy stored in the rice?', 'What form does it become when she runs?'],
        explain: 'In order: light energy -> chemical potential energy in the rice -> kinetic energy as she runs.' },
      { id: 'ene-041', type: 'oeq', level: 3, marks: 4, syl: 'P6', skill: 'fairtest',
        stem: 'Two plants were kept in the dark for 2 days, then sealed in jars X and Y in sunlight for 6 hours. The leaf from jar X stayed brown with iodine; the leaf from jar Y turned blue-black.\n(a) What was the experiment trying to find out? (1 mark)\n(b) Why was jar Y set up? (1 mark)\n(c) Explain the result for jar X. (2 marks)',
        figure: FIG_JARS,
        model: '(a) Whether a plant needs carbon dioxide to make food. (b) To compare with jar X, so that we know the result is caused by the carbon dioxide. (c) The chemical absorbed the carbon dioxide, so the plant in X had no carbon dioxide. It could not make food, so there was no starch.',
        keys: [['needs carbon dioxide', 'carbon dioxide is needed', 'need carbon dioxide'], ['compare', 'control'], ['no carbon dioxide', 'without carbon dioxide', 'carbon dioxide was removed'], ['could not make food', 'cannot make food', 'no food', 'no starch', 'did not make food']],
        watchFor: ['control-mixup', 'conclusion-overreach'],
        technique: 'Change one thing',
        steps: ['Spot the ONE difference between the jars.', 'That difference is what is being tested: write it as a question.', 'Why have a second jar that is the same in every other way?', 'Jar X: what was missing, and what could the plant not do?'],
        explain: '(a) Whether plants need carbon dioxide to make food (1). (b) For comparison / as a control (1). (c) No carbon dioxide (1) -> no food made, so no starch (1).' },
      { id: 'ene-042', type: 'oeq', level: 2, marks: 2, syl: 'P6', skill: 'photo', chain: true,
        stem: 'A green-and-white leaf was tested with iodine after 6 hours in sunlight. Part W stayed brown. Explain why part W had no starch.',
        figure: FIG_VARIEGATED,
        model: 'Part W has no chlorophyll, so it cannot trap light energy and cannot make food. So no starch is made there.',
        keys: [['no chlorophyll', 'does not have chlorophyll', 'lacks chlorophyll', 'without chlorophyll'], ['cannot trap light', 'cannot make food', 'could not make food', 'no food', 'cannot photosynthesise']],
        watchFor: ['non-green-photo', 'chlorophyll-mixup'],
        technique: 'Follow the arrows',
        steps: ['What is the white part missing?', 'Without it, can the part trap light energy?', 'Without trapping light, can it make food and store starch?'],
        explain: 'In order: no chlorophyll -> cannot trap light energy to make food -> no starch.' },
      { id: 'ene-043', type: 'oeq', level: 3, marks: 3, syl: 'P6', skill: 'convert',
        stem: 'A pendulum bob is let go at X and swings through Y to Z. At which position, X, Y or Z, is the bob moving fastest? Explain your answer using energy.',
        figure: FIG_SWING,
        model: 'Position Y. As the bob swings down from X to Y, it loses height, so its gravitational potential energy is converted into kinetic energy. At Y, the lowest point, it has the most kinetic energy, so it moves fastest.',
        keys: [['position Y', 'at Y', 'point Y'], ['gravitational potential energy', 'potential energy'], ['most kinetic energy', 'greatest kinetic energy']],
        watchFor: ['height-gpe-mixup', 'conversion-reversed'],
        technique: 'Claim, evidence, reason',
        steps: ['Claim: name the position.', 'Evidence: going down, what energy does the bob lose?', 'Reason: where has it gained the most kinetic energy?'],
        explain: 'Y (1). Going down, gravitational potential energy is converted into kinetic energy (1). Y is the lowest point, so it has the most kinetic energy and moves fastest (1).' },
      { id: 'ene-044', type: 'oeq', level: 2, marks: 2, syl: 'P6', skill: 'food', chain: true,
        stem: 'A goat cannot make its own food. Explain why we say the Sun is the source of the goat\'s energy.',
        figure: null,
        model: 'Grass and other plants use light energy from the Sun to make food. The goat gets this energy by eating the plants.',
        keys: [['light energy', 'sunlight', 'make food', 'makes food'], ['eating the plants', 'eats the plants', 'eats grass', 'eating grass', 'feeds on plants', 'eats plants']],
        watchFor: ['sun-not-source', 'animals-make-food'],
        technique: 'Follow the arrows',
        steps: ['Start at the Sun: what does a plant take from it?', 'What does the plant make with it?', 'How does the goat get that energy?'],
        explain: 'In order: plants use light energy to make food (1) -> the goat eats the plants (1).' },
      { id: 'ene-045', type: 'oeq', level: 2, marks: 2, syl: 'P6', skill: 'sources',
        stem: 'Solar panels have been put on the roofs of many HDB blocks. Give two advantages of making electricity from sunlight instead of burning natural gas.',
        figure: null,
        model: 'Sunlight will not run out. Using it does not give out carbon dioxide or other harmful gases that pollute the air.',
        keys: [['will not run out', 'does not run out', 'renewable'], ['does not give out carbon dioxide', 'no carbon dioxide', 'less pollution', 'does not pollute', 'natural gas pollutes', 'no smoke', 'cleaner']],
        watchFor: ['renewable-mixup'],
        technique: 'Claim, evidence, reason',
        steps: ['Will sunlight ever be used up?', 'What comes out when natural gas is burned?', 'Write one advantage for each.'],
        explain: 'One mark each: sunlight will not run out; it does not pollute the air or give out carbon dioxide.' }
    ]
  });
})();
