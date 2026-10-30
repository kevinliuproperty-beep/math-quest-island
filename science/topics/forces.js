"use strict";
// Science Quest — topic: Forces (P6, Interactions). Data only; the helpers below just build SVG/HTML strings.
// Scope per MOE Primary Science Syllabus 2023, theme Interactions, "Interaction of Forces
// (Frictional force, gravitational force, force in springs)" (P5-P6 block, examined at PSLE 0009
// from 2026). Sources checked 2026-10-28 (school briefings that quote or summarise the 2023 syllabus):
//   - Shuqun Pri, PSLE Briefing 2025 Science: "Interaction of forces (Magnets, Frictional force,
//     gravitational force, force in springs)"  https://shuqunpri.moe.edu.sg/files/PSLE_Briefing_2025_Science.pdf
//   - Shuqun Pri, P6 (Foundation) Science Handbook: "Identify a force as a push or a pull. State the
//     effects of a force"; frictional, gravitational and elastic spring forces
//     https://www.shuqunpri.moe.edu.sg/files/P6_Science_Handbook_2025.pdf
//   - Kheng Cheng Pri, Parents' Briefing Primary 6 Science: "Investigate the effect of friction on the
//     motion of objects. Investigate the effects of elastic spring force."
//     https://khengcheng.moe.edu.sg/files/Parents/Parents__Briefing___Primary_6_Science.pdf
//   - Admiralty Pri, P6 Science Lesson Focus: "objects have weight because of the gravitational force
//     acting on the object"  https://www.admiraltypri.moe.edu.sg/files/Level%20Matters/Content/P6_Science_Lesson_Focus.pdf
//   (The MOE PDF itself, moe.gov.sg 2023-primary-science.pdf, did not load on the day.)
// In scope here: a force is a push or a pull; a force can move a still object, speed it up, slow it
//   down or stop it, change its direction, change its shape; friction opposes motion between surfaces
//   in contact, can act on a still object, produces heat, wears surfaces; rougher surface = more
//   friction; useful / not useful; ways to increase or reduce friction; gravitational force pulls
//   objects towards the Earth without contact, acts on still and moving objects; weight; a stretched
//   or compressed spring exerts an elastic spring force opposite to the stretch or squash; extension
//   = stretched length - original length; extension increases with load (fair-test experiments).
// Deliberately LEFT OUT (uncertain at P6 level): measuring force in newtons, spring balances, air
//   resistance, water resistance, elastic limit, gravity on the Moon or in space. Magnetic force is P3
//   (magnets.js) and appears only as a named distractor.
(function () {
  const INK = '#1f2937', LINE = '#475569', WOOD = '#d6b88a', WOODD = '#7c5a2c', BLUE = '#2563eb';

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

  // Vertical zig-zag spring from (x, y1) down to (x, y2).
  const springV = (x, y1, y2, n = 10, w = 14) => {
    const seg = (y2 - y1) / (n * 2 + 2);
    let d = `M${x} ${y1} L${x} ${y1 + seg}`;
    for (let i = 0; i < n * 2; i++) d += ` L${x + (i % 2 ? -w : w)} ${(y1 + seg * (i + 1.5)).toFixed(1)}`;
    d += ` L${x} ${y2 - seg} L${x} ${y2}`;
    return `<path d="${d}" fill="none" stroke="${LINE}" stroke-width="2.5" stroke-linejoin="round"/>`;
  };

  // Horizontal zig-zag spring from (x1, y) to (x2, y).
  const springH = (x1, x2, y, n = 8, h = 12) => {
    const seg = (x2 - x1) / (n * 2 + 2);
    let d = `M${x1} ${y} L${x1 + seg} ${y}`;
    for (let i = 0; i < n * 2; i++) d += ` L${(x1 + seg * (i + 1.5)).toFixed(1)} ${y + (i % 2 ? -h : h)}`;
    d += ` L${x2 - seg} ${y} L${x2} ${y}`;
    return `<path d="${d}" fill="none" stroke="${LINE}" stroke-width="2.5" stroke-linejoin="round"/>`;
  };

  const TH = 'border:1px solid #94a3b8;padding:6px 10px;background:#e2e8f0;color:#111827';
  const TD = 'border:1px solid #94a3b8;padding:6px 10px;text-align:center';
  const table = (head, rows, caption) =>
    `<table style="border-collapse:collapse;margin:0 auto;font-size:15px">` +
    (caption ? `<caption style="padding:4px 0 6px;font-weight:600">${caption}</caption>` : '') +
    `<thead><tr>${head.map((h) => `<th style="${TH}">${h}</th>`).join('')}</tr></thead>` +
    `<tbody>${rows.map((r) => `<tr>${r.map((c) => `<td style="${TD}">${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;

  // Figure with a picture on top and a table below.
  const stack = (a, b) => `<div>${a}<div style="height:10px"></div>${b}</div>`;

  // Line graph. pts: [[x, y], ...]; axes from 0 to xmax / ymax.
  const graph = (pts, xmax, xstep, ymax, ystep, xLabel, yLabel, label) => {
    const w = 360, h = 270, x0 = 62, y0 = 210, x1 = 340, top = 24;
    const X = (v) => x0 + (v / xmax) * (x1 - x0), Y = (v) => y0 - (v / ymax) * (y0 - top);
    let s = '';
    for (let v = 0; v <= ymax; v += ystep) s += `<line x1="${x0}" y1="${Y(v)}" x2="${x1}" y2="${Y(v)}" stroke="#e5e7eb"/>` + txt(x0 - 8, Y(v), v, { anchor: 'end', size: 13 });
    for (let v = 0; v <= xmax; v += xstep) s += `<line x1="${X(v)}" y1="${top}" x2="${X(v)}" y2="${y0}" stroke="#e5e7eb"/>` + txt(X(v), y0 + 15, v, { size: 13 });
    s += `<line x1="${x0}" y1="${top - 4}" x2="${x0}" y2="${y0}" stroke="${INK}" stroke-width="2"/><line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y0}" stroke="${INK}" stroke-width="2"/>`;
    s += `<polyline points="${pts.map(([a, b]) => `${X(a)},${Y(b)}`).join(' ')}" fill="none" stroke="${BLUE}" stroke-width="2.5"/>`;
    pts.forEach(([a, b]) => { s += `<circle cx="${X(a)}" cy="${Y(b)}" r="4" fill="${BLUE}"/>`; });
    s += txt((x0 + x1) / 2, y0 + 40, xLabel, { size: 13 });
    s += `<text x="18" y="${(top + y0) / 2}" font-family="Arial, Helvetica, sans-serif" font-size="13" fill="${INK}" text-anchor="middle" transform="rotate(-90 18 ${(top + y0) / 2})">${yLabel}</text>`;
    return svg(w, h, label, s);
  };

  // ---------- Figures ----------
  // A ramp with a toy car at the top; the car rolls onto the surface being tested.
  const FIG_RAMP = (() => {
    let s = `<polygon points="20,60 20,150 150,150" fill="${WOOD}" stroke="${WOODD}" stroke-width="1.5"/>`;
    s += `<rect x="150" y="146" width="200" height="10" fill="#a3a3a3" stroke="#525252"/>`;
    s += txt(250, 172, 'surface being tested', { size: 13 });
    // toy car on the slope
    s += `<g transform="rotate(34.7 46 66)"><rect x="34" y="52" width="38" height="16" rx="4" fill="#fde047" stroke="${INK}"/>` +
      `<circle cx="42" cy="70" r="5" fill="#374151"/><circle cx="64" cy="70" r="5" fill="#374151"/></g>`;
    s += txt(70, 34, 'toy car let go here', { size: 13, anchor: 'start' });
    s += `<line x1="68" y1="40" x2="56" y2="56" stroke="${LINE}"/>`;
    s += txt(86, 132, 'ramp', { size: 13 });
    s += arrow(150, 110, 340, 110, { width: 2, dash: 1 }) + `<line x1="150" y1="100" x2="150" y2="120" stroke="${INK}"/>`;
    s += txt(250, 94, 'distance travelled', { size: 13 });
    return svg(360, 190, 'A toy car let go at the top of a ramp rolls onto the surface being tested', s);
  })();

  const TBL_RAMP = table(['Surface', 'Distance the car travelled (cm)'], [['P', '85'], ['Q', '40'], ['R', '120'], ['S', '60']], 'Results');

  // A block on a table pulled by a string over a pulley to a hanger of masses.
  const FIG_PULLEY = (() => {
    let s = `<rect x="20" y="90" width="260" height="14" fill="${WOOD}" stroke="${WOODD}"/>`;
    s += `<rect x="20" y="86" width="160" height="4" fill="#9ca3af"/>` + txt(100, 122, 'surface material on table', { size: 13 });
    s += `<rect x="70" y="56" width="60" height="30" fill="#93c5fd" stroke="${INK}"/>` + txt(100, 71, 'block', { size: 13 });
    s += `<line x1="130" y1="71" x2="284" y2="71" stroke="${INK}" stroke-width="1.5"/>`;
    s += `<circle cx="290" cy="80" r="10" fill="#e5e7eb" stroke="${INK}" stroke-width="1.5"/>` + txt(316, 62, 'pulley', { size: 13 });
    s += `<line x1="300" y1="80" x2="300" y2="140" stroke="${INK}" stroke-width="1.5"/>`;
    s += `<rect x="288" y="140" width="24" height="12" fill="#6b7280" stroke="${INK}"/><rect x="288" y="152" width="24" height="12" fill="#6b7280" stroke="${INK}"/>`;
    s += txt(270, 176, 'masses added one at a time', { size: 13, anchor: 'end' });
    return svg(360, 196, 'A block on a surface pulled by a string over a pulley to a hanger of masses', s);
  })();

  const TBL_PULLEY = table(['Surface material', 'Number of masses needed to start the block moving'], [['Glass', '2'], ['Wood', '4'], ['Sandpaper', '9']], 'Results');

  // A box sliding to the right, with four labelled arrows.
  const FIG_BOX_ARROWS = (() => {
    let s = `<line x1="20" y1="150" x2="340" y2="150" stroke="${LINE}" stroke-width="2"/>`;
    s += `<rect x="140" y="90" width="80" height="60" fill="${WOOD}" stroke="${WOODD}" stroke-width="1.5"/>` + txt(180, 120, 'box', { size: 14 });
    s += arrow(30, 30, 110, 30, { width: 2, dash: 1, colour: LINE }) + txt(120, 30, 'the box is sliding this way', { size: 13, anchor: 'start' });
    s += arrow(224, 120, 290, 120) + txt(302, 120, 'A', { bold: 1, size: 17 });
    s += arrow(136, 120, 70, 120) + txt(58, 120, 'B', { bold: 1, size: 17 });
    s += arrow(180, 86, 180, 52) + txt(198, 58, 'C', { bold: 1, size: 17 });
    s += arrow(250, 150, 250, 182) + txt(266, 176, 'D', { bold: 1, size: 17 });
    return svg(360, 196, 'A box sliding to the right with arrows A right, B left, C up and D down', s);
  })();

  // A box resting still on a sloping plank.
  const FIG_PLANK = (() => {
    let s = `<polygon points="30,160 330,160 330,80" fill="none"/>`;
    s += `<line x1="30" y1="162" x2="340" y2="162" stroke="${LINE}" stroke-width="2"/>`;
    s += `<polygon points="30,158 330,98 330,108 30,168" fill="${WOOD}" stroke="${WOODD}"/>`;
    s += `<rect x="300" y="108" width="14" height="54" fill="#9ca3af" stroke="${INK}"/>` + txt(307, 178, 'brick', { size: 13 });
    s += `<g transform="rotate(-11.3 190 126)"><rect x="160" y="96" width="60" height="34" fill="#93c5fd" stroke="${INK}"/></g>`;
    s += txt(190, 70, 'box (not moving)', { size: 13 }) + `<line x1="190" y1="78" x2="190" y2="96" stroke="${LINE}"/>`;
    s += txt(90, 130, 'plank', { size: 13 });
    return svg(360, 192, 'A box resting without moving on a sloping plank', s);
  })();

  // Extension-load line graph for one spring.
  const GRAPH_SPRING = graph([[0, 0], [100, 2], [200, 4], [300, 6], [400, 8]], 400, 100, 8, 2,
    'Load (g)', 'Extension (cm)', 'Line graph: extension of a spring against load, a straight line from 0 g, 0 cm to 400 g, 8 cm');

  const TBL_SPRING_10 = table(['Load (g)', 'Length of spring (cm)'], [['0', '10'], ['50', '12'], ['100', '14'], ['150', '16']], 'Results');

  // Spring hanging from a stand beside a ruler, with a load.
  const FIG_SPRING_RULER = (() => {
    let s = `<rect x="40" y="20" width="10" height="210" fill="#9ca3af" stroke="${INK}"/><rect x="20" y="228" width="130" height="10" fill="#9ca3af" stroke="${INK}"/>`;
    s += `<rect x="40" y="20" width="110" height="8" fill="#9ca3af" stroke="${INK}"/>` + txt(95, 14, 'stand', { size: 13 });
    // 6.5 px per cm; the spring's top is level with 0 cm and, with the 100 g load, its bottom is at 18 cm.
    const cm = 6.5, y0 = 28, yb = y0 + 18 * cm;
    s += springV(120, y0, yb, 9, 12);
    s += `<rect x="106" y="${yb}" width="28" height="26" fill="#6b7280" stroke="${INK}"/>` + txt(120, yb + 42, '100 g', { size: 13 }) + txt(120, yb + 58, 'load', { size: 13 });
    s += `<line x1="120" y1="${yb}" x2="190" y2="${yb}" stroke="${LINE}" stroke-dasharray="4 3"/>`;
    s += `<rect x="190" y="24" width="34" height="${30 * cm + 8}" fill="#fde68a" stroke="#92400e"/>`;
    for (let c = 0; c <= 30; c++) {
      const y = y0 + c * cm;
      s += `<line x1="190" y1="${y}" x2="${c % 5 ? 197 : 206}" y2="${y}" stroke="#92400e"/>`;
      if (c % 5 === 0) s += txt(212, y, c, { size: 13, anchor: 'start' });
    }
    s += txt(244, 124, 'ruler', { size: 13, anchor: 'start' }) + txt(244, 142, '(cm)', { size: 13, anchor: 'start' });
    return svg(320, 250, 'A spring hanging from a stand beside a ruler marked 0 to 30 cm; with a 100 g load its bottom is level with 18 cm', s);
  })();

  const TBL_SPRING_15 = table(['Load (g)', 'Length of spring (cm)'], [['0', '15'], ['100', '18'], ['200', '21'], ['300', '24']], 'Results');

  const TBL_TWO_SPRINGS = table(['Load (g)', 'Extension of spring A (cm)', 'Extension of spring B (cm)'],
    [['0', '0', '0'], ['100', '3', '1'], ['200', '6', '2'], ['300', '9', '3']], 'Results');

  // Toy launcher: a tube with a compressed spring and a ball.
  const FIG_LAUNCHER = (() => {
    let s = `<rect x="30" y="60" width="230" height="50" fill="#f1f5f9" stroke="${INK}" stroke-width="2"/>`;
    s += `<rect x="30" y="60" width="10" height="50" fill="#9ca3af" stroke="${INK}"/>`;
    s += springH(40, 120, 85, 7, 14);
    s += `<rect x="120" y="68" width="10" height="34" fill="#475569"/>`;
    s += `<circle cx="150" cy="85" r="18" fill="#f87171" stroke="${INK}"/>` + txt(150, 134, 'ball', { size: 13 });
    s += txt(80, 134, 'squashed spring', { size: 13 });
    s += `<line x1="80" y1="124" x2="80" y2="100" stroke="${LINE}"/>`;
    s += arrow(270, 85, 340, 85, { width: 2, dash: 1 }) + txt(300, 64, 'open end', { size: 13 });
    return svg(360, 156, 'A toy launcher: a tube with a squashed spring behind a ball', s);
  })();

  // A board raised at one end until a block starts to slide.
  const FIG_TILT = (() => {
    let s = `<line x1="20" y1="180" x2="340" y2="180" stroke="${LINE}" stroke-width="2"/>`;
    s += `<polygon points="30,178 290,110 292,118 32,186" fill="${WOOD}" stroke="${WOODD}"/>` + txt(120, 140, 'board', { size: 13 });
    s += `<g transform="rotate(-14.7 200 128)"><rect x="176" y="112" width="50" height="22" fill="#93c5fd" stroke="${INK}"/><rect x="176" y="134" width="50" height="5" fill="#374151"/></g>`;
    s += txt(196, 76, 'block with sole material', { size: 13 }) + `<line x1="196" y1="86" x2="198" y2="114" stroke="${LINE}"/>`;
    s += `<line x1="310" y1="114" x2="310" y2="178" stroke="${INK}" stroke-width="1.5"/>` +
      `<polygon points="310,110 305,120 315,120" fill="${INK}"/><polygon points="310,180 305,170 315,170" fill="${INK}"/>`;
    s += txt(318, 140, 'height', { size: 13, anchor: 'start' });
    s += arrow(286, 102, 286, 62, { width: 2 }) + txt(262, 46, 'end raised slowly', { size: 13 });
    return svg(370, 200, 'A board raised slowly at one end with a block resting on it; the height of the raised end is measured', s);
  })();

  const TBL_TILT = table(['Sole material', 'Height of raised end when the block started to slide (cm)'], [['P', '12'], ['Q', '25'], ['R', '18']], 'Results');

  // A ball let go at the top of a slope rolls onto a carpet.
  const FIG_SLOPE_CARPET = (() => {
    let s = `<polygon points="20,50 20,150 140,150" fill="${WOOD}" stroke="${WOODD}"/>`;
    s += `<circle cx="34" cy="50" r="11" fill="#f87171" stroke="${INK}"/>` + txt(54, 34, 'ball let go here', { size: 13, anchor: 'start' });
    s += txt(60, 136, 'slope', { size: 13 });
    s += `<rect x="140" y="146" width="200" height="10" fill="#a78bfa" stroke="#5b21b6"/>` + txt(240, 174, 'rough carpet', { size: 13 });
    s += `<circle cx="290" cy="135" r="11" fill="#fca5a5" stroke="${INK}" stroke-dasharray="3 3"/>` + txt(290, 108, 'stops here', { size: 13 });
    return svg(360, 190, 'A ball let go at the top of a slope rolls down onto a rough carpet and stops', s);
  })();

  SCI.registerTopic({
    id: 'forces',
    title: 'Forces',
    emoji: '🏋️',
    theme: 'Interactions',
    level: 'P6',
    moeRef: 'Interaction of Forces (Frictional force, gravitational force, force in springs) (P6), MOE Primary Science Syllabus 2023: identify a force as a push or a pull; recognise the effects of a force (move a stationary object, speed up, slow down or stop a moving object, change its direction, change its shape); investigate the effect of friction on the motion of objects; recognise that objects have weight because of the gravitational force acting on them; investigate the effects of elastic spring force.',
    skills: {
      effects: 'What forces do',
      friction: 'Frictional force',
      gravity: 'Gravitational force',
      spring: 'Elastic spring force',
      fairtest: 'Fair tests and results'
    },
    misconceptions: {
      'force-is-motion': 'A force is the same thing as movement, speed or energy.',
      'force-is-mass': 'A force such as weight is just the amount of matter in an object or the space it takes up.',
      'force-only-moves': 'A force can only start something moving; it cannot stop it, turn it or change its shape.',
      'effects-mixup': 'Mixing up the effects of a force, such as calling a start-to-move a change of shape.',
      'shape-change-permanent': 'A change of shape only counts if the object stays in its new shape.',
      'forces-mixup': 'Mixing up friction, gravity and spring force, such as thinking friction pulls things down.',
      'friction-no-contact': 'Friction can act between two objects that are not touching.',
      'friction-only-moving': 'Friction acts only on objects that are already moving.',
      'friction-same-direction': 'Friction on a sliding object acts in the same direction as the object moves.',
      'friction-only-bad': 'Friction is never useful; we always want less of it.',
      'friction-no-heat': 'Rubbing two surfaces together does not produce heat.',
      'friction-no-wear': 'Friction does not wear surfaces away.',
      'wear-mixup': 'Counting the wearing away of parts as a useful effect of friction.',
      'rough-less-friction': 'A rougher surface gives less friction, or a smoother surface gives more.',
      'smooth-no-friction': 'A smooth surface has no friction at all.',
      'no-friction-claim': 'Some surfaces that touch, such as rubber soles on the ground, have no friction between them.',
      'rough-more-distance': 'A moving object travels further on a rougher surface.',
      'gravity-needs-air': 'Gravity is caused by air pressing down, so it only acts where there is air.',
      'gravity-only-falling': 'Gravity acts on an object only while it is falling, not when it is still or moving up.',
      'gravity-heavy-only': 'Gravity acts only on heavy objects; light things have none.',
      'force-needs-contact': 'One object must touch another to exert a force on it.',
      'no-motion-no-force': 'If an object is not moving, no forces act on it.',
      'spring-force-same-way': 'A spring pushes or pulls in the same direction as the force that stretched or squashed it.',
      'spring-force-only-release': 'A spring exerts a force only at the moment it is let go, not while it is held stretched or squashed.',
      'compressed-no-force': 'Only a stretched spring exerts a force; a squashed spring does not.',
      'spring-stays-changed': 'A spring stays stretched or squashed after the force on it is removed.',
      'length-is-extension': 'The length of a stretched spring is the same as its extension.',
      'graph-misread': 'Reading a value from the wrong axis, the wrong row or the wrong point on a graph or table.',
      'read-wrong-end': 'Picking a middle value from a table when the question needs the largest or the smallest.',
      'changed-measured-mixup': 'Mixing up the variable that is changed, the variable that is measured and the variables kept the same.'
    },
    notes: [
      { title: 'What is a force?',
        body: 'A force is a push or a pull. A force can:\n- make a still object move\n- make a moving object speed up, slow down or stop\n- change the direction an object moves in\n- change the shape of an object (squash a sponge, stretch a rubber band, flatten plasticine).\nA force cannot change the mass of an object.' },
      { title: 'Frictional force',
        body: 'Friction is a force between two surfaces that are touching. It acts against (opposes) the motion, in the opposite direction to the way the object moves or would move. Friction can act even when an object is still: it can stop a box from sliding down a slope. Rougher surfaces give more friction. Smooth surfaces give less friction, but still some.' },
      { title: 'What friction does',
        body: 'Friction slows moving objects down and can stop them. Friction produces heat: rub your palms together and they get warm. Friction wears surfaces away: shoe soles and tyres get thinner over time.' },
      { title: 'Useful or not useful?',
        body: 'Useful: grip for walking without slipping, brakes that slow a bicycle, writing with a pencil, striking a match.\nNot useful: wearing away moving parts, unwanted heat in machines, making things harder to push.\nTo REDUCE friction: oil or grease, wheels or rollers, smoother surfaces.\nTo INCREASE friction: rough surfaces, treads (grooves) on tyres and soles, rubber grips.' },
      { title: 'Gravitational force',
        body: 'The gravitational force of the Earth pulls objects towards the Earth. It acts without touching, on every object, all the time: on a ball going up, a ball falling, and a book resting on a table. Objects have weight because of the gravitational force acting on them.' },
      { title: 'Elastic spring force',
        body: 'A stretched spring pulls back. A squashed (compressed) spring pushes back. This elastic spring force acts in the opposite direction to the stretch or squash, so when the force on it is removed, the spring goes back towards its original length. Springs are used in click pens, mattresses, staplers and toy launchers.' },
      { title: 'Length and extension',
        body: 'Extension = length with the load - original length (with no load).\nExample: a spring is 10 cm long with no load and 14 cm long with a 100 g load. Its extension is 14 - 10 = 4 cm.\nIn these experiments, the greater the load, the greater the extension. Look for the pattern: the same extra load gives the same extra extension.' },
      { title: 'Fair tests with forces',
        body: 'Change ONE variable (for example, the type of surface). Measure ONE thing (for example, the distance the toy car travels). Keep everything else the same: the same car, the same ramp, the same starting height. Repeat each test and compare, so the results are more reliable.' }
    ],
    items: [
      // ----- What forces do -----
      { id: 'frc-001', type: 'mcq', level: 1, syl: 'P6', skill: 'effects',
        stem: 'Which of these best describes a force?',
        figure: null,
        options: ['A push or a pull', 'How fast an object moves', 'The amount of matter in an object', 'The energy stored in an object'],
        answer: 0,
        miscon: { 1: 'force-is-motion', 2: 'force-is-mass', 3: 'force-is-motion' },
        optionFeedback: {
          1: 'How fast something moves is its speed. A force can CHANGE the speed, but the force itself is a push or a pull.',
          2: 'The amount of matter is the mass. A force is a push or a pull that acts on that matter.',
          3: 'Energy and force are linked, but they are not the same. A force is simply a push or a pull.' },
        explain: 'A force is a push or a pull. Speed, mass and energy are different ideas.' },
      { id: 'frc-002', type: 'mcq', level: 1, syl: 'P6', skill: 'effects',
        stem: 'Which of these is NOT an effect of a force?',
        figure: null,
        options: ['Changing the shape of an object', 'Changing the direction of a moving object', 'Changing the mass of an object', 'Stopping a moving object'],
        answer: 2,
        miscon: { 0: 'force-only-moves', 1: 'force-only-moves', 3: 'force-only-moves' },
        optionFeedback: {
          0: 'Squash a sponge or flatten plasticine: a force can change shape. Look for the one a force cannot do.',
          1: 'Hit a moving ball with a bat and it goes another way: a force can change direction.',
          3: 'A goalkeeper stops a ball with a force. Which choice can a force never change?' },
        explain: 'A force can move, speed up, slow down, stop, turn or change the shape of an object. It cannot change the mass: a flattened lump of plasticine still has the same amount of matter.' },
      { id: 'frc-003', type: 'mcq', level: 2, syl: 'P6', skill: 'effects',
        stem: 'Which of these show a force changing the shape of an object?\nA: Wei Ling presses a lump of plasticine flat.\nB: Arif stretches a rubber band.\nC: Mrs Goh pushes a still trolley so that it starts to move.\nD: Dinesh squeezes a wet sponge.',
        figure: null,
        options: ['A and B only', 'A, B and D only', 'B and C only', 'A, C and D only'],
        answer: 1,
        miscon: { 0: 'shape-change-permanent', 2: 'effects-mixup', 3: 'effects-mixup' },
        technique: 'Tick or cross',
        steps: ['I take one statement at a time.', 'Does the object\'s shape change while the force acts?', 'Tick it if yes, cross it if it only starts moving.', 'I choose the option with only the ticks.'],
        optionFeedback: {
          0: 'A and B are right. A squeezed sponge changes shape too, even though it springs back afterwards.',
          2: 'B is right. But the trolley keeps its shape: the push only makes it start moving. And look again at A and D.',
          3: 'A and D are right. The trolley only starts moving: its shape stays the same. And the rubber band in B changes shape.' },
        explain: 'A, B and D: the plasticine, the rubber band and the sponge all change shape while the force acts. In C the force makes a still trolley move, which is a different effect.' },
      { id: 'frc-004', type: 'mcq', level: 1, syl: 'P6', skill: 'effects',
        stem: 'A goalkeeper catches a moving football and holds it still. Which effect of a force does this show?',
        figure: null,
        options: ['A force can make a still object move.', 'A force can change the mass of an object.', 'A force can make a moving object speed up.', 'A force can stop a moving object.'],
        answer: 3,
        miscon: { 0: 'effects-mixup', 1: 'force-is-mass', 2: 'effects-mixup' },
        optionFeedback: {
          0: 'The ball was already moving before the catch. What happened to its motion?',
          1: 'The ball has the same amount of matter before and after the catch.',
          2: 'After the catch the ball is still in her hands. It did not go faster.' },
        explain: 'The ball was moving and the goalkeeper\'s hands exerted a force that stopped it.' },
      { id: 'frc-005', type: 'mcq', level: 2, syl: 'P6', skill: 'effects',
        stem: 'A football is rolling slowly across a field. Ben kicks it in the same direction that it is rolling. What is the effect of the kick on the ball?',
        figure: null,
        options: ['The ball slows down.', 'The ball speeds up.', 'The ball gains mass.', 'The ball stays at the same speed.'],
        answer: 1,
        miscon: { 0: 'effects-mixup', 2: 'force-is-mass', 3: 'force-only-moves' },
        optionFeedback: {
          0: 'A kick against the motion would slow it down. Here the kick pushes the same way the ball is already going.',
          2: 'A kick cannot add matter to the ball. Think about its speed.',
          3: 'A push in the same direction as the motion changes the speed. Which way does it change?' },
        explain: 'A push in the same direction as the motion makes a moving object speed up.' },

      // ----- Frictional force -----
      { id: 'frc-006', type: 'mcq', level: 1, syl: 'P6', skill: 'friction',
        stem: 'Which of these describes frictional force?',
        figure: null,
        options: ['A force that pulls all objects towards the Earth', 'A force between two objects that are not touching', 'A force that acts only on objects moving very fast', 'A force that opposes motion between surfaces in contact'],
        answer: 3,
        miscon: { 0: 'forces-mixup', 1: 'friction-no-contact', 2: 'friction-only-moving' },
        optionFeedback: {
          0: 'That describes gravitational force. Friction acts where two surfaces touch.',
          1: 'Friction needs two surfaces that touch, like a shoe on the floor.',
          2: 'Friction acts on slow objects too, and even on still ones, like a box that will not slide down a slope.' },
        explain: 'Friction acts between two surfaces in contact and opposes (acts against) the motion.' },
      { id: 'frc-007', type: 'mcq', level: 2, syl: 'P6', skill: 'friction',
        stem: 'On a cool morning, Mei Ling rubs her palms together quickly for a while. What will she notice, and why?',
        figure: null,
        options: ['Her palms become cooler, because friction takes heat away.', 'Her palms stay the same, because rubbing produces no heat.', 'Her palms become warmer, because friction produces heat.', 'Her palms become warmer, because the air around them warms up first.'],
        answer: 2,
        miscon: { 0: 'friction-no-heat', 1: 'friction-no-heat', 3: 'friction-no-heat' },
        optionFeedback: {
          0: 'Try it yourself: rub your palms together. Do they feel warmer or cooler?',
          1: 'Rubbing two surfaces together makes friction, and friction produces heat.',
          3: 'Her palms warm up, but the heat comes from the rubbing, not from the air.' },
        explain: 'Friction between the rubbing palms produces heat, so her palms become warmer.' },
      { id: 'frc-008', type: 'mcq', level: 2, syl: 'P6', skill: 'friction',
        stem: 'In which of these situations is friction useful?\nA: Rubber soles help Ali walk on the floor without slipping.\nB: The brakes on a bicycle slow it down.\nC: The moving parts of a machine wear away over time.\nD: Rina writes on paper with a pencil.',
        figure: null,
        options: ['A and C only', 'B and D only', 'A, B and D only', 'A, B, C and D'],
        answer: 2,
        miscon: { 0: 'wear-mixup', 1: 'friction-only-bad', 3: 'wear-mixup' },
        technique: 'Tick or cross',
        steps: ['I take one statement at a time.', 'Does friction help the person do something they want?', 'Tick if it helps. Cross if it causes damage or waste.', 'I choose the option with only the ticks.'],
        optionFeedback: {
          0: 'A is useful. But parts wearing away (C) is a problem, not a help. Check B and D again.',
          1: 'B and D are useful. Grip from rubber soles (A) is useful friction too.',
          3: 'A, B and D are useful. But parts wearing away (C) damages the machine.' },
        explain: 'A (grip), B (brakes) and D (the pencil rubs off onto the paper) are useful friction. C, wearing away parts, is not useful.' },
      { id: 'frc-009', type: 'mcq', level: 2, syl: 'P6', skill: 'friction',
        stem: 'Car tyres have deep grooves (treads) on them. What is the main reason?',
        figure: null,
        options: ['To increase friction so the tyres grip the road', 'To reduce friction so the car can go faster', 'To make the tyres smoother so they slide easily', 'To make the car lighter'],
        answer: 0,
        miscon: { 1: 'friction-only-bad', 2: 'friction-only-bad', 3: 'force-is-mass' },
        optionFeedback: {
          1: 'Grooves make the tyre surface rougher, and rougher means more friction, not less.',
          2: 'A tyre that slides easily would be dangerous on a wet road. Grooves help it grip.',
          3: 'Grooves remove only a tiny bit of rubber. Think about grip on the road.' },
        explain: 'Treads make the surface of the tyre rougher, so there is more friction between the tyre and the road. The tyres grip the road and do not slip easily.' },
      { id: 'frc-010', type: 'mcq', level: 3, syl: 'P6', skill: 'friction',
        stem: 'Aisyah let the same toy car go from the same point on a ramp each time. It rolled onto four different surfaces, P, Q, R and S. She measured how far the car travelled on each surface. Which surface gave the most friction?',
        figure: stack(FIG_RAMP, TBL_RAMP),
        options: ['P', 'Q', 'R', 'S'],
        answer: 1,
        miscon: { 0: 'read-wrong-end', 2: 'rough-more-distance', 3: 'read-wrong-end' },
        technique: 'Read, compare, conclude',
        steps: ['Read: what was measured? The distance the car travelled.', 'Compare: which surface has the shortest distance?', 'Conclude: more friction slows the car down faster, so it stops sooner.'],
        optionFeedback: {
          0: 'P is in the middle. Find the surface where the car stopped soonest.',
          2: 'R had the LONGEST distance. Friction slows the car, so the most friction gives the shortest distance.',
          3: 'S is in the middle. Find the surface where the car stopped soonest.' },
        explain: 'The car travelled the shortest distance on Q (40 cm). The more friction, the faster the car slows down and the sooner it stops.' },
      { id: 'frc-011', type: 'mcq', level: 2, syl: 'P6', skill: 'fairtest',
        stem: 'Aisyah let a toy car roll down a ramp onto different surfaces and measured how far it travelled on each one. Which of these must she keep the same to make it a fair test?\nA: the point on the ramp where she lets the car go\nB: the toy car\nC: the type of surface\nD: the distance the car travels',
        figure: FIG_RAMP,
        options: ['A, B and C only', 'A and C only', 'B and D only', 'A and B only'],
        answer: 3,
        miscon: { 0: 'changed-measured-mixup', 1: 'changed-measured-mixup', 2: 'changed-measured-mixup' },
        technique: 'Change one thing',
        steps: ['What did she change on purpose? The type of surface.', 'What did she measure? The distance travelled.', 'Everything else must stay the same.'],
        optionFeedback: {
          0: 'A and B must stay the same. But the surface (C) is the one thing she changes on purpose.',
          1: 'A is right, but the surface (C) is what she changes. The car (B) must stay the same.',
          2: 'B is right, but the distance (D) is what she measures. It is the result, not something she keeps the same.' },
        explain: 'She changes the surface (C) and measures the distance (D). The starting point on the ramp (A) and the toy car (B) must be kept the same.' },
      { id: 'frc-012', type: 'mcq', level: 3, syl: 'P6', skill: 'fairtest',
        stem: 'Hafiz pulled a block across three surface materials, as shown. He added masses to the hanger one at a time until the block just started to move. What do his results show?',
        figure: stack(FIG_PULLEY, TBL_PULLEY),
        options: ['The more masses needed, the greater the friction between the block and the surface.', 'The more masses needed, the smoother the surface material.', 'The more masses needed, the lighter the block.', 'Glass has no friction, because the fewest masses were needed.'],
        answer: 0,
        miscon: { 1: 'rough-less-friction', 2: 'changed-measured-mixup', 3: 'smooth-no-friction' },
        technique: 'Read, compare, conclude',
        steps: ['Read: what changed? The surface material.', 'Compare: which surface needed the most masses?', 'Conclude: more friction needs a bigger pull to start the block moving.'],
        optionFeedback: {
          1: 'Sandpaper needed the most masses, and it is the roughest. Rougher means more friction.',
          2: 'The same block was used each time, so its mass did not change.',
          3: 'Glass still needed 2 masses. Smooth surfaces have less friction, but not zero.' },
        explain: 'Friction stops the block from moving until the pull is big enough. The more friction, the more masses are needed. Sandpaper (9 masses) gave the most friction and glass (2 masses) the least.' },
      { id: 'frc-013', type: 'mcq', level: 2, syl: 'P6', skill: 'friction',
        stem: 'Jun Hao pushed a box and let go. The box is now sliding to the right and slowing down. Which arrow shows the direction of the frictional force on the box?',
        figure: FIG_BOX_ARROWS,
        options: ['A', 'B', 'C', 'D'],
        answer: 1,
        miscon: { 0: 'friction-same-direction', 2: 'forces-mixup', 3: 'forces-mixup' },
        technique: 'Follow the arrows',
        steps: ['Which way is the box moving? To the right.', 'Friction acts against the motion.', 'So friction points the opposite way, along the floor.'],
        optionFeedback: {
          0: 'A points the same way the box is moving. Friction acts against the motion.',
          2: 'C points up, away from the floor. Friction acts along the surfaces that touch.',
          3: 'D points down. That is the way gravity pulls, not friction.' },
        explain: 'Friction acts along the floor, opposite to the motion. The box moves right, so friction acts to the left: arrow B.' },
      { id: 'frc-014', type: 'mcq', level: 2, syl: 'P6', skill: 'friction',
        stem: 'After a year, the soles of Mr Tan\'s running shoes are much thinner. Which is the best explanation?',
        figure: null,
        options: ['There is no friction between rubber and the ground.', 'Gravity pulls bits of rubber off the soles.', 'Friction between the soles and the ground wears the soles away.', 'The soles get thinner with age, not because of any force.'],
        answer: 2,
        miscon: { 0: 'no-friction-claim', 1: 'forces-mixup', 3: 'friction-no-wear' },
        optionFeedback: {
          0: 'Rubber soles grip the ground, so there is a lot of friction between them.',
          1: 'Gravity pulls the whole shoe down, but it does not rub rubber off. Rubbing on the ground does.',
          3: 'Shoes that are never worn stay thick. It is the rubbing on the ground that thins them.' },
        explain: 'Each step, the soles rub against the ground. Friction wears the rubber away bit by bit.' },
      { id: 'frc-015', type: 'mcq', level: 3, syl: 'P6', skill: 'friction',
        stem: 'Which of these statements about frictional force are correct?\nA: There is some friction even between two smooth surfaces.\nB: Friction acts only on objects that are moving.\nC: Friction can be useful.\nD: Friction can wear surfaces away.',
        figure: null,
        options: ['A, C and D only', 'A and C only', 'B and D only', 'A, B, C and D'],
        answer: 0,
        miscon: { 1: 'friction-no-wear', 2: 'smooth-no-friction', 3: 'friction-only-moving' },
        technique: 'Tick or cross',
        steps: ['I take one statement at a time.', 'Can I think of an example that proves it true, or one that proves it not true?', 'I choose the option with only the true statements.'],
        optionFeedback: {
          1: 'A and C are true. Think about shoe soles getting thinner: D is true too.',
          2: 'D is true. But a box resting on a slope is held still by friction, so B is not true. And A is true.',
          3: 'A, C and D are true. But friction can hold a box still on a slope, so B is not true.' },
        explain: 'A is true: smooth surfaces have less friction, but still some. B is not true: friction can stop a still box sliding down a slope. C and D are true.' },
      { id: 'frc-016', type: 'mcq', level: 3, syl: 'P6', skill: 'friction',
        stem: 'A box rests on a sloping plank and does not move. Which statement about the forces on the box is correct?',
        figure: FIG_PLANK,
        options: ['No force acts on the box, because it is not moving.', 'Gravitational force acts on the box, but no friction acts on it.', 'Friction acts on the box, but gravity stops acting while it is still.', 'Gravity pulls the box down the slope and friction stops it sliding.'],
        answer: 3,
        miscon: { 0: 'no-motion-no-force', 1: 'friction-only-moving', 2: 'gravity-only-falling' },
        technique: 'Claim, evidence, reason',
        steps: ['Claim: which forces act on the box?', 'Evidence: on a slope, a box tends to slide down, but this one stays.', 'Reason: something must be holding it against the slope.'],
        optionFeedback: {
          0: 'A still object can still have forces on it. Gravity acts on everything, all the time.',
          1: 'If there were no friction, the box would slide down the slope like on ice.',
          2: 'Gravity never switches off. It acts on still objects too.' },
        explain: 'Gravity pulls the box towards the Earth, so it tends to slide down. Friction between the box and the plank acts up the slope and stops it sliding.' },

      // ----- Gravitational force -----
      { id: 'frc-017', type: 'mcq', level: 1, syl: 'P6', skill: 'gravity',
        stem: 'A ripe mango drops from a tree onto the ground. Which force makes it fall?',
        figure: null,
        options: ['Frictional force', 'Elastic spring force', 'Gravitational force', 'Magnetic force'],
        answer: 2,
        miscon: { 0: 'forces-mixup', 1: 'forces-mixup', 3: 'forces-mixup' },
        optionFeedback: {
          0: 'Friction acts between touching surfaces. The falling mango is not rubbing against anything.',
          1: 'There is no spring here. Which force pulls things towards the Earth?',
          3: 'A mango is not a magnetic material. Which force pulls everything towards the Earth?' },
        explain: 'Gravitational force pulls the mango towards the Earth, so it falls.' },
      { id: 'frc-018', type: 'mcq', level: 2, syl: 'P6', skill: 'gravity',
        stem: 'Sam throws a ball straight up into the air. After a moment it comes back down. Why?',
        figure: null,
        options: ['The gravitational force of the Earth pulls it back down.', 'The air above the ball pushes it down.', 'The force of the throw runs out, and the ball then drops on its own.', 'The ball is pulled down only when it touches the ground.'],
        answer: 0,
        miscon: { 1: 'gravity-needs-air', 2: 'gravity-only-falling', 3: 'force-needs-contact' },
        optionFeedback: {
          1: 'Gravity is not air pressing on things. The Earth pulls the ball itself.',
          2: 'Nothing moves "on its own": the ball needs a pull to come back. Gravity was acting the whole time.',
          3: 'Gravity acts without touching: it pulls the ball even high up in the air.' },
        explain: 'Gravitational force pulls the ball towards the Earth all the time, even on the way up. It slows the ball down, stops it, and pulls it back down.' },
      { id: 'frc-019', type: 'mcq', level: 2, syl: 'P6', skill: 'gravity',
        stem: 'A book rests on a table and does not move. Which statement is correct?',
        figure: null,
        options: ['No force acts on the book, because it is not moving.', 'The book has no weight while the table holds it.', 'Gravity acts on the book only if it is pushed off the table.', 'Gravitational force acts on the book even though it is still.'],
        answer: 3,
        miscon: { 0: 'no-motion-no-force', 1: 'gravity-only-falling', 2: 'gravity-only-falling' },
        optionFeedback: {
          0: 'Still objects can have forces on them. Gravity acts on every object, all the time.',
          1: 'The book still has weight: you can feel it if you lift it. Gravity is still pulling.',
          2: 'Gravity does not wait for the book to fall. It is pulling on it right now.' },
        explain: 'Gravitational force acts on every object all the time, whether it is moving or still. The table stops the book from falling.' },
      { id: 'frc-020', type: 'mcq', level: 2, syl: 'P6', skill: 'gravity',
        stem: 'Why do objects have weight?',
        figure: null,
        options: ['Friction acts between them and the ground.', 'The gravitational force of the Earth pulls on them.', 'The air all around them presses down on them.', 'They take up space and are made of matter.'],
        answer: 1,
        miscon: { 0: 'forces-mixup', 2: 'gravity-needs-air', 3: 'force-is-mass' },
        optionFeedback: {
          0: 'An object hanging from a string has weight too, without rubbing on the ground.',
          2: 'Weight is not caused by air. The Earth itself pulls on the object.',
          3: 'Taking up space is volume. Weight is a pull on the object.' },
        explain: 'Objects have weight because of the gravitational force acting on them.' },
      { id: 'frc-021', type: 'mcq', level: 3, syl: 'P6', skill: 'gravity',
        stem: 'Which of these statements about gravitational force are correct?\nA: It can act on an object without touching it.\nB: It pulls objects towards the Earth.\nC: It acts only on heavy objects.\nD: It pulls on a ball as it rolls down a slope.',
        figure: null,
        options: ['A, B and D only', 'A and B only', 'B, C and D only', 'A, C and D only'],
        answer: 0,
        miscon: { 1: 'gravity-only-falling', 2: 'gravity-heavy-only', 3: 'gravity-heavy-only' },
        technique: 'Tick or cross',
        steps: ['I take one statement at a time.', 'Does gravity need to touch? Does it pick which objects to pull?', 'I choose the option with only the true statements.'],
        optionFeedback: {
          1: 'A and B are true. Gravity also pulls a rolling ball down a slope, so D is true too.',
          2: 'B and D are true. But a feather falls too: gravity pulls light objects as well. And A is true.',
          3: 'A and D are true. But gravity pulls light objects too, so C is not true. And B is true.' },
        explain: 'A, B and D are true. C is not: gravity pulls every object, light or heavy.' },

      // ----- Elastic spring force -----
      { id: 'frc-022', type: 'mcq', level: 1, syl: 'P6', skill: 'spring',
        stem: 'Mary pulls the two ends of a spring apart, then lets go of both ends. What happens to the spring?',
        figure: null,
        options: ['It stays stretched at its new length.', 'It goes back towards its original length.', 'It keeps on getting longer by itself.', 'It gets shorter than its original length and stays that way.'],
        answer: 1,
        miscon: { 0: 'spring-stays-changed', 2: 'spring-force-same-way', 3: 'spring-stays-changed' },
        optionFeedback: {
          0: 'A stretched spring pulls back. Once Mary lets go, nothing holds it stretched.',
          2: 'Nothing is pulling it longer once she lets go. The spring pulls itself back in.',
          3: 'The spring pulls back towards its original length, then stays there. It does not stay squashed shorter.' },
        explain: 'A stretched spring exerts an elastic spring force that pulls it back towards its original length.' },
      { id: 'frc-023', type: 'mcq', level: 2, syl: 'P6', skill: 'spring',
        stem: 'One end of a spring is fixed to a wall. Lim pulls the other end away from the wall, stretching the spring. In which direction does the spring pull on his hand?',
        figure: null,
        options: ['Away from the wall', 'Upwards', 'Towards the wall', 'It does not pull until he lets go'],
        answer: 2,
        miscon: { 0: 'spring-force-same-way', 1: 'forces-mixup', 3: 'spring-force-only-release' },
        technique: 'Follow the arrows',
        steps: ['Which way is Lim pulling? Away from the wall.', 'A stretched spring pulls back the opposite way.', 'So the spring pulls his hand towards the wall.'],
        optionFeedback: {
          0: 'That is the way LIM pulls. The spring pulls the opposite way.',
          1: 'The spring lies between the wall and his hand. It pulls along its length.',
          3: 'He can feel the pull while he holds it stretched. The spring force acts the whole time.' },
        explain: 'A stretched spring exerts an elastic spring force opposite to the stretch: back towards the wall.' },
      { id: 'frc-024', type: 'mcq', level: 2, syl: 'P6', skill: 'spring',
        stem: 'Hui Min presses down on a spring toy with her hand. She feels the spring push up against her hand. Why?',
        figure: null,
        options: ['The squashed spring exerts an elastic spring force against her hand.', 'Gravity pulls the spring upwards.', 'Only stretched springs exert a force, so it must be friction.', 'Her hand is pulling itself upwards.'],
        answer: 0,
        miscon: { 1: 'forces-mixup', 2: 'compressed-no-force', 3: 'forces-mixup' },
        optionFeedback: {
          1: 'Gravity always pulls towards the Earth, so it pulls down, not up.',
          2: 'A squashed (compressed) spring pushes back too, just as a stretched one pulls back.',
          3: 'She feels a push from the spring. Where does that push come from?' },
        explain: 'A compressed (squashed) spring exerts an elastic spring force that pushes outwards, against whatever is squashing it.' },
      { id: 'frc-025', type: 'mcq', level: 3, syl: 'P6', skill: 'spring',
        stem: 'Kavya hung different loads on a spring and measured its extension each time. Her results are shown in the graph. What is the extension when the load is 250 g?',
        figure: GRAPH_SPRING,
        options: ['4 cm', '6 cm', '5 cm', '2.5 cm'],
        answer: 2,
        miscon: { 0: 'graph-misread', 1: 'graph-misread', 3: 'graph-misread' },
        technique: 'Read, compare, conclude',
        steps: ['Find 250 g on the load axis: halfway between 200 and 300.', 'Go straight up to the line.', 'Go across to the extension axis and read the value.'],
        hints: ['250 g is halfway between two points on the line.', '200 g gives 4 cm and 300 g gives 6 cm. What is halfway?'],
        optionFeedback: {
          0: '4 cm is the extension at 200 g. 250 g is a little further along.',
          1: '6 cm is the extension at 300 g. 250 g is not that far along.',
          3: 'Be careful to read from the extension axis. The line goes up 2 cm for every 100 g.' },
        explain: 'Halfway between 200 g (4 cm) and 300 g (6 cm), the extension is 5 cm.' },
      { id: 'frc-026', type: 'mcq', level: 3, syl: 'P6', skill: 'spring',
        stem: 'Dev hung loads on a spring and measured its length each time. What is the extension of the spring when the load is 100 g?',
        figure: TBL_SPRING_10,
        options: ['2 cm', '4 cm', '14 cm', '24 cm'],
        answer: 1,
        miscon: { 0: 'graph-misread', 2: 'length-is-extension', 3: 'length-is-extension' },
        technique: 'Start minus left',
        steps: ['Find the length with no load: 10 cm.', 'Find the length with 100 g: 14 cm.', 'Extension = stretched length - original length.'],
        optionFeedback: {
          0: '2 cm is how much the spring stretches for each 50 g. 100 g is two lots of 50 g.',
          2: '14 cm is the whole length of the spring. Extension is only the extra part: take away the 10 cm.',
          3: 'Extension is how much LONGER the spring got. Subtract the original length, do not add it.' },
        explain: 'Extension = 14 cm - 10 cm = 4 cm.' },
      { id: 'frc-027', type: 'mcq', level: 3, syl: 'P6', skill: 'spring',
        stem: 'Dev hung loads on a spring and measured its length each time. The spring keeps the same pattern for larger loads. What will the length of the spring be when the load is 200 g?',
        figure: TBL_SPRING_10,
        options: ['16 cm', '20 cm', '8 cm', '18 cm'],
        answer: 3,
        miscon: { 0: 'graph-misread', 1: 'graph-misread', 2: 'length-is-extension' },
        technique: 'Count, then check',
        steps: ['How much longer does the spring get for each extra 50 g? 2 cm.', 'From 150 g to 200 g is one more 50 g.', 'Add 2 cm to the length at 150 g, then check the pattern.'],
        optionFeedback: {
          0: '16 cm is the length at 150 g. 200 g is one step further.',
          1: 'The spring grows 2 cm for each 50 g, not 4 cm. Count the steps again from 150 g.',
          2: '8 cm would be the extension at 200 g. The question asks for the LENGTH: add the original 10 cm.' },
        explain: 'Each 50 g adds 2 cm. At 150 g the length is 16 cm, so at 200 g it is 16 + 2 = 18 cm.' },
      { id: 'frc-028', type: 'mcq', level: 2, syl: 'P6', skill: 'fairtest',
        stem: 'Ravi wants to find out if the original length of a spring affects its extension when a 100 g load is hung on it. Which variable should he change?',
        figure: null,
        options: ['The mass of the load hung on it', 'The extension of the spring', 'The material of the spring', 'The original length of the spring'],
        answer: 3,
        miscon: { 0: 'changed-measured-mixup', 1: 'changed-measured-mixup', 2: 'changed-measured-mixup' },
        technique: 'Change one thing',
        steps: ['What does Ravi want to find out about? The original length.', 'That is the one thing he changes.', 'He measures the extension and keeps everything else the same.'],
        optionFeedback: {
          0: 'He uses a 100 g load every time, so the load stays the same.',
          1: 'The extension is what he MEASURES. It is the result.',
          2: 'If he changed the material too, he could not tell which change caused the result. Keep it the same.' },
        explain: 'He changes the original length of the spring, measures the extension, and keeps the load and the material the same.' },

      // ----- Open-ended -----
      { id: 'frc-029', type: 'oeq', level: 2, marks: 3, syl: 'P6', skill: 'friction', chain: true,
        stem: 'Wen Xin let a toy car roll onto a carpet and onto a tiled floor, starting at the same speed each time. It travelled a shorter distance on the carpet. Explain why.',
        figure: null,
        model: 'The carpet is rougher than the tiled floor. So there is more friction between the wheels and the carpet. The car slows down faster and travels a shorter distance.',
        keys: [['rougher', 'not as smooth', 'less smooth', 'tiled floor is smoother', 'tiles are smoother'], ['more friction', 'greater friction', 'less friction on the tiled floor', 'less friction on the tiles'], ['slows down faster', 'slows down more quickly', 'stops sooner', 'stops faster', 'slows down less on the tiles', 'slows down less on the tiled floor']],
        watchFor: ['rough-less-friction', 'rough-more-distance'],
        technique: 'Follow the arrows',
        steps: ['Start with the surface: which one is rougher?', 'Rougher surface: more or less friction?', 'More friction: what happens to the car\'s speed?', 'So what happens to the distance?'],
        explain: 'Three links in order: carpet is rougher -> more friction -> the car slows down faster (so it travels a shorter distance).' },
      { id: 'frc-030', type: 'oeq', level: 2, marks: 2, syl: 'P6', skill: 'friction',
        stem: 'Give one way friction is useful when riding a bicycle, and one way it is not useful.',
        figure: null,
        model: 'Useful: friction between the brake pads and the wheels slows the bicycle down. Not useful: friction between the moving parts, such as the chain and the gears, wears them away.',
        keys: [['brake pads', 'brakes', 'grip', 'slip', 'handle'], ['wears', 'wear away', 'worn', 'heat', 'harder to pedal']],
        watchFor: ['friction-only-bad'],
        technique: 'Tick or cross',
        steps: ['Picture the bicycle: where do two surfaces rub?', 'Tick the rubbing that helps the rider.', 'Cross the rubbing that causes damage or waste.', 'Write one of each.'],
        explain: 'One mark for a useful example (brakes, tyres gripping the road, hands gripping the handles). One mark for a not-useful example (wearing away parts, unwanted heat, making pedalling harder).' },
      { id: 'frc-031', type: 'oeq', level: 2, marks: 2, syl: 'P6', skill: 'friction', chain: true,
        stem: 'Farid strikes a match against the rough side of a matchbox and it lights. Explain how the match lights.',
        figure: null,
        model: 'Friction between the match head and the rough side of the box produces heat. The heat makes the match head hot enough to burn.',
        keys: [['friction', 'rubbing'], ['heat', 'hot']],
        watchFor: ['friction-no-heat'],
        technique: 'Follow the arrows',
        steps: ['What happens where the match head rubs the box?', 'What does that force produce?', 'What does the heat do to the match head?'],
        explain: 'In order: friction (rubbing) -> produces heat -> the match head burns.' },
      { id: 'frc-032', type: 'oeq', level: 3, marks: 3, syl: 'P6', skill: 'friction',
        stem: 'Mr Lim\'s heavy sliding door is hard to open. Suggest two different ways he could make it easier to slide, and explain how both ways help.',
        figure: null,
        model: 'He can put oil on the track. He can fit small wheels under the door so it rolls along the track. Both ways reduce friction between the door and the track, so the door slides more easily.',
        keys: [['oil', 'grease', 'lubricant', 'wheels', 'rollers', 'smoother track'], ['wheels', 'rollers', 'oil', 'grease', 'lubricant', 'smoother track'], ['reduce friction', 'less friction', 'reduces friction']],
        watchFor: ['rough-less-friction'],
        technique: 'Claim, evidence, reason',
        steps: ['Claim: name two different changes.', 'Reason: which force makes the door hard to slide?', 'Say how both changes affect that force.'],
        hints: ['Think about what you do to a squeaky bicycle chain.', 'Wheels on a suitcase make it easier to pull. Why?'],
        explain: 'One mark for a first way and one mark for a second, DIFFERENT way (oil or grease; wheels or rollers; a smoother track). One mark for saying both reduce friction between the door and the track.' },
      { id: 'frc-033', type: 'oeq', level: 3, marks: 4, syl: 'P6', skill: 'fairtest',
        stem: 'Aisyah let a toy car roll down a ramp onto four different surfaces and measured how far it travelled on each one.\n(a) Which variable did she change? (1 mark)\n(b) What did she measure? (1 mark)\n(c) Name two variables she must keep the same. (2 marks)',
        figure: stack(FIG_RAMP, TBL_RAMP),
        model: '(a) The type of surface. (b) The distance the toy car travelled. (c) She must use the same toy car and let it go from the same point on the ramp.',
        keys: [['type of surface', 'surface'], ['distance'], ['same toy car', 'same car', 'same point', 'same starting point', 'same height', 'same ramp', 'same slope', 'without pushing', 'same length of surface'], ['same point', 'same starting point', 'same height', 'same ramp', 'same slope', 'same toy car', 'same car', 'without pushing', 'same length of surface']],
        watchFor: ['changed-measured-mixup'],
        technique: 'Change one thing',
        steps: ['What did she change on purpose?', 'What did she measure to see the result?', 'What else could change the distance? Keep those the same.'],
        explain: '(a) surface; (b) distance travelled; (c) one mark each for two DIFFERENT variables kept the same: the same car, the same starting point, the same ramp height or slope, letting go without pushing, the same length of each surface.' },
      { id: 'frc-034', type: 'oeq', level: 3, marks: 3, syl: 'P6', skill: 'friction', chain: true,
        stem: 'Aisyah let the same toy car go from the same point on a ramp onto four surfaces, P, Q, R and S, and measured how far it travelled. Which surface, P, Q, R or S, is the roughest? Explain your answer using her results.',
        figure: stack(FIG_RAMP, TBL_RAMP),
        model: 'Surface Q. The car travelled the shortest distance on Q, only 40 cm. This means Q gave the most friction, which slowed the car down the fastest, so Q is the roughest.',
        keys: [['surface Q', 'Q'], ['shortest distance', 'shortest', '40 cm'], ['most friction', 'greatest friction', 'more friction']],
        watchFor: ['rough-more-distance', 'read-wrong-end'],
        technique: 'Claim, evidence, reason',
        steps: ['Claim: name the surface.', 'Evidence: quote the result from the table.', 'Reason: link the result to friction, then to roughness.'],
        explain: 'Claim (Q) -> evidence (shortest distance, 40 cm) -> reason (most friction, so roughest).' },
      { id: 'frc-035', type: 'oeq', level: 1, marks: 2, syl: 'P6', skill: 'gravity',
        stem: 'Siti lets go of an eraser and it falls to the floor. Name the force that makes it fall, and say which way this force acts.',
        figure: null,
        model: 'Gravitational force. It pulls the eraser towards the Earth, so the eraser falls down.',
        keys: [['gravitational force', 'gravity'], ['towards the Earth', 'towards the ground', 'downwards', 'down']],
        watchFor: ['forces-mixup'],
        technique: 'Claim, evidence, reason',
        steps: ['Nothing is touching the falling eraser. Which force acts without touching?', 'Name it in full.', 'Say which way it pulls.'],
        explain: 'One mark for naming gravitational force (gravity). One mark for "towards the Earth" or "downwards".' },
      { id: 'frc-036', type: 'oeq', level: 3, marks: 3, syl: 'P6', skill: 'gravity', chain: true,
        stem: 'Sam throws a ball straight up. It slows down as it rises, stops for a moment, then falls back down. Explain why this happens.',
        figure: null,
        model: 'The gravitational force of the Earth pulls on the ball all the time, even on the way up. Because it pulls against the motion, the ball slows down until it stops for a moment. Then gravity pulls it back down towards the Earth.',
        keys: [['gravitational force', 'gravity'], ['slows down', 'slows'], ['back down', 'falls', 'towards the Earth']],
        watchFor: ['gravity-only-falling'],
        technique: 'Follow the arrows',
        steps: ['Which force acts on the ball the whole time?', 'Going up, the pull is against the motion: what happens to the speed?', 'At the top it stops: then where does the pull take it?'],
        explain: 'In order: gravity acts the whole time -> it slows the ball on the way up -> it pulls the ball back down.' },
      { id: 'frc-037', type: 'oeq', level: 2, marks: 3, syl: 'P6', skill: 'spring', chain: true,
        stem: 'Darren pushes a ball into a toy launcher, squashing the spring inside. When he lets go, the ball shoots out. Explain why.',
        figure: FIG_LAUNCHER,
        model: 'The spring is compressed, so it exerts an elastic spring force that pushes outwards. When Darren lets go, this force pushes the ball out of the tube, so the ball moves.',
        keys: [['compressed', 'squashed'], ['elastic spring force', 'spring force'], ['pushes the ball', 'pushes it out', 'push the ball', 'moves']],
        watchFor: ['compressed-no-force', 'spring-force-same-way'],
        technique: 'Follow the arrows',
        steps: ['What has been done to the spring?', 'What force does a squashed spring exert, and which way?', 'What does that force do to the ball when he lets go?'],
        explain: 'In order: spring compressed -> elastic spring force pushes outwards -> it pushes the ball out.' },
      { id: 'frc-038', type: 'oeq', level: 3, marks: 3, syl: 'P6', skill: 'spring',
        stem: 'Mei Ling hung the same loads on two springs, A and B, and measured their extensions. Describe how the extension of spring A changes as the load increases. Use numbers from the table.',
        figure: TBL_TWO_SPRINGS,
        model: 'As the load increases, the extension of spring A increases. For every 100 g added, spring A stretches 3 cm more.',
        keys: [['load increases', 'greater the load', 'more load', 'heavier'], ['extension of spring A increases', 'extension increases', 'stretches more', 'longer'], ['3 cm']],
        watchFor: ['graph-misread'],
        technique: 'Read, compare, conclude',
        steps: ['Read: the load goes up in steps of 100 g.', 'Compare: how does the extension change each step?', 'Conclude: say the pattern, with a number.'],
        explain: 'One mark for "as the load increases", one for "the extension increases", one for the 3 cm per 100 g pattern.' },
      { id: 'frc-039', type: 'oeq', level: 3, marks: 4, syl: 'P6', skill: 'spring',
        stem: 'Mei Ling tested two springs, A and B, with the same loads.\n(a) Which spring stretches more easily? Use her results to explain. (2 marks)\n(b) She wants to make a tool to compare the masses of light letters. Which spring should she use? Explain why. (2 marks)',
        figure: TBL_TWO_SPRINGS,
        model: '(a) Spring A. For the same load, spring A has a greater extension than spring B. (b) Spring A, because a light letter gives a bigger change in length on spring A, so the difference between letters is easier to see and measure.',
        watchFor: ['graph-misread'],
        keys: [['spring A'], ['greater extension', 'larger extension', 'more extension', 'stretches more'], ['spring A'], ['bigger change in length', 'bigger change', 'stretches more', 'easier to see', 'easier to measure', 'easier to tell']],
        technique: 'Claim, evidence, reason',
        steps: ['Claim: which spring?', 'Evidence: compare the two extensions for the SAME load.', 'Reason: why does a bigger stretch help with light objects?'],
        explain: '(a) Spring A (1) + greater extension for the same load (1). (b) Spring A (1) + a light letter gives a bigger change in length, so it is easier to see or measure (1).' },
      { id: 'frc-040', type: 'oeq', level: 3, marks: 5, syl: 'P6', skill: 'fairtest',
        stem: 'Ali wanted to find out which sole material gives the best grip. He stuck the same-sized piece of each material, P, Q and R, under the same wooden block. He put the block on a board and slowly raised one end until the block started to slide, and measured the height of the raised end.\n(a) Which material gave the most friction? (1 mark)\n(b) Explain your answer using his results. (2 marks)\n(c) Name two variables he must keep the same. (2 marks)',
        figure: stack(FIG_TILT, TBL_TILT),
        model: '(a) Material Q. (b) The board had to be raised to the highest height, 25 cm, before the block with Q started to slide. So Q gave the most friction to hold the block still. (c) He must use the same wooden block and the same board.',
        keys: [['material Q', 'Q'], ['highest', 'greatest height', '25 cm'], ['most friction', 'greatest friction', 'more friction'], ['same wooden block', 'same block', 'same board', 'same size', 'same-sized', 'same way'], ['same board', 'same wooden block', 'same block', 'same size', 'same-sized', 'same way']],
        watchFor: ['friction-only-moving', 'changed-measured-mixup'],
        technique: 'Claim, evidence, reason',
        steps: ['Claim: name the material.', 'Evidence: which material let the board go highest before sliding?', 'Reason: what held the block still for longer?', 'For (c): what else could change the result? Keep it the same.'],
        explain: '(a) Q. (b) Highest height (25 cm) + most friction holding the block. (c) One mark each for two DIFFERENT variables kept the same: the same block, the same board, the same size of material, raising the end the same (slow) way.' },
      { id: 'frc-041', type: 'oeq', level: 3, marks: 5, syl: 'P6', skill: 'spring',
        stem: 'Nadia hung loads on a spring beside a ruler and recorded the length of the spring in the table. The picture shows the spring with the 100 g load. Assume the spring is not overstretched.\n(a) What is the original length of the spring? (1 mark)\n(b) What is the extension of the spring with a 200 g load? (1 mark)\n(c) Predict the length of the spring with a 400 g load. (1 mark)\n(d) When the load is removed, the spring goes back to its original length. Explain why. (2 marks)',
        figure: stack(FIG_SPRING_RULER, TBL_SPRING_15),
        model: '(a) 15 cm. (b) 21 - 15 = 6 cm. (c) 27 cm. (d) The stretched spring exerts an elastic spring force that pulls it back, so it returns to its original length.',
        keys: [['15 cm'], ['6 cm'], ['27 cm'], ['elastic spring force', 'spring force', 'pulls it back'], ['original length']],
        watchFor: ['length-is-extension', 'spring-stays-changed'],
        technique: 'Start minus left',
        steps: ['Original length = the length with 0 g.', 'Extension = stretched length - original length.', 'Pattern: each 100 g adds 3 cm. Count on from 300 g.', 'For (d): what force does a stretched spring exert?'],
        explain: '(a) 15 cm (no load). (b) 21 - 15 = 6 cm. (c) 24 + 3 = 27 cm. (d) Elastic spring force + pulls it back to its original length.' },
      { id: 'frc-042', type: 'oeq', level: 2, marks: 2, syl: 'P6', skill: 'effects',
        stem: 'A football is rolling towards Kumar. He kicks it hard and it goes back faster than it came. State two effects the kick has on the ball.',
        figure: null,
        model: 'The kick changes the direction the ball moves in. It also changes the speed of the ball: it goes faster.',
        keys: [['direction'], ['speed', 'faster', 'slows', 'stops', 'stopped', 'shape', 'squash']],
        watchFor: ['force-only-moves'],
        technique: 'Count, then check',
        steps: ['List the effects of a force: start, speed up, slow down, stop, turn, change shape.', 'Which ones happen to this ball?', 'Count: I need two. Check each one really happens.'],
        explain: 'One mark for change of direction. One mark for change of speed (or the ball changing shape for a moment as it is kicked).' },
      { id: 'frc-043', type: 'oeq', level: 3, marks: 3, syl: 'P6', skill: 'friction', chain: true,
        stem: 'Explain how pressing the brakes makes a moving bicycle stop.',
        figure: null,
        model: 'When the brakes are pressed, the brake pads rub against the wheel. This produces friction between the pads and the wheel, which acts against the motion. The wheel slows down and the bicycle stops.',
        keys: [['rub against the wheel', 'rub', 'press on the wheel', 'touch the wheel'], ['friction'], ['slows down', 'stops']],
        watchFor: ['friction-only-bad'],
        technique: 'Follow the arrows',
        steps: ['What touches the wheel when the brakes are pressed?', 'What force acts where two surfaces rub?', 'What does that force do to the motion?'],
        explain: 'In order: pads rub on the wheel -> friction against the motion -> the bicycle slows down and stops.' },
      { id: 'frc-044', type: 'oeq', level: 3, marks: 3, syl: 'P6', skill: 'friction', chain: true,
        stem: 'A cleaner puts up a sign: "Caution: wet floor". Explain why Ali is more likely to slip on the wet floor than on a dry one.',
        figure: null,
        model: 'A layer of water forms between his shoes and the floor. This reduces friction between them. With less friction, his shoes cannot grip the floor well, so they slide.',
        keys: [['layer of water', 'water between', 'thin layer', 'water forms a layer'], ['reduces friction', 'less friction', 'lower friction'], ['cannot grip', 'less grip', 'grip', 'slide']],
        watchFor: ['smooth-no-friction', 'friction-only-bad'],
        technique: 'Follow the arrows',
        steps: ['What is between his shoes and the floor now?', 'Does that give more or less friction?', 'What can his shoes no longer do well?', 'So what happens to his feet?'],
        explain: 'In order: a layer of water between shoes and floor -> less friction -> less grip, so his shoes slide.' },
      { id: 'frc-045', type: 'oeq', level: 3, marks: 4, syl: 'P6', skill: 'gravity', chain: true,
        stem: 'Joanne lets go of a ball at the top of a slope. It rolls down onto a rough carpet, slows down and stops. Explain why the ball starts to move, and why it stops.',
        figure: FIG_SLOPE_CARPET,
        model: 'Gravitational force pulls the ball down the slope, so it rolls down and starts to move. On the carpet, friction between the ball and the carpet acts against its motion, so the ball slows down and stops.',
        keys: [['gravitational force', 'gravity'], ['rolls down', 'starts to move'], ['friction'], ['slows down', 'stops']],
        watchFor: ['gravity-only-falling', 'rough-more-distance'],
        technique: 'Follow the arrows',
        steps: ['What pulls the still ball so that it starts to move?', 'Where does it go because of that pull?', 'On the carpet, which force acts against the motion?', 'What does that force do to the ball?'],
        explain: 'In order: gravity -> the ball rolls down -> friction on the carpet -> it slows down and stops.' },
      { id: 'frc-046', type: 'oeq', level: 2, marks: 2, syl: 'P6', skill: 'spring', chain: true,
        stem: 'A weighing scale has a spring inside that is squashed when someone stands on it. Explain why a heavier person makes the spring squash more.',
        figure: null,
        model: 'A heavier person pushes down on the scale with a greater force. So the spring inside is compressed more.',
        keys: [['greater force', 'more force', 'bigger force', 'greater weight', 'pushes down harder'], ['compressed more', 'squashed more', 'squashes more']],
        watchFor: ['compressed-no-force'],
        technique: 'Follow the arrows',
        steps: ['A heavier person: is the push down bigger or smaller?', 'A bigger push on the spring: does it squash more or less?', 'Write the two links in order.'],
        explain: 'In order: heavier person -> greater force pushing down -> the spring is compressed more.' }
    ]
  });
})();
