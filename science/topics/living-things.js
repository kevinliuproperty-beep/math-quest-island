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

  // Potted plant inside a box with one opening facing the light (set-up only; the stem is straight).
  var PLANT_BOX = '<svg viewBox="0 0 360 210" width="100%" style="max-width:360px;display:block;margin:6px auto" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="14">' +
    '<rect x="0" y="0" width="360" height="210" rx="8" fill="#fff"/>' +
    '<rect x="30" y="30" width="200" height="160" fill="#efe3c8" stroke="#6d4c41" stroke-width="4"/>' +
    '<rect x="224" y="58" width="12" height="40" fill="#fff"/>' +
    '<g stroke="#f9a825" stroke-width="2"><line x1="296" y1="66" x2="248" y2="66"/><line x1="296" y1="78" x2="248" y2="78"/><line x1="296" y1="90" x2="248" y2="90"/></g>' +
    '<g fill="#f9a825"><polygon points="242,66 250,62 250,70"/><polygon points="242,78 250,74 250,82"/><polygon points="242,90 250,86 250,94"/></g>' +
    '<circle cx="320" cy="78" r="18" fill="#ffd54f" stroke="#f9a825" stroke-width="2"/>' +
    '<text x="320" y="122" text-anchor="middle" fill="#222">light</text>' +
    '<text x="236" y="48" fill="#222">opening</text>' +
    '<text x="42" y="54" fill="#222">box</text>' +
    '<path d="M130 148 L130 82" stroke="#2e7d32" stroke-width="4" fill="none"/>' +
    '<ellipse cx="116" cy="112" rx="14" ry="6" fill="#66bb6a" transform="rotate(-25 116 112)"/>' +
    '<ellipse cx="144" cy="98" rx="14" ry="6" fill="#66bb6a" transform="rotate(25 144 98)"/>' +
    '<ellipse cx="130" cy="78" rx="6" ry="10" fill="#66bb6a"/>' +
    '<rect x="103" y="146" width="54" height="7" fill="#5d4037"/>' +
    '<polygon points="105,152 155,152 148,186 112,186" fill="#bf6f4a" stroke="#6d4c41" stroke-width="2"/></svg>';

  // Bar graph: number of tiny living things X counted each day (food used up by end of Day 3).
  var GRAPH_X = (function () {
    var v = [3, 6, 12, 24, 24, 14, 6], base = 190, k = 6.25;
    var s = '<svg viewBox="0 0 360 240" width="100%" style="max-width:360px;display:block;margin:6px auto" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="14">' +
      '<rect x="0" y="0" width="360" height="240" rx="8" fill="#fff"/>' +
      '<text x="8" y="22" fill="#222">Number of X</text>';
    [0, 6, 12, 18, 24].forEach(function (t) {
      var y = base - t * k;
      s += '<line x1="50" y1="' + y + '" x2="345" y2="' + y + '" stroke="#ddd"/>' +
           '<text x="44" y="' + (y + 5) + '" text-anchor="end" fill="#222" font-size="13">' + t + '</text>';
    });
    v.forEach(function (n, d) {
      var x = 75 + d * 40, h = n * k;
      s += '<rect x="' + (x - 13) + '" y="' + (base - h) + '" width="26" height="' + h + '" fill="#7986cb" stroke="#3949ab"/>' +
           '<text x="' + x + '" y="208" text-anchor="middle" fill="#222" font-size="13">' + d + '</text>';
    });
    return s + '<line x1="50" y1="' + base + '" x2="345" y2="' + base + '" stroke="#333" stroke-width="2"/>' +
      '<line x1="50" y1="34" x2="50" y2="' + base + '" stroke="#333" stroke-width="2"/>' +
      '<text x="198" y="232" text-anchor="middle" fill="#222">Day</text></svg>';
  })();

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
     ['Z', '&#10007;', '&#10007;', '&#10007;']]);

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
        body: 'Plants can make their own food. Flowering plants (hibiscus, rose, sunflower, mango tree, rice) have flowers and reproduce by seeds. Non-flowering plants have no flowers: ferns and mosses reproduce by spores (fern spores are found on the underside of the leaves). A fern or moss growing on a tree trunk or a wall still makes its own food; it does not take food from the tree or the wall.' },
      { title: 'Mammals and birds',
        body: 'Mammals: hair or fur, breathe through lungs, most give birth to young alive, feed their young on milk. A whale, dolphin and bat are MAMMALS (not fish, not birds). Birds: feathers, a beak, two wings and two legs, lay eggs with hard shells, breathe through lungs. A penguin and an ostrich cannot fly but are still BIRDS because they have feathers.' },
      { title: 'Fish, amphibians, reptiles',
        body: 'Fish: live in water, most have scales and fins, breathe through gills, most lay eggs. Amphibians (frog, toad): moist skin, lay eggs in water; the young (tadpoles) breathe through gills, adults breathe through lungs and moist skin. Reptiles (crocodile, snake, lizard, turtle): dry scaly skin, breathe through lungs, most lay eggs on land.' },
      { title: 'Insects (and the spider trap)',
        body: 'Insects have 3 body parts (head, thorax, abdomen), 6 legs (3 pairs) joined to the thorax, and 1 pair of feelers. Many have wings, but not all. Examples: ant, butterfly, beetle, grasshopper, mosquito. A SPIDER is NOT an insect: it has 8 legs and only 2 body parts.' },
      { title: 'Fungi',
        body: 'Mushrooms, moulds and yeast are FUNGI. Fungi are NOT plants: they cannot make their own food and they have no leaves, flowers or roots. They take in food from dead or decaying matter (and from food like bread). Mushrooms and moulds reproduce by spores. A mushroom and a fern both use spores, but they are in different groups: the fern makes its own food, the mushroom cannot. Yeast is used to make bread: it feeds on sugar.' },
      { title: 'Mould experiments',
        body: 'Mould needs water (moisture), warmth, air and food to grow. Toasted or dried food has very little water, so little or no mould grows. A fridge is cold, so mould grows more SLOWLY there, but it can still grow. Light is not needed: mould grows well in a dark cupboard. Fair test: change only ONE thing (e.g. damp or dry bread), keep everything else the same (type and size of bread, place, number of days), and measure the amount of mould (e.g. the number of mould spots).' },
      { title: 'Bacteria',
        body: 'Bacteria are living things. They are so tiny that we can only see them with a microscope. Some bacteria are useful (used to make yoghurt and cheese; break down dead plants and animals). Some are harmful (cause diseases such as food poisoning, spoil food, cause tooth decay). Being invisible does NOT make them non-living.' },
      { title: 'Reading a classification chart',
        body: 'Each question splits the group into YES and NO. The characteristic must be TRUE for every living thing on the YES side and FALSE for every one on the NO side. To find a missing label, test each option against EVERY living thing on both sides. Watch out: "Can it fly?" fails for penguins and bats; "Does it lay eggs?" fails because many groups lay eggs.' },
      { title: 'Exam traps to remember',
        body: 'Whale, dolphin, bat = mammals. Penguin, ostrich = birds. Spider = not an insect. Mushroom, mould, yeast = fungi, not plants. Ferns and mosses have no flowers and use spores. Bacteria are living. Moss (a plant) is not mould (a fungus).' }
    ],

    items: [
      // ---------------- Living vs non-living ----------------
      { id: 'liv-001', type: 'mcq', level: 2,
        stem: 'Ravi observed four things, P, Q, R and S, for some weeks. He recorded what he found in the table. Which one is most likely to be a living thing?',
        figure: table(['Thing', 'Needs air', 'Grows bigger', 'Makes young of its own kind'],
          [['P', '&#10003;', '&#10003;', '&#10007;'],
           ['Q', '&#10007;', '&#10003;', '&#10007;'],
           ['R', '&#10003;', '&#10003;', '&#10003;'],
           ['S', '&#10003;', '&#10007;', '&#10007;']]),
        options: ['P', 'Q', 'R', 'S'],
        answer: 2,
        explain: 'Only R grows AND makes young ones of its own kind. P needs air and gets bigger, like a fire, and Q gets bigger, like a crystal, but neither can reproduce. A living thing must be able to reproduce.' },
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
      { id: 'liv-005', type: 'mcq', level: 2,
        stem: 'Mei kept some guppies in a fish tank. Which observation shows that guppies can reproduce?',
        figure: null,
        options: ['They swam quickly towards the food she dropped in.', 'They grew from 1 cm to 3 cm long in two months.', 'Many tiny guppies appeared in the tank after a few weeks.', 'They needed clean water in the tank to stay alive.'],
        answer: 2,
        explain: 'Making young ones of their own kind (the tiny guppies) is reproduction. Swimming towards food is responding to a change, getting longer is growing, and needing clean water is a need for survival.' },
      { id: 'liv-006', type: 'mcq', level: 2,
        stem: 'Aisha measured the height of a bean seedling every three days. Her results are shown in the table. Which characteristic of living things do her results show?',
        figure: table(['Day', 'Height of seedling (cm)'], [['0', '3'], ['3', '5'], ['6', '8'], ['9', '12']]),
        options: ['Living things need air.', 'Living things reproduce.', 'Living things respond to changes.', 'Living things grow.'],
        answer: 3,
        explain: 'The seedling became taller every time it was measured (3 cm to 12 cm), so the results show that it grows. The table says nothing about air, young ones or changes around it.' },

      // ---------------- Plants ----------------
      { id: 'liv-007', type: 'mcq', level: 2,
        stem: 'Some moss is growing on a damp brick wall, where there is no soil. Ken said, "The moss gets its food from the bricks." Which statement is correct?',
        figure: null,
        options: ['Ken is wrong: moss is a plant, so it makes its own food.', 'Ken is right: moss takes in food from the bricks.', 'Ken is wrong: moss is a fungus, so it feeds on dead things.', 'Ken is wrong: moss is a plant, so it does not need food.'],
        answer: 0,
        explain: 'Moss is a non-flowering plant, and all plants make their own food. The wall only gives it a damp place to grow. Moss is not a fungus, and every living thing needs food.' },
      { id: 'liv-008', type: 'mcq', level: 2,
        stem: 'Plant K has green leaves but never has flowers. New K plants grow from tiny brown dust-like things that fall from the underside of its leaves. Which statement about plant K is correct?',
        figure: null,
        options: ['It is a fungus because it has no flowers.', 'It reproduces by spores.', 'It cannot make its own food.', 'It reproduces by seeds found in its fruits.'],
        answer: 1,
        explain: 'K is a non-flowering plant, like a fern: the dust-like things are spores. It is a plant, so it makes its own food. Fruits and seeds come from flowers, which K does not have.' },
      { id: 'liv-009', type: 'mcq', level: 2,
        stem: 'Which statement about non-flowering plants is correct?',
        figure: null,
        options: ['They cannot make their own food.', 'They reproduce by seeds found in fruits.', 'Ferns and mosses reproduce by spores.', 'They have flowers that are too small to see.'],
        answer: 2,
        explain: 'Ferns and mosses reproduce by spores. Seeds inside fruits come from flowers, so they belong to flowering plants. All plants, flowering or not, make their own food.' },

      // ---------------- Animals ----------------
      { id: 'liv-010', type: 'mcq', level: 2,
        stem: 'Animal T lives in the sea and swims with flippers. It comes up to the surface to breathe air through its lungs. It has dry scaly skin and lays its eggs in the sand on a beach. Which group does T belong to?',
        figure: null,
        options: ['Fish', 'Amphibians', 'Birds', 'Reptiles'],
        answer: 3,
        explain: 'Dry scaly skin, breathing through lungs and laying eggs on land make T a reptile (a sea turtle). Living in the sea does not make it a fish: fish breathe through gills. Amphibians have moist skin and lay eggs in water; birds have feathers.' },
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
      { id: 'liv-017', type: 'mcq', level: 2,
        stem: 'A pet shop keeps its frogs in a tank lined with damp moss. A worker sprays them with water every few hours so that their skin never dries out. Why is it important to keep a frog\'s skin moist?',
        figure: null,
        options: ['The frog also breathes through its moist skin.', 'The frog makes its own food through its skin.', 'The frog lays its eggs on its moist skin.', 'The frog\'s moist skin keeps its scales soft.'],
        answer: 0,
        explain: 'An adult frog (an amphibian) breathes through its lungs AND its moist skin. If its skin dries out, it cannot take in enough air. Frogs have no scales, and animals cannot make their own food.' },
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
      { id: 'liv-026', type: 'mcq', level: 2,
        stem: 'A mushroom and a fern both reproduce by spores. Why is the mushroom placed in a different group from the fern?',
        figure: null,
        options: ['The mushroom grows in damp places.', 'The mushroom is smaller than a fern.', 'The mushroom does not need water.', 'The mushroom cannot make its own food.'],
        answer: 3,
        explain: 'The fern is a plant and makes its own food. The mushroom is a fungus: it cannot make its own food and feeds on dead or decaying matter. Ferns also grow in damp places, size does not decide the group, and every living thing needs water.' },
      { id: 'liv-027', type: 'mcq', level: 1,
        stem: 'Which one of these is NOT a fungus?',
        figure: null,
        options: ['Mushroom', 'Bread mould', 'Yeast', 'Moss'],
        answer: 3,
        explain: 'Moss is a non-flowering plant: it makes its own food. Do not mix up moss (a plant) with mould (a fungus).' },
      { id: 'liv-028', type: 'mcq', level: 3,
        stem: 'Which of the following statements about a mushroom are correct?\nA  It reproduces by spores.\nB  It makes its own food.\nC  It takes in food from dead or decaying matter.\nD  It is a plant without flowers.',
        figure: null,
        options: ['A and B only', 'A and C only', 'B and D only', 'A, C and D only'],
        answer: 1,
        explain: 'A is correct: mushrooms reproduce by spores. C is correct: a mushroom feeds on dead or decaying matter. B is wrong: a mushroom cannot make its own food. D is wrong: a mushroom is a fungus, not a plant.' },
      { id: 'liv-029', type: 'mcq', level: 3,
        stem: 'Which of the following statements about bacteria are correct?\nA  They can only be seen with a microscope.\nB  Some of them cause food to spoil.\nC  All of them are harmful, so we should get rid of all bacteria.\nD  Some of them break down dead plants and animals.',
        figure: null,
        options: ['A and B only', 'A and C only', 'B, C and D only', 'A, B and D only'],
        answer: 3,
        explain: 'A, B and D are correct. Bacteria are living things too tiny to see without a microscope; some spoil food, and some are useful because they break down dead plants and animals. C is wrong: not all bacteria are harmful (some are used to make yoghurt and cheese).' },
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
      { id: 'liv-033', type: 'mcq', level: 2,
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
        stem: 'Study the classification chart. Which living things could be placed in Group Q and Group R?',
        figure: chart('Living things', { q: 'Can it make its own food?',
          yes: { q: 'Does it have flowers?', yes: 'Group P', no: 'Group Q' },
          no: 'Group R' }),
        options: ['Q: moss; R: mushroom', 'Q: mushroom; R: moss', 'Q: fern; R: hibiscus', 'Q: rose; R: yeast'],
        answer: 0,
        explain: 'Group Q makes its own food but has no flowers: a non-flowering plant such as moss. Group R cannot make its own food: a mushroom (a fungus) fits. A mushroom cannot go in Q because it cannot make its own food; hibiscus and rose have flowers, so they belong in P.' },
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
        stem: 'The table shows information about living things W, X, Y and Z. Which statement is correct?',
        figure: TABLE_WXYZ,
        options: ['W is a fungus because it reproduces by spores.', 'X is a plant because it has no flowers.', 'Y reproduces by seeds.', 'Z could be a moss.'],
        answer: 2,
        explain: 'Y makes its own food and has flowers, so it is a flowering plant and reproduces by seeds. W makes its own food, so it is a plant (like a fern), not a fungus. X cannot make its own food, so it is not a plant (it could be a mushroom). Z cannot make its own food, so it cannot be a moss.' },
      { id: 'liv-039', type: 'mcq', level: 3,
        stem: 'The table shows information about living things W, X, Y and Z. Which TWO of them are NOT plants?',
        figure: TABLE_WXYZ,
        options: ['W and X', 'X and Z', 'Y and Z', 'W and Y'],
        answer: 1,
        explain: 'All plants make their own food. X and Z cannot, so they are not plants. X reproduces by spores but cannot make its own food, like a mushroom (a fungus); Z could be an animal. W (spores, no flowers) and Y (flowers) are both plants.' },

      // ---------------- OEQ ----------------
      { id: 'liv-040', type: 'oeq', level: 3, marks: 3,
        stem: 'Sam put one grasshopper into each of three similar glass jars, P, Q and R, and kept the jars in the same place. The table shows what each jar had.\n(a) In which jar is the grasshopper likely to live the longest? (1 mark)\n(b) The grasshopper in jar Q died first. Explain why. (2 marks)',
        figure: table(['Jar', 'Lid', 'Fresh leaves (food)', 'Damp cotton wool (water)'],
          [['P', 'with air holes', '&#10003;', '&#10003;'],
           ['Q', 'airtight, no air holes', '&#10003;', '&#10003;'],
           ['R', 'with air holes', '&#10007;', '&#10003;']]),
        model: '(a) Jar P. (b) The lid of jar Q has no air holes, so no fresh air could enter the jar. The grasshopper needs air to survive, so it died when the air in the jar was used up.',
        keys: [['jar P'], ['no air holes', 'no fresh air', 'airtight', 'no air'], ['needs air', 'need air', 'air to survive', 'air to live']],
        explain: 'Only jar P gives the grasshopper all three things it needs: food, water and air. In (b), one mark for the evidence (no air holes, so no fresh air) and one for the reason (living things need air to survive). The grasshopper in R had no food, but it could still get air.' },
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
      { id: 'liv-044', type: 'oeq', level: 2, marks: 2,
        stem: 'Jun said, "All bacteria are harmful, so we should get rid of every kind of bacteria." Do you agree? Explain your answer using one example.',
        figure: null,
        model: 'No, I do not agree. Not all bacteria are harmful; some bacteria are useful. For example, some bacteria are used to make yoghurt (or cheese), and some break down dead plants and animals.',
        keys: [['not all', 'some bacteria are useful', 'useful', 'do not agree', 'disagree'], ['yoghurt', 'cheese', 'break down', 'decompose', 'dead']],
        explain: 'One mark for disagreeing because some bacteria are useful, one mark for a correct useful example. Making bread uses yeast (a fungus), not bacteria, so it does not earn the example mark.' },
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
      { id: 'liv-047', type: 'oeq', level: 2, marks: 2,
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
        stem: 'Ming saw a patch of moss on a damp wall. Over a few months, new patches of moss appeared further along the wall, although moss never has flowers or seeds. How does moss reproduce?',
        figure: null,
        model: 'Moss reproduces by spores.',
        keys: [['spores', 'spore']],
        explain: 'Moss is a non-flowering plant. Its tiny spores are carried by wind or water and grow into new moss plants where it is damp.' },
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
      { id: 'liv-057', type: 'oeq', level: 2, marks: 3,
        stem: 'The table shows information about animals P, Q, R and S. Name the group of animals that P, Q and S each belong to.',
        figure: TABLE_PQRS,
        model: 'P is a mammal. Q is a fish. S is a reptile. (R is a bird.)',
        keys: [['mammal'], ['fish'], ['reptile']],
        explain: 'P: fur and milk = mammal. Q: scales and gills = fish. S: dry scaly skin, lungs = reptile. One mark each.' },
      { id: 'liv-058', type: 'oeq', level: 2, marks: 2,
        stem: 'A shark is a fish. A dolphin is a mammal. Both live in the sea and have fins. State how the way they breathe is different.',
        figure: null,
        model: 'A dolphin breathes through lungs, but a shark breathes through gills.',
        keys: [['lungs'], ['gills']],
        explain: 'Mammals breathe through lungs (a dolphin comes up to the surface to breathe air). Fish breathe through gills.' },
      { id: 'liv-059', type: 'oeq', level: 3, marks: 3,
        stem: 'Mei Ling left three slices of bread for 5 days, as shown in the table.\n(a) Which group of living things does bread mould belong to? (1 mark)\n(b) From her results, state two conditions that help mould to grow. (2 marks)',
        figure: TABLE_MOULD,
        model: '(a) Fungi. (b) Warmth and moisture: mould grows best when the bread is warm and damp.',
        keys: [['fungi', 'fungus'], ['warm', 'warmth'], ['damp', 'moist', 'water', 'wet']],
        explain: 'Compare A and B: only water is different, and B (damp) had more mould. Compare B and C: only temperature is different, and B (warm) had more mould.' },
      { id: 'liv-060', type: 'oeq', level: 3, marks: 2,
        stem: 'Mei Ling left three slices of bread for 5 days, as shown in the table.\n(a) Why did she use the same type and size of bread for all three slices? (1 mark)\n(b) Which two slices should she compare to find out if temperature affects mould growth? (1 mark)',
        figure: TABLE_MOULD,
        model: '(a) To make it a fair test, so that only one thing is changed each time. (b) Slices B and C.',
        keys: [['fair test', 'fair', 'only one', 'one variable'], ['B and C', 'B, C', 'C and B']],
        explain: 'In a fair test, only the thing being tested changes. B and C are both damp; only the temperature is different (warm vs fridge).' },
      { id: 'liv-061', type: 'oeq', level: 1, marks: 1,
        stem: 'Yeast is a fungus. Name one food that is made using yeast.',
        figure: null,
        model: 'Bread.',
        keys: [['bread', 'buns', 'pau', 'dough']],
        explain: 'Yeast makes bread dough rise. (Yoghurt is made using bacteria, not yeast.)' },

      // ---------------- Exam-style set-ups (hardness calibration, 2026-10-07) ----------------
      { id: 'liv-062', type: 'oeq', level: 3, marks: 3,
        stem: 'Jun placed a potted plant inside a box with one opening on its side. The opening faced a sunny window, as shown. He watered the plant every day.\n(a) Predict how the stem of the plant will look after one week. (1 mark)\n(b) Which characteristic of living things does your answer to (a) show? (1 mark)\n(c) Why did Jun water the plant every day? (1 mark)',
        figure: PLANT_BOX,
        model: '(a) The stem will bend and grow towards the opening (towards the light). (b) Living things respond to changes around them. (c) The plant needs water to survive.',
        keys: [['towards the opening', 'towards the light', 'towards the window', 'bend towards', 'grow towards'], ['respond'], ['needs water', 'need water', 'water to survive', 'water to live', 'stay alive']],
        explain: 'Light only enters through the opening, so the stem grows towards it: the plant is responding to a change around it (light from one side). All living things need water to survive, so Jun kept watering it.' },
      { id: 'liv-063', type: 'mcq', level: 3,
        stem: 'Lina put a few tiny living things X into a dish of food and kept the dish in a warm place. Each day she counted the number of X using a microscope. By the end of Day 3, all the food in the dish had been used up. The graph shows her results.\nWhich of the following statements are correct?\nA  X can reproduce.\nB  X needs food to survive.\nC  X is non-living because it can only be seen with a microscope.',
        figure: GRAPH_X,
        options: ['A only', 'A and B only', 'B and C only', 'A, B and C'],
        answer: 1,
        explain: 'A: the number of X doubled each day from Day 0 to Day 3, so X made more of its own kind. B: after the food was used up, the number of X fell from Day 4 to Day 6, so X needs food to survive. C is wrong: being too tiny to see without a microscope does not make something non-living (bacteria are living).' },
      { id: 'liv-064', type: 'mcq', level: 3,
        stem: 'Which of the following statements are correct?\nA  Frogs and turtles both lay eggs.\nB  A frog\'s moist skin helps it to breathe.\nC  A crocodile breathes through gills when it swims underwater.\nD  A lizard has dry scaly skin.',
        figure: null,
        options: ['A and C only', 'B and D only', 'A, B and D only', 'B, C and D only'],
        answer: 2,
        explain: 'A: frogs (amphibians) and turtles (reptiles) both lay eggs. B: an adult frog breathes through its lungs and its moist skin. D: lizards are reptiles with dry scaly skin. C is wrong: a crocodile is a reptile and breathes through lungs; it comes up to the surface for air.' },
      { id: 'liv-065', type: 'mcq', level: 3,
        stem: 'Jia Hui sprinkled water on two identical slices of bread and sealed each slice in a plastic bag. She kept bag P in a dark kitchen cupboard and bag Q in the fridge. The table shows her results.\nWhich of the following statements are correct?\nA  Mould grows better in warm places than in cold places.\nB  Mould needs light to grow.\nC  Keeping bread in the fridge slows down the growth of mould.\nD  Mould makes its own food.',
        figure: table(['Bag', 'Kept in', 'Mould after 5 days'],
          [['P', 'dark cupboard (warm)', 'a lot'], ['Q', 'fridge (cold)', 'very little']]),
        options: ['A and B only', 'A and C only', 'B and D only', 'C and D only'],
        answer: 1,
        explain: 'Only the temperature was different, and the warm bread (P) grew much more mould, so A and C are correct. B is wrong: bag P was in a dark cupboard and still grew a lot of mould. D is wrong: mould is a fungus and takes in food from the bread.' },
      { id: 'liv-066', type: 'oeq', level: 3, marks: 4,
        stem: 'Ben toasted a slice of bread until it was dry and crisp. He left another slice of the same bread untoasted. He sealed each slice in a plastic bag and kept both bags in the same cupboard for 6 days. The table shows his results.\n(a) What is the aim of Ben\'s experiment? (1 mark)\n(b) State one variable Ben must keep the same to make it a fair test. (1 mark)\n(c) Explain why no mould grew on the bread in bag K. (2 marks)',
        figure: table(['Bag', 'Bread', 'Mould after 6 days'],
          [['J', 'untoasted (soft)', 'a lot'], ['K', 'toasted (dry and crisp)', 'none']]),
        model: '(a) To find out whether toasting the bread (making it dry) affects the amount of mould that grows on it. (b) The type of bread / the size of the slice / the place where the bags were kept / the number of days. (c) Toasting removed most of the water from the bread in bag K, so it was dry. Mould needs water (moisture) to grow, so no mould grew on it.',
        keys: [['toasting', 'toasted', 'amount of water', 'dry'], ['type of bread', 'size', 'same cupboard', 'place', 'temperature', 'number of days', 'type of bag'], ['dry', 'no water', 'little water', 'less water', 'removed most of the water', 'removed the water'], ['mould needs water', 'needs water to grow', 'needs moisture', 'water to grow']],
        explain: 'Ben changed only one thing: whether the bread was toasted. (c) is marked Claim + Reason: the toasted bread had very little water (claim/evidence), and mould needs water to grow (reason). Mould also needs warmth, air and food, but both bags had those.' },
      { id: 'liv-067', type: 'oeq', level: 3, marks: 3,
        stem: 'Ah Hock sealed a slice of bread in a plastic bag and kept it in the fridge. He said, "No mould will ever grow on this bread because it is in the fridge."\n(a) Do you agree with him? Explain your answer. (2 marks)\n(b) Mould cannot make its own food. How does the mould on bread get its food? (1 mark)',
        figure: null,
        model: '(a) No, I do not agree. The fridge is cold, and cold only slows down the growth of mould. The bread still has water (moisture), air and food, so mould can still grow on it slowly. (b) The mould takes in food from the bread that it grows on.',
        keys: [['slows down', 'slowly', 'slower'], ['still has water', 'water', 'moisture', 'air'], ['from the bread', 'feeds on the bread', 'takes in food from']],
        explain: 'A fridge does not stop mould; it makes it grow more slowly. The bread in the bag still gives mould water, air and food. Mould is a fungus: it takes in food from the bread.' },
      { id: 'liv-068', type: 'oeq', level: 3, marks: 4,
        stem: 'Kumar put two pieces of the same cake into two similar covered containers, A and B. He sprinkled water on the cake in B only. He kept both containers on the same kitchen shelf. After 4 days, he counted the mould spots on each piece of cake.\n(a) What did Kumar change in his experiment? (1 mark)\n(b) What can Kumar conclude from his results? (1 mark)\n(c) Kumar then set up container C, the same as B but kept in the fridge. Predict whether C will have more or fewer mould spots than B after 4 days. Explain your answer. (2 marks)',
        figure: table(['Container', 'Water sprinkled on cake?', 'Number of mould spots after 4 days'],
          [['A', 'no', '3'], ['B', 'yes', '18']]),
        model: '(a) Whether water was sprinkled on the cake (the amount of water in the cake). (b) Mould grows better on food that is damp than on food that is dry. (c) C will have fewer mould spots than B, because the fridge is cold and mould grows more slowly in cold places than in warm places.',
        keys: [['water', 'moisture', 'damp'], ['grows better', 'more mould', 'damp food'], ['fewer', 'less'], ['cold', 'temperature']],
        explain: 'Only the water was changed, so the extra mould on B (18 spots vs 3) came from the water. In (c), one mark for "fewer" and one for the reason: the fridge is cold, and mould grows more slowly in the cold.' },
      { id: 'liv-069', type: 'oeq', level: 3, marks: 3,
        stem: 'The table describes four adult animals, W, X, Y and Z. They are sorted using the classification chart below the table.\n(a) Suggest a suitable question for box (a). (1 mark)\n(b) Suggest a suitable question for box (b). (1 mark)\n(c) Which group of animals does Y belong to? (1 mark)',
        figure: table(['Animal', 'Body covering', 'Breathes through', 'How it reproduces'],
          [['W', 'hair', 'lungs', 'gives birth to young alive'],
           ['X', 'feathers', 'lungs', 'lays eggs with hard shells'],
           ['Y', 'moist skin', 'lungs and moist skin', 'lays eggs in water'],
           ['Z', 'scales', 'gills', 'lays eggs in water']]) +
          chart('Animals W, X, Y, Z', { q: '(a) ?', yes: 'W', no: { q: '(b) ?', yes: 'X', no: { q: 'Does it breathe through gills?', yes: 'Z', no: 'Y' } } }),
        model: '(a) Does it give birth to its young alive? / Does it have hair? (b) Does it have feathers? / Does it lay eggs with hard shells (on land)? (c) Amphibians.',
        keys: [['give birth', 'young alive', 'hair', 'fur', 'milk'], ['feathers', 'hard shells', 'on land'], ['amphibian']],
        explain: 'Box (a) must be YES for W only: only W gives birth to young alive and has hair. Box (b) must be YES for X but NO for Y and Z: only X has feathers. "Does it breathe through lungs?" fails, because W, X and Y all do. Y has moist skin and lays eggs in water, so it is an amphibian.' },
      { id: 'liv-070', type: 'oeq', level: 3, marks: 4,
        stem: 'On a nature walk, Mei found two living things, F and G.\nF was growing on the trunk of a tree. It had green leaves with rows of brown dots on their underside.\nG was growing on a rotting log. It had no leaves. When Mei shook G over a sheet of paper, a fine brown powder fell out.\n(a) Mei said, "F takes its food from the tree it grows on." Do you agree? Explain. (2 marks)\n(b) State one way F and G are similar. (1 mark)\n(c) How does G get its food? (1 mark)',
        figure: null,
        model: '(a) No, I do not agree. F has green leaves, so it is a plant (a fern), and plants make their own food. F only grows on the tree trunk; it does not take food from the tree. (b) Both F and G reproduce by spores (the brown dots and the brown powder contain spores). (c) G takes in food from the rotting log (dead or decaying matter), because it cannot make its own food.',
        keys: [['plant', 'fern', 'green leaves'], ['makes its own food', 'make their own food', 'make its own food', 'own food'], ['spores', 'spore', 'need water', 'need air'], ['rotting log', 'dead', 'decaying', 'rotting']],
        explain: 'F is a fern: a plant, so it makes its own food; the tree trunk is only a place to grow. G is a mushroom: a fungus with no leaves that feeds on dead or decaying matter. Both reproduce by spores, which is why they are easy to mix up, but they are in different groups.' },
      { id: 'liv-071', type: 'oeq', level: 3, marks: 3,
        stem: 'Animal K lives in the sea. It can leap out of the water and glide through the air for some distance using its large, wing-like fins. Its body is covered with scales and it breathes through gills.\n(a) Which group of animals does K belong to? (1 mark)\n(b) Lina said, "K is a bird because it can fly." Explain why she is wrong. (2 marks)',
        figure: null,
        model: '(a) Fish. (b) Being able to fly does not make an animal a bird. K has no feathers, but all birds have feathers. K has scales and breathes through gills, which are characteristics of fish.',
        keys: [['fish'], ['no feathers', 'feathers'], ['gills', 'scales']],
        explain: 'Flying is not a characteristic of one group: birds, bats and many insects fly, and penguins cannot. Birds are the animals with feathers. Scales, fins and gills make K a fish (a flying fish).' },
      { id: 'liv-072', type: 'oeq', level: 2, marks: 2,
        stem: 'A dugong lives in the sea. It has a tail fin and two flippers. It comes up to the surface to breathe air, gives birth to its young alive and feeds its young on milk. Jay said, "A dugong is a fish because it has fins and lives in water." Do you agree? Explain.',
        figure: null,
        model: 'No, I do not agree. A dugong is a mammal because it feeds its young on milk and gives birth to young alive. It breathes air through its lungs, but fish breathe through gills.',
        keys: [['mammal'], ['milk', 'young alive', 'lungs', 'breathe air']],
        explain: 'Fins and living in water do not decide the group. Feeding young on milk is a mammal characteristic, like the whale and dolphin.' },
      { id: 'liv-073', type: 'oeq', level: 3, marks: 3,
        stem: 'Wei sorted some living things into two groups, as shown in the table.\n(a) Suggest a suitable heading for Group X. (1 mark)\n(b) Suggest a suitable heading for Group Y. (1 mark)\n(c) Wei wrote "Non-flowering plants" as the heading for Group X. Explain why this heading is not correct. (1 mark)',
        figure: table(['Group X', 'Group Y'], [['fern', 'hibiscus'], ['moss', 'mango tree'], ['mushroom', 'rose'], ['bread mould', '']]),
        model: '(a) Living things that reproduce by spores / do not have flowers. (b) Living things that reproduce by seeds / have flowers (flowering plants). (c) The mushroom and bread mould are fungi, not plants, so not everything in Group X is a plant.',
        keys: [['spores', 'no flowers', 'do not have flowers', 'without flowers'], ['seeds', 'have flowers', 'flowering plants'], ['fungi', 'fungus', 'not plants', 'not a plant']],
        explain: 'A heading must fit EVERY member of the group. Fern, moss, mushroom and bread mould all reproduce by spores and have no flowers. The trap in (c): mushrooms and moulds are fungi, so "plants" does not fit them.' },
      { id: 'liv-074', type: 'mcq', level: 3,
        stem: 'The table describes four animals, K, L, M and N. They are sorted using the classification chart. Which question could be written in the box labelled "?"',
        figure: table(['Animal', 'Body covering', 'How it reproduces'],
          [['K', 'hair', 'gives birth to young alive'],
           ['L', 'moist skin', 'lays eggs in water'],
           ['M', 'dry scaly skin', 'lays eggs on land'],
           ['N', 'feathers', 'lays eggs with hard shells']]) +
          chart('Animals K, L, M, N', { q: 'Does it lay eggs?', yes: { q: '?', yes: 'L', no: 'M, N' }, no: 'K' }),
        options: ['Does it lay its eggs in water?', 'Does it breathe through its lungs?', 'Does it have dry scaly skin?', 'Does it have feathers on its body?'],
        answer: 0,
        explain: 'Only L lays its eggs in water; M and N lay eggs on land. "Lungs" cannot split them, because adult L, M and N all breathe through lungs. "Dry scaly skin" would put M on the YES side, and "feathers" would put N on the YES side.' },
      { id: 'liv-075', type: 'mcq', level: 3,
        stem: 'Hana put the same amount of warm water into three similar bottles, A, B and C. She added the things shown in the table and stretched a balloon over the mouth of each bottle. Which conclusion can she make from her results?',
        figure: table(['Bottle', 'Added to the warm water', 'Balloon after 30 minutes'],
          [['A', 'yeast and sugar', 'became bigger'], ['B', 'sugar only', 'no change'], ['C', 'yeast only', 'no change']]),
        options: ['Sugar alone can make the balloon become bigger.', 'Warm water makes the balloon become bigger.', 'Yeast needs sugar to make the balloon become bigger.', 'Yeast alone can make the balloon become bigger.'],
        answer: 2,
        explain: 'Yeast is a living fungus. In A it took in the sugar as food and gave out a gas that filled the balloon. B shows sugar without yeast does nothing; C shows yeast without sugar (food) does nothing. All three had warm water, so warm water alone is not the cause.' },
      { id: 'liv-076', type: 'mcq', level: 3,
        stem: 'Siva set up four slices of the same bread as shown in the table. Which two set-ups should he compare to find out whether mould needs air to grow?',
        figure: table(['Set-up', 'Bread', 'Where it was kept', 'Mould after 5 days'],
          [['A', 'damp', 'warm, open dish', 'a lot'],
           ['B', 'dry', 'warm, open dish', 'very little'],
           ['C', 'damp', 'cold, open dish in the fridge', 'very little'],
           ['D', 'damp', 'warm, jar with the air pumped out', 'none']]),
        options: ['A and B', 'B and C', 'C and D', 'A and D'],
        answer: 3,
        explain: 'A fair test changes only ONE thing. A and D are both damp and warm; the only difference is that D has no air. D grew no mould, so mould needs air. B and C change water or temperature, not air.' },
      { id: 'liv-077', type: 'oeq', level: 3, marks: 2,
        stem: 'Mrs Tan set up two cups of warm milk, P and Q, as shown in the table, and kept them in a warm place for 8 hours.\n(a) What living things in the spoonful of yoghurt turned the milk in cup P into yoghurt? (1 mark)\n(b) Why did Mrs Tan set up cup Q? (1 mark)',
        figure: table(['Cup', 'What was put in', 'After 8 hours'],
          [['P', 'warm milk + 1 spoonful of yoghurt', 'thick and sour (yoghurt)'], ['Q', 'warm milk only', 'no change']]),
        model: '(a) Bacteria. (b) To compare with cup P, to show that the milk turned into yoghurt only because of the bacteria in the yoghurt (milk alone does not become yoghurt).',
        keys: [['bacteria'], ['compare', 'to show', 'only because', 'milk alone']],
        explain: 'Yoghurt contains useful bacteria that turn milk into yoghurt. Cup Q has no added bacteria and did not change, so the comparison shows the bacteria caused the change in P.' },
      { id: 'liv-078', type: 'mcq', level: 3,
        stem: 'Which of the following statements about a fern and a mushroom are correct?\nA  Both reproduce by spores.\nB  Both make their own food.\nC  Both need air and water to survive.\nD  Both have no flowers.',
        figure: null,
        options: ['A and B only', 'B and D only', 'A, C and D only', 'A, B, C and D'],
        answer: 2,
        explain: 'A, C and D are correct: ferns and mushrooms both reproduce by spores, have no flowers, and (like all living things) need air and water. B is wrong: the fern makes its own food, but the mushroom is a fungus and cannot.' }
    ]
  });
})();
