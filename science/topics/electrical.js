"use strict";
// Science Quest — topic: Electrical systems (P5, Systems). Data only; the helpers below just build SVG/HTML strings.
// Scope per MOE Primary Science Syllabus 2023, theme Systems, "Electrical System" with "Simple series and
// parallel electric circuits" (P5 Standard; PSLE 0009 from 2026). Sources checked 2026-10-30 (school
// briefings that list the 2023 syllabus topics; the PDFs themselves did not load on the day, so these are
// from search-index summaries):
//   - Lianhua Pri, P5 Parents' Briefing 2026: P5 Term 1 "Electrical Systems", "Simple Series and Parallel
//     Electric Circuits" (Foundation: series circuits only)
//     https://lianhuapri.moe.edu.sg/files/Resources/P5_Parents__Briefing_2026_Part1_LHPS_Student_Outcomes.pdf
//   - Rivervale Pri, 2025 P5/6 Science subject sharing: Systems, "Electrical Systems", "Simple Series &
//     Parallel Electric Circuits"  https://rivervalepri.moe.edu.sg/files/6__2025_P56_Sci_subject_sharing.pdf
//   (The MOE PDF itself, moe.gov.sg 2023-primary-science.pdf, did not load on the day.)
// In scope here: a closed circuit is needed for electricity to flow; parts of a circuit (cell/battery,
//   wires, bulb, switch) and their symbols; electrical conductors (metals, graphite) and insulators;
//   the number of cells in series / in parallel and of bulbs in series / in parallel and the brightness
//   of bulbs (qualitative only); what happens when one bulb fuses in series and in parallel; switches
//   that control the whole circuit or one branch; electrical safety and saving electricity.
// Deliberately LEFT OUT (uncertain at P5 level or beyond the syllabus wording): voltage and current
//   numbers, resistance, short circuits (a wire across a bulb), a cell reversed in a battery, bulb
//   brightness in mixed series-parallel circuits (only which bulbs light is asked), two-way switches,
//   electromagnets, energy conversion detail (that is the Energy theme).
(function () {
  const INK = '#1f2937';

  const svg = (w, h, label, inner) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="100%" style="max-width:${w}px;display:block;margin:0 auto" role="img" aria-label="${label}">` +
    `<rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="10" fill="#ffffff" stroke="#cbd5e1"/>${inner}</svg>`;

  const txt = (x, y, s, o = {}) =>
    `<text x="${x}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="${o.size || 15}" font-weight="${o.bold ? 700 : 400}" fill="${o.fill || INK}" text-anchor="${o.anchor || 'middle'}" dominant-baseline="middle">${s}</text>`;

  // ---------- Circuit symbols ----------
  // Every circuit is drawn as full wires first; each symbol is then laid on top with a white patch,
  // so the drawn topology is exactly the wire list (no hand-placed wire ends).
  const rot = (x, y, v, inner) => (v ? `<g transform="rotate(90 ${x} ${y})">${inner}</g>` : inner);
  const lab = (x, y, s, pos, d) => {
    const o = { above: [0, -d], below: [0, d], left: [-d, 0], right: [d, 0] }[pos];
    return txt(x + o[0], y + o[1], s, { bold: 1, size: 16 });
  };
  // Bulb: circle with a cross.
  const bulb = (x, y, c, v, pos) =>
    `<circle cx="${x}" cy="${y}" r="12" fill="#fff" stroke="${INK}" stroke-width="2.5"/>` +
    `<line x1="${x - 8.5}" y1="${y - 8.5}" x2="${x + 8.5}" y2="${y + 8.5}" stroke="${INK}" stroke-width="2"/>` +
    `<line x1="${x - 8.5}" y1="${y + 8.5}" x2="${x + 8.5}" y2="${y - 8.5}" stroke="${INK}" stroke-width="2"/>` +
    (c.lab ? lab(x, y, c.lab, pos, 27) : '');
  // Cell: long thin line (positive end) and short thick line.
  const cell = (x, y, c, v, pos) =>
    rot(x, y, v, `<rect x="${x - 9}" y="${y - 17}" width="18" height="34" fill="#fff"/>` +
      `<line x1="${x - 5}" y1="${y - 15}" x2="${x - 5}" y2="${y + 15}" stroke="${INK}" stroke-width="2.5"/>` +
      `<line x1="${x + 5}" y1="${y - 8}" x2="${x + 5}" y2="${y + 8}" stroke="${INK}" stroke-width="5"/>`) +
    (c.lab ? lab(x, y, c.lab, pos, 30) : '');
  // Switch: two terminals with a lever, lifted when open.
  const sw = (x, y, c, v, pos) =>
    rot(x, y, v, `<rect x="${x - 15}" y="${y - 6}" width="30" height="12" fill="#fff"/>` +
      (c.closed
        ? `<line x1="${x - 15}" y1="${y}" x2="${x + 15}" y2="${y}" stroke="${INK}" stroke-width="2.5"/>`
        : `<line x1="${x - 15}" y1="${y}" x2="${x + 12}" y2="${y - 15}" stroke="${INK}" stroke-width="2.5"/>`) +
      `<circle cx="${x - 15}" cy="${y}" r="3.5" fill="#fff" stroke="${INK}" stroke-width="2"/>` +
      `<circle cx="${x + 15}" cy="${y}" r="3.5" fill="#fff" stroke="${INK}" stroke-width="2"/>`) +
    (c.lab ? lab(x, y, c.lab, pos, pos === 'above' ? 31 : pos === 'left' || pos === 'right' ? 30 : 26) : '');
  // Gap between two crocodile clips X and Y.
  const gap = (x, y, c, v, pos) =>
    `<rect x="${x - 16}" y="${y - 5}" width="32" height="10" fill="#fff"/>` +
    `<circle cx="${x - 16}" cy="${y}" r="4.5" fill="${INK}"/><circle cx="${x + 16}" cy="${y}" r="4.5" fill="${INK}"/>` +
    txt(x - 16, y + (pos === 'above' ? -22 : 24), 'X', { bold: 1, size: 16 }) + txt(x + 16, y + (pos === 'above' ? -22 : 24), 'Y', { bold: 1, size: 16 });
  const PART = { bulb, cell, sw, gap };
  const dot = (x, y) => `<circle cx="${x}" cy="${y}" r="4" fill="${INK}"/>`;

  // A rectangular loop. top / bottom: slots along that side; a slot is a list of rungs (rung 0 is the
  // loop wire itself, rung 1.. are parallel paths stacked outwards); a rung is a list of parts in series.
  // left / right: parts in series on that side (drawn vertical).
  const circ = (o) => {
    const ox = o.ox || 0, oy = o.oy || 0, w = o.w || 360, mini = !!o.mini;
    const anyLab = (o.bottom || []).some((s) => s.length > 1 && s.some((r) => r.some((c) => c.lab)));
    const sp = mini ? 44 : 56, gy = mini ? (anyLab ? 54 : 40) : 62, body = mini ? 64 : 100, pad = mini ? 18 : 40;
    const top = o.top || [], bot = o.bottom || [];
    const kT = Math.max(1, ...top.map((s) => s.length)), kB = Math.max(1, ...bot.map((s) => s.length));
    const L = ox + pad, R = ox + w - pad;
    const T = oy + 42 + (kT - 1) * gy, B = T + body;
    let wires = `M${L} ${T} H${R} V${B} H${L} Z`, dots = '', parts = '', botLab = false;
    const side = (slots, y0, dir) => {
      slots.forEach((rungs, i) => {
        const cx = L + ((R - L) * (i + 1)) / (slots.length + 1);
        const maxc = Math.max(...rungs.map((r) => r.length));
        const hw = ((maxc - 1) * sp) / 2 + (rungs.length > 1 ? (mini ? 30 : 40) : 0);
        const xa = cx - hw, xb = cx + hw;
        if (rungs.length > 1) {
          const yEnd = y0 + dir * (rungs.length - 1) * gy;
          wires += ` M${xa} ${y0} V${yEnd} M${xb} ${y0} V${yEnd}`;
          for (let j = 1; j < rungs.length; j++) wires += ` M${xa} ${y0 + dir * j * gy} H${xb}`;
          for (let j = 0; j < rungs.length - 1; j++) dots += dot(xa, y0 + dir * j * gy) + dot(xb, y0 + dir * j * gy);
        }
        rungs.forEach((r, j) => {
          const y = y0 + dir * j * gy;
          r.forEach((c, k) => {
            const x = cx + (k - (r.length - 1) / 2) * sp;
            if (dir > 0 && c.lab) botLab = true;
            parts += PART[c.t](x, y, c, false, dir < 0 ? 'above' : 'below');
          });
        });
      });
    };
    side(top, T, -1);
    side(bot, B, 1);
    [['left', L], ['right', R]].forEach(([k, x]) => {
      const list = o[k] || [];
      list.forEach((c, i) => { parts += PART[c.t](x, T + ((B - T) * (i + 1)) / (list.length + 1), c, true, k); });
    });
    const title = o.title ? txt(ox + 12, oy + 17, o.title, { bold: 1, size: 16, anchor: 'start' }) : '';
    const h = B + (kB - 1) * gy + (botLab || bot.some((s) => s.some((r) => r.some((c) => c.t === 'gap'))) ? 46 : mini ? 22 : 34) - oy;
    return { s: `<path d="${wires}" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>` + dots + parts + title, h };
  };
  const fig = (o, label) => { const c = circ(o); return svg(o.w || 360, c.h, label, c.s); };
  // Two mini circuits per row, each in its own frame.
  const panels = (specs, label) => {
    let s = '', y = 6;
    for (let i = 0; i < specs.length; i += 2) {
      const row = specs.slice(i, i + 2).map((p, j) => circ(Object.assign({}, p, { mini: true, w: 178, ox: 6 + j * 182, oy: y })));
      const hh = Math.max(...row.map((r) => r.h));
      row.forEach((r, j) => { s += `<rect x="${8 + j * 182}" y="${y + 2}" width="174" height="${hh - 4}" rx="8" fill="none" stroke="#cbd5e1"/>` + r.s; });
      y += hh + 4;
    }
    return svg(372, y + 4, label, s);
  };
  const B_ = (lab) => ({ t: 'bulb', lab }), C_ = () => ({ t: 'cell' }), S_ = (lab, closed) => ({ t: 'sw', lab, closed });

  // ---------- Figures ----------
  const FIG_S1 = fig({ top: [[[C_()]]], bottom: [[[S_('S1', false)]], [[B_('A')]]] },
    'Circuit diagram: one cell, an open switch S1 and bulb A joined in one loop');
  const FIG_LABELLED = fig({ top: [[[{ t: 'cell', lab: 'P' }]]], bottom: [[[S_('Q', false)]], [[B_('R')]]] },
    'Circuit diagram with three symbols labelled P (top), Q and R (bottom)');
  const FIG_COUNT = fig({ top: [[[C_(), C_()]]], bottom: [[[B_('A')]], [[B_('B')]]], right: [S_('S1', true)] },
    'Circuit diagram: two cells, bulbs A and B and a closed switch S1, all in one loop');
  const FIG_GAP = fig({ top: [[[C_()]]], bottom: [[[B_('A')]], [[{ t: 'gap' }]]] },
    'Circuit diagram: one cell, bulb A and a gap between two clips X and Y, in one loop');
  const FIG_SER3 = fig({ top: [[[C_(), C_()]]], bottom: [[[B_('A')]], [[B_('B')]], [[B_('C')]]], left: [S_('S1', true)] },
    'Circuit diagram: two cells, a closed switch S1 and bulbs A, B and C, all in one loop');
  const FIG_SERSW = fig({ top: [[[C_()]]], bottom: [[[B_('A')]], [[S_('S1', false)]], [[B_('B')]]] },
    'Circuit diagram: one cell, then bulb A, an open switch S1 and bulb B, all in one loop');
  const FIG_PAR2 = fig({ top: [[[C_()]]], bottom: [[[B_('A')], [B_('B')]]] },
    'Circuit diagram: one cell with bulbs A and B on two separate paths');
  const FIG_PAR3 = fig({ top: [[[C_(), C_()]]], bottom: [[[B_('A')], [B_('B')], [B_('C')]]] },
    'Circuit diagram: two cells with bulbs A, B and C each on its own separate path');
  const FIG_MIXED = fig({ top: [[[C_()]], [[B_('A')]]], bottom: [[[B_('B')], [B_('C')]]] },
    'Circuit diagram: a cell and bulb A on the main path; bulbs B and C on two separate paths');
  const FIG_PARSW = fig({ top: [[[C_()]], [[S_('S1', true)]]], bottom: [[[S_('S2', false), B_('A')], [B_('B')]]] },
    'Circuit diagram: a cell and closed switch S1 on the main path; one path has open switch S2 and bulb A, the other path has bulb B');

  const MINI1 = panels([
    { title: 'W', top: [[[C_()]]], bottom: [[[B_()]]] },
    { title: 'X', top: [[[C_(), C_()]]], bottom: [[[B_()]]] },
    { title: 'Y', top: [[[C_()]]], bottom: [[[B_(), B_()]]] },
    { title: 'Z', top: [[[C_(), C_()]]], bottom: [[[B_(), B_()]]] }
  ], 'Four circuits: W one cell and one bulb; X two cells in series and one bulb; Y one cell and two bulbs in series; Z two cells in series and two bulbs in series');
  const MINI2 = panels([
    { title: 'P', top: [[[C_()]]], bottom: [[[B_()]]] },
    { title: 'Q', top: [[[C_()], [C_()]]], bottom: [[[B_()]]] },
    { title: 'R', top: [[[C_(), C_()]]], bottom: [[[B_()]]] },
    { title: 'S', top: [[[C_()]]], bottom: [[[B_()], [B_()]]] }
  ], 'Four circuits: P one cell and one bulb; Q two cells in parallel and one bulb; R two cells in series and one bulb; S one cell and two bulbs in parallel');
  const MINI_XY = panels([
    { title: 'X', top: [[[C_()]]], bottom: [[[B_('A'), B_('B')]]] },
    { title: 'Y', top: [[[C_()]]], bottom: [[[B_('C')], [B_('D')]]] }
  ], 'Circuit X: one cell with bulbs A and B in series. Circuit Y: one cell with bulbs C and D in parallel');

  // Four symbols W, X, Y, Z on short wires.
  const FIG_SYMBOLS = (() => {
    let s = '';
    const xs = [50, 140, 230, 320];
    xs.forEach((x) => { s += `<line x1="${x - 36}" y1="60" x2="${x + 36}" y2="60" stroke="${INK}" stroke-width="2.5"/>`; });
    s += cell(50, 60, {}, false) + bulb(140, 60, {}, false) + sw(230, 60, { closed: false }, false) + cell(305, 60, {}, false) + cell(335, 60, {}, false);
    ['W', 'X', 'Y', 'Z'].forEach((l, i) => { s += txt(xs[i], 108, l, { bold: 1, size: 17 }); });
    return svg(370, 130, 'Four circuit symbols: W a single cell, X a circle with a cross, Y a switch with its lever lifted, Z two cells joined', s);
  })();

  const TH = 'border:1px solid #94a3b8;padding:6px 10px;background:#e2e8f0;color:#111827';
  const TD = 'border:1px solid #94a3b8;padding:6px 10px;text-align:center';
  const table = (head, rows, caption) =>
    `<table style="border-collapse:collapse;margin:0 auto;font-size:15px">` +
    (caption ? `<caption style="padding:4px 0 6px;font-weight:600">${caption}</caption>` : '') +
    `<thead><tr>${head.map((h) => `<th style="${TH}">${h}</th>`).join('')}</tr></thead>` +
    `<tbody>${rows.map((r) => `<tr>${r.map((c) => `<td style="${TD}">${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;

  const TBL_MATERIALS = table(['Material', 'Did the bulb light up?'], [['W', 'Yes'], ['X', 'No'], ['Y', 'Yes'], ['Z', 'No']], 'Results');
  const TBL_CELLS = table(['Number of cells in series', 'Light sensor reading (units)'], [['1', '15'], ['2', '32'], ['3', '48']], 'Results');
  const TBL_BULBS = table(['Number of bulbs in series', 'Light sensor reading for one bulb (units)'], [['1', '48'], ['2', '21'], ['3', '10']], 'Results');

  SCI.registerTopic({
    id: 'electrical',
    title: 'Electrical Systems',
    emoji: '💡',
    theme: 'Systems',
    level: 'P5',
    moeRef: 'Electrical System, including Simple series and parallel electric circuits (P5), MOE Primary Science Syllabus 2023: recognise that a closed circuit is needed for electricity to flow; identify the parts of a circuit and their symbols; classify materials as electrical conductors or insulators; investigate how the number of batteries and bulbs, arranged in series or in parallel, affects the brightness of bulbs; show care when using electricity and concern for its wise use. Scope checked against Lianhua Pri P5 Parents\' Briefing 2026 and Rivervale Pri 2025 P5/6 Science subject sharing.',
    skills: {
      closed: 'Closed circuits',
      symbols: 'Circuit parts and symbols',
      conductors: 'Conductors and insulators',
      series: 'Series circuits',
      parallel: 'Parallel circuits',
      switches: 'Switches in circuits',
      safety: 'Safety and saving electricity'
    },
    misconceptions: {
      'open-circuit-flows': 'Electricity can still flow when there is a gap in the circuit, such as an open switch or a loose wire.',
      'one-wire-enough': 'A bulb can light with just one wire from the battery; it does not need a complete loop.',
      'one-cell-not-enough': 'One cell is never enough to light a bulb.',
      'position-matters': 'In a single loop, a part only affects the bulbs next to it or nearest the battery.',
      'parts-mixup': 'Mixing up the jobs of the parts of a circuit: battery, wires, bulb and switch.',
      'symbol-mixup': 'Mixing up the circuit symbols for a cell, a battery, a bulb and a switch.',
      'switch-open-closed-mixup': 'Thinking an open switch lets electricity flow and a closed switch stops it.',
      'conductor-insulator-mixup': 'Mixing up electrical conductors and insulators, such as thinking plastic or rubber lets electricity pass.',
      'graphite-insulator': 'Pencil lead (graphite) cannot conduct electricity because it is not a metal.',
      'cells-series-no-brighter': 'Adding cells in series does not make a bulb brighter.',
      'adding-part-breaks': 'Adding another cell or bulb to a closed circuit stops the bulbs from lighting.',
      'more-bulbs-brighter': 'More bulbs in a circuit always make each bulb brighter.',
      'series-bulbs-same': 'Bulbs in series are each as bright as one bulb on its own with the same battery.',
      'fuse-series-others-stay': 'When one bulb in a series circuit fuses, the other bulbs stay lit.',
      'series-parallel-mixup': 'Mixing up series (one path) and parallel (separate paths) arrangements.',
      'parallel-bulbs-dimmer': 'Bulbs in parallel are dimmer than one bulb on its own with the same battery.',
      'parallel-cells-brighter': 'Cells in parallel make a bulb brighter, just like cells in series.',
      'fuse-parallel-all-out': 'When one bulb in a parallel circuit fuses, all the bulbs go out.',
      'fuse-parallel-change': 'When one bulb in a parallel circuit fuses, the other bulbs become brighter or dimmer.',
      'switch-controls-all': 'Every switch controls every bulb, wherever it is placed in the circuit.',
      'safety-mixup': 'Mixing up safe and unsafe ways of using electricity.',
      'overload-safe': 'Plugging many appliances into one socket or adaptor is safe.',
      'standby-no-energy': 'Appliances left on standby use no electricity.',
      'energy-saving-mixup': 'Mixing up actions that save electricity with actions that waste it.',
      'table-misread': 'Reading the wrong row or column of a table, or the trend the wrong way round.',
      'changed-measured-mixup': 'Mixing up the variable that is changed with the one that is measured.'
    },
    notes: [
      { title: 'A closed circuit',
        body: 'Electricity flows only around a closed circuit: an unbroken path from one end of the battery, through the parts, and back to the other end.\nIf there is any gap (an open switch, a loose wire, a fused bulb), the circuit is open and no electricity flows.\nA bulb lights up only when electricity flows through it.' },
      { title: 'Parts of a circuit',
        body: '- Cell or battery: the source of electrical energy. A battery is two or more cells joined together.\n- Wires: made of metal, they carry electricity from part to part.\n- Bulb: gives out light when electricity flows through its filament.\n- Switch: opens or closes the circuit, so it turns things on and off.' },
      { title: 'Circuit symbols',
        body: '- Cell: a long thin line and a short thick line. The long line is the positive (+) end.\n- Battery: two or more cell symbols side by side.\n- Bulb: a circle with a cross inside.\n- Switch: two dots with a lever. Lever lifted = open (off). Lever down and touching = closed (on).\n- Wire: a straight line. A dot shows where wires join.' },
      { title: 'Conductors and insulators',
        body: 'Electrical conductors let electricity pass through: metals such as copper, iron, steel and aluminium, and graphite (pencil lead).\nElectrical insulators do not let electricity pass through: plastic, rubber, wood, glass and ceramic.\nWires are copper (a good conductor) covered with plastic (an insulator) to keep us safe.' },
      { title: 'Bulbs in series',
        body: 'In series, the parts are joined one after another on ONE path.\n- More bulbs in series: each bulb is dimmer, because less electric current flows.\n- If one bulb fuses, there is a gap in the only path, so ALL the bulbs go out.\n- One switch anywhere in the loop controls all the bulbs.' },
      { title: 'Cells in series and in parallel',
        body: 'Cells in series (joined + to -, one after another): more cells give more electric current, so the bulb is BRIGHTER.\nCells in parallel (each on its own path): the bulb is AS BRIGHT AS with one cell, but the cells last longer.' },
      { title: 'Bulbs in parallel',
        body: 'In parallel, each bulb is on its OWN separate path (branch).\n- Each bulb is as bright as one bulb on its own with the same battery.\n- If one bulb fuses, only its own path is broken. The other bulbs stay lit, just as bright as before.\n- That is why the lights in our homes are joined in parallel.' },
      { title: 'Switches',
        body: 'A switch on the main path (before the circuit splits) controls ALL the bulbs.\nA switch on one branch controls ONLY the bulb on that branch.\nIn a series circuit, opening the switch anywhere turns off every bulb.' },
      { title: 'Safety and saving electricity',
        body: 'Stay safe: never touch switches or plugs with wet hands; do not plug too many appliances into one socket (the wires can overheat and cause a fire); ask an adult to replace cables with damaged covering; never poke objects into sockets.\nSave electricity: switch off lights, fans and appliances when not in use (standby still uses electricity); choose appliances with more ticks on the energy label.' }
    ],
    items: [
      // ---------- Closed circuits ----------
      { id: 'ele-001', type: 'mcq', level: 1, syl: 'P5', skill: 'closed',
        stem: 'What is needed for a bulb in a circuit to light up?',
        figure: null,
        options: ['A closed circuit with no gaps', 'A circuit with a small gap', 'Just one wire from the battery', 'A switch that is left open'],
        answer: 0,
        miscon: { 1: 'open-circuit-flows', 2: 'one-wire-enough', 3: 'switch-open-closed-mixup' },
        optionFeedback: {
          1: 'Electricity cannot jump across a gap in a circuit. Even a tiny gap stops the flow.',
          2: 'One wire is not a loop. Electricity must go out of the battery, through the bulb and back again.',
          3: 'An open switch makes a gap in the circuit. Think about what a gap does to the flow.' },
        explain: 'Electricity flows only around a closed circuit: a complete loop from the battery, through the bulb and back to the battery.' },
      { id: 'ele-002', type: 'mcq', level: 1, syl: 'P5', skill: 'closed',
        stem: 'Look at the circuit diagram. Bulb A does not light up. Why?',
        figure: FIG_S1,
        options: ['There is only one cell in the circuit', 'Switch S1 is open, so the circuit is not closed', 'The metal wires block the electricity', 'Bulb A is too far away from the cell'],
        answer: 1,
        miscon: { 0: 'one-cell-not-enough', 2: 'conductor-insulator-mixup', 3: 'position-matters' },
        optionFeedback: {
          0: 'One cell can light one bulb. Look at the switch symbol: is its lever down or lifted?',
          2: 'Metals are conductors: they let electricity pass. Look again at the switch.',
          3: 'Distance along the wire does not matter in a closed loop. Is the loop closed, though?' },
        explain: 'The lever of S1 is lifted, so S1 is open. There is a gap, the circuit is not closed, and no electricity flows through bulb A.' },
      { id: 'ele-003', type: 'mcq', level: 1, syl: 'P5', skill: 'symbols',
        stem: 'Which part of a circuit is the source of electrical energy?',
        figure: null,
        options: ['The bulb', 'The switch', 'The wires', 'The battery'],
        answer: 3,
        miscon: { 0: 'parts-mixup', 1: 'parts-mixup', 2: 'parts-mixup' },
        optionFeedback: {
          0: 'The bulb uses electrical energy to give out light. Where does that energy come from?',
          1: 'A switch only opens or closes the circuit. It does not supply any energy.',
          2: 'Wires carry electricity from part to part. Which part supplies it in the first place?' },
        explain: 'The battery (made of cells) is the source of electrical energy. Wires carry the electricity, the switch opens and closes the circuit, and the bulb gives out light.' },
      { id: 'ele-004', type: 'oeq', level: 2, marks: 2, syl: 'P5', skill: 'closed', chain: true,
        stem: 'Farah joined a bulb, a battery and two wires. One wire was not attached to the battery. The bulb did not light up, even though the bulb and the battery were working. Explain why.',
        figure: null,
        model: 'There is a gap, so the circuit is not a closed circuit. Electricity cannot flow through the bulb.',
        keys: [['gap', 'not a closed circuit', 'not closed', 'open circuit', 'incomplete', 'not complete'], ['cannot flow', 'does not flow', 'no electricity flows', 'no current', 'not flow']],
        watchFor: ['open-circuit-flows', 'one-wire-enough'],
        technique: 'Follow the arrows',
        steps: ['Trace the path from one end of the battery, through the bulb, and back.', 'Is there a break anywhere on that path?', 'A break means the circuit is open: what happens to the electricity?', 'Write the two links in order.'],
        explain: 'In order: there is a gap, so the circuit is open (not closed) -> electricity cannot flow through the bulb, so it does not light.' },
      { id: 'ele-005', type: 'oeq', level: 2, marks: 2, syl: 'P5', skill: 'closed',
        stem: 'Dinesh built a circuit with one battery, one bulb, one switch and some wires. He closed the switch, but the bulb did not light up. Suggest two possible reasons.',
        figure: null,
        model: 'The bulb may have fused, so its filament is broken. The battery may be flat (used up). A wire may be loose.',
        keys: [['fused', 'filament is broken', 'spoilt bulb', 'bulb is broken'], ['flat', 'used up', 'no energy left', 'dead battery'], ['loose', 'not connected', 'not properly connected', 'broken wire', 'wire is broken']],
        watchFor: ['open-circuit-flows'],
        technique: 'Can we be sure?',
        steps: ['The switch is closed, so look for another gap or problem.', 'Could the bulb be faulty?', 'Could the battery have no energy left?', 'Could a wire be loose or broken? Write any two.'],
        explain: 'Any two of: the bulb has fused (broken filament); the battery is flat; a wire is loose, broken or not connected. Each one leaves no closed circuit or no source of energy.' },

      // ---------- Symbols ----------
      { id: 'ele-006', type: 'mcq', level: 1, syl: 'P5', skill: 'symbols',
        stem: 'Which symbol stands for a bulb?',
        figure: FIG_SYMBOLS,
        options: ['W', 'X', 'Y', 'Z'],
        answer: 1,
        miscon: { 0: 'symbol-mixup', 2: 'symbol-mixup', 3: 'symbol-mixup' },
        optionFeedback: {
          0: 'W is a long line and a short line: that is one cell.',
          2: 'Y has a lever that is lifted: that is an open switch.',
          3: 'Z is two cells side by side: that is a battery.' },
        explain: 'A bulb is drawn as a circle with a cross inside, which is symbol X.' },
      { id: 'ele-007', type: 'mcq', level: 1, syl: 'P5', skill: 'symbols',
        stem: 'What does the symbol labelled Q stand for?',
        figure: FIG_LABELLED,
        options: ['A closed switch', 'A bulb', 'An open switch', 'A cell'],
        answer: 2,
        miscon: { 0: 'switch-open-closed-mixup', 1: 'symbol-mixup', 3: 'symbol-mixup' },
        optionFeedback: {
          0: 'It is a switch. But is its lever down and touching, or lifted?',
          1: 'A bulb is the circle with a cross. That is R.',
          3: 'The cell is the long and short lines at the top. That is P.' },
        explain: 'Q has two terminals and a lever that is lifted, so it is an open switch.' },
      { id: 'ele-008', type: 'mcq', level: 2, syl: 'P5', skill: 'symbols',
        stem: 'Which statement correctly describes this circuit diagram?',
        figure: FIG_COUNT,
        options: ['It has one cell, two bulbs and a closed switch.', 'It has two cells, two bulbs and an open switch.', 'It has two cells, two bulbs and a closed switch.', 'It has two cells, one bulb and a closed switch.'],
        answer: 2,
        miscon: { 0: 'symbol-mixup', 1: 'switch-open-closed-mixup', 3: 'symbol-mixup' },
        technique: 'Count, then check',
        steps: ['Count the long-and-short line pairs: that is the number of cells.', 'Count the circles with crosses: that is the number of bulbs.', 'Look at the switch lever: down and touching, or lifted?', 'Choose the option that matches all three.'],
        optionFeedback: {
          0: 'Count the long-and-short line pairs at the top again. Each pair is one cell.',
          1: 'Look at S1: its lever lies flat and touches both terminals. Is that open or closed?',
          3: 'Count the circles with crosses again: A and B.' },
        explain: 'There are two cell symbols, two bulb symbols (A and B), and S1 has its lever down, so it is closed.' },

      // ---------- Conductors and insulators ----------
      { id: 'ele-009', type: 'mcq', level: 1, syl: 'P5', skill: 'conductors',
        stem: 'Which object is an electrical conductor?',
        figure: null,
        options: ['A plastic spoon', 'A rubber band', 'A wooden chopstick', 'A steel paper clip'],
        answer: 3,
        miscon: { 0: 'conductor-insulator-mixup', 1: 'conductor-insulator-mixup', 2: 'conductor-insulator-mixup' },
        optionFeedback: {
          0: 'Plastic does not let electricity pass. It is an insulator.',
          1: 'Rubber is an insulator. That is why electricians wear rubber gloves.',
          2: 'Wood is an insulator. Look for a metal.' },
        explain: 'Steel is a metal, and metals are electrical conductors. Plastic, rubber and wood are electrical insulators.' },
      { id: 'ele-010', type: 'mcq', level: 2, syl: 'P5', skill: 'conductors',
        stem: 'Bulb A is not lit. Hui Min places each object below across X and Y, one at a time.\nA: a steel paper clip\nB: a plastic ruler\nC: a copper coin\nD: a rubber eraser\nWhich objects will make bulb A light up?',
        figure: FIG_GAP,
        options: ['A and B only', 'A and C only', 'B and D only', 'A, C and D only'],
        answer: 1,
        miscon: { 0: 'conductor-insulator-mixup', 2: 'conductor-insulator-mixup', 3: 'conductor-insulator-mixup' },
        technique: 'Tick or cross',
        steps: ['Take one object at a time.', 'Is it made of a metal or graphite? Then it is a conductor: tick.', 'Plastic, rubber, wood or glass? It is an insulator: cross.', 'Choose the option with only the ticks.'],
        optionFeedback: {
          0: 'A is right. But plastic is an insulator, and the copper coin in C is a metal.',
          2: 'Plastic and rubber are both insulators. They leave the gap open.',
          3: 'A and C are right. But rubber is an insulator, so D leaves the gap open.' },
        explain: 'Steel and copper are metals, so they are conductors and close the gap. Plastic and rubber are insulators, so the circuit stays open.' },
      { id: 'ele-011', type: 'mcq', level: 2, syl: 'P5', skill: 'conductors',
        stem: 'The copper wires inside an electric cable are covered with plastic. Why?',
        figure: null,
        options: ['Plastic is an insulator, so electricity cannot reach our hands', 'Plastic is a conductor, so electricity flows faster', 'Plastic stores electricity for later use', 'Plastic is a conductor that lets extra electricity leak out'],
        answer: 0,
        miscon: { 1: 'conductor-insulator-mixup', 2: 'parts-mixup', 3: 'conductor-insulator-mixup' },
        optionFeedback: {
          1: 'Plastic does not let electricity pass. The copper inside is the conductor.',
          2: 'A cable does not store electricity: the battery or the power supply is the source.',
          3: 'Plastic is not a conductor. Think about what the covering does for someone holding the cable.' },
        explain: 'Plastic is an electrical insulator. It keeps the electricity inside the copper wire, so a person touching the cable does not get an electric shock.' },
      { id: 'ele-012', type: 'mcq', level: 3, syl: 'P5', skill: 'conductors',
        stem: 'Jamal placed four materials, W, X, Y and Z, across a gap in a closed circuit, one at a time. The results are shown. Which of these could W, X, Y and Z be?',
        figure: TBL_MATERIALS,
        options: ['W: copper, X: wood, Y: graphite, Z: steel', 'W: iron, X: rubber, Y: wood, Z: glass', 'W: steel, X: graphite, Y: copper, Z: plastic', 'W: aluminium, X: glass, Y: graphite, Z: rubber'],
        answer: 3,
        miscon: { 0: 'conductor-insulator-mixup', 1: 'conductor-insulator-mixup', 2: 'graphite-insulator' },
        technique: 'Read, compare, conclude',
        steps: ['A "Yes" means the material is a conductor. A "No" means it is an insulator.', 'So W and Y must be conductors; X and Z must be insulators.', 'Check each option, one material at a time.', 'Choose the option where all four match.'],
        optionFeedback: {
          0: 'W, X and Y fit. But steel is a metal, so Z would have lit the bulb.',
          1: 'W, X and Z fit. But wood is an insulator, so Y would not have lit the bulb.',
          2: 'Graphite (pencil lead) conducts electricity, so X would have lit the bulb.' },
        explain: 'W and Y lit the bulb, so they are conductors: aluminium and graphite. X and Z did not, so they are insulators: glass and rubber.' },
      { id: 'ele-013', type: 'mcq', level: 2, syl: 'P5', skill: 'conductors',
        stem: 'Bala wants to close a gap in a circuit so that a bulb lights up. Which object will NOT work?',
        figure: null,
        options: ['A piece of aluminium foil', 'A glass rod', 'A steel spoon', 'A copper key'],
        answer: 1,
        miscon: { 0: 'conductor-insulator-mixup', 2: 'conductor-insulator-mixup', 3: 'conductor-insulator-mixup' },
        optionFeedback: {
          0: 'Aluminium is a metal, even when it is thin foil. It conducts electricity.',
          2: 'Steel is a metal, so it conducts electricity. Look for an insulator.',
          3: 'Copper is the metal used in wires. Which object is an insulator?' },
        explain: 'Glass is an electrical insulator, so the gap stays open and the bulb does not light. The aluminium, steel and copper objects are all conductors.' },
      { id: 'ele-014', type: 'oeq', level: 2, marks: 2, syl: 'P5', skill: 'conductors', chain: true,
        stem: 'The handle of an electrician\'s screwdriver is covered with thick rubber. Explain why.',
        figure: null,
        model: 'Rubber is an electrical insulator. It does not let electricity flow through to the electrician\'s hand, so it prevents an electric shock.',
        keys: [['electrical insulator', 'insulator', 'poor conductor', 'does not conduct electricity'], ['electric shock', 'shock', 'not let electricity flow through to', 'electricity cannot reach the hand', 'electricity does not reach the hand']],
        watchFor: ['conductor-insulator-mixup'],
        technique: 'Claim, evidence, reason',
        steps: ['Is rubber a conductor or an insulator?', 'So can electricity flow through the handle?', 'What does that protect the electrician from?'],
        explain: 'Two links: rubber is an electrical insulator -> electricity cannot flow to the hand, so the electrician does not get an electric shock.' },
      { id: 'ele-015', type: 'oeq', level: 3, marks: 3, syl: 'P5', skill: 'conductors',
        stem: 'Ali placed a pencil lead (graphite) across X and Y, and bulb A lit up.\n(a) What does this show about graphite? (1 mark)\n(b) He replaced the pencil lead with a plastic ruler. Bulb A did not light up. Explain why. (2 marks)',
        figure: FIG_GAP,
        model: '(a) Graphite is an electrical conductor. (b) Plastic is an electrical insulator, so the gap between X and Y stays open. There is no closed circuit and no electricity flows through bulb A.',
        keys: [['electrical conductor', 'conductor of electricity', 'conducts electricity', 'allows electricity to flow', 'lets electricity pass'], ['electrical insulator', 'insulator', 'does not conduct electricity', 'does not allow electricity'], ['no closed circuit', 'open circuit', 'not a closed circuit', 'stays open', 'no electricity flows', 'electricity cannot flow', 'no current']],
        watchFor: ['graphite-insulator', 'conductor-insulator-mixup'],
        technique: 'Claim, evidence, reason',
        steps: ['The bulb lit with graphite: what does that tell you it lets through?', 'The bulb did not light with plastic: conductor or insulator?', 'With an insulator across the gap, is the circuit closed or open?', 'So can electricity flow through the bulb?'],
        explain: '(a) The bulb lit, so graphite lets electricity pass: it is a conductor (even though it is not a metal). (b) Plastic is an insulator -> the circuit is still open -> no electricity flows through bulb A.' },

      // ---------- Series circuits ----------
      { id: 'ele-016', type: 'mcq', level: 1, syl: 'P5', skill: 'series',
        stem: 'A bulb is lit by one cell. Kai adds a second identical cell in series with the first, joined the correct way. What happens to the bulb?',
        figure: null,
        options: ['It becomes brighter', 'It becomes dimmer', 'It stays as bright as before', 'It goes out'],
        answer: 0,
        miscon: { 1: 'cells-series-no-brighter', 2: 'cells-series-no-brighter', 3: 'adding-part-breaks' },
        optionFeedback: {
          1: 'More cells in series give more electric current, not less. What does more current do to a bulb?',
          2: 'Cells in series do change the brightness. Two cells push more electric current through the bulb.',
          3: 'The circuit is still a closed loop with the extra cell in it, so the bulb stays lit.' },
        explain: 'More cells in series give more electric current through the bulb, so it becomes brighter.' },
      { id: 'ele-017', type: 'mcq', level: 2, syl: 'P5', skill: 'series',
        stem: 'A circuit has one cell and one bulb. Nora adds a second identical bulb in series. How bright is each bulb now, compared with the single bulb before?',
        figure: null,
        options: ['Brighter', 'As bright as before', 'Not lit at all', 'Dimmer'],
        answer: 3,
        miscon: { 0: 'more-bulbs-brighter', 1: 'series-bulbs-same', 2: 'adding-part-breaks' },
        optionFeedback: {
          0: 'Two bulbs give more light in total, but look at each bulb. The same cell now lights two bulbs on one path.',
          1: 'That is true for bulbs in parallel. In series, the bulbs are on one path with the same cell.',
          2: 'The loop is still closed, so electricity still flows. It just flows less.' },
        explain: 'With more bulbs in series and the same cell, less electric current flows, so each bulb is dimmer.' },
      { id: 'ele-018', type: 'mcq', level: 2, syl: 'P5', skill: 'series',
        stem: 'All the cells are identical and all the bulbs are identical. In which circuit does a bulb light up the brightest?',
        figure: MINI1,
        options: ['W', 'X', 'Y', 'Z'],
        answer: 1,
        miscon: { 0: 'cells-series-no-brighter', 2: 'more-bulbs-brighter', 3: 'more-bulbs-brighter' },
        technique: 'Count, then check',
        steps: ['Count the cells in series in each circuit.', 'Count the bulbs in series in each circuit.', 'More cells: brighter. More bulbs in series: dimmer.', 'Which circuit has the most cells for one bulb?'],
        optionFeedback: {
          0: 'W has one cell for one bulb. Another circuit has an extra cell for its one bulb.',
          2: 'Y has one cell for two bulbs in series: its bulbs are dimmer than W\'s.',
          3: 'Z has two cells, but they light two bulbs in series. Which circuit has two cells for ONE bulb?' },
        explain: 'X has two cells in series lighting just one bulb, so its bulb is the brightest.' },
      { id: 'ele-019', type: 'mcq', level: 3, syl: 'P5', skill: 'series',
        stem: 'All the cells are identical and all the bulbs are identical. In which circuit are the bulbs the dimmest?',
        figure: MINI1,
        options: ['W', 'X', 'Y', 'Z'],
        answer: 2,
        miscon: { 0: 'more-bulbs-brighter', 1: 'cells-series-no-brighter', 3: 'cells-series-no-brighter' },
        technique: 'Count, then check',
        steps: ['For each circuit, count the cells in series and the bulbs in series.', 'Fewer cells: dimmer. More bulbs in series: dimmer.', 'Find the circuit with fewer cells AND more bulbs.'],
        optionFeedback: {
          0: 'W has one cell for one bulb. Another circuit has one cell for TWO bulbs in series.',
          1: 'X has two cells for one bulb: that is the brightest, not the dimmest.',
          3: 'Z has two bulbs in series, but it also has two cells to push the electricity.' },
        explain: 'Y has only one cell for two bulbs in series, so the least electric current flows and its bulbs are the dimmest.' },
      { id: 'ele-020', type: 'mcq', level: 2, syl: 'P5', skill: 'series',
        stem: 'Switch S1 is closed and all three bulbs are lit. Then bulb B fuses. What happens?',
        figure: FIG_SER3,
        options: ['Only bulb B goes out', 'Bulbs A and C become brighter', 'All three bulbs go out', 'Bulb A stays lit but bulb C goes out'],
        answer: 2,
        miscon: { 0: 'fuse-series-others-stay', 1: 'fuse-series-others-stay', 3: 'position-matters' },
        optionFeedback: {
          0: 'That happens in a parallel circuit. Here A, B and C share one path. What does a gap in that path do?',
          1: 'A fused bulb leaves a gap. With a gap in the only path, can any electricity flow to A and C?',
          3: 'A and C are on the same single loop. A gap anywhere in the loop affects every part of it.' },
        explain: 'A, B and C are in series on one path. When B fuses, its filament breaks and leaves a gap, so the circuit is open and all three bulbs go out.' },
      { id: 'ele-021', type: 'mcq', level: 3, syl: 'P5', skill: 'series',
        stem: 'Rui Xuan used a light sensor to measure how bright a bulb was. A higher reading means a brighter bulb. She changed the number of cells joined in series and used the same bulb each time. Which conclusion do her results support?',
        figure: TBL_CELLS,
        options: ['The more cells in series, the brighter the bulb.', 'The more cells in series, the dimmer the bulb.', 'The number of cells does not affect the brightness.', 'The more bulbs in series, the brighter each bulb.'],
        answer: 0,
        miscon: { 1: 'table-misread', 2: 'cells-series-no-brighter', 3: 'changed-measured-mixup' },
        technique: 'Read, compare, conclude',
        steps: ['What did she change? Read the first column.', 'What happened to the reading as that went up?', 'A higher reading means a brighter bulb.', 'Choose the conclusion that matches the trend.'],
        optionFeedback: {
          1: 'Look at the readings again: 15, 32, 48. Are they going up or down?',
          2: 'The readings change a lot, from 15 to 48. So the number of cells does affect brightness.',
          3: 'She kept one bulb and changed the number of CELLS. Her results say nothing about more bulbs.' },
        explain: 'As the number of cells in series went up from 1 to 3, the reading rose from 15 to 48. So the more cells in series, the brighter the bulb.' },
      { id: 'ele-022', type: 'oeq', level: 2, marks: 2, syl: 'P5', skill: 'series',
        stem: 'Mei lit a bulb with one battery. She then added a second identical bulb in series with the first.\n(a) How did the brightness of the first bulb change? (1 mark)\n(b) Explain your answer. (1 mark)',
        figure: null,
        model: '(a) It became dimmer. (b) Less electric current flows through the bulbs when there are more bulbs in series with the same battery.',
        keys: [['dimmer', 'less bright', 'not as bright'], ['less electric current', 'less current', 'smaller current', 'less electricity']],
        watchFor: ['series-bulbs-same', 'more-bulbs-brighter'],
        technique: 'Follow the arrows',
        steps: ['Same battery, more bulbs on one path.', 'Does more or less electric current flow?', 'So is each bulb brighter or dimmer?'],
        explain: 'More bulbs in series with the same battery -> less electric current flows -> each bulb is dimmer.' },
      { id: 'ele-023', type: 'oeq', level: 2, marks: 3, syl: 'P5', skill: 'series', chain: true,
        stem: 'Switch S1 is closed and all three bulbs are lit. When bulb B fuses, bulbs A and C go out too. Explain why.',
        figure: FIG_SER3,
        model: 'The bulbs are joined in series, so there is only one path for electricity. When bulb B fuses, its filament breaks and leaves a gap, so the circuit becomes open. Electricity can no longer flow through bulbs A and C.',
        keys: [['only one path', 'one path', 'single path', 'same path'], ['gap', 'open', 'broken', 'not closed'], ['no longer flow', 'cannot flow', 'does not flow', 'no electricity', 'no current']],
        watchFor: ['fuse-series-others-stay', 'position-matters'],
        technique: 'Follow the arrows',
        steps: ['How many paths are there for the electricity?', 'What does a fused bulb leave in that path?', 'Is the circuit now closed or open?', 'So can electricity reach bulbs A and C?'],
        explain: 'Three links in order: one path (series) -> B\'s broken filament leaves a gap, so the circuit is open -> no electricity flows through A and C.' },
      { id: 'ele-024', type: 'oeq', level: 3, marks: 2, syl: 'P5', skill: 'series',
        stem: 'Siti joined 1, 2 and then 3 identical bulbs in series with the same battery. Each time, she used a light sensor to measure how bright one of the bulbs was. A higher reading means a brighter bulb.\n(a) Describe how the brightness of each bulb changed as she added bulbs. (1 mark)\n(b) Explain why. (1 mark)',
        figure: TBL_BULBS,
        model: '(a) Each bulb became dimmer as more bulbs were joined in series: the reading fell from 48 to 21 to 10. (b) With more bulbs in series and the same battery, less electric current flows through each bulb.',
        keys: [['dimmer', 'decreases', 'decreased', 'less bright', 'lower', 'fell', 'fewer units'], ['less electric current', 'less current', 'smaller current', 'less electricity']],
        watchFor: ['series-bulbs-same', 'table-misread'],
        technique: 'Read, compare, conclude',
        steps: ['Read the readings from 1 bulb to 3 bulbs.', 'Are they going up or down? What does that mean for brightness?', 'Same battery, more bulbs on one path: more or less electric current?'],
        explain: '(a) The readings drop (48, 21, 10), so each bulb gets dimmer. (b) More bulbs in series with the same battery means less electric current flows.' },
      { id: 'ele-025', type: 'oeq', level: 2, marks: 2, syl: 'P5', skill: 'series',
        stem: 'Jia Hui\'s torch has one new battery and one bulb. She wants the bulb to be brighter. Suggest one change to the batteries she could make, and explain how it helps.',
        figure: null,
        model: 'She could add another battery in series with the first (adding it in parallel would not make the bulb brighter). More electric current then flows through the bulb, so it is brighter.',
        keys: [['in series', 'one after another', 'joined end to end', '+ to -'],['more electric current', 'more current', 'greater current', 'bigger current', 'more electricity']],
        watchFor: ['cells-series-no-brighter', 'parallel-cells-brighter'],
        technique: 'Follow the arrows',
        steps: ['Which arrangement of batteries makes a bulb brighter: series or parallel?', 'What does that do to the electric current?', 'And what does that do to the bulb?'],
        explain: 'Add a battery in series (not in parallel, which keeps the same brightness) -> more electric current flows -> the bulb is brighter.' },

      // ---------- Parallel circuits ----------
      { id: 'ele-026', type: 'mcq', level: 1, syl: 'P5', skill: 'parallel',
        stem: 'How are bulbs A and B arranged in this circuit?',
        figure: FIG_PAR2,
        options: ['In series, one after another on one path', 'In parallel, each on its own separate path', 'In series, each on its own separate path', 'In parallel, one after another on one path'],
        answer: 1,
        miscon: { 0: 'series-parallel-mixup', 2: 'series-parallel-mixup', 3: 'series-parallel-mixup' },
        optionFeedback: {
          0: 'Trace a path from the cell: can you go through A without going through B? Then they are not on one path.',
          2: 'Separate paths is right, but that arrangement has a different name.',
          3: 'Parallel is right, but A and B are not one after another. Each has its own path.' },
        explain: 'The wires split at the dots. A is on one path and B is on another, so A and B are in parallel.' },
      { id: 'ele-027', type: 'mcq', level: 2, syl: 'P5', skill: 'parallel',
        stem: 'All the cells are identical and all the bulbs are identical. In which circuits is each bulb as bright as the bulb in circuit P?',
        figure: MINI2,
        options: ['Q only', 'R and S only', 'Q and S only', 'Q, R and S'],
        answer: 2,
        miscon: { 0: 'parallel-bulbs-dimmer', 1: 'series-parallel-mixup', 3: 'cells-series-no-brighter' },
        technique: 'Tick or cross',
        steps: ['Q: cells in parallel. Does that change the brightness? Tick or cross.', 'R: cells in series. Does that change the brightness?', 'S: bulbs in parallel. Is each bulb as bright as a single bulb?', 'Choose the option with only the ticks.'],
        optionFeedback: {
          0: 'Q is right. Now look at S: each bulb has its own path straight to the cell.',
          1: 'S is right. But R has two cells in series, which makes its bulb brighter than P\'s.',
          3: 'Q and S are right. But two cells in series make R\'s bulb brighter than P\'s.' },
        explain: 'Q: cells in parallel give the same brightness as one cell. S: each bulb in parallel is as bright as a single bulb. R: cells in series make the bulb brighter, so R does not match P.' },
      { id: 'ele-028', type: 'mcq', level: 3, syl: 'P5', skill: 'parallel',
        stem: 'All the cells are identical and all the bulbs are identical. In which circuit does a bulb light up the brightest?',
        figure: MINI2,
        options: ['P', 'Q', 'R', 'S'],
        answer: 2,
        miscon: { 0: 'cells-series-no-brighter', 1: 'parallel-cells-brighter', 3: 'more-bulbs-brighter' },
        optionFeedback: {
          0: 'P is the plain one-cell, one-bulb circuit. Another circuit has extra help for its bulb.',
          1: 'Two cells in parallel make the cells last longer, but the bulb is only as bright as with one cell.',
          3: 'S gives more light in total, but each of its bulbs is only as bright as P\'s.' },
        explain: 'R has two cells in series lighting one bulb, so more electric current flows and its bulb is the brightest. Q and S have bulbs as bright as P\'s.' },
      { id: 'ele-029', type: 'mcq', level: 2, syl: 'P5', skill: 'parallel',
        stem: 'All three bulbs are lit. Then bulb B fuses. Which bulbs are still lit?',
        figure: FIG_PAR3,
        options: ['None of the bulbs', 'Bulb A only', 'Bulb C only', 'Bulbs A and C'],
        answer: 3,
        miscon: { 0: 'fuse-parallel-all-out', 1: 'position-matters', 2: 'position-matters' },
        optionFeedback: {
          0: 'That happens in a series circuit. Here each bulb has its own path.',
          1: 'A is still lit. Trace C\'s path: does it go through B?',
          2: 'C is still lit. Trace A\'s path: does it go through B?' },
        explain: 'A, B and C are in parallel, each on its own path. B\'s fused filament breaks only B\'s path, so A and C stay lit.' },
      { id: 'ele-030', type: 'mcq', level: 3, syl: 'P5', skill: 'parallel',
        stem: 'Three identical bulbs, A, B and C, are joined in parallel to a battery, and all three are lit. Bulb B fuses. How bright are bulbs A and C now, compared with before?',
        figure: null,
        options: ['As bright as before', 'Brighter than before', 'Dimmer than before', 'They both go out'],
        answer: 0,
        miscon: { 1: 'fuse-parallel-change', 2: 'fuse-parallel-change', 3: 'fuse-parallel-all-out' },
        optionFeedback: {
          1: 'Each bulb in parallel gets its electricity along its own path from the battery. Did A\'s path change?',
          2: 'A and C are each still on their own closed path to the same battery. Has anything on those paths changed?',
          3: 'That is what happens in series. In parallel, only B\'s path is broken.' },
        explain: 'Each bulb in parallel is on its own path to the battery. B\'s path is broken, but A\'s and C\'s paths are unchanged, so A and C stay just as bright.' },
      { id: 'ele-031', type: 'mcq', level: 3, syl: 'P5', skill: 'parallel',
        stem: 'All three bulbs are lit. Then bulb C fuses. Which bulbs are still lit?',
        figure: FIG_MIXED,
        options: ['Bulbs A and B', 'Bulb B only', 'Bulb A only', 'None of the bulbs'],
        answer: 0,
        miscon: { 1: 'series-parallel-mixup', 2: 'fuse-parallel-all-out', 3: 'fuse-parallel-all-out' },
        technique: 'Follow the arrows',
        steps: ['Start at the cell and trace a path through A, then through B, back to the cell.', 'Does that path go through C?', 'Is that path still closed?', 'Which bulbs are on it?'],
        optionFeedback: {
          1: 'B is still lit. Now look at A: it is on the main path that B\'s electricity also uses.',
          2: 'A is still lit. Trace B\'s branch: does it pass through C?',
          3: 'Only C\'s own branch is broken. Is there still a closed path through A and B?' },
        explain: 'C is on its own branch. There is still a closed path from the cell through A and B, so A and B stay lit.' },
      { id: 'ele-032', type: 'oeq', level: 2, marks: 3, syl: 'P5', skill: 'parallel', chain: true,
        stem: 'All three bulbs are lit. When bulb B fuses, bulbs A and C stay lit. Explain why.',
        figure: FIG_PAR3,
        model: 'The bulbs are in parallel, so each bulb is on its own separate path. When B fuses, only the path through B is broken. The paths through A and C are still closed circuits, so electricity still flows through A and C.',
        keys: [['own separate path', 'own path', 'separate path', 'own branch', 'separate branch', 'different paths', 'different branches'], ['only the path through B', 'only B\'s path', 'only B\'s branch', 'path through B is broken', 'branch with B', 'only that path', 'only that branch'], ['still closed', 'closed circuit', 'still complete', 'still flows']],
        watchFor: ['fuse-parallel-all-out', 'series-parallel-mixup'],
        technique: 'Follow the arrows',
        steps: ['How many paths do the bulbs have?', 'Which path does the fused bulb break?', 'Are the paths through A and C still closed?', 'So does electricity still flow through them?'],
        explain: 'Three links in order: each bulb has its own path (parallel) -> only B\'s path is broken -> A\'s and C\'s paths are still closed, so electricity still flows through them.' },
      { id: 'ele-033', type: 'oeq', level: 3, marks: 2, syl: 'P5', skill: 'parallel',
        stem: 'All three bulbs are lit. Then bulb C fuses. Explain why bulb B is still lit.',
        figure: FIG_MIXED,
        model: 'There is still a closed circuit through the cell, bulb A and bulb B, so electricity still flows through bulb B.',
        keys: [['still a closed circuit', 'closed circuit', 'complete circuit', 'closed path', 'different branch from C', 'separate branch from C', 'not on the same branch as C', "only C's branch is broken"],['electricity still flows', 'still flows', 'current flows', 'electricity flows', 'current still flows', 'electricity can flow']],
        watchFor: ['fuse-parallel-all-out'],
        technique: 'Follow the arrows',
        steps: ['Trace a path from the cell through A and B and back.', 'Does that path go through C?', 'Is it still a closed circuit?', 'So what still flows through B?'],
        explain: 'C is on its own branch, so the path through the cell, A and B is still a closed circuit and electricity still flows through B.' },
      { id: 'ele-034', type: 'oeq', level: 3, marks: 4, syl: 'P5', skill: 'parallel',
        stem: 'In Mrs Lim\'s flat, one bulb in the living room fuses, but all the other lights stay on.\n(a) How are the lights in the flat joined? Explain your answer. (2 marks)\n(b) Each light has its own switch. Explain why switching off the kitchen light does not switch off the bedroom light. (2 marks)',
        figure: null,
        model: '(a) The lights are joined in parallel. Each light is on its own separate path, so the other paths are still closed circuits. (b) The kitchen switch is only on the kitchen light\'s branch. Opening it breaks only that branch, so the bedroom light\'s branch is still a closed circuit.',
        keys: [['in parallel', 'parallel'], ['own separate path', 'own path', 'separate path', 'own branch', 'separate branch', 'different paths'], ['only on the kitchen light\'s branch', 'only on its branch', 'only on that branch', 'on a separate branch', 'on its own branch', 'only controls the kitchen light'], ['breaks only that branch', 'still a closed circuit', 'still closed', 'bedroom light\'s branch is not broken', 'not on the same branch']],
        watchFor: ['fuse-parallel-all-out', 'switch-controls-all'],
        technique: 'Claim, evidence, reason',
        steps: ['One bulb fuses but the rest stay on: series or parallel?', 'Why do the others stay on? Think about their paths.', 'Where is the kitchen switch: on the main path or on one branch?', 'Opening it breaks which branch only?'],
        explain: '(a) Parallel: each light has its own path, so a fused bulb breaks only its own path. (b) The kitchen switch is on the kitchen branch only; opening it leaves the bedroom branch closed.' },
      { id: 'ele-035', type: 'oeq', level: 3, marks: 5, syl: 'P5', skill: 'parallel',
        stem: 'Circuits X and Y use identical cells and identical bulbs. All four bulbs are lit.\n(a) Which bulb is brighter, bulb A or bulb C? (1 mark)\n(b) Explain your answer to (a). (1 mark)\n(c) Bulbs A and C then fuse at the same time. Which of the other two bulbs, B or D, stays lit? (1 mark)\n(d) Explain why the other bulb goes out. (2 marks)',
        figure: MINI_XY,
        model: '(a) Bulb C is brighter. (b) A and B are in series with one cell, so less electric current flows through bulb A than through bulb C. (c) Bulb D stays lit. (d) Bulbs A and B are on only one path. When A fuses, there is a gap, so the circuit is open and no electricity flows through B.',
        keys: [['bulb C is brighter', 'C is brighter', 'A is dimmer', 'A is less bright', 'C is the brighter'], ['less electric current', 'less current', 'more electric current', 'more current'], ['bulb D stays lit', 'D stays lit', 'D still lights', 'D is still lit', 'D lights up', 'D remains lit', 'D will stay lit'], ['only one path', 'one path', 'single path', 'same path'], ['gap', 'open', 'not closed', 'broken', 'not a closed circuit']],
        watchFor: ['series-bulbs-same', 'parallel-bulbs-dimmer', 'fuse-series-others-stay'],
        technique: 'Claim, evidence, reason',
        steps: ['X: A and B are on one path. Y: C and D each have their own path.', 'Which arrangement gives each bulb more electric current?', 'When A fuses, what happens to the only path in X?', 'When C fuses, is D\'s own path still closed?'],
        explain: '(a)(b) C is brighter: in parallel each bulb is as bright as a single bulb, but bulbs in series share less electric current. (c)(d) D stays lit on its own closed path; B goes out because A\'s fused filament leaves a gap in the only path in circuit X.' },

      // ---------- Switches ----------
      { id: 'ele-036', type: 'mcq', level: 2, syl: 'P5', skill: 'switches',
        stem: 'Switch S1 is closed and switch S2 is open, as shown. Which bulbs light up?',
        figure: FIG_PARSW,
        options: ['Bulb A only', 'Bulb B only', 'Bulbs A and B', 'Neither bulb'],
        answer: 1,
        miscon: { 0: 'switch-open-closed-mixup', 2: 'open-circuit-flows', 3: 'switch-controls-all' },
        technique: 'Follow the arrows',
        steps: ['Start at the cell and go through S1. Is S1 closed?', 'Follow the branch with S2 and A. Is it closed?', 'Follow the branch with B. Is it closed?', 'Only bulbs on closed paths light up.'],
        optionFeedback: {
          0: 'S2 is the switch on A\'s branch, and its lever is lifted. Is that branch closed?',
          2: 'S2 is open, so A\'s branch has a gap. Can electricity flow through A?',
          3: 'S2 is only on A\'s branch. B\'s branch does not pass through S2.' },
        explain: 'S1 is closed, so electricity reaches both branches. S2 is open, so A\'s branch has a gap and A stays off. B\'s branch is closed, so only B lights up.' },
      { id: 'ele-037', type: 'mcq', level: 3, syl: 'P5', skill: 'switches',
        stem: 'Look at the circuit. Which statements are correct?\nP: Switch S1 controls both bulbs.\nQ: Switch S2 controls bulb A only.\nR: Opening switch S2 makes bulb B go out.',
        figure: FIG_PARSW,
        options: ['P only', 'Q and R only', 'P, Q and R', 'P and Q only'],
        answer: 3,
        miscon: { 0: 'switch-controls-all', 1: 'switch-controls-all', 2: 'switch-controls-all' },
        technique: 'Tick or cross',
        steps: ['P: is S1 on the main path that both branches share?', 'Q: is S2 on A\'s branch only?', 'R: does B\'s branch pass through S2?', 'Choose the option with only the ticks.'],
        optionFeedback: {
          0: 'P is right. Now look at S2: which bulb is on the same branch as it?',
          1: 'Q is right. But B\'s branch does not pass through S2, so R does not hold. And check P again.',
          2: 'P and Q are right. But B has its own branch without S2, so opening S2 leaves B lit.' },
        explain: 'S1 is on the main path, so it controls both bulbs (P). S2 is on A\'s branch only, so it controls only A (Q). B\'s branch does not pass through S2, so R does not hold.' },
      { id: 'ele-038', type: 'mcq', level: 2, syl: 'P5', skill: 'switches',
        stem: 'Bulbs A and B are joined in series, with switch S1 between them. S1 is open. Which bulbs light up?',
        figure: FIG_SERSW,
        options: ['Neither bulb', 'Bulb A only', 'Bulb B only', 'Both bulbs'],
        answer: 0,
        miscon: { 1: 'position-matters', 2: 'position-matters', 3: 'open-circuit-flows' },
        optionFeedback: {
          1: 'A is nearer the cell, but there is only one loop. A gap anywhere in that loop stops the flow everywhere.',
          2: 'B is on the same single loop as A. Can electricity get round the loop with S1 open?',
          3: 'S1 is open, so there is a gap. Can electricity flow across a gap?' },
        explain: 'In a series circuit there is only one path. The open switch S1 leaves a gap in it, so no electricity flows and neither bulb lights, wherever the switch is placed.' },
      { id: 'ele-039', type: 'oeq', level: 1, marks: 2, syl: 'P5', skill: 'switches', chain: true,
        stem: 'Wei Jie built this circuit. Bulb A does not light up. What should he do to make bulb A light up? Explain how this works.',
        figure: FIG_S1,
        model: 'He should close switch S1. Then the circuit becomes a closed circuit, so electricity can flow through bulb A.',
        keys: [['close switch S1', 'close S1', 'close the switch', 'closing', 'switch it on', 'press the switch', 'turn on the switch'], ['closed circuit', 'complete circuit', 'circuit is complete', 'electricity can flow', 'current can flow', 'no gap']],
        watchFor: ['switch-open-closed-mixup'],
        technique: 'Follow the arrows',
        steps: ['Find the switch. Is its lever lifted or down?', 'What must he do to the switch?', 'What does that do to the circuit?'],
        explain: 'Two links: close S1 -> the circuit becomes closed, so electricity flows through bulb A.' },
      { id: 'ele-040', type: 'oeq', level: 3, marks: 5, syl: 'P5', skill: 'switches',
        stem: 'Look at the circuit. S1 is closed and S2 is open.\n(a) Nadia wants both bulbs to light up. What must she do? (1 mark)\n(b) Explain why bulb A is not lit now. (2 marks)\n(c) Explain why opening S1 would make both bulbs go out. (2 marks)',
        figure: FIG_PARSW,
        model: '(a) She must close switch S2. (b) S2 is on the same branch as bulb A, so that branch is not a closed circuit. No electricity can flow through bulb A. (c) S1 is on the main path shared by both branches. Opening S1 leaves a gap in that shared path, so no electricity flows to either branch.',
        keys: [['close switch S2', 'close S2', 'closes S2', 'closing S2', 'switch S2 on', 'switch on S2'], ['not a closed circuit', 'not closed', 'open circuit', 'gap', 'broken'], ['no electricity can flow through bulb A', 'no electricity flows through A', 'cannot flow through bulb A', 'cannot flow through A', 'no current'], ['main path', 'shared', 'main part', 'main wire', 'before the circuit splits', 'common path'], ['no electricity flows to either', 'no electricity flows', 'cannot flow', 'no current', 'neither branch']],
        watchFor: ['switch-controls-all', 'switch-open-closed-mixup'],
        technique: 'Follow the arrows',
        steps: ['Which switch is on A\'s branch only?', 'With that switch open, is A\'s branch closed?', 'Where is S1: on one branch, or on the path both branches share?', 'With a gap on the shared path, can electricity reach any branch?'],
        explain: '(a) Close S2. (b) Open S2 -> A\'s branch is not closed -> no electricity through A. (c) S1 is on the shared main path -> opening it leaves a gap before the circuit splits -> no electricity reaches either branch.' },
      { id: 'ele-041', type: 'mcq', level: 1, syl: 'P5', skill: 'switches',
        stem: 'What does a switch do in a circuit?',
        figure: null,
        options: ['It gives the circuit more electrical energy', 'It makes the bulb brighter', 'It opens or closes the circuit', 'It changes metal wires into insulators'],
        answer: 2,
        miscon: { 0: 'parts-mixup', 1: 'parts-mixup', 3: 'conductor-insulator-mixup' },
        optionFeedback: {
          0: 'The battery supplies the energy. A switch only makes or breaks the path.',
          1: 'A switch turns a bulb on or off. It does not change how bright the bulb is.',
          3: 'A switch does not change what the wires are made of. It makes or removes a gap.' },
        explain: 'A switch opens the circuit (makes a gap: off) or closes it (no gap: on).' },

      // ---------- Safety and saving electricity ----------
      { id: 'ele-042', type: 'mcq', level: 1, syl: 'P5', skill: 'safety',
        stem: 'Which of these is NOT safe?',
        figure: null,
        options: ['Drying your hands before touching a switch', 'Switching off a fan before cleaning it', 'Keeping electric cables away from water', 'Touching a switch with wet hands'],
        answer: 3,
        miscon: { 0: 'safety-mixup', 1: 'safety-mixup', 2: 'safety-mixup' },
        optionFeedback: {
          0: 'Drying your hands first is the safe thing to do. Look for the unsafe one.',
          1: 'Switching off first keeps you safe while cleaning. Which choice is risky?',
          2: 'Keeping cables away from water is safe. Which choice brings water near electricity?' },
        explain: 'Water on our hands lets electricity pass into the body more easily, so touching a switch with wet hands can give an electric shock.' },
      { id: 'ele-043', type: 'mcq', level: 2, syl: 'P5', skill: 'safety',
        stem: 'Which of these are safe ways to use electricity at home?\nA: Plugging many appliances into one adaptor\nB: Asking an adult to replace a cable with cracked covering\nC: Pulling a plug out by its cable\nD: Switching off the power before unplugging a kettle',
        figure: null,
        options: ['A and B only', 'A, C and D only', 'C and D only', 'B and D only'],
        answer: 3,
        miscon: { 0: 'overload-safe', 1: 'overload-safe', 2: 'safety-mixup' },
        technique: 'Tick or cross',
        steps: ['Take one statement at a time.', 'Could it cause an electric shock or a fire? Cross it.', 'Does it keep people safe? Tick it.', 'Choose the option with only the ticks.'],
        optionFeedback: {
          0: 'B is safe. But too many appliances on one adaptor can make the wires overheat and start a fire.',
          1: 'D is safe. But A can overheat the wires, and pulling the cable in C can damage it.',
          2: 'D is safe. But pulling on the cable can loosen the wires inside or crack the covering.' },
        explain: 'B and D are safe. A can overheat the wires and cause a fire. C can damage the cable and expose the wires inside.' },
      { id: 'ele-044', type: 'mcq', level: 2, syl: 'P5', skill: 'safety',
        stem: 'Which action saves electricity at home?',
        figure: null,
        options: ['Leaving the television on standby overnight', 'Opening the fridge door many times', 'Switching off lights and fans when leaving a room', 'Setting the air-conditioner to its lowest temperature'],
        answer: 2,
        miscon: { 0: 'standby-no-energy', 1: 'energy-saving-mixup', 3: 'energy-saving-mixup' },
        optionFeedback: {
          0: 'A television on standby still uses a little electricity all night.',
          1: 'Each time the door opens, cool air escapes and the fridge uses more electricity to cool down again.',
          3: 'A lower setting makes the air-conditioner work harder and use more electricity.' },
        explain: 'Switching off lights and fans when no one is using them stops them from using electricity.' },
      { id: 'ele-045', type: 'oeq', level: 2, marks: 2, syl: 'P5', skill: 'safety', chain: true,
        stem: 'The plastic covering of a hair dryer\'s cable is cracked, and the metal wire inside can be seen. Explain why it is dangerous to use the hair dryer.',
        figure: null,
        model: 'The metal wire is an electrical conductor and is no longer covered by the insulator. If someone touches it, electricity can flow through the person\'s body and give an electric shock.',
        keys: [['electrical conductor', 'conductor', 'conducts electricity', 'not covered by the insulator', 'no insulator'], ['electric shock', 'shock', 'fire', 'flow through the person', 'flow through the body', 'flow through your body']],
        watchFor: ['safety-mixup', 'conductor-insulator-mixup'],
        technique: 'Follow the arrows',
        steps: ['Is the metal wire a conductor or an insulator?', 'What normally stops electricity from reaching your hand?', 'If you touch the bare wire, where can the electricity go?'],
        explain: 'Two links: the bare metal wire is a conductor with no insulating cover -> touching it lets electricity flow through the body, giving an electric shock (a fire is also possible).' },
      { id: 'ele-046', type: 'oeq', level: 3, marks: 3, syl: 'P5', skill: 'safety', chain: true,
        stem: 'Most of Singapore\'s electricity is made in power stations that burn natural gas. Explain how switching off appliances that are not in use helps the environment.',
        figure: null,
        model: 'Less electricity needs to be generated, so less fuel is burnt in the power stations. This means less carbon dioxide and other polluting gases are released into the air.',
        keys: [['less electricity', 'less electrical energy', 'less power needs', 'less electricity needs to be generated', 'less electricity is used'],['less fuel', 'less natural gas', 'less gas is burnt', 'burn less'], ['less carbon dioxide', 'less pollution', 'fewer polluting', 'less polluting', 'fewer harmful gases', 'less harmful gases', 'global warming']],
        watchFor: ['energy-saving-mixup', 'standby-no-energy'],
        technique: 'Follow the arrows',
        steps: ['Switching off: does the country need more or less electricity?', 'So do the power stations burn more or less fuel?', 'What does burning less fuel mean for the air?'],
        explain: 'Three links in order: less electricity needed -> less fuel burnt -> less carbon dioxide and pollution released into the air.' }
    ]
  });
})();
