"use strict";
// Science Quest — topic: Magnets (P3, Interactions). Data only; the helpers below just build SVG/HTML strings.
// Scope per MOE Primary Science Syllabus 2023, "Interaction of Forces (Magnets) (P3)":
//   push or pull; magnets made of iron or steel; two poles; freely suspended bar magnet rests N-S;
//   unlike poles attract, like poles repel; magnets attract magnetic materials; compare magnets,
//   magnetic and non-magnetic materials; make a magnet by the stroke method and the electrical method;
//   uses of magnets. Syllabus notes: recall of nickel and cobalt NOT required; magnetic shielding and
//   magnetic induction NOT required (so no item depends on them).
(function () {
  const RED = '#dc2626', BLUE = '#2563eb', GREY = '#9ca3af', INK = '#1f2937', LINE = '#475569';

  const svg = (w, h, label, inner) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="100%" style="max-width:${w}px;display:block;margin:0 auto" role="img" aria-label="${label}">` +
    `<rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="10" fill="#ffffff" stroke="#cbd5e1"/>${inner}</svg>`;

  const txt = (x, y, s, o = {}) =>
    `<text x="${x}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="${o.size || 15}" font-weight="${o.bold ? 700 : 400}" fill="${o.fill || INK}" text-anchor="${o.anchor || 'middle'}" dominant-baseline="middle">${s}</text>`;

  const poleColour = (p) => (p === 'N' ? RED : p === 'S' ? BLUE : GREY);

  // Horizontal bar magnet: left half labelled L, right half labelled R ('N', 'S', or anything else = grey).
  const bar = (x, y, w, h, L, R) => {
    const half = w / 2;
    return `<rect x="${x}" y="${y}" width="${half}" height="${h}" fill="${poleColour(L)}" stroke="#111827" stroke-width="1.5"/>` +
      `<rect x="${x + half}" y="${y}" width="${half}" height="${h}" fill="${poleColour(R)}" stroke="#111827" stroke-width="1.5"/>` +
      txt(x + half / 2, y + h / 2, L, { bold: 1, fill: '#fff', size: 18 }) +
      txt(x + half * 1.5, y + h / 2, R, { bold: 1, fill: '#fff', size: 18 });
  };

  // Plain (unmagnetised / unknown) rod.
  const rod = (x, y, w, h, label) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#e5e7eb" stroke="#111827" stroke-width="1.5"/>` +
    (label ? txt(x + w / 2, y + h / 2, label, { bold: 1 }) : '');

  // Paper clip (hanging, small).
  const clip = (x, y) => `<rect x="${x}" y="${y}" width="8" height="18" rx="4" fill="none" stroke="${LINE}" stroke-width="2"/>`;

  // Horizontal arrow from x1 to x2 at height y.
  const arrow = (x1, x2, y) => {
    const d = x2 > x1 ? 1 : -1;
    return `<line x1="${x1}" y1="${y}" x2="${x2 - d * 8}" y2="${y}" stroke="${INK}" stroke-width="2.5"/>` +
      `<polygon points="${x2},${y} ${x2 - d * 10},${y - 6} ${x2 - d * 10},${y + 6}" fill="${INK}"/>`;
  };

  const TH = 'border:1px solid #94a3b8;padding:6px 10px;background:#e2e8f0;color:#111827';
  const TD = 'border:1px solid #94a3b8;padding:6px 10px;text-align:center';
  const table = (head, rows, caption) =>
    `<table style="border-collapse:collapse;margin:0 auto;font-size:15px">` +
    (caption ? `<caption style="padding:4px 0 6px;font-weight:600">${caption}</caption>` : '') +
    `<thead><tr>${head.map((h) => `<th style="${TH}">${h}</th>`).join('')}</tr></thead>` +
    `<tbody>${rows.map((r) => `<tr>${r.map((c) => `<td style="${TD}">${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;

  // Vertical bar chart, values are whole numbers, step = gridline step.
  const chart = (labels, values, max, step, yLabel, xLabel) => {
    const w = 360, h = 260, x0 = 58, y0 = 200, top = 30, ph = y0 - top;
    const slot = (w - x0 - 16) / labels.length, bw = Math.min(44, slot * 0.55);
    let s = '';
    for (let v = 0; v <= max; v += step) {
      const y = y0 - (v / max) * ph;
      s += `<line x1="${x0}" y1="${y}" x2="${w - 16}" y2="${y}" stroke="#e5e7eb"/>` + txt(x0 - 8, y, v, { anchor: 'end', size: 13 });
    }
    s += `<line x1="${x0}" y1="${top - 6}" x2="${x0}" y2="${y0}" stroke="${INK}" stroke-width="2"/>`;
    s += `<line x1="${x0}" y1="${y0}" x2="${w - 16}" y2="${y0}" stroke="${INK}" stroke-width="2"/>`;
    labels.forEach((l, i) => {
      const cx = x0 + slot * i + slot / 2, bh = (values[i] / max) * ph;
      s += `<rect x="${cx - bw / 2}" y="${y0 - bh}" width="${bw}" height="${bh}" fill="#60a5fa" stroke="#1e3a8a"/>`;
      s += txt(cx, y0 + 16, l, { bold: 1, size: 14 });
    });
    s += txt(x0 + (w - x0 - 16) / 2, y0 + 42, xLabel, { size: 13 });
    s += `<text x="16" y="${top + ph / 2}" font-family="Arial, Helvetica, sans-serif" font-size="13" fill="${INK}" text-anchor="middle" transform="rotate(-90 16 ${top + ph / 2})">${yLabel}</text>`;
    return svg(w, h, `Bar chart: ${yLabel} for ${labels.join(', ')}`, s);
  };

  // Ring magnets on a pencil (side view). rings: [{label, gapAbove}], sideNotes: [[ringIndex, text]]
  const rings = (labels, notes) => {
    const w = 340, h = 270, cx = 120, baseY = 240, rh = 20, rw = 100;
    let s = `<rect x="40" y="${baseY}" width="160" height="14" fill="#d6b88a" stroke="#7c5a2c"/>`;
    s += `<rect x="${cx - 6}" y="40" width="12" height="${baseY - 40}" fill="#fcd34d" stroke="#92400e"/>`;
    s += `<polygon points="${cx - 6},40 ${cx + 6},40 ${cx},24" fill="#fde68a" stroke="#92400e"/>`;
    s += txt(cx + 12, 30, 'pencil', { anchor: 'start', size: 13 });
    // bottom ring rests on base; others float with gaps
    const ys = [baseY - rh, baseY - rh - 70, baseY - rh - 140];
    labels.forEach((l, i) => {
      const y = ys[i];
      s += `<rect x="${cx - rw / 2}" y="${y}" width="${rw}" height="${rh}" rx="4" fill="#9ca3af" stroke="#111827" stroke-width="1.5"/>`;
      s += `<rect x="${cx - 7}" y="${y}" width="14" height="${rh}" fill="#fcd34d" stroke="#92400e"/>`;
      s += txt(cx - rw / 2 - 14, y + rh / 2, l, { bold: 1, size: 16 });
    });
    (notes || []).forEach(([i, t, where]) => {
      const y = where === 'bottom' ? ys[i] + rh - 2 : ys[i] + 2;
      s += `<line x1="${cx + rw / 2 + 2}" y1="${y}" x2="${cx + rw / 2 + 22}" y2="${y}" stroke="${LINE}"/>`;
      s += txt(cx + rw / 2 + 26, y, t, { anchor: 'start', size: 13 });
    });
    return svg(w, h, 'Ring magnets on a pencil', s);
  };

  // Electromagnet set-up: iron nail with wire coiled round it, battery and switch, clips under the tip.
  const electromagnet = (switchClosed, clipsShown) => {
    const w = 360, h = 230;
    let s = '';
    // nail
    s += `<rect x="70" y="70" width="190" height="14" fill="#9ca3af" stroke="#111827"/>`;
    s += `<polygon points="260,70 285,77 260,84" fill="#9ca3af" stroke="#111827"/>`;
    s += `<rect x="62" y="64" width="10" height="26" fill="#6b7280" stroke="#111827"/>`;
    // coils
    for (let i = 0; i < 9; i++) {
      const x = 95 + i * 16;
      s += `<ellipse cx="${x}" cy="77" rx="5" ry="14" fill="none" stroke="#b45309" stroke-width="2.5"/>`;
    }
    // wires down to battery
    s += `<polyline points="95,91 95,170 150,170" fill="none" stroke="#b45309" stroke-width="2.5"/>`;
    s += `<polyline points="223,91 223,170 200,170" fill="none" stroke="#b45309" stroke-width="2.5"/>`;
    // battery
    s += `<rect x="150" y="158" width="50" height="24" rx="3" fill="#fef3c7" stroke="#111827"/>` + txt(175, 170, 'battery', { size: 11 });
    // switch on the left wire
    s += `<rect x="85" y="120" width="20" height="26" fill="#ffffff" stroke="none"/>`;
    s += `<circle cx="95" cy="120" r="3" fill="${INK}"/><circle cx="95" cy="146" r="3" fill="${INK}"/>`;
    s += switchClosed
      ? `<line x1="95" y1="120" x2="95" y2="146" stroke="${INK}" stroke-width="3"/>`
      : `<line x1="95" y1="146" x2="112" y2="124" stroke="${INK}" stroke-width="3"/>`;
    s += txt(60, 133, 'switch', { size: 12 });
    // labels
    s += txt(175, 40, 'iron nail with wire coiled round it', { size: 13 });
    s += `<line x1="175" y1="50" x2="175" y2="62" stroke="${LINE}"/>`;
    if (clipsShown) {
      s += clip(282, 92) + clip(292, 112) + clip(282, 132);
      s += txt(320, 205, 'paper clips', { size: 12 });
    }
    return svg(w, h, 'Electromagnet set-up with iron nail, wire, battery and switch', s);
  };

  // ---------- Figures ----------
  const FIG_ATTRACT_SN = svg(360, 110, 'Two bar magnets: S pole facing N pole',
    bar(20, 35, 140, 40, 'N', 'S') + bar(200, 35, 140, 40, 'N', 'S') + txt(180, 95, 'S pole faces N pole', { size: 13 }));

  const FIG_LIKE_NN = svg(360, 110, 'Two bar magnets: N pole facing N pole',
    bar(20, 35, 140, 40, 'S', 'N') + bar(200, 35, 140, 40, 'N', 'S') + txt(90, 95, 'Magnet P', { size: 13 }) + txt(270, 95, 'Magnet Q', { size: 13 }));

  const FIG_CHAIN = svg(360, 120, 'Bar magnet with N and S poles touching a magnet with poles X and Y',
    bar(20, 40, 160, 40, 'N', 'S') + bar(180, 40, 160, 40, 'X', 'Y') + txt(180, 100, 'The two magnets stay stuck together.', { size: 13 }));

  const FIG_CLIPS_POLES = (() => {
    let s = bar(60, 30, 240, 34, 'N', 'S');
    // many clips at both ends, one in the middle
    [62, 74, 86, 98, 70, 82].forEach((x, i) => { s += clip(x, 66 + (i > 3 ? 20 : 0)); });
    [262, 274, 286, 250, 268, 280].forEach((x, i) => { s += clip(x, 66 + (i > 3 ? 20 : 0)); });
    s += clip(176, 66);
    s += txt(80, 140, 'A', { bold: 1, size: 17 }) + txt(180, 140, 'B', { bold: 1, size: 17 }) + txt(280, 140, 'C', { bold: 1, size: 17 });
    return svg(360, 160, 'Bar magnet dipped into paper clips; many clips at ends A and C, one at middle B', s);
  })();

  const FIG_BROKEN = svg(360, 140, 'A bar magnet broken into two pieces',
    txt(180, 20, 'Before', { size: 13 }) + bar(80, 30, 200, 32, 'N', 'S') +
    txt(180, 82, 'After it broke', { size: 13 }) + rod(60, 94, 100, 32, 'piece 1') + rod(200, 94, 100, 32, 'piece 2'));

  const FIG_THROUGH_PAPER = (() => {
    let s = `<rect x="30" y="70" width="300" height="10" fill="#f8fafc" stroke="#64748b"/>` + txt(330, 60, 'sheet of paper', { anchor: 'end', size: 12 });
    s += clip(175, 50);
    s += txt(140, 40, 'paper clip on top', { anchor: 'end', size: 12 });
    s += bar(120, 90, 120, 30, 'N', 'S') + txt(180, 140, 'magnet moved under the paper', { size: 12 });
    s += arrow(250, 310, 105);
    return svg(360, 160, 'A paper clip on top of a sheet of paper with a magnet moved underneath', s);
  })();

  const FIG_STROKE = (() => {
    let s = rod(50, 120, 260, 26, '') + txt(40, 133, 'A', { bold: 1, anchor: 'end' }) + txt(320, 133, 'B', { bold: 1, anchor: 'start' });
    s += txt(180, 162, 'steel bar', { size: 13 });
    // magnet held vertical with N at bottom
    s += `<rect x="40" y="40" width="34" height="38" fill="${BLUE}" stroke="#111827"/><rect x="40" y="78" width="34" height="38" fill="${RED}" stroke="#111827"/>`;
    s += txt(57, 59, 'S', { bold: 1, fill: '#fff' }) + txt(57, 97, 'N', { bold: 1, fill: '#fff' });
    s += arrow(90, 300, 100) + txt(195, 86, 'stroke from A to B', { size: 13 });
    s += `<path d="M300 92 Q 190 20 80 34" fill="none" stroke="${LINE}" stroke-dasharray="5 4" stroke-width="2"/>`;
    s += txt(195, 15, 'lift the magnet and go back to A', { size: 12 });
    return svg(360, 180, 'Stroking a steel bar from end A to end B with the N pole of a magnet', s);
  })();

  const TBL_CLIPS = table(['Magnet', 'Number of paper clips attracted'], [['A', '8'], ['B', '11'], ['C', '4'], ['D', '15']], 'Results');

  const TBL_CLIPS_REPEAT = table(
    ['Magnet', '1st try', '2nd try', '3rd try'],
    [['P', '12', '13', '12'], ['Q', '6', '5', '6'], ['R', '20', '19', '21']],
    'Number of paper clips attracted');

  const CHART_CLIPS = chart(['W', 'X', 'Y', 'Z'], [10, 5, 20, 15], 20, 5, 'Number of paper clips', 'Magnet');

  const TBL_OBJECTS = table(['Object', 'Attracted by the magnet?'], [['P', 'No'], ['Q', 'No'], ['R', 'No'], ['S', 'Yes']], 'Results');

  const TBL_ROD_BOTH = table(['End of rod X', 'Near N pole of magnet', 'Near S pole of magnet'],
    [['End 1', 'attracted', 'attracted'], ['End 2', 'attracted', 'attracted']], 'Rod X tested with a magnet');

  const TBL_ROD_REPEL = table(['End of rod Y', 'Near N pole of magnet', 'Near S pole of magnet'],
    [['End 1', 'repelled', 'attracted'], ['End 2', 'attracted', 'repelled']], 'Rod Y tested with a magnet');

  const TBL_PAPER_SHEETS = table(['Number of sheets of paper between magnet and clips', 'Number of paper clips attracted'],
    [['0', '12'], ['2', '9'], ['4', '5'], ['6', '2']], 'Results');

  const TBL_COILS = table(['Number of coils of wire round the iron nail', 'Number of paper clips attracted'],
    [['10', '3'], ['20', '7'], ['30', '11']], 'Results');

  const TBL_BATTERIES = table(['Number of batteries', 'Number of paper clips attracted'],
    [['1', '4'], ['2', '8'], ['3', '12']], 'Results (same nail, same number of coils)');

  const TBL_STROKES = table(['Number of strokes', 'Number of paper clips attracted'],
    [['10', '1'], ['20', '3'], ['30', '5'], ['40', '7']], 'Results');

  const FIG_RINGS_ABC = rings(['A', 'B', 'C']);
  const FIG_RINGS_FACES = rings(['A', 'B', 'C'], [[0, 'top face of A is N', 'top']]);

  const FIG_EM_ON = electromagnet(true, true);
  const FIG_EM_OFF = electromagnet(false, false);

  // ---------- Figures added in the hardness pass ----------
  // Toy car with a magnet taped to its front, rolling towards a magnet fixed to a wall block.
  const FIG_CAR = (() => {
    let s = `<rect x="12" y="40" width="18" height="84" fill="#d1d5db" stroke="#111827"/>` + txt(21, 30, 'wall', { size: 13 });
    s += bar(30, 68, 84, 30, '', 'W');
    s += `<rect x="226" y="58" width="110" height="46" rx="8" fill="#fde047" stroke="#111827" stroke-width="1.5"/>`;
    s += `<circle cx="252" cy="110" r="12" fill="#374151"/><circle cx="310" cy="110" r="12" fill="#374151"/>`;
    s += bar(166, 68, 60, 30, 'N', 'S');
    s += `<line x1="10" y1="123" x2="350" y2="123" stroke="${LINE}" stroke-width="2"/>`;
    s += arrow(300, 210, 38) + txt(255, 22, 'pushed towards the wall', { size: 13 });
    s += txt(72, 140, 'fixed magnet', { size: 13 }) + txt(260, 140, 'toy car with magnet', { size: 13 });
    return svg(360, 156, 'A toy car with a bar magnet on its front, N pole forward, facing end W of a magnet fixed to a wall', s);
  })();

  // Fish-tank cleaner: magnet pad inside the glass, magnet handle outside.
  const FIG_TANK = (() => {
    let s = `<rect x="20" y="30" width="160" height="120" fill="#dbeafe" stroke="none"/>` + txt(70, 135, 'water', { size: 13 });
    s += `<rect x="180" y="20" width="12" height="134" fill="#bae6fd" stroke="#0369a1"/>` + txt(186, 14, 'glass', { size: 13 });
    s += `<rect x="128" y="62" width="52" height="40" rx="6" fill="#86efac" stroke="#111827"/>` + txt(154, 82, 'pad', { size: 13 });
    s += `<rect x="192" y="62" width="52" height="40" rx="6" fill="#d1d5db" stroke="#111827"/>` + txt(218, 82, 'handle', { size: 13 });
    s += `<line x1="262" y1="110" x2="262" y2="58" stroke="${INK}" stroke-width="2.5"/><polygon points="262,48 256,60 268,60" fill="${INK}"/>`;
    s += txt(272, 120, 'handle moved', { anchor: 'start', size: 13 }) + txt(272, 138, 'up the glass', { anchor: 'start', size: 13 });
    s += txt(100, 46, 'inside the tank', { size: 13 }) + txt(300, 46, 'outside', { size: 13 });
    return svg(360, 164, 'A cleaning pad inside a fish tank and a handle outside the glass', s);
  })();

  // Bar magnet on a piece of wood floating in a bowl of water.
  const FIG_BOWL = (() => {
    let s = `<path d="M40 80 Q 180 210 320 80 Z" fill="#dbeafe" stroke="#1e3a8a" stroke-width="2"/>`;
    s += `<rect x="115" y="68" width="130" height="14" fill="#d6b88a" stroke="#7c5a2c"/>`;
    s += bar(135, 44, 90, 24, 'N', 'S');
    s += txt(180, 22, 'magnet (N end painted red)', { size: 13 });
    s += `<line x1="250" y1="75" x2="284" y2="60" stroke="${LINE}"/>` + txt(288, 52, 'wood', { anchor: 'start', size: 13 });
    s += txt(180, 118, 'water', { size: 13 });
    return svg(360, 160, 'A bar magnet on a piece of wood floating in a bowl of water', s);
  })();

  // Ruler with a pin at 0 cm and a magnet being moved towards it.
  const FIG_RULER = (() => {
    const x0 = 24, cm = 15.5;
    let s = `<rect x="${x0 - 8}" y="78" width="${20 * cm + 16}" height="30" fill="#fde68a" stroke="#92400e"/>`;
    for (let c = 0; c <= 20; c++) {
      const x = x0 + c * cm;
      s += `<line x1="${x}" y1="78" x2="${x}" y2="${c % 5 ? 86 : 92}" stroke="#92400e"/>`;
      if (c % 5 === 0) s += txt(x, 100, c, { size: 13 });
    }
    s += `<line x1="${x0}" y1="72" x2="${x0 + 26}" y2="72" stroke="#475569" stroke-width="2.5"/><circle cx="${x0}" cy="72" r="4" fill="#475569"/>`;
    s += txt(x0 + 4, 56, 'pin', { size: 13 });
    s += bar(250, 46, 80, 26, 'N', 'S');
    s += arrow(240, 170, 58) + txt(205, 34, 'magnet moved slowly', { size: 13 });
    s += txt(180, 126, 'ruler (cm)', { size: 13 });
    return svg(360, 140, 'A pin at the 0 cm mark of a ruler and a magnet moved slowly towards it', s);
  })();

  const TBL_DOOR = table(['Bar', 'Attracted by the magnet?'], [['P', 'Yes'], ['Q', 'No'], ['R', 'Yes'], ['S', 'No']], 'Results');

  const TBL_FISH = table(['Fish', 'What is stuck to its mouth'],
    [['A', 'a steel paper clip'], ['B', 'an aluminium ring'], ['C', 'a small magnet, S pole facing up'], ['D', 'a piece of copper wire']], 'Fishing game');

  const TBL_DIST = table(['Magnet', 'Distance when the pin first moved (cm)'], [['P', '6'], ['Q', '2'], ['R', '9'], ['S', '4']], 'Results');

  const TBL_RULER = table(['Magnet', 'Distance when the pin first moved (cm)'], [['A', '12'], ['B', '7'], ['C', '15']], 'Results');

  const TBL_PINS_DIST = table(['Distance between magnet and pins (cm)', 'Number of pins attracted'],
    [['1', '10'], ['2', '8'], ['3', '?'], ['4', '4'], ['5', '2']], 'Results');

  const TBL_RODS_EM = table(['Rod', 'Number of paper clips attracted'], [['W', '12'], ['X', '0'], ['Y', '8'], ['Z', '0']],
    'Same coils and same batteries for every rod');

  const TBL_CRANE = table(['Rod', 'Greatest distance at which the nail was attracted'],
    [['P', '3 cm'], ['Q', 'not attracted, even when touching'], ['R', '6 cm']], 'Results');

  const TBL_EM_RANK = table(['Electromagnet', 'Number of coils', 'Number of batteries'],
    [['W', '10', '1'], ['X', '20', '2'], ['Y', '20', '1'], ['Z', '30', '2']]);

  const TBL_EM_FAIR = table(['Set-up', 'Number of coils', 'Number of batteries', 'Nail'],
    [['A', '10', '1', 'iron'], ['B', '20', '2', 'iron'], ['C', '20', '1', 'iron'], ['D', '20', '1', 'steel']]);

  const TBL_BARS = table(['Bars brought near each other', 'What happened'],
    [['K and L', 'attracted'], ['L and M', 'repelled'], ['K and M', 'attracted']], 'Results');

  const TBL_STROKES_2 = table(['Number of strokes', 'Number of paper clips attracted'],
    [['10', '2'], ['20', '4'], ['30', '6'], ['40', '8']], 'Results');

  const TBL_JK = table(['Steel bar', 'Distance when the pin was first attracted (cm)'], [['J', '2'], ['K', '5']], 'Results');

  SCI.registerTopic({
    id: 'magnets',
    title: 'Magnets',
    emoji: '🧲',
    theme: 'Interactions',
    moeRef: 'Interaction of Forces (Magnets) (P3): Recognise that a magnet can exert a push or a pull. Identify the characteristics of magnets: magnets can be made of iron or steel; magnets have two poles; a freely suspended bar magnet comes to rest pointing in a North-South direction; unlike poles attract and like poles repel; magnets attract magnetic materials. Compare magnets, non-magnetic materials and magnetic materials. Make a magnet by the stroke method and the electrical method. Recognise uses of magnets in everyday objects.',
    notes: [
      { title: 'What a magnet does',
        body: 'A magnet can exert a push or a pull. It pulls (attracts) magnetic materials, even without touching them. Two magnets can pull each other or push each other away (repel). Magnets are usually made of iron or steel.' },
      { title: 'Magnetic and non-magnetic materials',
        body: 'Magnetic materials are attracted by a magnet: iron and steel (nickel and cobalt are magnetic too). NOT all metals are magnetic! Aluminium, copper, brass, gold and silver are metals but they are non-magnetic. Plastic, wood, glass, rubber, paper and cloth are non-magnetic too.' },
      { title: 'Poles: like poles repel, unlike poles attract',
        body: 'Every magnet has two poles: a North pole (N) and a South pole (S). The magnetic force is strongest at the poles, so most paper clips stick to the ends of a bar magnet and very few to the middle. If a magnet breaks, each piece still has an N pole and an S pole. Magnets come in many shapes (bar, horseshoe or U-shaped, ring, disc, rod) and every shape has two poles. N and N push apart (repel). S and S repel. N and S pull together (attract).' },
      { title: 'The big trap: attract or repel?',
        body: 'If an object is only ATTRACTED by a magnet, it may just be a magnetic material. That is not enough evidence to say it is a magnet. The object is DEFINITELY a magnet only if it REPELS a magnet. So the only sure test: bring each end of the object near a pole of a magnet. If one end is pushed away, the object is a magnet.' },
      { title: 'Freely suspended magnets',
        body: 'Hang a bar magnet from a string so it can turn freely. It always comes to rest pointing North-South. The end that points North is the N pole. A compass needle is a small magnet, so it also points North-South.' },
      { title: 'Making a magnet: stroke method',
        body: 'Stroke a steel or iron bar with ONE pole of a magnet, in ONE direction only, many times. Lift the magnet away at the end of each stroke and start again from the same end. More strokes make a stronger magnet. The end where each stroke finishes becomes the opposite pole to the pole you stroked with.' },
      { title: 'Making a magnet: electrical method',
        body: 'Coil a wire many times round an iron nail and connect it to a battery. When electricity flows, the nail becomes a magnet (an electromagnet). Switch off and it stops being a magnet. More coils of wire (or more batteries) give a stronger electromagnet.' },
      { title: 'Uses of magnets',
        body: 'Fridge magnets and fridge door seals, magnetic cupboard door catches, pencil case and bag clasps, magnetic whiteboards, compasses, and magnets that separate steel cans from aluminium cans for recycling. Cranes in scrapyards use electromagnets: switch on to lift steel scrap, switch off to drop it. A magnet can also attract through non-magnetic things like paper, plastic and water.' },
      { title: 'Experiment: which magnet is strongest?',
        body: 'Change only the magnet. Measure the number of paper clips each magnet attracts. Keep everything else the same: the same kind and size of paper clips, the same way of picking them up. The magnet that attracts the MOST paper clips is the strongest. Another way: move each magnet slowly towards a pin and measure the distance when the pin is first attracted. The LARGER the distance, the STRONGER the magnet (a weak magnet must come very close). Repeat each test and compare the results so they are more reliable.' },
      { title: 'Losing magnetism (some schools teach this)',
        body: 'Some schools also teach: a magnet can lose its magnetism (become weaker) if it is heated strongly, hammered or dropped many times. Keep magnets safe and do not knock them about.' }
    ],
    items: [
      // ----- MCQ -----
      { id: 'mag-001', type: 'mcq', level: 1,
        stem: 'Which of these objects will a magnet attract?',
        figure: null,
        options: ['A piece of copper wire', 'A long plastic ruler', 'A wooden pencil', 'A steel paper clip'],
        answer: 3,
        explain: 'Steel is a magnetic material, so a magnet attracts the steel paper clip. Copper is a metal but it is non-magnetic, so the copper wire is not attracted. Plastic and wood are non-magnetic too.' },
      { id: 'mag-002', type: 'mcq', level: 1,
        stem: 'Which material is a magnetic material?',
        figure: null,
        options: ['Iron', 'Aluminium', 'Copper', 'Glass'],
        answer: 0,
        explain: 'Iron is a magnetic material. Aluminium and copper are metals, but they are NOT magnetic. Glass is non-magnetic.' },
      { id: 'mag-003', type: 'mcq', level: 1,
        stem: 'The two ends of a bar magnet, where its magnetic force is strongest, are called the ______.',
        figure: null,
        options: ['poles', 'edges', 'centres', 'faces'],
        answer: 0,
        explain: 'The ends of a magnet are its poles: the North pole (N) and the South pole (S). The magnetic force is strongest there.' },
      { id: 'mag-004', type: 'mcq', level: 1,
        stem: 'The N pole of one magnet is brought near the N pole of another magnet. What happens?',
        figure: null,
        options: ['They attract each other.', 'Nothing happens.', 'They repel each other.', 'Both magnets lose their magnetism.'],
        answer: 2,
        explain: 'Like poles repel. N and N are like poles, so the magnets push each other away.' },
      { id: 'mag-005', type: 'mcq', level: 1,
        stem: 'Two bar magnets are placed as shown. What will happen to them?',
        figure: FIG_ATTRACT_SN,
        options: ['They will attract each other.', 'They will repel each other.', 'Nothing will happen.', 'They will turn to point East-West.'],
        answer: 0,
        explain: 'The S pole of the left magnet faces the N pole of the right magnet. Unlike poles attract, so the magnets pull together.' },
      { id: 'mag-006', type: 'mcq', level: 1,
        stem: 'A bar magnet is hung from a string so that it can turn freely. In which direction will it point when it stops moving?',
        figure: null,
        options: ['East-West', 'Up-down', 'Any direction, it changes every time', 'North-South'],
        answer: 3,
        explain: 'A freely suspended bar magnet always comes to rest pointing in a North-South direction.' },
      { id: 'mag-007', type: 'mcq', level: 1,
        stem: 'Which of these can a magnet do?',
        figure: null,
        options: ['Only push things', 'Only pull things', 'Push or pull things', 'Neither push nor pull things'],
        answer: 2,
        explain: 'A magnet can exert a push (when like poles repel) or a pull (when it attracts a magnetic material or an unlike pole).' },
      { id: 'mag-008', type: 'mcq', level: 1,
        stem: 'A magnet shaped like the letter U is called a ______ magnet.',
        figure: null,
        options: ['ring', 'bar', 'horseshoe', 'disc'],
        answer: 2,
        explain: 'A U-shaped magnet is called a horseshoe magnet. It still has two poles, one at each end of the U.' },
      { id: 'mag-009', type: 'mcq', level: 1,
        stem: 'Which of these is NOT a use of magnets?',
        figure: null,
        options: ['Keeping a fridge door closed', 'A compass for finding direction', 'Holding a note on a whiteboard', 'A rubber band holding pencils together'],
        answer: 3,
        explain: 'A rubber band holds things by stretching, not by magnetism. Fridge door seals, compasses and whiteboard magnets all use magnets.' },
      { id: 'mag-010', type: 'mcq', level: 1,
        stem: 'A compass needle points North-South because the needle is ______.',
        figure: null,
        options: ['a small magnet', 'made of copper', 'made of plastic', 'very light'],
        answer: 0,
        explain: 'A compass needle is a small magnet. Like a freely suspended bar magnet, it comes to rest pointing North-South.' },
      { id: 'mag-011', type: 'mcq', level: 2,
        stem: 'Mei says, "All metals are attracted by magnets." Which object shows that Mei is wrong?',
        figure: null,
        options: ['An iron nail', 'A steel paper clip', 'An aluminium drink can', 'A steel safety pin'],
        answer: 2,
        explain: 'Aluminium is a metal, but it is non-magnetic, so a magnet does not attract it. This shows that not all metals are magnetic.' },
      { id: 'mag-012', type: 'mcq', level: 2,
        stem: 'A bar magnet was dipped into a box of paper clips and lifted out. Which parts of the magnet have the strongest magnetic force?',
        figure: FIG_CLIPS_POLES,
        options: ['A only', 'B only', 'A and C', 'B and C'],
        answer: 2,
        explain: 'Most paper clips stuck at A and C, the two ends. The ends are the poles, where the magnetic force is strongest. Very few clips stuck to the middle (B).' },
      { id: 'mag-013', type: 'mcq', level: 2,
        stem: 'Siti tested four objects, P, Q, R and S, with a magnet. Which object could be made of steel?',
        figure: TBL_OBJECTS,
        options: ['P', 'Q', 'R', 'S'],
        answer: 3,
        explain: 'Steel is a magnetic material, so a steel object is attracted by a magnet. Only S was attracted. P, Q and R are non-magnetic.' },
      { id: 'mag-014', type: 'mcq', level: 2,
        stem: 'Raju has a steel bar. Which result shows for sure that the steel bar is a magnet?',
        figure: null,
        options: ['It attracts an iron nail.', 'It is attracted by the S pole of a magnet.', 'It is attracted by the N pole and also by the S pole of a magnet.', 'One end of it is repelled by the N pole of a magnet.'],
        answer: 3,
        explain: 'Repulsion is the only sure test. A magnet attracts both magnets and magnetic materials, so being attracted proves nothing. Only a magnet can repel another magnet.' },
      { id: 'mag-015', type: 'mcq', level: 2,
        stem: 'The two magnets in the picture stay stuck together. What are poles X and Y?',
        figure: FIG_CHAIN,
        options: ['X is N, Y is S', 'X is S, Y is N', 'X is N, Y is N', 'X is S, Y is S'],
        answer: 0,
        explain: 'X is next to the S pole of the first magnet and they attract, so X must be the unlike pole: N. A magnet has one N and one S pole, so Y is S.' },
      { id: 'mag-016', type: 'mcq', level: 2,
        stem: 'Three ring magnets were put on a pencil. Rings B and C float above ring A. Why?',
        figure: FIG_RINGS_ABC,
        options: ['Unlike poles of the rings face each other.', 'Like poles of the rings face each other.', 'The rings are made of a non-magnetic material.', 'The pencil is a magnet.'],
        answer: 1,
        explain: 'The rings float because they push each other apart. Like poles repel, so like poles must be facing each other between the rings.' },
      { id: 'mag-017', type: 'mcq', level: 2,
        stem: 'A paper clip is on top of a sheet of paper. When a magnet is moved under the paper, the clip moves with it. What does this show?',
        figure: FIG_THROUGH_PAPER,
        options: ['A magnet can attract a magnetic material through a non-magnetic material.', 'Paper is a magnetic material, so the magnet attracts the paper and the clip together.', 'The paper clip is a magnet, so it would move even without the magnet.', 'The paper made the magnet stronger, so it could pull the clip.'],
        answer: 0,
        explain: 'Paper is non-magnetic. The magnet still attracts the steel paper clip through the paper, so the clip follows the magnet.' },
      { id: 'mag-018', type: 'mcq', level: 2,
        stem: 'At a recycling centre, a big magnet is used to sort drink cans. What happens?',
        figure: null,
        options: ['The magnet picks up the aluminium cans only.', 'The magnet picks up both kinds of cans.', 'The magnet picks up the steel cans only.', 'The magnet picks up neither kind of can.'],
        answer: 2,
        explain: 'Steel is magnetic, so steel cans are attracted. Aluminium is non-magnetic, so aluminium cans are left behind. This separates the two kinds of cans.' },
      { id: 'mag-019', type: 'mcq', level: 2,
        stem: 'Which is the correct way to make a magnet by the stroke method?',
        figure: null,
        options: ['Stroke the steel bar back and forth with both poles of a magnet.', 'Rub the steel bar many times with a piece of cloth until it feels warm.', 'Hold the steel bar next to a magnet without moving it, for one second.', 'Stroke the steel bar many times in one direction with the same pole of a magnet.'],
        answer: 3,
        explain: 'Use ONE pole, stroke in ONE direction, and do it MANY times, lifting the magnet away at the end of each stroke.' },
      { id: 'mag-020', type: 'mcq', level: 2,
        stem: 'Which of these can be made into a magnet by the stroke method?',
        figure: null,
        options: ['A steel sewing needle', 'A copper wire', 'A strip of aluminium foil', 'A plastic straw'],
        answer: 0,
        explain: 'Only a magnetic material such as iron or steel can be made into a magnet. Copper, aluminium and plastic are non-magnetic.' },
      { id: 'mag-021', type: 'mcq', level: 2,
        stem: 'Look at the set-up. When will the iron nail behave like a magnet?',
        figure: FIG_EM_ON,
        options: ['All the time, even with the switch open', 'Only after the wire is removed from the nail and the battery', 'Only when the switch is closed and electricity flows', 'Never, because iron cannot become a magnet'],
        answer: 2,
        explain: 'This is the electrical method. The iron nail is a magnet (an electromagnet) only while electricity flows through the coiled wire.' },
      { id: 'mag-022', type: 'mcq', level: 2,
        stem: 'A bar magnet broke into two pieces. Which statement is correct?',
        figure: FIG_BROKEN,
        options: ['Each piece has an N pole and an S pole.', 'Piece 1 has only an N pole and piece 2 has only an S pole.', 'Neither piece is a magnet any more.', 'Only the bigger piece is still a magnet.'],
        answer: 0,
        explain: 'Every magnet has two poles. When a magnet breaks, each piece becomes a smaller magnet with its own N pole and S pole.' },
      { id: 'mag-023', type: 'mcq', level: 2,
        stem: 'Ben tested each magnet three times. Why did he repeat the test?',
        figure: null,
        options: ['To make the magnets stronger', 'To change the variable he was testing', 'To use up all the paper clips', 'To make his results more reliable'],
        answer: 3,
        explain: 'Repeating a test and comparing the results makes the results more reliable. One test alone could have a mistake.' },
      { id: 'mag-024', type: 'mcq', level: 2,
        stem: 'Jia Hui counted the paper clips that four magnets could attract. Which magnet is the strongest?',
        figure: TBL_CLIPS,
        options: ['A', 'B', 'C', 'D'],
        answer: 3,
        explain: 'The stronger the magnet, the more paper clips it attracts. Magnet D attracted the most (15), so it is the strongest.' },
      { id: 'mag-025', type: 'mcq', level: 3,
        stem: 'The bar chart shows the number of paper clips attracted by magnets W, X, Y and Z. Which statement is correct?',
        figure: CHART_CLIPS,
        options: ['Magnet X is the strongest because its bar is the shortest.', 'Magnet Y attracted twice as many paper clips as magnet W.', 'Magnet Z attracted fewer paper clips than magnet W.', 'All four magnets attracted the same number of clips.'],
        answer: 1,
        explain: 'Y attracted 20 clips and W attracted 10. 20 is twice 10. X attracted the fewest (5), so it is the weakest. Z (15) is stronger than W (10).' },
      { id: 'mag-026', type: 'mcq', level: 2,
        stem: 'Ken wants to find out which of his magnets is the strongest. To make it a fair test, what must he keep the same?',
        figure: null,
        options: ['The size of the paper clips', 'The magnet used', 'The number of paper clips attracted', 'The strength of the magnets'],
        answer: 0,
        explain: 'In a fair test, only ONE thing is changed: the magnet. The number of clips attracted is what he measures. Everything else, such as the size of the paper clips, must stay the same.' },
      { id: 'mag-027', type: 'mcq', level: 2,
        stem: 'In an experiment to find out which magnet is the strongest, what should be measured?',
        figure: null,
        options: ['The colour of each magnet', 'The number of paper clips each magnet attracts', 'The size of each paper clip', 'The shape of the container of paper clips'],
        answer: 1,
        explain: 'A stronger magnet attracts more paper clips, so counting the paper clips attracted tells us how strong each magnet is.' },
      { id: 'mag-028', type: 'mcq', level: 3,
        stem: 'Amir tested rod X with a magnet. Look at his results. What can he conclude about rod X?',
        figure: TBL_ROD_BOTH,
        options: ['Rod X is a magnet, because both of its ends were attracted.', 'Rod X is made of a non-magnetic material such as plastic.', 'Rod X is made of a magnetic material but it is not a magnet.', 'Rod X is made of copper, a metal that magnets attract.'],
        answer: 2,
        explain: 'Both ends of rod X are attracted to both poles and neither end is repelled. So rod X is a magnetic material (it is attracted) but not a magnet (a magnet would have one end repelled).' },
      { id: 'mag-029', type: 'mcq', level: 3,
        stem: 'Hui Min put sheets of paper between a magnet and some paper clips. Which conclusion can she make from her results?',
        figure: TBL_PAPER_SHEETS,
        options: ['Paper makes a magnet stronger.', 'A magnet cannot attract anything through paper.', 'The number of sheets does not affect the number of paper clips attracted.', 'The more sheets of paper between them, the fewer paper clips the magnet attracts.'],
        answer: 3,
        explain: 'As the sheets went up (0, 2, 4, 6), the clips went down (12, 9, 5, 2). More paper puts the clips further from the magnet, so fewer are attracted. With 6 sheets it still attracted 2 clips, so the force does act through paper.' },
      { id: 'mag-030', type: 'mcq', level: 3,
        stem: 'A steel bar was stroked many times from end A to end B with the N pole of a magnet, as shown. The bar became a magnet. What pole is end B?',
        figure: FIG_STROKE,
        options: ['N pole', 'S pole', 'Both N and S', 'End B has no pole'],
        answer: 1,
        explain: 'The end where each stroke finishes gets the opposite pole to the stroking pole. The bar was stroked with the N pole and the strokes finished at B, so B becomes an S pole.' },
      { id: 'mag-031', type: 'mcq', level: 3,
        stem: 'Aisha made electromagnets with different numbers of coils of wire round an iron nail. What do her results show?',
        figure: TBL_COILS,
        options: ['The more coils of wire, the stronger the electromagnet.', 'The more coils of wire, the weaker the electromagnet.', 'The number of coils does not affect the electromagnet.', 'The electromagnet works without a battery.'],
        answer: 0,
        explain: 'As the coils increased (10, 20, 30), the clips attracted increased (3, 7, 11). More clips means a stronger electromagnet.' },
      { id: 'mag-032', type: 'mcq', level: 3,
        stem: 'Ring A is at the bottom. Rings B and C float above it. The top face of ring A is an N pole. What are the bottom face of ring B and the top face of ring C?',
        figure: FIG_RINGS_FACES,
        options: ['Bottom of B: N, top of C: N', 'Bottom of B: S, top of C: N', 'Bottom of B: N, top of C: S', 'Bottom of B: S, top of C: S'],
        answer: 0,
        explain: 'B floats, so it repels A: the bottom of B is N (like A\'s top). The top of B is then S. C floats above B, so the bottom of C is S and the top of C is N.' },

      // ----- OEQ -----
      { id: 'mag-033', type: 'oeq', level: 1, marks: 1,
        stem: 'Name one magnetic material.',
        figure: null,
        model: 'Iron (or steel).',
        keys: [['iron', 'steel', 'nickel', 'cobalt']],
        explain: 'Iron and steel are the magnetic materials you must know. Nickel and cobalt are also correct.' },
      { id: 'mag-034', type: 'oeq', level: 1, marks: 1,
        stem: 'Give one use of magnets in your home or school.',
        figure: null,
        model: 'Magnets keep the fridge door closed. (Other answers: fridge magnets holding notes, magnetic pencil case clasp, cupboard door catch, magnets on a whiteboard, compass.)',
        keys: [['fridge', 'refrigerator', 'pencil case', 'cupboard', 'cabinet', 'door', 'whiteboard', 'compass', 'bag', 'clasp', 'notice board']],
        explain: 'Any everyday object that uses a magnet earns the mark.' },
      { id: 'mag-035', type: 'oeq', level: 1, marks: 2,
        stem: 'Lily says, "All metals are attracted by magnets." Is she correct? Give an example to explain your answer.',
        figure: null,
        model: 'No. Aluminium (or copper) is a metal but it is a non-magnetic material, so it is not attracted by a magnet.',
        keys: [['no', 'not correct', 'wrong', 'incorrect'], ['aluminium', 'copper', 'brass', 'gold', 'silver']],
        explain: 'Markers look for: "No" + a named non-magnetic metal such as aluminium or copper.' },
      { id: 'mag-036', type: 'oeq', level: 2, marks: 2,
        stem: 'Ali put a bar magnet near an iron nail and the nail moved towards the magnet. Explain why.',
        figure: null,
        model: 'The nail is made of iron, which is a magnetic material, so the magnet attracts it.',
        keys: [['iron'], ['magnetic material', 'magnetic']],
        explain: 'Markers look for: the material named (iron) + "magnetic material" + attract.' },
      { id: 'mag-037', type: 'oeq', level: 2, marks: 2,
        stem: 'Magnets P and Q are placed on a table as shown. What will happen to them? Explain why.',
        figure: FIG_LIKE_NN,
        model: 'They will move apart (repel). The N pole of P faces the N pole of Q, and like poles repel.',
        keys: [['repel', 'push apart', 'move apart', 'push away', 'move away'], ['like poles', 'same poles', 'N pole faces N pole', 'N and N']],
        explain: 'Markers look for: "repel" + "like poles". Saying only "they push" without the reason gets 1 mark.' },
      { id: 'mag-038', type: 'oeq', level: 2, marks: 2,
        stem: 'Explain why rings B and C float above ring A on the pencil.',
        figure: FIG_RINGS_ABC,
        model: 'Like poles of the ring magnets face each other, and like poles repel, so the rings push each other up and float.',
        keys: [['like poles', 'same poles'], ['repel', 'push']],
        explain: 'Markers look for: "like poles" facing each other + "repel".' },
      { id: 'mag-039', type: 'oeq', level: 2, marks: 2,
        stem: 'Ravi says his steel bar is a magnet because it attracts a paper clip. Explain why this is not enough to show that it is a magnet.',
        figure: null,
        model: 'A magnetic material that is not a magnet is also attracted. Ravi should test whether one end of the bar is repelled by a magnet, because only a magnet can repel another magnet.',
        keys: [['repel', 'repelled', 'repulsion'], ['only a magnet', 'magnetic material is also attracted', 'attracted even if', 'not a magnet']],
        explain: 'The classic trap: attraction happens with magnetic materials too. Repulsion is the only sure test that something is a magnet.' },
      { id: 'mag-040', type: 'oeq', level: 2, marks: 2,
        stem: 'A paper clip on top of a sheet of paper moves when a magnet is moved under the paper. Explain why.',
        figure: FIG_THROUGH_PAPER,
        model: 'The paper clip is made of steel, a magnetic material. The magnet attracts it through the paper because paper is non-magnetic.',
        keys: [['attract', 'magnetic force', 'pull'], ['paper is non-magnetic', 'non-magnetic', 'through the paper', 'through paper']],
        explain: 'Markers look for: the magnet attracts the clip + it acts through the non-magnetic paper.' },
      { id: 'mag-041', type: 'oeq', level: 2, marks: 3,
        stem: 'Describe how to make a steel needle into a magnet by the stroke method.',
        figure: null,
        model: 'Stroke the needle with one pole of a magnet, always in the same direction, many times. Lift the magnet away at the end of each stroke.',
        keys: [['one pole', 'same pole'], ['same direction', 'one direction'], ['many times', 'repeat', 'many strokes', 'about 50']],
        explain: 'Three marking points: ONE pole, ONE direction, MANY times.' },
      { id: 'mag-042', type: 'oeq', level: 2, marks: 2,
        stem: 'A recycling centre uses a magnet to separate steel cans from aluminium cans. Explain how this works.',
        figure: null,
        model: 'Steel is a magnetic material, so the magnet attracts the steel cans. Aluminium is non-magnetic, so the aluminium cans are not attracted and are left behind.',
        keys: [['steel is magnetic', 'steel cans are attracted', 'steel'], ['aluminium is non-magnetic', 'aluminium cans are not attracted', 'aluminium']],
        explain: 'Markers look for both parts: steel attracted (magnetic) + aluminium not attracted (non-magnetic).' },
      { id: 'mag-043', type: 'oeq', level: 3, marks: 2,
        stem: 'Sam turned ring C upside down and put it back on the pencil. It dropped down onto ring B. Explain why.',
        figure: FIG_RINGS_ABC,
        model: 'Turning ring C over made unlike poles face each other. Unlike poles attract, so ring C was pulled down onto ring B.',
        keys: [['unlike poles', 'different poles', 'opposite poles'], ['attract', 'pulled', 'stick']],
        explain: 'Markers look for: "unlike poles" + "attract". Saying it fell because of its weight earns no marks: before it was turned over, the repelling force held it up.' },
      { id: 'mag-044', type: 'oeq', level: 2, marks: 2,
        stem: 'Look at the results. Which magnet is the strongest? Explain how you know.',
        figure: TBL_CLIPS,
        model: 'Magnet D. It attracted the most paper clips (15).',
        keys: [['D'], ['most paper clips', 'most clips', '15']],
        explain: 'Markers look for: the magnet named + "attracted the most paper clips".' },
      { id: 'mag-045', type: 'oeq', level: 2, marks: 2,
        stem: 'Ben tested magnets P, Q and R three times each. (a) Which magnet is the weakest? (b) Why did he test each magnet three times?',
        figure: TBL_CLIPS_REPEAT,
        model: '(a) Magnet Q, because it attracted the fewest paper clips each time. (b) To make the results more reliable.',
        keys: [['Q'], ['reliable', 'more reliable']],
        explain: 'Weakest = fewest clips. Repeating makes results more reliable: use the word "reliable". ("To make it fair" is not accepted: fairness comes from changing only one variable.)' },
      { id: 'mag-046', type: 'oeq', level: 3, marks: 2,
        stem: 'Ken wants to find out which of his four magnets is the strongest by counting paper clips. State two things he must keep the same so that it is a fair test.',
        figure: null,
        model: 'Keep the same size and type of paper clips. Pick up the clips in the same way each time (e.g. dip each magnet into the same box of clips for the same time).',
        keys: [['size of paper clips', 'type of paper clips', 'same paper clips', 'same kind of paper clips'], ['same way', 'same method', 'same box', 'same container', 'same time', 'same distance', 'same end']],
        explain: 'Only the magnet changes. The number of paper clips is what is measured, so it is NOT something to keep the same.' },
      { id: 'mag-047', type: 'oeq', level: 3, marks: 2,
        stem: 'The switch in this set-up was opened. The paper clips that were stuck to the nail fell off. Explain why.',
        figure: FIG_EM_OFF,
        model: 'When the switch is opened, electricity stops flowing through the wire, so the iron nail is no longer a magnet and cannot attract the clips.',
        keys: [['no electricity', 'electricity stops', 'current stops', 'switch is open', 'switched off'], ['no longer a magnet', 'not a magnet', 'loses its magnetism', 'stops being a magnet']],
        explain: 'An electromagnet is a magnet only while electricity flows through the coil.' },
      { id: 'mag-048', type: 'oeq', level: 2, marks: 2,
        stem: 'Look at Aisha\'s results. What is the relationship between the number of coils and the strength of the electromagnet?',
        figure: TBL_COILS,
        model: 'The more coils of wire round the iron nail, the stronger the electromagnet (the more paper clips it attracts).',
        keys: [['more coils', 'number of coils increases', 'more turns'], ['stronger', 'more paper clips', 'more clips']],
        explain: 'A relationship answer needs both parts: "the more ..., the more ...".' },
      { id: 'mag-049', type: 'oeq', level: 2, marks: 2,
        stem: 'A scrapyard crane uses an electromagnet, not an ordinary magnet, to move steel scrap. Why is an electromagnet better for this job?',
        figure: null,
        model: 'The electromagnet can be switched off. When it is switched on it lifts the steel scrap; when it is switched off it drops the scrap where it is needed.',
        keys: [['switch off', 'switched off', 'turn off', 'stop the electricity'], ['drop', 'release', 'let go']],
        explain: 'An ordinary magnet cannot be switched off, so the scrap would stay stuck to it.' },
      { id: 'mag-050', type: 'oeq', level: 3, marks: 2,
        stem: 'Jun has a bar magnet but the N and S labels have rubbed off. He has no other magnet. How can he find out which end is the N pole?',
        figure: null,
        model: 'Hang the magnet from a string so it can turn freely. When it stops, the end pointing North is the N pole.',
        keys: [['hang', 'freely suspended', 'string', 'turn freely'], ['points north', 'pointing north', 'faces north', 'North']],
        explain: 'A freely suspended bar magnet comes to rest pointing North-South; the North-pointing end is the N pole.' },
      { id: 'mag-051', type: 'oeq', level: 3, marks: 3,
        stem: 'Wei tested rod Y with a magnet. (a) Is rod Y a magnet? (b) Which end of rod Y is its N pole? Explain your answers.',
        figure: TBL_ROD_REPEL,
        model: '(a) Yes. Rod Y is a magnet because it was repelled, and only a magnet can repel another magnet. (b) End 1 is the N pole, because it was repelled by the N pole, and like poles repel.',
        keys: [['yes', 'is a magnet'], ['repelled', 'repel', 'only a magnet'], ['End 1', 'end 1']],
        explain: 'Repulsion proves rod Y is a magnet. End 1 was repelled by N, so End 1 is also N (like poles repel). End 2 is S.' },
      // ----- Making and using magnets (extra) -----
      { id: 'mag-052', type: 'mcq', level: 1,
        stem: 'To make an electromagnet, a wire is coiled round a nail made of ______.',
        figure: null,
        options: ['copper', 'wood', 'iron', 'aluminium'],
        answer: 2,
        explain: 'The nail must be made of a magnetic material such as iron. Copper, wood and aluminium are non-magnetic, so they cannot become magnets.' },
      { id: 'mag-053', type: 'mcq', level: 2,
        stem: 'Which change will make an electromagnet stronger?',
        figure: null,
        options: ['Use fewer coils of wire round the nail', 'Use more coils of wire round the nail', 'Use fewer batteries', 'Change the iron nail to a plastic rod'],
        answer: 1,
        explain: 'More coils of wire (or more batteries) make an electromagnet stronger, so it attracts more paper clips.' },
      { id: 'mag-054', type: 'mcq', level: 3,
        stem: 'Faizal made an electromagnet and changed the number of batteries. What do his results show?',
        figure: TBL_BATTERIES,
        options: ['The number of batteries does not affect the electromagnet.', 'The more batteries he used, the weaker the electromagnet became.', 'The electromagnet attracted clips even with no battery.', 'The more batteries he used, the stronger the electromagnet became.'],
        answer: 3,
        explain: 'As the batteries went up (1, 2, 3), the paper clips attracted went up (4, 8, 12). More clips means a stronger electromagnet.' },
      { id: 'mag-055', type: 'mcq', level: 2,
        stem: 'When making a magnet by the stroke method, Tom lifts the magnet away at the end of each stroke and starts again from the same end. Why?',
        figure: FIG_STROKE,
        options: ['So that every stroke goes in the same direction', 'So that the magnet does not get hot', 'So that he can use both poles of the magnet', 'So that the steel bar does not bend'],
        answer: 0,
        explain: 'The stroke method only works if every stroke is with the same pole and in the same direction. Rubbing back and forth would undo the strokes.' },
      { id: 'mag-056', type: 'mcq', level: 3,
        stem: 'Nurul stroked steel needles with a magnet a different number of times, then counted the paper clips each needle attracted. What can she conclude?',
        figure: TBL_STROKES,
        options: ['The more strokes, the stronger the magnet made.', 'The more strokes, the weaker the magnet made.', 'The number of strokes does not matter.', 'A needle needs exactly 40 strokes to become a magnet.'],
        answer: 0,
        explain: 'As the strokes increased (10, 20, 30, 40), the clips attracted increased (1, 3, 5, 7). More strokes made a stronger magnet.' },
      { id: 'mag-057', type: 'mcq', level: 2,
        stem: 'In Nurul\'s experiment, which variable did she change?',
        figure: TBL_STROKES,
        options: ['The size of the paper clips', 'The magnet used for stroking', 'The number of paper clips attracted', 'The number of strokes'],
        answer: 3,
        explain: 'She changed the number of strokes. She measured the number of paper clips attracted. The paper clips and the magnet used must be kept the same.' },
      { id: 'mag-058', type: 'mcq', level: 1,
        stem: 'Which of these uses a magnet to keep it closed?',
        figure: null,
        options: ['A zip on a school bag', 'A magnetic pencil case cover', 'A button on a shirt', 'A shoelace'],
        answer: 1,
        explain: 'A magnetic pencil case has a magnet in the cover that attracts a magnetic material (or another magnet) on the case, keeping it closed.' },
      { id: 'mag-059', type: 'mcq', level: 2,
        stem: 'A fridge magnet sticks to the fridge door but not to a wooden cupboard door. Why?',
        figure: null,
        options: ['The wooden door is too thick.', 'The fridge is cold.', 'The fridge door is made of steel, a magnetic material.', 'The fridge door is a magnet.'],
        answer: 2,
        explain: 'The fridge door is made of steel, which is magnetic, so the magnet is attracted to it. Wood is non-magnetic.' },
      { id: 'mag-060', type: 'mcq', level: 3,
        stem: 'Look at the electromagnet. Which change will make it attract FEWER paper clips?',
        figure: FIG_EM_ON,
        options: ['Adding more coils of wire round the nail', 'Using fewer coils of wire round the nail', 'Adding another battery', 'Using more paper clips in the box'],
        answer: 1,
        explain: 'Fewer coils make the electromagnet weaker, so it attracts fewer paper clips. More coils or more batteries make it stronger.' },
      { id: 'mag-061', type: 'mcq', level: 2,
        stem: 'Which of these uses an electromagnet?',
        figure: null,
        options: ['A fridge magnet holding a note', 'A compass on a hiking trip', 'A crane that lifts and drops steel scrap', 'A magnetic pencil case cover'],
        answer: 2,
        explain: 'The scrapyard crane uses an electromagnet because it must be switched on to lift the steel and switched off to drop it. The others use ordinary magnets.' },
      { id: 'mag-062', type: 'oeq', level: 1, marks: 1,
        stem: 'What do we call a magnet made by coiling wire round an iron nail and connecting it to a battery?',
        figure: null,
        model: 'An electromagnet.',
        keys: [['electromagnet']],
        explain: 'It is a magnet only while electricity flows through the wire.' },
      { id: 'mag-063', type: 'oeq', level: 2, marks: 2,
        stem: 'State two ways to make an electromagnet stronger.',
        figure: FIG_EM_ON,
        model: 'Use more coils of wire round the iron nail. Use more batteries.',
        keys: [['more coils', 'more turns', 'coil more'], ['more batteries', 'another battery', 'add a battery']],
        explain: 'More coils and more batteries both make an electromagnet stronger.' },
      { id: 'mag-064', type: 'oeq', level: 2, marks: 2,
        stem: 'Look at Nurul\'s results. What is the relationship between the number of strokes and the strength of the magnet made?',
        figure: TBL_STROKES,
        model: 'The more strokes, the stronger the magnet made (the more paper clips it attracts).',
        keys: [['more strokes', 'number of strokes increases'], ['stronger', 'more paper clips', 'more clips']],
        explain: 'A relationship answer needs both parts: "the more strokes, the stronger the magnet".' },
      { id: 'mag-065', type: 'oeq', level: 2, marks: 2,
        stem: 'Pei Ling stroked a copper wire 50 times with a magnet. It did not become a magnet. Explain why.',
        figure: null,
        model: 'Copper is a non-magnetic material, so it cannot be made into a magnet. Only magnetic materials like iron or steel can.',
        keys: [['copper'], ['non-magnetic', 'not magnetic', 'not a magnetic material']],
        explain: 'Stroking only works on magnetic materials such as iron and steel.' },
      { id: 'mag-066', type: 'oeq', level: 3, marks: 2,
        stem: 'Tom rubbed a steel needle back and forth with a magnet many times. The needle hardly became a magnet. What did he do wrong, and what should he do instead?',
        figure: null,
        model: 'He stroked back and forth. He should stroke in one direction only, with the same pole, lifting the magnet away at the end of each stroke.',
        keys: [['back and forth', 'both directions', 'two directions'], ['one direction', 'same direction']],
        explain: 'The stroke method needs the same pole and the same direction every time.' },
      { id: 'mag-067', type: 'oeq', level: 2, marks: 2,
        stem: 'Mum dropped some steel pins on the carpet. How can she use a magnet to pick them up quickly? Explain why this works.',
        figure: null,
        model: 'Move a magnet over the carpet. The pins are made of steel, a magnetic material, so the magnet attracts them and they stick to it.',
        keys: [['move a magnet', 'use a magnet', 'magnet over'], ['steel', 'magnetic material', 'attract']],
        explain: 'Steel is magnetic, so the magnet attracts the pins. The carpet is non-magnetic, so it is not attracted.' },
      { id: 'mag-068', type: 'oeq', level: 3, marks: 2,
        stem: 'Faizal\'s electromagnet with 1 battery attracted 4 paper clips. He added a second battery and kept everything else the same. Predict how many paper clips it will attract compared with before, and explain.',
        figure: null,
        model: 'More paper clips (about 8). More batteries make the electromagnet stronger.',
        keys: [['more', '8', 'eight'], ['more batteries', 'stronger']],
        explain: 'More batteries give a stronger electromagnet, which attracts more paper clips.' },

      // ----- Hardness pass: novel devices -----
      { id: 'mag-069', type: 'oeq', level: 3, marks: 4,
        stem: 'Darren taped a bar magnet to the front of his toy car, with its N pole facing forward. Another bar magnet is fixed to a block on the wall. Darren pushed the car gently towards the wall. The car slowed down and rolled back before it touched the fixed magnet.\n(a) Which pole is end W of the fixed magnet? (1 mark)\n(b) Explain why the car rolled back before it touched the fixed magnet. (2 marks)\n(c) Darren turned the magnet on his car around, so that its S pole faced forward. He pushed the car in the same way. Predict what will happen to the car. (1 mark)',
        figure: FIG_CAR,
        model: '(a) N pole. (b) The N pole of the car\'s magnet faced end W, which is also an N pole, so like poles faced each other. Like poles repel, so the fixed magnet pushed the car away before it could touch. (c) The car will move towards the fixed magnet and stick to it, because unlike poles (S and N) attract.',
        keys: [['N pole'], ['like poles', 'same poles'], ['repel', 'push'], ['attract', 'stick', 'pulled']],
        explain: '(a) The car was pushed back, so the facing poles repel: W must be the same pole as the front of the car, N. (b) Like poles face each other + like poles repel. (c) Now S faces N: unlike poles attract, so the car is pulled to the fixed magnet.' },
      { id: 'mag-070', type: 'mcq', level: 3,
        stem: 'Mrs Tan cleans the inside of her fish tank without putting her hand in the water. A cleaning pad with a magnet inside it sits against the inside of the glass. When she moves a handle with another magnet inside it along the outside of the glass, the pad moves with it.\nWhich statements are correct?\nA: The magnets attract each other through the glass.\nB: The glass is a magnetic material.\nC: If the magnet in the pad were replaced with a plastic block, the pad would not move with the handle.',
        figure: FIG_TANK,
        options: ['A and B only', 'A and C only', 'B and C only', 'A, B and C'],
        answer: 1,
        explain: 'A is correct: magnetic force acts through non-magnetic materials such as glass and water. B is wrong: glass is non-magnetic; the two magnets attract each other, not the glass. C is correct: plastic is non-magnetic, so the magnet in the handle cannot attract it.' },
      { id: 'mag-071', type: 'oeq', level: 3, marks: 3,
        stem: 'Nadia wants a magnetic doorstop. A magnet is fixed to the wall behind the door. She will screw a bar onto the door so that the magnet holds the door open. She tested bars P, Q, R and S with the magnet.\n(a) Which bars could she use on the door? (1 mark)\n(b) Nadia chose bar P. Her brother says, "Bar P must be a magnet, because the magnet attracted it." Do you agree? Explain. (2 marks)',
        figure: TBL_DOOR,
        model: '(a) Bars P and R. (b) No, I do not agree. Bar P was only attracted, and a magnetic material such as iron or steel is also attracted by a magnet. Only a magnet can repel a magnet, so bar P could be a magnet or just a magnetic material.',
        keys: [['P and R', 'R and P'], ['magnetic material', 'also attracted'], ['only a magnet can repel', 'repel', 'repelled']],
        explain: '(a) The bar must be attracted by the magnet, so P and R. (b) "No" + attraction happens with magnetic materials too + only repulsion proves a magnet.' },
      { id: 'mag-072', type: 'mcq', level: 3,
        stem: 'Hamid is lost on a hike and wants to walk North. He puts a bar magnet on a flat piece of wood and floats it on water in a bowl, as shown. The N pole of the magnet is painted red. He waits until the wood stops turning. Which way should Hamid walk?',
        figure: FIG_BOWL,
        options: ['In the direction the unpainted end points', 'Across the magnet, at right angles to it', 'Towards any iron object the magnet turns to', 'In the direction the red end points'],
        answer: 3,
        explain: 'The floating wood lets the magnet turn freely, just like a freely suspended magnet. It comes to rest pointing North-South, and its N pole (the red end) points North.' },
      { id: 'mag-073', type: 'oeq', level: 3, marks: 4,
        stem: 'In a fishing game, the "rod" has a magnet hanging from a string, with its S pole at the bottom. Each paper fish has something stuck to its mouth, as shown in the table.\n(a) Which fish can be caught with the rod? (1 mark)\n(b) Fish C has a magnet on it, but it cannot be caught. Explain why. (2 marks)\n(c) Suggest one change to fish C so that it can be caught. (1 mark)',
        figure: TBL_FISH,
        model: '(a) Fish A only. (b) The S pole of the rod\'s magnet faces the S pole of the magnet on fish C, so like poles face each other. Like poles repel, so fish C is pushed away instead of being pulled up. (c) Turn the magnet on fish C upside down, so that its N pole faces up.',
        keys: [['fish A', 'A only'], ['like poles', 'same poles', 'S pole faces the S pole'], ['repel', 'push'], ['upside down', 'turn', 'N pole faces up']],
        explain: 'Steel is magnetic, so fish A is attracted. Aluminium (B) and copper (D) are non-magnetic. On fish C, S faces S: like poles repel. Turning its magnet over puts N facing the rod\'s S, and unlike poles attract.' },

      // ----- Strength measured by distance -----
      { id: 'mag-074', type: 'mcq', level: 3,
        stem: 'Ahmad put a steel pin on a table and slowly moved each magnet towards it. He measured the distance between the magnet and the pin when the pin first moved towards the magnet. Which shows the magnets in order from STRONGEST to WEAKEST?',
        figure: TBL_DIST,
        options: ['Q, S, P, R', 'R, P, S, Q', 'P, R, S, Q', 'R, S, P, Q'],
        answer: 1,
        explain: 'A stronger magnet can attract the pin from further away, so the LARGEST distance means the STRONGEST magnet: R (9 cm), P (6 cm), S (4 cm), Q (2 cm). "Q, S, P, R" is the trap: that is weakest to strongest.' },
      { id: 'mag-075', type: 'oeq', level: 3, marks: 3,
        stem: 'Lina put a steel pin at the 0 cm mark of a ruler. She moved each magnet slowly along the ruler towards the pin, and recorded the distance between the magnet and the pin when the pin first moved.\n(a) Which magnet is the strongest? (1 mark)\n(b) Lina\'s friend says, "Magnet B is the strongest, because the pin moved only when magnet B was very close." Do you agree? Explain. (2 marks)',
        figure: '<div>' + FIG_RULER + TBL_RULER + '</div>',
        model: '(a) Magnet C. (b) No, I do not agree. Magnet B attracted the pin only from the shortest distance (7 cm), so it is the weakest. The stronger the magnet, the further away it can attract the pin, so magnet C (15 cm) is the strongest.',
        keys: [['magnet C'], ['shortest distance', 'closest', 'nearest', '7 cm'], ['further away', 'greater distance', 'furthest', 'stronger the magnet']],
        explain: 'Bigger distance = stronger magnet. A weak magnet has to come very close before the pin moves, so B (7 cm) is the weakest, not the strongest.' },
      { id: 'mag-076', type: 'mcq', level: 2,
        stem: 'Magnets X and Y were tested by moving each one slowly towards the same pin. Which result shows that magnet X is STRONGER than magnet Y?',
        figure: null,
        options: ['X attracted the pin from 3 cm away; Y attracted it from 8 cm away.', 'X and Y both attracted the pin from 5 cm away.', 'X attracted the pin from 10 cm away; Y attracted it from 4 cm away.', 'X attracted the pin only when touching it; Y attracted it from 2 cm away.'],
        answer: 2,
        explain: 'A stronger magnet attracts the pin from further away. X attracted it from 10 cm but Y only from 4 cm, so X is stronger.' },
      { id: 'mag-077', type: 'oeq', level: 3, marks: 3,
        stem: 'Mei held a magnet at different distances above a dish of steel pins and counted the pins attracted each time. One result was not recorded.\n(a) Suggest the missing value. (1 mark)\n(b) What is the relationship between the distance and the number of pins attracted? (1 mark)\n(c) Predict the number of pins attracted when the magnet is 6 cm above the pins. (1 mark)',
        figure: TBL_PINS_DIST,
        model: '(a) 6 pins. (b) The greater the distance between the magnet and the pins, the fewer pins are attracted. (The nearer the magnet, the more pins it attracts.) (c) 0 pins (none).',
        keys: [['6', 'six'], ['fewer pins', 'fewer', 'the more pins'], ['0', 'none', 'zero']],
        explain: 'Each extra 1 cm, the number of pins goes down by 2: 10, 8, 6, 4, 2, so the next is 0. A relationship answer needs both parts: "the greater the distance, the fewer pins".' },

      // ----- Electromagnets, harder -----
      { id: 'mag-078', type: 'mcq', level: 3,
        stem: 'Ray coiled 30 turns of wire round each of four rods, W, X, Y and Z, in turn, and connected the same two batteries. The rods are made of different materials. He counted the paper clips each rod attracted.\nWhich statements are correct?\nA: Rods X and Z could be made of copper or aluminium.\nB: Rod W made the strongest electromagnet.\nC: If Ray adds a third battery, rod X will attract some paper clips.',
        figure: TBL_RODS_EM,
        options: ['A only', 'C only', 'B and C only', 'A and B only'],
        answer: 3,
        explain: 'A is correct: X and Z attracted no clips, so they did not become magnets; they could be non-magnetic materials such as copper or aluminium. B is correct: W attracted the most clips (12). C is wrong: a non-magnetic rod cannot become a magnet, however many batteries are used.' },
      { id: 'mag-079', type: 'oeq', level: 3, marks: 4,
        stem: 'Ming made three electromagnets. Each used a rod of a different material, P, Q or R, with the same number of coils and the same battery. For each one, he found the greatest distance at which it could attract a steel nail.\n(a) Which rod should be used in the electromagnet of a crane that lifts steel scrap? (1 mark)\n(b) Explain your answer to (a) using the results. (2 marks)\n(c) Suggest a material that rod Q could be made of. (1 mark)',
        figure: TBL_CRANE,
        model: '(a) Rod R. (b) Rod R attracted the nail from the greatest distance (6 cm), so it made the strongest electromagnet. The crane can then lift more (heavier) steel scrap. (c) Copper (or aluminium, plastic or wood: any non-magnetic material).',
        keys: [['rod R'], ['greatest distance', '6 cm', 'furthest'], ['strongest', 'lift more', 'heavier'], ['copper', 'aluminium', 'plastic', 'wood', 'non-magnetic']],
        explain: '(b) is Claim + Evidence + Reason: R attracted from the greatest distance [evidence], so it is the strongest electromagnet and can lift more steel scrap [reason linked to the crane]. Rod Q did not become a magnet at all, so it must be a non-magnetic material.' },
      { id: 'mag-080', type: 'mcq', level: 3,
        stem: 'Four electromagnets, W, X, Y and Z, were made with the same kind of iron nail. Only the number of coils and the number of batteries were different, as shown. Which shows them in order from WEAKEST to STRONGEST?',
        figure: TBL_EM_RANK,
        options: ['Z, X, Y, W', 'W, Y, X, Z', 'W, X, Y, Z', 'Y, W, X, Z'],
        answer: 1,
        explain: 'More coils and more batteries both make an electromagnet stronger. W (10 coils, 1 battery) is the weakest. Y has more coils than W. X has the same coils as Y but one more battery. Z has the same batteries as X but more coils, so Z is the strongest: W, Y, X, Z.' },
      { id: 'mag-081', type: 'mcq', level: 3,
        stem: 'Suresh wants to find out if the number of coils affects the strength of an electromagnet. Which two set-ups should he compare?',
        figure: TBL_EM_FAIR,
        options: ['A and B', 'B and C', 'A and C', 'C and D'],
        answer: 2,
        explain: 'In a fair test only the variable being tested (number of coils) may change. A and C differ only in the number of coils; the batteries (1) and the nail (iron) are the same. A and B differ in coils AND batteries. B and C differ only in batteries. C and D differ only in the nail.' },

      // ----- Is it a magnet? -----
      { id: 'mag-082', type: 'mcq', level: 3,
        stem: 'Three bars, K, L and M, were hung from strings. One end of each bar was brought near one end of another bar. The results are shown in the table.\nWhich statements are correct?\nA: Bars L and M are both magnets.\nB: Bar K could be a steel bar that is not a magnet.\nC: Bar K could be made of wood.',
        figure: TBL_BARS,
        options: ['A only', 'A and B only', 'B and C only', 'A, B and C'],
        answer: 1,
        explain: 'A is correct: L and M repelled, and only two magnets can repel each other. B is correct: K was attracted by both magnets, so it could be a magnetic material such as steel (attraction alone cannot show whether K is a magnet). C is wrong: wood is non-magnetic, so the magnets would not attract it.' },
      { id: 'mag-083', type: 'oeq', level: 3, marks: 3,
        stem: 'Jo stroked a wooden peg and a steel nail of the same size 30 times each with the same magnet, in the correct way. Then she dipped each one into a box of paper clips. The wooden peg attracted 0 paper clips. The steel nail attracted 5.\n(a) Explain why the wooden peg attracted no paper clips. (2 marks)\n(b) Describe how Jo can use a bar magnet to show for sure that the steel nail has become a magnet. (1 mark)',
        figure: null,
        model: '(a) Wood is a non-magnetic material, so it cannot be made into a magnet by stroking. Only a magnetic material such as steel can become a magnet. (b) Bring one pole of the bar magnet near each end of the nail in turn. If one end of the nail is repelled (pushed away), the nail is a magnet.',
        keys: [['wood'], ['non-magnetic', 'not magnetic', 'cannot be made into a magnet'], ['repel', 'repelled', 'pushed away']],
        explain: 'Stroking only works on magnetic materials. Attracting clips is good evidence, but the sure test for a magnet is repulsion: only a magnet can repel a magnet.' },

      // ----- Losing magnetism (some schools teach this) -----
      { id: 'mag-084', type: 'mcq', level: 2,
        stem: 'Which of these will NOT make a bar magnet lose its magnetism?',
        figure: null,
        options: ['Heating it strongly over a flame', 'Hitting it hard with a hammer many times', 'Dropping it onto a hard floor many times', 'Keeping it in a drawer away from heat'],
        answer: 3,
        explain: 'Some schools teach this: a magnet can lose its magnetism (become weaker) if it is heated strongly, hammered or dropped many times. Keeping it safely in a drawer does not harm it.' },
      { id: 'mag-085', type: 'oeq', level: 2, marks: 2,
        stem: 'Kumar\'s bar magnet used to pick up 15 paper clips. His little brother played with it and dropped it onto the hard floor many times. Now it picks up only 3 paper clips. Suggest why.',
        figure: null,
        model: 'Dropping the magnet onto the floor many times made it lose some of its magnetism, so it became a weaker magnet and attracts fewer paper clips.',
        keys: [['dropping', 'dropped', 'fell'], ['lose', 'lost', 'weaker', 'less magnetic']],
        explain: 'Some schools teach this: dropping, hammering or strongly heating a magnet can make it lose its magnetism. Fewer clips means a weaker magnet.' },

      // ----- Making magnets, structured -----
      { id: 'mag-086', type: 'mcq', level: 3,
        stem: 'Sara stroked a steel bar 40 times from end A to end B with the N pole of a magnet, as shown. The bar became a magnet.\nWhich statements are correct?\nA: End B of the steel bar is now an S pole.\nB: If she had stroked the bar 80 times instead, it would attract more paper clips.\nC: If she had used an aluminium bar instead, it would become a weaker magnet.',
        figure: FIG_STROKE,
        options: ['A and B only', 'A and C only', 'B and C only', 'A, B and C'],
        answer: 0,
        explain: 'A is correct: the end where each stroke finishes becomes the opposite pole to the stroking pole, so B is S. B is correct: more strokes make a stronger magnet. C is wrong: aluminium is non-magnetic, so it would not become a magnet at all.' },
      { id: 'mag-087', type: 'oeq', level: 3, marks: 4,
        stem: 'Hana stroked four identical steel nails with the same magnet, each a different number of times. Then she counted the paper clips each nail attracted.\n(a) Which variable did Hana change? (1 mark)\n(b) What is the relationship between the number of strokes and the number of paper clips attracted? (1 mark)\n(c) Predict the number of paper clips a nail stroked 50 times would attract. (1 mark)\n(d) Hana stroked an aluminium nail 40 times in the same way. It attracted no paper clips. Explain why. (1 mark)',
        figure: TBL_STROKES_2,
        model: '(a) The number of strokes. (b) The more strokes, the more paper clips the nail attracts (the stronger the magnet made). (c) 10 paper clips. (d) Aluminium is a non-magnetic material, so it cannot be made into a magnet.',
        keys: [['number of strokes'], ['more strokes, the more', 'stronger'], ['10', 'ten'], ['non-magnetic', 'not magnetic']],
        explain: 'Every 10 extra strokes gives 2 more clips (2, 4, 6, 8), so 50 strokes gives about 10. Only magnetic materials such as iron and steel can be made into magnets.' },
      { id: 'mag-088', type: 'oeq', level: 3, marks: 3,
        stem: 'Farah stroked two identical steel bars, J and K, with the same magnet. One bar was stroked 20 times and the other 60 times, but she forgot which. She then moved each bar slowly towards a pin and measured the distance when the pin was first attracted.\n(a) Which bar was stroked 60 times? (1 mark)\n(b) Explain your answer. (2 marks)',
        figure: TBL_JK,
        model: '(a) Bar K. (b) Bar K attracted the pin from a greater distance (5 cm) than bar J (2 cm), so bar K is the stronger magnet. More strokes make a stronger magnet, so bar K was stroked more times.',
        keys: [['bar K'], ['greater distance', 'further', '5 cm'], ['more strokes', 'stronger magnet']],
        explain: 'Two linked steps: larger distance = stronger magnet [evidence]; more strokes = stronger magnet [reason]. So K had 60 strokes.' }
    ]
  });
})();
