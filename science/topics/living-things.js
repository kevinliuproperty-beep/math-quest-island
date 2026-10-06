"use strict";
/* P3 Science — Diversity of Living and Non-Living Things (lane: living-things).
   Data only. The small helpers below build HTML/SVG strings for figures; no DOM code. */
(function () {

  // ---------- figure helpers (string builders only) ----------
  var TB = 'border-collapse:collapse;margin:6px auto;font-size:14px;';
  var TD = 'border:1px solid #999;padding:5px 8px;text-align:center;';
  function table(head, rows) {
    var h = '<table style="' + TB + '"><tr>' + head.map(function (c) {
      return '<th style="' + TD + 'font-weight:bold">' + c + '</th>';
    }).join('') + '</tr>';
    rows.forEach(function (r) {
      h += '<tr>' + r.map(function (c) { return '<td style="' + TD + '">' + c + '</td>'; }).join('') + '</tr>';
    });
    return h + '</table>';
  }
  function box(t) {
    return '<div style="display:inline-block;border:2px solid #888;border-radius:8px;padding:4px 8px;margin:2px;font-size:13px;line-height:1.3">' + t + '</div>';
  }
  // n = leaf string, or { q, yes, no }
  function tree(n) {
    if (typeof n === 'string') return box(n);
    var c = 'text-align:center;vertical-align:top;padding:2px;border:none;width:50%;';
    return '<table style="border-collapse:collapse;margin:0 auto;width:100%"><tr><td colspan="2" style="' + c + 'width:100%">' + box('<b>' + n.q + '</b>') + '</td></tr>' +
      '<tr><td style="' + c + 'font-size:12px">Yes &darr;</td><td style="' + c + 'font-size:12px">No &darr;</td></tr>' +
      '<tr><td style="' + c + '">' + tree(n.yes) + '</td><td style="' + c + '">' + tree(n.no) + '</td></tr></table>';
  }
  // Classification chart rendered as a borderless HTML table (validator: figure must be <svg> or <table>).
  function chart(root, n) {
    return '<table style="border-collapse:collapse;margin:6px auto;max-width:380px;width:100%"><tr><td style="text-align:center;border:none;padding:2px">' +
      box('<b>' + root + '</b>') + '<div style="font-size:12px">&darr;</div>' + tree(n) + '</td></tr></table>';
  }
  var SVG0 = '<svg viewBox="0 0 320 180" width="100%" style="max-width:340px;display:block;margin:6px auto" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="14">' +
    '<rect x="0" y="0" width="320" height="180" rx="8" fill="#fff"/>';

  // Spider: 2 body parts, 8 legs (4 pairs) all from the front body part, no feelers, no wings.
  var SPIDER = SVG0 +
    '<g stroke="#333" stroke-width="3" fill="none" stroke-linecap="round">' +
    // upper legs
    '<polyline points="118,78 100,45 82,38"/><polyline points="126,74 116,35 104,22"/>' +
    '<polyline points="136,74 146,35 158,22"/><polyline points="144,78 164,45 182,38"/>' +
    // lower legs
    '<polyline points="118,102 100,135 82,142"/><polyline points="126,106 116,145 104,158"/>' +
    '<polyline points="136,106 146,145 158,158"/><polyline points="144,102 164,135 182,142"/>' +
    '</g>' +
    '<ellipse cx="131" cy="90" rx="26" ry="20" fill="#8d6e63" stroke="#333" stroke-width="2"/>' +
    '<ellipse cx="196" cy="90" rx="40" ry="30" fill="#a1887f" stroke="#333" stroke-width="2"/>' +
    '<text x="308" y="24" text-anchor="end" fill="#222">Animal Y</text></svg>';

  // Insect, top view: head, thorax, abdomen; 3 pairs of legs on the thorax; 1 pair of feelers.
  function insect(withWings, labels) {
    var s = SVG0 + '<g stroke="#333" stroke-width="3" fill="none" stroke-linecap="round">' +
      '<path d="M56 84 Q44 66 26 64" stroke-width="1.5"/><path d="M56 96 Q44 114 26 116" stroke-width="1.5"/>' + // feelers: thin, curved, pointing forward so they are not counted as legs
      '<polyline points="98,76 90,50 76,40"/><polyline points="108,75 108,45 100,30"/><polyline points="118,76 128,50 140,40"/>' +
      '<polyline points="98,104 90,130 76,140"/><polyline points="108,105 108,135 100,150"/><polyline points="118,104 128,130 140,140"/>' +
      '</g>';
    if (withWings) {
      s += '<ellipse cx="150" cy="62" rx="45" ry="16" fill="#bbdefb" fill-opacity="0.7" stroke="#333" transform="rotate(-12 150 62)"/>' +
           '<ellipse cx="150" cy="118" rx="45" ry="16" fill="#bbdefb" fill-opacity="0.7" stroke="#333" transform="rotate(12 150 118)"/>';
    }
    s += '<circle cx="66" cy="90" r="13" fill="#6d4c41" stroke="#333" stroke-width="2"/>' +
         '<ellipse cx="108" cy="90" rx="26" ry="16" fill="#8d6e63" stroke="#333" stroke-width="2"/>' +
         '<ellipse cx="185" cy="90" rx="48" ry="20" fill="#a1887f" stroke="#333" stroke-width="2"/>';
    if (labels) {
      s += '<g fill="#222" font-weight="bold"><text x="60" y="172">A</text><text x="103" y="172">B</text><text x="180" y="172">C</text></g>' +
           '<g stroke="#555" stroke-width="1"><line x1="66" y1="158" x2="66" y2="104"/><line x1="108" y1="158" x2="108" y2="107"/><line x1="185" y1="158" x2="185" y2="111"/></g>';
    }
    if (!labels) s += '<text x="308" y="24" text-anchor="end" fill="#222">Animal Z</text>';
    return s + '</svg>';
  }

  // Fern frond plus a close-up of the underside of one leaflet with dots X.
  var FERN = SVG0 +
    '<line x1="80" y1="165" x2="80" y2="20" stroke="#2e7d32" stroke-width="3"/>' +
    (function () {
      var g = '';
      for (var i = 0; i < 6; i++) {
        var y = 40 + i * 21, w = 18 + i * 5;
        g += '<ellipse cx="' + (80 - w / 2 - 2) + '" cy="' + y + '" rx="' + (w / 2) + '" ry="6" fill="#66bb6a"/>' +
             '<ellipse cx="' + (80 + w / 2 + 2) + '" cy="' + y + '" rx="' + (w / 2) + '" ry="6" fill="#66bb6a"/>';
      }
      return g;
    })() +
    '<text x="40" y="178" fill="#222" font-size="12">fern leaf</text>' +
    '<ellipse cx="225" cy="85" rx="70" ry="28" fill="#81c784" stroke="#2e7d32" stroke-width="2"/>' +
    '<g fill="#6d4c41"><circle cx="185" cy="78" r="5"/><circle cx="185" cy="94" r="5"/><circle cx="210" cy="76" r="5"/><circle cx="210" cy="94" r="5"/>' +
    '<circle cx="235" cy="76" r="5"/><circle cx="235" cy="94" r="5"/><circle cx="260" cy="78" r="5"/><circle cx="260" cy="93" r="5"/></g>' +
    '<text x="160" y="40" fill="#222" font-size="12">Underside of a leaf</text>' +
    '<text x="268" y="140" fill="#222" font-weight="bold">X</text><line x1="270" y1="128" x2="261" y2="99" stroke="#555"/>' +
    '<line x1="115" y1="60" x2="155" y2="75" stroke="#555" stroke-dasharray="4 3"/></svg>';

  // ---------- shared figures ----------
  var TABLE_ANIMALS_ABCD = table(
    ['Animal', 'Body covering', 'How it reproduces', 'Breathes through'],
    [['A', 'feathers', 'lays eggs with hard shells', 'lungs'],
     ['B', 'dry scaly skin', 'lays eggs', 'lungs'],
     ['C', 'moist skin', 'lays eggs in water', 'gills when young, lungs and skin as adult'],
     ['D', 'scales', 'lays eggs', 'gills']]);

  var TABLE_WXYZ = table(
    ['Living thing', 'Can make its own food', 'Reproduces by spores', 'Has flowers'],
    [['W', '&#10003;', '&#10003;', '&#10007;'],
     ['X', '&#10007;', '&#10003;', '&#10007;'],
     ['Y', '&#10003;', '&#10007;', '&#10003;'],
     ['Z', '&#10003;', '&#10007;', '&#10007;']]);

  var TABLE_PQRS = table(
    ['Animal', 'Body covering', 'Breathes through', 'How it reproduces'],
    [['P', 'fur', 'lungs', 'gives birth to young alive; feeds young on milk'],
     ['Q', 'scales', 'gills', 'lays eggs in water'],
     ['R', 'feathers', 'lungs', 'lays eggs with hard shells'],
     ['S', 'dry scaly skin', 'lungs', 'lays eggs on land']]);

  var TABLE_MOULD = '<div style="text-align:center;font-size:13px">Three slices of the same type and size of bread, left for 5 days</div>' + table(
    ['Slice', 'Sprinkled with water?', 'Kept at', 'Mould seen after 5 days'],
    [['A', 'no (dry)', 'room temperature (warm)', 'very little'],
     ['B', 'yes (damp)', 'room temperature (warm)', 'a lot'],
     ['C', 'yes (damp)', 'in the fridge (cold)', 'very little']]);

  SCI.registerTopic({
    id: 'living-things',
    title: 'Living Things',
    emoji: '🐞',
    theme: 'Diversity',
    moeRef: 'Diversity of Living and Non-Living Things (P3): Describe the characteristics of living things (need water, food and air to survive; grow, respond and reproduce). Recognise some broad groups of living things based on similarities and differences: plants (flowering, non-flowering), animals (amphibians, birds, fish, insects, mammals, reptiles), fungi (mould, mushroom, yeast), bacteria. Classify living things into broad groups based on common observable characteristics.',

    notes: [
      { title: 'Living or non-living?',
        body: 'ALL living things: need food, water and air to survive; grow; respond to changes around them; reproduce (make young ones of their own kind). A non-living thing may seem to do some of these (a car needs fuel and air to run), but it cannot grow and reproduce. Moving from place to place is NOT on the list, because plants are living but stay in one place.' },
      { title: 'Plants',
        body: 'Plants can make their own food. Flowering plants (hibiscus, rose, sunflower, mango tree, rice) have flowers and reproduce by seeds. Non-flowering plants have no flowers: ferns and mosses reproduce by spores (fern spores are found on the underside of the leaves); conifers such as the pine tree reproduce by seeds found in cones.' },
      { title: 'Mammals and birds',
        body: 'Mammals: hair or fur, breathe through lungs, most give birth to young alive, feed their young on milk. A whale, dolphin and bat are MAMMALS (not fish, not birds). Birds: feathers, a beak, two wings and two legs, lay eggs with hard shells, breathe through lungs. A penguin and an ostrich cannot fly but are still BIRDS because they have feathers.' },
      { title: 'Fish, amphibians, reptiles',
        body: 'Fish: live in water, most have scales and fins, breathe through gills, most lay eggs. Amphibians (frog, toad): moist skin, lay eggs in water; the young (tadpoles) breathe through gills, adults breathe through lungs and moist skin. Reptiles (crocodile, snake, lizard, turtle): dry scaly skin, breathe through lungs, most lay eggs on land.' },
      { title: 'Insects (and the spider trap)',
        body: 'Insects have 3 body parts (head, thorax, abdomen), 6 legs (3 pairs) joined to the thorax, and 1 pair of feelers. Many have wings, but not all. Examples: ant, butterfly, beetle, grasshopper, mosquito. A SPIDER is NOT an insect: it has 8 legs and only 2 body parts.' },
      { title: 'Fungi',
        body: 'Mushrooms, moulds and yeast are FUNGI. Fungi are NOT plants: they cannot make their own food and they have no leaves, flowers or roots. They take in food from dead or rotting things (and from food like bread). Mushrooms and moulds reproduce by spores. Mould grows best on food kept in warm, damp places. Yeast is used to make bread.' },
      { title: 'Bacteria',
        body: 'Bacteria are living things. They are so tiny that we can only see them with a microscope. Some bacteria are useful (used to make yoghurt and cheese; break down dead plants and animals). Some are harmful (cause diseases such as food poisoning, spoil food, cause tooth decay). Being invisible does NOT make them non-living.' },
      { title: 'Reading a classification chart',
        body: 'Each question splits the group into YES and NO. The characteristic must be TRUE for every living thing on the YES side and FALSE for every one on the NO side. To find a missing label, test each option against EVERY living thing on both sides. Watch out: "Can it fly?" fails for penguins and bats; "Does it lay eggs?" fails because many groups lay eggs.' },
      { title: 'Exam traps to remember',
        body: 'Whale, dolphin, bat = mammals. Penguin, ostrich = birds. Spider = not an insect. Mushroom, mould, yeast = fungi, not plants. Ferns and mosses have no flowers and use spores; pine trees use cones. Bacteria are living. Moss (a plant) is not mould (a fungus).' }
    ],

    items: [
      // ---------------- Living vs non-living ----------------
      { id: 'liv-001', type: 'mcq', level: 1,
        stem: 'Which one of these is a living thing?',
        figure: null,
        options: ['A candle flame', 'A toy car', 'A fern', 'A cloud'],
        answer: 2,
        explain: 'A fern needs food, water and air, grows and reproduces, so it is living. A flame and a cloud can change size, and a toy car can move, but none of them can grow and reproduce.' },
      { id: 'liv-002', type: 'mcq', level: 1,
        stem: 'Which of these is NOT a characteristic of ALL living things?',
        figure: null,
        options: ['They need water.', 'They grow.', 'They move from place to place.', 'They reproduce.'],
        answer: 2,
        explain: 'Plants are living things but they do not move from place to place. All living things need water, grow and reproduce.' },
      { id: 'liv-003', type: 'mcq', level: 2,
        stem: 'A car can move, needs fuel and gives out smoke. Why is a car still a non-living thing?',
        figure: null,
        options: ['It is made of metal.', 'It cannot grow or reproduce.', 'It does not need air.', 'It cannot move by itself.'],
        answer: 1,
        explain: 'Living things grow and reproduce. A car cannot grow or make young cars, so it is non-living. What it is made of does not decide if it is living.' },
      { id: 'liv-004', type: 'mcq', level: 2,
        stem: 'When Sara touched the leaves of a mimosa (touch-me-not) plant, the leaves folded up. Which characteristic of living things does this show?',
        figure: null,
        options: ['Living things need air.', 'Living things grow.', 'Living things reproduce.', 'Living things respond to changes.'],
        answer: 3,
        explain: 'The touch is a change around the plant, and folding its leaves is the plant responding to it.' },
      { id: 'liv-005', type: 'mcq', level: 1,
        stem: 'A hen laid some eggs. A few weeks later, chicks hatched from the eggs. Which characteristic of living things does this show?',
        figure: null,
        options: ['Living things grow.', 'Living things respond to changes.', 'Living things reproduce.', 'Living things need food.'],
        answer: 2,
        explain: 'Making young ones of its own kind (chicks) is reproduction.' },
      { id: 'liv-006', type: 'mcq', level: 1,
        stem: 'A small seedling became a much taller plant with more leaves after three weeks. Which characteristic of living things does this show?',
        figure: null,
        options: ['Living things grow.', 'Living things reproduce.', 'Living things respond to changes.', 'Living things need air.'],
        answer: 0,
        explain: 'Becoming taller with more leaves means the plant is growing.' },

      // ---------------- Plants ----------------
      { id: 'liv-007', type: 'mcq', level: 1,
        stem: 'How do ferns reproduce?',
        figure: null,
        options: ['By seeds', 'By flowers', 'By cones', 'By spores'],
        answer: 3,
        explain: 'Ferns are non-flowering plants that reproduce by spores. The spores are found on the underside of their leaves.' },
      { id: 'liv-008', type: 'mcq', level: 1,
        stem: 'Which one of these is a non-flowering plant?',
        figure: null,
        options: ['Hibiscus', 'Sunflower', 'Fern', 'Rose'],
        answer: 2,
        explain: 'A fern never has flowers. Hibiscus, sunflower and rose are flowering plants.' },
      { id: 'liv-009', type: 'mcq', level: 2,
        stem: 'Which statement about non-flowering plants is correct?',
        figure: null,
        options: ['They cannot make their own food.', 'They reproduce by seeds found in fruits.', 'Ferns and mosses reproduce by spores.', 'They have flowers that are too small to see.'],
        answer: 2,
        explain: 'Ferns and mosses reproduce by spores. Seeds inside fruits come from flowers, so they belong to flowering plants. All plants, flowering or not, make their own food.' },

      // ---------------- Animals ----------------
      { id: 'liv-010', type: 'mcq', level: 1,
        stem: 'An animal has feathers, a beak and two wings. Which group does it belong to?',
        figure: null,
        options: ['Mammals', 'Reptiles', 'Insects', 'Birds'],
        answer: 3,
        explain: 'Feathers are found only on birds. Birds also have a beak and two wings.' },
      { id: 'liv-011', type: 'mcq', level: 1,
        stem: 'How many legs does an insect have?',
        figure: null,
        options: ['4', '6', '8', '10'],
        answer: 1,
        explain: 'Insects have 6 legs (3 pairs). An animal with 8 legs, like a spider, is not an insect.' },
      { id: 'liv-012', type: 'mcq', level: 2,
        stem: 'A whale lives in the sea and has fins. It breathes through lungs, gives birth to its young alive and feeds its young on milk. Which group does the whale belong to?',
        figure: null,
        options: ['Fish', 'Amphibians', 'Reptiles', 'Mammals'],
        answer: 3,
        explain: 'Breathing through lungs and feeding its young on milk make the whale a mammal. Living in water and having fins do not make it a fish.' },
      { id: 'liv-013', type: 'mcq', level: 2,
        stem: 'A bat can fly. It has fur on its body, gives birth to its young alive and feeds its young on milk. Which group does the bat belong to?',
        figure: null,
        options: ['Mammals', 'Birds', 'Insects', 'Reptiles'],
        answer: 0,
        explain: 'Fur and feeding its young on milk make the bat a mammal. Being able to fly does not make it a bird; birds have feathers.' },
      { id: 'liv-014', type: 'mcq', level: 2,
        stem: 'A penguin cannot fly. It has feathers and a beak, and it lays eggs with hard shells. Which group does the penguin belong to?',
        figure: null,
        options: ['Birds', 'Fish', 'Mammals', 'Reptiles'],
        answer: 0,
        explain: 'A penguin has feathers, so it is a bird. Not all birds can fly.' },
      { id: 'liv-015', type: 'mcq', level: 2,
        stem: 'Study animal Y in the diagram. Which statement about animal Y is correct?',
        figure: SPIDER,
        options: ['It is an insect because it has legs.', 'It is not an insect because it has 8 legs and only 2 body parts.', 'It is an insect because it has 2 body parts.', 'It is not an insect because it has no wings.'],
        answer: 1,
        explain: 'Count the legs: 8, on a body with only 2 parts. Insects have 6 legs and 3 body parts, so animal Y (a spider) is not an insect. Having no wings is not the reason: some insects, like worker ants, have no wings.' },
      { id: 'liv-016', type: 'mcq', level: 2,
        stem: 'Which one of these animals is an insect?',
        figure: null,
        options: ['Beetle', 'Spider', 'Centipede', 'Earthworm'],
        answer: 0,
        explain: 'A beetle has 3 body parts, 6 legs and a pair of feelers, so it is an insect. A spider has 8 legs, a centipede has many legs and an earthworm has no legs.' },
      { id: 'liv-017', type: 'mcq', level: 1,
        stem: 'Which one of these animals is an amphibian?',
        figure: null,
        options: ['Frog', 'Crocodile', 'Goldfish', 'Turtle'],
        answer: 0,
        explain: 'A frog has moist skin and lays its eggs in water; its young (tadpoles) live in water. Crocodiles and turtles are reptiles; a goldfish is a fish.' },
      { id: 'liv-018', type: 'mcq', level: 1,
        stem: 'What kind of body covering do reptiles have?',
        figure: null,
        options: ['Dry scaly skin', 'Moist skin', 'Feathers', 'Fur'],
        answer: 0,
        explain: 'Reptiles such as snakes, lizards and crocodiles have dry scaly skin. Moist skin belongs to amphibians.' },
      { id: 'liv-019', type: 'mcq', level: 1,
        stem: 'Fish breathe through their ____.',
        figure: null,
        options: ['lungs', 'moist skin', 'fins', 'gills'],
        answer: 3,
        explain: 'Fish breathe through gills. Fins help them swim; they are not for breathing.' },
      { id: 'liv-020', type: 'mcq', level: 2,
        stem: 'A young frog (tadpole) lives in water and breathes through gills. How does an adult frog breathe?',
        figure: null,
        options: ['Through gills only', 'Through lungs only', 'Through lungs and its moist skin', 'Through gills and lungs'],
        answer: 2,
        explain: 'Adult amphibians breathe through lungs and through their moist skin. That is why a frog\'s skin must stay moist.' },
      { id: 'liv-021', type: 'mcq', level: 2,
        stem: 'Which animal is matched to the correct group?',
        figure: null,
        options: ['Dolphin : fish', 'Bat : bird', 'Turtle : reptile', 'Spider : insect'],
        answer: 2,
        explain: 'A turtle has dry scaly skin and is a reptile. A dolphin and a bat are mammals; a spider is not an insect.' },
      { id: 'liv-022', type: 'mcq', level: 2,
        stem: 'Which characteristic do ALL birds have?',
        figure: null,
        options: ['They can fly.', 'They build nests in trees.', 'They eat insects.', 'They have feathers.'],
        answer: 3,
        explain: 'Every bird has feathers. Penguins and ostriches cannot fly, and birds eat many different foods.' },
      { id: 'liv-023', type: 'mcq', level: 1,
        stem: 'Which animal gives birth to its young alive and feeds its young on milk?',
        figure: null,
        options: ['Cat', 'Chicken', 'Crocodile', 'Frog'],
        answer: 0,
        explain: 'A cat is a mammal. Chickens, crocodiles and frogs lay eggs.' },
      { id: 'liv-024', type: 'mcq', level: 2,
        stem: 'The table shows some information about animals A, B, C and D. Which animal is a reptile?',
        figure: TABLE_ANIMALS_ABCD,
        options: ['A', 'B', 'C', 'D'],
        answer: 1,
        explain: 'Dry scaly skin and breathing through lungs = reptile (B). A is a bird (feathers), C is an amphibian (moist skin, gills when young), D is a fish (scales and gills).' },
      { id: 'liv-025', type: 'mcq', level: 2,
        stem: 'The diagram shows an insect. To which body part are its legs joined?',
        figure: insect(false, true),
        options: ['A', 'B', 'C', 'A and C'],
        answer: 1,
        explain: 'An insect has three body parts: head (A), thorax (B) and abdomen (C). All 6 legs are joined to the thorax, the middle part.' },

      // ---------------- Fungi and bacteria ----------------
      { id: 'liv-026', type: 'mcq', level: 1,
        stem: 'Which group does a mushroom belong to?',
        figure: null,
        options: ['Plants', 'Animals', 'Bacteria', 'Fungi'],
        answer: 3,
        explain: 'A mushroom is a fungus. It is not a plant because it cannot make its own food.' },
      { id: 'liv-027', type: 'mcq', level: 1,
        stem: 'Which one of these is NOT a fungus?',
        figure: null,
        options: ['Mushroom', 'Bread mould', 'Yeast', 'Moss'],
        answer: 3,
        explain: 'Moss is a non-flowering plant: it makes its own food. Do not mix up moss (a plant) with mould (a fungus).' },
      { id: 'liv-028', type: 'mcq', level: 1,
        stem: 'Which statement about fungi is correct?',
        figure: null,
        options: ['Mushrooms and moulds reproduce by spores.', 'They make their own food.', 'They have flowers.', 'They have roots, stems and leaves.'],
        answer: 0,
        explain: 'Mushrooms and moulds reproduce by spores. Fungi cannot make their own food and have no flowers, roots, stems or leaves.' },
      { id: 'liv-029', type: 'mcq', level: 1,
        stem: 'Which statement about bacteria is correct?',
        figure: null,
        options: ['They are non-living because they are too small to see.', 'All bacteria are harmful.', 'They are very tiny plants.', 'They are living things that can only be seen with a microscope.'],
        answer: 3,
        explain: 'Bacteria are living things. They are too tiny to see with our eyes alone, so we need a microscope. Some are useful and some are harmful, and they are not plants.' },
      { id: 'liv-030', type: 'mcq', level: 2,
        stem: 'Which one of these shows bacteria being USEFUL to people?',
        figure: null,
        options: ['Making yoghurt', 'Causing food poisoning', 'Making bread dough rise', 'Causing tooth decay'],
        answer: 0,
        explain: 'Bacteria are used to make yoghurt. Bread dough rises because of yeast, which is a fungus, not bacteria. Food poisoning and tooth decay are harmful.' },
      { id: 'liv-031', type: 'mcq', level: 1,
        stem: 'Yeast is used to make bread. Which group does yeast belong to?',
        figure: null,
        options: ['Fungi', 'Plants', 'Animals', 'Bacteria'],
        answer: 0,
        explain: 'Yeast is a fungus, like mushrooms and moulds.' },
      { id: 'liv-032', type: 'mcq', level: 2,
        stem: 'Mould grows fastest on bread that is kept in a place that is ____.',
        figure: null,
        options: ['cold and dry', 'cold and damp', 'warm and dry', 'warm and damp'],
        answer: 3,
        explain: 'Mould grows best in warm, damp places. Keeping bread cold (in the fridge) and dry slows down mould growth.' },
      { id: 'liv-033', type: 'mcq', level: 3,
        stem: 'Living thing X cannot make its own food. It grows on a rotting log, reproduces by spores and has no leaves. What is X most likely to be?',
        figure: null,
        options: ['A fern', 'A mushroom', 'A moss', 'A kind of bacteria'],
        answer: 1,
        explain: 'Ferns and mosses also reproduce by spores, but they are plants and make their own food. Something that cannot make its own food and reproduces by spores is a fungus, such as a mushroom.' },

      // ---------------- Classification charts and tables ----------------
      { id: 'liv-034', type: 'mcq', level: 2,
        stem: 'Study the classification chart. Which group of living things is Group B?',
        figure: chart('Living things', { q: 'Can it make its own food?',
          yes: 'Group A<br>fern, hibiscus',
          no: { q: 'Does it reproduce by spores?', yes: 'Group B<br>mushroom, bread mould', no: 'Group C<br>cat, sparrow' } }),
        options: ['Fungi', 'Plants', 'Animals', 'Bacteria'],
        answer: 0,
        explain: 'Group B cannot make its own food and reproduces by spores, and it contains a mushroom and bread mould. These are fungi.' },
      { id: 'liv-035', type: 'mcq', level: 2,
        stem: 'Study the classification chart of plants. Which plant could be placed in Group R?',
        figure: chart('Plants', { q: 'Does it have flowers?',
          yes: 'Group P',
          no: { q: 'Does it reproduce by spores?', yes: 'Group Q', no: 'Group R' } }),
        options: ['Rose', 'Moss', 'Fern', 'Pine tree'],
        answer: 3,
        explain: 'Group R plants have no flowers and do not use spores. A pine tree is a conifer: it reproduces by seeds found in cones. A rose goes in P; moss and fern go in Q.' },
      { id: 'liv-036', type: 'mcq', level: 3,
        stem: 'The label at the top of this classification chart is missing. Which question could be the missing label?',
        figure: chart('Animals', { q: '???',
          yes: 'sparrow, penguin',
          no: { q: 'Does it have six legs?', yes: 'ant, butterfly', no: 'cat, frog, spider' } }),
        options: ['Can it fly?', 'Does it have feathers?', 'Does it lay eggs?', 'Does it live in water?'],
        answer: 1,
        explain: 'Only the sparrow and penguin have feathers. "Can it fly?" fails: the penguin cannot fly but the butterfly can. "Does it lay eggs?" fails: the ant, butterfly, frog and spider also lay eggs.' },
      { id: 'liv-037', type: 'mcq', level: 3,
        stem: 'Some animals are sorted into two groups. Group X: cat, whale, bat. Group Y: chicken, crocodile, frog. Which question was used to sort them?',
        figure: table(['Group X', 'Group Y'], [['cat', 'chicken'], ['whale', 'crocodile'], ['bat', 'frog']]),
        options: ['Can it fly?', 'Does it live in water?', 'Does it feed its young on milk?', 'Does it breathe through lungs?'],
        answer: 2,
        explain: 'Cat, whale and bat are mammals that feed their young on milk; chicken, crocodile and frog do not. "Fly" and "water" mix the groups (bat and chicken; whale and frog). All six animals breathe through lungs (adult frogs too), so that question cannot split them.' },
      { id: 'liv-038', type: 'mcq', level: 3,
        stem: 'The table shows information about living things W, X, Y and Z. Which one could be a fern?',
        figure: TABLE_WXYZ,
        options: ['W', 'X', 'Y', 'Z'],
        answer: 0,
        explain: 'A fern makes its own food, reproduces by spores and has no flowers: that is W. X cannot make food, so it is a fungus. Y has flowers. Z is a plant with no flowers and no spores, like a pine tree.' },
      { id: 'liv-039', type: 'mcq', level: 3,
        stem: 'Look at the same table of W, X, Y and Z. Which TWO are non-flowering plants?',
        figure: TABLE_WXYZ,
        options: ['W and X', 'W and Z', 'X and Y', 'Y and Z'],
        answer: 1,
        explain: 'A plant makes its own food. W and Z make their own food and have no flowers, so they are non-flowering plants. X has no flowers but cannot make its own food: it is a fungus, not a plant.' },

      // ---------------- OEQ ----------------
      { id: 'liv-040', type: 'oeq', level: 1, marks: 3,
        stem: 'Name the three things that all living things need to survive.',
        figure: null,
        model: 'Living things need food, water and air to survive.',
        keys: [['food'], ['water'], ['air']],
        explain: 'One mark each for food, water and air. Sunlight is not on this list: animals and fungi do not need sunlight to survive.' },
      { id: 'liv-041', type: 'oeq', level: 2, marks: 2,
        stem: 'A toy robot can move and make sounds. Explain why it is a non-living thing.',
        figure: null,
        model: 'The toy robot cannot grow and it cannot reproduce, which living things do.',
        keys: [['cannot grow', 'does not grow', 'not grow'], ['cannot reproduce', 'does not reproduce', 'not reproduce', 'cannot make young']],
        explain: 'Moving and making sounds do not make something living. Markers look for "cannot grow" and "cannot reproduce".' },
      { id: 'liv-042', type: 'oeq', level: 3, marks: 2,
        stem: 'Peter kept some dry green bean seeds on a shelf for months and they did not change. He said, "Seeds are non-living." His sister put the seeds on damp cotton wool. A few days later, they grew into seedlings. Is Peter correct? Explain using what happened.',
        figure: null,
        model: 'No. The seeds are living things, because when they were given water they grew into seedlings.',
        keys: [['seeds are living', 'are living things', 'is a living', 'not correct'], ['grew', 'grow', 'germinate']],
        explain: 'A seed is living but resting. It needs water to start growing. Growing shows it is living.' },
      { id: 'liv-043', type: 'oeq', level: 2, marks: 2,
        stem: 'Ah Meng said, "Bacteria are not living things because we cannot see them." Explain why he is wrong.',
        figure: null,
        model: 'Bacteria are living things. They are too tiny to see with our eyes, but they can be seen with a microscope, and they grow and reproduce.',
        keys: [['are living', 'living things'], ['grow', 'reproduce', 'need food', 'need water', 'need air']],
        explain: 'Size does not decide if something is living. Markers look for "bacteria are living things" plus one characteristic of living things (grow, reproduce, need food/water/air).' },
      { id: 'liv-044', type: 'oeq', level: 1, marks: 2,
        stem: 'State one way bacteria are useful to us and one way bacteria are harmful to us.',
        figure: null,
        model: 'Useful: some bacteria are used to make yoghurt (or cheese) / break down dead plants and animals. Harmful: some bacteria cause diseases such as food poisoning / spoil food / cause tooth decay.',
        keys: [['yoghurt', 'cheese', 'break down', 'decompose', 'dead'], ['disease', 'sick', 'food poisoning', 'spoil', 'tooth decay', 'illness']],
        explain: 'One mark for a useful example, one mark for a harmful example. Making bread is yeast (a fungus), not bacteria.' },
      { id: 'liv-045', type: 'oeq', level: 1, marks: 1,
        stem: 'Name the group of living things that includes mushrooms, moulds and yeast.',
        figure: null,
        model: 'Fungi.',
        keys: [['fungi', 'fungus']],
        explain: 'Mushrooms, moulds and yeast are fungi. They are not plants and not animals.' },
      { id: 'liv-046', type: 'oeq', level: 2, marks: 2,
        stem: 'Siti said, "A mushroom is a plant." Is she correct? Explain your answer.',
        figure: null,
        model: 'No. A mushroom is a fungus. Unlike a plant, it cannot make its own food.',
        keys: [['fungus', 'fungi'], ['cannot make its own food', 'cannot make food', 'does not make its own food', 'cannot make its food']],
        explain: 'The key difference markers want: plants make their own food, fungi cannot. "No flowers or leaves" alone does not prove it, because ferns and mosses have no flowers either.' },
      { id: 'liv-047', type: 'oeq', level: 3, marks: 2,
        stem: 'State one way a fern and a mushroom are similar, and one way they are different.',
        figure: null,
        model: 'Similar: both reproduce by spores. Different: a fern can make its own food but a mushroom cannot.',
        keys: [['spores'], ['make its own food', 'makes its own food', 'own food', 'make food', 'leaves']],
        explain: 'Spores is the similarity. Making its own food is the big difference: a fern is a plant, a mushroom is a fungus. "A fern has green leaves but a mushroom has no leaves" is also accepted.' },
      { id: 'liv-048', type: 'oeq', level: 2, marks: 2,
        stem: 'The diagram shows a fern leaf and a close-up of the underside of one of its leaves. (a) What do the dots labelled X contain? (b) How does this help the fern?',
        figure: FERN,
        model: '(a) X contains spores. (b) The spores help the fern to reproduce; they can grow into new fern plants.',
        keys: [['spores', 'spore'], ['reproduce', 'new fern', 'new plants', 'new plant']],
        explain: 'Ferns have no flowers and no seeds. They reproduce by spores, found in the spore cases on the underside of the leaves.' },
      { id: 'liv-049', type: 'oeq', level: 2, marks: 2,
        stem: 'How is the way a moss plant reproduces different from the way a hibiscus plant reproduces?',
        figure: null,
        model: 'Moss has no flowers and reproduces by spores. The hibiscus is a flowering plant that reproduces by seeds.',
        keys: [['spores'], ['seeds', 'seed']],
        explain: 'Moss = non-flowering, spores. Hibiscus = flowering, seeds. One mark for each correct method.' },
      { id: 'liv-050', type: 'oeq', level: 2, marks: 1,
        stem: 'A pine tree has no flowers and does not reproduce by spores. How does a pine tree reproduce?',
        figure: null,
        model: 'It reproduces by seeds, which are found in its cones.',
        keys: [['seeds in cones', 'cones', 'cone']],
        explain: 'Pine trees are conifers: non-flowering plants whose seeds form in cones.' },
      { id: 'liv-051', type: 'oeq', level: 3, marks: 2,
        stem: 'Study the classification chart. (a) Suggest a suitable question for the box labelled "?". (b) Which group of living things do the fern and hibiscus both belong to?',
        figure: chart('Living things', { q: 'Can it make its own food?',
          yes: 'fern, hibiscus',
          no: { q: '?', yes: 'mushroom, bread mould', no: 'cat, eagle' } }),
        model: '(a) Does it reproduce by spores? (b) Plants.',
        keys: [['spores', 'spore'], ['plants', 'plant']],
        explain: 'Mushrooms and moulds reproduce by spores; cats and eagles do not. Other correct questions are accepted if they are true for both fungi and false for both animals. Living things that make their own food are plants.' },
      { id: 'liv-052', type: 'oeq', level: 2, marks: 2,
        stem: 'Some plants are sorted into two groups. (a) What characteristic was used to sort them? (b) How do the plants in Group A reproduce?',
        figure: table(['Group A', 'Group B'], [['fern', 'hibiscus'], ['moss', 'rambutan tree']]),
        model: '(a) Whether the plant has flowers (Group A has no flowers, Group B has flowers). (b) By spores.',
        keys: [['flowers', 'flower', 'flowering'], ['spores', 'spore']],
        explain: 'Ferns and mosses are non-flowering plants that reproduce by spores; hibiscus and rambutan trees are flowering plants.' },
      { id: 'liv-053', type: 'oeq', level: 2, marks: 2,
        stem: 'The table compares a whale with a fish. Using the table, give two reasons why a whale is a mammal and not a fish.',
        figure: table(['', 'Whale', 'Fish'],
          [['Breathes through', 'lungs', 'gills'], ['How it reproduces', 'gives birth to young alive', 'lays eggs'], ['Feeds young on milk?', 'yes', 'no']]),
        model: 'A whale breathes through lungs, not gills. It gives birth to its young alive and feeds its young on milk.',
        keys: [['lungs'], ['gives birth', 'young alive', 'milk']],
        explain: 'Living in water and having fins do not decide the group. Breathing through lungs and feeding young on milk are mammal characteristics.' },
      { id: 'liv-054', type: 'oeq', level: 2, marks: 2,
        stem: 'The diagram shows an animal. (a) Which group of animals does it belong to? (b) Give one characteristic from the diagram that helped you decide.',
        figure: insect(true, false),
        model: '(a) Insects. (b) It has 6 legs / 3 body parts / a pair of feelers.',
        keys: [['insect', 'insects'], ['six legs', '6 legs', 'three pairs of legs', 'three body parts', '3 body parts', 'feelers', 'antennae']],
        explain: 'Count carefully: 3 body parts, 6 legs, 2 feelers. Wings alone do not prove it is an insect: birds and bats have wings too.' },
      { id: 'liv-055', type: 'oeq', level: 2, marks: 2,
        stem: 'John said, "A penguin cannot fly, so it is not a bird." Is John correct? Explain.',
        figure: null,
        model: 'No. A penguin is a bird because it has feathers (and a beak, and lays eggs with hard shells). Not all birds can fly.',
        keys: [['is a bird', 'still a bird', 'not correct'], ['feathers', 'feather']],
        explain: 'Feathers are the characteristic only birds have. Flying is not: bats and insects fly, penguins and ostriches do not.' },
      { id: 'liv-056', type: 'oeq', level: 2, marks: 2,
        stem: 'A frog lays its eggs in water. (a) Which group of animals does a frog belong to? (b) State one other characteristic of this group.',
        figure: null,
        model: '(a) Amphibians. (b) They have moist skin / the young (tadpoles) live in water and breathe through gills / adults breathe through lungs and moist skin.',
        keys: [['amphibian', 'amphibians'], ['moist skin', 'moist', 'tadpole', 'gills', 'lungs and skin']],
        explain: 'Amphibians have moist skin. Their young live in water and breathe through gills; adults breathe through lungs and moist skin.' },
      { id: 'liv-057', type: 'oeq', level: 3, marks: 3,
        stem: 'The table shows information about animals P, Q, R and S. Name the group of animals that P, Q and S each belong to.',
        figure: TABLE_PQRS,
        model: 'P is a mammal. Q is a fish. S is a reptile. (R is a bird.)',
        keys: [['mammal'], ['fish'], ['reptile']],
        explain: 'P: fur and milk = mammal. Q: scales and gills = fish. S: dry scaly skin, lungs = reptile. One mark each.' },
      { id: 'liv-058', type: 'oeq', level: 3, marks: 2,
        stem: 'A shark is a fish. A dolphin is a mammal. Both live in the sea and have fins. State how the way they breathe is different.',
        figure: null,
        model: 'A dolphin breathes through lungs, but a shark breathes through gills.',
        keys: [['lungs'], ['gills']],
        explain: 'Mammals breathe through lungs (a dolphin comes up to the surface to breathe air). Fish breathe through gills.' },
      { id: 'liv-059', type: 'oeq', level: 3, marks: 3,
        stem: 'Mei Ling did an experiment with bread. (a) Which group of living things does bread mould belong to? (b) From her results, what conditions help mould to grow? Give two.',
        figure: TABLE_MOULD,
        model: '(a) Fungi. (b) Warmth and moisture: mould grows best when the bread is warm and damp.',
        keys: [['fungi', 'fungus'], ['warm', 'warmth'], ['damp', 'moist', 'water', 'wet']],
        explain: 'Compare A and B: only water is different, and B (damp) had more mould. Compare B and C: only temperature is different, and B (warm) had more mould.' },
      { id: 'liv-060', type: 'oeq', level: 3, marks: 2,
        stem: 'Look at Mei Ling\'s bread experiment again. (a) Why did she use the same type and size of bread for all three slices? (b) Which two slices should she compare to find out if temperature affects mould growth?',
        figure: TABLE_MOULD,
        model: '(a) To make it a fair test, so that only one thing is changed each time. (b) Slices B and C.',
        keys: [['fair test', 'fair', 'only one', 'one variable'], ['B and C', 'B, C', 'C and B']],
        explain: 'In a fair test, only the thing being tested changes. B and C are both damp; only the temperature is different (warm vs fridge).' },
      { id: 'liv-061', type: 'oeq', level: 1, marks: 1,
        stem: 'Yeast is a fungus. Name one food that is made using yeast.',
        figure: null,
        model: 'Bread.',
        keys: [['bread', 'buns', 'pau', 'dough']],
        explain: 'Yeast makes bread dough rise. (Yoghurt is made using bacteria, not yeast.)' }
    ]
  });
})();
