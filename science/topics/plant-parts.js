"use strict";
/*
 * Plant parts and their functions (Systems theme).
 *
 * SYLLABUS PLACEMENT (verified 2026-10-06): under the MOE 2023 Primary Science
 * syllabus, "Plant System (plant parts and functions)" is a PRIMARY 4 topic.
 * The 2023 syllabus split the old Lower Block (P3-4) into level-specific years;
 * P3 now covers Diversity (living things, materials), Cycles (life cycles of
 * plants and animals) and Interactions (magnets). Evidence: Haig Girls' School
 * P3 Science briefing 2025 (2023 syllabus) lists no plant-parts topic; their
 * 2022 briefing (2014 syllabus) had "Plant System" in Lower Block P3-P4.
 * Overlap with P3: P3 "Life Cycles of Plants" covers flower -> fruit -> seed
 * and what plants need to grow, so those items are fair game for a P3 paper.
 * Built anyway at the integrator's request; the shell may label it "P4 preview".
 */
(function () {
  const F = 'font-family="sans-serif"';

  // Simple flowering plant with lettered parts. L = {flower, leaf, stem, root}
  const plantSvg = (L) => `<svg viewBox="0 0 260 250" width="100%" style="max-width:280px" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="A flowering plant with four parts labelled by letters">
<rect x="0" y="170" width="260" height="80" fill="#ead9b8"/>
<line x1="0" y1="170" x2="260" y2="170" stroke="#8b6b3e" stroke-width="2"/>
<text x="8" y="240" ${F} font-size="11" fill="#6b5230">soil</text>
<path d="M130 170 L130 62" stroke="#3f8f3f" stroke-width="6" fill="none"/>
<ellipse cx="106" cy="122" rx="26" ry="10" fill="#5cb85c" transform="rotate(25 106 122)"/>
<ellipse cx="154" cy="100" rx="26" ry="10" fill="#5cb85c" transform="rotate(-25 154 100)"/>
<circle cx="130" cy="36" r="10" fill="#f28cb1"/><circle cx="142" cy="48" r="10" fill="#f28cb1"/>
<circle cx="130" cy="60" r="10" fill="#f28cb1"/><circle cx="118" cy="48" r="10" fill="#f28cb1"/>
<circle cx="130" cy="48" r="7" fill="#f6c90e"/>
<g stroke="#8b5a2b" stroke-width="3" fill="none">
<path d="M130 170 L130 218"/><path d="M130 184 L108 206"/><path d="M130 184 L152 208"/>
<path d="M130 200 L116 228"/><path d="M130 200 L146 230"/></g>
<g stroke="#333" stroke-width="1.2">
<line x1="145" y1="38" x2="206" y2="30"/><line x1="172" y1="94" x2="206" y2="92"/>
<line x1="133" y1="145" x2="206" y2="145"/><line x1="150" y1="210" x2="206" y2="212"/></g>
<g ${F} font-size="15" font-weight="bold" fill="#222">
<circle cx="218" cy="30" r="12" fill="#fff" stroke="#333"/><text x="213" y="35">${L.flower}</text>
<circle cx="218" cy="92" r="12" fill="#fff" stroke="#333"/><text x="213" y="97">${L.leaf}</text>
<circle cx="218" cy="145" r="12" fill="#fff" stroke="#333"/><text x="213" y="150">${L.stem}</text>
<circle cx="218" cy="212" r="12" fill="#fff" stroke="#333"/><text x="213" y="217">${L.root}</text></g>
</svg>`;

  const PLANT = plantSvg({ flower: 'B', leaf: 'D', stem: 'A', root: 'C' });

  const CELERY = `<svg viewBox="0 0 280 240" width="100%" style="max-width:280px" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="A celery stalk standing in a beaker of red-coloured water">
<ellipse cx="118" cy="34" rx="16" ry="9" fill="#66bb6a"/><ellipse cx="142" cy="28" rx="16" ry="9" fill="#66bb6a"/>
<ellipse cx="130" cy="20" rx="14" ry="8" fill="#66bb6a"/>
<rect x="123" y="36" width="14" height="176" rx="5" fill="#b9e0b0" stroke="#5a9a5a"/>
<rect x="92" y="150" width="76" height="66" fill="#e53935" opacity="0.55"/>
<path d="M90 110 L90 218 L170 218 L170 110" fill="none" stroke="#555" stroke-width="2.5"/>
<g stroke="#333" stroke-width="1.2"><line x1="137" y1="80" x2="190" y2="80"/><line x1="166" y1="185" x2="190" y2="185"/><line x1="148" y1="28" x2="190" y2="28"/></g>
<g ${F} font-size="12" fill="#222"><text x="194" y="32">leaves</text><text x="194" y="84">celery</text><text x="194" y="97">stalk</text>
<text x="194" y="182">red-coloured</text><text x="194" y="196">water</text></g>
</svg>`;

  const LEAF = `<svg viewBox="0 0 260 180" width="100%" style="max-width:280px" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="A leaf with three parts labelled X, Y and Z">
<path d="M30 95 L80 95" stroke="#3f8f3f" stroke-width="5"/>
<path d="M80 95 Q150 20 230 95 Q150 170 80 95 Z" fill="#7cc576" stroke="#3f8f3f" stroke-width="2"/>
<g stroke="#2e6b2e" stroke-width="2" fill="none"><path d="M80 95 L228 95"/>
<path d="M120 95 L140 62"/><path d="M120 95 L140 128"/><path d="M160 95 L180 66"/><path d="M160 95 L180 124"/></g>
<g stroke="#333" stroke-width="1.2"><line x1="190" y1="80" x2="214" y2="30"/><line x1="50" y1="95" x2="40" y2="140"/><line x1="170" y1="81" x2="150" y2="24"/></g>
<g ${F} font-size="15" font-weight="bold" fill="#222">
<circle cx="220" cy="22" r="12" fill="#fff" stroke="#333"/><text x="215" y="27">X</text>
<circle cx="38" cy="152" r="12" fill="#fff" stroke="#333"/><text x="33" y="157">Y</text>
<circle cx="146" cy="16" r="12" fill="#fff" stroke="#333"/><text x="141" y="21">Z</text></g>
</svg>`;

  const T = 'style="border-collapse:collapse"';
  const td = (s) => `<td style="border:1px solid #888;padding:4px 8px">${s}</td>`;
  const th = (s) => `<th style="border:1px solid #888;padding:4px 8px">${s}</th>`;
  const table = (head, rows) => `<table ${T}><tr>${head.map(th).join('')}</tr>${rows.map(r => `<tr>${r.map(td).join('')}</tr>`).join('')}</table>`;

  const LIGHT_EXPT = table(
    ['Set-up', 'Where the pot was placed', 'Water given each day', 'Plant after 2 weeks'],
    [['P', 'Near a sunny window', '50 ml', 'Green leaves, healthy'],
     ['Q', 'Inside a dark cupboard', '50 ml', 'Yellow leaves, weak']]);

  const FAIR_TEST = table(
    ['Set-up', 'Light', 'Water given each day', 'Type of plant'],
    [['W', 'Sunlight', '50 ml', 'Balsam'],
     ['X', 'Dark', '50 ml', 'Balsam'],
     ['Y', 'Dark', '100 ml', 'Balsam'],
     ['Z', 'Sunlight', '100 ml', 'Bean']]);

  const OIL_SETUP = 'Two measuring cylinders each had 100 ml of water with a thin layer of oil on top. A plant with roots was placed in cylinder K only. ';
  const OIL_EXPT = table(
    ['Cylinder', 'What was inside', 'Water at start', 'Water after 3 days'],
    [['K', 'Water + oil + plant', '100 ml', '70 ml'],
     ['L', 'Water + oil only', '100 ml', '100 ml']]);

  const WATER_EXPT = table(
    ['Pot', 'Water given', 'Plant after 5 days'],
    [['E', '50 ml every day', 'Upright, leaves firm'],
     ['F', 'No water', 'Drooping (wilted), leaves soft']]);

  const FLOWER_EXPT = table(
    ['Time', 'Colour of the petals'],
    [['At the start', 'White'], ['After 1 day', 'Light blue']]);

  /* ---------- x17 science expansion figures (lane sci-x-plantcycle) ---------- */
  const x17Lbl = (cx, cy, L) => `<circle cx="${cx}" cy="${cy}" r="12" fill="#fff" stroke="#333"/><text x="${cx - 5}" y="${cy + 5}" ${F} font-size="15" font-weight="bold" fill="#222">${L}</text>`;
  const x17Flower = (x, y, petal) => [0, 72, 144, 216, 288].map((a) => `<circle cx="${(x + 7 * Math.cos(a * Math.PI / 180)).toFixed(1)}" cy="${(y + 7 * Math.sin(a * Math.PI / 180)).toFixed(1)}" r="6" fill="${petal}" stroke="#b08a8a" stroke-width="1"/>`).join('') + `<circle cx="${x}" cy="${y}" r="4" fill="#f6c90e"/>`;

  // Chilli plant, five parts lettered: P fruit, Q stem, R flower, S roots, T leaf.
  const X17_CHILLI = `<svg viewBox="0 0 300 260" width="100%" data-maxw="480" style="max-width:300px" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="A chilli plant with five parts labelled P to T: P a chilli, Q the stem, R a flower, S the roots, T a leaf">
<rect x="0" y="190" width="300" height="70" fill="#ead9b8"/>
<line x1="0" y1="190" x2="300" y2="190" stroke="#8b6b3e" stroke-width="2"/>
<text x="8" y="252" ${F} font-size="12" fill="#6b5230">soil</text>
<path d="M150 190 L150 46" stroke="#3f8f3f" stroke-width="6" fill="none"/>
<path d="M150 126 L104 98" stroke="#3f8f3f" stroke-width="4" fill="none"/>
<path d="M150 106 L192 86" stroke="#3f8f3f" stroke-width="4" fill="none"/>
<ellipse cx="184" cy="122" rx="26" ry="10" fill="#5cb85c" transform="rotate(-20 184 122)"/>
<ellipse cx="124" cy="164" rx="26" ry="10" fill="#5cb85c" transform="rotate(20 124 164)"/>
<ellipse cx="210" cy="80" rx="20" ry="8" fill="#5cb85c" transform="rotate(-15 210 80)"/>
<path d="M112 104 C121 113 121 137 111 154 C104 138 104 117 112 104 Z" fill="#e53935" stroke="#a32020" stroke-width="1.2"/>
<path d="M127 113 C134 121 134 141 126 152 C120 140 120 124 127 113 Z" fill="#e53935" stroke="#a32020" stroke-width="1.2"/>
<circle cx="112" cy="104" r="3.5" fill="#3f8f3f"/><circle cx="127" cy="113" r="3.5" fill="#3f8f3f"/>
${x17Flower(150, 38, '#fff')}${x17Flower(100, 92, '#fff')}
<g stroke="#8b5a2b" stroke-width="3" fill="none">
<path d="M150 190 L150 238"/><path d="M150 204 L128 226"/><path d="M150 204 L172 228"/>
<path d="M150 220 L136 246"/><path d="M150 220 L166 248"/></g>
<g stroke="#333" stroke-width="1.2">
<line x1="159" y1="36" x2="260" y2="30"/><line x1="204" y1="114" x2="260" y2="112"/>
<line x1="153" y1="176" x2="260" y2="174"/><line x1="170" y1="228" x2="260" y2="226"/><line x1="105" y1="128" x2="40" y2="124"/></g>
${x17Lbl(272, 30, 'R')}${x17Lbl(272, 112, 'T')}${x17Lbl(272, 174, 'Q')}${x17Lbl(272, 226, 'S')}${x17Lbl(28, 124, 'P')}
</svg>`;

  // Long bean plant winding round a pole in the school garden.
  const X17_CLIMBER = `<svg viewBox="0 0 260 270" width="100%" data-maxw="420" style="max-width:260px" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="A long bean plant with a thin stem winding round a wooden pole stuck in the soil">
<rect x="0" y="222" width="260" height="48" fill="#ead9b8"/>
<line x1="0" y1="222" x2="260" y2="222" stroke="#8b6b3e" stroke-width="2"/>
<rect x="124" y="18" width="10" height="236" fill="#a0784a" stroke="#6b4a26"/>
<path d="M129 222 C150 207 150 192 129 182 C108 172 108 157 129 147 C150 137 150 122 129 112 C108 102 108 87 129 77 C150 67 150 52 129 42" stroke="#3f8f3f" stroke-width="3.5" fill="none"/>
<ellipse cx="98" cy="164" rx="16" ry="8" fill="#5cb85c" transform="rotate(-15 98 164)"/>
<ellipse cx="160" cy="129" rx="16" ry="8" fill="#5cb85c" transform="rotate(15 160 129)"/>
<ellipse cx="98" cy="94" rx="16" ry="8" fill="#5cb85c" transform="rotate(-15 98 94)"/>
<ellipse cx="160" cy="59" rx="16" ry="8" fill="#5cb85c" transform="rotate(15 160 59)"/>
<g stroke="#8b5a2b" stroke-width="2.5" fill="none"><path d="M129 222 L118 246"/><path d="M129 222 L142 248"/><path d="M129 226 L128 252"/></g>
<g stroke="#333" stroke-width="1.2"><line x1="123" y1="130" x2="64" y2="130"/><line x1="147" y1="200" x2="194" y2="204"/></g>
<g ${F} font-size="14" fill="#222"><text x="22" y="135">pole</text><text x="198" y="209">stem</text><text x="8" y="262" font-size="12" fill="#6b5230">soil</text></g>
</svg>`;

  // Four identical potted plants in pots, each with a different part removed.
  const X17_POTS = (() => {
    const pot = (i) => {
      const x0 = 6 + i * 88, c = x0 + 40, noRoots = i === 1, noLeaves = i === 2, noFlower = i === 3;
      let s = `<rect x="${x0}" y="4" width="84" height="212" rx="8" fill="none" stroke="#bbb"/>`;
      s += `<text x="${x0 + 8}" y="24" ${F} font-size="17" font-weight="bold" fill="#222">${'ABCD'[i]}</text>`;
      s += `<path d="M${c - 28} 122 L${c + 28} 122 L${c + 21} 172 L${c - 21} 172 Z" fill="#ead9b8" stroke="#8b5a2b" stroke-width="2.5"/>`;
      s += `<line x1="${c - 27}" y1="128" x2="${c + 27}" y2="128" stroke="#8b6b3e" stroke-width="1.5"/>`;
      if (!noRoots) s += `<g stroke="#8b5a2b" stroke-width="2" fill="none"><path d="M${c} 128 L${c} 160"/><path d="M${c} 136 L${c - 12} 152"/><path d="M${c} 136 L${c + 12} 154"/><path d="M${c} 146 L${c - 7} 164"/><path d="M${c} 146 L${c + 8} 164"/></g>`;
      s += `<path d="M${c} ${noRoots ? 133 : 128} L${c} 44" stroke="#3f8f3f" stroke-width="4" fill="none"/>`;
      if (noRoots) s += `<line x1="${c - 5}" y1="134" x2="${c + 5}" y2="132" stroke="#8b5a2b" stroke-width="2"/>`;
      if (noLeaves) s += `<g stroke="#3f8f3f" stroke-width="2"><line x1="${c}" y1="100" x2="${c - 6}" y2="96"/><line x1="${c}" y1="86" x2="${c + 6}" y2="82"/><line x1="${c}" y1="70" x2="${c - 6}" y2="66"/></g>`;
      else s += `<ellipse cx="${c - 14}" cy="98" rx="14" ry="5.5" fill="#5cb85c" transform="rotate(25 ${c - 14} 98)"/><ellipse cx="${c + 14}" cy="84" rx="14" ry="5.5" fill="#5cb85c" transform="rotate(-25 ${c + 14} 84)"/><ellipse cx="${c - 13}" cy="68" rx="13" ry="5" fill="#5cb85c" transform="rotate(25 ${c - 13} 68)"/>`;
      if (!noFlower) s += [0, 90, 180, 270].map((a) => `<circle cx="${(c + 6 * Math.cos(a * Math.PI / 180)).toFixed(1)}" cy="${(38 + 6 * Math.sin(a * Math.PI / 180)).toFixed(1)}" r="5.5" fill="#f28cb1"/>`).join('') + `<circle cx="${c}" cy="38" r="3.5" fill="#f6c90e"/>`;
      else s += `<line x1="${c - 5}" y1="45" x2="${c + 5}" y2="43" stroke="#3f8f3f" stroke-width="2"/>`;
      const cap = [['nothing', 'removed'], ['roots', 'cut off'], ['all leaves', 'removed'], ['flowers', 'removed']][i];
      s += `<text x="${c}" y="192" text-anchor="middle" ${F} font-size="12" fill="#222">${cap[0]}</text><text x="${c}" y="207" text-anchor="middle" ${F} font-size="12" fill="#222">${cap[1]}</text>`;
      return s;
    };
    return `<svg viewBox="0 0 360 220" width="100%" style="max-width:360px" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Four identical plants in pots. A: nothing removed. B: roots cut off, stem pushed into the soil. C: all leaves removed. D: flowers removed.">${[0, 1, 2, 3].map(pot).join('')}</svg>`;
  })();

  // Plant with arrow A going up the stem and arrow B coming down it.
  const X17_FLOW = `<svg viewBox="0 0 260 250" width="100%" data-maxw="440" style="max-width:280px" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="A plant with two arrows beside the stem: arrow A points up from the roots to the leaves, arrow B points down from the leaves to the roots">
<rect x="0" y="190" width="260" height="60" fill="#ead9b8"/>
<line x1="0" y1="190" x2="260" y2="190" stroke="#8b6b3e" stroke-width="2"/>
<text x="8" y="242" ${F} font-size="12" fill="#6b5230">soil</text>
<path d="M130 190 L130 46" stroke="#3f8f3f" stroke-width="6" fill="none"/>
<ellipse cx="104" cy="82" rx="26" ry="10" fill="#5cb85c" transform="rotate(25 104 82)"/>
<ellipse cx="156" cy="70" rx="26" ry="10" fill="#5cb85c" transform="rotate(-25 156 70)"/>
${x17Flower(130, 36, '#f28cb1')}
<g stroke="#8b5a2b" stroke-width="3" fill="none"><path d="M130 190 L130 236"/><path d="M130 202 L108 224"/><path d="M130 202 L152 226"/><path d="M130 216 L116 244"/><path d="M130 216 L146 246"/></g>
<line x1="116" y1="226" x2="116" y2="106" stroke="#1e6fc0" stroke-width="3.5"/><polygon points="116,94 109,108 123,108" fill="#1e6fc0"/>
<line x1="144" y1="90" x2="144" y2="212" stroke="#d9822b" stroke-width="3.5"/><polygon points="144,224 137,210 151,210" fill="#d9822b"/>
${x17Lbl(92, 150, 'A')}${x17Lbl(168, 150, 'B')}
</svg>`;

  const X17_MARKET = table(['Food from the market', 'Part of the plant we eat'],
    [['Kangkong', 'Leaves and stem'], ['Carrot', 'Root'], ['Chilli', 'Fruit'], ['Potato', 'Root']]);

  SCI.registerTopic({
    id: 'plant-parts',
    title: 'Plant Parts and Functions', emoji: '🌱',
    theme: 'Systems',
    extra: true,
    moeRef: '(para) Plant System: identify the parts of a plant (leaf, stem, root, flower, fruit) and state their functions; show that the parts work together. MOE 2023 syllabus places this at P4 (Systems); P3 "Life Cycles of Plants" overlaps on flower, fruit and seed.',
    notes: [
      { title: 'A plant is a system', body: 'A flowering plant has parts: leaves, stem, roots, flowers and fruits. Each part has its own job, and the parts work together to keep the plant alive. If one part is removed, the whole plant suffers.' },
      { title: 'Leaves: the food makers', body: 'Leaves make food for the plant. To make food, a plant needs light (sunlight), water and air (carbon dioxide). A leaf has a leaf blade (the flat part), a leaf stalk (joins it to the stem) and veins (tiny lines that carry water and food). Plants make their own food. They do NOT get food from the soil.' },
      { title: 'Stem: holds up and carries', body: 'The stem holds the plant upright so the leaves can get light. It carries water and mineral salts from the roots to the leaves, and carries food made in the leaves to other parts of the plant. Trees have hard, woody stems. Plants like balsam have soft (non-woody) stems. Some plants with weak stems climb on supports or creep along the ground.' },
      { title: 'Roots: hold and take in', body: 'Roots hold the plant firmly in the soil. They take in (absorb) water and mineral salts from the soil. Without roots, a plant cannot take in water, so it wilts and dies.' },
      { title: 'Flowers, fruits and seeds', body: 'Flowers help the plant reproduce. A flower develops into a fruit. The fruit protects the seeds inside it, and the seeds can grow into new plants. Anything that develops from a flower and has seeds is a fruit, so a tomato, chilli and cucumber are fruits!' },
      { title: 'Parts that store food', body: 'Some roots store food, e.g. carrot, radish and sweet potato. Some stems store food, e.g. potato, ginger and sugar cane. Easy mix-up: a potato grows underground, but it is a STEM, not a root.' },
      { title: 'Experiments to know', body: 'Celery in red water: the leaves turn red and red dots show in a cut stem, so the stem carries water up. Plant in the dark: leaves turn yellow and the plant becomes weak, so plants need light to make food. Oil on water: the oil layer stops water evaporating, so any water lost was taken in by the plant\'s roots.' },
      { title: 'Fair test', body: 'In a fair test, change only ONE thing (the variable you are testing) and keep everything else the same: same type of plant, same size, same amount of water, same soil. Using more plants, or repeating the experiment, makes the results more reliable.' },
      { title: 'Exam key words', body: 'Write the part AND its job: "the roots take in water", "the stem carries water to the leaves", "the leaves make food", "the fruit protects the seeds". For "what happens if..." questions, say what the plant can no longer do, then the result: "cannot take in water, so it will wilt and die".' }
    ],
    items: [
      // ---------- MCQ ----------
      { id: 'pp-001', type: 'mcq', level: 1,
        stem: 'Look at the plant. Which letter shows the stem?',
        figure: PLANT,
        options: ['A', 'B', 'C', 'D'], answer: 0,
        optionFeedback: {
          2: 'C is long and thin like a stem, so this is an easy mix-up! But C is under the soil, which makes it the roots. The stem is the upright part above the soil.' },
        explain: 'A is the stem: the long upright part joining the roots to the leaves and flower. B is the flower, C the roots and D a leaf.' },
      { id: 'pp-002', type: 'mcq', level: 1,
        stem: 'Look at the plant. Which part makes food for the plant?',
        figure: PLANT,
        options: ['A', 'B', 'C', 'D'], answer: 3,
        optionFeedback: {
          0: 'The stem does carry food, so this is a fair guess! But it only carries the food. The food is made in the leaves (D).',
          2: 'Lots of children think plants get food from the soil through their roots. The roots take in water and mineral salts, and the leaves (D) make the food.' },
        explain: 'D is a leaf. Leaves make food for the plant using light, water and air.' },
      { id: 'pp-003', type: 'mcq', level: 1,
        stem: 'Look at the plant. Which part takes in water and mineral salts from the soil?',
        figure: PLANT,
        options: ['A', 'B', 'C', 'D'], answer: 2,
        optionFeedback: {
          0: 'The stem does carry water, so you are close! But the stem only carries water up. The part in the soil that takes it in is the roots (C).' },
        explain: 'C is the roots. They are in the soil, where they take in water and mineral salts.' },
      { id: 'pp-004', type: 'mcq', level: 2,
        stem: 'Look at the plant. Which part will later develop into a fruit?',
        figure: PLANT,
        options: ['A', 'B', 'C', 'D'], answer: 1,
        optionFeedback: {
          3: 'Leaves are very important, but their job is making food. Only a flower (B) develops into a fruit.' },
        explain: 'B is the flower. A flower develops into a fruit, and the fruit holds the seeds.' },
      { id: 'pp-005', type: 'mcq', level: 2,
        stem: 'Look at the plant. Part C was cut off and the plant was put back in the soil. What will most likely happen after a few days?',
        figure: PLANT,
        options: ['It will grow more leaves.', 'It will grow more flowers.', 'It will stay healthy because the stem can take in water.', 'It will wilt because it cannot take in water.'], answer: 3,
        technique: 'Claim, evidence, reason',
        steps: [
          'Find the part that is missing, and name it.',
          'Say the job that part does for the plant.',
          'Ask: what can the plant no longer do without it?',
          'Say what will happen, joined with "so": no roots, so no water, so it wilts.'],
        optionFeedback: {
          0: 'A plant needs water to grow new leaves. With no roots, it cannot take in any water, so it cannot grow.',
          1: 'Growing flowers needs water too. With no roots, the plant cannot take in water.',
          2: 'The stem does carry water, so this sounds sensible! But the stem only carries water that the roots took in. With no roots, no water gets in.' },
        explain: 'C is the roots. Without roots the plant cannot take in water, so it wilts and will die.' },
      { id: 'pp-006', type: 'mcq', level: 1,
        stem: 'What is the main function of the leaves?',
        figure: null,
        options: ['To make food for the plant', 'To take in water from the soil', 'To hold the plant firmly in the soil', 'To protect the seeds'], answer: 0,
        optionFeedback: {
          1: 'Taking in water is a real plant job, but it belongs to the roots. Leaves make food.',
          2: 'Holding the plant in the soil is the roots\' job. Leaves make food.' },
        explain: 'Leaves make food. Roots take in water and hold the plant in the soil. Fruits protect seeds.' },
      { id: 'pp-007', type: 'mcq', level: 1,
        stem: 'Which of these are the two functions of roots?',
        figure: null,
        options: ['Make food and hold the plant upright', 'Carry food to the flowers and make seeds from the flowers', 'Hold the plant firmly in the soil and take in water and mineral salts', 'Protect the seeds and attract insects to the flowers'], answer: 2,
        optionFeedback: {
          0: 'Close, but these belong to other parts: leaves make food, and the stem holds the plant upright.' },
        explain: 'Roots hold (anchor) the plant firmly in the soil and take in water and mineral salts from the soil.' },
      { id: 'pp-008', type: 'mcq', level: 1,
        stem: 'Which statement about the stem is correct?',
        figure: null,
        options: ['It makes food for the plant.', 'It takes in water and mineral salts from the soil.', 'It develops into a fruit.', 'It holds the plant upright and carries water and food.'], answer: 3,
        optionFeedback: {
          0: 'Making food is the leaves\' job. The stem holds the plant up and carries water and food.',
          1: 'So close! The stem carries water, but it is the roots that take it in from the soil.' },
        explain: 'The stem supports the plant and carries water (from the roots) and food (from the leaves) to other parts.' },
      { id: 'pp-009', type: 'mcq', level: 1,
        stem: 'What does a fruit do for the plant?',
        figure: null,
        options: ['It makes food for the plant.', 'It takes in water.', 'It protects the seeds.', 'It holds the plant upright.'], answer: 2,
        optionFeedback: {
          0: 'Making food is the leaves\' job. The fruit\'s job is to protect the seeds inside it.' },
        explain: 'The fruit protects the seeds inside it. The seeds stay safe in the fruit until they can grow into new plants.' },
      { id: 'pp-010', type: 'mcq', level: 1,
        stem: 'Which part of a plant develops into a fruit?',
        figure: null,
        options: ['Leaf', 'Root', 'Stem', 'Flower'], answer: 3,
        explain: 'A flower develops into a fruit. That is why only flowering plants bear fruits.' },
      { id: 'pp-011', type: 'mcq', level: 1,
        stem: 'What does a green plant need to make its own food?',
        figure: null,
        options: ['Light, water and air', 'Soil, sand and water', 'Darkness, water and air', 'Only water'], answer: 0,
        optionFeedback: {
          1: 'Lots of children think plants get food from the soil. The soil gives only water and mineral salts. The plant makes its food from light, water and air.',
          2: 'Plants need light, not darkness, to make food. A plant kept in the dark turns yellow and weak.' },
        explain: 'Plants make food in their leaves using light, water and air (carbon dioxide). They do not get food from the soil.' },
      { id: 'pp-012', type: 'mcq', level: 1,
        stem: 'Which of these is NOT a function of the stem?',
        figure: null,
        options: ['Holds the plant upright', 'Carries water to the leaves', 'Takes in water from the soil', 'Carries food to other parts of the plant'], answer: 2,
        optionFeedback: {
          0: 'Holding the plant upright really is a job of the stem, so it is not the odd one out. This question asks for the one that is NOT the stem\'s job.',
          1: 'Carrying water to the leaves really is a job of the stem. Look for the one that is NOT.',
          3: 'Carrying food really is a job of the stem. Look for the one that is NOT.' },
        explain: 'Taking in water from the soil is the job of the roots. The stem then carries that water upwards.' },
      { id: 'pp-013', type: 'mcq', level: 2,
        stem: 'Ravi put a celery stalk in red-coloured water. After a few hours, the leaves had turned red. What does this show?',
        figure: CELERY,
        options: ['The leaves make food in sunlight.', 'The roots take in water from the soil.', 'The stem carries water up to the leaves.', 'Celery needs light to grow.'], answer: 2,
        technique: 'Claim, evidence, reason',
        steps: [
          'Find where the coloured water started.',
          'Find where the colour ended up.',
          'Ask: which part did the water travel through to get there?',
          'Say that part and its job, like "the stem carries water".'],
        optionFeedback: {
          0: 'Leaves do make food, but turning red is not about food. The red colour shows us where the water went.',
          1: 'Roots do take in water, so this is a good idea! But look at the picture: the celery has no roots. The red water went straight up the stalk, so it shows what the stem does.',
          3: 'Light was not tested here. The only thing added was red water, and it showed up in the leaves.' },
        explain: 'The red water moved up the stem to the leaves, so the stem carries water. The celery had no roots, so this is not about roots.' },
      { id: 'pp-014', type: 'mcq', level: 2,
        stem: 'After the celery experiment, Ravi cut across the celery stalk. What would he most likely see?',
        figure: CELERY,
        options: ['The stem is hollow and empty.', 'Red dots in the cut stem', 'The stem is completely white.', 'Green liquid coming out'], answer: 1,
        optionFeedback: {
          0: 'The stem is not empty: it has tiny tubes inside that carry water.',
          2: 'The red water went up through the stem, so some red stays inside it. That is why we see red dots.' },
        explain: 'The red dots are the tubes in the stem that carried the red water upwards.' },
      { id: 'pp-015', type: 'mcq', level: 2,
        stem: 'In what order does water travel through a plant?',
        figure: null,
        options: ['Leaves → stem → roots', 'Roots → leaves → stem', 'Roots → stem → leaves', 'Stem → roots → leaves'], answer: 2,
        optionFeedback: {
          0: 'That is the path backwards. Water starts in the soil, so it goes into the roots first.',
          1: 'Water cannot jump from the roots to the leaves. It travels up the stem in between.' },
        explain: 'Roots take in water from the soil, the stem carries it up, and it reaches the leaves.' },
      { id: 'pp-016', type: 'mcq', level: 2,
        stem: 'Which part carries the food made in the leaves to other parts of the plant?',
        figure: null,
        options: ['Roots', 'Stem', 'Flower', 'Fruit'], answer: 1,
        optionFeedback: {
          0: 'Roots take in water from the soil. Carrying food round the plant is the stem\'s job.' },
        explain: 'The stem carries food from the leaves to other parts, as well as water from the roots to the leaves.' },
      { id: 'pp-017', type: 'mcq', level: 2,
        stem: 'All the leaves of a plant were removed and no new leaves grew. What will happen to the plant after some time?',
        figure: null,
        options: ['It will grow faster.', 'It will produce more fruits.', 'It cannot make food, so it will die.', 'It cannot take in water, but it will still be healthy.'], answer: 2,
        technique: 'Claim, evidence, reason',
        steps: ['Find the part that is missing, and name it.', 'Say the job that part does for the plant.', 'Ask: what can the plant no longer do without it?', 'Say what will happen, joined with "so": no leaves, so no food, so it dies.'],
        optionFeedback: {
          0: 'Leaves make the food the plant needs to grow. Without them it cannot grow faster.',
          1: 'Making fruits needs food, and food is made in the leaves. With no leaves, the plant cannot do this.',
          3: 'Taking in water is the roots\' job, and this plant still has its roots. What it has lost is its food maker: the leaves.' },
        explain: 'Leaves make the food. With no leaves, the plant cannot make food and will die.' },
      { id: 'pp-018', type: 'mcq', level: 2,
        stem: 'Ali placed two similar plants as shown. What can he conclude?',
        figure: LIGHT_EXPT,
        options: ['Plants need light to stay healthy.', 'Plants need water to stay healthy.', 'Plants grow better in the dark.', 'Plants need soil to make food.'], answer: 0,
        technique: 'Change one thing',
        steps: [
          'Find the ONE thing that is different between the set-ups.',
          'Compare the results: what happened in each?',
          'Conclude only about that one thing: "plants need ... to ...".',
          'Cross out options about things that stayed the same.'],
        optionFeedback: {
          1: 'Water is important for plants, but look at the table: both plants got 50 ml. Water was not the thing that was different, so this experiment cannot tell us about water.',
          2: 'Look again at Q, the plant in the dark: its leaves turned yellow and weak. The dark did not help it.',
          3: 'Soil was the same for both plants, so it was not tested. And plants make food in their leaves, not from soil.' },
        explain: 'Only the light was different. The plant without light became yellow and weak, so plants need light (to make food) to stay healthy.' },
      { id: 'pp-019', type: 'mcq', level: 3,
        stem: 'In Ali\'s experiment, which is the variable he changed?',
        figure: LIGHT_EXPT,
        options: ['Amount of water', 'Amount of light', 'Type of plant', 'Size of the pot'], answer: 1,
        technique: 'Change one thing',
        steps: [
          'Compare the set-ups row by row.',
          'The thing that is different is the one that was changed.',
          'The things that are the same in every set-up are kept the same.',
          'Name it fully, like "the amount of water", not just "water".'],
        optionFeedback: {
          0: 'Water is in the table, so it is a good place to look! But both set-ups got 50 ml. Something that stays the same is kept the same, not changed.',
          2: 'The same kind of plant was used in both. The changed variable is the one that is different: the light.' },
        explain: 'P was in the sun and Q was in the dark. Light is the only thing changed; water stayed at 50 ml.' },
      { id: 'pp-020', type: 'mcq', level: 3,
        stem: 'Siti wants to find out if plants need light. Which two set-ups should she compare to make it a fair test?',
        figure: FAIR_TEST,
        options: ['W and X', 'W and Z', 'X and Y', 'Y and Z'], answer: 0,
        technique: 'Change one thing',
        steps: [
          'Read what is being tested.',
          'For each pair, list every way the two set-ups are different.',
          'Keep the pair that differs ONLY in the thing being tested.',
          'Check: everything else must be the same.'],
        optionFeedback: {
          1: 'W and Z both had sunlight, so light was not changed at all. They differ in water and in the type of plant instead.',
          2: 'X and Y were both in the dark, so light was not changed. They differ in the amount of water.',
          3: 'Y and Z differ in light, but also in the type of plant. Two changes means we cannot tell which one made the difference.' },
        explain: 'W and X differ only in light. Everything else (water, type of plant) is the same. X and Y change water; Z uses a different plant.' },
      { id: 'pp-021', type: 'mcq', level: 3,
        stem: OIL_SETUP + 'Why was a layer of oil put on the water?',
        figure: OIL_EXPT,
        options: ['To give the plant food', 'To stop the water from evaporating', 'To make the roots grow faster', 'To keep the water warm'], answer: 1,
        optionFeedback: {
          0: 'Oil is not plant food. Plants make their own food in their leaves.',
          2: 'The oil sits on top of the water, away from the roots. Its job is to stop the water evaporating.' },
        explain: 'Oil stops water evaporating from the surface. So any water lost from K must have been taken in by the plant.' },
      { id: 'pp-022', type: 'mcq', level: 3,
        stem: OIL_SETUP + 'Look at the results. Why did the water in cylinder K drop to 70 ml?',
        figure: OIL_EXPT,
        options: ['The water evaporated through the oil.', 'The roots of the plant took in the water.', 'The oil soaked up the water.', 'The water leaked out of the cylinder.'], answer: 1,
        technique: 'Start minus left',
        steps: [
          'Find the start amount and the amount left for each container.',
          'Work out start minus left for each one.',
          'Compare: which one lost water, and what is different about it?',
          'Say where the water went, using that one difference.'],
        optionFeedback: {
          0: 'Good thinking that water can evaporate! But L had the same oil and lost no water at all. So the oil stopped evaporation, and the water in K went into the plant.',
          2: 'If the oil soaked up the water, L would have dropped too. L stayed at 100 ml.',
          3: 'Nothing in the set-up shows a leak, and the plant is the only difference between K and L. So the plant took the water in.' },
        explain: 'Cylinder L (no plant) stayed at 100 ml, so the water did not evaporate. The plant\'s roots took in 30 ml of water.' },
      { id: 'pp-023', type: 'mcq', level: 3,
        stem: OIL_SETUP + 'Look at the results. What is the purpose of cylinder L?',
        figure: OIL_EXPT,
        options: ['To give the plant in K extra water later', 'To measure the temperature of the water', 'To keep the oil from spilling over', 'To show what happens to the water without a plant'], answer: 3,
        technique: 'Change one thing',
        steps: [
          'Find what is different between the two set-ups.',
          'The set-up without the thing being tested is there to compare with.',
          'Compare the two results.',
          'Say it: "it shows what happens without ...".'],
        optionFeedback: {
          0: 'L is not there to feed K later. It is there to compare with, so we can see what happens with no plant.' },
        explain: 'L is the control. It shows the water would stay at 100 ml without a plant, so the drop in K is due to the plant.' },
      { id: 'pp-024', type: 'mcq', level: 2,
        stem: 'What can you conclude from these results?',
        figure: WATER_EXPT,
        options: ['Plants need light to make food.', 'Plants grow better without water.', 'Plants need soil to stay upright and healthy.', 'Plants need water to stay upright and healthy.'], answer: 3,
        technique: 'Change one thing',
        steps: [
          'Find the ONE thing that is different between the set-ups.',
          'Compare the results: what happened in each?',
          'Conclude only about that one thing: "plants need ... to ...".',
          'Cross out options about things that stayed the same.'],
        optionFeedback: {
          0: 'Plants do need light, so this is true! But in this table only the water was different, so the experiment can only tell us about water.',
          1: 'Look again at pot F, which got no water: it drooped. So water helped, it did not harm.',
          2: 'Both pots had soil, so soil was not tested. Only the water was different.' },
        explain: 'Only the water was different. The plant with no water wilted, so plants need water.' },
      { id: 'pp-025', type: 'mcq', level: 3,
        stem: 'Mei put a white flower, with its stalk, in a glass of blue-coloured water. Look at the results. Why did the petals of the white flower turn light blue?',
        figure: FLOWER_EXPT,
        options: ['The petals made blue food.', 'The blue water was carried up the stalk to the petals.', 'The petals took in blue light from the sun.', 'The blue water evaporated onto the petals.'], answer: 1,
        technique: 'Claim, evidence, reason',
        steps: [
          'Find where the coloured water started.',
          'Find where the colour ended up.',
          'Ask: which part did the water travel through to get there?',
          'Say that part and its job, like "the stem carries water".'],
        optionFeedback: {
          0: 'Making food is the job of green leaves, not petals. The blue colour came from the water.',
          2: 'Sunlight does not colour petals. The blue came from the water in the glass.',
          3: 'Water that evaporates goes into the air. It does not paint the petals. The blue water travelled up the stalk.' },
        explain: 'The stalk (stem) carried the blue water up to the flower, which coloured the petals.' },
      { id: 'pp-026', type: 'mcq', level: 1,
        stem: 'Look at the leaf. What is part Y?',
        figure: LEAF,
        options: ['Leaf blade', 'Leaf stalk', 'Vein', 'Stem'], answer: 1,
        optionFeedback: {
          0: 'X is the leaf blade, the big flat part. Y is the thin part that joins the leaf to the stem.',
          2: 'A vein is one of the thin lines on the leaf blade, like Z. Y is the leaf stalk.',
          3: 'The stem is the main upright part of the whole plant. Y joins the leaf to the stem: it is the leaf stalk.' },
        explain: 'Y is the leaf stalk, which joins the leaf to the stem. X is the leaf blade and Z is a vein.' },
      { id: 'pp-027', type: 'mcq', level: 2,
        stem: 'Which of these is a root that stores food?',
        figure: null,
        options: ['Carrot', 'Potato', 'Ginger', 'Sugar cane'], answer: 0,
        optionFeedback: {
          1: 'Lots of children pick potato because it grows underground. But a potato is a stem that stores food, not a root.',
          2: 'Ginger grows underground, so it looks like a root! But ginger is a stem that stores food.',
          3: 'Sugar cane is a tall stem that stores food, not a root.' },
        explain: 'Carrot is a root that stores food. Potato, ginger and sugar cane are stems that store food, even though potato and ginger grow underground.' },
      { id: 'pp-028', type: 'mcq', level: 1,
        stem: 'Which plant has a hard, woody stem?',
        figure: null,
        options: ['Balsam', 'Money plant', 'Mango tree', 'Spinach'], answer: 2,
        explain: 'Trees like the mango tree have hard, woody stems. Balsam, money plant and spinach have soft stems.' },
      { id: 'pp-029', type: 'mcq', level: 2,
        stem: 'Some plants have weak, soft stems that cannot hold them upright. How do these plants usually grow?',
        figure: null,
        options: ['They grow tall and straight like trees.', 'They grow without any leaves.', 'They grow without any roots.', 'They climb on supports or creep along the ground.'], answer: 3,
        optionFeedback: {
          0: 'Growing tall and straight needs a strong stem, like a tree trunk. A weak stem needs help.' },
        explain: 'Plants with weak stems climb up supports (like a fence) or creep along the ground.' },
      { id: 'pp-030', type: 'mcq', level: 2,
        stem: 'Which of these is a fruit?',
        figure: null,
        options: ['Carrot', 'Tomato', 'Potato', 'Spinach leaf'], answer: 1,
        optionFeedback: {
          0: 'We often call a carrot a vegetable, but in science it is a root. It has no seeds inside.',
          2: 'A potato grows underground, but it is a stem that stores food. It is not a fruit.' },
        explain: 'A tomato develops from a flower and has seeds inside, so it is a fruit. Carrot is a root, potato is a stem, spinach is a leaf.' },
      { id: 'pp-031', type: 'mcq', level: 2,
        stem: 'Which plant does NOT produce flowers or fruits?',
        figure: null,
        options: ['Fern', 'Hibiscus', 'Rambutan tree', 'Balsam'], answer: 0,
        optionFeedback: {
          2: 'A rambutan tree bears rambutans, which are fruits. A plant with fruits must have flowers too.' },
        explain: 'Ferns are non-flowering plants. They reproduce by spores, not seeds.' },
      { id: 'pp-032', type: 'mcq', level: 3,
        stem: 'Read the statements in the table. Which statements are correct?',
        figure: table(['', 'Statement'], [['A', 'Leaves make food for the plant.'], ['B', 'Roots make food for the plant.'], ['C', 'The stem carries water to the leaves.'], ['D', 'The fruit protects the seeds.']]),
        options: ['A and B only', 'A, C and D only', 'B, C and D only', 'A, B, C and D'], answer: 1,
        technique: 'Tick or cross',
        steps: [
          'Read one statement at a time.',
          'Ask: is it true? Put a tick or a cross beside it.',
          'Check every statement before you look at the options.',
          'Pick the option that lists exactly your ticks.'],
        optionFeedback: {
          0: 'A is right! But B says roots make food. Roots take in water and mineral salts; leaves make the food. Check C and D too.',
          2: 'C and D are right! But B says roots make food. Roots take in water; leaves make the food. Check A as well.',
          3: 'A, C and D are right. B is the one to cross out: roots do not make food.' },
        explain: 'Statement B is the one to cross out: roots take in water and mineral salts, but they do not make food. Leaves make food. So A, C and D are correct.' },
      { id: 'pp-033', type: 'mcq', level: 3,
        stem: 'A plant was left in a dark room for three weeks but was watered every day. Which is the most likely result?',
        figure: null,
        options: ['It stays green and healthy.', 'It wilts because it has no water.', 'Its leaves turn yellow and it becomes weak.', 'It produces more flowers than before.'], answer: 2,
        technique: 'Claim, evidence, reason',
        steps: [
          'Find what the plant did NOT get, like light or water.',
          'Say why a plant needs that thing.',
          'Say what the plant cannot do without it.',
          'Then say the result you would see, like yellow leaves or drooping.'],
        optionFeedback: {
          0: 'Water alone is not enough. Without light, the leaves cannot make food, so the plant cannot stay healthy.',
          1: 'This plant was watered every day, so it did not run out of water. Look for what it did NOT get: light.',
          3: 'Making flowers needs food. With no light, the plant cannot make food.' },
        explain: 'Without light, the leaves cannot make food. The plant turns yellow and weak. It had water, so lack of water is not the reason.' },

      // ---------- OEQ ----------
      { id: 'pp-034', type: 'oeq', level: 1, marks: 2,
        stem: 'Look at the plant. Name part A and state one of its functions.',
        figure: PLANT,
        model: 'Part A is the stem. It holds the plant upright / carries water and food to different parts of the plant.',
        keys: [['stem'], ['upright', 'support', 'holds up', 'carries water', 'carries food', 'transports', 'carry water', 'carry food']],
        explain: 'One mark for naming the stem, one mark for a correct function.' },
      { id: 'pp-035', type: 'oeq', level: 1, marks: 2,
        stem: 'State two functions of the roots.',
        figure: null,
        model: 'The roots hold the plant firmly in the soil. They take in water and mineral salts from the soil.',
        keys: [['hold', 'anchor', 'firmly in the soil'], ['take in water', 'absorb water', 'takes in water', 'absorbs water']],
        explain: 'Markers look for "hold the plant firmly in the soil" and "take in water (and mineral salts)".' },
      { id: 'pp-036', type: 'oeq', level: 1, marks: 3,
        stem: 'Name three things a plant needs to make its own food.',
        figure: null,
        model: 'Light (sunlight), water and air (carbon dioxide).',
        keys: [['light', 'sunlight'], ['water'], ['air', 'carbon dioxide']],
        explain: 'Soil is not one of them. Soil gives the plant water and mineral salts, but the plant makes its own food in its leaves.' },
      { id: 'pp-037', type: 'oeq', level: 1, marks: 2,
        stem: 'Look at the leaf. Name parts X and Y.',
        figure: LEAF,
        model: 'X is the leaf blade. Y is the leaf stalk.',
        keys: [['leaf blade', 'blade'], ['leaf stalk', 'stalk']],
        explain: 'X is the broad flat part (leaf blade). Y joins the leaf to the stem (leaf stalk). Z is a vein.' },
      { id: 'pp-038', type: 'oeq', level: 2, marks: 2,
        stem: 'Jun cut off all the roots of a plant and put the plant back in moist soil. Explain what will happen to the plant.',
        figure: null,
        model: 'The plant cannot take in water without its roots, so it will wilt and die.',
        keys: [['cannot take in water', 'no water', 'unable to take in water', 'cannot absorb water'], ['wilt', 'die', 'droop']],
        technique: 'Claim, evidence, reason',
        steps: ['Claim: say what will happen to the plant.', 'Evidence: name the part that was removed.', 'Reason: say that part\'s job, so what the plant can no longer do.', 'Join it up with "so": no roots, so no water, so it wilts and dies.'],
        explain: 'Give the reason (no roots, so no water taken in) and the result (wilt and die).' },
      { id: 'pp-039', type: 'oeq', level: 2, marks: 2,
        stem: 'All the leaves of a plant were cut off. Explain why the plant will die if no new leaves grow.',
        figure: null,
        model: 'Leaves make food for the plant. Without leaves, the plant cannot make food, so it will die.',
        keys: [['leaves make food', 'cannot make food', 'make food', 'no food'], ['die']],
        technique: 'Claim, evidence, reason',
        steps: [
          'Claim: say what will happen to the plant.',
          'Evidence: name the part that was removed.',
          'Reason: say that part\'s job, so what the plant can no longer do.',
          'Join it up with "so": no leaves, so no food, so it dies.'],
        explain: 'Key idea: leaves are the food makers. No leaves, so no food, so the plant dies.' },
      { id: 'pp-040', type: 'oeq', level: 2, marks: 2,
        stem: 'Ravi put a celery stalk in red-coloured water. After a few hours, the leaves turned red. What does this experiment show about the stem?',
        figure: CELERY,
        model: 'The stem carries water from the bottom of the stalk up to the leaves.',
        keys: [['carries', 'transports', 'carry', 'moves'], ['water']],
        technique: 'Claim, evidence, reason',
        steps: [
          'Find where the coloured water started.',
          'Find where the colour ended up.',
          'Ask: which part did the water travel through to get there?',
          'Say that part and its job, like "the stem carries water".'],
        explain: 'The red colour is a marker that lets us see where the water went: up the stem to the leaves.' },
      { id: 'pp-041', type: 'oeq', level: 3, marks: 2,
        stem: 'Ravi cut across the celery stalk after the experiment and saw red dots. What are the red dots? Explain.',
        figure: CELERY,
        model: 'They are the tubes in the stem that carry water. The red water travelled up through these tubes, so they turned red.',
        keys: [['tubes', 'tube'], ['carry water', 'carries water', 'water travelled', 'water moved', 'transport water']],
        technique: 'Claim, evidence, reason',
        steps: [
          'Claim: answer the question in one short sentence.',
          'Evidence: point to what the picture, table or story shows.',
          'Reason: say the science idea that links them.',
          'Read it back: did I use the words from the question?'],
        explain: 'You do not need the special names for the tubes at this level; "tubes that carry water" is enough.' },
      { id: 'pp-042', type: 'oeq', level: 2, marks: 2,
        stem: 'Look at Ali\'s experiment. Explain why the plant in set-up Q became yellow and weak.',
        figure: LIGHT_EXPT,
        model: 'Set-up Q had no light, so the leaves could not make food. Without food, the plant became weak.',
        keys: [['no light', 'dark', 'no sunlight', 'without light'], ['cannot make food', 'could not make food', 'unable to make food', 'no food']],
        technique: 'Claim, evidence, reason',
        steps: [
          'Find what the plant did NOT get, like light or water.',
          'Say why a plant needs that thing.',
          'Say what the plant cannot do without it.',
          'Then say the result you would see, like yellow leaves or drooping.'],
        explain: 'Link the missing condition (light) to the leaf\'s job (making food).' },
      { id: 'pp-043', type: 'oeq', level: 3, marks: 2,
        stem: 'Look at Ali\'s experiment. Name the variable he changed, and one thing he must keep the same to make it a fair test.',
        figure: LIGHT_EXPT,
        model: 'He changed the amount of light. He must keep the amount of water (or type of plant, size of plant, type of soil, size of pot) the same.',
        keys: [['light'], ['water', 'type of plant', 'same plant', 'size of plant', 'soil', 'pot']],
        technique: 'Change one thing',
        steps: [
          'Compare the set-ups row by row.',
          'The thing that is different is the one that was changed.',
          'The things that are the same in every set-up are kept the same.',
          'Name it fully, like "the amount of water", not just "water".'],
        explain: 'Fair test: change only one variable (light), keep all the others the same.' },
      { id: 'pp-044', type: 'oeq', level: 3, marks: 1,
        stem: 'Ali\'s teacher suggested using five plants in each set-up instead of one. Why?',
        figure: LIGHT_EXPT,
        model: 'So that the results are more reliable.',
        keys: [['reliable']],
        explain: 'One plant might be sickly by chance. More plants (or repeating) makes the results more reliable. Write "reliable", not "accurate": markers do not accept "accurate" here.' },
      { id: 'pp-045', type: 'oeq', level: 3, marks: 2,
        stem: OIL_SETUP + 'Look at the results. Why was the oil layer needed, and what does the drop in cylinder K show?',
        figure: OIL_EXPT,
        model: 'The oil stops the water from evaporating. So the drop in K shows that the plant\'s roots took in water.',
        keys: [['evaporat'], ['roots took in water', 'took in water', 'absorbed water', 'plant took in', 'roots take in']],
        technique: 'Start minus left',
        steps: [
          'Find the start amount and the amount left for each container.',
          'Work out start minus left for each one.',
          'Compare: which one lost water, and what is different about it?',
          'Say where the water went, using that one difference.'],
        explain: 'Oil = no evaporation. Cylinder L stayed at 100 ml, proving it; so K lost water only to the plant.' },
      { id: 'pp-046', type: 'oeq', level: 2, marks: 2,
        stem: 'Name the part of a plant that develops into a fruit, and state what a fruit contains.',
        figure: null,
        model: 'The flower develops into a fruit. The fruit contains seeds.',
        keys: [['flower'], ['seed']],
        explain: 'Flower → fruit, and the fruit protects the seeds inside.' },
      { id: 'pp-047', type: 'oeq', level: 2, marks: 2,
        stem: 'Mei says a tomato is a vegetable, not a fruit. Is she correct? Explain.',
        figure: null,
        model: 'No. A tomato is a fruit because it develops from a flower and contains seeds.',
        keys: [['seed'], ['flower']],
        technique: 'Claim, evidence, reason',
        steps: [
          'Claim: decide yes or no, and say it first.',
          'Recall the science rule that fits, like "a fruit develops from a flower".',
          'Check the thing in the question against that rule.',
          'Reason: write "because..." using the rule and the example.'],
        explain: 'In science, a fruit develops from a flower and contains seeds, whatever we call it in cooking.' },
      { id: 'pp-048', type: 'oeq', level: 2, marks: 1,
        stem: 'A carrot is a root. Besides holding the plant in the soil and taking in water, what other function does the carrot root have?',
        figure: null,
        model: 'It stores food for the plant.',
        keys: [['stores food', 'store food', 'storing food']],
        explain: 'Some roots, like carrot and radish, store food.' },
      { id: 'pp-049', type: 'oeq', level: 3, marks: 2,
        stem: 'Wei Ling says, "Plants get their food from the soil." Is she correct? Explain.',
        figure: null,
        model: 'No. Plants make their own food in their leaves, using light, water and air. Roots take in only water and mineral salts from the soil.',
        keys: [['make their own food', 'leaves make', 'make food'], ['mineral salts', 'light', 'sunlight']],
        technique: 'Claim, evidence, reason',
        steps: ['Claim: decide yes or no, and say it first.', 'Recall the science rule that fits this question.', 'Check the thing in the question against that rule.', 'Reason: write "because..." using the rule and the example.'],
        explain: 'Lots of people think this, so it is a great one to practise. Point 1: plants make their own food (in the leaves). Point 2: the soil gives only water and mineral salts, which are not food; or say the leaves need light to make the food.' },
      { id: 'pp-050', type: 'oeq', level: 3, marks: 2,
        stem: 'A potted plant was drooping. Kumar watered the soil, and a few hours later the plant stood upright again. Explain how the water reached the leaves.',
        figure: null,
        model: 'The roots took in the water from the soil, and the stem carried the water up to the leaves.',
        keys: [['roots take in', 'roots took in', 'roots absorb', 'roots absorbed', 'roots'], ['stem carries', 'stem carried', 'stem']],
        technique: 'Claim, evidence, reason',
        steps: [
          'Start where the water starts: in the soil.',
          'Name the part that takes it in, and say its job.',
          'Name the part it travels through next, and say its job.',
          'End where it arrives, and write each part with its job in order.'],
        explain: 'Trace the path: soil → roots (take in) → stem (carries up) → leaves.' },
      { id: 'pp-051', type: 'oeq', level: 2, marks: 2,
        stem: 'A tall tree has a thick, strong stem. Give two reasons why the stem is important to the tree.',
        figure: null,
        model: 'It holds the tree upright (so the leaves get light). It carries water from the roots up to the leaves, and food from the leaves to other parts.',
        keys: [['upright', 'support', 'hold'], ['carries water', 'carry water', 'transports', 'carries food', 'carry food']],
        explain: 'Stem = support + transport.' },
      { id: 'pp-052', type: 'oeq', level: 3, marks: 2,
        stem: 'Look at the results. Explain why the plant in pot F drooped.',
        figure: WATER_EXPT,
        model: 'Pot F got no water, so the roots could not take in water. The plant did not have enough water to stay upright, so it drooped.',
        keys: [['no water', 'not watered', 'without water'], ['could not take in water', 'not enough water', 'cannot take in water']],
        technique: 'Claim, evidence, reason',
        steps: [
          'Find what the plant did NOT get, like light or water.',
          'Say why a plant needs that thing.',
          'Say what the plant cannot do without it.',
          'Then say the result you would see, like yellow leaves or drooping.'],
        explain: 'Plants need water to stay upright and healthy.' },

      /* x17 science expansion — lane sci-x-plantcycle */
      { id: 'x17-pp-001', type: 'mcq', level: 1,
        stem: 'The diagram shows a chilli plant in Uncle Tan\'s garden. Which part protects the seeds?',
        figure: X17_CHILLI,
        options: ['P', 'Q', 'R', 'T'],
        answer: 0,
        hints: ['The seeds are found inside one part of the plant. Which part do we pick and eat?', 'P is the chilli, which is a fruit. The fruit protects the seeds inside it. R is the flower, which only develops into the fruit.'],
        optionFeedback: {
          2: 'R is the flower, and it does develop into the fruit, so you are close! But the seeds are held inside the fruit itself, which is P.' },
        explain: 'P is the chilli, and a chilli is a fruit. The fruit protects the seeds inside it. R is a flower: it develops into a fruit, but it does not hold the seeds. Q is the stem and T is a leaf.' },
      { id: 'x17-pp-002', type: 'mcq', level: 2,
        stem: 'Look at the chilli plant. Which correctly matches the parts to their functions?',
        figure: X17_CHILLI,
        options: ['Q makes food; T takes in water.', 'S holds the plant in the soil; T makes food.', 'R protects the seeds; S carries water to the leaves.', 'P develops into a flower; Q holds the plant up.'],
        answer: 1,
        hints: ['Name each lettered part first: P, Q, R, S and T. Then check BOTH halves of each option.', 'S is the roots (hold the plant firmly and take in water) and T is a leaf (makes food). Each of the other options has a half that does not fit.'],
        technique: 'Tick or cross',
        steps: [
          'Each option has two halves. Read them one at a time.',
          'Name the part each letter shows, then check its job.',
          'Tick or cross each half.',
          'Pick the option where BOTH halves get a tick.'],
        optionFeedback: {
          0: 'Q is the stem and T is a leaf. This option swaps jobs: the leaves make food, and the roots take in water.',
          2: 'R is the flower: it develops into the fruit, and the fruit protects the seeds. And S, the roots, takes in water, while the stem carries it up.',
          3: 'This one runs backwards: a flower develops into a fruit (P), not the other way round.' },
        explain: 'S is the roots, which hold the plant firmly in the soil, and T is a leaf, which makes food. Option 1 swaps the jobs of the stem and leaf. In option 3, R (flower) does not protect seeds and S (roots) takes in water but the stem carries it up. In option 4, the flower develops into the fruit, not the other way round.' },
      { id: 'x17-pp-003', type: 'oeq', level: 1, marks: 2,
        stem: 'Look at the chilli plant. Name part S and state one of its functions.',
        figure: X17_CHILLI,
        model: 'Part S is the roots. They hold the plant firmly in the soil / take in water and mineral salts from the soil.',
        keys: [['root'], ['hold', 'firmly', 'take in water', 'absorb water', 'mineral salts']],
        hints: ['Part S is under the soil. What is this part called?', 'S is the roots. They hold the plant firmly in the soil and take in water and mineral salts.'],
        explain: 'One mark for the name (roots), one for a correct function: holding the plant firmly in the soil, or taking in water and mineral salts.' },
      { id: 'x17-pp-004', type: 'oeq', level: 2, marks: 2,
        stem: 'Uncle Tan had a young chilli plant that had not flowered yet. He picked off every flower as soon as it appeared. Will the plant bear any chillies? Explain.',
        figure: null,   // R-B BLOCKER: the chilli figure already shows chillies
        model: 'No. A chilli is a fruit, and fruits develop from flowers. With all the flowers removed, the plant cannot bear any chillies.',
        keys: [['fruit'], ['from flowers', 'from the flower', 'from a flower', 'develop from']],
        hints: ['Where does a fruit come from?', 'A chilli is a fruit, and every fruit develops from a flower. No flowers means no chillies.'],
        technique: 'Claim, evidence, reason',
        steps: [
          'Claim: decide yes or no, and say it first.',
          'Recall the science rule that fits, like "a fruit develops from a flower".',
          'Check the thing in the question against that rule.',
          'Reason: write "because..." using the rule and the example.'],
        explain: 'Claim: no chillies. Evidence: every flower was picked off. Reasoning: a chilli is a fruit, and a fruit develops from a flower.' },
      { id: 'x17-pp-005', type: 'mcq', level: 2,
        stem: 'Mei grows a long bean plant in the school garden. It winds round a pole as it grows. Why does the plant need the pole?',
        figure: X17_CLIMBER,
        options: ['The pole carries water up to its leaves.', 'Its roots are too weak to take in water.', 'Its stem is too weak to hold it upright.', 'The pole stops its beans from falling off.'],
        answer: 2,
        hints: ['Which part of a plant normally holds it upright? Look at how thin it is here.', 'The long bean plant has a weak, thin stem that cannot hold the plant upright, so it climbs the pole for support.'],
        technique: 'Claim, evidence, reason',
        steps: [
          'Look at the picture or story: what is special here?',
          'Say the job of the part or stage involved.',
          'Use that job to say why it happens.',
          'Pick the option that gives that reason.'],
        optionFeedback: {
          0: 'The pole is just wood, so it cannot carry water. The plant\'s own stem carries water up to the leaves.',
          1: 'The roots still take in water. The trouble is the stem: it is too thin and weak to hold the plant up.',
          3: 'The pole holds up the whole plant, not the beans.' },
        explain: 'Plants with weak stems, like the long bean, climb on supports. The pole holds the plant up so its leaves can reach the light. The stem, not the pole, carries water, and the roots still take in water.' },
      { id: 'x17-pp-006', type: 'oeq', level: 3, marks: 2,
        stem: 'A storm knocked down the pole, and Mei\'s long bean plant lay flat on the ground under other plants. Explain why the plant may now make less food.',
        figure: X17_CLIMBER,
        model: 'Its weak stem cannot hold it upright without the pole, so its leaves are shaded by the other plants and get less light. Leaves need light to make food, so the plant makes less food.',
        keys: [['less light', 'not enough light', 'shaded', 'no light'], ['make food', 'makes food']],
        hints: ['What do leaves need to make food? Will leaves lying under other plants get much of it?', 'Without the pole the weak stem cannot hold the plant up, so its leaves get less light, and leaves need light to make food.'],
        technique: 'Claim, evidence, reason',
        steps: [
          'Claim: answer the question in one short sentence.',
          'Evidence: point to what the picture, table or story shows.',
          'Reason: say the science idea that links them.',
          'Read it back: did I use the words from the question?'],
        explain: 'Evidence: the plant lies flat under other plants. Reasoning: its leaves get less light, and leaves need light to make food. So: less light, less food.' },
      { id: 'x17-pp-007', type: 'mcq', level: 2,
        stem: 'Sam set up four identical potted plants, A, B, C and D, in the school garden as shown. In plant B, the roots were cut off and the stem was pushed back into the soil. This kind of plant cannot grow new roots from its stem. On the next day a strong wind blew through the garden. Which plant was most likely blown out of its pot?',
        figure: X17_POTS,
        options: ['Plant A', 'Plant B', 'Plant C', 'Plant D'],
        answer: 1,
        hints: ['Which part holds a plant firmly in the soil?', 'The roots hold the plant firmly in the soil. Plant B has no roots, so nothing holds it in place when the wind blows.'],
        technique: 'Claim, evidence, reason',
        steps: ['Find the part that is missing, and name it.', 'Say the jobs that part does. Roots have two: they hold the plant firmly in the soil and take in water.', 'Ask: which of those jobs matters in this story? Look at what happened next.', 'Say what will happen, joined with "so": no roots, so nothing holds it, so the wind blows it out.'],
        optionFeedback: {
          2: 'Plant C has no leaves, but its roots still hold it firmly in the soil.',
          3: 'Plant D lost only its flowers. Its roots still hold it firmly in the soil.' },
        explain: 'Roots hold the plant firmly in the soil. Plant B has no roots, so the wind can easily blow it out of the soil. Plant C has no leaves, but its roots still hold it in place.' },
      { id: 'x17-pp-008', type: 'mcq', level: 2,
        stem: 'Sam watered plants A, B, C and D every day and kept removing any new leaves on C and any new flowers on D. This kind of plant cannot grow new roots from its stem. Which plants would most likely have died after three weeks?',
        figure: X17_POTS,
        options: ['B only', 'C only', 'B and C only', 'B, C and D only'],
        answer: 2,
        hints: ['A plant needs to take in water and to make food. Which plants cannot do one of these?', 'B has no roots, so it cannot take in water. C has no leaves, so it cannot make food. D still has roots and leaves; flowers are for reproducing, not for staying alive.'],
        technique: 'Claim, evidence, reason',
        steps: ['Find the part that is missing, and name it.', 'Say the job that part does for the plant.', 'Ask: what can the plant no longer do without it?', 'Say what will happen to each plant, joined with "so": no roots, so no water; no leaves, so no food.'],
        optionFeedback: {
          0: 'B will die, well spotted! Now check C too: with no leaves, it cannot make food.',
          1: 'C will die, well spotted! Now check B too: with no roots, it cannot take in water.',
          3: 'B and C will die, yes. But D lost only its flowers. Flowers help a plant reproduce, and D still has roots and leaves, so it stays alive.' },
        explain: 'B cannot take in water without roots, and C cannot make food without leaves, so both die. D still has roots and leaves, so it stays alive: flowers help a plant reproduce, but the plant does not need them to stay alive.' },
      { id: 'x17-pp-009', type: 'mcq', level: 3,
        stem: 'Sam wants to show that a plant needs its roots to stay alive. This kind of plant cannot grow new roots from its stem. Which two plants should he compare?',
        figure: X17_POTS,
        options: ['A and B', 'A and C', 'B and C', 'B and D'],
        answer: 0,
        hints: ['In a fair test, the two plants should differ in only ONE thing: the roots.', 'A has nothing removed and B has only its roots removed. Every other pair differs in something other than roots, or in two things.'],
        technique: 'Change one thing',
        steps: [
          'Read what is being tested.',
          'For each pair, list every way the two set-ups are different.',
          'Keep the pair that differs ONLY in the thing being tested.',
          'Check: everything else must be the same.'],
        optionFeedback: {
          1: 'A and C differ in the leaves, not the roots. To test roots, the two plants must differ only in the roots.',
          2: 'B and C differ in two parts: roots and leaves. Then we cannot tell which part made the difference.',
          3: 'B and D differ in two parts: roots and flowers. Then we cannot tell which part made the difference.' },
        explain: 'A and B differ only in the roots, so it is a fair test. A and C differ in leaves, not roots. B and C, and B and D, each differ in two parts, so you could not tell which part made the difference.' },
      { id: 'x17-pp-010', type: 'oeq', level: 2, marks: 2,
        stem: 'Look at Sam\'s plants. He kept removing any new leaves on plant C. Explain why plant C most likely died.',
        figure: X17_POTS,
        model: 'All the leaves of plant C were removed, so it could not make food. Without food, plant C died.',
        keys: [['leaves', 'leaf'], ['could not make food', 'cannot make food', 'no food', 'make food']],
        hints: ['What is the job of the leaves?', 'Leaves make food. Plant C had no leaves, so it could not make food, and it died.'],
        technique: 'Claim, evidence, reason',
        steps: [
          'Claim: say what will happen to the plant.',
          'Evidence: name the part that was removed.',
          'Reason: say that part\'s job, so what the plant can no longer do.',
          'Join it up with "so": no leaves, so no food, so it dies.'],
        explain: 'Tie the missing part to its job: plant C had no leaves (evidence), and leaves make food (reasoning), so it had no food and died.' },
      { id: 'x17-pp-011', type: 'oeq', level: 3, marks: 2,
        stem: 'Look at Sam\'s plants. Plant D had its flowers removed but it did not die. Explain why.',
        figure: X17_POTS,
        model: 'Plant D still had its roots to take in water and its leaves to make food. Flowers help the plant reproduce, so the plant does not need them to stay alive.',
        keys: [['take in water', 'roots'], ['make food', 'leaves']],
        hints: ['What does a plant need its roots and leaves for? Did plant D still have them?', 'D still had roots (to take in water) and leaves (to make food). Flowers are for making fruits and seeds, not for staying alive.'],
        technique: 'Claim, evidence, reason',
        steps: [
          'Claim: answer the question in one short sentence.',
          'Evidence: point to what the picture, table or story shows.',
          'Reason: say the science idea that links them.',
          'Read it back: did I use the words from the question?'],
        explain: 'One mark for the roots taking in water, one for the leaves making food. Flowers develop into fruits with seeds, which help the plant reproduce; losing them does not stop the plant getting water or food.' },
      { id: 'x17-pp-012', type: 'mcq', level: 2,
        stem: 'The arrows A and B show two things moving through the stem of a plant. What do A and B show?',
        figure: X17_FLOW,
        options: ['A: water moving up from the roots; B: food moving down from the leaves', 'A: food moving up from the soil; B: water moving down to the roots', 'A: food moving up from the roots; B: water moving down from the leaves', 'A: air moving up from the soil; B: food moving down from the flower'],
        answer: 0,
        hints: ['Where does a plant take in water? Where does it make its food?', 'Roots take in water, so water travels UP the stem (A). Leaves make food, so food travels DOWN from the leaves (B). Plants do not get food from the soil.'],
        technique: 'Follow the arrows',
        steps: [
          'Put your finger where arrow A starts, and follow it to where it ends.',
          'Ask: what does the part at the start take in or make?',
          'Say what moves along that arrow.',
          'Do the same for the next arrow, then check both halves of the option.'],
        optionFeedback: {
          1: 'Plants do not get food from the soil; they make it in their leaves. And water travels up from the roots, not down.',
          2: 'The roots take in water, not food, so what goes up from the roots is water. Food is made in the leaves and comes down.',
          3: 'Food is made in the leaves, not the flower. And what the roots take in for the stem to carry up is water.' },
        explain: 'The roots take in water and the stem carries it up to the leaves (A). The leaves make food and the stem carries it to other parts, including down to the roots (B). Plants make their own food: they do not get it from the soil.' },
      { id: 'x17-pp-013', type: 'oeq', level: 1, marks: 2,
        stem: 'Look at arrows A and B.\n(a) Name the part of the plant that A and B travel through. (1 mark)\n(b) Where was the food in arrow B made? (1 mark)',
        figure: X17_FLOW,
        model: '(a) The stem. (b) In the leaves.',
        keys: [['stem'], ['leaves', 'leaf']],
        hints: ['Which part joins the roots to the leaves? Which part makes food?', '(a) The stem carries water and food. (b) The leaves make the food.'],
        explain: 'The stem carries water up from the roots and food from the leaves to other parts of the plant. Food is made in the leaves.' },
      { id: 'x17-pp-014', type: 'mcq', level: 3,
        stem: 'Hui Min bought some food at the wet market. Her brother wrote down which part of the plant each food is. Which food did he match to the WRONG part?',
        figure: X17_MARKET,
        options: ['Kangkong', 'Carrot', 'Chilli', 'Potato'],
        answer: 3,
        hints: ['For each food, think: does it grow from the stem, the root, the leaf or the flower?', 'A carrot is a root that stores food, but a potato is a STEM that stores food, even though it grows under the ground.'],
        technique: 'Tick or cross',
        steps: [
          'Read one row at a time.',
          'Ask: is this match true? Tick or cross it.',
          'Take care with food that grows underground: it can be a root or a stem.',
          'Pick the row with the cross.'],
        optionFeedback: {
          0: 'We really do eat the leaves and stems of kangkong, so that match is right.',
          1: 'A carrot really is a root that stores food, so that match is right.',
          2: 'A chilli develops from a flower and has seeds inside, so it is a fruit. That match is right.' },
        explain: 'A potato is a stem that stores food, not a root. A carrot is a root that stores food. A chilli develops from a flower and has seeds, so it is a fruit. We eat the leaves and stems of kangkong.' }
    ]
  });
})();
