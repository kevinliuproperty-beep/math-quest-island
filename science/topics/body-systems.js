"use strict";
/*
 * Human body systems (Systems theme). HIDDEN P4 topic.
 *
 * Kev's ruling, 2026-10-17 11:03: "body is not p3, you can build but dont show her,
 * hide in 4 section". So this topic is `extra: true` (P4) AND `hidden: true`: it must
 * stay off the child's home screen, out of the mock paper, weak spots and countdown
 * practice, and be reachable only from the parent page under a P4 section. The shell
 * needs a small change for `hidden` (see the S6 lane report, "Shared requests"); until
 * that lands, do NOT add this file's <script> tag, or the topic shows as "P4 preview".
 *
 * SYLLABUS PLACEMENT (checked 2026-10-17): under the MOE 2023 Primary Science syllabus
 * the P3-P4 "Human System" topic is the digestive system; respiratory and circulatory
 * systems in detail are P5-P6. Older (2014-syllabus) P4 materials still open with an
 * overview of five systems (digestive, respiratory, circulatory, skeletal, muscular),
 * and 8 of 9 school P3 papers from 2022 test them. So digestive items carry the depth;
 * the other four systems are kept at overview level (main organ, its job, the path of
 * air or blood, systems working together).
 */
(function () {
  const F = 'font-family="sans-serif"';
  const INK = '#2B2540';

  /* Labels: each {t, lx, ly, tx, ty}. A one-letter t is drawn in a circle; a word is
     drawn as text (right-aligned on the left side, left-aligned on the right side).
     A leader runs from the label to a dot on the target (tx, ty). */
  const labels = (list) => list.map(({ t, lx, ly, tx, ty }) => {
    const left = lx < tx, letter = t.length === 1;
    const sx = letter ? (left ? lx + 13 : lx - 13) : (left ? lx + 4 : lx - 4);
    const line = `<line x1="${sx}" y1="${ly}" x2="${tx}" y2="${ty}" stroke="${INK}" stroke-width="1.4"/>` +
      `<circle cx="${tx}" cy="${ty}" r="2.6" fill="${INK}"/>`;
    const tag = letter
      ? `<circle cx="${lx}" cy="${ly}" r="13" fill="#fff" stroke="${INK}" stroke-width="1.5"/>` +
        `<text x="${lx}" y="${ly + 5.5}" ${F} font-size="16" font-weight="700" fill="${INK}" text-anchor="middle">${t}</text>`
      : `<text x="${lx}" y="${ly + 5}" ${F} font-size="14" font-weight="700" fill="${INK}" text-anchor="${left ? 'end' : 'start'}">${t}</text>`;
    return line + tag;
  }).join('');

  /* ---------- digestive system (front view, cut-away) ----------
     L = { mouth, gullet, stomach, small, large, anus } -> label text; omit a key to leave
     that part unlabelled. */
  const digestive = (L, aria) => {
    const spots = {
      mouth:   { lx: 320, ly: 74,  tx: 212, ty: 76 },
      gullet:  { lx: 80,  ly: 130, tx: 200, ty: 130 },
      stomach: { lx: 320, ly: 176, tx: 250, ty: 184 },
      small:   { lx: 320, ly: 286, tx: 222, ty: 282 },
      large:   { lx: 80,  ly: 290, tx: 158, ty: 290 },
      anus:    { lx: 80,  ly: 356, tx: 202, ty: 356 }
    };
    const lab = Object.keys(spots).filter(k => L[k]).map(k => Object.assign({ t: L[k] }, spots[k]));
    return `<svg viewBox="0 0 400 380" data-maxw="420" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${aria || 'The human digestive system with its parts labelled'}">
<ellipse cx="200" cy="52" rx="32" ry="38" fill="#f6dcc4" stroke="#b98b6a" stroke-width="2"/>
<rect x="186" y="86" width="28" height="22" fill="#f6dcc4" stroke="none"/>
<path d="M140 106 Q200 96 260 106 L272 150 L268 360 Q200 374 132 360 L128 150 Z" fill="#fbeadb" stroke="#b98b6a" stroke-width="2"/>
<path d="M186 88 L186 104 M214 88 L214 104" stroke="#b98b6a" stroke-width="2"/>
<path d="M200 80 L200 160" stroke="#e58f8f" stroke-width="9" stroke-linecap="round" fill="none"/>
<path d="M158 324 L158 254 Q158 244 168 244 L238 244 Q248 244 248 254 L248 314 Q248 330 222 332 L212 334 Q202 336 202 346 L202 354" stroke="#c98a4b" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
<path d="M198 156 C232 144 264 164 258 198 C253 226 226 236 206 228 C193 222 193 210 203 206 C214 200 214 188 206 178 C201 172 198 166 198 156 Z" fill="#f2a3a3" stroke="#b85c5c" stroke-width="2"/>
<path d="M199 222 L199 258 L232 258 Q240 264 232 270 L174 270 Q166 276 174 282 L232 282 Q240 288 232 294 L174 294 Q166 300 174 306 L232 306 Q240 312 226 318 L164 318" stroke="#fff" stroke-width="11" stroke-linejoin="round" fill="none"/>
<path d="M199 222 L199 258 L232 258 Q240 264 232 270 L174 270 Q166 276 174 282 L232 282 Q240 288 232 294 L174 294 Q166 300 174 306 L232 306 Q240 312 226 318 L164 318" stroke="#e9b85a" stroke-width="7" stroke-linejoin="round" stroke-linecap="round" fill="none"/>
<ellipse cx="200" cy="76" rx="10" ry="5" fill="#d9534f"/>
<ellipse cx="202" cy="358" rx="5" ry="3" fill="#7a4b2a"/>
${labels(lab)}
</svg>`;
  };
  /* one fixed scrambled lettering for every digestive item, so the order item is not alphabetical */
  const DIG_L = { mouth: 'C', gullet: 'A', stomach: 'E', small: 'B', large: 'F', anus: 'D' };
  const DIG = digestive(DIG_L, 'The human digestive system with six parts labelled A to F');

  /* ---------- chest: breathing (nose, windpipe, lungs) plus the heart ---------- */
  const heartPath = (x, y, s) => {   /* point at the bottom, (x, y) = top dip; s = scale */
    const p = (dx, dy) => (x + dx * s) + ' ' + (y + dy * s);
    return `M${p(0, 34)} C${p(-24, 18)} ${p(-28, 0)} ${p(-14, -6)} C${p(-6, -9)} ${p(0, -3)} ${p(0, 0)} C${p(0, -3)} ${p(6, -9)} ${p(14, -6)} C${p(28, 0)} ${p(24, 18)} ${p(0, 34)} Z`;
  };
  const RESP = `<svg viewBox="0 0 400 330" data-maxw="420" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Head and chest showing the nose, windpipe, lungs and heart, labelled W to Z">
<ellipse cx="200" cy="55" rx="34" ry="40" fill="#f6dcc4" stroke="#b98b6a" stroke-width="2"/>
<rect x="186" y="92" width="28" height="22" fill="#f6dcc4"/>
<path d="M186 92 L186 112 M214 92 L214 112" stroke="#b98b6a" stroke-width="2"/>
<path d="M140 112 Q200 102 260 112 L268 322 L132 322 Q130 200 140 112 Z" fill="#fbeadb" stroke="#b98b6a" stroke-width="2"/>
<path d="M200 46 L192 66 L208 66 Z" fill="#eec3a3" stroke="#b98b6a" stroke-width="1.5"/>
<path d="M190 80 Q200 86 210 80" stroke="#b05050" stroke-width="2.5" fill="none"/>
<path d="M200 66 L200 90" stroke="#6f8fb3" stroke-width="3" stroke-dasharray="4 3"/>
<path d="M200 172 L170 200 M200 172 L230 200" stroke="#6f8fb3" stroke-width="9" stroke-linecap="round"/>
<ellipse cx="160" cy="236" rx="38" ry="62" fill="#f4b6c2" stroke="#c06a80" stroke-width="2"/>
<ellipse cx="240" cy="236" rx="38" ry="62" fill="#f4b6c2" stroke="#c06a80" stroke-width="2"/>
<rect x="193" y="90" width="14" height="84" rx="3" fill="#cfe0f1" stroke="#6f8fb3" stroke-width="1.5"/>
<g stroke="#6f8fb3" stroke-width="1.2">${[100, 110, 120, 130, 140, 150, 160].map(y => `<line x1="193" y1="${y}" x2="207" y2="${y}"/>`).join('')}</g>
<path d="${heartPath(204, 252, 1.05)}" fill="#d64545" stroke="#8e2424" stroke-width="2"/>
${labels([
  { t: 'W', lx: 320, ly: 56, tx: 207, ty: 60 },
  { t: 'X', lx: 80, ly: 134, tx: 193, ty: 134 },
  { t: 'Y', lx: 320, ly: 214, tx: 268, ty: 214 },
  { t: 'Z', lx: 80, ly: 300, tx: 196, ty: 272 }
])}
</svg>`;

  /* ---------- whole body: heart and blood vessels ---------- */
  const CIRC = `<svg viewBox="0 0 400 400" data-maxw="420" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="A body showing the brain, lungs, heart and blood vessels, labelled P to S">
<g stroke="#e9c9ad" stroke-width="26" stroke-linecap="round" fill="none">
<path d="M154 112 L112 250"/><path d="M246 112 L288 250"/><path d="M178 258 L168 384"/><path d="M222 258 L232 384"/></g>
<circle cx="200" cy="50" r="34" fill="#f6dcc4" stroke="#b98b6a" stroke-width="2"/>
<rect x="188" y="82" width="24" height="20" fill="#f6dcc4"/>
<path d="M150 102 Q200 92 250 102 L248 262 Q200 274 152 262 Z" fill="#fbeadb" stroke="#b98b6a" stroke-width="2"/>
<path d="M180 46 C178 30 194 22 202 26 C212 20 226 30 222 44 C226 56 212 62 202 58 C190 64 176 58 180 46 Z" fill="#f3b3c8" stroke="#b9708a" stroke-width="1.5"/>
<path d="M192 36 Q198 42 194 50 M206 32 Q212 40 208 50" stroke="#b9708a" stroke-width="1.2" fill="none"/>
<ellipse cx="177" cy="146" rx="18" ry="32" fill="#f8d3db" stroke="#c06a80" stroke-width="1.5"/>
<ellipse cx="223" cy="146" rx="18" ry="32" fill="#f8d3db" stroke="#c06a80" stroke-width="1.5"/>
<g stroke="#d32f2f" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round">
<path d="M200 170 L200 66"/>
<path d="M194 176 L154 118 L114 246"/>
<path d="M214 176 L246 118 L286 246"/>
<path d="M204 206 L204 248 L176 262 L168 380"/>
<path d="M204 248 L224 262 L232 380"/></g>
<path d="${heartPath(204, 172, 0.9)}" fill="#d64545" stroke="#8e2424" stroke-width="2"/>
${labels([
  { t: 'P', lx: 320, ly: 40, tx: 220, ty: 40 },
  { t: 'Q', lx: 80, ly: 140, tx: 168, ty: 140 },
  { t: 'R', lx: 320, ly: 196, tx: 214, ty: 190 },
  { t: 'S', lx: 320, ly: 330, tx: 236, ty: 330 }
])}
</svg>`;

  /* ---------- skeleton (front view) ---------- */
  const B = 'stroke="#a8987a" stroke-width="7" stroke-linecap="round" fill="none"';
  const ribs = [0, 1, 2, 3, 4, 5].map(i => {
    const y = 114 + i * 15, w = 44 + (i < 3 ? i * 4 : 12 - (i - 3) * 3);
    return `<path d="M200 ${y} Q${200 - w} ${y - 6} ${200 - w + 4} ${y + 18}"/><path d="M200 ${y} Q${200 + w} ${y - 6} ${200 + w - 4} ${y + 18}"/>`;
  }).join('');
  const spine = Array.from({ length: 16 }, (_, i) => `<rect x="194" y="${92 + i * 11}" width="12" height="9" rx="2"/>`).join('');
  const SKEL = `<svg viewBox="0 0 400 420" data-maxw="420" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="A human skeleton with four parts labelled J to M">
<g fill="#fbf7ec" stroke="#8a7f6a" stroke-width="1.5">${spine}</g>
<g stroke="#b7a98a" stroke-width="4" stroke-linecap="round" fill="none">${ribs}</g>
<rect x="196" y="110" width="8" height="74" rx="3" fill="#fbf7ec" stroke="#8a7f6a" stroke-width="1.5"/>
<g ${B}>
<path d="M160 104 L240 104"/>
<path d="M158 108 L140 200"/><path d="M140 200 L128 278"/>
<path d="M242 108 L260 200"/><path d="M260 200 L272 278"/>
<path d="M180 306 L174 355"/><path d="M174 355 L172 404"/>
<path d="M220 306 L226 355"/><path d="M226 355 L228 404"/></g>
<path d="M160 270 Q200 296 240 270 L234 302 Q200 318 166 302 Z" fill="#fbf7ec" stroke="#8a7f6a" stroke-width="2"/>
<g fill="#fbf7ec" stroke="#8a7f6a" stroke-width="2">
<circle cx="140" cy="200" r="6"/><circle cx="260" cy="200" r="6"/>
<circle cx="174" cy="355" r="7"/><circle cx="226" cy="355" r="7"/>
<circle cx="126" cy="286" r="8"/><circle cx="274" cy="286" r="8"/></g>
<g ${B}><path d="M172 404 L160 408"/><path d="M228 404 L240 408"/></g>
<ellipse cx="200" cy="50" rx="30" ry="34" fill="#fbf7ec" stroke="#8a7f6a" stroke-width="2"/>
<ellipse cx="189" cy="46" rx="7" ry="8" fill="#8a7f6a"/><ellipse cx="211" cy="46" rx="7" ry="8" fill="#8a7f6a"/>
<path d="M197 60 L200 54 L203 60 Z" fill="#8a7f6a"/>
<path d="M188 72 L212 72" stroke="#8a7f6a" stroke-width="1.5"/>
<path d="M190 72 L190 78 M196 72 L196 78 M202 72 L202 78 M208 72 L208 78" stroke="#8a7f6a" stroke-width="1.2"/>
${labels([
  { t: 'J', lx: 320, ly: 34, tx: 226, ty: 36 },
  { t: 'K', lx: 320, ly: 150, tx: 238, ty: 150 },
  { t: 'L', lx: 80, ly: 236, tx: 194, ty: 236 },
  { t: 'M', lx: 80, ly: 355, tx: 167, ty: 355 }
])}
</svg>`;

  /* ---------- arm: bones, elbow joint and the muscle that bends it ---------- */
  const ARM = `<svg viewBox="0 0 400 260" data-maxw="440" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Mei Ling's bent arm showing a bone, a muscle, the elbow joint and the lower arm bones, labelled P to S">
<path d="M40 150 C40 120 80 110 120 118 C180 104 240 116 262 150 L340 70 C352 62 364 74 356 86 L276 196 C262 214 236 214 222 206 C170 214 90 214 60 200 C44 194 40 176 40 150 Z" fill="#fbeadb" stroke="#d9b99c" stroke-width="2"/>
<g stroke="#a8987a" stroke-linecap="round" fill="none">
<path d="M66 170 L230 180" stroke-width="12"/>
<path d="M246 172 L328 82" stroke-width="7"/><path d="M256 186 L338 92" stroke-width="7"/></g>
<circle cx="64" cy="170" r="11" fill="#fbf7ec" stroke="#8a7f6a" stroke-width="2"/>
<circle cx="240" cy="181" r="12" fill="#fbf7ec" stroke="#8a7f6a" stroke-width="2"/>
<path d="M84 160 C126 116 214 118 258 166 C214 146 128 146 84 160 Z" fill="#e57373" stroke="#b03a3a" stroke-width="2"/>
<path d="M120 148 Q170 134 220 148" stroke="#b03a3a" stroke-width="1" fill="none"/>
<ellipse cx="344" cy="74" rx="15" ry="12" fill="#fbeadb" stroke="#d9b99c" stroke-width="2"/>
<rect x="336" y="36" width="30" height="34" rx="4" fill="#fff" stroke="#6f8fb3" stroke-width="2"/>
<path d="M366 48 Q380 56 366 66" stroke="#6f8fb3" stroke-width="2" fill="none"/>
${labels([
  { t: 'Q', lx: 170, ly: 40, tx: 170, ty: 138 },
  { t: 'P', lx: 140, ly: 240, tx: 140, ty: 175 },
  { t: 'R', lx: 240, ly: 240, tx: 240, ty: 192 },
  { t: 'S', lx: 370, ly: 150, tx: 302, ty: 120 }
])}
</svg>`;

  /* ---------- tables ---------- */
  const JELLY = '<table><caption>Mass of jelly left after 3 hours</caption>' +
    '<tr><th>Beaker</th><th>Jelly at the start</th><th>Mass left (g)</th></tr>' +
    '<tr><td>A</td><td>1 big piece, 20 g</td><td>14</td></tr>' +
    '<tr><td>B</td><td>many small pieces, 20 g in all</td><td>6</td></tr></table>';
  const ORGANS = '<table><caption>Mrs Tan\'s table</caption>' +
    '<tr><th>Row</th><th>Part</th><th>Makes digestive juices?</th><th>Digested food is taken into the blood here?</th></tr>' +
    '<tr><td>1</td><td>Mouth</td><td>Yes</td><td>Yes</td></tr>' +
    '<tr><td>2</td><td>Gullet</td><td>Yes</td><td>No</td></tr>' +
    '<tr><td>3</td><td>Small intestine</td><td>Yes</td><td>Yes</td></tr>' +
    '<tr><td>4</td><td>Large intestine</td><td>Yes</td><td>No</td></tr></table>';
  const PULSE = '<table><caption>Ryan\'s heartbeats</caption>' +
    '<tr><th>When he counted</th><th>Heartbeats in 1 minute</th></tr>' +
    '<tr><td>Sitting at rest</td><td>80</td></tr>' +
    '<tr><td>Right after skipping rope for 2 minutes</td><td>130</td></tr></table>';

  SCI.registerTopic({
    id: 'body-systems',
    title: 'Human body systems', emoji: '🫁',
    theme: 'Systems',
    extra: true,
    hidden: true,
    moeRef: 'MOE 2023 Primary Science, P4 Systems: human digestive system (parts, functions, path of food). Respiratory, circulatory, skeletal and muscular systems at overview level only (detail is P5-P6). Hidden from the child by Kev\'s ruling 2026-10-17.',
    notes: [
      { title: 'What is a system?', body: 'A system is a group of parts that work together to do a job.\nYour body has many systems: the digestive, respiratory, circulatory, skeletal and muscular systems.\nThe systems also work together to keep you alive.' },
      { title: 'The path of food', body: 'Food travels in this order:\nmouth, gullet, stomach, small intestine, large intestine.\nUndigested food leaves the body through the anus.\nDigestion is breaking down food into simpler substances that the body can take in.' },
      { title: 'What each part does', body: 'Mouth: teeth break food into smaller pieces; saliva (a digestive juice) starts digestion.\nGullet: pushes food down to the stomach. No digestion here.\nStomach: mixes food with digestive juices. Digestion continues.\nSmall intestine: digestion is completed, and digested food is taken into the blood.\nLarge intestine: takes in water from the undigested food. No digestion here.' },
      { title: 'Digestive juices', body: 'Digestive juices are made in only three parts: the mouth, the stomach and the small intestine.\nThe gullet and the large intestine do not make digestive juices.' },
      { title: 'Breathing: the respiratory system', body: 'Air goes in through the nose, down the windpipe and into the lungs.\nThe body takes in oxygen from the air and gives out carbon dioxide.\nThe air you breathe out has less oxygen and more carbon dioxide than the air you breathe in.' },
      { title: 'Blood: the circulatory system', body: 'The heart pumps blood through blood vessels to all parts of the body.\nBlood carries digested food and oxygen to every part, and carries carbon dioxide away to the lungs.' },
      { title: 'Bones and muscles', body: 'The skeletal system supports the body, gives it shape and protects organs inside.\nThe skull protects the brain. The ribcage protects the heart and lungs.\nMuscles pull on bones to move them. Bones meet at joints, such as the elbow and knee, so the body can bend.' },
      { title: 'Systems work together', body: 'When you run, your muscles and bones move your legs.\nYou breathe faster and your heart beats faster, so your blood carries more oxygen and digested food to your muscles.' }
    ],
    items: [
      /* x17 science expansion — lane sci-x-body */
      { id: 'x17-body-001', type: 'mcq', level: 1,
        stem: 'The diagram shows the human digestive system. Which part is the stomach?',
        figure: DIG,
        options: ['A', 'E', 'B', 'F'],
        answer: 1,
        explain: 'E is the stomach, the bag-shaped part just below the gullet. A is the gullet, the tube from the mouth to the stomach. B is the small intestine, the long coiled tube, and F is the large intestine around it.' },
      { id: 'x17-body-002', type: 'mcq', level: 1,
        stem: 'Look at the digestive system in the diagram. In which part is digested food taken into the blood?',
        figure: DIG,
        options: ['E', 'F', 'C', 'B'],
        answer: 3,
        explain: 'B, the small intestine. Digestion is completed there and the digested food passes into the blood. The stomach (E) only continues digestion; it does not take the digested food into the blood. The large intestine (F) takes in water, not digested food.' },
      { id: 'x17-body-003', type: 'mcq', level: 2,
        stem: 'Look at the diagram. Which shows the order in which food passes through the parts of the digestive system?',
        figure: DIG,
        options: ['C, A, E, B, F, D', 'C, E, A, B, F, D', 'C, A, E, F, B, D', 'C, A, B, E, F, D'],
        answer: 0,
        explain: 'Mouth (C), gullet (A), stomach (E), small intestine (B), large intestine (F), and then the undigested food leaves through the anus (D). The small intestine comes BEFORE the large intestine, even though its name sounds smaller.' },
      { id: 'x17-body-004', type: 'mcq', level: 2,
        stem: 'Digestive juices are made in only some parts of the digestive system. Look at the diagram. Which parts make digestive juices?',
        figure: DIG,
        options: ['A, E and F', 'C, E and B', 'C, A and E', 'E, B and F'],
        answer: 1,
        explain: 'The mouth (C) makes saliva, and the stomach (E) and small intestine (B) make digestive juices too. The gullet (A) only pushes food down to the stomach, and the large intestine (F) takes in water. Neither makes digestive juices.' },
      { id: 'x17-body-005', type: 'mcq', level: 1,
        stem: 'Look at the diagram. In which part is water taken in from the undigested food?',
        figure: DIG,
        options: ['B', 'E', 'F', 'A'],
        answer: 2,
        explain: 'F, the large intestine, takes in water from the undigested food. B, the small intestine, is where digested food is taken into the blood. What is left after the large intestine leaves the body through the anus.' },
      { id: 'x17-body-006', type: 'oeq', level: 2, marks: 2,
        stem: 'Look at the diagram. Sam says that food is digested in part A. Is he correct? Explain your answer.',
        figure: DIG,
        model: 'No, Sam is not correct. Part A is the gullet. There are no digestive juices in the gullet, so food is not digested there. The gullet only pushes food down to the stomach.',
        keys: [['gullet'], ['no digestive juices', 'no digestive juice', 'does not make digestive juices', 'does not produce digestive juices']],
        explain: 'Claim, evidence, reason: say Sam is not correct, name part A as the gullet, then give the reason: the gullet makes no digestive juices, so it only moves food to the stomach.' },
      { id: 'x17-body-007', type: 'mcq', level: 1,
        stem: 'What is digestion?',
        figure: null,
        options: ['Putting food into the mouth to eat it', 'Passing out undigested food from the body', 'Pushing food from the mouth to the stomach', 'Breaking food down so the body can take it in'],
        answer: 3,
        explain: 'Digestion is breaking down food into simpler substances that the body can take in. Eating is how food gets in, the gullet pushes it to the stomach, and passing out waste happens at the end. None of these is digestion itself.' },
      { id: 'x17-body-008', type: 'mcq', level: 3,
        stem: 'At a hawker centre, Wei Jie\'s grandmother tells him to chew his chicken rice well before he swallows it. How does chewing help digestion?',
        figure: null,
        options: ['Teeth break food into smaller pieces, so digestive juices can digest it faster',
          'Chewing lets the digested food pass into the blood while it is in the mouth',
          'Chewing sends the food straight to the stomach without passing the gullet',
          'Teeth digest all of the food completely, so the stomach has nothing to do'],
        answer: 0,
        explain: 'Teeth cut and grind food into smaller pieces. Digestive juices work faster on small pieces, so the food is digested faster. Digestion only STARTS in the mouth: it continues in the stomach and is completed in the small intestine, which is also where digested food enters the blood.' },
      { id: 'x17-body-009', type: 'oeq', level: 3, marks: 2,
        stem: 'Ben put 20 g of jelly into each of two beakers, A and B. Each beaker had the same amount of the same digestive juice. In A the jelly was one big piece. In B it was cut into many small pieces. After 3 hours he measured the mass of jelly left. Use his results to explain why we should chew our food well.',
        figure: JELLY,
        model: 'There was less jelly left in B (6 g) than in A (14 g), so the small pieces of jelly were digested faster than the big piece. Chewing breaks food into smaller pieces, so our food is digested faster.',
        keys: [['less jelly left in B', '6 g', 'digested faster', 'digested more quickly'], ['chewing breaks food into smaller pieces', 'smaller pieces', 'chew']],
        explain: 'Use the data first (B had less jelly left, so its small pieces were digested faster), then link it to the mouth: chewing breaks food into smaller pieces, the same as cutting the jelly up.' },
      { id: 'x17-body-010', type: 'mcq', level: 2,
        stem: 'Mrs Tan wrote down some facts about four parts of the digestive system. Which row is correct?',
        figure: ORGANS,
        options: ['Row 1', 'Row 2', 'Row 3', 'Row 4'],
        answer: 2,
        explain: 'Row 3. The small intestine makes digestive juices and takes digested food into the blood. Row 1 is wrong because the mouth makes saliva but does not take digested food into the blood. Rows 2 and 4 are wrong because the gullet and the large intestine make no digestive juices.' },
      { id: 'x17-body-011', type: 'mcq', level: 3,
        stem: 'Look at the diagram. A doctor removed a large section of part F from Mr Lim\'s digestive system. Which problem is Mr Lim most likely to have?',
        figure: DIG,
        options: ['He cannot swallow food down to his stomach', 'His waste (faeces) is more watery than before', 'His food is no longer digested in the stomach', 'His mouth can no longer make saliva for food'],
        answer: 1,
        explain: 'F is the large intestine, which takes in water from the undigested food. With less large intestine, less water is taken in, so his faeces are more watery. Swallowing (gullet), the stomach and saliva (mouth) come before part F, so they still work.' },
      { id: 'x17-body-012', type: 'oeq', level: 3, marks: 2,
        stem: 'Look at the diagram. Part B of Aisha\'s grandfather\'s digestive system is damaged. He eats as much as before, but he is losing weight. Explain why.',
        figure: DIG,
        model: 'Part B is the small intestine, where digested food is taken into the blood. Because part B is damaged, less digested food is taken into his blood, so his body gets less food even though he eats the same amount.',
        keys: [['small intestine'], ['less digested food']],
        explain: 'Name part B (small intestine) and say what it does, then link the damage to the result: less digested food gets into his blood, so his body gets less food and he loses weight.' },
      { id: 'x17-body-013', type: 'mcq', level: 2,
        stem: 'Siti swallowed a watermelon seed whole. It came out of her body the next day, still whole. Which parts did the seed pass through after her mouth, in order?',
        figure: null,
        options: ['Gullet, small intestine, stomach, large intestine', 'Gullet, stomach, large intestine, small intestine', 'Stomach, gullet, small intestine, large intestine', 'Gullet, stomach, small intestine, large intestine'],
        answer: 3,
        explain: 'Everything we swallow takes the same path: gullet, stomach, small intestine, large intestine, then out through the anus. The seed was not digested, so it left as undigested waste, but it still passed through every part.' },
      { id: 'x17-body-014', type: 'mcq', level: 1,
        stem: 'The diagram shows some parts inside the head and chest. Air passes through part X to reach the lungs. What is part X?',
        figure: RESP,
        options: ['Windpipe', 'Gullet', 'Blood vessel', 'Backbone'],
        answer: 0,
        explain: 'X is the windpipe. It carries air from the nose down to the lungs. The gullet is a different tube, behind the windpipe, and it carries food to the stomach, not air to the lungs.' },
      { id: 'x17-body-015', type: 'mcq', level: 2,
        stem: 'Look at the diagram. Which shows the path of air when Priya breathes in through her nose?',
        figure: RESP,
        options: ['W, Z, Y', 'Y, X, W', 'W, X, Y', 'W, X, Z'],
        answer: 2,
        explain: 'Air enters through the nose (W), goes down the windpipe (X) and into the lungs (Y). Z is the heart, which pumps blood, not air. Y, X, W is the path of air when she breathes OUT.' },
      { id: 'x17-body-016', type: 'mcq', level: 2,
        stem: 'Compared with the air Hui Min breathes in, the air she breathes out has ...',
        figure: null,
        options: ['only carbon dioxide and no oxygen', 'more oxygen and less carbon dioxide', 'the same amounts of oxygen and carbon dioxide', 'less oxygen and more carbon dioxide'],
        answer: 3,
        explain: 'Her body takes in some oxygen and gives out carbon dioxide, so breathed-out air has less oxygen and more carbon dioxide. It still has some oxygen: we do not use up all the oxygen in each breath.' },
      { id: 'x17-body-017', type: 'mcq', level: 1,
        stem: 'The diagram shows some parts of the body. Which part pumps blood around the body?',
        figure: CIRC,
        options: ['P', 'Q', 'R', 'S'],
        answer: 2,
        explain: 'R is the heart. It pumps blood through the blood vessels (S) to all parts of the body. Q, the lungs, take in air; they do not pump blood. P is the brain.' },
      { id: 'x17-body-018', type: 'mcq', level: 2,
        stem: 'What does blood carry to all parts of the body?',
        figure: null,
        options: ['Digested food and oxygen', 'Undigested food and air', 'Water only, from the stomach', 'Carbon dioxide only'],
        answer: 0,
        explain: 'Blood carries digested food (taken in at the small intestine) and oxygen (taken in at the lungs) to every part of the body. Undigested food never gets into the blood: it stays in the gut and leaves through the anus. Blood carries carbon dioxide AWAY to the lungs.' },
      { id: 'x17-body-019', type: 'oeq', level: 3, marks: 2,
        stem: 'Ryan counted his heartbeats in 1 minute while sitting at rest. Then he skipped rope for 2 minutes on the school field and counted again. Explain why his heart beat faster after skipping.',
        figure: PULSE,
        model: 'His heart beat faster, from 80 to 130 beats in a minute, because his muscles were working harder and needed more oxygen and digested food. His heart pumped blood faster to carry more oxygen and digested food to his muscles.',
        keys: [['more oxygen', 'more digested food'], ['pumped blood faster', 'pumps blood faster', 'carry more oxygen']],
        explain: 'Give the chain: skipping makes his muscles work harder, so they need more oxygen and digested food. The heart pumps blood faster so that the blood carries more of them to the muscles.' },
      { id: 'x17-body-020', type: 'mcq', level: 1,
        stem: 'The diagram shows a human skeleton. Which part protects the brain?',
        figure: SKEL,
        options: ['K', 'J', 'L', 'M'],
        answer: 1,
        explain: 'J is the skull, a hard case of bone around the brain. K, the ribcage, protects the heart and lungs. L is the backbone, and M is the knee joint.' },
      { id: 'x17-body-021', type: 'oeq', level: 2, marks: 2,
        stem: 'Look at the skeleton in the diagram. Name part K and state how it helps the body.',
        figure: SKEL,
        model: 'Part K is the ribcage. It protects the heart and lungs inside the chest.',
        keys: [['ribcage', 'rib cage', 'ribs'], ['heart and lungs', 'lungs and heart']],
        explain: 'Name the part (the ribcage), then say which organs it protects: the heart and lungs. Saying only "it protects the body" is too vague for the mark.' },
      { id: 'x17-body-022', type: 'oeq', level: 2, marks: 2,
        stem: 'Jun Kai is playing basketball. Besides protecting the organs inside him, state two ways his skeletal system helps him.',
        figure: null,
        model: 'It supports his body and gives it shape, so he can stand upright. It works with his muscles so that he can move, such as jumping to shoot the ball.',
        keys: [['supports', 'gives it shape', 'shape'], ['works with his muscles', 'muscles']],
        explain: 'The skeleton has three jobs: it supports the body and gives it shape, it protects organs, and it works with the muscles to move the body. The stem rules out protecting, so give the other two.' },
      { id: 'x17-body-023', type: 'mcq', level: 2,
        stem: 'Mei Ling lifts a cup of Milo. The diagram shows her arm. Which part pulls on the bones to bend her arm at the elbow?',
        figure: ARM,
        options: ['P', 'R', 'S', 'Q'],
        answer: 3,
        explain: 'Q is a muscle. Muscles pull on bones to move them. Bones (P and S) cannot move by themselves. The elbow joint (R) is where the bones meet, so the arm can bend there, but the joint does not pull.' },
      { id: 'x17-body-024', type: 'mcq', level: 3,
        stem: 'During a school race, Daniel breathes faster and his heart beats faster. Which two body systems are working harder to bring more oxygen to his leg muscles?',
        figure: null,
        options: ['Respiratory and circulatory systems', 'Digestive and skeletal systems', 'Skeletal and muscular systems', 'Digestive and circulatory systems'],
        answer: 0,
        explain: 'The respiratory system takes in the oxygen (faster breathing) and the circulatory system carries it in the blood to the muscles (faster heartbeat). The skeletal and muscular systems move his legs, but they do not bring the oxygen. The digestive system deals with food, not oxygen.' },
      { id: 'x17-body-025', type: 'oeq', level: 3, marks: 2,
        stem: 'Kumar ate nasi lemak for breakfast. Later, his leg muscles used the digested food to help him run. Explain how the digested food got from his digestive system to his leg muscles.',
        figure: null,
        model: 'The food was digested, and the digested food was taken into the blood in the small intestine. The heart pumped the blood through the blood vessels, carrying the digested food to his leg muscles.',
        keys: [['small intestine'], ['heart pumped the blood', 'blood vessels', 'carrying the digested food']],
        explain: 'Two systems work together. The digestive system: digested food enters the blood at the small intestine. The circulatory system: the heart pumps that blood through the blood vessels to the muscles.' }
    ]
  });
})();
