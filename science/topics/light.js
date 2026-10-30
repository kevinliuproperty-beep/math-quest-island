"use strict";
// Science Quest — topic: Light and Shadows (P4 content examined at PSLE, Energy). Data only; the helpers
// below just build SVG/HTML strings. PSLE (P5-P6) track only: level 'P4' with track: 'psle', so the
// P3-P4 island is unchanged.
// Scope per MOE Primary Science Syllabus 2023, theme Energy, "Light" (P4 block, examined at PSLE 0009
// from 2026). Sources checked 2026-10-30 (school briefings that quote or summarise the 2023 syllabus):
//   - Junyuan Pri, 2026 P4 Science: "Cycles - Matter; Energy - Light and Shadows; Energy - Heat and
//     Effects of Heat"  https://www.junyuanpri.moe.edu.sg/files/2026_P4_SCI.pdf
//   - Jurong West Pri, P4 Science Briefing Slides 2026 (Matter T1, Heat T2, Light T4)
//     https://www.jurongwestpri.moe.edu.sg/files/Slides%20and%20info/P4__Science__Briefing_Slides_2026.pdf
//   - Yuhua Pri, 2025 P4 Parent Engagement Science: "plant system, human systems, matter and light are P4"
//     https://www.yuhuapri.moe.edu.sg/files/2025_Parent_engagement_P4_SC.pdf
//   - Admiralty Pri, P4 Science lesson focus: "an object can be seen when it reflects light or is a
//     light source"  https://admiraltypri.moe.edu.sg/files/p4%20science.pdf
//   (The MOE PDF itself did not load on the day; the school PDFs above 404 to direct fetch and were
//   read through search summaries.)
// In scope here: light sources and objects that only reflect light (the Moon, mirrors); we see an object
//   when light given out or reflected by it enters our eyes; light travels in straight lines; a shadow
//   forms when an object blocks light; the shadow is on the side away from the light; shadow size changes
//   with the distance of the object from the light source and the screen; shadow outline and shape;
//   transparent, translucent and opaque materials by how much light passes through; translucent objects
//   cast lighter shadows; smooth shiny surfaces reflect more light; simple uses of mirrors (rear-view
//   mirror, a periscope traced as a light path only).
// Deliberately LEFT OUT (beyond P4 or unsure): the law of reflection and angles, refraction, lenses,
//   colours and the spectrum, the Sun's daily path and shadow length through the day (Earth's rotation).
(function () {
  const INK = '#1f2937', LINE = '#475569', WOOD = '#d6b88a', WOODD = '#7c5a2c', BULB = '#fde047', GLOW = '#f59e0b';

  const svg = (w, h, label, inner) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="100%" style="max-width:${w}px;display:block;margin:0 auto" role="img" aria-label="${label}">` +
    `<rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="10" fill="#ffffff" stroke="#cbd5e1"/>${inner}</svg>`;

  const txt = (x, y, s, o = {}) =>
    `<text x="${x}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="${o.size || 15}" font-weight="${o.bold ? 700 : 400}" fill="${o.fill || INK}" text-anchor="${o.anchor || 'middle'}" dominant-baseline="middle">${s}</text>`;

  // Straight arrow from (x1,y1) to (x2,y2) with a head at (x2,y2).
  const arrow = (x1, y1, x2, y2, o = {}) => {
    const a = Math.atan2(y2 - y1, x2 - x1), L = 11, W = 6;
    const bx = x2 - L * Math.cos(a), by = y2 - L * Math.sin(a);
    const px = W * Math.sin(a), py = -W * Math.cos(a);
    const c = o.colour || INK;
    return `<line x1="${x1}" y1="${y1}" x2="${bx.toFixed(1)}" y2="${by.toFixed(1)}" stroke="${c}" stroke-width="${o.width || 3}"${o.dash ? ' stroke-dasharray="6 4"' : ''}/>` +
      `<polygon points="${x2},${y2} ${(bx + px).toFixed(1)},${(by + py).toFixed(1)} ${(bx - px).toFixed(1)},${(by - py).toFixed(1)}" fill="${c}"/>`;
  };

  // An eye looking to the left, centred at (x, y).
  const eye = (x, y) => `<ellipse cx="${x}" cy="${y}" rx="18" ry="10" fill="#ffffff" stroke="${INK}" stroke-width="2"/>` +
    `<circle cx="${x - 6}" cy="${y}" r="6" fill="#1e3a8a"/><circle cx="${x - 6}" cy="${y}" r="2.5" fill="#000"/>`;

  // A glowing bulb centred at (x, y).
  const bulb = (x, y) => `<circle cx="${x}" cy="${y}" r="14" fill="${BULB}" stroke="${GLOW}" stroke-width="2"/>` +
    `<rect x="${x - 6}" y="${y + 13}" width="12" height="9" fill="#9ca3af" stroke="${INK}"/>`;

  // A torch pointing right, with its lens at (x, y).
  const torch = (x, y) => `<rect x="${x - 46}" y="${y - 9}" width="34" height="18" rx="3" fill="#64748b" stroke="${INK}"/>` +
    `<polygon points="${x - 12},${y - 9} ${x},${y - 15} ${x},${y + 15} ${x - 12},${y + 9}" fill="#94a3b8" stroke="${INK}"/>` +
    `<rect x="${x}" y="${y - 15}" width="4" height="30" fill="${BULB}" stroke="${GLOW}"/>`;

  // A simple toy figure standing with its feet at (x, yb), height h.
  const toy = (x, yb, h) => {
    const r = h * 0.18;
    return `<circle cx="${x}" cy="${yb - h + r}" r="${r}" fill="#fca5a5" stroke="${INK}"/>` +
      `<rect x="${x - r * 0.9}" y="${yb - h + 2 * r}" width="${r * 1.8}" height="${h - 2 * r}" rx="3" fill="#60a5fa" stroke="${INK}"/>`;
  };

  // A candle with its flame top at (x, y).
  const candle = (x, y) => `<path d="M${x} ${y} C ${x + 7} ${y + 9}, ${x + 6} ${y + 16}, ${x} ${y + 18} C ${x - 6} ${y + 16}, ${x - 7} ${y + 9}, ${x} ${y}" fill="${GLOW}" stroke="#b45309"/>` +
    `<rect x="${x - 6}" y="${y + 18}" width="12" height="28" fill="#f8fafc" stroke="${INK}"/>`;

  const TH = 'border:1px solid #94a3b8;padding:6px 10px;background:#e2e8f0;color:#111827';
  const TD = 'border:1px solid #94a3b8;padding:6px 10px;text-align:center';
  const table = (head, rows, caption) =>
    `<table style="border-collapse:collapse;margin:0 auto;font-size:15px">` +
    (caption ? `<caption style="padding:4px 0 6px;font-weight:600">${caption}</caption>` : '') +
    `<thead><tr>${head.map((h) => `<th style="${TH}">${h}</th>`).join('')}</tr></thead>` +
    `<tbody>${rows.map((r) => `<tr>${r.map((c) => `<td style="${TD}">${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;

  const stack = (a, b) => `<div>${a}<div style="height:10px"></div>${b}</div>`;

  // ---------- Figures ----------
  // A lamp, a book on a table and an eye, with no light paths drawn.
  const FIG_SEE = (() => {
    let s = `<line x1="40" y1="22" x2="80" y2="22" stroke="${LINE}" stroke-width="2"/><line x1="60" y1="22" x2="60" y2="38" stroke="${LINE}" stroke-width="2"/>`;
    s += `<polygon points="44,38 76,38 84,56 36,56" fill="#cbd5e1" stroke="${INK}"/>` + bulb(60, 62);
    s += txt(104, 52, 'lamp', { size: 14, anchor: 'start' });
    s += `<rect x="20" y="160" width="230" height="10" fill="${WOOD}" stroke="${WOODD}"/>` + txt(60, 184, 'table', { size: 13 });
    s += `<rect x="140" y="138" width="70" height="22" fill="#f87171" stroke="${INK}"/>` + txt(175, 120, 'book', { size: 14 });
    s += eye(320, 110) + txt(320, 136, 'eye', { size: 14 });
    return svg(360, 200, 'A lamp hangs above a table. A book lies on the table. An eye looks at the book from the right.', s);
  })();

  // A bulb, three cards X, Y and Z with holes in a straight line, and an eye.
  const FIG_CARDS = (() => {
    let s = bulb(36, 92) + txt(36, 140, 'bulb', { size: 13 });
    s += `<line x1="52" y1="92" x2="308" y2="92" stroke="${GLOW}" stroke-width="2" stroke-dasharray="5 4"/>`;
    [[112, 'X'], [182, 'Y'], [252, 'Z']].forEach(([x, l]) => {
      s += `<rect x="${x - 5}" y="40" width="10" height="44" fill="${WOOD}" stroke="${WOODD}"/><rect x="${x - 5}" y="100" width="10" height="44" fill="${WOOD}" stroke="${WOODD}"/>`;
      s += txt(x, 26, l, { bold: 1, size: 16 });
    });
    s += txt(182, 160, 'cards with a hole in each', { size: 13 });
    s += eye(326, 92) + txt(326, 118, 'eye', { size: 13 });
    return svg(360, 176, 'A bulb, then three upright cards X, Y and Z, each with a small hole. The holes are in a straight line with the bulb and an eye.', s);
  })();

  // A candle seen through a straight tube (top) and a bent tube (bottom).
  const FIG_TUBE = (() => {
    let s = candle(40, 34) + txt(40, 94, 'candle', { size: 13 });
    s += `<rect x="80" y="40" width="190" height="20" fill="#e2e8f0" stroke="${INK}"/>` + txt(175, 26, 'straight tube', { size: 13 });
    s += eye(310, 50);
    s += candle(40, 128) + txt(40, 188, 'candle', { size: 13 });
    s += `<path d="M80 134 L160 134 L230 104 L270 104 L270 124 L234 124 L164 154 L80 154 Z" fill="#e2e8f0" stroke="${INK}"/>`;
    s += txt(150, 176, 'bent tube', { size: 13 });
    s += eye(310, 114);
    s += txt(330, 84, 'eyes', { size: 13 });
    return svg(360, 200, 'Top: a candle flame seen through a straight tube. Bottom: a candle flame seen through a bent tube.', s);
  })();

  // The Sun to the upper left of a tree, with the ground marked left and right.
  const FIG_SUN_TREE = (() => {
    let s = `<circle cx="52" cy="48" r="20" fill="${BULB}" stroke="${GLOW}" stroke-width="2"/>`;
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      s += `<line x1="${(52 + 25 * Math.cos(a)).toFixed(1)}" y1="${(48 + 25 * Math.sin(a)).toFixed(1)}" x2="${(52 + 33 * Math.cos(a)).toFixed(1)}" y2="${(48 + 33 * Math.sin(a)).toFixed(1)}" stroke="${GLOW}" stroke-width="2"/>`;
    }
    s += txt(100, 30, 'Sun', { size: 14, anchor: 'start' });
    s += `<line x1="16" y1="160" x2="344" y2="160" stroke="${LINE}" stroke-width="2"/>`;
    s += `<rect x="172" y="104" width="16" height="56" fill="${WOODD}"/><circle cx="180" cy="88" r="30" fill="#4ade80" stroke="#15803d"/>` + txt(232, 80, 'tree', { size: 14, anchor: 'start' });
    s += txt(90, 180, 'left of the tree', { size: 13 }) + txt(270, 180, 'right of the tree', { size: 13 });
    return svg(360, 196, 'The Sun shines from the upper left onto a tree standing on flat ground.', s);
  })();

  // A torch, a toy and a screen, with the distance of the toy from the torch marked.
  const FIG_SHADOW = (() => {
    let s = torch(66, 96) + txt(40, 122, 'torch', { size: 13 });
    s += `<line x1="70" y1="96" x2="318" y2="58" stroke="${GLOW}" stroke-dasharray="4 4"/><line x1="70" y1="96" x2="318" y2="138" stroke="${GLOW}" stroke-dasharray="4 4"/>`;
    s += toy(150, 108, 22) + txt(150, 128, 'toy', { size: 13 });
    s += `<rect x="318" y="22" width="10" height="140" fill="#f1f5f9" stroke="${INK}"/><rect x="318" y="65" width="10" height="68" fill="#334155"/>`;
    s += txt(300, 14, 'screen', { size: 13 }) + txt(296, 98, 'shadow', { size: 13, anchor: 'end' });
    s += arrow(70, 158, 148, 158, { width: 2 }) + `<line x1="70" y1="150" x2="70" y2="166" stroke="${INK}"/>`;
    s += txt(110, 176, 'distance of toy from torch', { size: 13 });
    return svg(360, 192, 'A torch shines on a toy. The toy casts a shadow on a screen. The distance of the toy from the torch is marked.', s);
  })();

  const TBL_SHADOW = table(['Distance of toy from torch (cm)', 'Height of shadow (cm)'],
    [['10', '48'], ['20', '24'], ['30', '16'], ['40', '12']], 'Results');

  // A torch, a sheet of material and a light sensor.
  const FIG_SENSOR = (() => {
    let s = torch(76, 70) + txt(50, 98, 'torch', { size: 13 });
    s += arrow(84, 70, 166, 70, { width: 2, colour: GLOW });
    s += `<rect x="170" y="24" width="12" height="92" fill="#cbd5e1" stroke="${INK}"/>` + txt(176, 132, 'sheet of material', { size: 13 });
    s += arrow(186, 70, 262, 70, { width: 2, colour: GLOW, dash: 1 });
    s += `<rect x="266" y="50" width="64" height="40" rx="6" fill="#e0e7ff" stroke="${INK}"/>` + txt(298, 70, '000', { size: 14, bold: 1 });
    s += txt(298, 108, 'light sensor', { size: 13 });
    return svg(360, 150, 'A torch shines through a sheet of material onto a light sensor.', s);
  })();

  const TBL_SENSOR = table(['Sheet of material', 'Light sensor reading (units)'],
    [['No sheet', '500'], ['P', '480'], ['Q', '0'], ['R', '210'], ['S', '60']], 'Results');

  const TBL_SURFACES = table(['Surface', 'Amount of light reflected (units)'],
    [['Shiny metal tray', '410'], ['White paper', '260'], ['Rough brown card', '90'], ['Black velvet cloth', '20']], 'Results');

  // A periscope over a wall: ship on the left, two mirrors in the tube, an eye at the bottom right.
  const FIG_PERISCOPE = (() => {
    let s = `<line x1="14" y1="222" x2="346" y2="222" stroke="${LINE}" stroke-width="2"/>`;
    s += `<polygon points="22,62 108,62 96,80 34,80" fill="#93c5fd" stroke="${INK}"/><rect x="52" y="44" width="24" height="18" fill="#e5e7eb" stroke="${INK}"/>` + txt(64, 98, 'ship', { size: 13 });
    s += `<rect x="118" y="96" width="22" height="126" fill="#d6d3d1" stroke="${INK}"/>` + txt(100, 160, 'wall', { size: 13, anchor: 'end' });
    s += `<rect x="150" y="30" width="40" height="180" fill="#f1f5f9" stroke="${INK}" stroke-width="2"/>`;
    s += `<rect x="148" y="40" width="4" height="30" fill="#ffffff"/><rect x="188" y="170" width="4" height="30" fill="#ffffff"/>`;
    s += `<line x1="152" y1="36" x2="188" y2="74" stroke="#0ea5e9" stroke-width="4"/><line x1="152" y1="166" x2="188" y2="204" stroke="#0ea5e9" stroke-width="4"/>`;
    s += txt(200, 40, 'top mirror', { size: 13, anchor: 'start' }) + txt(204, 152, 'bottom mirror', { size: 13, anchor: 'start' });
    s += eye(250, 186);
    s += txt(286, 186, 'eye', { size: 13, anchor: 'start' });
    return svg(360, 236, 'A periscope beside a wall. A ship is on the far side of the wall. The periscope has a top mirror and a bottom mirror. An eye looks into the bottom of the periscope.', s);
  })();

  SCI.registerTopic({
    id: 'light',
    title: 'Light and Shadows',
    emoji: '🔦',
    theme: 'Energy',
    level: 'P4',
    track: 'psle',
    moeRef: 'Energy: Light (P4, examined at PSLE), MOE Primary Science Syllabus 2023: recognise that we see an object when light from a light source, or light reflected by the object, enters our eyes; recognise that light travels in a straight line; investigate how a shadow is formed when light is blocked by an object, and how its size changes; classify materials as transparent, translucent or opaque by the amount of light that passes through. Scope checked against Junyuan Pri 2026 P4 Science (Energy - Light and Shadows), Jurong West Pri P4 Science Briefing 2026, Yuhua Pri 2025 P4 Parent Engagement and Admiralty Pri P4 lesson focus.',
    skills: {
      sources: 'Light sources',
      seeing: 'How we see things',
      straight: 'Light travels in straight lines',
      shadows: 'Shadows',
      materials: 'Transparent, translucent and opaque',
      reflect: 'Reflecting light',
      fairtest: 'Fair tests and results'
    },
    misconceptions: {
      'reflect-vs-straight': 'Using evidence of reflection (something looks shiny) as evidence that light travels in straight lines.',
      'reflector-is-source': 'An object that looks bright because it reflects light, such as the Moon or a mirror, gives out its own light.',
      'source-mixup': 'Mixing up which objects give out their own light and which do not.',
      'eyes-give-light': 'We see because light goes out from our eyes to the object.',
      'see-in-total-dark': 'We can see objects in complete darkness if we look hard or wait long enough.',
      'light-path-wrong': 'Getting the order of the light path wrong, such as from the eye to the object, or from the object to the lamp.',
      'light-bends': 'Light can bend around corners or follow a bent tube.',
      'shadow-is-reflection': 'A shadow is a reflection of the object, or something the object gives out.',
      'shadow-same-side': 'A shadow forms on the same side of the object as the light source.',
      'shadow-size-wrong-way': 'Moving an object closer to the light source makes its shadow smaller.',
      'brighter-bigger-shadow': 'A brighter light makes a bigger shadow, even when nothing is moved.',
      'shadow-shape-fixed': 'An object always casts a shadow of the same shape, however it is turned.',
      'shadow-detail': 'A shadow shows the colours, words or details of the object.',
      'translucent-no-shadow': 'Only opaque objects form shadows; translucent objects form none, or one just as dark.',
      'transparent-mixup': 'Mixing up transparent, translucent and opaque materials.',
      'only-mirrors-reflect': 'Only mirrors and shiny things reflect light; dull or dark objects reflect none.',
      'rough-reflects-more': 'Rough or dark surfaces reflect more light than smooth, shiny ones.',
      'mirror-passes-light': 'A mirror lets light pass through it, like glass in a window.',
      'graph-misread': 'Reading a value from the wrong row or column of a table.',
      'changed-measured-mixup': 'Mixing up the variable that is changed, the variable that is measured and the variables kept the same.'
    },
    notes: [
      { title: 'Light sources',
        body: 'A light source gives out its own light: the Sun, a lit candle, a switched-on torch, a firefly.\nNOT light sources: the Moon, a mirror, a shiny spoon. They look bright only because they reflect light from a light source.' },
      { title: 'How we see things',
        body: 'We see an object when light from it enters our eyes.\n- A light source: its light travels straight into our eyes.\n- Other objects: light from a light source falls on the object, the object reflects some of it, and the reflected light enters our eyes.\nIn complete darkness, no light enters our eyes, so we see nothing.' },
      { title: 'Light travels in straight lines',
        body: 'Light travels in straight lines. You can see a candle through a straight tube but not through a bent one. Through three cards with holes, you see the bulb only when all the holes are in one straight line.' },
      { title: 'How a shadow forms',
        body: 'A shadow forms when an object blocks light. Light cannot reach the area behind the object, so that area is darker. The shadow is on the side of the object AWAY from the light. A shadow shows only the outline of the object, not its colours or details.' },
      { title: 'Shadow size',
        body: 'Object closer to the light source: it blocks more light, so the shadow is BIGGER.\nObject further from the light source (closer to the screen): the shadow is SMALLER.\nTurning an object can change the shape of its shadow. A brighter torch at the same place does not change the size of the shadow.' },
      { title: 'Transparent, translucent, opaque',
        body: 'Transparent: allows most light to pass through; we see clearly through it (clear glass, clear plastic).\nTranslucent: allows some light to pass through; we cannot see clearly through it (frosted glass, tracing paper). It casts a lighter shadow.\nOpaque: allows no light to pass through (wood, cardboard, metal). It casts a dark shadow.' },
      { title: 'Reflecting light',
        body: 'Most objects reflect some light. That is how we see them. Smooth, shiny surfaces such as mirrors and polished metal reflect the most light. Dark, dull, rough surfaces reflect less. A mirror changes the direction of light: a rear-view mirror and a periscope both use this.' },
      { title: 'Fair tests with light',
        body: 'Change ONE variable (for example, the type of material). Measure ONE thing (for example, the light sensor reading). Keep everything else the same: the same torch, the same distance between the torch and the sensor, the same size of sheet.' }
    ],
    items: [
      // ----- Light sources -----
      { id: 'lgt-001', type: 'mcq', level: 1, syl: 'P4', skill: 'sources',
        stem: 'Which of these is a light source?',
        figure: null,
        options: ['The Moon', 'A mirror', 'A lit candle', 'A shiny spoon'],
        answer: 2,
        miscon: { 0: 'reflector-is-source', 1: 'reflector-is-source', 3: 'reflector-is-source' },
        optionFeedback: {
          0: 'The Moon looks bright, but it only reflects light from the Sun. Find the one that makes its own light.',
          1: 'In a dark room a mirror is dark. It only reflects light. Which one gives out light of its own?',
          3: 'A shiny spoon reflects light from a lamp or the Sun. It gives out none of its own.' },
        explain: 'A lit candle gives out its own light. The Moon, a mirror and a shiny spoon only reflect light from a light source.' },
      { id: 'lgt-002', type: 'mcq', level: 2, syl: 'P4', skill: 'sources',
        stem: 'Which of these are light sources?\nA: the Sun\nB: a glowing firefly\nC: the Moon\nD: a switched-on torch',
        figure: null,
        options: ['A and C only', 'A, B and D only', 'B and D only', 'A, B, C and D'],
        answer: 1,
        miscon: { 0: 'reflector-is-source', 2: 'source-mixup', 3: 'reflector-is-source' },
        technique: 'Tick or cross',
        steps: ['I take one object at a time.', 'Does it give out its own light, or only reflect light?', 'Tick it if it gives out light. Cross it if it only reflects.', 'I choose the option with only the ticks.'],
        optionFeedback: {
          0: 'A is right. The Moon (C) only reflects sunlight. Look again at the firefly and the torch.',
          2: 'B and D are right. The Sun (A) gives out its own light too.',
          3: 'A, B and D give out light. But the Moon (C) only reflects light from the Sun.' },
        explain: 'The Sun, a glowing firefly and a switched-on torch give out their own light. The Moon only reflects light from the Sun.' },
      { id: 'lgt-003', type: 'mcq', level: 2, syl: 'P4', skill: 'sources',
        stem: 'On a clear night, the Moon looks bright. Why?',
        figure: null,
        options: ['It gives out its own light.', 'It is very hot and glows.', 'It reflects light from the stars.', 'It reflects light from the Sun.'],
        answer: 3,
        miscon: { 0: 'reflector-is-source', 1: 'reflector-is-source', 2: 'source-mixup' },
        optionFeedback: {
          0: 'The Moon makes no light of its own. Where does the light we see come from?',
          1: 'The Moon does not glow like a hot stove. It reflects light that falls on it.',
          2: 'Stars are very far away and their light is weak. The Moon is lit by a much brighter light source.' },
        explain: 'The Moon is not a light source. Light from the Sun falls on the Moon and the Moon reflects it towards the Earth.' },
      { id: 'lgt-004', type: 'oeq', level: 2, marks: 2, syl: 'P4', skill: 'sources',
        stem: 'Ahmad says, "A mirror in the sunlight is a light source, because it looks so bright." Do you agree? Explain your answer.',
        figure: null,
        model: 'I do not agree. A mirror does not give out its own light. It only reflects light from the Sun.',
        keys: [['does not give out its own light', 'does not give out light', 'does not produce light', 'does not make its own light', 'no light of its own'], ['reflects light', 'reflect light', 'reflects the light', 'reflects sunlight']],
        watchFor: ['reflector-is-source'],
        technique: 'Claim, evidence, reason',
        steps: ['Claim: agree or not?', 'Think: would the mirror look bright in a completely dark room?', 'Reason: does it give out light, or only reflect it?'],
        explain: 'One mark for saying the mirror does not give out its own light. One mark for saying it only reflects light from a light source (the Sun).' },

      // ----- How we see things -----
      { id: 'lgt-005', type: 'mcq', level: 1, syl: 'P4', skill: 'seeing',
        stem: 'Lina can see a book on her desk in a brightly lit room. How is she able to see the book?',
        figure: null,
        options: ['Light from her eyes falls on the book.', 'Light from the lamp is reflected by the book into her eyes.', 'The book gives out its own light into her eyes.', 'Light from the lamp passes through the book.'],
        answer: 1,
        miscon: { 0: 'eyes-give-light', 2: 'reflector-is-source', 3: 'transparent-mixup' },
        optionFeedback: {
          0: 'Our eyes do not give out light. They take in light that enters them.',
          2: 'A book does not glow. In a dark room you cannot see it at all.',
          3: 'A book is opaque. Light bounces off it rather than passing through.' },
        explain: 'Light from the lamp falls on the book. The book reflects some of the light, and the reflected light enters Lina\'s eyes.' },
      { id: 'lgt-006', type: 'mcq', level: 2, syl: 'P4', skill: 'seeing',
        stem: 'The picture shows a lamp, a book and an eye. Which shows the path of light that lets the eye see the book?',
        figure: FIG_SEE,
        options: ['lamp → book → eye', 'eye → book → lamp', 'eye → book', 'book → lamp → eye'],
        answer: 0,
        miscon: { 1: 'eyes-give-light', 2: 'eyes-give-light', 3: 'light-path-wrong' },
        technique: 'Follow the arrows',
        steps: ['Where does the light start? At the light source.', 'Where does it go next? To the object it lights up.', 'Where must it end so we can see? In the eye.'],
        optionFeedback: {
          1: 'This path starts at the eye. Light starts at the light source and ends in the eye.',
          2: 'Light does not come out of our eyes. Where does the light start?',
          3: 'The book does not give out light. Light must reach the book first, from the lamp.' },
        explain: 'Light starts at the lamp (the light source), is reflected by the book, then enters the eye.' },
      { id: 'lgt-007', type: 'mcq', level: 2, syl: 'P4', skill: 'seeing',
        stem: 'Ravi is in a room with no windows. The lights are off and there is no light at all. He cannot see the white ball in front of him. Why?',
        figure: null,
        options: ['His eyes have not given out enough light yet.', 'The ball has become transparent in the dark.', 'The ball gives out too little of its own light.', 'No light is reflected from the ball into his eyes.'],
        answer: 3,
        miscon: { 0: 'eyes-give-light', 1: 'transparent-mixup', 2: 'reflector-is-source' },
        optionFeedback: {
          0: 'Eyes do not give out light, however long he waits. Think about light entering his eyes.',
          1: 'The ball is the same ball in the dark. What is missing from the room?',
          2: 'A ball gives out no light at all, in the dark or in the day. It can only reflect light.' },
        explain: 'To see the ball, light reflected from it must enter Ravi\'s eyes. With no light source, no light falls on the ball, so none is reflected into his eyes.' },
      { id: 'lgt-008', type: 'mcq', level: 2, syl: 'P4', skill: 'seeing',
        stem: 'Siti looks at a lit lantern during the Mid-Autumn Festival. How is she able to see the lantern?',
        figure: null,
        options: ['Light from the lantern travels into her eyes.', 'Light from her eyes travels to the lantern.', 'Her eyes reflect light onto the lantern.', 'The light must bounce off a mirror first.'],
        answer: 0,
        miscon: { 1: 'eyes-give-light', 2: 'eyes-give-light', 3: 'light-path-wrong' },
        optionFeedback: {
          1: 'Our eyes take in light; they do not send it out. Where does the light start?',
          2: 'The lantern is the light source here. Which way does its light travel?',
          3: 'A lit lantern gives out its own light, so no mirror is needed.' },
        explain: 'The lit lantern is a light source. Its light travels straight into Siti\'s eyes.' },
      { id: 'lgt-009', type: 'oeq', level: 2, marks: 3, syl: 'P4', skill: 'seeing', chain: true,
        stem: 'Jia Hui is reading a storybook under a desk lamp. Explain how she is able to see the storybook.',
        figure: null,
        model: 'The lamp gives out light. The light falls on the storybook and is reflected by it. The reflected light enters her eyes, so she sees the storybook.',
        keys: [['gives out light', 'produces light', 'is a light source'], ['reflected', 'reflects', 'bounces off'], ['enters her eyes', 'into her eyes', 'reaches her eyes', 'enters the eyes']],
        watchFor: ['eyes-give-light', 'light-path-wrong'],
        technique: 'Follow the arrows',
        steps: ['Where does the light start?', 'What does the storybook do to the light?', 'Where must the light end up for her to see?'],
        explain: 'Three links in order: the lamp gives out light -> the book reflects it -> the reflected light enters her eyes.' },
      { id: 'lgt-010', type: 'oeq', level: 3, marks: 2, syl: 'P4', skill: 'seeing', chain: true,
        stem: 'During a blackout at night, Daniel\'s bedroom is completely dark. He cannot see his white cupboard even though his eyes are open. Explain why.',
        figure: null,
        model: 'There is no light falling on the cupboard because there is no light source. So no light is reflected from the cupboard into his eyes.',
        keys: [['no light falling on the cupboard', 'no light shines on', 'no light source', 'no light falls'], ['no light is reflected', 'not reflected', 'nothing is reflected', 'no reflected light']],
        watchFor: ['see-in-total-dark', 'eyes-give-light'],
        technique: 'Follow the arrows',
        steps: ['To see the cupboard, what must enter his eyes?', 'Where would that light normally come from?', 'With no light source, what happens to that path?'],
        explain: 'One mark for no light falling on the cupboard (no light source). One mark for no light being reflected from it into his eyes.' },

      // ----- Light travels in straight lines -----
      { id: 'lgt-011', type: 'mcq', level: 1, syl: 'P4', skill: 'straight',
        stem: 'How does light travel?',
        figure: null,
        options: ['In curved lines', 'Around objects in its way', 'In straight lines', 'Only downwards from the sky'],
        answer: 2,
        miscon: { 0: 'light-bends', 1: 'light-bends', 3: 'light-path-wrong' },
        optionFeedback: {
          0: 'Think of a torch beam in a dark room. Is the beam curved?',
          1: 'If light went around objects, there would be no shadows.',
          3: 'A torch can shine sideways or upwards too. What shape is its beam?' },
        explain: 'Light travels in straight lines. That is why a torch beam is straight and why shadows form.' },
      { id: 'lgt-012', type: 'mcq', level: 2, syl: 'P4', skill: 'straight',
        stem: 'Mei set up a bulb, three cards X, Y and Z with a small hole in each, and looked through the holes. She could see the bulb. Then she moved card Y a little to one side. What happened?',
        figure: FIG_CARDS,
        options: ['She could still see the bulb, as the light bends through the holes.', 'She could not see the bulb, as light travels in straight lines.', 'She could see the bulb more brightly, as card Y reflects light.', 'She could not see the bulb, as card Y gives out no light.'],
        answer: 1,
        miscon: { 0: 'light-bends', 2: 'only-mirrors-reflect', 3: 'reflector-is-source' },
        technique: 'Follow the arrows',
        steps: ['Trace the light from the bulb towards the eye.', 'After card Y moves, is its hole still on that straight path?', 'If not, what does card Y do to the light?'],
        optionFeedback: {
          0: 'Light cannot bend to find a hole that has moved out of line.',
          2: 'Card Y now blocks the path. Less light, not more, reaches her eye.',
          3: 'None of the cards gives out light; the bulb does. What does the moved card do to the bulb\'s light?' },
        explain: 'Light travels in straight lines. When the hole in card Y is out of line, card Y blocks the light, so it cannot reach her eye.' },
      { id: 'lgt-013', type: 'mcq', level: 2, syl: 'P4', skill: 'straight',
        stem: 'Kumar looked at a candle flame through a straight tube and through a bent tube. Through which tube could he see the flame?',
        figure: FIG_TUBE,
        options: ['The straight tube only', 'The bent tube only', 'Both tubes', 'Neither tube'],
        answer: 0,
        miscon: { 1: 'light-bends', 2: 'light-bends', 3: 'light-path-wrong' },
        optionFeedback: {
          1: 'Light from the flame travels in a straight line, so it hits the side of the bent tube.',
          2: 'Light cannot follow the bend. Which tube gives a straight path to the eye?',
          3: 'One tube gives a straight path from the flame to the eye. Which one?' },
        explain: 'Light travels in straight lines. It can pass straight along the straight tube, but it is blocked by the side of the bent tube.' },
      { id: 'lgt-014', type: 'mcq', level: 3, syl: 'P4', skill: 'straight',
        stem: 'Which of these observations show that light travels in straight lines?\nA: A shadow has the same outline as the object that blocks the light.\nB: You cannot see a torch through a bent tube.\nC: A mirror looks shiny.\nD: In a dusty room, a torch beam looks like a straight band of light.',
        figure: null,
        options: ['A and C only', 'B and D only', 'A, B and D only', 'A, B, C and D'],
        answer: 2,
        miscon: { 0: 'reflect-vs-straight', 1: 'shadow-is-reflection', 3: 'reflect-vs-straight' },
        technique: 'Tick or cross',
        steps: ['I take one statement at a time.', 'Would this happen if light could bend around things?', 'Tick it if it shows light going straight. Cross it if it is about something else.', 'I choose the option with only the ticks.'],
        optionFeedback: {
          0: 'A is right. But a shiny mirror (C) shows reflection, not straight lines. Check B and D too.',
          1: 'B and D are right. A sharp shadow outline (A) also shows light cannot bend around the object.',
          3: 'A, B and D are right. A mirror looking shiny (C) is about reflecting, not about straight lines.' },
        explain: 'A, B and D show light travelling in straight lines. C is about reflection.' },
      { id: 'lgt-015', type: 'oeq', level: 2, marks: 3, syl: 'P4', skill: 'straight', chain: true,
        stem: 'Mei could see the bulb through the holes in cards X, Y and Z. After she moved card Y a little to one side, she could no longer see the bulb. Explain why.',
        figure: FIG_CARDS,
        model: 'Light travels in straight lines. The hole in card Y is out of line, so card Y blocks the light from the bulb. The light cannot reach her eyes.',
        keys: [['straight lines', 'straight line'], ['blocks the light', 'block the light', 'blocked', 'stops the light'], ['cannot reach her eyes', 'does not reach her eyes', 'cannot enter her eyes', 'does not enter her eyes', 'not reach her eye']],
        watchFor: ['light-bends'],
        technique: 'Follow the arrows',
        steps: ['How does light travel?', 'With the hole out of line, what does card Y do to the light?', 'So where can the light not get to?'],
        explain: 'In order: light travels in straight lines -> card Y blocks the light -> the light cannot reach her eyes.' },
      { id: 'lgt-016', type: 'oeq', level: 3, marks: 2, syl: 'P4', skill: 'straight', chain: true,
        stem: 'Jun Wei can hear his friend talking on the other side of a high wall, but he cannot see him. Explain why he cannot see his friend.',
        figure: null,
        model: 'Light travels in straight lines. The light reflected from his friend is blocked by the wall and cannot bend around it, so it cannot reach Jun Wei\'s eyes.',
        keys: [['straight lines', 'straight line'], ['blocked by the wall', 'blocked', 'cannot bend', 'cannot go around', 'does not bend']],
        watchFor: ['light-bends'],
        technique: 'Follow the arrows',
        steps: ['To see his friend, what must reach Jun Wei\'s eyes?', 'How does that light travel?', 'What does the wall do to it?'],
        explain: 'One mark for "light travels in straight lines". One mark for the wall blocking the light (it cannot bend around the wall), so it cannot reach his eyes.' },

      // ----- Shadows -----
      { id: 'lgt-017', type: 'mcq', level: 1, syl: 'P4', skill: 'shadows',
        stem: 'How is a shadow formed?',
        figure: null,
        options: ['An object reflects light onto the ground.', 'Light passes easily through a clear object.', 'An object gives out darkness.', 'An opaque object blocks light.'],
        answer: 3,
        miscon: { 0: 'shadow-is-reflection', 1: 'transparent-mixup', 2: 'shadow-is-reflection' },
        optionFeedback: {
          0: 'Reflected light makes things bright. A shadow is a dark area. What causes the dark?',
          1: 'If light passes through easily, very little is blocked. A shadow needs light to be blocked.',
          2: 'Objects cannot give out darkness. A shadow is where light cannot reach.' },
        explain: 'A shadow forms when an opaque object blocks light. Light cannot reach the area behind the object, so it is dark.' },
      { id: 'lgt-018', type: 'mcq', level: 2, syl: 'P4', skill: 'shadows',
        stem: 'The Sun is shining on a tree, as shown. Where will the tree\'s shadow be?',
        figure: FIG_SUN_TREE,
        options: ['On the left of the tree, the same side as the Sun', 'On the right of the tree, away from the Sun', 'Up in the sky, between the Sun and the tree', 'Nowhere, as a tree is not a light source'],
        answer: 1,
        miscon: { 0: 'shadow-same-side', 2: 'shadow-is-reflection', 3: 'source-mixup' },
        technique: 'Follow the arrows',
        steps: ['Draw the light travelling in a straight line from the Sun.', 'Where does the tree block it?', 'The shadow is behind the tree, where the light cannot reach.'],
        optionFeedback: {
          0: 'On the Sun\'s side, the ground gets plenty of light. Where can the light not reach?',
          2: 'Shadows form on surfaces such as the ground, behind the object that blocks the light.',
          3: 'Shadows form when an object blocks light. It does not need to give out light itself.' },
        explain: 'Light from the Sun travels in straight lines. The tree blocks it, so the shadow forms on the side of the tree away from the Sun: on the right.' },
      { id: 'lgt-019', type: 'mcq', level: 2, syl: 'P4', skill: 'shadows',
        stem: 'Chong shone a torch on a toy and saw its shadow on a screen. Which change will make the shadow BIGGER?',
        figure: FIG_SHADOW,
        options: ['Move the toy closer to the torch.', 'Move the toy closer to the screen.', 'Move the torch further from the toy.', 'Use a brighter torch at the same place.'],
        answer: 0,
        miscon: { 1: 'shadow-size-wrong-way', 2: 'shadow-size-wrong-way', 3: 'brighter-bigger-shadow' },
        technique: 'Follow the arrows',
        steps: ['Picture the light spreading out from the torch.', 'Near the torch, the toy blocks a wide part of the spreading light.', 'More light blocked means a bigger shadow.'],
        optionFeedback: {
          1: 'Closer to the screen means further from the torch. The toy then blocks less of the light.',
          2: 'A torch further away means the toy blocks less of its light. Which way makes it block more?',
          3: 'A brighter torch makes the lit part brighter, but the toy blocks the same part of the light.' },
        explain: 'The closer the toy is to the torch, the more of the light it blocks, so the bigger its shadow.' },
      { id: 'lgt-020', type: 'mcq', level: 3, syl: 'P4', skill: 'fairtest',
        stem: 'Chong changed the distance of the toy from the torch and measured the height of its shadow. The torch and the screen did not move. What do his results show?',
        figure: stack(FIG_SHADOW, TBL_SHADOW),
        options: ['The shadow is smallest when the toy is 10 cm from the torch.', 'The further the toy is from the torch, the bigger the shadow.', 'The further the toy is from the torch, the smaller the shadow.', 'The shadow is the same size wherever the toy is.'],
        answer: 2,
        miscon: { 0: 'graph-misread', 1: 'shadow-size-wrong-way', 3: 'graph-misread' },
        technique: 'Read, compare, conclude',
        steps: ['Read: what was changed? The distance from the torch.', 'Compare: as the distance goes up, does the height go up or down?', 'Conclude: say the pattern in one sentence.'],
        optionFeedback: {
          0: 'At 10 cm the shadow was 48 cm, the BIGGEST in the table.',
          1: 'Check the table: at 40 cm the shadow is only 12 cm high.',
          3: 'The heights in the table are all different: 48, 24, 16 and 12 cm.' },
        explain: 'As the distance went up from 10 cm to 40 cm, the shadow height went down from 48 cm to 12 cm.' },
      { id: 'lgt-021', type: 'mcq', level: 3, syl: 'P4', skill: 'fairtest',
        stem: 'Using Chong\'s results, predict the height of the shadow when the toy is 15 cm from the torch.',
        figure: TBL_SHADOW,
        options: ['Less than 12 cm', 'Between 12 cm and 16 cm', 'Between 16 cm and 24 cm', 'Between 24 cm and 48 cm'],
        answer: 3,
        miscon: { 0: 'shadow-size-wrong-way', 1: 'graph-misread', 2: 'graph-misread' },
        technique: 'Read, compare, conclude',
        steps: ['Find the two rows on either side of 15 cm.', 'Read their shadow heights.', 'The answer lies between those two heights.'],
        optionFeedback: {
          0: 'The shadow at 40 cm is 12 cm. At 15 cm the toy is much closer, so the shadow is bigger.',
          1: '12 cm and 16 cm are for 30 cm and 40 cm. Find the rows for 10 cm and 20 cm.',
          2: '16 cm and 24 cm are for 20 cm and 30 cm. 15 cm lies between 10 cm and 20 cm.' },
        explain: '15 cm is between 10 cm and 20 cm, so the shadow height is between 24 cm and 48 cm.' },
      { id: 'lgt-022', type: 'mcq', level: 2, syl: 'P4', skill: 'shadows',
        stem: 'Ali shines a torch at a round paper plate. First he holds it with its flat face towards the torch. Then he turns it so that only its edge faces the torch. What shape is the shadow now?',
        figure: null,
        options: ['A circle, the same as before', 'A thin strip', 'A triangle', 'There is no shadow'],
        answer: 1,
        miscon: { 0: 'shadow-shape-fixed', 2: 'shadow-shape-fixed', 3: 'translucent-no-shadow' },
        optionFeedback: {
          0: 'From the torch\'s side, the plate now looks like a thin line. The shadow takes that outline.',
          2: 'Picture the plate from where the torch is. Its edge looks long and thin, not pointed.',
          3: 'The plate still blocks some light, so there is still a shadow. What shape is it?' },
        explain: 'A shadow has the outline of the object as seen from the light source. Edge-on, the plate blocks only a thin strip of light.' },
      { id: 'lgt-023', type: 'mcq', level: 2, syl: 'P4', skill: 'shadows',
        stem: 'Nurul holds a colourful picture book with a printed title between a lamp and a wall. What does its shadow on the wall look like?',
        figure: null,
        options: ['A dark shape showing only the outline of the book', 'A dark shape with the same colours as the cover', 'A dark shape with the title printed inside it', 'A bright patch, brighter than the rest of the wall'],
        answer: 0,
        miscon: { 1: 'shadow-detail', 2: 'shadow-detail', 3: 'shadow-is-reflection' },
        optionFeedback: {
          1: 'Shadows are dark because no light reaches them, so no colours can show.',
          2: 'The book blocks the light as a whole. Only its outline shows.',
          3: 'The shadow is where light is blocked, so it is darker, not brighter.' },
        explain: 'A shadow is a dark area where light is blocked. It shows only the outline, not the colours or words.' },
      { id: 'lgt-024', type: 'mcq', level: 3, syl: 'P4', skill: 'shadows',
        stem: 'Which of these statements about shadows are correct?\nA: A shadow forms on the side of the object away from the light.\nB: Moving an object closer to the light makes its shadow bigger.\nC: A brighter torch at the same place makes a bigger shadow.\nD: A translucent object casts a lighter shadow than an opaque one.',
        figure: null,
        options: ['A and B only', 'A, B and D only', 'B, C and D only', 'A, C and D only'],
        answer: 1,
        miscon: { 0: 'translucent-no-shadow', 2: 'brighter-bigger-shadow', 3: 'shadow-size-wrong-way' },
        technique: 'Tick or cross',
        steps: ['I take one statement at a time.', 'Picture a torch, an object and a screen for each one.', 'Tick it if it is true, cross it if not.', 'I choose the option with only the ticks.'],
        optionFeedback: {
          0: 'A and B are right. Tracing paper lets some light through, so its shadow is lighter: D is true too.',
          2: 'B and D are right, but C is not: brightness does not change the size. And A is true.',
          3: 'A and D are right. C is not: the size depends on distance, not brightness. Check B again.' },
        explain: 'A, B and D are correct. C is not: a brighter torch makes the lit area brighter but the shadow stays the same size.' },
      { id: 'lgt-025', type: 'oeq', level: 2, marks: 2, syl: 'P4', skill: 'shadows', chain: true,
        stem: 'Chong shone a torch at a wooden toy and saw a dark shape on the screen behind it. Explain how this dark shape was formed.',
        figure: null,
        model: 'The toy is opaque, so it blocks the light from the torch. The light cannot reach the part of the screen behind the toy, so that part is dark.',
        keys: [['blocks the light', 'block the light', 'blocks light', 'stops the light', 'does not let light pass'], ['cannot reach', 'does not reach', 'no light reaches', 'does not fall on']],
        watchFor: ['shadow-is-reflection'],
        technique: 'Follow the arrows',
        steps: ['What does the wooden toy do to the light?', 'Which part of the screen gets no light?', 'Link the two in order.'],
        explain: 'In order: the opaque toy blocks the light -> light cannot reach the screen behind it, so a shadow forms.' },
      { id: 'lgt-026', type: 'oeq', level: 3, marks: 3, syl: 'P4', skill: 'shadows', chain: true,
        stem: 'Chong moved the toy from 30 cm to 10 cm away from the torch. The screen did not move. What happened to the size of the shadow? Explain why.',
        figure: FIG_SHADOW,
        model: 'The shadow became bigger. Closer to the torch, the toy blocks more of the light spreading out from the torch. So a larger area of the screen gets no light.',
        keys: [['bigger', 'larger shadow'], ['blocks more', 'more of the light', 'more light is blocked'], ['larger area', 'bigger area', 'more of the screen']],
        watchFor: ['shadow-size-wrong-way'],
        technique: 'Follow the arrows',
        steps: ['Say what happened to the size.', 'Close to the torch: does the toy block more or less light?', 'So how much of the screen gets no light?'],
        explain: 'One mark for "bigger". Then in order: the toy blocks more of the light -> a larger area of the screen gets no light.' },
      { id: 'lgt-027', type: 'oeq', level: 3, marks: 5, syl: 'P4', skill: 'fairtest',
        stem: 'Chong did an experiment with a torch, a toy and a screen. His results are shown.\n(a) Which variable did he change? (1 mark)\n(b) Which variable did he measure? (1 mark)\n(c) Name one variable he must keep the same. (1 mark)\n(d) Describe the relationship between the two variables in (a) and (b). (2 marks)',
        figure: stack(FIG_SHADOW, TBL_SHADOW),
        model: '(a) The distance of the toy from the torch. (b) The height of the shadow. (c) The same toy. (d) As the distance of the toy from the torch increases, the height of the shadow decreases.',
        keys: [['distance of the toy from the torch', 'distance from the torch', 'distance'], ['height of the shadow', 'size of the shadow', 'shadow height'], ['same toy', 'same torch', 'same screen', 'same position of the screen', 'same distance between the torch and the screen', 'screen not moved'], ['distance of the toy from the torch increases', 'further', 'distance increases'], ['height of the shadow decreases', 'smaller', 'decreases', 'shorter']],
        watchFor: ['changed-measured-mixup', 'shadow-size-wrong-way'],
        technique: 'Change one thing',
        steps: ['(a) Look at the first column: what did he change on purpose?', '(b) Look at the second column: what did he measure?', '(c) What else could change the shadow? Keep it the same.', '(d) As one goes up, what does the other do?'],
        explain: '(a) distance of the toy from the torch; (b) height of the shadow; (c) any one: same toy, same torch, same screen position; (d) one mark for "as the distance increases", one mark for "the shadow height decreases".' },

      // ----- Transparent, translucent, opaque -----
      { id: 'lgt-028', type: 'mcq', level: 1, syl: 'P4', skill: 'materials',
        stem: 'Which of these allows the most light to pass through?',
        figure: null,
        options: ['Frosted glass', 'Cardboard', 'Clear glass', 'Aluminium foil'],
        answer: 2,
        miscon: { 0: 'transparent-mixup', 1: 'transparent-mixup', 3: 'transparent-mixup' },
        optionFeedback: {
          0: 'Frosted glass lets some light through, but you cannot see clearly through it.',
          1: 'Cardboard is opaque: it lets no light through.',
          3: 'Foil is shiny, but it is opaque. It reflects light rather than letting it through.' },
        explain: 'Clear glass is transparent: it allows most light to pass through.' },
      { id: 'lgt-029', type: 'mcq', level: 2, syl: 'P4', skill: 'materials',
        stem: 'Hui Min shone a torch through sheets of four materials, P, Q, R and S, onto a light sensor. Which material is opaque?',
        figure: stack(FIG_SENSOR, TBL_SENSOR),
        options: ['P', 'Q', 'R', 'S'],
        answer: 1,
        miscon: { 0: 'transparent-mixup', 2: 'transparent-mixup', 3: 'transparent-mixup' },
        technique: 'Read, compare, conclude',
        steps: ['Read: what does a high reading mean? More light got through.', 'Compare: which reading shows NO light got through?', 'Conclude: no light through means opaque.'],
        optionFeedback: {
          0: 'P let 480 units through, almost as much as no sheet. That is transparent.',
          2: 'R let some light through (210 units). That is translucent.',
          3: 'S let only a little light through (60 units), but still some. Opaque lets none through.' },
        explain: 'Q gave a reading of 0, so no light passed through it. Q is opaque.' },
      { id: 'lgt-030', type: 'mcq', level: 3, syl: 'P4', skill: 'materials',
        stem: 'Using Hui Min\'s results, arrange the materials from the one that allows the MOST light through to the one that allows the LEAST.',
        figure: TBL_SENSOR,
        options: ['Q, S, R, P', 'P, S, R, Q', 'R, P, S, Q', 'P, R, S, Q'],
        answer: 3,
        miscon: { 0: 'graph-misread', 1: 'graph-misread', 2: 'graph-misread' },
        technique: 'Read, compare, conclude',
        steps: ['Read the four readings.', 'The highest reading lets the most light through.', 'Order them from highest to lowest.'],
        optionFeedback: {
          0: 'That is from least to most. The question asks for the most first.',
          1: 'P is first, but S (60) lets less light through than R (210).',
          2: 'R is 210, but P is 480. Which is bigger?' },
        explain: 'Readings from highest to lowest: P (480), R (210), S (60), Q (0).' },
      { id: 'lgt-031', type: 'mcq', level: 2, syl: 'P4', skill: 'materials',
        stem: 'Wei Ling holds a sheet of tracing paper between a torch and a wall. What does she see on the wall?',
        figure: null,
        options: ['No shadow at all', 'A shadow as dark as one made by cardboard', 'A lighter shadow', 'A shadow brighter than the wall around it'],
        answer: 2,
        miscon: { 0: 'translucent-no-shadow', 1: 'translucent-no-shadow', 3: 'shadow-is-reflection' },
        optionFeedback: {
          0: 'Tracing paper blocks some of the light, so there is some shadow.',
          1: 'Cardboard blocks all the light. Tracing paper lets some through.',
          3: 'Less light reaches that part of the wall, so it is darker, not brighter.' },
        explain: 'Tracing paper is translucent. It lets some light through and blocks some, so it casts a lighter shadow.' },
      { id: 'lgt-032', type: 'mcq', level: 2, syl: 'P4', skill: 'materials',
        stem: 'Which of these materials are translucent?\nA: frosted glass\nB: tracing paper\nC: clear plastic file\nD: wooden door',
        figure: null,
        options: ['A and B only', 'A and C only', 'A, B and C only', 'B and D only'],
        answer: 0,
        miscon: { 1: 'transparent-mixup', 2: 'transparent-mixup', 3: 'transparent-mixup' },
        technique: 'Tick or cross',
        steps: ['I take one material at a time.', 'Does it let SOME light through, but I cannot see clearly through it?', 'Tick if yes. Cross if it lets most light through, or none.', 'I choose the option with only the ticks.'],
        optionFeedback: {
          1: 'A is right, but you can see clearly through a clear plastic file: it is transparent. Check B.',
          2: 'A and B are right. A clear plastic file is transparent, not translucent.',
          3: 'B is right, but a wooden door lets no light through: it is opaque.' },
        explain: 'Frosted glass and tracing paper let some light through but we cannot see clearly through them: translucent. Clear plastic is transparent; wood is opaque.' },
      { id: 'lgt-033', type: 'oeq', level: 3, marks: 3, syl: 'P4', skill: 'materials',
        stem: 'Mrs Tan wants a new sheet for her bathroom window. She wants the bathroom to stay bright in the day, and she wants privacy. Should she choose a transparent, translucent or opaque sheet? Explain your choice.',
        figure: null,
        model: 'A translucent sheet. It allows some light to pass through, so the bathroom stays bright. People outside cannot see clearly through it, so she has privacy.',
        keys: [['translucent'], ['allows some light to pass through', 'lets some light through', 'some light passes through', 'some light'], ['cannot see clearly', 'not see clearly', 'cannot see through clearly', 'blurred']],
        watchFor: ['transparent-mixup'],
        technique: 'Claim, evidence, reason',
        steps: ['Claim: name the type of sheet.', 'Reason 1: how does it keep the room bright?', 'Reason 2: how does it give privacy?'],
        explain: 'One mark for "translucent". One mark for letting some light through (bright). One mark for people not being able to see clearly through it (privacy).' },
      { id: 'lgt-034', type: 'oeq', level: 3, marks: 5, syl: 'P4', skill: 'fairtest',
        stem: 'Hui Min shone a torch through sheets of four materials, P, Q, R and S, onto a light sensor.\n(a) Which material is opaque? (1 mark)\n(b) Explain your answer using her results. (2 marks)\n(c) She kept the distance between the torch and the light sensor the same each time. Explain why. (2 marks)',
        figure: stack(FIG_SENSOR, TBL_SENSOR),
        model: '(a) Material Q. (b) The reading for Q was 0, so no light passed through it. (c) The distance also changes the amount of light reaching the sensor. Keeping it the same means only the material is changed, so it is a fair test.',
        keys: [['material Q', 'Q'], ['reading for Q was 0', '0', 'zero'], ['no light passed through', 'no light', 'did not let any light'], ['amount of light reaching the sensor', 'light reaching the sensor', 'reading would change', 'brighter'], ['only the material', 'fair test', 'fair']],
        watchFor: ['transparent-mixup', 'changed-measured-mixup'],
        technique: 'Claim, evidence, reason',
        steps: ['Claim: which material?', 'Evidence: quote its reading from the table.', 'Reason: what does that reading mean about light?', 'For (c): what else could change the reading if it was not kept the same?'],
        explain: '(a) Q. (b) Reading of 0 (1) + no light passed through (1). (c) The distance also affects how much light reaches the sensor (1) + so only the material changes and the test is fair (1).' },

      // ----- Reflecting light -----
      { id: 'lgt-035', type: 'mcq', level: 1, syl: 'P4', skill: 'reflect',
        stem: 'Which of these reflects the most light?',
        figure: null,
        options: ['A black cloth', 'A wooden block', 'A sheet of brown paper', 'A mirror'],
        answer: 3,
        miscon: { 0: 'rough-reflects-more', 1: 'rough-reflects-more', 2: 'rough-reflects-more' },
        optionFeedback: {
          0: 'Black, dull cloth reflects very little light. Look for a smooth, shiny surface.',
          1: 'Wood reflects some light, but it is dull. Which choice is smooth and shiny?',
          2: 'Brown paper is dull and a little rough. Which choice is the shiniest?' },
        explain: 'A mirror is smooth and shiny, so it reflects the most light.' },
      { id: 'lgt-036', type: 'mcq', level: 2, syl: 'P4', skill: 'reflect',
        stem: 'Rahim shone the same torch on four surfaces and used a light sensor to measure the light each one reflected. Which statement do his results support?',
        figure: TBL_SURFACES,
        options: ['Smooth, shiny surfaces reflect the most light.', 'Black velvet cloth reflects no light at all.', 'Rough surfaces reflect more light than shiny ones.', 'White paper reflects more light than the metal tray.'],
        answer: 0,
        miscon: { 1: 'only-mirrors-reflect', 2: 'rough-reflects-more', 3: 'graph-misread' },
        technique: 'Read, compare, conclude',
        steps: ['Read each surface and its reading.', 'Compare: which is highest, which is lowest?', 'Conclude: which kind of surface reflects most?'],
        optionFeedback: {
          1: 'The velvet reading is low, but it is 20, not 0. It still reflects a little.',
          2: 'The rough brown card gave 90 and the shiny tray 410. Which is more?',
          3: 'White paper gave 260 and the metal tray 410. Check which is bigger.' },
        explain: 'The shiny metal tray reflected the most (410 units). Black velvet reflected the least (20 units), but still some.' },
      { id: 'lgt-037', type: 'mcq', level: 2, syl: 'P4', skill: 'reflect',
        stem: 'A car has a rear-view mirror. How does it let the driver see the cars behind?',
        figure: null,
        options: ['The mirror gives out light towards the driver.', 'Light from the driver\'s eyes travels to the cars behind.', 'Light from behind passes straight through the mirror.', 'Light from the cars behind is reflected by the mirror into the driver\'s eyes.'],
        answer: 3,
        miscon: { 0: 'reflector-is-source', 1: 'eyes-give-light', 2: 'mirror-passes-light' },
        optionFeedback: {
          0: 'A mirror is not a light source. It only reflects light that falls on it.',
          1: 'Eyes do not send out light. Light must travel INTO the driver\'s eyes.',
          2: 'A mirror has a shiny coating at the back. Light bounces off it rather than going through.' },
        explain: 'Light from the cars behind falls on the mirror. The mirror reflects it into the driver\'s eyes.' },
      { id: 'lgt-038', type: 'mcq', level: 3, syl: 'P4', skill: 'reflect',
        stem: 'Wei Jie uses a periscope to see a ship on the other side of a wall. In which order does the light travel?',
        figure: FIG_PERISCOPE,
        options: ['eye → bottom mirror → top mirror → ship', 'ship → bottom mirror → top mirror → eye', 'ship → top mirror → bottom mirror → eye', 'top mirror → ship → eye'],
        answer: 2,
        miscon: { 0: 'eyes-give-light', 1: 'light-path-wrong', 3: 'light-path-wrong' },
        technique: 'Follow the arrows',
        steps: ['Light starts at the ship and must end in the eye.', 'Which mirror does the ship\'s light reach first?', 'Where does that mirror send it?'],
        optionFeedback: {
          0: 'This starts at the eye. Light starts at the ship and ends in the eye.',
          1: 'Look at the picture: the ship is level with the TOP mirror.',
          3: 'Light from the ship has to reach a mirror first. The mirrors do not give out light.' },
        explain: 'Light from the ship travels to the top mirror, which reflects it down to the bottom mirror, which reflects it into the eye.' },
      { id: 'lgt-039', type: 'oeq', level: 2, marks: 2, syl: 'P4', skill: 'reflect', chain: true,
        stem: 'Road workers wear vests with shiny strips at night. Explain how the shiny strips help drivers to see the workers.',
        figure: null,
        model: 'The shiny strips reflect a lot of light from the car headlights. More light enters the drivers\' eyes, so the drivers can see the workers easily.',
        keys: [['reflect a lot of light', 'reflect more light', 'reflects a lot of light', 'reflect much light', 'reflect light'], ['enters the drivers\' eyes', 'into the drivers\' eyes', 'reaches the drivers\' eyes', 'enters their eyes']],
        watchFor: ['reflector-is-source'],
        technique: 'Follow the arrows',
        steps: ['Where does the light start? At the car headlights.', 'What do the shiny strips do to it?', 'Where does that light go?'],
        explain: 'In order: the shiny strips reflect a lot of light from the headlights -> more light enters the drivers\' eyes.' },
      { id: 'lgt-040', type: 'oeq', level: 3, marks: 3, syl: 'P4', skill: 'reflect', chain: true,
        stem: 'Explain how Wei Jie is able to see the ship on the other side of the wall using his periscope.',
        figure: FIG_PERISCOPE,
        model: 'Light from the ship travels in a straight line to the top mirror. The top mirror reflects the light down to the bottom mirror. The bottom mirror reflects the light into his eyes.',
        keys: [['to the top mirror', 'reaches the top mirror', 'onto the top mirror'], ['reflects the light down', 'reflected down', 'down to the bottom mirror', 'reflected to the bottom mirror', 'reflects it to the bottom mirror', 'reflects the light to the bottom mirror'], ['into his eyes', 'enters his eyes', 'reaches his eyes']],
        watchFor: ['light-path-wrong', 'eyes-give-light'],
        technique: 'Follow the arrows',
        steps: ['Start at the ship. Where does its light go first?', 'What does the top mirror do with the light?', 'What does the bottom mirror do with it?'],
        explain: 'In order: light from the ship reaches the top mirror -> it is reflected down to the bottom mirror -> it is reflected into his eyes.' },
      { id: 'lgt-041', type: 'oeq', level: 1, marks: 2, syl: 'P4', skill: 'sources',
        stem: 'Name one light source you might see outdoors at night, and one object that looks bright at night but is NOT a light source.',
        figure: null,
        model: 'Light source: a street lamp. Not a light source: the Moon.',
        keys: [['street lamp', 'lamp', 'torch', 'stars', 'firefly', 'car headlights', 'lightning', 'candle', 'lantern', 'fire'], ['Moon', 'mirror', 'shiny strip', 'road sign', 'puddle', "cat's eyes", 'reflector', 'reflective vest', 'planet', 'window', 'car side mirror']],
        watchFor: ['reflector-is-source'],
        technique: 'Tick or cross',
        steps: ['List bright things you might see at night.', 'Tick the ones that give out their own light.', 'Cross the ones that only reflect light.', 'Write one of each.'],
        explain: 'One mark for any light source (street lamp, torch, stars, firefly, headlights). One mark for any object that only reflects light (the Moon, a planet, a mirror or car side mirror, a window, a shiny road sign, cat\'s eyes or another reflector, a reflective vest, a puddle).' },
      { id: 'lgt-042', type: 'oeq', level: 3, marks: 4, syl: 'P4', skill: 'shadows',
        stem: 'Lina shone a torch at a cardboard cut-out of a cat, so that its shadow fell on a screen.\n(a) She moved the cut-out closer to the screen. What happened to the size of the shadow? (1 mark)\n(b) Explain your answer to (a). (1 mark)\n(c) She then used a tracing-paper cut-out of the same shape in the same place. How was this shadow different? (1 mark)\n(d) Explain your answer to (c). (1 mark)',
        figure: FIG_SHADOW,
        model: '(a) The shadow became smaller. (b) The cut-out was further from the torch, so it blocked less of the light. (c) The shadow was lighter. (d) Tracing paper is translucent, so it allows some light to pass through.',
        keys: [['smaller'], ['blocked less', 'less of the light', 'less light is blocked', 'further from the torch'], ['lighter', 'fainter', 'less dark'], ['allows some light', 'some light', 'translucent']],
        watchFor: ['shadow-size-wrong-way', 'translucent-no-shadow'],
        technique: 'Claim, evidence, reason',
        steps: ['(a) Closer to the screen means further from what?', '(b) Does it then block more or less of the light?', '(c) Does tracing paper block all of the light?', '(d) Name the kind of material and what it lets through.'],
        explain: '(a) smaller (1). (b) further from the torch, so it blocks less light (1). (c) lighter or fainter shadow (1). (d) translucent, lets some light through (1).' }
    ]
  });
})();
