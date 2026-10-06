"use strict";
/* Demo topic owned by the science shell lane. It exercises every item shape the
   contract allows (mcq, oeq, SVG figure, HTML-table figure) so the shell can be
   tested before the content lanes land. The shell only shows it when no real topic
   has loaded, or with ?sample=1. Exempt from the 40-item floor in validate.mjs. */
SCI.registerTopic({
  id: '_sample',
  title: 'Sample topic', emoji: '🧪',
  theme: 'Skills',
  moeRef: 'Demo only: a mix of items from several P3 topics (para)',
  notes: [
    { title: 'Living things', body: 'Living things need air, food and water. They grow, respond to changes around them and reproduce.\nA mushroom is a living thing: it is a fungus, not a plant.' },
    { title: 'Parts of a plant', body: 'Roots hold the plant firmly in the soil and take in water and mineral salts.\nThe stem holds the plant upright and carries water and food.\nLeaves make food for the plant.' },
    { title: 'Magnetic materials', body: 'A magnet attracts magnetic materials: iron, steel, nickel and cobalt.\nPlastic, wood, glass, copper and aluminium are non-magnetic materials.' },
    { title: 'A fair test', body: 'In a fair test, change only ONE variable and keep all the other variables the same.\nThen any difference in the results is caused by the variable you changed.' }
  ],
  items: [
    { id: 'smp-001', type: 'mcq', level: 1,
      stem: 'Which one of the following is a living thing?',
      figure: null,
      options: ['A stone', 'A mushroom', 'A toy robot', 'A cloud'],
      answer: 1,
      explain: 'A mushroom is a fungus. It grows, needs water and food, and reproduces by spores, so it is a living thing. A toy robot can move, but it does not grow or reproduce.' },
    { id: 'smp-002', type: 'mcq', level: 2,
      stem: 'The diagram shows a plant. Which part, A, B, C or D, takes in water from the soil?',
      figure: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 250" role="img" aria-label="A plant with parts labelled A to D">' +
        '<rect x="0" y="160" width="320" height="90" fill="#E9D8B4"/>' +
        '<line x1="0" y1="160" x2="320" y2="160" stroke="#8A6B3A" stroke-width="2"/>' +
        '<path d="M150 160 L150 60" stroke="#3E8E41" stroke-width="6" fill="none"/>' +
        '<path d="M150 120 C120 100 100 110 92 124 C112 132 132 130 150 120 Z" fill="#5DBB63" stroke="#2F6B31" stroke-width="2"/>' +
        '<path d="M150 100 C180 80 202 88 210 102 C190 112 170 110 150 100 Z" fill="#5DBB63" stroke="#2F6B31" stroke-width="2"/>' +
        '<circle cx="150" cy="48" r="10" fill="#FFC53D"/>' +
        '<g fill="#F47B9B" stroke="#B0405E" stroke-width="1.5"><circle cx="150" cy="30" r="10"/><circle cx="168" cy="48" r="10"/><circle cx="150" cy="66" r="10"/><circle cx="132" cy="48" r="10"/></g>' +
        '<circle cx="150" cy="48" r="8" fill="#FFC53D"/>' +
        '<path d="M150 160 L150 200 M150 175 L125 205 M150 175 L175 210 M150 190 L135 225 M150 190 L168 230" stroke="#7A5230" stroke-width="3" fill="none"/>' +
        '<g stroke="#2B2540" stroke-width="1.5"><line x1="164" y1="36" x2="250" y2="30"/><line x1="200" y1="96" x2="250" y2="96"/><line x1="152" y1="140" x2="250" y2="140"/><line x1="172" y1="208" x2="250" y2="212"/></g>' +
        '<g font-family="sans-serif" font-size="18" font-weight="700" fill="#2B2540"><text x="256" y="36">A</text><text x="256" y="102">B</text><text x="256" y="146">C</text><text x="256" y="218">D</text></g>' +
        '</svg>',
      options: ['A', 'B', 'C', 'D'],
      answer: 3,
      explain: 'D points to the roots. Roots take in water and mineral salts from the soil and hold the plant firmly in the ground.' },
    { id: 'smp-003', type: 'mcq', level: 3,
      stem: 'Mei Ling let the same toy car roll down the same ramp onto three different surfaces. She measured how far the car travelled each time. Her results are shown in the table. Which variable did she change in her experiment?',
      figure: '<table><caption>Distance the toy car travelled</caption><tr><th>Surface</th><th>Distance (cm)</th></tr><tr><td>Sandpaper</td><td>30</td></tr><tr><td>Carpet</td><td>45</td></tr><tr><td>Wooden floor</td><td>110</td></tr></table>',
      options: ['The distance the car travelled', 'The type of surface', 'The height of the ramp', 'The size of the toy car'],
      answer: 1,
      explain: 'The variable she changed is the type of surface. The distance travelled is what she measured. The ramp height and the car were kept the same to make it a fair test.' },
    { id: 'smp-004', type: 'mcq', level: 1,
      stem: 'Which animal has a three-stage life cycle?',
      figure: null,
      options: ['Butterfly', 'Mosquito', 'Cockroach', 'Beetle'],
      answer: 2,
      explain: 'A cockroach has three stages: egg, nymph, adult. The butterfly, mosquito and beetle each have four stages, including a pupa.' },
    { id: 'smp-005', type: 'oeq', level: 2, marks: 2,
      stem: 'Ravi brought a magnet near a steel paper clip and a plastic ruler. Only the paper clip was attracted to the magnet. Explain why.',
      figure: null,
      model: 'The paper clip is made of steel, which is a magnetic material. The ruler is made of plastic, which is a non-magnetic material.',
      keys: [['steel', 'magnetic material'], ['plastic', 'non-magnetic', 'not magnetic']],
      explain: 'Name the material of each object, and use the words "magnetic material" and "non-magnetic material".' },
    { id: 'smp-006', type: 'oeq', level: 3, marks: 2,
      stem: 'Look at Mei Ling\'s experiment in the table. Why did she use the same toy car and the same ramp each time?',
      figure: '<table><caption>Distance the toy car travelled</caption><tr><th>Surface</th><th>Distance (cm)</th></tr><tr><td>Sandpaper</td><td>30</td></tr><tr><td>Carpet</td><td>45</td></tr><tr><td>Wooden floor</td><td>110</td></tr></table>',
      model: 'To make it a fair test, so that the type of surface is the only variable changed and it is the only thing that affects how far the car travels.',
      keys: [['fair test'], ['only variable', 'only one variable', 'only thing', 'only the surface']],
      explain: 'Say "fair test" and say that only ONE variable (the surface) was changed.' }
  ]
});
