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
      { title: 'Parts that store food', body: 'Some roots store food, e.g. carrot, radish and sweet potato. Some stems store food, e.g. potato, ginger and sugar cane. Trap: a potato grows underground but it is a STEM, not a root.' },
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
        explain: 'A is the stem: the long upright part joining the roots to the leaves and flower. B is the flower, C the roots and D a leaf.' },
      { id: 'pp-002', type: 'mcq', level: 1,
        stem: 'Look at the plant. Which part makes food for the plant?',
        figure: PLANT,
        options: ['A', 'B', 'C', 'D'], answer: 3,
        explain: 'D is a leaf. Leaves make food for the plant using light, water and air.' },
      { id: 'pp-003', type: 'mcq', level: 1,
        stem: 'Look at the plant. Which part takes in water and mineral salts from the soil?',
        figure: PLANT,
        options: ['A', 'B', 'C', 'D'], answer: 2,
        explain: 'C is the roots. They are in the soil, where they take in water and mineral salts.' },
      { id: 'pp-004', type: 'mcq', level: 2,
        stem: 'Look at the plant. Which part will later develop into a fruit?',
        figure: PLANT,
        options: ['A', 'B', 'C', 'D'], answer: 1,
        explain: 'B is the flower. A flower develops into a fruit, and the fruit holds the seeds.' },
      { id: 'pp-005', type: 'mcq', level: 2,
        stem: 'Look at the plant. Part C was cut off and the plant was put back in the pot. What will most likely happen after a few days?',
        figure: PLANT,
        options: ['It will grow more leaves.', 'It will grow more flowers.', 'It will stay healthy because the stem can take in water.', 'It will wilt because it cannot take in water.'], answer: 3,
        explain: 'C is the roots. Without roots the plant cannot take in water, so it wilts and will die.' },
      { id: 'pp-006', type: 'mcq', level: 1,
        stem: 'What is the main function of the leaves?',
        figure: null,
        options: ['To make food for the plant', 'To take in water from the soil', 'To hold the plant firmly in the soil', 'To protect the seeds'], answer: 0,
        explain: 'Leaves make food. Roots take in water and hold the plant in the soil. Fruits protect seeds.' },
      { id: 'pp-007', type: 'mcq', level: 1,
        stem: 'Which of these are the two functions of roots?',
        figure: null,
        options: ['Make food and hold the plant upright', 'Carry food to the flowers and make seeds from the flowers', 'Hold the plant firmly in the soil and take in water and mineral salts', 'Protect the seeds and attract insects to the flowers'], answer: 2,
        explain: 'Roots hold (anchor) the plant firmly in the soil and take in water and mineral salts from the soil.' },
      { id: 'pp-008', type: 'mcq', level: 1,
        stem: 'Which statement about the stem is correct?',
        figure: null,
        options: ['It makes food for the plant.', 'It takes in water and mineral salts from the soil.', 'It develops into a fruit.', 'It holds the plant upright and carries water and food.'], answer: 3,
        explain: 'The stem supports the plant and carries water (from the roots) and food (from the leaves) to other parts.' },
      { id: 'pp-009', type: 'mcq', level: 1,
        stem: 'What does a fruit do for the plant?',
        figure: null,
        options: ['It makes food for the plant.', 'It takes in water.', 'It protects the seeds.', 'It holds the plant upright.'], answer: 2,
        explain: 'The fruit protects the seeds inside it.' },
      { id: 'pp-010', type: 'mcq', level: 1,
        stem: 'Which part of a plant develops into a fruit?',
        figure: null,
        options: ['Leaf', 'Root', 'Stem', 'Flower'], answer: 3,
        explain: 'A flower develops into a fruit. That is why only flowering plants bear fruits.' },
      { id: 'pp-011', type: 'mcq', level: 1,
        stem: 'What does a green plant need to make its own food?',
        figure: null,
        options: ['Light, water and air', 'Soil, sand and water', 'Darkness, water and air', 'Only water'], answer: 0,
        explain: 'Plants make food in their leaves using light, water and air (carbon dioxide). They do not get food from the soil.' },
      { id: 'pp-012', type: 'mcq', level: 1,
        stem: 'Which of these is NOT a function of the stem?',
        figure: null,
        options: ['Holds the plant upright', 'Carries water to the leaves', 'Takes in water from the soil', 'Carries food to other parts of the plant'], answer: 2,
        explain: 'Taking in water from the soil is the job of the roots. The stem then carries that water upwards.' },
      { id: 'pp-013', type: 'mcq', level: 2,
        stem: 'Ravi put a celery stalk in red-coloured water. After a few hours, the leaves had turned red. What does this show?',
        figure: CELERY,
        options: ['The leaves make food in sunlight.', 'The roots take in water from the soil.', 'The stem carries water up to the leaves.', 'Celery needs light to grow.'], answer: 2,
        explain: 'The red water moved up the stem to the leaves, so the stem carries water. The celery had no roots, so this is not about roots.' },
      { id: 'pp-014', type: 'mcq', level: 2,
        stem: 'After the celery experiment, Ravi cut across the celery stalk. What would he most likely see?',
        figure: CELERY,
        options: ['The stem is hollow and empty.', 'Red dots in the cut stem', 'The stem is completely white.', 'Green liquid coming out'], answer: 1,
        explain: 'The red dots are the tubes in the stem that carried the red water upwards.' },
      { id: 'pp-015', type: 'mcq', level: 2,
        stem: 'In what order does water travel through a plant?',
        figure: null,
        options: ['Leaves → stem → roots', 'Roots → leaves → stem', 'Roots → stem → leaves', 'Stem → roots → leaves'], answer: 2,
        explain: 'Roots take in water from the soil, the stem carries it up, and it reaches the leaves.' },
      { id: 'pp-016', type: 'mcq', level: 2,
        stem: 'Which part carries the food made in the leaves to other parts of the plant?',
        figure: null,
        options: ['Roots', 'Stem', 'Flower', 'Fruit'], answer: 1,
        explain: 'The stem carries food from the leaves to other parts, as well as water from the roots to the leaves.' },
      { id: 'pp-017', type: 'mcq', level: 2,
        stem: 'All the leaves of a plant were removed and no new leaves grew. What will happen to the plant after some time?',
        figure: null,
        options: ['It will grow faster.', 'It will produce more fruits.', 'It cannot make food, so it will die.', 'It cannot take in water, but it will still be healthy.'], answer: 2,
        explain: 'Leaves make the food. With no leaves, the plant cannot make food and will die.' },
      { id: 'pp-018', type: 'mcq', level: 2,
        stem: 'Ali placed two similar plants as shown. What can he conclude?',
        figure: LIGHT_EXPT,
        options: ['Plants need light to stay healthy.', 'Plants need water to stay healthy.', 'Plants grow better in the dark.', 'Plants need soil to make food.'], answer: 0,
        explain: 'Only the light was different. The plant without light became yellow and weak, so plants need light (to make food) to stay healthy.' },
      { id: 'pp-019', type: 'mcq', level: 3,
        stem: 'In Ali\'s experiment, which is the variable he changed?',
        figure: LIGHT_EXPT,
        options: ['Amount of water', 'Amount of light', 'Type of plant', 'Size of the pot'], answer: 1,
        explain: 'P was in the sun and Q was in the dark. Light is the only thing changed; water stayed at 50 ml.' },
      { id: 'pp-020', type: 'mcq', level: 3,
        stem: 'Siti wants to find out if plants need light. Which two set-ups should she compare to make it a fair test?',
        figure: FAIR_TEST,
        options: ['W and X', 'W and Z', 'X and Y', 'Y and Z'], answer: 0,
        explain: 'W and X differ only in light. Everything else (water, type of plant) is the same. X and Y change water; Z uses a different plant.' },
      { id: 'pp-021', type: 'mcq', level: 3,
        stem: OIL_SETUP + 'Why was a layer of oil put on the water?',
        figure: OIL_EXPT,
        options: ['To give the plant food', 'To stop the water from evaporating', 'To make the roots grow faster', 'To keep the water warm'], answer: 1,
        explain: 'Oil stops water evaporating from the surface. So any water lost from K must have been taken in by the plant.' },
      { id: 'pp-022', type: 'mcq', level: 3,
        stem: OIL_SETUP + 'Look at the results. Why did the water in cylinder K drop to 70 ml?',
        figure: OIL_EXPT,
        options: ['The water evaporated through the oil.', 'The roots of the plant took in the water.', 'The oil soaked up the water.', 'The water leaked out of the cylinder.'], answer: 1,
        explain: 'Cylinder L (no plant) stayed at 100 ml, so the water did not evaporate. The plant\'s roots took in 30 ml of water.' },
      { id: 'pp-023', type: 'mcq', level: 3,
        stem: OIL_SETUP + 'Look at the results. What is the purpose of cylinder L?',
        figure: OIL_EXPT,
        options: ['To give the plant in K extra water later', 'To measure the temperature of the water', 'To keep the oil from spilling over', 'To show what happens to the water without a plant'], answer: 3,
        explain: 'L is the control. It shows the water would stay at 100 ml without a plant, so the drop in K is due to the plant.' },
      { id: 'pp-024', type: 'mcq', level: 2,
        stem: 'What can you conclude from these results?',
        figure: WATER_EXPT,
        options: ['Plants need light to make food.', 'Plants grow better without water.', 'Plants need soil to stay upright and healthy.', 'Plants need water to stay upright and healthy.'], answer: 3,
        explain: 'Only the water was different. The plant with no water wilted, so plants need water.' },
      { id: 'pp-025', type: 'mcq', level: 3,
        stem: 'Mei put a white flower, with its stalk, in a glass of blue-coloured water. Look at the results. Why did the petals of the white flower turn light blue?',
        figure: FLOWER_EXPT,
        options: ['The petals made blue food.', 'The blue water was carried up the stalk to the petals.', 'The petals took in blue light from the sun.', 'The blue water evaporated onto the petals.'], answer: 1,
        explain: 'The stalk (stem) carried the blue water up to the flower, which coloured the petals.' },
      { id: 'pp-026', type: 'mcq', level: 1,
        stem: 'Look at the leaf. What is part Y?',
        figure: LEAF,
        options: ['Leaf blade', 'Leaf stalk', 'Vein', 'Stem'], answer: 1,
        explain: 'Y is the leaf stalk, which joins the leaf to the stem. X is the leaf blade and Z is a vein.' },
      { id: 'pp-027', type: 'mcq', level: 2,
        stem: 'Which of these is a root that stores food?',
        figure: null,
        options: ['Carrot', 'Potato', 'Ginger', 'Sugar cane'], answer: 0,
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
        explain: 'Plants with weak stems climb up supports (like a fence) or creep along the ground.' },
      { id: 'pp-030', type: 'mcq', level: 2,
        stem: 'Which of these is a fruit?',
        figure: null,
        options: ['Carrot', 'Tomato', 'Potato', 'Spinach leaf'], answer: 1,
        explain: 'A tomato develops from a flower and has seeds inside, so it is a fruit. Carrot is a root, potato is a stem, spinach is a leaf.' },
      { id: 'pp-031', type: 'mcq', level: 2,
        stem: 'Which plant does NOT produce flowers or fruits?',
        figure: null,
        options: ['Fern', 'Hibiscus', 'Rambutan tree', 'Balsam'], answer: 0,
        explain: 'Ferns are non-flowering plants. They reproduce by spores, not seeds.' },
      { id: 'pp-032', type: 'mcq', level: 3,
        stem: 'Read the statements in the table. Which statements are correct?',
        figure: table(['', 'Statement'], [['A', 'Leaves make food for the plant.'], ['B', 'Roots make food for the plant.'], ['C', 'The stem carries water to the leaves.'], ['D', 'The fruit protects the seeds.']]),
        options: ['A and B only', 'A, C and D only', 'B, C and D only', 'A, B, C and D'], answer: 1,
        explain: 'B is wrong: roots take in water; they do not make food. Leaves make food.' },
      { id: 'pp-033', type: 'mcq', level: 3,
        stem: 'A plant was left in a dark room for three weeks but was watered every day. Which is the most likely result?',
        figure: null,
        options: ['It stays green and healthy.', 'It wilts because it has no water.', 'Its leaves turn yellow and it becomes weak.', 'It produces more flowers than before.'], answer: 2,
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
        explain: 'Soil is NOT one of them. Plants make their own food in the leaves.' },
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
        explain: 'Give the reason (no roots, so no water taken in) and the result (wilt and die).' },
      { id: 'pp-039', type: 'oeq', level: 2, marks: 2,
        stem: 'All the leaves of a plant were cut off. Explain why the plant will die if no new leaves grow.',
        figure: null,
        model: 'Leaves make food for the plant. Without leaves, the plant cannot make food, so it will die.',
        keys: [['leaves make food', 'cannot make food', 'make food', 'no food'], ['die']],
        explain: 'Key idea: leaves = food makers.' },
      { id: 'pp-040', type: 'oeq', level: 2, marks: 2,
        stem: 'Ravi put a celery stalk in red-coloured water. After a few hours, the leaves turned red. What does this experiment show about the stem?',
        figure: CELERY,
        model: 'The stem carries water from the bottom of the stalk up to the leaves.',
        keys: [['carries', 'transports', 'carry', 'moves'], ['water']],
        explain: 'The red colour is a marker that lets us see where the water went: up the stem to the leaves.' },
      { id: 'pp-041', type: 'oeq', level: 3, marks: 2,
        stem: 'Ravi cut across the celery stalk after the experiment and saw red dots. What are the red dots? Explain.',
        figure: CELERY,
        model: 'They are the tubes in the stem that carry water. The red water travelled up through these tubes, so they turned red.',
        keys: [['tubes', 'tube'], ['carry water', 'carries water', 'water travelled', 'water moved', 'transport water']],
        explain: 'You do not need the special names for the tubes at this level; "tubes that carry water" is enough.' },
      { id: 'pp-042', type: 'oeq', level: 2, marks: 2,
        stem: 'Look at Ali\'s experiment. Explain why the plant in set-up Q became yellow and weak.',
        figure: LIGHT_EXPT,
        model: 'Set-up Q had no light, so the leaves could not make food. Without food, the plant became weak.',
        keys: [['no light', 'dark', 'no sunlight', 'without light'], ['cannot make food', 'could not make food', 'unable to make food', 'no food']],
        explain: 'Link the missing condition (light) to the leaf\'s job (making food).' },
      { id: 'pp-043', type: 'oeq', level: 3, marks: 2,
        stem: 'Look at Ali\'s experiment. Name the variable he changed, and one thing he must keep the same to make it a fair test.',
        figure: LIGHT_EXPT,
        model: 'He changed the amount of light. He must keep the amount of water (or type of plant, size of plant, type of soil, size of pot) the same.',
        keys: [['light'], ['water', 'type of plant', 'same plant', 'size of plant', 'soil', 'pot']],
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
        explain: 'A very common mistake. Point 1: plants make their own food (in the leaves). Point 2: the soil gives only water and mineral salts, which are not food; or say the leaves need light to make the food.' },
      { id: 'pp-050', type: 'oeq', level: 3, marks: 2,
        stem: 'A potted plant was drooping. Kumar watered the soil, and a few hours later the plant stood upright again. Explain how the water reached the leaves.',
        figure: null,
        model: 'The roots took in the water from the soil, and the stem carried the water up to the leaves.',
        keys: [['roots take in', 'roots took in', 'roots absorb', 'roots absorbed', 'roots'], ['stem carries', 'stem carried', 'stem']],
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
        explain: 'Plants need water to stay upright and healthy.' }
    ]
  });
})();
