"use strict";
// Science Quest — topic: Human respiratory and circulatory systems (P5, Systems). Data only; the helpers
// below just build SVG/HTML strings.
// Scope per MOE Primary Science Syllabus 2023, theme Systems, "Human System (respiratory and circulatory
// systems)" (P5 block, examined at PSLE 0009 from 2026). Sources checked 2026-10-30 (school briefings
// quoting the 2023 syllabus; the PDFs themselves would not download on the day, so search-result
// summaries were used):
//   - Shuqun Pri, P5 Science Handbook / P5 Foundation Science Handbook: P5 "Human System (respiratory and
//     circulatory systems)"  https://www.shuqunpri.moe.edu.sg/files/P5_Science_Handbook.pdf
//   - Lianhua Pri, P5 Parents' Briefing 2026: human respiratory and circulatory systems taught in P5 Term 2
//     https://lianhuapri.moe.edu.sg/files/Resources/P5_Parents__Briefing_2026_Part1_LHPS_Student_Outcomes.pdf
//   - Jun Yuan Pri, 2025 P5 Science Curriculum Briefing: core ideas "composition of air; parts and functions
//     of human respiratory and circulatory systems"; detailed knowledge such as alveoli or heart chambers
//     and valves is not required  https://junyuanpri.moe.edu.sg/files/2025_P5_SCI_Curriculum_Briefing_Slides.pdf
//   - Kheng Cheng Pri, Parents' Briefing Primary 5 Science
//     https://khengcheng.moe.edu.sg/files/Parents/Parents__Briefing___Primary_5_Science.pdf
//   (The MOE PDF itself, moe.gov.sg 2023-primary-science.pdf, did not load on the day.)
// In scope here: nose, windpipe, lungs and air sacs; oxygen passes from the air sacs into the blood and
//   carbon dioxide passes from the blood into the air sacs to be breathed out; air breathed out has less
//   oxygen (but still some), more carbon dioxide, and about the same nitrogen; the heart pumps blood
//   through blood vessels; blood carries oxygen and digested food to all parts, and carbon dioxide from all
//   parts to the lungs; the two systems working together (and with the digestive system); breathing rate
//   and pulse rate rise during exercise and fall back after it; fair tests on exercise.
// Deliberately LEFT OUT: gills of fish and the breathing parts of other animals (could not confirm they
//   are in the 2023 P5 outcomes), heart chambers and valves, the names artery / vein / capillary, the word
//   alveoli, the diaphragm, plant respiration. The P4 digestive system lives in body-systems.js (hidden);
//   digested food entering the blood appears here only as the link between the systems.
(function () {
  const INK = '#1f2937', LINE = '#475569', BLUE = '#2563eb', PINK = '#f9c6cf', REDB = '#dc2626', SKIN = '#fde7d4';

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
  // Head and chest with four lettered parts: A nose, B windpipe, C lung, D heart.
  const FIG_BODY = (() => {
    let s = `<circle cx="180" cy="54" r="36" fill="${SKIN}" stroke="${LINE}" stroke-width="1.5"/>`;
    s += `<rect x="166" y="88" width="28" height="20" fill="${SKIN}" stroke="${LINE}" stroke-width="1.5"/>`;
    s += `<path d="M110 300 L110 140 Q110 108 150 106 L210 106 Q250 108 250 140 L250 300" fill="${SKIN}" stroke="${LINE}" stroke-width="1.5"/>`;
    s += `<path d="M180 50 L172 66 L188 66 Z" fill="#f4b88f" stroke="${LINE}"/>`;
    s += `<path d="M180 66 L180 168" stroke="#93c5fd" stroke-width="10"/>`;
    s += `<g fill="none" stroke="#93c5fd" stroke-width="6"><path d="M180 166 L156 182"/><path d="M180 166 L204 182"/></g>`;
    s += `<ellipse cx="146" cy="214" rx="28" ry="54" fill="${PINK}" stroke="#be123c"/><ellipse cx="214" cy="214" rx="28" ry="54" fill="${PINK}" stroke="#be123c"/>`;
    s += `<path d="M190 236 C 178 222, 174 246, 192 262 C 210 246, 206 222, 194 236 Z" fill="${REDB}" stroke="#7f1d1d"/>`;
    s += lead(84, 58, 176, 60) + txt(70, 58, 'A', { bold: 1, size: 17 });
    s += lead(84, 128, 178, 128) + txt(70, 128, 'B', { bold: 1, size: 17 });
    s += lead(84, 214, 128, 214) + txt(70, 214, 'C', { bold: 1, size: 17 });
    s += lead(286, 248, 200, 248) + txt(300, 248, 'D', { bold: 1, size: 17 });
    return svg(360, 304, 'The head and chest of a person with four parts labelled: A at the nose, B at the tube in the neck, C at the left lung and D at the heart between the lungs', s);
  })();

  // An air sac with a blood vessel beside it; arrow X goes from the air sac into the blood, arrow Y from the blood into the air sac.
  const FIG_AIRSAC = (() => {
    let s = `<path d="M40 10 L68 80" stroke="#93c5fd" stroke-width="14"/>`;
    s += `<circle cx="120" cy="130" r="78" fill="#fde2e4" stroke="#be123c" stroke-width="2"/>`;
    s += txt(110, 130, 'air sac', { size: 15, bold: 1 }) + txt(80, 30, 'air in and out', { size: 13, anchor: 'start' });
    s += `<path d="M262 236 C 236 180, 236 90, 266 16" fill="none" stroke="${REDB}" stroke-width="18"/>`;
    s += txt(302, 120, 'blood', { size: 13 }) + txt(302, 137, 'vessel', { size: 13 });
    s += arrow(176, 168, 236, 182) + txt(204, 198, 'X', { bold: 1, size: 17 });
    s += arrow(238, 92, 178, 84) + txt(208, 68, 'Y', { bold: 1, size: 17 });
    return svg(360, 244, 'An air sac in the lungs with a blood vessel next to it. Arrow X points from the air sac into the blood vessel. Arrow Y points from the blood vessel into the air sac', s);
  })();

  // Blood flow loop: lungs (top), heart (middle), other body parts (bottom), with arrows P, Q, R, S.
  const FIG_LOOP = (() => {
    const box = (x, y, w, h, t, fill) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${fill}" stroke="${LINE}" stroke-width="1.5"/>` + txt(x + w / 2, y + h / 2, t, { size: 15, bold: 1 });
    let s = box(120, 16, 120, 40, 'Lungs', PINK) + box(130, 122, 100, 40, 'Heart', '#fecaca') + box(70, 228, 220, 40, 'Other body parts', '#e0f2fe');
    s += arrow(152, 58, 152, 120) + txt(132, 90, 'R', { bold: 1, size: 17 });
    s += arrow(208, 120, 208, 58) + txt(228, 90, 'S', { bold: 1, size: 17 });
    s += arrow(208, 164, 208, 226) + txt(228, 196, 'P', { bold: 1, size: 17 });
    s += arrow(152, 226, 152, 164) + txt(132, 196, 'Q', { bold: 1, size: 17 });
    return svg(360, 284, 'Blood flow between the lungs, the heart and other body parts. R goes from the lungs to the heart, S from the heart to the lungs, P from the heart to other body parts, Q from other body parts to the heart', s);
  })();

  // Two test tubes of limewater: A has breathed-out air blown in through a straw; B has room air pumped in.
  const FIG_LIME = (() => {
    const tube = (x, tag) => `<path d="M${x - 22} 70 L${x - 22} 200 Q${x - 22} 222 ${x} 222 Q${x + 22} 222 ${x + 22} 200 L${x + 22} 70" fill="none" stroke="${LINE}" stroke-width="2"/>` +
      `<path d="M${x - 20} 130 L${x - 20} 200 Q${x - 20} 220 ${x} 220 Q${x + 20} 220 ${x + 20} 200 L${x + 20} 130 Z" fill="#e0f2fe"/>` +
      `<line x1="${x}" y1="30" x2="${x}" y2="206" stroke="#a3a3a3" stroke-width="5"/>` + txt(x, 240, tag, { bold: 1, size: 16 });
    let s = tube(90, 'A') + tube(270, 'B');
    s += txt(90, 18, 'breathed-out air', { size: 13 }) + txt(270, 18, 'room air from a pump', { size: 13 });
    s += txt(180, 170, 'limewater', { size: 13 }) + lead(144, 170, 112, 170) + lead(216, 170, 248, 170);
    return svg(360, 254, 'Two test tubes of limewater. Breathed-out air is blown into tube A through a straw. Room air is pumped into tube B', s);
  })();

  const GRAPH_PULSE = graph([[0, 70], [2, 70], [4, 120], [6, 140], [8, 140], [10, 140], [12, 110], [14, 85], [16, 74], [18, 72], [20, 70]],
    20, 2, 160, 20, 'Time (min)', 'Pulse rate (beats per min)', 'Line graph of pulse rate over 20 minutes: 70 from 0 to 2 minutes, rising to 140 at 6 minutes, staying at 140 until 10 minutes, then falling to 74 at 16 minutes and 70 at 20 minutes');

  const TBL_AIR = table(['Gas', 'Air breathed in (%)', 'Air breathed out (%)'],
    [['Nitrogen', '78', '78'], ['Oxygen', '21', '16'], ['Carbon dioxide', '0.04', '4']], 'Gases in the air');

  const TBL_ACTIVITY = table(['Activity', 'Breaths per minute'],
    [['Sitting', '16'], ['Walking', '22'], ['Skipping', '36'], ['Cycling slowly', '26']], 'Hafiz\'s breathing rate during each activity');

  const TBL_SKIP = table(['Time spent skipping (min)', 'Pulse rate (beats per min)'],
    [['0', '72'], ['1', '100'], ['2', '118'], ['3', '130']], 'Results');

  const TBL_TWO = table(['', 'Ali', 'Ben'],
    [['Pulse rate at rest (beats per min)', '72', '75'], ['Just after a 1 km run', '130', '150'], ['After 5 min of rest', '80', '110']], 'Pulse rates');

  SCI.registerTopic({
    id: 'human-transport',
    title: 'Breathing and blood',
    emoji: '🫀',
    theme: 'Systems',
    level: 'P5',
    moeRef: 'Human System: respiratory and circulatory systems (P5), MOE Primary Science Syllabus 2023, theme Systems: identify the organs of the human respiratory system (nose, windpipe, lungs) and circulatory system (heart, blood vessels, blood) and describe their functions; describe how oxygen and carbon dioxide are exchanged in the air sacs of the lungs; recognise that blood carries oxygen, digested food and carbon dioxide; describe how the respiratory and circulatory systems work together; investigate breathing and pulse rates during exercise. Scope checked against 2025/2026 school briefings (Shuqun, Lianhua, Jun Yuan, Kheng Cheng; URLs in the file header).',
    skills: {
      respiratory: 'Breathing parts',
      gasex: 'Gases in the air sacs',
      circulatory: 'Heart, blood and blood vessels',
      together: 'Systems working together',
      exercise: 'Exercise and fair tests'
    },
    misconceptions: {
      'air-to-stomach': 'Air we breathe in goes to the stomach.',
      'resp-order': 'Getting the order of nose, windpipe, lungs and air sacs wrong.',
      'parts-mixup': 'Mixing up the jobs of the heart, lungs, windpipe and blood vessels.',
      'heart-breathes': 'The heart takes in oxygen from the air.',
      'gas-place': 'Oxygen enters the blood in the nose, windpipe or heart instead of the air sacs.',
      'gas-swap': 'Mixing up which gas enters the blood in the lungs and which gas leaves it.',
      'exhale-no-oxygen': 'Air breathed out has no oxygen left in it.',
      'exhale-only-co2': 'Air breathed out is mostly carbon dioxide.',
      'co2-none-in-air': 'The air we breathe in has no carbon dioxide at all.',
      'nitrogen-used': 'The body uses up the nitrogen in the air we breathe in.',
      'blood-carries-one': 'Blood carries only oxygen.',
      'co2-not-carried': 'Carbon dioxide is not carried by the blood.',
      'undigested-in-blood': 'Undigested food is carried in the blood.',
      'digested-food-lungs': 'Digested food enters the blood in the lungs.',
      'systems-separate': 'The respiratory and circulatory systems each do their job alone, without the other.',
      'exercise-less-oxygen': 'During exercise the muscles need less oxygen, or we breathe faster just to cool down.',
      'heart-slows-exercise': 'The heart beats more slowly during exercise so the body can rest.',
      'pulse-is-breathing': 'Pulse rate and breathing rate are the same thing.',
      'instant-recovery': 'Pulse rate falls back to the resting rate the moment exercise stops.',
      'graph-misread': 'Reading a value from the wrong axis, row or point of a graph or table.',
      'read-wrong-end': 'Picking a middle value when the question needs the largest or the smallest.',
      'changed-measured-mixup': 'Mixing up the variable that is changed, the variable that is measured and the variables kept the same.'
    },
    notes: [
      { title: 'The respiratory system',
        body: 'When you breathe in, air travels:\nnose → windpipe → lungs → air sacs.\nThe lungs are full of tiny air sacs. Each air sac has thin walls and is wrapped in blood vessels.' },
      { title: 'Gases in the air sacs',
        body: 'In the air sacs:\n- OXYGEN from the air passes into the blood.\n- CARBON DIOXIDE passes out of the blood into the air sacs, and is breathed out.\nSo air breathed out has LESS oxygen (but still some) and MORE carbon dioxide. The nitrogen stays about the same: the body does not use it. Breathed-out air also has more water vapour.' },
      { title: 'The circulatory system',
        body: 'The heart pumps blood around the body through blood vessels. Blood carries:\n- oxygen from the lungs to all parts of the body\n- digested food from the small intestine to all parts of the body\n- carbon dioxide from all parts of the body to the lungs, to be breathed out.' },
      { title: 'Working together',
        body: 'The respiratory system takes in oxygen and removes carbon dioxide. The circulatory system carries these gases between the lungs and every part of the body. The digestive system gives the blood digested food to carry. The body needs all three working together.' },
      { title: 'During exercise',
        body: 'Working muscles need more energy, so they need more oxygen and digested food, and they make more carbon dioxide.\n- You breathe faster and deeper: more oxygen in, more carbon dioxide out.\n- Your heart beats faster: blood is pumped faster, so more oxygen reaches the muscles and more carbon dioxide is taken away.\nAfter exercise, both rates fall back to the resting rate gradually, not at once.' },
      { title: 'Pulse rate',
        body: 'Each beat of the heart pushes blood through the blood vessels. You can feel this as a pulse at your wrist or neck. Pulse rate = number of beats in 1 minute.\nCounted 18 beats in 15 seconds? 18 × 4 = 72 beats per minute.\nPulse rate is NOT the same as breathing rate.' },
      { title: 'Fair tests with exercise',
        body: 'Change ONE variable (for example, the time spent skipping). Measure ONE thing (for example, the pulse rate). Keep everything else the same: the same person, the same speed of skipping, the same time spent counting. Repeat and compare for more reliable results.' }
    ],
    items: [
      // ----- Breathing parts -----
      { id: 'htr-001', type: 'mcq', level: 1, syl: 'P5', skill: 'respiratory',
        stem: 'Look at the diagram. Which part is the windpipe?',
        figure: FIG_BODY,
        options: ['A', 'B', 'C', 'D'],
        answer: 1,
        miscon: { 0: 'parts-mixup', 2: 'parts-mixup', 3: 'parts-mixup' },
        optionFeedback: {
          0: 'A is the nose, where air enters. The windpipe is the tube that air passes into next.',
          2: 'C is a lung. The windpipe is the tube that leads down to the lungs.',
          3: 'D is the heart. Look for the tube in the neck.' },
        explain: 'B is the windpipe, the tube that carries air from the nose and mouth down to the lungs.' },
      { id: 'htr-002', type: 'mcq', level: 1, syl: 'P5', skill: 'respiratory',
        stem: 'Which of these is NOT part of the human respiratory system?',
        figure: null,
        options: ['Nose', 'Windpipe', 'Lungs', 'Heart'],
        answer: 3,
        miscon: { 0: 'parts-mixup', 1: 'parts-mixup', 2: 'parts-mixup' },
        optionFeedback: {
          0: 'Air enters through the nose, so it is part of the respiratory system.',
          1: 'Air travels down the windpipe to the lungs, so it is part of the respiratory system.',
          2: 'The lungs are the main organs of the respiratory system.' },
        explain: 'The nose, windpipe and lungs are respiratory organs. The heart belongs to the circulatory system.' },
      { id: 'htr-003', type: 'mcq', level: 2, syl: 'P5', skill: 'respiratory',
        stem: 'Which shows the path of air when Priya breathes in?',
        figure: null,
        options: ['nose → lungs → windpipe → air sacs', 'nose → windpipe → air sacs → lungs', 'nose → windpipe → stomach → lungs', 'nose → windpipe → lungs → air sacs'],
        answer: 3,
        miscon: { 0: 'resp-order', 1: 'resp-order', 2: 'air-to-stomach' },
        technique: 'Follow the arrows',
        steps: ['Air enters at the nose.', 'Which tube leads down from the neck?', 'Where does that tube go?', 'The air sacs are found inside which organ?'],
        optionFeedback: {
          0: 'The windpipe comes before the lungs: it is the tube that leads to them.',
          1: 'The air sacs are inside the lungs, so air enters the lungs first, then reaches the air sacs.',
          2: 'The stomach is part of the digestive system. Air goes down the windpipe to the lungs.' },
        explain: 'Air goes in through the nose, down the windpipe, into the lungs and finally into the tiny air sacs inside the lungs.' },
      { id: 'htr-004', type: 'mcq', level: 1, syl: 'P5', skill: 'gasex',
        stem: 'Where in the body does oxygen pass into the blood?',
        figure: null,
        options: ['In the heart, as it beats', 'In the air sacs of the lungs', 'In the windpipe, as air passes down', 'In the nose, as air enters'],
        answer: 1,
        miscon: { 0: 'heart-breathes', 2: 'gas-place', 3: 'gas-place' },
        optionFeedback: {
          0: 'The heart pumps blood. It does not take in air.',
          2: 'The windpipe is a tube that carries air down. The air has further to go.',
          3: 'Air enters at the nose, but it has a long way to go before oxygen reaches the blood.' },
        explain: 'Oxygen passes into the blood in the air sacs of the lungs, which have thin walls and are surrounded by blood vessels.' },
      { id: 'htr-005', type: 'mcq', level: 2, syl: 'P5', skill: 'gasex',
        stem: 'The diagram shows an air sac and a blood vessel. Arrows X and Y show two gases moving. Which correctly names the gases?',
        figure: FIG_AIRSAC,
        options: ['X: carbon dioxide, Y: oxygen', 'X: oxygen, Y: oxygen', 'X: oxygen, Y: carbon dioxide', 'X: nitrogen, Y: carbon dioxide'],
        answer: 2,
        miscon: { 0: 'gas-swap', 1: 'gas-swap', 3: 'nitrogen-used' },
        technique: 'Follow the arrows',
        steps: ['X goes from the air sac INTO the blood. Which gas does the blood pick up in the lungs?', 'Y goes from the blood INTO the air sac. Which gas do we breathe out more of?', 'Match both arrows.'],
        optionFeedback: {
          0: 'Swap them round: the blood picks up oxygen in the lungs and gets rid of carbon dioxide.',
          1: 'X is right. But the gas leaving the blood is the one we breathe out more of.',
          3: 'Y is right. But the body does not take in nitrogen; the gas entering the blood is oxygen.' },
        explain: 'X: oxygen passes from the air sac into the blood. Y: carbon dioxide passes from the blood into the air sac, to be breathed out.' },
      { id: 'htr-006', type: 'mcq', level: 2, syl: 'P5', skill: 'gasex',
        stem: 'Look at the table. Which statement is supported by the information?',
        figure: TBL_AIR,
        options: ['Air breathed out has no oxygen left in it.', 'Air breathed out still has some oxygen in it.', 'The body uses up the nitrogen we breathe in.', 'Air breathed out is mostly carbon dioxide.'],
        answer: 1,
        miscon: { 0: 'exhale-no-oxygen', 2: 'nitrogen-used', 3: 'exhale-only-co2' },
        technique: 'Read, compare, conclude',
        steps: ['Read each gas across the two columns.', 'Compare: which gases change and which stay the same?', 'Check each statement against the numbers.'],
        optionFeedback: {
          0: 'Look at the oxygen row: air breathed out still has 16% oxygen.',
          2: 'Nitrogen is 78% in both columns, so the body does not use it up.',
          3: 'Carbon dioxide is only 4% of breathed-out air. Which gas is 78%?' },
        explain: 'Oxygen falls from 21% to 16%, so breathed-out air still has some oxygen. Nitrogen stays at 78%, and carbon dioxide is only 4%.' },
      { id: 'htr-007', type: 'mcq', level: 3, syl: 'P5', skill: 'gasex',
        stem: 'Look at the table. The oxygen fell from 21% in the air breathed in to 16% in the air breathed out. What happened to the oxygen that was taken out of the air?',
        figure: TBL_AIR,
        options: ['It was changed into nitrogen inside the lungs.', 'It was stored in the windpipe for later.', 'It passed into the blood and was carried around the body.', 'It was used up by the heart to pump air.'],
        answer: 2,
        miscon: { 0: 'nitrogen-used', 1: 'gas-place', 3: 'heart-breathes' },
        optionFeedback: {
          0: 'The nitrogen stays at 78%, so no oxygen became nitrogen.',
          1: 'The windpipe is just a tube for air. Where do the gases meet the blood?',
          3: 'The heart pumps blood, not air. Where does the oxygen go after the air sacs?' },
        explain: 'In the air sacs, oxygen passes into the blood. The blood carries it to all parts of the body.' },
      { id: 'htr-008', type: 'mcq', level: 2, syl: 'P5', skill: 'gasex',
        stem: 'The air sacs have very thin walls and are wrapped in many blood vessels. How does this help the body?',
        figure: null,
        options: ['Food can pass easily from the lungs into the blood.', 'Oxygen can pass easily into the blood.', 'Blood can be pumped easily by the lungs.', 'Air can be stored there for a long time.'],
        answer: 1,
        miscon: { 0: 'digested-food-lungs', 2: 'parts-mixup', 3: 'parts-mixup' },
        optionFeedback: {
          0: 'Digested food enters the blood in the small intestine, not the lungs.',
          2: 'The heart pumps blood, not the lungs.',
          3: 'Air moves in and out of the air sacs all the time. What passes through the thin walls?' },
        explain: 'Thin walls and many blood vessels let oxygen pass easily from the air sacs into the blood, and carbon dioxide pass out.' },

      // ----- Heart, blood and blood vessels -----
      { id: 'htr-009', type: 'mcq', level: 2, syl: 'P5', skill: 'circulatory',
        stem: 'Which of these does blood carry?\nA: oxygen\nB: digested food\nC: carbon dioxide\nD: undigested food',
        figure: null,
        options: ['A only', 'A and B only', 'A, B and C only', 'A, B, C and D'],
        answer: 2,
        miscon: { 0: 'blood-carries-one', 1: 'co2-not-carried', 3: 'undigested-in-blood' },
        technique: 'Tick or cross',
        steps: ['Take one item at a time.', 'Does the blood pick it up somewhere and carry it somewhere else?', 'Tick it or cross it.', 'Choose the option with only the ticks.'],
        optionFeedback: {
          0: 'Oxygen, yes. But the muscles also need digested food, and their carbon dioxide must be taken away.',
          1: 'A and B are right. But how does carbon dioxide from the muscles reach the lungs?',
          3: 'Undigested food cannot enter the blood. It passes out of the body as waste.' },
        explain: 'Blood carries oxygen, digested food and carbon dioxide. Undigested food stays in the gut and leaves the body.' },
      { id: 'htr-010', type: 'mcq', level: 1, syl: 'P5', skill: 'circulatory',
        stem: 'Look at the diagram. Which part pumps blood around the body?',
        figure: FIG_BODY,
        options: ['D', 'A', 'B', 'C'],
        answer: 0,
        miscon: { 1: 'parts-mixup', 2: 'parts-mixup', 3: 'parts-mixup' },
        optionFeedback: {
          1: 'A is the nose. It lets air in.',
          2: 'B is the windpipe. It carries air to the lungs.',
          3: 'C is a lung. It takes in air. Which organ sits between the lungs and pumps?' },
        explain: 'D is the heart. It pumps blood through the blood vessels to all parts of the body.' },
      { id: 'htr-011', type: 'mcq', level: 1, syl: 'P5', skill: 'circulatory',
        stem: 'What are blood vessels?',
        figure: null,
        options: ['Organs that pump blood', 'Tubes that carry air to the lungs', 'Tubes that carry blood around the body', 'Tubes that carry food to the stomach'],
        answer: 2,
        miscon: { 0: 'parts-mixup', 1: 'parts-mixup', 3: 'parts-mixup' },
        optionFeedback: {
          0: 'The heart pumps. Blood vessels are what the blood flows through.',
          1: 'The windpipe carries air. Blood vessels carry something else.',
          3: 'Food goes to the stomach through the gullet, a part of the digestive system.' },
        explain: 'Blood vessels are tubes that carry blood to and from all parts of the body.' },
      { id: 'htr-012', type: 'mcq', level: 2, syl: 'P5', skill: 'circulatory',
        stem: 'The diagram shows how blood flows between the lungs, the heart and other body parts. Which arrow shows blood carrying a lot of oxygen to the leg muscles?',
        figure: FIG_LOOP,
        options: ['P', 'Q', 'R', 'S'],
        answer: 0,
        miscon: { 1: 'gas-swap', 2: 'parts-mixup', 3: 'gas-swap' },
        technique: 'Follow the arrows',
        steps: ['The leg muscles are one of the "other body parts".', 'Which arrows touch that box?', 'Which one points TOWARDS the box?'],
        optionFeedback: {
          1: 'Q points away from the body parts, back to the heart. Which arrow points towards them?',
          2: 'R goes from the lungs to the heart. The blood still has to be pumped out to the muscles.',
          3: 'S goes from the heart to the lungs. Find the arrow going to the other body parts.' },
        explain: 'Arrow P carries blood from the heart to the other body parts, including the leg muscles. This blood has just come from the lungs, so it has a lot of oxygen.' },
      { id: 'htr-013', type: 'mcq', level: 2, syl: 'P5', skill: 'circulatory',
        stem: 'Look at the blood-flow diagram. Which arrow shows blood being sent to the lungs so that carbon dioxide can be removed?',
        figure: FIG_LOOP,
        options: ['P', 'Q', 'R', 'S'],
        answer: 3,
        miscon: { 0: 'gas-swap', 1: 'parts-mixup', 2: 'gas-swap' },
        technique: 'Follow the arrows',
        steps: ['Carbon dioxide is breathed out from the lungs.', 'Which arrows touch the lungs box?', 'Which one points TOWARDS the lungs?'],
        optionFeedback: {
          0: 'P goes to the other body parts. Find the arrow going to the lungs.',
          1: 'Q carries the carbon dioxide back to the heart. Where does the heart then send it?',
          2: 'R leaves the lungs. Which arrow arrives at the lungs?' },
        explain: 'Arrow S carries blood from the heart to the lungs. In the air sacs, carbon dioxide leaves the blood and is breathed out.' },
      { id: 'htr-014', type: 'mcq', level: 3, syl: 'P5', skill: 'circulatory',
        stem: 'Look at the blood-flow diagram. Compared with the blood in arrow Q, the blood in arrow R has ...',
        figure: FIG_LOOP,
        options: ['less oxygen and more carbon dioxide', 'the same amounts of both gases', 'more oxygen and less carbon dioxide', 'no oxygen and no carbon dioxide'],
        answer: 2,
        miscon: { 0: 'gas-swap', 1: 'systems-separate', 3: 'graph-misread' },
        technique: 'Follow the arrows',
        steps: ['Where has the blood in Q just been? The body parts.', 'What did the body parts take from it, and give to it?', 'Where has the blood in R just been? The lungs.', 'What did the lungs give it, and take from it?'],
        optionFeedback: {
          0: 'That describes Q compared with R. R has just come from the lungs.',
          1: 'The blood changes as it passes the lungs and the body parts. Which gases changed?',
          3: 'Blood always carries some of both gases. Compare the amounts.' },
        explain: 'Blood in R has just left the lungs: it picked up oxygen and got rid of carbon dioxide. Blood in Q has just left the body parts, which used oxygen and gave it carbon dioxide.' },
      { id: 'htr-015', type: 'mcq', level: 2, syl: 'P5', skill: 'exercise',
        stem: 'What is your pulse rate?',
        figure: null,
        options: ['The number of times your heart beats in one minute', 'The number of breaths you take in one minute', 'The amount of blood in your body', 'The amount of oxygen in your blood'],
        answer: 0,
        miscon: { 1: 'pulse-is-breathing', 2: 'parts-mixup', 3: 'parts-mixup' },
        optionFeedback: {
          1: 'That is your breathing rate. The pulse you feel at your wrist comes from another organ.',
          2: 'A pulse is a beat you can count, not an amount of blood.',
          3: 'Oxygen cannot be felt at the wrist. What can you count there?' },
        explain: 'Each heartbeat pushes blood through the blood vessels, felt as a pulse. Pulse rate is the number of heartbeats in one minute.' },

      // ----- Systems working together -----
      { id: 'htr-016', type: 'mcq', level: 2, syl: 'P5', skill: 'together',
        stem: 'How do the respiratory system and the circulatory system work together to get oxygen to the muscles?',
        figure: null,
        options: ['The circulatory system takes in oxygen; the respiratory system carries it.', 'The respiratory system does both jobs on its own.', 'The digestive system takes in oxygen; the respiratory system carries it.', 'The respiratory system takes in oxygen; the circulatory system carries it.'],
        answer: 3,
        miscon: { 0: 'gas-swap', 1: 'systems-separate', 2: 'parts-mixup' },
        optionFeedback: {
          0: 'Swap them round: which system has the lungs, and which has the heart and blood?',
          1: 'The lungs cannot reach the leg muscles. Something must carry the oxygen there.',
          2: 'The digestive system deals with food, not oxygen.' },
        explain: 'The respiratory system takes in oxygen in the lungs. The circulatory system (heart, blood vessels and blood) carries it to the muscles.' },
      { id: 'htr-017', type: 'mcq', level: 3, syl: 'P5', skill: 'together',
        stem: 'During a school race, which of these happen in Daniel\'s body?\nA: His lungs take in more oxygen.\nB: His heart pumps blood faster to his muscles.\nC: His blood carries more carbon dioxide to the lungs.\nD: His heart takes in oxygen from the air.',
        figure: null,
        options: ['A and B only', 'B and D only', 'A, B and C only', 'A, B, C and D'],
        answer: 2,
        miscon: { 0: 'co2-not-carried', 1: 'heart-breathes', 3: 'heart-breathes' },
        technique: 'Tick or cross',
        steps: ['Take one statement at a time.', 'Ask: is this the right organ doing the right job?', 'Tick the true ones, cross the false ones.', 'Choose the option with only the ticks.'],
        optionFeedback: {
          0: 'A and B are right. His muscles also make more carbon dioxide: how does it reach his lungs?',
          1: 'B is right. But the heart pumps blood; it does not take in air.',
          3: 'A, B and C are right. But the heart pumps blood; it does not take in air.' },
        explain: 'A, B and C are true. D is false: the heart pumps blood and does not take in air.' },
      { id: 'htr-018', type: 'mcq', level: 2, syl: 'P5', skill: 'together',
        stem: 'Kumar\'s leg muscles use digested food from his breakfast. Where did this digested food enter his blood?',
        figure: null,
        options: ['In the small intestine', 'In the lungs, with the oxygen', 'In the heart, as it pumps', 'In the mouth, as it is chewed'],
        answer: 0,
        miscon: { 1: 'digested-food-lungs', 2: 'parts-mixup', 3: 'parts-mixup' },
        optionFeedback: {
          1: 'The lungs are where gases enter and leave the blood. Food goes a different way.',
          2: 'The heart pumps the blood, but it does not add food to it.',
          3: 'Food is only starting to be digested in the mouth. Where is digestion finished?' },
        explain: 'Digested food enters the blood in the small intestine. The heart then pumps the blood, carrying the food, to the muscles.' },
      { id: 'htr-019', type: 'mcq', level: 3, syl: 'P5', skill: 'gasex',
        stem: 'Mr Lee has a lung disease, so fewer of his air sacs work properly. He gets tired easily when he walks. What is the most likely reason?',
        figure: null,
        options: ['His heart can no longer pump any blood around his body.', 'Less oxygen gets into his blood and to his muscles.', 'His blood now carries more digested food than before.', 'He takes in far too much oxygen with each breath.'],
        answer: 1,
        miscon: { 0: 'parts-mixup', 2: 'blood-carries-one', 3: 'parts-mixup' },
        technique: 'Follow the arrows',
        steps: ['What happens in the air sacs?', 'Fewer working air sacs: more or less oxygen enters the blood?', 'Then how much oxygen reaches his muscles?'],
        optionFeedback: {
          0: 'His disease is in his lungs, not his heart. What do the air sacs do?',
          2: 'The air sacs deal with gases, not food. Which gas would be in short supply?',
          3: 'Fewer air sacs work, so less oxygen gets in, not more.' },
        explain: 'Fewer working air sacs means less oxygen passes into his blood. His muscles get less oxygen, so they cannot release as much energy and he tires easily.' },
      { id: 'htr-020', type: 'mcq', level: 3, syl: 'P5', skill: 'gasex',
        stem: 'Limewater turns chalky when carbon dioxide passes through it. The more carbon dioxide, the faster it turns chalky. The same volume of air was bubbled through each tube. In the set-up shown, tube A turned chalky much faster than tube B. What can you conclude?',
        figure: FIG_LIME,
        options: ['Breathed-out air has more carbon dioxide than room air.', 'Breathed-out air has no oxygen.', 'Room air has no carbon dioxide at all.', 'Breathed-out air has less carbon dioxide than room air.'],
        answer: 0,
        miscon: { 1: 'exhale-no-oxygen', 2: 'co2-none-in-air', 3: 'gas-swap' },
        technique: 'Can we be sure?',
        steps: ['What does limewater test for?', 'Which tube turned chalky faster?', 'Can limewater tell us anything about oxygen?', 'Only conclude what the test can show.'],
        optionFeedback: {
          1: 'Limewater tests for carbon dioxide, not oxygen, so this test cannot tell us about oxygen.',
          2: 'Tube B did turn chalky, just more slowly. So room air has a little carbon dioxide.',
          3: 'Faster means more carbon dioxide. Which tube was faster?' },
        explain: 'Tube A, with breathed-out air, turned chalky faster, so breathed-out air has more carbon dioxide than room air.' },

      // ----- Exercise and fair tests -----
      { id: 'htr-021', type: 'mcq', level: 2, syl: 'P5', skill: 'exercise',
        stem: 'Why does Arif breathe faster when he runs?',
        figure: null,
        options: ['His muscles need less oxygen while they are moving fast.', 'His heart needs more air so that it can pump harder.', 'His muscles need more oxygen and make more carbon dioxide.', 'His blood needs to carry less digested food to his legs.'],
        answer: 2,
        miscon: { 0: 'exercise-less-oxygen', 1: 'heart-breathes', 3: 'blood-carries-one' },
        optionFeedback: {
          0: 'Working muscles need MORE energy, so they need more oxygen, not less.',
          1: 'The heart pumps blood, not air. Which part of the body is working harder?',
          3: 'Working muscles need more digested food, not less. Think about oxygen.' },
        explain: 'Running muscles need more energy, so they need more oxygen and make more carbon dioxide. Breathing faster takes in more oxygen and removes more carbon dioxide.' },
      { id: 'htr-022', type: 'mcq', level: 2, syl: 'P5', skill: 'exercise',
        stem: 'Why does the heart beat faster during exercise?',
        figure: null,
        options: ['To take in more air for the lungs', 'To slow the blood so the muscles can rest', 'To push undigested food along the gut', 'To carry oxygen and food to the muscles faster'],
        answer: 3,
        miscon: { 0: 'heart-breathes', 1: 'heart-slows-exercise', 2: 'parts-mixup' },
        optionFeedback: {
          0: 'The heart does not take in air. What does it pump?',
          1: 'A faster heartbeat pumps blood faster, not slower. The muscles are working, not resting.',
          2: 'The heart pumps blood, not food in the gut.' },
        explain: 'A faster heartbeat pumps blood faster, so more oxygen and digested food reach the working muscles, and more carbon dioxide is taken away.' },
      { id: 'htr-023', type: 'mcq', level: 2, syl: 'P5', skill: 'exercise',
        stem: 'Nurul sat still, then skipped, then rested. She measured her pulse rate every 2 minutes, as shown in the graph. During which time was she most likely skipping?',
        figure: GRAPH_PULSE,
        options: ['From 0 to 2 min', 'From 10 to 16 min', 'From 2 to 10 min', 'From 16 to 20 min'],
        answer: 2,
        miscon: { 0: 'graph-misread', 1: 'instant-recovery', 3: 'read-wrong-end' },
        technique: 'Read, compare, conclude',
        steps: ['Read: where is the pulse rate low and flat? That is rest.', 'Where does it rise and stay high?', 'Conclude: the high part is the skipping.'],
        optionFeedback: {
          0: 'From 0 to 2 min the pulse rate stays low and flat at 70. That looks like rest.',
          1: 'From 10 to 16 min the pulse rate is falling. That is what happens after exercise stops.',
          3: 'From 16 to 20 min the pulse rate is back near 70. She is resting.' },
        explain: 'Her pulse rate rose after 2 min and stayed high until 10 min. It fell after that, so she stopped skipping at about 10 min.' },
      { id: 'htr-024', type: 'mcq', level: 3, syl: 'P5', skill: 'exercise',
        stem: 'Look at Nurul\'s graph. Which statement is supported by the graph?',
        figure: GRAPH_PULSE,
        options: ['Her pulse took about 6 minutes to fall back close to its resting rate.', 'Her pulse fell back to its resting rate the moment she stopped.', 'Her pulse was highest at the very start of skipping.', 'Her pulse kept rising after she stopped skipping.'],
        answer: 0,
        miscon: { 1: 'instant-recovery', 2: 'graph-misread', 3: 'graph-misread' },
        technique: 'Read, compare, conclude',
        steps: ['Find when she stopped skipping: when does the line start to fall?', 'Find when the line gets close to 70 again.', 'How many minutes is that?'],
        optionFeedback: {
          1: 'At 12 min the pulse is still 110. It falls gradually, not at once.',
          2: 'At the start of skipping the pulse was still rising. It was highest later.',
          3: 'After 10 min the line goes down, not up.' },
        explain: 'She stopped at about 10 min, and her pulse was back near 74 by 16 min: about 6 minutes. The rate falls gradually after exercise.' },
      { id: 'htr-025', type: 'mcq', level: 2, syl: 'P5', skill: 'exercise',
        stem: 'Look at the table. During which activity did Hafiz\'s muscles most likely need the most oxygen?',
        figure: TBL_ACTIVITY,
        options: ['Sitting', 'Walking', 'Cycling slowly', 'Skipping'],
        answer: 3,
        miscon: { 0: 'read-wrong-end', 1: 'read-wrong-end', 2: 'read-wrong-end' },
        technique: 'Read, compare, conclude',
        steps: ['Read: what was measured? Breaths per minute.', 'Compare: which activity has the highest breathing rate?', 'Conclude: faster breathing means the muscles need more oxygen.'],
        optionFeedback: {
          0: 'Sitting has the LOWEST breathing rate. Look for the highest.',
          1: 'Walking is in the middle. Look for the highest breathing rate.',
          2: 'Cycling slowly is in the middle. Look for the highest breathing rate.' },
        explain: 'Skipping gave the highest breathing rate, 36 breaths per minute. He breathed fastest because his muscles needed the most oxygen.' },
      { id: 'htr-026', type: 'mcq', level: 2, syl: 'P5', skill: 'exercise',
        stem: 'Mei wants to find out if the time she spends skipping affects her pulse rate. Which must she keep the same?\nA: the person who skips\nB: the number of minutes spent skipping\nC: how fast she skips\nD: how long she counts her pulse for',
        figure: null,
        options: ['A and B only', 'A, C and D only', 'B and D only', 'A, B, C and D'],
        answer: 1,
        miscon: { 0: 'changed-measured-mixup', 2: 'changed-measured-mixup', 3: 'changed-measured-mixup' },
        technique: 'Change one thing',
        steps: ['What is she changing on purpose? The time spent skipping.', 'What is she measuring? Her pulse rate.', 'Everything else stays the same.'],
        optionFeedback: {
          0: 'A must stay the same. But B, the time spent skipping, is what she changes on purpose.',
          2: 'D must stay the same, but B is what she changes. And A must stay the same.',
          3: 'Almost. But the time spent skipping (B) is the one thing she changes on purpose.' },
        explain: 'She changes the time spent skipping (B). The person (A), the skipping speed (C) and the counting time (D) must be kept the same.' },
      { id: 'htr-027', type: 'mcq', level: 3, syl: 'P5', skill: 'exercise',
        stem: 'Ali and Ben each ran 1 km. Look at their pulse rates in the table. After 5 minutes of rest, whose pulse rate was closer to his own resting rate?',
        figure: TBL_TWO,
        options: ['Ben', 'Ali', 'Both were exactly at their resting rates', 'Neither pulse rate changed during the run'],
        answer: 1,
        miscon: { 0: 'read-wrong-end', 2: 'instant-recovery', 3: 'graph-misread' },
        technique: 'Start minus left',
        steps: ['For each boy, take the pulse after 5 min of rest.', 'Subtract his own resting pulse.', 'The smaller difference is closer to resting.'],
        optionFeedback: {
          0: 'Ben: 110 - 75 = 35 above resting. Work out Ali\'s difference too.',
          2: 'Ali was at 80, not 72, and Ben was at 110, not 75. Neither was exactly back.',
          3: 'Both pulse rates went up during the run: 130 and 150.' },
        explain: 'Ali: 80 - 72 = 8 above resting. Ben: 110 - 75 = 35 above resting. Ali\'s pulse rate was closer to his resting rate.' },

      // ----- Open-ended -----
      { id: 'htr-028', type: 'oeq', level: 1, marks: 2, syl: 'P5', skill: 'respiratory',
        stem: 'Look at the diagram. Name parts A and B.',
        figure: FIG_BODY,
        model: 'A is the nose. B is the windpipe.',
        keys: [['nose'], ['windpipe', 'wind pipe', 'trachea']],
        watchFor: ['parts-mixup'],
        technique: 'Follow the arrows',
        steps: ['Where does air first enter? That is A.', 'Which tube does the air go down next? That is B.', 'Name both.'],
        explain: 'One mark each: A, nose; B, windpipe.' },
      { id: 'htr-029', type: 'oeq', level: 2, marks: 2, syl: 'P5', skill: 'respiratory', chain: true,
        stem: 'Describe the path that air takes from the nose to the air sacs.',
        figure: null,
        model: 'From the nose, air goes down the windpipe and into the lungs, where it reaches the air sacs.',
        keys: [['windpipe', 'wind pipe', 'trachea'], ['lungs', 'lung']],
        watchFor: ['resp-order', 'air-to-stomach'],
        technique: 'Follow the arrows',
        steps: ['Start at the nose.', 'Which tube comes next?', 'Which organ holds the air sacs?'],
        explain: 'In order: windpipe -> lungs (where the air sacs are).' },
      { id: 'htr-030', type: 'oeq', level: 2, marks: 3, syl: 'P5', skill: 'gasex',
        stem: 'Describe what happens to oxygen and carbon dioxide in the air sacs of the lungs.',
        figure: FIG_AIRSAC,
        model: 'Oxygen passes into the blood from the air in the air sacs. Carbon dioxide passes out of the blood into the air sacs. The carbon dioxide is then breathed out.',
        keys: [['oxygen passes into the blood', 'oxygen enters the blood', 'oxygen moves into the blood', 'oxygen goes into the blood', 'oxygen is taken in by the blood', 'oxygen into the blood'], ['carbon dioxide passes out of the blood', 'carbon dioxide leaves the blood', 'carbon dioxide moves out of the blood', 'carbon dioxide goes out of the blood', 'carbon dioxide from the blood', 'carbon dioxide moves into the air sacs', 'carbon dioxide passes into the air sacs'], ['breathed out', 'exhaled', 'breathe out', 'breathes out']],
        watchFor: ['gas-swap'],
        technique: 'Follow the arrows',
        steps: ['Which gas goes from the air sac INTO the blood?', 'Which gas goes from the blood INTO the air sac?', 'What happens to that gas next?'],
        explain: 'One mark each: oxygen passes into the blood; carbon dioxide passes out of the blood into the air sacs; it is breathed out.' },
      { id: 'htr-031', type: 'oeq', level: 2, marks: 2, syl: 'P5', skill: 'gasex', chain: true,
        stem: 'Air breathed out has less oxygen than air breathed in. Explain why.',
        figure: null,
        model: 'In the air sacs, some of the oxygen passes into the blood. The blood carries it to all parts of the body, where it is used.',
        keys: [['into the blood', 'taken in by the blood', 'absorbed by the blood', 'enters the blood'], ['carries it to all parts', 'carried to all parts', 'carried around the body', 'carried to the body', 'is used', 'used by the body', 'used by the muscles', 'used by the cells']],
        watchFor: ['exhale-no-oxygen', 'heart-breathes'],
        technique: 'Follow the arrows',
        steps: ['Where does some of the oxygen go in the lungs?', 'Where does the blood then take it?', 'Write the two steps in order.'],
        explain: 'In order: oxygen passes into the blood in the air sacs -> the blood carries it to the body parts, which use it.' },
      { id: 'htr-032', type: 'oeq', level: 3, marks: 3, syl: 'P5', skill: 'exercise', chain: true,
        stem: 'Explain why your heart beats faster when you exercise.',
        figure: null,
        model: 'The working muscles need more oxygen and digested food to release more energy. The heart pumps blood faster, so more oxygen and digested food are carried to the muscles.',
        keys: [['need more oxygen', 'more oxygen', 'more energy'], ['pumps blood faster', 'pump blood faster', 'pumps faster', 'pumps more blood', 'pump more blood'], ['carried to the muscles', 'reach the muscles', 'to the muscles', 'delivered to the muscles']],
        watchFor: ['exercise-less-oxygen', 'heart-breathes'],
        technique: 'Follow the arrows',
        steps: ['What do working muscles need more of?', 'What does a faster heartbeat do to the blood?', 'So what reaches the muscles?'],
        hints: ['Think about what blood carries.', 'Faster beats, faster ...?'],
        explain: 'Three links in order: muscles need more oxygen (energy) -> the heart pumps blood faster -> more oxygen and food are carried to the muscles.' },
      { id: 'htr-033', type: 'oeq', level: 3, marks: 4, syl: 'P5', skill: 'together', chain: true,
        stem: 'Describe how oxygen in the air reaches Jia Hui\'s leg muscles when she breathes in.',
        figure: null,
        model: 'Air goes down the windpipe into the lungs. In the air sacs, oxygen passes into the blood. The heart pumps the blood through the blood vessels to the leg muscles.',
        keys: [['windpipe', 'wind pipe', 'trachea'], ['air sacs', 'air sac'], ['into the blood', 'enters the blood', 'taken in by the blood', 'absorbed into the blood'], ['heart pumps', 'pumped by the heart', 'heart']],
        watchFor: ['resp-order', 'systems-separate', 'heart-breathes'],
        technique: 'Follow the arrows',
        steps: ['Which tube does the air go down?', 'Where in the lungs does oxygen leave the air?', 'Where does the oxygen go next?', 'What moves the blood to the legs?'],
        explain: 'Four links in order: windpipe -> air sacs in the lungs -> oxygen passes into the blood -> the heart pumps the blood to the leg muscles.' },
      { id: 'htr-034', type: 'oeq', level: 2, marks: 2, syl: 'P5', skill: 'circulatory', chain: true,
        stem: 'Working muscles make carbon dioxide. Explain how this carbon dioxide is removed from the body.',
        figure: null,
        model: 'The blood carries the carbon dioxide to the lungs. There it passes into the air sacs and is breathed out.',
        keys: [['to the lungs', 'to the lung', 'to the air sacs'], ['breathed out', 'exhaled', 'breathe out', 'breathes out']],
        watchFor: ['co2-not-carried'],
        technique: 'Follow the arrows',
        steps: ['What carries the carbon dioxide away from the muscles?', 'Where does it take it?', 'How does it leave the body?'],
        explain: 'In order: the blood carries it to the lungs -> it is breathed out.' },
      { id: 'htr-035', type: 'oeq', level: 3, marks: 5, syl: 'P5', skill: 'exercise',
        stem: 'Mei did an experiment on skipping and recorded her results in the table.\n(a) Which variable did she change? (1 mark)\n(b) What did she measure? (1 mark)\n(c) Name two variables she must keep the same. (2 marks)\n(d) What do her results show? (1 mark)',
        figure: TBL_SKIP,
        model: '(a) The time spent skipping. (b) Her pulse rate. (c) First variable kept the same: the same speed of skipping. A second, different variable kept the same: the same time spent counting her pulse. (d) The longer she skipped, the higher her pulse rate.',
        keys: [['time spent skipping', 'skipping time', 'how long she skipped', 'minutes of skipping', 'length of time'], ['pulse rate', 'pulse', 'heartbeat', 'heart rate'], ['first variable kept the same', 'same speed', 'same time spent counting', 'same person', 'same rope', 'same place', 'same way of skipping', 'same counting time'], ['a second, different variable kept the same', 'same time spent counting', 'same speed', 'same person', 'same rope', 'same place', 'same way of skipping', 'same counting time'], ['the longer she skipped, the higher', 'the longer, the higher', 'pulse rate increased as', 'pulse rate went up as']],
        watchFor: ['changed-measured-mixup', 'graph-misread'],
        technique: 'Change one thing',
        steps: ['What did she change on purpose?', 'What did she measure?', 'What else could change her pulse? Keep two of them the same.', 'Read the table from top to bottom and write the pattern.'],
        explain: '(a) time spent skipping; (b) pulse rate; (c) one mark each for two DIFFERENT variables kept the same: the same person, skipping speed, counting time, rope or place; (d) the longer she skipped, the higher her pulse rate.' },
      { id: 'htr-036', type: 'oeq', level: 3, marks: 5, syl: 'P5', skill: 'exercise',
        stem: 'Look at Nurul\'s graph.\n(a) What was her resting pulse rate? (1 mark)\n(b) What was her highest pulse rate? (1 mark)\n(c) At about what time did she start skipping? (1 mark)\n(d) Explain why her pulse rate rose while she skipped. (2 marks)',
        figure: GRAPH_PULSE,
        model: '(a) 70 beats per minute. (b) 140 beats per minute. (c) At 2 minutes. (d) Her muscles needed more oxygen, so her heart pumped blood faster to carry more oxygen to them.',
        keys: [['70', 'about 70'], ['140'], ['2 minutes', '2 min', 'two minutes'], ['more oxygen', 'more energy', 'more digested food'], ['pumped blood faster', 'pumps blood faster', 'pump blood faster', 'beat faster', 'beats faster', 'pumped faster', 'more blood']],
        watchFor: ['graph-misread', 'exercise-less-oxygen'],
        technique: 'Read, compare, conclude',
        steps: ['Read the flat part at the start: that is the resting rate.', 'Find the highest point on the line.', 'Find where the line first starts to rise.', 'Explain the rise: what do the muscles need, and what does the heart do?'],
        explain: '(a) 70; (b) 140; (c) 2 min; (d) one mark for the muscles needing more oxygen, one mark for the heart pumping blood faster to carry it.' },
      { id: 'htr-037', type: 'oeq', level: 2, marks: 2, syl: 'P5', skill: 'together',
        stem: 'A swimmer needs oxygen for her arm muscles. State one way her respiratory system helps, and one way her circulatory system helps.',
        figure: null,
        model: 'Respiratory system: her lungs take in oxygen from the air. Circulatory system: her heart pumps blood that carries oxygen to her arm muscles.',
        keys: [['lungs take in oxygen', 'take in oxygen', 'takes in oxygen', 'breathes in', 'breathe in', 'takes in air', 'take in air', 'lungs'], ['carries oxygen', 'carry oxygen', 'pumps blood', 'pump blood', 'transports oxygen', 'blood carries']],
        watchFor: ['systems-separate', 'parts-mixup'],
        technique: 'Claim, evidence, reason',
        steps: ['Respiratory system: what does it do with air?', 'Circulatory system: what does it do with the oxygen?', 'Write one sentence for each.'],
        explain: 'One mark for the respiratory system taking in oxygen (lungs). One mark for the circulatory system carrying oxygen to the muscles (heart pumps blood).' },
      { id: 'htr-038', type: 'oeq', level: 2, marks: 2, syl: 'P5', skill: 'exercise',
        stem: 'Look at the table of Hafiz\'s breathing rates. During which activity did he breathe fastest? Explain why he breathed faster during this activity than when sitting.',
        figure: TBL_ACTIVITY,
        model: 'Skipping. His muscles were working harder and needed more oxygen, so he breathed faster to take in more oxygen.',
        keys: [['skipping'], ['more oxygen', 'more energy']],
        watchFor: ['read-wrong-end', 'exercise-less-oxygen'],
        technique: 'Claim, evidence, reason',
        steps: ['Claim: find the highest breathing rate in the table.', 'Reason: what do working muscles need more of?', 'How does breathing faster help?'],
        explain: 'One mark for skipping (36 breaths per minute). One mark for the muscles needing more oxygen.' },
      { id: 'htr-039', type: 'oeq', level: 3, marks: 3, syl: 'P5', skill: 'gasex', chain: true,
        stem: 'In the set-up shown, the same volume of air was bubbled through each tube. Limewater in tube A, with breathed-out air, turned chalky much faster than limewater in tube B, with room air. The larger the amount of carbon dioxide, the faster limewater turns chalky. Explain why breathed-out air gives this result.',
        figure: FIG_LIME,
        model: 'The body parts make carbon dioxide, which is carried by the blood to the lungs. In the air sacs it passes out of the blood, so breathed-out air has more carbon dioxide than room air.',
        keys: [['make carbon dioxide', 'produce carbon dioxide', 'give out carbon dioxide'], ['carried by the blood', 'blood carries'], ['more carbon dioxide than room air', 'more carbon dioxide']],
        watchFor: ['co2-not-carried', 'co2-none-in-air'],
        technique: 'Follow the arrows',
        steps: ['Where in the body is carbon dioxide made?', 'What carries it to the lungs?', 'What happens to it in the air sacs?'],
        explain: 'Three links in order: body parts make carbon dioxide -> the blood carries it to the lungs -> it passes into the air sacs and is breathed out, so there is more of it in breathed-out air.' },
      { id: 'htr-040', type: 'oeq', level: 2, marks: 2, syl: 'P5', skill: 'exercise',
        stem: 'Ravi counted 18 pulse beats in 15 seconds. What is his pulse rate in beats per minute? Show how you worked it out.',
        figure: null,
        model: 'One minute is 4 times 15 seconds, so multiply by 4: 18 × 4 = 72 beats per minute.',
        keys: [['72'], ['multiply by 4', 'times 4', '× 4', 'x 4', '4 times', '4 x', '4 ×']],
        watchFor: ['pulse-is-breathing'],
        technique: 'Count, then check',
        steps: ['How many lots of 15 seconds make 1 minute?', 'Multiply the count by that number.', 'Check: is the answer a sensible resting pulse rate?'],
        explain: 'One mark for 72 beats per minute. One mark for multiplying by 4, since 60 seconds is 4 lots of 15 seconds.' },
      { id: 'htr-041', type: 'oeq', level: 3, marks: 3, syl: 'P5', skill: 'gasex', chain: true,
        stem: 'Mr Lee has a lung disease, so fewer of his air sacs work properly. Explain why he gets tired easily when he walks.',
        figure: null,
        model: 'With fewer working air sacs, less oxygen passes into his blood. So less oxygen is carried to his muscles. His muscles cannot release as much energy, so he gets tired.',
        keys: [['less oxygen'], ['into his blood', 'into the blood', 'enters the blood', 'in his blood', 'in the blood'], ['to his muscles', 'to the muscles', 'less energy', 'not as much energy']],
        watchFor: ['gas-place', 'parts-mixup'],
        technique: 'Follow the arrows',
        steps: ['What do the air sacs do?', 'Fewer air sacs: what happens to the oxygen in his blood?', 'What does that mean for his muscles?'],
        explain: 'Three links in order: less oxygen -> enters his blood -> reaches his muscles, so they release less energy.' },
      { id: 'htr-042', type: 'oeq', level: 2, marks: 2, syl: 'P5', skill: 'circulatory',
        stem: 'Mei says, "The lungs pump blood to all parts of the body." Explain why she is not correct.',
        figure: null,
        model: 'The heart pumps blood to all parts of the body, not the lungs. The lungs take in air, and oxygen passes into the blood there.',
        keys: [['heart pumps', 'heart'], ['lungs take in air', 'take in air', 'takes in air', 'take in oxygen', 'takes in oxygen', 'breathing', 'air sacs', 'oxygen passes into the blood']],
        watchFor: ['parts-mixup'],
        technique: 'Claim, evidence, reason',
        steps: ['Which organ really pumps blood?', 'What is the real job of the lungs?', 'Write both.'],
        explain: 'One mark for the heart pumping the blood. One mark for the real job of the lungs: taking in air so oxygen can enter the blood.' },
      { id: 'htr-043', type: 'oeq', level: 3, marks: 4, syl: 'P5', skill: 'circulatory',
        stem: 'Look at the blood-flow diagram.\n(a) Blood in arrow R has more oxygen than blood in arrow Q. Where did it pick up this oxygen? (1 mark)\n(b) Blood in arrow Q has more carbon dioxide than blood in arrow P. Where did this carbon dioxide come from? (1 mark)\n(c) Explain why the heart must keep sending blood along arrow S. (2 marks)',
        figure: FIG_LOOP,
        model: '(a) In the air sacs of the lungs. (b) From the body parts, such as the muscles, which make it. (c) In the lungs the carbon dioxide is removed from the blood, and the blood picks up fresh oxygen.',
        keys: [['air sacs', 'lungs', 'lung'], ['body parts', 'muscles', 'other parts', 'cells', 'organs'], ['carbon dioxide is removed', 'remove carbon dioxide', 'removes carbon dioxide', 'get rid of carbon dioxide', 'gets rid of carbon dioxide', 'carbon dioxide leaves', 'carbon dioxide is breathed out', 'breathed out'], ['picks up fresh oxygen', 'pick up oxygen', 'picks up oxygen', 'take in oxygen', 'takes in oxygen', 'fresh oxygen', 'get oxygen', 'gets oxygen', 'oxygen enters']],
        watchFor: ['gas-swap', 'co2-not-carried'],
        technique: 'Follow the arrows',
        steps: ['R leaves which organ?', 'Q leaves which box?', 'What does the blood drop off in the lungs?', 'What does it pick up there?'],
        explain: '(a) the lungs (air sacs); (b) the body parts that made it; (c) one mark for removing carbon dioxide, one mark for picking up oxygen.' },
      { id: 'htr-044', type: 'oeq', level: 2, marks: 2, syl: 'P5', skill: 'exercise',
        stem: 'When Siti exercises, she breathes faster and more deeply. Explain how this helps her body.',
        figure: null,
        model: 'She takes in more oxygen for her working muscles, and she gets rid of more carbon dioxide.',
        keys: [['more oxygen', 'more air'], ['more carbon dioxide', 'carbon dioxide']],
        watchFor: ['exercise-less-oxygen'],
        technique: 'Claim, evidence, reason',
        steps: ['Breathing in faster: what does she take in more of?', 'Breathing out faster: what does she get rid of more of?', 'Write both.'],
        explain: 'One mark for taking in more oxygen. One mark for removing more carbon dioxide.' },
      { id: 'htr-045', type: 'oeq', level: 2, marks: 2, syl: 'P5', skill: 'exercise',
        stem: 'Ali and Ben each ran 1 km. Look at their pulse rates. Whose pulse rate was closer to his own resting rate after 5 minutes of rest? Use numbers from the table to explain.',
        figure: TBL_TWO,
        model: 'Ali. Compared with their own resting rates, Ali 8 above, Ben 35 above: 80 - 72 = 8 and 110 - 75 = 35.',
        keys: [['Ali'], ['Ali 8 above, Ben 35 above', '80 - 72 = 8 and 110 - 75 = 35', '8 and 35']],
        watchFor: ['read-wrong-end', 'instant-recovery'],
        technique: 'Start minus left',
        steps: ['Ali: pulse after rest minus resting pulse.', 'Ben: pulse after rest minus resting pulse.', 'Name the boy with the smaller difference, and quote both numbers.'],
        explain: 'One mark for Ali. One mark for the evidence, which needs BOTH differences: Ali 80 - 72 = 8 above resting, Ben 110 - 75 = 35 above resting. One number alone does not earn the mark.' }
    ]
  });
})();
