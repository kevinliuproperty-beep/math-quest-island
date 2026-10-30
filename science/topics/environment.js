"use strict";
// Science Quest — topic: Interactions within the Environment (P6, Interactions). Data only; the helpers
// below just build SVG/HTML strings.
// Scope per MOE Primary Science Syllabus 2023, theme Interactions, "Interactions within the Environment"
// (P5-P6 block, examined at PSLE 0009 from 2026). Sources checked 2026-10-30 (school decks that quote or
// summarise the syllabus; the MOE PDF itself did not load on the day):
//   - Westspring Pri, P6 Curriculum Briefing (Science) 2024/2025/2026: Interactions within the Environment =
//     "Living Together; Food Chains and Food Webs; Adaptations; Man's Impact on His Environment"
//     https://www.westspringpri.moe.edu.sg/files/Curriculum%20Briefing%20Slides/2024/2024_Primary_6_Curriculum_Briefing___Science.pdf
//   - Shuqun Pri, P6 Science Handbook 2025: "Identify the factors that affect the survival of an organism";
//     roles of organisms (producers, consumers, predators, prey) in food chains and food webs
//     https://www.shuqunpri.moe.edu.sg/files/P6_Science_Handbook_2025.pdf
//   - Admiralty Pri, P6 Science Lesson Focus: theme Interactions, food chains, food webs and man's impact
//     https://www.admiraltypri.moe.edu.sg/files/Level%20Matters/Content/P6_Science_Lesson_Focus.pdf
// In scope here: organism, population, community, habitat; environmental factors (light, temperature,
//   water, air) and their effect on organisms; food chains and food webs with producers, consumers,
//   predators and prey; effects of a population change in a food web; decomposers break down dead
//   matter (kept OUT of every food-web diagram); structural and behavioural adaptations to obtain food,
//   escape predators, breathe and survive extreme temperatures; man's impact (deforestation, pollution,
//   conservation).
// FOOD-WEB CONVENTION: every arrow points from the food to the organism that eats it ("is eaten by").
//   Every web stem says so (ARROW below), and every web figure carries the same key.
// Deliberately LEFT OUT (uncertain at P6 level): energy pyramids, trophic-level names (primary/secondary
//   consumer), decomposers as a link inside food webs, eutrophication, evolution / natural selection,
//   global warming detail, carbon and water cycles (Cycles theme).
(function () {
  const INK = '#1f2937', LINE = '#475569', GREEN = '#16a34a', BLUE = '#2563eb', ORANGE = '#c2410c';

  const svg = (w, h, label, inner) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="100%" style="max-width:${w}px;display:block;margin:0 auto" role="img" aria-label="${label}">` +
    `<rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="10" fill="#ffffff" stroke="#cbd5e1"/>${inner}</svg>`;

  const txt = (x, y, s, o = {}) =>
    `<text x="${x}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="${o.size || 15}" font-weight="${o.bold ? 700 : 400}" fill="${o.fill || INK}" text-anchor="${o.anchor || 'middle'}" dominant-baseline="middle">${s}</text>`;

  // Straight arrow from (x1,y1) to (x2,y2) with a head at (x2,y2).
  const arrow = (x1, y1, x2, y2, o = {}) => {
    const a = Math.atan2(y2 - y1, x2 - x1), L = 10, W = 5.5;
    const bx = x2 - L * Math.cos(a), by = y2 - L * Math.sin(a);
    const px = W * Math.sin(a), py = -W * Math.cos(a);
    const c = o.colour || INK;
    return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${bx.toFixed(1)}" y2="${by.toFixed(1)}" stroke="${c}" stroke-width="${o.width || 2.2}"/>` +
      `<polygon points="${x2.toFixed(1)},${y2.toFixed(1)} ${(bx + px).toFixed(1)},${(by + py).toFixed(1)} ${(bx - px).toFixed(1)},${(by - py).toFixed(1)}" fill="${c}"/>`;
  };

  // Food web / food chain. nodes: { key: [x, y, label] }; edges: [[food, eater], ...].
  // Each arrow runs from the edge of the food's box to the edge of the eater's box.
  const BH = 28;
  const bw = (s) => Math.max(44, Math.round(s.length * 8.4 + 18));
  const web = (w, h, label, nodes, edges) => {
    let s = '';
    const exit = (k, ux, uy) => {
      const hw = bw(nodes[k][2]) / 2, hh = BH / 2;
      return Math.min(ux ? hw / Math.abs(ux) : Infinity, uy ? hh / Math.abs(uy) : Infinity);
    };
    edges.forEach(([a, b]) => {
      const [xa, ya] = nodes[a], [xb, yb] = nodes[b];
      const d = Math.hypot(xb - xa, yb - ya), ux = (xb - xa) / d, uy = (yb - ya) / d;
      const ta = exit(a, ux, uy) + 3, tb = exit(b, ux, uy) + 3;
      s += arrow(xa + ux * ta, ya + uy * ta, xb - ux * tb, yb - uy * tb);
    });
    Object.keys(nodes).forEach((k) => {
      const [x, y, t] = nodes[k], W = bw(t);
      s += `<rect x="${x - W / 2}" y="${y - BH / 2}" width="${W}" height="${BH}" rx="8" fill="#f1f5f9" stroke="${LINE}" stroke-width="1.5"/>` + txt(x, y + 1, t);
    });
    // key: the arrow means "is eaten by"
    const kx = Math.max(10, w / 2 - 128);
    s += arrow(kx, h - 18, kx + 36, h - 18) + txt(kx + 44, h - 17, 'means “is eaten by”', { size: 14, anchor: 'start' });
    return svg(w, h, label, s);
  };

  const ARROW = 'In the diagram, each arrow points from the food to the organism that eats it (the arrow means “is eaten by”).';

  const TH = 'border:1px solid #94a3b8;padding:6px 10px;background:#e2e8f0;color:#111827';
  const TD = 'border:1px solid #94a3b8;padding:6px 10px;text-align:center';
  const table = (head, rows, caption) =>
    `<table style="border-collapse:collapse;margin:0 auto;font-size:15px">` +
    (caption ? `<caption style="padding:4px 0 6px;font-weight:600">${caption}</caption>` : '') +
    `<thead><tr>${head.map((h) => `<th style="${TH}">${h}</th>`).join('')}</tr></thead>` +
    `<tbody>${rows.map((r) => `<tr>${r.map((c) => `<td style="${TD}">${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;

  // ---------- Figures ----------
  // A simple food chain drawn bottom to top.
  const CHAIN_RICE = web(300, 300, 'Food chain: rice plant is eaten by grasshopper, grasshopper is eaten by frog, frog is eaten by snake',
    { rice: [150, 240, 'rice plant'], hop: [150, 172, 'grasshopper'], frog: [150, 104, 'frog'], snake: [150, 36, 'snake'] },
    [['rice', 'hop'], ['hop', 'frog'], ['frog', 'snake']]);

  // Field food web.
  const WEB_FIELD = web(360, 300, 'Food web in a field: grass is eaten by grasshopper and caterpillar; grasshopper is eaten by frog and bird; caterpillar is eaten by bird; frog and bird are eaten by snake',
    { grass: [180, 246, 'grass'], hop: [90, 180, 'grasshopper'], cat: [270, 180, 'caterpillar'],
      frog: [90, 108, 'frog'], bird: [270, 108, 'bird'], snake: [180, 36, 'snake'] },
    [['grass', 'hop'], ['grass', 'cat'], ['hop', 'frog'], ['hop', 'bird'], ['cat', 'bird'], ['frog', 'snake'], ['bird', 'snake']]);

  // Pond food web.
  const WEB_POND = web(360, 300, 'Food web in a pond: algae is eaten by water flea and tadpole; water flea and tadpole are eaten by small fish; small fish is eaten by kingfisher and big fish',
    { algae: [180, 246, 'algae'], flea: [90, 180, 'water flea'], tad: [270, 180, 'tadpole'],
      sfish: [180, 108, 'small fish'], king: [90, 36, 'kingfisher'], bfish: [270, 36, 'big fish'] },
    [['algae', 'flea'], ['algae', 'tad'], ['flea', 'sfish'], ['tad', 'sfish'], ['sfish', 'king'], ['sfish', 'bfish']]);

  // Lettered food web.
  const WEB_LETTERS = web(360, 300, 'Food web with organisms P, A, B, C, D and E: P is eaten by A and B; A is eaten by C; B is eaten by C and D; C and D are eaten by E',
    { P: [180, 246, 'P'], A: [90, 180, 'A'], B: [270, 180, 'B'], C: [90, 108, 'C'], D: [270, 108, 'D'], E: [180, 36, 'E'] },
    [['P', 'A'], ['P', 'B'], ['A', 'C'], ['B', 'C'], ['B', 'D'], ['C', 'E'], ['D', 'E']]);

  // Mangrove food web (Sungei Buloh).
  const WEB_MANGROVE = web(360, 300, 'Food web in a mangrove: mangrove leaves are eaten by crab; algae are eaten by mudskipper; crab and mudskipper are each eaten by heron and by monitor lizard',
    { leaf: [90, 246, 'mangrove leaves'], alg: [270, 246, 'algae'], crab: [90, 146, 'crab'], mud: [270, 146, 'mudskipper'],
      heron: [90, 42, 'heron'], liz: [270, 42, 'monitor lizard'] },
    [['leaf', 'crab'], ['alg', 'mud'], ['crab', 'heron'], ['crab', 'liz'], ['mud', 'heron'], ['mud', 'liz']]);

  // Pond survey table.
  const TBL_POND = table(['Organism found in the pond', 'Number'],
    [['water lily', '15'], ['guppy', '40'], ['adult frog', '4'], ['tadpole (young of the same kind of frog)', '25'], ['dragonfly', '6']], 'Pond survey');

  // Woodlice choice chamber.
  const FIG_CHAMBER = (() => {
    let s = `<rect x="70" y="20" width="220" height="200" rx="6" fill="#f8fafc" stroke="${INK}" stroke-width="2"/>`;
    s += `<rect x="72" y="22" width="108" height="98" fill="#fef9c3"/><rect x="180" y="22" width="108" height="98" fill="#fef9c3"/>`;
    s += `<rect x="72" y="120" width="108" height="98" fill="#cbd5e1"/><rect x="180" y="120" width="108" height="98" fill="#cbd5e1"/>`;
    s += `<line x1="180" y1="20" x2="180" y2="220" stroke="${INK}" stroke-width="1.5"/><line x1="70" y1="120" x2="290" y2="120" stroke="${INK}" stroke-width="1.5"/>`;
    s += txt(126, 60, 'W', { bold: 1, size: 18 }) + txt(126, 86, 'light, dry', { size: 13 });
    s += txt(234, 60, 'X', { bold: 1, size: 18 }) + txt(234, 86, 'light, damp', { size: 13 });
    s += txt(126, 158, 'Y', { bold: 1, size: 18 }) + txt(126, 184, 'dark, dry', { size: 13 });
    s += txt(234, 158, 'Z', { bold: 1, size: 18 }) + txt(234, 184, 'dark, damp', { size: 13 });
    s += `<circle cx="180" cy="120" r="9" fill="#ffffff" stroke="${INK}"/>`;
    s += txt(180, 240, '20 woodlice placed at the centre', { size: 13 });
    return svg(360, 256, 'A tray split into four sections: W light and dry, X light and damp, Y dark and dry, Z dark and damp; 20 woodlice placed at the centre', s);
  })();
  const TBL_CHAMBER = table(['Section', 'W', 'X', 'Y', 'Z'], [['Number of woodlice after 15 minutes', '1', '3', '4', '12']], 'Results');
  const FIG_WOODLICE = `<div>${FIG_CHAMBER}<div style="height:10px"></div>${TBL_CHAMBER}</div>`;

  // Seeds at different temperatures.
  const TBL_SEEDS = table(['Temperature (°C)', 'Number of seeds that germinated (out of 20)'],
    [['5', '0'], ['25', '18'], ['35', '15'], ['60', '0']], 'Results after 7 days');

  // River readings near a factory.
  const TBL_RIVER = table(['Place', 'Amount of oxygen in the water (units)', 'Number of fish counted'],
    [['W (before the factory)', '8', '45'], ['X (just after the factory’s waste pipe)', '2', '3'], ['Y (far downstream)', '5', '20']], 'River survey');

  // Cactus with three labelled parts.
  const FIG_CACTUS = (() => {
    let s = `<rect x="20" y="196" width="320" height="64" fill="#fde68a"/><line x1="20" y1="196" x2="340" y2="196" stroke="#92400e" stroke-width="2"/>`;
    s += txt(300, 246, 'sand', { size: 13 });
    // roots: shallow and wide
    s += `<path d="M150 198 Q110 214 50 220 M150 198 Q120 230 70 244 M190 198 Q230 214 290 220 M190 198 Q220 230 270 244 M170 198 L170 232" fill="none" stroke="#78350f" stroke-width="2.5"/>`;
    // stem and arms
    s += `<rect x="146" y="50" width="48" height="148" rx="22" fill="#4ade80" stroke="${GREEN}" stroke-width="2"/>`;
    s += `<path d="M146 130 L118 130 Q104 130 104 116 L104 86" fill="none" stroke="${GREEN}" stroke-width="18" stroke-linecap="round"/>`;
    s += `<path d="M194 110 L222 110 Q236 110 236 96 L236 72" fill="none" stroke="${GREEN}" stroke-width="18" stroke-linecap="round"/>`;
    // spines
    [[150, 70], [190, 84], [150, 112], [190, 150], [150, 168], [170, 58]].forEach(([x, y]) => {
      const d = x < 170 ? -9 : 9;
      s += `<line x1="${x}" y1="${y}" x2="${x + d}" y2="${y - 5}" stroke="${INK}" stroke-width="1.5"/>`;
    });
    s += txt(56, 40, 'A', { bold: 1, size: 18 }) + `<line x1="66" y1="44" x2="141" y2="68" stroke="${LINE}"/>` + txt(56, 58, 'spines', { size: 13 });
    s += txt(300, 142, 'B', { bold: 1, size: 18 }) + `<line x1="290" y1="144" x2="198" y2="150" stroke="${LINE}"/>` + txt(300, 162, 'thick stem', { size: 13 });
    s += txt(32, 176, 'C', { bold: 1, size: 18 }) + `<line x1="36" y1="186" x2="60" y2="216" stroke="${LINE}"/>` + txt(46, 177, 'roots', { size: 13, anchor: 'start' });
    return svg(360, 268, 'A cactus: A points to the spines, B to the thick green stem, C to the roots that spread wide just under the sand', s);
  })();

  // Line graph of two populations over six months.
  const GRAPH_BIRDS = (() => {
    const w = 360, h = 280, x0 = 56, y0 = 220, x1 = 300, top = 24, xmax = 6, ymax = 100;
    const X = (v) => x0 + (v / xmax) * (x1 - x0), Y = (v) => y0 - (v / ymax) * (y0 - top);
    let s = '';
    for (let v = 0; v <= ymax; v += 20) s += `<line x1="${x0}" y1="${Y(v)}" x2="${x1}" y2="${Y(v)}" stroke="#e5e7eb"/>` + txt(x0 - 8, Y(v), v, { anchor: 'end', size: 13 });
    for (let v = 0; v <= xmax; v += 1) s += txt(X(v), y0 + 15, v, { size: 13 });
    s += `<line x1="${x0}" y1="${top - 4}" x2="${x0}" y2="${y0}" stroke="${INK}" stroke-width="2"/><line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y0}" stroke="${INK}" stroke-width="2"/>`;
    const ins = [40, 60, 80, 85, 55, 35, 40], brd = [10, 12, 18, 28, 26, 16, 12];
    s += `<polyline points="${ins.map((v, i) => `${X(i)},${Y(v)}`).join(' ')}" fill="none" stroke="${BLUE}" stroke-width="2.5"/>`;
    ins.forEach((v, i) => { s += `<circle cx="${X(i)}" cy="${Y(v)}" r="4" fill="${BLUE}"/>`; });
    s += `<polyline points="${brd.map((v, i) => `${X(i)},${Y(v)}`).join(' ')}" fill="none" stroke="${ORANGE}" stroke-width="2.5" stroke-dasharray="7 4"/>`;
    brd.forEach((v, i) => { s += `<rect x="${X(i) - 4}" y="${Y(v) - 4}" width="8" height="8" fill="${ORANGE}"/>`; });
    s += txt(X(6) + 8, Y(40), 'insects', { size: 13, anchor: 'start', fill: BLUE });
    s += txt(X(6) + 8, Y(12), 'birds', { size: 13, anchor: 'start', fill: ORANGE });
    s += txt((x0 + x1) / 2, y0 + 42, 'Time (months)', { size: 13 });
    s += `<text x="16" y="${(top + y0) / 2}" font-family="Arial, Helvetica, sans-serif" font-size="13" fill="${INK}" text-anchor="middle" transform="rotate(-90 16 ${(top + y0) / 2})">Number of organisms</text>`;
    return svg(w, h, 'Line graph over 6 months. Insects: 40, 60, 80, 85, 55, 35, 40. Birds: 10, 12, 18, 28, 26, 16, 12', s);
  })();

  SCI.registerTopic({
    id: 'environment',
    title: 'Interactions within the Environment',
    emoji: '🌿',
    theme: 'Interactions',
    level: 'P6',
    moeRef: 'Interactions within the Environment (P6), MOE Primary Science Syllabus 2023: organisms, populations, communities and habitats; environmental factors (light, temperature, water, air) that affect the survival of organisms; food chains and food webs (producers, consumers, predators, prey) and the effect of a change in one population; decomposers; structural and behavioural adaptations; the impact of man on the environment (deforestation, pollution, conservation). Scope checked against school decks: Westspring Pri P6 Curriculum Briefing (Living Together; Food Chains and Food Webs; Adaptations; Man’s Impact on His Environment), Shuqun Pri P6 Science Handbook 2025, Admiralty Pri P6 Science Lesson Focus.',
    skills: {
      living: 'Living together',
      factors: 'Environmental factors',
      foodweb: 'Food chains and food webs',
      adapt: 'Adaptations',
      impact: 'Man’s impact',
      inquiry: 'Experiments and data'
    },
    misconceptions: {
      'pop-comm-mixup': 'Mixing up the words organism, population, community and habitat.',
      'stages-separate': 'Counting the young of an animal, such as tadpoles, as a different population from the adults of the same kind.',
      'nonliving-in-community': 'Counting non-living things such as rocks or water as part of a population or community.',
      'factor-missing': 'Leaving out one of the environmental factors (light, temperature, water, air) that affect living things.',
      'factor-mixup': 'Mixing up which environmental factor an experiment tests, or which one causes an effect.',
      'two-changes': 'Comparing two set-ups where more than one variable is different, so the cause of the result is unclear.',
      'conclusion-overreach': 'Drawing a conclusion the results do not support, or ignoring results that do not fit a pattern.',
      'graph-misread': 'Reading a value from the wrong row, column, line or point of a table or graph.',
      'arrow-direction': 'Reading a food-chain arrow the wrong way round, as “eats” instead of “is eaten by”.',
      'producer-mixup': 'Thinking an animal can be a producer, or that a producer gets its food by eating other organisms.',
      'decomposer-mixup': 'Thinking decomposers make their own food, hunt living animals, or start every food chain.',
      'herbivore-predator': 'Calling a plant-eater a predator; a predator hunts and eats other animals.',
      'predator-prey-mixup': 'Mixing up predator and prey, or thinking an organism can be only one of them.',
      'chain-count': 'Counting food chains wrongly, for example by counting arrows instead of complete paths from the producer to the end.',
      'effect-direction': 'Getting the direction of a population change wrong, for example thinking a predator increases when its food decreases.',
      'food-sources-miscount': 'Missing that an organism with two or more food sources can still feed when one of them is lost.',
      'sun-not-source': 'Thinking the energy in food chains does not come from the Sun.',
      'structural-behavioural-mixup': 'Mixing up structural adaptations (body parts and features) with behavioural adaptations (things an organism does).',
      'adapt-purpose-mixup': 'Matching an adaptation to the wrong job, such as thinking thick fur helps an animal breathe.',
      'adapt-on-purpose': 'Thinking an animal can grow a new body part during its life just because it needs one.',
      'impact-mixup': 'Mixing up harmful human activities with ones that conserve the environment.',
      'deforestation-trees-only': 'Thinking that cutting down a forest affects only the trees and not the animals that live there.'
    },
    notes: [
      { title: 'Living together',
        body: 'Organism: one living thing.\nPopulation: a group of organisms of the SAME kind living in the same place at the same time (all the guppies in a pond). Young and adults of the same kind, such as tadpoles and frogs, belong to the same population.\nCommunity: all the populations living together in one habitat.\nHabitat: the place where an organism lives (pond, field, mangrove swamp).' },
      { title: 'Environmental factors',
        body: 'Light, temperature, water and air (oxygen and carbon dioxide) are environmental factors. They affect where organisms live and how well they survive.\n- Plants need light to make food.\n- Many organisms survive only within a suitable range of temperature.\n- All organisms need water.\n- Most organisms need oxygen from the air or from the water.' },
      { title: 'Food chains',
        body: 'A food chain shows who eats whom. It always begins with a plant, the producer, which makes its own food using energy from sunlight. The animals are consumers: they cannot make their own food.\nThe arrow means “is eaten by”:\nrice plant → grasshopper → frog → snake\nsays the rice plant is eaten by the grasshopper, which is eaten by the frog, which is eaten by the snake.' },
      { title: 'Food webs',
        body: 'A food web is several food chains linked together. To count the food chains, start at each producer and follow every path along the arrows to an organism that is eaten by nothing else. A producer has no arrows pointing to it: it eats nothing.' },
      { title: 'Predators and prey',
        body: 'A predator hunts and eats other animals. Its prey is the animal it eats. An animal can be both: a frog is the predator of the grasshopper and the prey of the snake. A plant-eater, like a grasshopper, is a consumer but not a predator.' },
      { title: 'When a population changes',
        body: 'Follow the arrows one link at a time.\nFewer predators → fewer prey are eaten → the prey population increases (at first).\nLess food → the eaters have less food → their population decreases.\nIf an animal has another food source, it may eat more of that one instead, so that population can decrease.' },
      { title: 'Decomposers',
        body: 'Decomposers, such as some fungi (mushrooms) and bacteria, break down dead plants and animals. This returns nutrients to the soil, which plants then use. Without decomposers, dead matter would pile up.' },
      { title: 'Adaptations',
        body: 'An adaptation is a feature or behaviour that helps an organism survive in its habitat.\nStructural: a body part or feature (webbed feet, thick fur, a cactus’s spines).\nBehavioural: something the organism does (hunting at night, staying in a burrow in the heat, playing dead).\nAdaptations help organisms obtain food, escape predators, breathe, and survive very hot or very cold places.' },
      { title: 'Man’s impact',
        body: 'Harmful: deforestation (clearing forests destroys habitats and food), pollution of air, water and land (oil spills, factory waste, litter), overfishing and hunting.\nConserving: replanting trees, nature reserves such as Sungei Buloh, treating waste water, reducing, reusing and recycling, saving electricity and water.' }
    ],
    items: [
      // ----- Living together -----
      { id: 'env-001', type: 'mcq', level: 1, syl: 'P6', skill: 'living',
        stem: 'All the guppies of the same kind living in a pond at the same time form a ________.',
        figure: null,
        options: ['community', 'habitat', 'food chain', 'population'],
        answer: 3,
        miscon: { 0: 'pop-comm-mixup', 1: 'pop-comm-mixup', 2: 'pop-comm-mixup' },
        optionFeedback: {
          0: 'A community is ALL the different populations in the pond together. Here we have only one kind of organism.',
          1: 'The pond is the habitat, the place where the guppies live. The guppies themselves form something else.',
          2: 'A food chain shows who eats whom. One kind of organism on its own is not a food chain.' },
        explain: 'A population is a group of organisms of the same kind living in the same place at the same time.' },
      { id: 'env-002', type: 'mcq', level: 1, syl: 'P6', skill: 'living',
        stem: 'What is a habitat?',
        figure: null,
        options: ['The place where an organism lives', 'All the organisms of one kind in a place', 'All the populations living together in one place', 'The food that an organism eats'],
        answer: 0,
        miscon: { 1: 'pop-comm-mixup', 2: 'pop-comm-mixup', 3: 'pop-comm-mixup' },
        optionFeedback: {
          1: 'That describes a population. A habitat is a place, not a group of organisms.',
          2: 'That describes a community. Which choice describes a place?',
          3: 'Food is something an organism needs, but a habitat is where it lives.' },
        explain: 'A habitat is the place where an organism lives, such as a pond, a field or a mangrove swamp.' },
      { id: 'env-003', type: 'mcq', level: 3, syl: 'P6', skill: 'living',
        stem: 'A class recorded the organisms they found in a pond, as shown in the table. How many populations are shown in the table?',
        figure: TBL_POND,
        options: ['2', '3', '4', '5'],
        answer: 2,
        miscon: { 0: 'pop-comm-mixup', 1: 'pop-comm-mixup', 3: 'stages-separate' },
        technique: 'Count, then check',
        steps: ['A population is all the organisms of ONE kind.', 'Are the adult frogs and the tadpoles the same kind?', 'Count the different kinds, then check you have not counted one kind twice.'],
        optionFeedback: {
          0: 'A population is one kind of organism, and the table shows more kinds than two. Count each kind once.',
          1: 'Count each different kind once. Is the water lily a living thing in the pond too?',
          3: 'The tadpoles are the young of the same kind of frog, so the frogs and tadpoles are one population.' },
        explain: 'Water lilies, guppies, frogs (adults and tadpoles together) and dragonflies: 4 populations. Tadpoles are young frogs of the same kind, so they belong to the frog population.' },
      { id: 'env-004', type: 'mcq', level: 2, syl: 'P6', skill: 'living',
        stem: 'Look at the pond survey in the table. Which of these is the community in the pond?',
        figure: TBL_POND,
        options: ['Only the guppies', 'Only the animals', 'All the populations living in the pond', 'All the populations, the rocks and the water'],
        answer: 2,
        miscon: { 0: 'pop-comm-mixup', 1: 'pop-comm-mixup', 3: 'nonliving-in-community' },
        optionFeedback: {
          0: 'The guppies on their own are one population. A community has many populations.',
          1: 'The water lilies live in the pond too. A community includes plants as well as animals.',
          3: 'Rocks and water are non-living. A community is made up of living things only.' },
        explain: 'A community is all the populations of living things in a habitat: here the water lilies, guppies, frogs and dragonflies.' },

      // ----- Environmental factors -----
      { id: 'env-005', type: 'mcq', level: 2, syl: 'P6', skill: 'factors',
        stem: 'Which of these are environmental factors that can affect the organisms in a habitat?\nA: light\nB: temperature\nC: water\nD: air',
        figure: null,
        options: ['A and B only', 'A, B and C only', 'B, C and D only', 'A, B, C and D'],
        answer: 3,
        miscon: { 0: 'factor-missing', 1: 'factor-missing', 2: 'factor-missing' },
        technique: 'Tick or cross',
        steps: ['I take one factor at a time.', 'Does it change how well organisms survive in a place?', 'Tick it if yes.', 'I choose the option with only the ticks.'],
        optionFeedback: {
          0: 'Light and temperature are right. Can organisms survive without water or air?',
          1: 'Light, temperature and water are right. Most organisms also need oxygen from the air.',
          2: 'Temperature, water and air are right. Plants need light to make food, so light matters too.' },
        explain: 'Light, temperature, water and air are all environmental factors that affect the survival of organisms.' },
      { id: 'env-006', type: 'mcq', level: 2, syl: 'P6', skill: 'factors',
        stem: 'Ravi placed 20 woodlice at the centre of a tray with four sections, W, X, Y and Z. After 15 minutes he counted the woodlice in each section. Which conditions did the woodlice prefer?',
        figure: FIG_WOODLICE,
        options: ['Light and dry', 'Light and damp', 'Dark and dry', 'Dark and damp'],
        answer: 3,
        miscon: { 0: 'graph-misread', 1: 'graph-misread', 2: 'graph-misread' },
        technique: 'Read, compare, conclude',
        steps: ['Read: how many woodlice are in each section?', 'Compare: which section has the most?', 'Conclude: what are the conditions in that section?'],
        optionFeedback: {
          0: 'Section W (light and dry) had the FEWEST woodlice. Look for the most.',
          1: 'Section X had only 3. Which section had the most woodlice?',
          2: 'Section Y had 4. One section had many more than that.' },
        explain: 'Most woodlice (12) moved to Z, which is dark and damp. The woodlice prefer dark and damp places.' },
      { id: 'env-007', type: 'mcq', level: 3, syl: 'P6', skill: 'inquiry',
        stem: 'Look at Ravi’s tray again. He wants to find out ONLY whether light affects where the woodlice go. Which two sections should he compare?',
        figure: FIG_WOODLICE,
        options: ['W (light, dry) and Z (dark, damp)', 'X (light, damp) and Z (dark, damp)', 'W (light, dry) and X (light, damp)', 'Y (dark, dry) and Z (dark, damp)'],
        answer: 1,
        miscon: { 0: 'two-changes', 2: 'factor-mixup', 3: 'factor-mixup' },
        technique: 'Change one thing',
        steps: ['What should be different between the two sections? Only the light.', 'Everything else, like how damp it is, must be the same.', 'Find the pair that differs in light only.'],
        optionFeedback: {
          0: 'W and Z differ in light AND in dampness, so he could not tell which one made the difference.',
          2: 'W and X are both light. They differ in dampness, so they test water, not light.',
          3: 'Y and Z are both dark. They differ in dampness, so they test water, not light.' },
        explain: 'X and Z are both damp; only the light is different. (W and Y, both dry, would also work.)' },
      { id: 'env-008', type: 'mcq', level: 2, syl: 'P6', skill: 'factors',
        stem: 'Mei put 20 seeds of the same kind in each of four dishes. Each dish had the same amount of water and air, and was kept at a different temperature. What can she conclude from her results?',
        figure: TBL_SEEDS,
        options: ['Seeds need light to germinate.', 'The higher the temperature, the more seeds germinate.', 'Seeds germinate best at 5 °C.', 'Temperature affects whether the seeds germinate.'],
        answer: 3,
        miscon: { 0: 'factor-mixup', 1: 'conclusion-overreach', 2: 'graph-misread' },
        technique: 'Read, compare, conclude',
        steps: ['Read: what did she change? The temperature.', 'Compare the numbers at each temperature.', 'Conclude only what the results show.'],
        optionFeedback: {
          0: 'Light was not changed in this experiment, so she cannot conclude anything about light.',
          1: 'At 60 °C no seeds germinated, so a higher temperature is not always better.',
          2: 'At 5 °C NO seeds germinated. Read the row again.' },
        explain: 'The number of seeds that germinated changed with the temperature (0, 18, 15, 0), so temperature affects germination. Very low and very high temperatures stopped it.' },

      // ----- Food chains and food webs -----
      { id: 'env-009', type: 'mcq', level: 1, syl: 'P6', skill: 'foodweb',
        stem: 'In the food chain “grass → grasshopper”, the arrow means “is eaten by”. What does this food chain tell us?',
        figure: null,
        options: ['The grasshopper is eaten by the grass.', 'The grass is eaten by the grasshopper.', 'The grass and the grasshopper live in different places.', 'The grass eats the grasshopper.'],
        answer: 1,
        miscon: { 0: 'arrow-direction', 2: 'pop-comm-mixup', 3: 'arrow-direction' },
        technique: 'Follow the arrows',
        steps: ['Read the arrow as “is eaten by”.', 'Start at the tail of the arrow: grass.', 'Say it: grass is eaten by grasshopper.'],
        optionFeedback: {
          0: 'Read from the tail of the arrow to its head: grass, then “is eaten by”, then grasshopper.',
          2: 'A food chain shows who eats whom, so they share a habitat.',
          3: 'Grass is a plant that makes its own food; it does not eat animals. Read the arrow as “is eaten by”.' },
        explain: 'The arrow points from the food to the eater: the grass is eaten by the grasshopper.' },
      { id: 'env-010', type: 'mcq', level: 1, syl: 'P6', skill: 'foodweb',
        stem: 'Every food chain begins with a producer. What is a producer?',
        figure: null,
        options: ['An animal that hunts other animals', 'An organism that breaks down dead things', 'A plant, which makes its own food', 'An animal that eats only plants'],
        answer: 2,
        miscon: { 0: 'producer-mixup', 1: 'decomposer-mixup', 3: 'producer-mixup' },
        optionFeedback: {
          0: 'That is a predator. A producer does not need to eat other organisms.',
          1: 'That is a decomposer. A producer makes something.',
          3: 'A plant-eater is a consumer: it gets food by eating. A producer makes its own food.' },
        explain: 'A producer is a plant. It makes its own food using energy from sunlight, so it starts every food chain.' },
      { id: 'env-011', type: 'mcq', level: 2, syl: 'P6', skill: 'foodweb',
        stem: ARROW + ' Which organism in this food chain is both a predator and prey?',
        figure: CHAIN_RICE,
        options: ['rice plant', 'grasshopper', 'frog', 'snake'],
        answer: 2,
        miscon: { 0: 'producer-mixup', 1: 'herbivore-predator', 3: 'predator-prey-mixup' },
        technique: 'Follow the arrows',
        steps: ['A predator eats another animal: an arrow from an animal points to it.', 'A prey is eaten by an animal: an arrow leaves it to an animal.', 'Find the one with both.'],
        optionFeedback: {
          0: 'The rice plant is the producer. It does not hunt anything.',
          1: 'The grasshopper is prey for the frog, but it eats a plant, so it is not a predator.',
          3: 'No arrow leaves the snake, so nothing here eats it. It is a predator only.' },
        explain: 'The frog hunts the grasshopper (predator) and is eaten by the snake (prey).' },
      { id: 'env-012', type: 'mcq', level: 2, syl: 'P6', skill: 'foodweb',
        stem: ARROW + ' How many food chains are there in this food web in a field?',
        figure: WEB_FIELD,
        options: ['2', '3', '4', '7'],
        answer: 1,
        miscon: { 0: 'chain-count', 2: 'chain-count', 3: 'chain-count' },
        technique: 'Count, then check',
        steps: ['Start at the producer: grass.', 'Follow every path along the arrows until it ends at the snake.', 'Count the paths, then trace each one again to check.'],
        optionFeedback: {
          0: 'Grass → grasshopper → bird → snake is easy to miss. Trace every path from the grass.',
          2: 'Trace each path from the grass to the snake once only. Did you count one twice?',
          3: 'There are 7 arrows, but a food chain is a whole path from the grass to the end, not one arrow.' },
        explain: 'Grass → grasshopper → frog → snake; grass → grasshopper → bird → snake; grass → caterpillar → bird → snake. That is 3 food chains.' },
      { id: 'env-013', type: 'mcq', level: 3, syl: 'P6', skill: 'foodweb',
        stem: ARROW + ' Which statements about this food web are correct?\nA: The snake has two kinds of food.\nB: The grasshopper is eaten by two kinds of animals.\nC: The caterpillar eats the bird.\nD: The grass is the producer.',
        figure: WEB_FIELD,
        options: ['A and D only', 'A, B and D only', 'B and C only', 'A, B, C and D'],
        answer: 1,
        miscon: { 0: 'arrow-direction', 2: 'arrow-direction', 3: 'arrow-direction' },
        technique: 'Tick or cross',
        steps: ['Read each arrow as “is eaten by”.', 'Check each statement against the arrows.', 'Tick or cross each one.', 'I choose the option with only the ticks.'],
        optionFeedback: {
          0: 'A and D are right. Count the arrows leaving the grasshopper: they go to the frog and the bird.',
          2: 'B is right. For C, the arrow goes from the caterpillar to the bird: the caterpillar is eaten BY the bird.',
          3: 'C reads the arrow backwards. The caterpillar is eaten by the bird.' },
        explain: 'A: the snake eats frogs and birds. B: the grasshopper is eaten by the frog and the bird. D: grass is the producer. C is backwards: the bird eats the caterpillar.' },
      { id: 'env-014', type: 'mcq', level: 3, syl: 'P6', skill: 'foodweb',
        stem: ARROW + ' This is a food web in a pond. Suddenly, most of the small fish die. What is most likely to happen at first?',
        figure: WEB_POND,
        options: ['The kingfishers and big fish increase.', 'The water fleas and tadpoles increase.', 'The algae increase and the water fleas decrease.', 'The kingfishers increase and the tadpoles decrease.'],
        answer: 1,
        miscon: { 0: 'effect-direction', 2: 'effect-direction', 3: 'effect-direction' },
        technique: 'Follow the arrows',
        steps: ['Who eats the small fish? Who is eaten by the small fish?', 'Fewer small fish: what happens to their food?', 'Fewer small fish: what happens to the animals that eat them?'],
        optionFeedback: {
          0: 'The kingfishers and big fish EAT small fish. With fewer small fish, they have less food.',
          2: 'The water fleas are eaten by small fish. Fewer small fish means fewer water fleas are eaten.',
          3: 'The kingfishers lose their only food here, and the tadpoles are eaten less. Follow each arrow again.' },
        explain: 'Fewer small fish → fewer water fleas and tadpoles are eaten → they increase at first. (The kingfishers and big fish would decrease, because they have less food.)' },
      { id: 'env-015', type: 'mcq', level: 2, syl: 'P6', skill: 'foodweb',
        stem: ARROW + ' Which organism in this food web is most likely a plant?',
        figure: WEB_LETTERS,
        options: ['P', 'C', 'D', 'E'],
        answer: 0,
        miscon: { 1: 'producer-mixup', 2: 'producer-mixup', 3: 'arrow-direction' },
        technique: 'Follow the arrows',
        steps: ['A plant makes its own food, so it eats nothing.', 'Which organism has NO arrows pointing to it?', 'That one is the producer.'],
        optionFeedback: {
          1: 'Arrows point to C from A and B, so C eats them. A plant eats nothing.',
          2: 'An arrow points to D from B, so D eats B. A plant eats nothing.',
          3: 'E is eaten by nothing, but it EATS C and D. Look for the one that eats nothing.' },
        explain: 'P has no arrows pointing to it, so it eats nothing. It is the producer, most likely a plant.' },
      { id: 'env-016', type: 'mcq', level: 3, syl: 'P6', skill: 'foodweb',
        stem: ARROW + ' P is a plant. Which organisms are both predators and prey?',
        figure: WEB_LETTERS,
        options: ['A and B only', 'E only', 'C and D only', 'A, B, C and D'],
        answer: 2,
        miscon: { 0: 'herbivore-predator', 1: 'predator-prey-mixup', 3: 'herbivore-predator' },
        technique: 'Follow the arrows',
        steps: ['A predator eats other ANIMALS. Which organisms eat A or B?', 'Which of those are also eaten by another animal?', 'Remember: eating the plant P does not make an animal a predator.'],
        optionFeedback: {
          0: 'A and B eat the plant P, so they are prey but not predators.',
          1: 'Nothing eats E, so E is a predator only, not prey.',
          3: 'C and D are right. A and B only eat the plant, so they are not predators.' },
        explain: 'C eats A and B and is eaten by E. D eats B and is eaten by E. So C and D are both predators and prey.' },
      { id: 'env-017', type: 'mcq', level: 3, syl: 'P6', skill: 'foodweb',
        stem: ARROW + ' All of organism B die out. Which organism loses ALL of its food?',
        figure: WEB_LETTERS,
        options: ['A', 'C', 'D', 'E'],
        answer: 2,
        miscon: { 0: 'arrow-direction', 1: 'food-sources-miscount', 3: 'food-sources-miscount' },
        technique: 'Follow the arrows',
        steps: ['Which organisms have an arrow coming FROM B? They eat B.', 'For each one, does it have any other arrow pointing to it?', 'The one with no other food loses all its food.'],
        optionFeedback: {
          0: 'A eats the plant P, not B. Look at the arrows that leave B.',
          1: 'C eats B, but C also eats A, so it still has food.',
          3: 'E eats C and D, not B. It would still have C to eat.' },
        explain: 'Only D and C eat B. C can still eat A, but D eats only B, so D loses all of its food.' },
      { id: 'env-018', type: 'mcq', level: 2, syl: 'P6', skill: 'foodweb',
        stem: ARROW + ' This is a food web in a mangrove swamp at Sungei Buloh. How many producers are there?',
        figure: WEB_MANGROVE,
        options: ['1', '2', '3', '4'],
        answer: 1,
        miscon: { 0: 'producer-mixup', 2: 'producer-mixup', 3: 'chain-count' },
        technique: 'Count, then check',
        steps: ['A producer has no arrows pointing to it.', 'Look along the bottom row.', 'Count them, then check none of the animals has been counted.'],
        optionFeedback: {
          0: 'There are TWO organisms with no arrows pointing to them. Look along the bottom row.',
          2: 'The crab eats mangrove leaves, so it is a consumer, not a producer.',
          3: 'There are 4 food chains here, but the question asks for producers only.' },
        explain: 'The mangrove leaves and the algae have no arrows pointing to them. They make their own food: 2 producers.' },
      { id: 'env-019', type: 'mcq', level: 1, syl: 'P6', skill: 'foodweb',
        stem: 'What do decomposers, such as some fungi and bacteria, do?',
        figure: null,
        options: ['They break down dead plants and animals.', 'They make their own food from sunlight.', 'They hunt and eat living animals.', 'They are the first organism in every food chain.'],
        answer: 0,
        miscon: { 1: 'decomposer-mixup', 2: 'decomposer-mixup', 3: 'decomposer-mixup' },
        optionFeedback: {
          1: 'That is what green plants do. Decomposers feed on something else.',
          2: 'That is what predators do. Decomposers feed on things that are no longer alive.',
          3: 'Every food chain starts with a producer, a plant.' },
        explain: 'Decomposers break down dead plants and animals, returning nutrients to the soil for plants to use.' },

      // ----- Adaptations -----
      { id: 'env-020', type: 'mcq', level: 1, syl: 'P6', skill: 'adapt',
        stem: 'A polar bear has thick fur and a thick layer of fat under its skin. How do these help it survive?',
        figure: null,
        options: ['They help it breathe under water.', 'They help it make its own food.', 'They help it find water to drink.', 'They help it keep warm in a very cold place.'],
        answer: 3,
        miscon: { 0: 'adapt-purpose-mixup', 1: 'producer-mixup', 2: 'adapt-purpose-mixup' },
        optionFeedback: {
          0: 'Fur and fat do not help with breathing. Think about where polar bears live.',
          1: 'Only plants make their own food. Think about the cold.',
          2: 'Fur and fat are about heat, not water. Where does a polar bear live?' },
        explain: 'Thick fur and fat reduce heat loss, so the polar bear keeps warm in the freezing Arctic.' },
      { id: 'env-021', type: 'mcq', level: 2, syl: 'P6', skill: 'adapt',
        stem: 'Which of these is a behavioural adaptation?',
        figure: null,
        options: ['A duck has webbed feet.', 'A cactus has spines.', 'An owl hunts at night, when its prey is active.', 'A fish has gills.'],
        answer: 2,
        miscon: { 0: 'structural-behavioural-mixup', 1: 'structural-behavioural-mixup', 3: 'structural-behavioural-mixup' },
        technique: 'Tick or cross',
        steps: ['Is it a body part, or something the organism does?', 'A body part is structural.', 'Something it does is behavioural.'],
        optionFeedback: {
          0: 'Webbed feet are a body part, so this is a structural adaptation.',
          1: 'Spines are part of the cactus’s body, so this is structural.',
          3: 'Gills are a body part, so this is structural.' },
        explain: 'Hunting at night is something the owl DOES, so it is a behavioural adaptation. The others are body parts (structural).' },
      { id: 'env-022', type: 'mcq', level: 2, syl: 'P6', skill: 'adapt',
        stem: 'The diagram shows a cactus that lives in a hot, dry desert. Which part helps the cactus to reduce water loss?',
        figure: FIG_CACTUS,
        options: ['A', 'B', 'C', 'B and C'],
        answer: 0,
        miscon: { 1: 'adapt-purpose-mixup', 2: 'adapt-purpose-mixup', 3: 'adapt-purpose-mixup' },
        technique: 'Claim, evidence, reason',
        steps: ['What is each part’s job?', 'Which part is a leaf that has become thin and small?', 'A smaller leaf surface loses less water.'],
        optionFeedback: {
          1: 'The thick stem STORES water. The question asks which part cuts down water loss.',
          2: 'The roots TAKE IN water. The question asks which part cuts down water loss.',
          3: 'B stores water and C takes in water. Neither of those reduces loss.' },
        explain: 'The spines (A) are leaves that are thin and small, so very little water is lost from them.' },
      { id: 'env-023', type: 'mcq', level: 3, syl: 'P6', skill: 'adapt',
        stem: 'Which of these adaptations help an animal to protect itself from its predators?\nA: A stick insect looks like a twig.\nB: A porcupine has sharp quills.\nC: A camel can drink a lot of water at one time.\nD: An octopus squirts ink when it is attacked.',
        figure: null,
        options: ['A and D only', 'B and C only', 'A, B, C and D', 'A, B and D only'],
        answer: 3,
        miscon: { 0: 'adapt-purpose-mixup', 1: 'adapt-purpose-mixup', 2: 'adapt-purpose-mixup' },
        technique: 'Tick or cross',
        steps: ['For each one, ask: does it protect the animal from being eaten?', 'Tick if yes. Cross if it helps with something else.', 'I choose the option with only the ticks.'],
        optionFeedback: {
          0: 'A and D are right. Sharp quills (B) also protect a porcupine, because they hurt predators that attack.',
          1: 'B is right. Drinking a lot (C) helps a camel survive in the desert, not protect itself from predators.',
          2: 'C helps the camel survive in a dry place, not protect itself from predators.' },
        explain: 'A (looks like a twig, so it is hard to see), B (quills hurt predators) and D (ink hides its escape) protect against predators. C helps the camel survive without water.' },
      { id: 'env-024', type: 'mcq', level: 2, syl: 'P6', skill: 'adapt',
        stem: 'A fennec fox lives in the desert. It stays in its cool burrow during the hot day and comes out at night. How does this help it survive?',
        figure: null,
        options: ['It avoids the extreme heat of the day.', 'It finds more water in the sunlight.', 'It grows thicker fur in its burrow.', 'It makes food in its burrow.'],
        answer: 0,
        miscon: { 1: 'adapt-purpose-mixup', 2: 'adapt-on-purpose', 3: 'producer-mixup' },
        optionFeedback: {
          1: 'The fox stays OUT of the sun in the day. Think about the temperature.',
          2: 'Staying in a burrow does not make fur grow. Think about what the hot sun would do.',
          3: 'Animals cannot make their own food. Think about the temperature outside.' },
        explain: 'This behavioural adaptation keeps the fox out of the extreme daytime heat, so it does not overheat or lose too much water.' },
      { id: 'env-025', type: 'mcq', level: 2, syl: 'P6', skill: 'adapt',
        stem: 'A mosquito larva lives in water. It has a breathing tube at one end of its body, which it pokes above the water surface. How does the breathing tube help it survive?',
        figure: null,
        options: ['It catches food at the water surface.', 'It keeps the larva warm.', 'It hides the larva from fish.', 'It lets the larva take in air from above the water.'],
        answer: 3,
        miscon: { 0: 'adapt-purpose-mixup', 1: 'adapt-purpose-mixup', 2: 'adapt-purpose-mixup' },
        optionFeedback: {
          0: 'Look at its name: a BREATHING tube. What is it for?',
          1: 'The tube is not about keeping warm. Read its name again.',
          2: 'The tube sticks out of the water, so it would not hide the larva.' },
        explain: 'The breathing tube reaches the air above the water, so the larva can take in air (oxygen) to breathe.' },

      // ----- Man's impact -----
      { id: 'env-026', type: 'mcq', level: 1, syl: 'P6', skill: 'impact',
        stem: 'Which of these is an example of deforestation?',
        figure: null,
        options: ['Clearing a large area of forest to build houses', 'Planting trees in a park', 'Picking up litter at a beach', 'Building a pond in a garden'],
        answer: 0,
        miscon: { 1: 'impact-mixup', 2: 'impact-mixup', 3: 'impact-mixup' },
        optionFeedback: {
          1: 'Planting trees is the opposite: it helps conserve the environment.',
          2: 'Picking up litter helps reduce pollution. Deforestation is about forests.',
          3: 'A garden pond does not remove a forest. Look for the choice about cutting down trees.' },
        explain: 'Deforestation is the clearing of forests, such as cutting down trees to build houses, roads or farms.' },
      { id: 'env-027', type: 'mcq', level: 2, syl: 'P6', skill: 'impact',
        stem: 'Which of these help to conserve the environment?\nA: Reusing plastic bags\nB: Switching off lights when they are not needed\nC: Burning rubbish in the open\nD: Setting up nature reserves such as Sungei Buloh',
        figure: null,
        options: ['A and B only', 'C and D only', 'A, B and D only', 'A, B, C and D'],
        answer: 2,
        miscon: { 0: 'impact-mixup', 1: 'impact-mixup', 3: 'impact-mixup' },
        technique: 'Tick or cross',
        steps: ['For each one, ask: does it protect the environment or harm it?', 'Tick if it protects. Cross if it pollutes or wastes.', 'I choose the option with only the ticks.'],
        optionFeedback: {
          0: 'A and B are right. A nature reserve (D) protects habitats too.',
          1: 'D is right, but burning rubbish in the open (C) pollutes the air.',
          3: 'Burning rubbish in the open (C) gives out smoke that pollutes the air.' },
        explain: 'A (less waste), B (saves electricity) and D (protects habitats) conserve the environment. C pollutes the air.' },
      { id: 'env-028', type: 'mcq', level: 2, syl: 'P6', skill: 'impact',
        stem: 'Scientists counted the fish and measured the oxygen in a river at three places, W, X and Y. A factory releases its waste into the river through a pipe just before X. Which statement best explains the results?',
        figure: TBL_RIVER,
        options: ['Waste from the factory harmed the fish near X.', 'Fish prefer water with less oxygen.', 'The water at X is cleaner than at W.', 'The river at X has the most fish.'],
        answer: 0,
        miscon: { 1: 'conclusion-overreach', 2: 'graph-misread', 3: 'graph-misread' },
        technique: 'Read, compare, conclude',
        steps: ['Read: where are the fewest fish, and the least oxygen?', 'Compare that place with the others.', 'Conclude: what is different about that place?'],
        optionFeedback: {
          1: 'At X there is the least oxygen AND the fewest fish. The fish are not choosing it.',
          2: 'X has the least oxygen and the fewest fish, so it is not cleaner than W.',
          3: 'X has only 3 fish, the fewest. Read the last column again.' },
        explain: 'Just after the waste pipe (X) there is the least oxygen and the fewest fish. Further away (Y) the river recovers a little. The waste polluted the water and harmed the fish.' },

      // ----- Open-ended -----
      { id: 'env-029', type: 'oeq', level: 1, marks: 2, syl: 'P6', skill: 'living',
        stem: 'State the difference between a population and a community. Use a pond as your example.',
        figure: null,
        model: 'A population is a group of organisms of one kind living in a place at the same time, such as all the guppies in the pond. A community is all the populations living together in the pond, such as the guppies, water lilies and frogs.',
        keys: [['one kind', 'same kind', 'single kind'], ['all the populations', 'different populations', 'many populations', 'different kinds']],
        watchFor: ['pop-comm-mixup', 'nonliving-in-community'],
        technique: 'Claim, evidence, reason',
        steps: ['Say what a population is, with one pond example.', 'Say what a community is, with pond examples.', 'Make the difference clear: one kind or many kinds?'],
        explain: 'A population has organisms of only one kind; a community is made of all the different populations in a habitat.' },
      { id: 'env-030', type: 'oeq', level: 2, marks: 3, syl: 'P6', skill: 'foodweb', chain: true,
        stem: ARROW + ' All the frogs in the field are caught. Explain how this would affect the amount of grass at first.',
        figure: WEB_FIELD,
        model: 'With no frogs, fewer grasshoppers are eaten. So the grasshopper population increases. More grass is eaten by the grasshoppers, so there will be less grass.',
        keys: [['fewer grasshoppers are eaten', 'fewer grasshoppers eaten', 'grasshoppers are not eaten'], ['grasshopper population increases', 'more grasshoppers', 'grasshoppers increase'], ['more grass is eaten', 'more grass eaten', 'eat more grass'], ['less grass', 'grass decreases']],
        watchFor: ['effect-direction', 'arrow-direction'],
        technique: 'Follow the arrows',
        steps: ['What did the frogs eat?', 'With no frogs, what happens to that animal’s population?', 'What does that animal eat?', 'So what happens to the grass?'],
        explain: 'In order: no frogs → fewer grasshoppers eaten → more grasshoppers → more grass eaten → less grass.' },
      { id: 'env-031', type: 'oeq', level: 2, marks: 2, syl: 'P6', skill: 'foodweb', chain: true,
        stem: ARROW + ' The number of small fish in the pond decreases. Explain why the number of kingfishers would also decrease.',
        figure: WEB_POND,
        model: 'Small fish are the only food of the kingfisher in this food web. With fewer small fish, the kingfishers have less food, so fewer of them survive.',
        keys: [['only food', 'only food source', 'only thing it eats'], ['less food', 'not enough food', 'fewer of them survive']],
        watchFor: ['effect-direction', 'food-sources-miscount'],
        technique: 'Follow the arrows',
        steps: ['Which arrows point to the kingfisher?', 'Does the kingfisher have any other food?', 'Less food: what happens to the kingfishers?'],
        explain: 'In order: small fish are its only food → less food → fewer kingfishers survive.' },
      { id: 'env-032', type: 'oeq', level: 2, marks: 2, syl: 'P6', skill: 'foodweb',
        stem: ARROW + ' Look at the mangrove food web.\n(a) How many food chains are there?\n(b) Name ONE organism that is eaten by both the heron and the monitor lizard.',
        figure: WEB_MANGROVE,
        model: '(a) There are four food chains. (b) The crab (the mudskipper is also correct).',
        keys: [['four', '4'], ['crab', 'mudskipper']],
        watchFor: ['chain-count', 'arrow-direction'],
        technique: 'Count, then check',
        steps: ['Start at each producer in turn.', 'Follow every path along the arrows to the end.', 'For (b), find an organism with arrows to BOTH the heron and the monitor lizard.'],
        explain: '(a) leaves → crab → heron; leaves → crab → monitor lizard; algae → mudskipper → heron; algae → mudskipper → monitor lizard. (b) Both the crab and the mudskipper are eaten by both.' },
      { id: 'env-033', type: 'oeq', level: 3, marks: 3, syl: 'P6', skill: 'foodweb', chain: true,
        stem: ARROW + ' A disease kills most of the mudskippers in the mangrove. Explain how this could affect the number of crabs at first.',
        figure: WEB_MANGROVE,
        model: 'The herons and monitor lizards have less food, so they eat more crabs instead. More crabs are eaten, so the crab population decreases.',
        keys: [['less food', 'less to eat', 'lose some of their food'], ['eat more crabs', 'more crabs are eaten', 'more crabs eaten'], ['crab population decreases', 'fewer crabs', 'crabs decrease', 'number of crabs decreases']],
        watchFor: ['effect-direction', 'food-sources-miscount'],
        technique: 'Follow the arrows',
        steps: ['Who ate the mudskippers?', 'What else do those animals eat?', 'With fewer mudskippers, what will they eat more of?', 'So what happens to the crabs?'],
        explain: 'In order: the herons and monitor lizards have less food → they eat more crabs → the crab population decreases.' },
      { id: 'env-034', type: 'oeq', level: 2, marks: 2, syl: 'P6', skill: 'foodweb',
        stem: 'Explain why every food chain begins with a plant.',
        figure: null,
        model: 'Plants are producers: they make their own food using energy from sunlight. Animals cannot make their own food, so they all depend on plants, directly or by eating other animals that ate plants.',
        keys: [['make their own food', 'produce their own food', 'make food'], ['cannot make their own food', 'depend on plants', 'animals need to eat']],
        watchFor: ['producer-mixup', 'sun-not-source'],
        technique: 'Claim, evidence, reason',
        steps: ['What can a plant do that an animal cannot?', 'What must every animal do to get food?', 'So where must every food chain start?'],
        explain: 'Plants make food; animals must eat. All the food (and energy) in a chain starts with the plant.' },
      { id: 'env-035', type: 'oeq', level: 2, marks: 2, syl: 'P6', skill: 'factors', chain: true,
        stem: 'In a rainforest, the tall trees block most of the sunlight. Explain why very few small plants grow on the forest floor.',
        figure: null,
        model: 'Little light reaches the forest floor. Plants need light to make food, so the small plants there cannot make enough food to grow.',
        keys: [['little light', 'less light', 'not enough light', 'very little light'], ['make food', 'make enough food', 'photosynthesis']],
        watchFor: ['factor-mixup'],
        technique: 'Follow the arrows',
        steps: ['How much light reaches the ground?', 'What do plants need light for?', 'Without enough of it, can they grow well?'],
        explain: 'In order: little light reaches the floor → plants cannot make enough food → few can grow.' },
      { id: 'env-036', type: 'oeq', level: 3, marks: 5, syl: 'P6', skill: 'inquiry',
        stem: 'Look at Ravi’s woodlice experiment.\n(a) Which conditions did the woodlice prefer? [1]\n(b) Ravi used 20 woodlice instead of just 1. Explain why. [2]\n(c) A garden has a pile of dead leaves and an open lawn. Where would Ravi most likely find woodlice? Explain using the results. [2]',
        figure: FIG_WOODLICE,
        model: '(a) Dark and damp conditions. (b) Using many woodlice makes the results more reliable, because one woodlouse might move to a section by chance. (c) Under the pile of dead leaves. The leaves block light, so it is darker there, and they keep the ground moist, so it is damper. The woodlice preferred dark, damp places.',
        keys: [['dark and damp'], ['more reliable', 'reliable'], ['by chance', 'behave differently', 'one woodlouse might'], ['block light', 'darker', 'less light', 'shade'], ['keep the ground moist', 'damper', 'moist', 'wetter']],
        watchFor: ['graph-misread', 'conclusion-overreach'],
        technique: 'Read, compare, conclude',
        steps: ['(a) Find the section with the most woodlice.', '(b) What could go wrong if you watched only one animal?', '(c) Which place in the garden is more like that section? Say why.'],
        explain: '(a) Section Z (dark, damp) had 12 of the 20. (b) One woodlouse could wander anywhere by chance; many give a reliable pattern. (c) Dead leaves give shade and keep the ground damp.' },
      { id: 'env-037', type: 'oeq', level: 2, marks: 3, syl: 'P6', skill: 'factors',
        stem: 'Look at Mei’s seed results. Explain why no seeds germinated at 5 °C and at 60 °C, even though they had water and air.',
        figure: TBL_SEEDS,
        model: 'At 5 °C the temperature was too low, and at 60 °C it was too high, for the seeds to germinate. Seeds need a suitable temperature, as well as water and air, to germinate.',
        keys: [['too low', 'too cold'], ['too high', 'too hot', 'killed', 'kills the seeds', 'damaged'], ['suitable temperature', 'right temperature', 'correct temperature', 'warm enough']],
        watchFor: ['factor-mixup', 'conclusion-overreach'],
        technique: 'Read, compare, conclude',
        steps: ['What was the same in every dish? Water and air.', 'What was different? The temperature.', 'What does that tell you about 5 °C and 60 °C?'],
        explain: 'Water and air were present, so the missing need was a suitable temperature: 5 °C is too cold and 60 °C too hot.' },
      { id: 'env-038', type: 'oeq', level: 3, marks: 4, syl: 'P6', skill: 'adapt',
        stem: 'Look at the cactus. Explain how part B and part C each help the cactus survive in a hot, dry desert where it rains only now and then.',
        figure: FIG_CACTUS,
        model: 'Part B, the thick stem, stores water, so the cactus can survive long periods without rain. Part C, the roots, spread out wide just under the surface, so they can absorb rainwater quickly from a large area when it rains.',
        keys: [['stores water', 'store water', 'keeps water'], ['without rain', 'dry periods', 'long time without water'], ['absorb', 'take in'], ['large area', 'wide area', 'spread out wide']],
        watchFor: ['adapt-purpose-mixup'],
        technique: 'Claim, evidence, reason',
        steps: ['What does the thick stem do with water?', 'Why does that matter in a desert?', 'How are the roots arranged?', 'How does that help when it rains?'],
        explain: 'B stores water for the long dry spells; C spreads wide to soak up as much rain as possible, quickly.' },
      { id: 'env-039', type: 'oeq', level: 2, marks: 2, syl: 'P6', skill: 'adapt',
        stem: 'A woodpecker has a strong, sharp, pointed beak. Explain how this helps it obtain food.',
        figure: null,
        model: 'It uses its beak to make holes in the bark of trees and reach the insects living inside, which it eats.',
        keys: [['bark', 'wood', 'holes in the tree', 'into trees'], ['insects', 'grubs', 'larvae', 'worms']],
        watchFor: ['adapt-purpose-mixup'],
        technique: 'Claim, evidence, reason',
        steps: ['What can a strong, sharp beak do to a tree?', 'What food is hiding there?', 'Link the beak to the food.'],
        explain: 'The beak chips into bark so the woodpecker can reach insects hidden inside the tree.' },
      { id: 'env-040', type: 'oeq', level: 3, marks: 3, syl: 'P6', skill: 'adapt',
        stem: 'Some fish live in ponds where the water has very little oxygen. They swim to the water surface to gulp air.\n(a) Is this a structural or a behavioural adaptation? Give a reason. [2]\n(b) Explain how it helps the fish survive. [1]',
        figure: null,
        model: '(a) It is a behavioural adaptation, because it is something the fish does, not a body part. (b) By gulping air at the surface, the fish gets enough oxygen to survive.',
        keys: [['behavioural'], ['something the fish does', 'an action', 'what it does', 'not a body part'], ['enough oxygen', 'more oxygen']],
        watchFor: ['structural-behavioural-mixup'],
        technique: 'Claim, evidence, reason',
        steps: ['Is gulping air a body part or an action?', 'Give that as your reason.', 'What does the fish get from the air that the water lacks?'],
        explain: '(a) An action is behavioural. (b) The air gives the fish the oxygen the water lacks.' },
      { id: 'env-041', type: 'oeq', level: 2, marks: 3, syl: 'P6', skill: 'impact',
        stem: 'A large area of forest is cleared to build a road. Explain how this could cause the population of a forest bird to decrease.',
        figure: null,
        model: 'The birds lose their habitat, the trees where they nest and shelter. They also lose food, such as the fruits and insects found on the trees. With fewer places to nest and less food, fewer birds survive and reproduce.',
        keys: [['lose their habitat', 'habitat is destroyed', 'nest', 'shelter'], ['lose food', 'less food'], ['fewer birds survive', 'cannot survive', 'reproduce', 'die']],
        watchFor: ['deforestation-trees-only'],
        technique: 'Follow the arrows',
        steps: ['What do the birds use the trees for?', 'What food do they find there?', 'Without these, what happens to the birds?'],
        explain: 'Clearing the forest removes the birds’ habitat (nesting places) and their food, so fewer birds survive.' },
      { id: 'env-042', type: 'oeq', level: 3, marks: 3, syl: 'P6', skill: 'impact', chain: true,
        stem: 'Oil from a boat spreads as a thin layer over the surface of a pond. Explain why many fish in the pond die.',
        figure: null,
        model: 'The layer of oil stops air from dissolving into the water. So the amount of oxygen in the water decreases. The fish cannot get enough oxygen to breathe, so they die.',
        keys: [['stops air', 'prevents air', 'blocks air'], ['oxygen in the water decreases', 'less oxygen', 'less dissolved oxygen'], ['cannot get enough oxygen', 'not enough oxygen', 'coats the gills', 'clogs the gills']],
        watchFor: ['impact-mixup'],
        technique: 'Follow the arrows',
        steps: ['What can the oil layer block from reaching the water?', 'What happens to the oxygen in the water?', 'What do fish need oxygen for?'],
        explain: 'In order: oil stops air dissolving in → less oxygen in the water → the fish cannot get enough oxygen. (The light route is accepted only when it is complete: the oil blocks light, so water plants make less food and give out less oxygen. Also accepted for the last point: oil coats or clogs the gills.)' },
      { id: 'env-043', type: 'oeq', level: 3, marks: 4, syl: 'P6', skill: 'impact', chain: true,
        stem: 'Look at the river survey. A factory releases waste through a pipe just before X.\n(a) Describe the relationship between the amount of oxygen in the water and the number of fish. [1]\n(b) Explain why there are very few fish at X. [2]\n(c) Suggest one thing the factory could do to reduce the harm. [1]',
        figure: TBL_RIVER,
        model: '(a) The more oxygen in the water, the more fish there are. (b) Waste from the factory pollutes the water at X, so there is less oxygen. The fish cannot get enough oxygen to breathe, so few fish can live there. (c) Treat (clean) its waste water before releasing it into the river.',
        keys: [['the more oxygen', 'more oxygen, more fish', 'greater the amount of oxygen'], ['pollutes', 'pollution', 'poisonous', 'harmful'], ['cannot get enough oxygen', 'not enough oxygen', 'too little oxygen'], ['treat', 'clean', 'filter', 'stop releasing']],
        watchFor: ['graph-misread', 'conclusion-overreach'],
        technique: 'Read, compare, conclude',
        steps: ['(a) As oxygen goes up, what happens to the fish?', '(b) What is different at X, and what does it do to the water?', '(b) What do the fish need that is missing?', '(c) How could the waste be made safe?'],
        explain: '(a) 8 units → 45 fish, 5 → 20, 2 → 3. (b) Waste pollutes the water and lowers the oxygen, so fish cannot breathe well. (c) Treating waste water removes the harmful substances.' },
      { id: 'env-044', type: 'oeq', level: 3, marks: 2, syl: 'P6', skill: 'inquiry', chain: true,
        stem: 'In a garden, birds eat a kind of insect. The graph shows the number of insects and birds over six months. Explain why the number of insects decreased from month 3 to month 5.',
        figure: GRAPH_BIRDS,
        model: 'By month 3 there were more birds than before. The birds ate more insects, so more insects were eaten than were born.',
        keys: [['more birds', 'birds increased', 'bird population increased'], ['ate more insects', 'more insects were eaten', 'more insects eaten']],
        watchFor: ['graph-misread', 'effect-direction'],
        technique: 'Follow the arrows',
        steps: ['Read the birds line: what did it do up to month 3?', 'Birds eat insects. More birds means what?', 'Link that to the fall in insects.'],
        explain: 'The birds increased (from 10 to 28) while there were many insects to eat. More birds ate more insects, so the insects decreased.' },
      { id: 'env-045', type: 'oeq', level: 3, marks: 5, syl: 'P6', skill: 'foodweb', chain: true,
        stem: ARROW + ' Look at the field food web.\n(a) Which organism is the producer? How can you tell from the arrows? [2]\n(b) All the birds are removed. Explain what would happen to the caterpillars at first. [2]\n(c) Explain why the snakes might then decrease. [1]',
        figure: WEB_FIELD,
        model: '(a) The grass. No arrow points to it, so it does not eat any other organism; it makes its own food. (b) Fewer caterpillars are eaten, because the bird was their only predator, so the caterpillar population increases. (c) The snakes have less food, because the birds were one of their two food sources.',
        keys: [['grass'], ['no arrow', 'no arrows', 'does not eat', 'makes its own food'], ['fewer caterpillars are eaten', 'caterpillars are not eaten', 'no longer eaten', 'only predator'], ['caterpillar population increases', 'more caterpillars', 'caterpillars increase'], ['less food', 'fewer food sources', 'less to eat']],
        watchFor: ['producer-mixup', 'effect-direction', 'arrow-direction'],
        technique: 'Follow the arrows',
        steps: ['(a) Which organism has no arrows pointing to it?', '(b) Who ate the caterpillars? With them gone, what happens?', '(c) What did the snakes eat?'],
        explain: '(a) Grass: nothing points to it. (b) Birds were the caterpillars’ only predator → fewer eaten → more caterpillars. (c) Snakes lose one of their two foods → less food.' }
    ]
  });
})();
