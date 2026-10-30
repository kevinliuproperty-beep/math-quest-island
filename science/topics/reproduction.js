"use strict";
// Science Quest — topic: Reproduction in plants and animals (P5, Cycles). Data only; the helpers below just build SVG/HTML strings.
// Scope per MOE Primary Science Syllabus 2023, theme Cycles, "Cycles in Plants and Animals (Reproduction)" (P5),
// examined at PSLE 0009 from 2026. Sources checked 2026-10-30:
//   - MOE Primary Science Syllabus 2023 (structure: Cycles in Plants and Animals (Reproduction) at P5)
//     https://www.moe.gov.sg/-/media/files/primary/syllabus/2023-primary-science.pdf (did not load in full on the day)
//   - Meridian Pri, 2023 CFD P5/P6 Science sharing: reproduction in plants under Cycles
//     https://www.meridianpri.moe.edu.sg/files/Communications/CFD%202023/Science/2023/2023%20CFD%20P5P6%20SC%20Sharing.pdf
//   - First Toa Payoh Pri, 2023 P5 Science assessment plan: reproduction in plants and in humans at P5
//     https://www.firsttoapayohpri.moe.edu.sg/files/Parents'%20Corner/Holistic%20Assessment%20Plans/2023/P5/Standard%20Subjects/2023_P5_ASSESSMENT%20PLAN_FOR_SCIENCE%20(STANDARD).pdf
//   - Raffles Girls' Pri, P5 Science Curriculum Briefing (6 Jan 2023)
//     https://www.rafflesgirlspri.moe.edu.sg/files/Briefing%20Slides/P5/P5%20Science%20Curriculum%20Briefing%206%20Jan%202023.pdf
//   - Syllabus summaries (secondary): plant reproduction runs from pollination and fertilisation (seed
//     production) to seed dispersal and germination; foetal development details are not required.
// In scope here: why living things reproduce; parts of a flower (stamen: anther, filament; stigma, style,
//   ovary, ovule); pollination by insects and by wind and the features of such flowers; fertilisation in
//   flowering plants; ovule -> seed, ovary -> fruit; seed dispersal by wind, water, animals and splitting
//   and why it matters; the conditions seeds need to germinate (water, air, a suitable temperature);
//   ferns and mosses reproduce by spores; human reproduction (testes make sperms, ovaries make eggs, a
//   sperm fuses with an egg, the fertilised egg develops into a baby in the womb); offspring inherit
//   characteristics from both parents through the sperm and the egg.
// Deliberately LEFT OUT (unsure at P5 level or not required): pollen tubes, foetal development, the
//   menstrual cycle, the named parts of the female tubes, reproduction in fish, frogs and birds, cells and
//   nuclei (Cells is no longer a separate topic in 2023), asexual reproduction from cuttings, fungi as a
//   spore-bearing group (fungi are not plants).
(function () {
  const INK = '#1f2937', LINE = '#475569', GREEN = '#16a34a', LEAF = '#86efac', BROWN = '#92400e';

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

  const lead = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${LINE}" stroke-width="1.5"/>`;

  const TH = 'border:1px solid #94a3b8;padding:6px 10px;background:#e2e8f0;color:#111827';
  const TD = 'border:1px solid #94a3b8;padding:6px 10px;text-align:center';
  const table = (head, rows, caption) =>
    `<table style="border-collapse:collapse;margin:0 auto;font-size:15px">` +
    (caption ? `<caption style="padding:4px 0 6px;font-weight:600">${caption}</caption>` : '') +
    `<thead><tr>${head.map((h) => `<th style="${TH}">${h}</th>`).join('')}</tr></thead>` +
    `<tbody>${rows.map((r) => `<tr>${r.map((c) => `<td style="${TD}">${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;

  // ---------- Figures ----------
  // Cut-away flower with six lettered parts: A anther, B filament, C stigma, D style, E ovary, F ovule.
  const FIG_FLOWER = (() => {
    let s = `<rect x="175" y="212" width="10" height="48" fill="${GREEN}"/>`;
    s += `<ellipse cx="95" cy="150" rx="74" ry="26" transform="rotate(-28 95 150)" fill="#fbcfe8" stroke="#be185d"/>`;
    s += `<ellipse cx="265" cy="150" rx="74" ry="26" transform="rotate(28 265 150)" fill="#fbcfe8" stroke="#be185d"/>`;
    s += `<ellipse cx="180" cy="210" rx="40" ry="10" fill="${LEAF}" stroke="${GREEN}"/>`;
    s += `<line x1="160" y1="200" x2="125" y2="90" stroke="${LINE}" stroke-width="3"/><line x1="200" y1="200" x2="235" y2="90" stroke="${LINE}" stroke-width="3"/>`;
    s += `<ellipse cx="125" cy="84" rx="13" ry="8" fill="#fb923c" stroke="${BROWN}"/><ellipse cx="235" cy="84" rx="13" ry="8" fill="#fb923c" stroke="${BROWN}"/>`;
    s += `<ellipse cx="180" cy="185" rx="26" ry="22" fill="#bbf7d0" stroke="${GREEN}" stroke-width="1.5"/>`;
    s += `<circle cx="171" cy="180" r="5" fill="#fff" stroke="${GREEN}"/><circle cx="189" cy="180" r="5" fill="#fff" stroke="${GREEN}"/><circle cx="180" cy="195" r="5" fill="#fff" stroke="${GREEN}"/>`;
    s += `<rect x="177" y="86" width="6" height="78" fill="#a3e635" stroke="${GREEN}"/>`;
    s += `<ellipse cx="180" cy="80" rx="15" ry="8" fill="#d9f99d" stroke="${GREEN}" stroke-width="1.5"/>`;
    s += lead(112, 82, 60, 58) + txt(48, 56, 'A', { bold: 1, size: 17 });
    s += lead(141, 145, 44, 196) + txt(32, 200, 'B', { bold: 1, size: 17 });
    s += lead(195, 78, 300, 40) + txt(314, 38, 'C', { bold: 1, size: 17 });
    s += lead(184, 125, 300, 100) + txt(314, 100, 'D', { bold: 1, size: 17 });
    s += lead(206, 182, 300, 160) + txt(314, 160, 'E', { bold: 1, size: 17 });
    s += lead(185, 197, 300, 226) + txt(314, 228, 'F', { bold: 1, size: 17 });
    return svg(360, 270, 'A flower cut in half with six parts labelled A to F', s);
  })();

  // Fruit cut in half showing six seeds.
  const FIG_CUT_FRUIT = (() => {
    let s = `<ellipse cx="150" cy="80" rx="112" ry="56" fill="#fdba74" stroke="#c2410c" stroke-width="2"/>`;
    s += `<ellipse cx="150" cy="80" rx="96" ry="44" fill="#fed7aa"/>`;
    [[100, 62], [150, 56], [200, 62], [100, 98], [150, 104], [200, 98]].forEach(([x, y]) => {
      s += `<ellipse cx="${x}" cy="${y}" rx="10" ry="7" fill="#422006"/>`;
    });
    s += txt(150, 158, 'a fruit cut in half', { size: 14 });
    return svg(300, 178, 'A fruit cut in half showing six seeds inside', s);
  })();

  // Plant life cycle with two stages hidden as A and B.
  const FIG_CYCLE = (() => {
    const box = (cx, cy, w, label, bold) =>
      `<rect x="${cx - w / 2}" y="${cy - 20}" width="${w}" height="40" rx="8" fill="#ecfccb" stroke="${GREEN}" stroke-width="1.5"/>` + txt(cx, cy, label, { size: bold ? 18 : 15, bold });
    let s = box(180, 34, 130, 'Pollination') + box(300, 124, 80, 'A', 1) + box(180, 216, 140, 'Seed dispersal') + box(60, 124, 80, 'B', 1);
    s += arrow(246, 40, 296, 100) + arrow(296, 148, 246, 208) + arrow(110, 208, 64, 148) + arrow(64, 100, 114, 40);
    s += txt(180, 112, 'young plant grows', { size: 13 }) + txt(180, 130, 'and makes flowers', { size: 13 });
    return svg(360, 250, 'A cycle: pollination, then A, then seed dispersal, then B, then the young plant grows and flowers', s);
  })();

  // Four fruits or seeds P, Q, R, S.
  const FIG_SEEDS = (() => {
    let s = '';
    const xs = [48, 134, 220, 306];
    ['P', 'Q', 'R', 'S'].forEach((L, i) => { s += txt(xs[i], 22, L, { bold: 1, size: 17 }); });
    // P: flat disc-shaped wing round a seed
    s += `<circle cx="48" cy="84" r="32" fill="#f5e6b8" stroke="#a16207" stroke-width="1.5"/><ellipse cx="48" cy="84" rx="10" ry="8" fill="#a16207"/>`;
    // Q: small fruit covered in hooks
    s += `<ellipse cx="134" cy="84" rx="16" ry="24" fill="#a16207" stroke="#713f12"/>`;
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2, x1 = 134 + 16 * Math.cos(a), y1 = 84 + 24 * Math.sin(a), x2 = 134 + 26 * Math.cos(a), y2 = 84 + 34 * Math.sin(a);
      s += `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)} q 4 -4 0 -7" fill="none" stroke="#713f12" stroke-width="1.5"/>`;
    }
    // R: large fruit with a fibrous husk
    s += `<ellipse cx="220" cy="84" rx="30" ry="38" fill="#a3a36b" stroke="#4d5a1f" stroke-width="2"/><ellipse cx="220" cy="84" rx="16" ry="22" fill="#78350f"/>`;
    for (let k = -2; k <= 2; k++) s += `<path d="M${220 + k * 9} 50 Q ${220 + k * 13} 84 ${220 + k * 9} 118" fill="none" stroke="#4d5a1f" stroke-width="1"/>`;
    // S: dry pod split open, seeds flung out
    s += `<path d="M306 118 Q 280 80 290 50" fill="none" stroke="#78350f" stroke-width="5"/><path d="M306 118 Q 334 82 326 52" fill="none" stroke="#78350f" stroke-width="5"/>`;
    s += `<circle cx="276" cy="70" r="4" fill="#422006"/><circle cx="340" cy="74" r="4" fill="#422006"/><circle cx="306" cy="60" r="4" fill="#422006"/>`;
    s += txt(48, 140, 'flat, papery', { size: 13 }) + txt(48, 157, 'wing', { size: 13 });
    s += txt(134, 140, 'covered in', { size: 13 }) + txt(134, 157, 'tiny hooks', { size: 13 });
    s += txt(220, 140, 'fibrous', { size: 13 }) + txt(220, 157, 'husk', { size: 13 });
    s += txt(306, 140, 'dry pod that', { size: 13 }) + txt(306, 157, 'splits open', { size: 13 });
    return svg(356, 176, 'Four fruits: P has a flat papery wing, Q is covered in tiny hooks, R has a fibrous husk, S is a dry pod that splits open', s);
  })();

  // Underside of a fern leaf with brown spots.
  const FIG_FERN = (() => {
    let s = txt(180, 20, 'underside of a fern leaf', { size: 14 });
    s += `<line x1="24" y1="100" x2="336" y2="100" stroke="${GREEN}" stroke-width="4"/>`;
    for (let i = 0; i < 9; i++) {
      const x = 52 + i * 32;
      [[70, -1], [130, 1]].forEach(([cy]) => {
        s += `<ellipse cx="${x}" cy="${cy}" rx="13" ry="27" fill="${LEAF}" stroke="${GREEN}"/>`;
        [-12, 0, 12].forEach((d) => { s += `<circle cx="${x - 5}" cy="${cy + d}" r="3" fill="${BROWN}"/><circle cx="${x + 5}" cy="${cy + d}" r="3" fill="${BROWN}"/>`; });
      });
    }
    s += lead(277, 142, 300, 172) + txt(300, 184, 'brown spots', { size: 13 });
    return svg(360, 200, 'The underside of a fern leaf covered in rows of small brown spots', s);
  })();

  const TBL_FLOWERS = table(['Feature', 'Flower M', 'Flower N'], [
    ['Petals', 'large, brightly coloured', 'none'],
    ['Scent', 'sweet', 'none'],
    ['Nectar', 'yes', 'no'],
    ['Pollen', 'small amount, sticky', 'large amount, light and smooth'],
    ['Stigma', 'inside the flower', 'feathery, hangs outside']]);

  const TBL_WING = table(['Wing length of model seed (cm)', 'Distance travelled (cm)'],
    [['2', '45'], ['4', '90'], ['6', '140'], ['8', '185']], 'Results');

  const TBL_KITTEN = table(['Cat', 'Fur colour', 'Tail'],
    [['Mother', 'white', 'long'], ['Father', 'black', 'short'], ['Kitten K', 'black', 'long']]);

  const TBL_GERM = table(['Set-up', 'Cotton wool', 'Where it was kept', 'Did the seeds germinate?'], [
    ['A', 'moist', 'dark cupboard, 25 °C', 'yes'],
    ['B', 'dry', 'dark cupboard, 25 °C', 'no'],
    ['C', 'moist', 'refrigerator, 5 °C', 'no'],
    ['D', 'moist', 'brightly lit room, 25 °C', 'yes']], 'Results after 5 days');

  SCI.registerTopic({
    id: 'reproduction',
    title: 'Reproduction',
    emoji: '🌸',
    theme: 'Cycles',
    level: 'P5',
    moeRef: 'Cycles in Plants and Animals (Reproduction) (P5), MOE Primary Science Syllabus 2023: show an understanding that living things reproduce to ensure continuity of their kind; identify the reproductive parts of a flowering plant and of humans; describe pollination, fertilisation, seed and fruit formation, seed dispersal and germination; recognise that some plants (ferns, mosses) reproduce by spores; recognise that characteristics are passed on from parents to offspring. Scope checked against school briefings (Meridian Pri 2023 P5/P6 Science sharing; First Toa Payoh Pri 2023 P5 assessment plan; Raffles Girls\' Pri 2023 P5 briefing).',
    skills: {
      flower: 'Parts of a flower',
      pollination: 'Pollination',
      seeds: 'Fertilisation, fruits and seeds',
      dispersal: 'Seed dispersal',
      spores: 'Plants with spores',
      human: 'Human reproduction and inheritance',
      inquiry: 'Experiments and results'
    },
    misconceptions: {
      'male-female-parts-mixup': 'Mixing up the male parts of a flower (anther, filament) with the female parts (stigma, style, ovary, ovule).',
      'flower-part-mixup': 'Mixing up flower parts that sit close together, such as the ovary and the ovule, or the style and the filament.',
      'nonrep-part': 'Thinking petals or sepals make pollen, seeds or fruits themselves.',
      'self-pollen-only': 'Thinking a flower can only use pollen from its own anthers.',
      'wrong-part-fruit': 'Thinking a part other than the ovary, such as a petal or the stigma, grows into the fruit.',
      'ovule-ovary-swap': 'Swapping the ovule and the ovary: the ovule becomes the seed and the ovary becomes the fruit.',
      'pollination-is-fertilisation': 'Thinking pollination and fertilisation are the same process.',
      'process-order-mixup': 'Mixing up the order or meaning of pollination, fertilisation, seed dispersal and germination.',
      'wind-flower-features': 'Mixing up the features of wind-pollinated and insect-pollinated flowers.',
      'insect-role': 'Thinking an insect helps a flower by bringing water or fertilising it, rather than by carrying pollen.',
      'fruit-without-pollination': 'Thinking a flower can form fruits and seeds without being pollinated.',
      'fertilise-count': 'Thinking one fertilisation can make many seeds, or that one seed needs many.',
      'pollen-is-seed': 'Thinking pollen grains are seeds or grow into seeds on their own.',
      'dispersal-feature-mixup': 'Matching a fruit or seed to the wrong way of dispersal, such as hooks with wind.',
      'dispersal-why': 'Thinking seeds are dispersed to help the parent plant or to get food from it, instead of reducing competition among the young plants.',
      'changed-measured-mixup': 'Mixing up the variable that is changed, the variable that is measured and the variables kept the same.',
      'graph-misread': 'Reading a table the wrong way or drawing a conclusion the results do not show.',
      'spores-from-flowers': 'Thinking flowering plants such as the hibiscus reproduce by spores, or that spores are made in flowers.',
      'all-plants-seeds': 'Thinking every plant reproduces by seeds, so ferns and mosses must have seeds or fruits.',
      'sperm-egg-source': 'Mixing up which organ makes sperms and which makes eggs, or where a baby develops.',
      'one-sperm': 'Thinking fertilisation needs two eggs or many sperms, or that a sperm becomes a baby without an egg.',
      'inherit-one-parent': 'Thinking offspring inherit characteristics from only one parent.',
      'learned-vs-inherited': 'Thinking a characteristic that is learned or picked up after birth is inherited.',
      'germination-needs-light': 'Thinking seeds need light or soil to germinate.',
      'reproduce-for-self': 'Thinking living things reproduce to keep themselves alive, rather than to continue their kind.'
    },
    notes: [
      { title: 'Why living things reproduce',
        body: 'Living things reproduce to make new living things of their own kind. This makes sure their kind continues. If a kind of living thing stops reproducing, it will die out.' },
      { title: 'Parts of a flower',
        body: 'Male part: the STAMEN = anther (makes pollen grains) + filament (holds up the anther).\nFemale part: stigma (receives pollen) + style (joins the stigma to the ovary) + ovary (contains the ovules).\nPetals attract insects, but they do not make pollen or seeds.' },
      { title: 'Pollination',
        body: 'Pollination is the transfer of pollen grains from the anther to the stigma. Insects and wind are common pollinators.\nInsect-pollinated flowers: large, brightly coloured petals, scent, nectar, sticky pollen.\nWind-pollinated flowers: small or no petals, no scent, large amounts of light, smooth pollen, feathery stigmas that hang outside.' },
      { title: 'Fertilisation, fruits and seeds',
        body: 'Fertilisation: the male reproductive cell from the pollen grain fuses with the female reproductive cell in the ovule.\nAfter fertilisation: the ovule develops into a SEED, the ovary develops into the FRUIT. The petals and stamens usually wither and drop off.\nPollination must happen before fertilisation. One fertilised ovule gives one seed.' },
      { title: 'Seed dispersal',
        body: 'Wind: light, with wings or hairs (angsana).\nWater: fibrous husk that traps air so it floats, waterproof covering (coconut).\nAnimals: juicy fruits that are eaten, or hooks that stick to fur.\nSplitting: dry pods that split open and fling out the seeds (balsam, rubber tree).\nWhy disperse? The young plants grow away from the parent and from each other, so there is less competition for water, sunlight, space and mineral salts.' },
      { title: 'Germination',
        body: 'A seed needs water, air and a suitable temperature (warmth) to germinate. It does not need light or soil to germinate: the seed has stored food inside it.' },
      { title: 'Plants with spores',
        body: 'Ferns and mosses do not have flowers and do not make seeds. They reproduce by spores. Fern spores are made in spore cases, the brown spots on the underside of the leaves. Spores are tiny and light, so the wind carries them.' },
      { title: 'Human reproduction',
        body: 'Male: the testes make sperms. Female: the ovaries make eggs.\nFertilisation: one sperm fuses with one egg inside the mother\'s body. The fertilised egg develops into a baby in the mother\'s womb.' },
      { title: 'Inheriting characteristics',
        body: 'The sperm carries characteristics from the father and the egg carries characteristics from the mother. So the child inherits characteristics from BOTH parents. Things learned after birth, like a language or a scar, are not inherited.' }
    ],
    items: [
      // ----- Parts of a flower -----
      { id: 'rep-001', type: 'mcq', level: 1, syl: 'P5', skill: 'flower',
        stem: "Which part of a flower makes pollen grains?",
        figure: null,
        options: ["Stigma", "Ovary", "Anther", "Petal"],
        answer: 2,
        miscon: { 0: 'male-female-parts-mixup', 1: 'male-female-parts-mixup', 3: 'nonrep-part' },
        optionFeedback: {
          0: "The stigma is where pollen lands. Which part at the top of the stamen makes it?",
          1: "The ovary holds the ovules. Pollen is made in a male part.",
          3: "Petals attract insects, but they do not make pollen. Look at the stamen." },
        explain: "Pollen grains are made in the anther, the top part of the stamen." },
      { id: 'rep-002', type: 'mcq', level: 1, syl: 'P5', skill: 'flower',
        stem: "The diagram shows a flower cut in half. Which letter shows an ovule?",
        figure: FIG_FLOWER,
        options: ["A", "C", "E", "F"],
        answer: 3,
        miscon: { 0: 'male-female-parts-mixup', 1: 'flower-part-mixup', 2: 'flower-part-mixup' },
        optionFeedback: {
          0: "A is at the top of a stamen. Ovules are inside the female part, at the base.",
          1: "C is the sticky top of the female part. Ovules are hidden lower down.",
          2: "E is the ovary itself. The ovules are the small round parts INSIDE it." },
        explain: "F points to one of the small round ovules inside the ovary (E)." },
      { id: 'rep-003', type: 'mcq', level: 2, syl: 'P5', skill: 'flower',
        stem: "Which letters show the male parts of the flower?",
        figure: FIG_FLOWER,
        options: ["C, D and E only", "A and B only", "A, B and C only", "A, B, E and F"],
        answer: 1,
        miscon: { 0: 'male-female-parts-mixup', 2: 'male-female-parts-mixup', 3: 'male-female-parts-mixup' },
        technique: 'Tick or cross',
        steps: ["Find the stamens: the stalks with a knob on top.", "Tick the anther and the filament.", "Cross the stigma, style, ovary and ovules: they are female.", "Choose the option with only the ticks."],
        optionFeedback: {
          0: "C, D and E make up the female part. Look at the stalks on either side.",
          2: "A and B are right. C is the stigma, which is female.",
          3: "A and B are right, but E and F are the ovary and ovule, which are female." },
        explain: "The stamen is the male part: A is the anther and B is the filament. C, D, E and F are female parts." },
      { id: 'rep-004', type: 'mcq', level: 2, syl: 'P5', skill: 'flower',
        stem: "After fertilisation, which part of the flower develops into the fruit?",
        figure: FIG_FLOWER,
        options: ["B", "D", "E", "F"],
        answer: 2,
        miscon: { 0: 'wrong-part-fruit', 1: 'wrong-part-fruit', 3: 'ovule-ovary-swap' },
        optionFeedback: {
          0: "B is the filament, which withers after fertilisation. Which part holds the ovules?",
          1: "D is the style. The fruit grows from the part that wraps around the ovules.",
          3: "F is an ovule. Each ovule becomes a SEED. The part around it becomes the fruit." },
        explain: "The ovary (E) develops into the fruit. The ovules inside it (F) develop into seeds." },
      { id: 'rep-005', type: 'mcq', level: 2, syl: 'P5', skill: 'flower',
        stem: "What is the job of the stigma?",
        figure: null,
        options: ["To receive pollen grains", "To make pollen grains", "To hold the ovules", "To attract insects with its colour"],
        answer: 0,
        miscon: { 1: 'male-female-parts-mixup', 2: 'flower-part-mixup', 3: 'nonrep-part' },
        optionFeedback: {
          1: "Pollen is made in the anther. The stigma is at the top of the female part.",
          2: "The ovary holds the ovules. The stigma is further up.",
          3: "Bright petals attract insects. The stigma has a different job." },
        explain: "The stigma receives pollen grains during pollination. It is often sticky or feathery so pollen stays on it." },
      { id: 'rep-006', type: 'mcq', level: 3, syl: 'P5', skill: 'flower',
        stem: "Mr Tan removed some parts of a flower. Then he brushed pollen from ANOTHER flower of the same kind onto it. Which parts must the flower still have so that it can develop into a fruit with seeds?\nA: anthers\nB: stigma\nC: ovary\nD: petals",
        figure: null,
        options: ["A and D only", "B and C only", "A, B and C only", "B, C and D only"],
        answer: 1,
        miscon: { 0: 'nonrep-part', 2: 'self-pollen-only', 3: 'nonrep-part' },
        technique: 'Tick or cross',
        steps: ["Where does the pollen come from here? Another flower.", "Which part must receive that pollen? Tick it.", "Which part holds the ovules and becomes the fruit? Tick it.", "Cross any part that is not needed."],
        optionFeedback: {
          0: "The pollen comes from another flower, so this flower's anthers are not needed. Petals are not needed either.",
          2: "B and C are needed. But the pollen comes from another flower, so its own anthers can go.",
          3: "B and C are needed. Petals only attract insects, and Mr Tan is doing the insect's job." },
        explain: "The stigma (B) must receive the pollen, and the ovary (C) holds the ovules and becomes the fruit. The anthers and petals are not needed because Mr Tan brings pollen from another flower." },

      // ----- Pollination -----
      { id: 'rep-007', type: 'mcq', level: 1, syl: 'P5', skill: 'pollination',
        stem: "What is pollination?",
        figure: null,
        options: ["The fusing of male and female reproductive cells", "The scattering of seeds away from the parent", "The growth of a seed into a young plant", "The transfer of pollen from the anther to the stigma"],
        answer: 3,
        miscon: { 0: 'pollination-is-fertilisation', 1: 'process-order-mixup', 2: 'process-order-mixup' },
        optionFeedback: {
          0: "That is fertilisation, which comes AFTER pollination.",
          1: "That is seed dispersal. Pollination happens much earlier, in the flower.",
          2: "That is germination. Pollination is about pollen moving." },
        explain: "Pollination is the transfer of pollen grains from the anther to the stigma." },
      { id: 'rep-008', type: 'mcq', level: 2, syl: 'P5', skill: 'pollination',
        stem: "The table describes two flowers, M and N. Which flower is more likely to be pollinated by wind, and why?",
        figure: TBL_FLOWERS,
        options: ["M, because it has large, brightly coloured petals", "M, because its pollen is sticky", "N, because it produces nectar", "N, because its stigmas are feathery and hang outside"],
        answer: 3,
        miscon: { 0: 'wind-flower-features', 1: 'wind-flower-features', 2: 'graph-misread' },
        technique: 'Read, compare, conclude',
        steps: ["Read each row for M and N.", "Which features help the wind carry pollen and catch it?", "Check that the reason matches the table."],
        optionFeedback: {
          0: "Bright petals attract insects. The wind does not need to see a flower.",
          1: "Sticky pollen clings to insects. Wind carries light, smooth pollen.",
          2: "N is the right flower, but check the Nectar row: N has none." },
        explain: "N has no petals or scent, lots of light pollen and feathery stigmas that hang outside to catch pollen from the air. These are features of a wind-pollinated flower." },
      { id: 'rep-009', type: 'mcq', level: 2, syl: 'P5', skill: 'pollination',
        stem: "A bee visits a flower to drink its nectar. How does the visit help the flower to reproduce?",
        figure: null,
        options: ["The bee brings water so the flower can make food.", "Pollen on the bee is carried to another flower's stigma.", "The bee carries the seeds far away.", "The bee fertilises the ovules with its body."],
        answer: 1,
        miscon: { 0: 'insect-role', 2: 'process-order-mixup', 3: 'pollination-is-fertilisation' },
        optionFeedback: {
          0: "The flower gets its water from the roots. What sticks to the bee's hairy body?",
          2: "There are no seeds yet: the flower has not been fertilised. What does the bee carry?",
          3: "The bee only moves pollen. Fertilisation happens later, inside the ovule." },
        explain: "Pollen sticks to the bee's body. When it visits another flower of the same kind, some pollen rubs onto that flower's stigma: this is pollination." },
      { id: 'rep-010', type: 'mcq', level: 3, syl: 'P5', skill: 'pollination',
        stem: "Which of these are features of a flower that is pollinated by insects?\nA: large, brightly coloured petals\nB: a sweet scent\nC: nectar\nD: feathery stigmas that hang outside the flower",
        figure: null,
        options: ["A, B, C and D", "A and B only", "C and D only", "A, B and C only"],
        answer: 3,
        miscon: { 0: 'wind-flower-features', 1: 'wind-flower-features', 2: 'wind-flower-features' },
        technique: 'Tick or cross',
        steps: ["Take one feature at a time.", "Does it attract an insect or reward it? Tick it.", "Does it help to catch pollen from the air? Cross it.", "Choose the option with only the ticks."],
        optionFeedback: {
          0: "A, B and C attract insects. Feathery stigmas hanging outside catch pollen from the wind.",
          1: "A and B are right. Nectar (C) is the sweet food that brings insects back too.",
          2: "Nectar (C) is right, but feathery stigmas (D) belong to wind-pollinated flowers." },
        explain: "Bright petals, scent and nectar attract insects. Feathery stigmas hanging outside are a feature of wind-pollinated flowers." },
      { id: 'rep-011', type: 'mcq', level: 2, syl: 'P5', skill: 'pollination',
        stem: "A plant with large, scented flowers grows inside a closed greenhouse. No insects can get in and there is no wind. The flowers do not form any fruits. What could the gardener do so that fruits form?",
        figure: null,
        options: ["Give the plant more water", "Add fertiliser to the soil", "Brush pollen from the anthers onto the stigmas", "Cut off the petals"],
        answer: 2,
        miscon: { 0: 'fruit-without-pollination', 1: 'fruit-without-pollination', 3: 'nonrep-part' },
        optionFeedback: {
          0: "Water helps the plant stay healthy, but no fruits form unless pollen reaches the stigmas.",
          1: "Fertiliser helps growth, but what step is missing before fruits can form?",
          3: "Removing petals does not move pollen. Who usually carries the pollen for these flowers?" },
        explain: "Without insects or wind, no pollination happens, so there is no fertilisation and no fruit. Brushing pollen onto the stigmas does the insects' job." },

      // ----- Fertilisation, fruits and seeds -----
      { id: 'rep-012', type: 'mcq', level: 1, syl: 'P5', skill: 'seeds',
        stem: "After fertilisation, what does an ovule develop into?",
        figure: null,
        options: ["A seed", "A fruit", "A pollen grain", "A flower"],
        answer: 0,
        miscon: { 1: 'ovule-ovary-swap', 2: 'pollen-is-seed', 3: 'process-order-mixup' },
        optionFeedback: {
          1: "The fruit grows from the ovary, the part around the ovules.",
          2: "Pollen grains come from the anther. They do not grow from ovules.",
          3: "A new flower only grows much later, on a new plant." },
        explain: "Each fertilised ovule develops into a seed. The ovary develops into the fruit." },
      { id: 'rep-013', type: 'mcq', level: 2, syl: 'P5', skill: 'seeds',
        stem: "Which of these describes fertilisation in a flowering plant?",
        figure: null,
        options: ["Pollen is carried from the anther to the stigma.", "A male cell from a pollen grain fuses with an egg cell in an ovule.", "The ovary grows into a seed.", "A seed takes in water and starts to grow."],
        answer: 1,
        miscon: { 0: 'pollination-is-fertilisation', 2: 'ovule-ovary-swap', 3: 'process-order-mixup' },
        optionFeedback: {
          0: "That is pollination. Fertilisation is what happens after the pollen lands.",
          2: "The ovary becomes the fruit. And fertilisation is a joining of two cells.",
          3: "That is germination, which happens to a seed much later." },
        explain: "Fertilisation is when the male reproductive cell from the pollen grain fuses with the female reproductive cell (egg cell) in the ovule." },
      { id: 'rep-014', type: 'mcq', level: 3, syl: 'P5', skill: 'seeds',
        stem: "Jun Hao cut a fruit in half. What is the smallest number of ovules that were fertilised to form this fruit?",
        figure: FIG_CUT_FRUIT,
        options: ["1", "3", "6", "12"],
        answer: 2,
        miscon: { 0: 'fertilise-count', 1: 'fertilise-count', 3: 'fertilise-count' },
        technique: 'Count, then check',
        steps: ["Count the seeds in the fruit.", "Each seed came from one fertilised ovule.", "Check: one ovule for each seed, no more and no fewer."],
        optionFeedback: {
          0: "One fertilised ovule gives only one seed. How many seeds can you count?",
          1: "Count again: each seed needs its own fertilised ovule.",
          3: "Each seed comes from ONE fertilised ovule, not two." },
        explain: "There are 6 seeds. Each seed develops from one fertilised ovule, so at least 6 ovules were fertilised." },
      { id: 'rep-015', type: 'mcq', level: 3, syl: 'P5', skill: 'seeds',
        stem: "Which of these statements are correct?\nA: Pollination must happen before fertilisation.\nB: The ovary develops into the fruit.\nC: Every pollen grain that lands on a stigma produces a seed.\nD: The fruit protects the seeds inside it.",
        figure: null,
        options: ["A, B and D only", "A and C only", "B and D only", "A, B, C and D"],
        answer: 0,
        miscon: { 1: 'fertilise-count', 2: 'process-order-mixup', 3: 'fertilise-count' },
        technique: 'Tick or cross',
        steps: ["Read one statement at a time.", "Think about the order: pollination, then fertilisation.", "Can one seed come from more than one ovule? Can every grain make a seed?", "Choose the option with only the ticks."],
        optionFeedback: {
          1: "A is right. But a flower has only so many ovules, so not every pollen grain makes a seed. Check B and D.",
          2: "B and D are right. Pollen must reach the stigma before the cells can fuse, so A is right too.",
          3: "C does not hold: a flower has only so many ovules, so many pollen grains never make a seed." },
        explain: "A, B and D are correct. C is not: a seed forms only where an ovule is fertilised, and there are usually far more pollen grains than ovules." },
      { id: 'rep-016', type: 'mcq', level: 2, syl: 'P5', skill: 'seeds',
        stem: "The diagram shows the life cycle of a flowering plant. What are stages A and B?",
        figure: FIG_CYCLE,
        options: ["A: pollination, B: germination", "A: germination, B: fertilisation", "A: seed dispersal, B: pollination", "A: fertilisation, B: germination"],
        answer: 3,
        miscon: { 0: 'process-order-mixup', 1: 'process-order-mixup', 2: 'process-order-mixup' },
        technique: 'Follow the arrows',
        steps: ["Start at pollination and follow the arrows.", "What must happen after pollen lands but before seeds form?", "What happens to a seed after it is dispersed?"],
        optionFeedback: {
          0: "Pollination is already shown at the top. What comes straight after it?",
          1: "Germination needs a seed, and there are no seeds until after A.",
          2: "Seed dispersal is already shown. What turns pollen on a stigma into seeds?" },
        explain: "After pollination comes fertilisation (A), then seeds form and are dispersed. A dispersed seed germinates (B) and grows into a plant that flowers." },

      // ----- Seed dispersal -----
      { id: 'rep-017', type: 'mcq', level: 1, syl: 'P5', skill: 'dispersal',
        stem: "A coconut has a fibrous husk that traps air, and a waterproof outer covering. How is it most likely dispersed?",
        figure: null,
        options: ["By water", "By wind", "By animals", "By splitting"],
        answer: 0,
        miscon: { 1: 'dispersal-feature-mixup', 2: 'dispersal-feature-mixup', 3: 'dispersal-feature-mixup' },
        optionFeedback: {
          1: "A coconut is far too heavy for the wind. What does air trapped in the husk help it do?",
          2: "It has no hooks and is not usually eaten whole. Think about the trapped air.",
          3: "The coconut does not burst open. Trapped air helps it float." },
        explain: "The air trapped in the fibrous husk helps the coconut float, and the waterproof covering keeps water out, so it is carried by water." },
      { id: 'rep-018', type: 'mcq', level: 2, syl: 'P5', skill: 'dispersal',
        stem: "Which fruit is most likely dispersed by animals?",
        figure: FIG_SEEDS,
        options: ["P", "Q", "R", "S"],
        answer: 1,
        miscon: { 0: 'dispersal-feature-mixup', 2: 'dispersal-feature-mixup', 3: 'dispersal-feature-mixup' },
        optionFeedback: {
          0: "A flat papery wing catches the air. Which fruit could cling to an animal?",
          2: "A fibrous husk helps a fruit float. Look for something that sticks.",
          3: "This pod flings its own seeds out. Which fruit could hitch a ride?" },
        explain: "Q is covered in tiny hooks that catch on the fur of animals, so it is carried away." },
      { id: 'rep-019', type: 'mcq', level: 2, syl: 'P5', skill: 'dispersal',
        stem: "Which pair correctly matches the fruits to how they are dispersed?",
        figure: FIG_SEEDS,
        options: ["P: water, Q: wind", "R: animals, S: wind", "P: wind, S: splitting", "Q: splitting, R: wind"],
        answer: 2,
        miscon: { 0: 'dispersal-feature-mixup', 1: 'dispersal-feature-mixup', 3: 'dispersal-feature-mixup' },
        technique: 'Tick or cross',
        steps: ["Match each feature to a way of dispersal.", "Check BOTH halves of each option.", "Cross an option if either half does not match."],
        optionFeedback: {
          0: "A papery wing is for the air, and hooks are for animals. Check both halves.",
          1: "A fibrous husk helps R float, and a pod that splits does not need wind.",
          3: "Hooks catch on animals, and a fibrous husk helps a fruit float." },
        explain: "P has a flat papery wing, so wind carries it. S is a dry pod that splits open and flings out its seeds." },
      { id: 'rep-020', type: 'mcq', level: 2, syl: 'P5', skill: 'dispersal',
        stem: "Why is it important for seeds to be dispersed away from the parent plant?",
        figure: null,
        options: ["So that the seeds germinate faster", "So that the seeds get food from the parent", "So that the seeds are protected from rain", "So that the young plants compete less for water, light and space"],
        answer: 3,
        miscon: { 0: 'dispersal-why', 1: 'dispersal-why', 2: 'dispersal-why' },
        optionFeedback: {
          0: "Moving does not make a seed germinate faster. Picture 100 seedlings under one tree.",
          1: "Once a seed leaves, the parent cannot feed it. Think about crowding.",
          2: "Seeds need water to germinate, so rain is not the problem. Think about crowding." },
        explain: "Seeds that land far apart grow into young plants that do not crowd each other or the parent, so there is less competition for water, sunlight, space and mineral salts." },
      { id: 'rep-021', type: 'mcq', level: 3, syl: 'P5', skill: 'inquiry',
        stem: "Siti made paper model seeds with wings of different lengths. She dropped each one from the same height in front of the same fan and measured how far it travelled. What can she conclude?",
        figure: TBL_WING,
        options: ["The longer the wings, the further the model seed travels.", "The longer the wings, the faster the seed germinates.", "Wing length does not affect the distance travelled.", "The heavier the model seed, the further it travels."],
        answer: 0,
        miscon: { 1: 'changed-measured-mixup', 2: 'graph-misread', 3: 'changed-measured-mixup' },
        technique: 'Read, compare, conclude',
        steps: ["Read: what did she change? Wing length.", "Read: what did she measure? Distance travelled.", "Compare: as wing length goes up, what happens to distance?", "Conclude using only those two things."],
        optionFeedback: {
          1: "She never planted the seeds. What did she measure?",
          2: "Look down the table: the distance changes a lot as the wings get longer.",
          3: "She did not change or weigh the mass. Her conclusion must be about what she changed." },
        explain: "As the wing length increases from 2 cm to 8 cm, the distance increases from 45 cm to 185 cm. The longer the wings, the further the model seed travels." },

      // ----- Plants with spores -----
      { id: 'rep-022', type: 'mcq', level: 1, syl: 'P5', skill: 'spores',
        stem: "Which of these plants reproduces by spores?",
        figure: null,
        options: ["Hibiscus", "Rice plant", "Fern", "Mango tree"],
        answer: 2,
        miscon: { 0: 'spores-from-flowers', 1: 'spores-from-flowers', 3: 'spores-from-flowers' },
        optionFeedback: {
          0: "A hibiscus has flowers, so it makes seeds. Which plant has no flowers?",
          1: "A rice plant flowers, and the rice grains we eat are its seeds.",
          3: "A mango tree flowers and makes fruits with seeds. Which plant never flowers?" },
        explain: "Ferns do not have flowers and do not make seeds. They reproduce by spores." },
      { id: 'rep-023', type: 'mcq', level: 2, syl: 'P5', skill: 'spores',
        stem: "Ahmad found rows of brown spots on the underside of a fern leaf. What do these spots contain?",
        figure: FIG_FERN,
        options: ["Pollen grains", "Spores", "Seeds", "Fruits"],
        answer: 1,
        miscon: { 0: 'spores-from-flowers', 2: 'all-plants-seeds', 3: 'all-plants-seeds' },
        optionFeedback: {
          0: "Pollen comes from the anthers of flowers. Ferns have no flowers.",
          2: "Ferns do not make seeds at all. What do they reproduce by?",
          3: "Fruits come from the ovaries of flowers, and ferns have none." },
        explain: "The brown spots are spore cases. They hold the tiny spores that ferns reproduce by." },
      { id: 'rep-024', type: 'mcq', level: 3, syl: 'P5', skill: 'spores',
        stem: "Which of these statements about ferns and mosses are correct?\nA: They do not produce flowers.\nB: They do not produce seeds.\nC: They reproduce by spores.\nD: They produce pollen grains.",
        figure: null,
        options: ["A and B only", "C and D only", "A, B and D only", "A, B and C only"],
        answer: 3,
        miscon: { 0: 'all-plants-seeds', 1: 'spores-from-flowers', 2: 'spores-from-flowers' },
        technique: 'Tick or cross',
        steps: ["Take one statement at a time.", "Do ferns and mosses have flowers? Seeds?", "Where is pollen made? Do they have that part?", "Choose the option with only the ticks."],
        optionFeedback: {
          0: "A and B are right. How do they reproduce, then? Check C.",
          1: "C is right, but pollen is made in the anthers of flowers.",
          2: "A and B are right, but D needs flowers. Check C instead." },
        explain: "Ferns and mosses have no flowers and no seeds (A, B). They reproduce by spores (C). Without flowers, they make no pollen." },

      // ----- Human reproduction and inheritance -----
      { id: 'rep-025', type: 'mcq', level: 1, syl: 'P5', skill: 'human',
        stem: "Which organs make sperms?",
        figure: null,
        options: ["Testes", "Ovaries", "Womb", "Lungs"],
        answer: 0,
        miscon: { 1: 'sperm-egg-source', 2: 'sperm-egg-source', 3: 'sperm-egg-source' },
        optionFeedback: {
          1: "The ovaries are female organs that make eggs.",
          2: "The womb is where a baby develops in the mother.",
          3: "The lungs are for breathing. Sperms are made by a male reproductive organ." },
        explain: "In males, the testes make sperms. In females, the ovaries make eggs." },
      { id: 'rep-026', type: 'mcq', level: 2, syl: 'P5', skill: 'human',
        stem: "What happens during fertilisation in humans?",
        figure: null,
        options: ["An egg fuses with another egg.", "Many sperms fuse with one egg.", "A sperm fuses with an egg.", "A sperm grows into a baby on its own."],
        answer: 2,
        miscon: { 0: 'one-sperm', 1: 'one-sperm', 3: 'one-sperm' },
        optionFeedback: {
          0: "Fertilisation joins a cell from the father with a cell from the mother.",
          1: "Many sperms may reach the egg, but only ONE fuses with it.",
          3: "A sperm cannot become a baby by itself. It must fuse with something first." },
        explain: "During fertilisation, one sperm from the father fuses with one egg from the mother to form a fertilised egg." },
      { id: 'rep-027', type: 'mcq', level: 2, syl: 'P5', skill: 'human',
        stem: "The table shows two characteristics of a mother cat, a father cat and their kitten K. Which statement is correct?",
        figure: TBL_KITTEN,
        options: ["K inherited characteristics from its mother only.", "K inherited characteristics from its father only.", "K did not inherit any characteristics.", "K inherited characteristics from both parents."],
        answer: 3,
        miscon: { 0: 'inherit-one-parent', 1: 'inherit-one-parent', 2: 'inherit-one-parent' },
        technique: 'Read, compare, conclude',
        steps: ["Read K's fur colour. Which parent has the same?", "Read K's tail. Which parent has the same?", "Conclude: one parent, both or none?"],
        optionFeedback: {
          0: "K's long tail is like its mother's. Now look at K's fur colour.",
          1: "K's black fur is like its father's. Now look at K's tail.",
          2: "K's fur matches one parent and its tail matches the other." },
        explain: "K has black fur like its father and a long tail like its mother, so it inherited characteristics from both parents." },
      { id: 'rep-028', type: 'mcq', level: 3, syl: 'P5', skill: 'human',
        stem: "Why does a child usually have some characteristics of both parents?",
        figure: null,
        options: ["The child copies its parents as it grows up.", "The sperm and the egg each carry characteristics from a parent.", "Only the egg carries characteristics to the baby.", "The mother's food passes the father's features to the baby."],
        answer: 1,
        miscon: { 0: 'learned-vs-inherited', 2: 'inherit-one-parent', 3: 'inherit-one-parent' },
        optionFeedback: {
          0: "Copying is learning. Eye colour cannot be copied: it is there from the start.",
          2: "If only the egg carried them, children would look like their mothers only.",
          3: "Food helps a baby grow, but it does not carry the father's features." },
        explain: "The sperm carries characteristics from the father and the egg carries characteristics from the mother. When they fuse, the child gets characteristics from both." },

      // ----- Open-ended -----
      { id: 'rep-029', type: 'oeq', level: 2, marks: 2, syl: 'P5', skill: 'pollination', chain: true,
        stem: "A bee lands on a flower to drink nectar and then flies to another flower of the same kind. Explain how the bee helps the second flower to be pollinated.",
        figure: null,
        model: "Pollen grains from the anthers of the first flower stick to the bee's body. When the bee visits the second flower, some pollen rubs onto the stigma.",
        keys: [["pollen grains from the anthers", "pollen sticks", "pollen grains stick", "pollen on its body", "pollen on the bee"], ["pollen rubs onto the stigma", "pollen lands on the stigma", "pollen is transferred to the stigma", "pollen onto its stigma"]],
        watchFor: ['insect-role', 'pollination-is-fertilisation'],
        technique: 'Follow the arrows',
        steps: ["What does the bee pick up at the first flower?", "Where does it carry that?", "Which part of the second flower must it touch?"],
        explain: "In order: pollen sticks to the bee at the first flower -> the bee carries it -> the pollen rubs onto the stigma of the second flower." },
      { id: 'rep-030', type: 'oeq', level: 2, marks: 3, syl: 'P5', skill: 'pollination',
        stem: "Look at the table of flowers M and N.\n(a) Which flower is pollinated by wind? (1 mark)\n(b) Give two features, from different rows of the table, that support your answer. (2 marks)",
        figure: TBL_FLOWERS,
        model: "(a) Flower N. (b) It has feathery stigmas that hang outside the flower to catch pollen from the air. It also makes a large amount of light, smooth pollen that the wind can carry.",
        keys: [["Flower N"], ["feathery stigmas that hang outside", "no petals", "no scent", "no nectar", "large amount of light, smooth pollen"], ["large amount of light, smooth pollen", "a SECOND feature from a DIFFERENT row of the table"]],
        watchFor: ['wind-flower-features'],
        technique: 'Claim, evidence, reason',
        steps: ["Claim: name the flower.", "Evidence: pick two rows from the table for that flower.", "Reason: how does each feature help the wind?"],
        explain: "One mark for N. One mark each for two DIFFERENT features of N: feathery stigmas hanging outside, large amount of pollen, light and smooth pollen, no petals, no scent or no nectar." },
      { id: 'rep-031', type: 'oeq', level: 3, marks: 3, syl: 'P5', skill: 'seeds', chain: true,
        stem: "After the flowers of a mango tree were pollinated, mangoes with seeds formed. Explain how the fruits and their seeds were formed.",
        figure: null,
        model: "The male reproductive cell from the pollen grain reached an ovule. There, the male reproductive cell fused with the female reproductive cell. This is fertilisation. Then the ovule developed into a seed and the ovary developed into the fruit.",
        keys: [["male reproductive cell fused with the female reproductive cell", "male cell fuses with the egg cell", "fertilisation took place", "ovules were fertilised"], ["ovule developed into a seed", "ovule became a seed", "ovule grew into a seed", "ovule becomes a seed", "ovules developed into seeds", "ovule develops into a seed"], ["ovary developed into the fruit", "ovary became the fruit", "ovary grew into the fruit", "ovary becomes the fruit", "ovary develops into the fruit"]],
        watchFor: ['pollination-is-fertilisation', 'ovule-ovary-swap'],
        technique: 'Follow the arrows',
        steps: ["After pollination, what joins with what?", "What does each fertilised ovule become?", "What does the ovary become?"],
        explain: "In order: fertilisation (male cell fuses with female cell in the ovule) -> ovule becomes the seed -> ovary becomes the fruit." },
      { id: 'rep-032', type: 'oeq', level: 2, marks: 2, syl: 'P5', skill: 'seeds', chain: true,
        stem: "Mr Lim carefully cut off the stigmas of some flowers before they opened. These flowers did not form any fruits. Explain why.",
        figure: null,
        model: "Without a stigma, no pollen could land on the flower, so there was no pollination. Without pollination, the ovules could not be fertilised, so no fruits formed.",
        keys: [["no pollination", "not pollinated", "pollen could not land", "no pollen could land", "nowhere for pollen to land", "could not receive pollen"], ["could not be fertilised", "no fertilisation", "not fertilised", "not be fertilised"]],
        watchFor: ['fruit-without-pollination', 'pollination-is-fertilisation'],
        technique: 'Follow the arrows',
        steps: ["What is the stigma's job?", "With no stigma, can pollination happen?", "With no pollination, can fertilisation happen?"],
        explain: "In order: no stigma -> no pollination -> no fertilisation -> no fruit." },
      { id: 'rep-033', type: 'oeq', level: 3, marks: 4, syl: 'P5', skill: 'inquiry',
        stem: "Nurul placed bean seeds on cotton wool in four set-ups, A, B, C and D, and recorded whether they germinated.\n(a) Which two set-ups should she compare to find out if the seeds need the cotton wool to be moist? (1 mark)\n(b) What do the results of A and D show? (1 mark)\n(c) Name two conditions the results show are needed for germination. (2 marks)",
        figure: TBL_GERM,
        model: "(a) A and B. (b) The seeds do not need light to germinate, because they germinated both in the dark and in the light. (c) Water and a suitable temperature (warmth).",
        keys: [["A and B", "B and A"], ["do not need light", "light is not needed", "not need light", "without light", "light does not affect"], ["water"], ["suitable temperature", "warmth", "warm", "25 °C"]],
        watchFor: ['germination-needs-light', 'changed-measured-mixup'],
        technique: 'Change one thing',
        steps: ["(a) Find two set-ups that differ in the cotton wool only.", "(b) A and D differ in one thing only. What is it, and did it matter?", "(c) Which set-ups failed? What was missing in each?"],
        hints: ["Set-ups A and B are in the same place.", "C was moist but cold. B was warm but dry."],
        explain: "(a) A and B differ only in moist or dry cotton wool. (b) A (dark) and D (light) both germinated, so light is not needed. (c) B had no water and C was too cold, so water and a suitable temperature are needed." },
      { id: 'rep-034', type: 'oeq', level: 2, marks: 2, syl: 'P5', skill: 'dispersal',
        stem: "The fruit of the angsana tree has a flat, papery wing around the seed.\n(a) How is the fruit dispersed? (1 mark)\n(b) How does its wing help? (1 mark)",
        figure: null,
        model: "(a) It is dispersed by wind. (b) The wing catches the air, so the fruit falls slowly and the wind can carry it further away from the parent tree.",
        keys: [["wind"], ["falls slowly", "carry it further", "further away", "stays in the air longer", "slows its fall", "carried far", "catches the air", "catches the wind", "carried by the wind"]],
        watchFor: ['dispersal-feature-mixup'],
        technique: 'Claim, evidence, reason',
        steps: ["Claim: name the way it is dispersed.", "Evidence: the flat, papery wing.", "Reason: what does the wing do as the fruit falls?"],
        explain: "(a) Wind. (b) The wing lets it fall slowly, so the wind carries it further from the parent tree." },
      { id: 'rep-035', type: 'oeq', level: 3, marks: 3, syl: 'P5', skill: 'dispersal', chain: true,
        stem: "Coconut trees often grow near the sea. Explain how the way a coconut is dispersed helps the young coconut plants to survive.",
        figure: null,
        model: "The coconut floats and is carried by the sea to a place far away from the parent tree. So the young plant grows where there is less competition for sunlight, water, space and mineral salts with the parent tree and other young plants.",
        keys: [["carried by the sea", "carried by water", "carried by the water", "floats away", "drifts"], ["far away from the parent", "away from the parent", "further away", "far from the parent"], ["less competition for sunlight", "less competition for water", "less competition for space", "less competition for mineral salts"]],
        watchFor: ['dispersal-why', 'dispersal-feature-mixup'],
        technique: 'Follow the arrows',
        steps: ["How does a coconut travel?", "Where does it end up, compared with the parent?", "Why does that help the young plant?"],
        explain: "In order: carried by water -> lands far from the parent -> less competition for sunlight, water, space and mineral salts." },
      { id: 'rep-036', type: 'oeq', level: 2, marks: 2, syl: 'P5', skill: 'dispersal',
        stem: "Describe two different ways in which animals help to disperse seeds.",
        figure: null,
        model: "Animals eat the fruit and pass out the seeds in droppings elsewhere. Fruits with hooks stick to fur or feathers and are carried away.",
        keys: [["eat the fruit and pass out the seeds in droppings elsewhere", "eat the fruit and spit out the seeds elsewhere", "carry the fruit away and drop or bury it"], ["fruits with hooks stick to fur or feathers", "hooks catch on fur", "stick to fur or feathers and are carried away"]],
        watchFor: ['dispersal-feature-mixup'],
        technique: 'Tick or cross',
        steps: ["Think of fruits that animals like to eat.", "Think of fruits that cling to animals.", "Write one sentence for each way."],
        explain: "One mark for animals eating fruits and dropping or passing out the seeds elsewhere. One mark for hooked fruits sticking to fur or feathers." },
      { id: 'rep-037', type: 'oeq', level: 3, marks: 5, syl: 'P5', skill: 'inquiry',
        stem: "Siti made paper model seeds with wings of different lengths. She dropped each one in front of a fan and recorded her results.\n(a) Which variable did she change? (1 mark)\n(b) What did she measure? (1 mark)\n(c) Name two variables she must keep the same. (2 marks)\n(d) What do her results show? (1 mark)",
        figure: TBL_WING,
        model: "(a) The wing length. (b) The distance travelled by the model seed. (c) She must drop each model seed from the same height, and keep the same fan speed. (d) The longer the wings, the further it travels.",
        keys: [["wing length", "length of the wings", "length of wing"], ["distance"], ["same height", "same fan speed", "same distance from the fan", "same type of paper", "same seed part (body)"], ["same fan speed", "a SECOND, different variable from that list"], ["the longer the wings, the further it travels", "longer wings travel further"]],
        watchFor: ['changed-measured-mixup', 'graph-misread'],
        technique: 'Change one thing',
        steps: ["(a) Look at the first column of the table.", "(b) Look at the second column.", "(c) What else could change the distance? Keep it the same.", "(d) Read down the table: as one goes up, what does the other do?"],
        explain: "(a) Wing length. (b) Distance travelled. (c) Any two different ones of: same height, same fan speed, same distance from the fan, same type of paper, same seed part (body). (d) The longer the wings, the further it travels." },
      { id: 'rep-038', type: 'oeq', level: 1, marks: 2, syl: 'P5', skill: 'spores',
        stem: "Ferns do not have flowers.\n(a) How do ferns reproduce? (1 mark)\n(b) Where on a fern would you look for them? (1 mark)",
        figure: null,
        model: "(a) Ferns reproduce by spores. (b) On the underside of the leaves, in the brown spore cases.",
        keys: [["spores"], ["underside", "under the leaves", "below the leaves", "back of the leaves", "spore cases"]],
        watchFor: ['all-plants-seeds', 'spores-from-flowers'],
        technique: 'Claim, evidence, reason',
        steps: ["No flowers means no seeds. What do ferns use instead?", "Think about the brown spots on a fern: which side of the leaf are they on?", "Write one short answer for each part."],
        explain: "(a) Spores. (b) In the spore cases (brown spots) on the underside of the leaves." },
      { id: 'rep-039', type: 'oeq', level: 3, marks: 3, syl: 'P5', skill: 'spores',
        stem: "Ali says, 'All plants reproduce from seeds.' Use mosses and ferns to explain whether he is right.",
        figure: null,
        model: "He is not right. Mosses and ferns are plants, but they do not produce flowers or seeds. They reproduce by spores instead.",
        keys: [["mosses and ferns are plants"], ["do not produce flowers or seeds", "do not produce seeds", "no seeds", "do not have seeds", "do not make seeds"], ["spores"]],
        watchFor: ['all-plants-seeds'],
        technique: 'Claim, evidence, reason',
        steps: ["Claim: is Ali right?", "Evidence: what do mosses and ferns NOT make?", "Reason: how do they reproduce instead?"],
        explain: "He is not right. One mark for saying mosses and ferns are plants, one for saying they do not make seeds, one for saying they reproduce by spores." },
      { id: 'rep-040', type: 'oeq', level: 1, marks: 2, syl: 'P5', skill: 'human',
        stem: "Name the organ in the human body that makes\n(a) sperms (1 mark)\n(b) eggs (1 mark)",
        figure: null,
        model: "(a) Testes. (b) Ovaries.",
        keys: [["(a) testes", "(a) testis"], ["(b) ovaries", "(b) ovary"]],
        watchFor: ['sperm-egg-source'],
        technique: 'Tick or cross',
        steps: ["Which parent makes sperms? Name the organ.", "Which parent makes eggs? Name the organ.", "Check you have not swapped them."],
        explain: "(a) Testes (male). (b) Ovaries (female)." },
      { id: 'rep-041', type: 'oeq', level: 2, marks: 3, syl: 'P5', skill: 'human', chain: true,
        stem: "Describe how a human baby begins, and where it develops before it is born.",
        figure: null,
        model: "Inside the mother's body, a sperm fuses with an egg. The sperm comes from the father and the egg comes from the mother. This forms a fertilised egg. The fertilised egg develops into a baby in the mother's womb.",
        keys: [["sperm fuses with an egg", "sperm joins with an egg", "sperm and egg fuse"], ["fertilised egg", "fertilisation"], ["womb", "uterus"]],
        watchFor: ['one-sperm', 'sperm-egg-source'],
        technique: 'Follow the arrows',
        steps: ["Which two cells join?", "What do they form?", "Where does that grow into a baby?"],
        explain: "In order: a sperm fuses with an egg -> a fertilised egg forms -> it develops into a baby in the womb." },
      { id: 'rep-042', type: 'oeq', level: 3, marks: 4, syl: 'P5', skill: 'human',
        stem: "Look at the table about kitten K and its parents.\n(a) Name one characteristic K inherited from its mother and one it inherited from its father. (2 marks)\n(b) Explain how K came to have characteristics of both parents. (2 marks)",
        figure: TBL_KITTEN,
        model: "(a) From its mother: a long tail. From its father: black fur. (b) The sperm carried characteristics from the father and the egg carried characteristics from the mother. K developed from the fertilised egg, so it has characteristics of both.",
        keys: [["long tail"], ["black fur"], ["sperm carried characteristics from the father", "father's characteristics are in the sperm"], ["egg carried characteristics from the mother", "mother's characteristics are in the egg"]],
        watchFor: ['inherit-one-parent'],
        technique: 'Read, compare, conclude',
        steps: ["Compare K's row with the mother's row.", "Compare K's row with the father's row.", "Which cell came from each parent?", "Say what each cell carried."],
        explain: "(a) Long tail (mother), black fur (father). (b) One mark for the sperm carrying the father's characteristics, one for the egg carrying the mother's." },
      { id: 'rep-043', type: 'oeq', level: 2, marks: 2, syl: 'P5', skill: 'human',
        stem: "Explain why it is important for living things to reproduce.",
        figure: null,
        model: "Reproduction makes sure that their kind continues. Without reproduction, that kind of living thing would die out when the old ones die.",
        keys: [["continues", "continuity", "carry on", "continue"], ["die out", "extinct", "disappear"]],
        watchFor: ['reproduce-for-self'],
        technique: 'Claim, evidence, reason',
        steps: ["Every living thing dies one day.", "What keeps its kind going?", "What would happen without reproduction?"],
        explain: "One mark for ensuring the kind continues. One mark for saying the kind would die out without it." },
      { id: 'rep-044', type: 'oeq', level: 3, marks: 5, syl: 'P5', skill: 'flower',
        stem: "Look at the flower.\n(a) Name parts A and E. (2 marks)\n(b) After fertilisation, what does part E develop into? (1 mark)\n(c) After fertilisation, what does part F develop into? (1 mark)\n(d) Name the process in which pollen from A is moved to C. (1 mark)",
        figure: FIG_FLOWER,
        model: "(a) A is the anther. E is the ovary. (b) E develops into the fruit. (c) F develops into a seed. (d) Pollination.",
        keys: [["A is the anther"], ["E is the ovary"], ["E develops into the fruit"], ["F develops into a seed"], ["(d) pollination"]],
        watchFor: ['male-female-parts-mixup', 'ovule-ovary-swap', 'pollination-is-fertilisation'],
        technique: 'Follow the arrows',
        steps: ["(a) A sits on top of a stamen; E is the swollen base.", "(b) and (c) Which part becomes the fruit, which becomes a seed?", "(d) Pollen moving from anther to stigma has a name."],
        explain: "(a) Anther, ovary. (b) Fruit. (c) Seed. (d) Pollination." },
      { id: 'rep-045', type: 'oeq', level: 3, marks: 3, syl: 'P5', skill: 'seeds', chain: true,
        stem: "Explain why fertilisation cannot take place in a flower unless pollination happens first.",
        figure: null,
        model: "The male reproductive cell is inside the pollen grain. The pollen must first land on the stigma. Only then can the male reproductive cell reach the ovule and fuse with the female reproductive cell.",
        keys: [["male reproductive cell", "male cell"], ["land on the stigma", "lands on the stigma", "reach the stigma", "reaches the stigma", "onto the stigma"], ["fuse", "join"]],
        watchFor: ['pollination-is-fertilisation'],
        technique: 'Follow the arrows',
        steps: ["Where is the male reproductive cell at the start?", "Where must the pollen get to first?", "What can happen once it is there?"],
        explain: "In order: the male cell is in the pollen grain -> the pollen must land on the stigma (pollination) -> then the male cell can fuse with the female cell in the ovule." }
    ]
  });
})();
