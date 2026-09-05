"use strict";
/* Math Quest Island island map registry: level -> topic nodes -> skills.
 * MAP_NODES drives which islands render for the selected grade (GRADES).
 * A node with status:'locked' renders as "Coming soon" and is not playable;
 * a content lane unlocks one by shipping js/topics/<file>.js AND flipping
 * status to 'live' here. Nothing else in the app needs editing.
 */
const MAP_NODES=[
  {id:'p2',        e:'🏖️', name:'Number Beach',        blurb:'Add, subtract, number bonds & first tables (P2)', grades:['P2']},
  {id:'fractions', e:'🌳', name:'Fraction Forest',     blurb:'Halves, quarters and fraction magic (P3)', grades:['P3']},
  {id:'tables',    e:'🌋', name:'Times Table Volcano', blurb:'Multiplication & division facts (P2, P3)', grades:['P2','P3']},
  {id:'geometry',  e:'🏰', name:'Perimeter Palace',    blurb:'Area & perimeter of squares and rectangles (P3, P4)', grades:['P3','P4']},
  {id:'heuristics',e:'🧩', name:'Puzzle Caves',        blurb:'Patterns & puzzles. TYPE your answer, no choices!', grades:['P2','P3','P4','P5','P6']},
  {id:'decimals',  e:'🌊', name:'Decimal Bay',         blurb:'Coming soon (P4)', locked:true, status:'locked', grades:['P4']},
  {id:'angles',    e:'🏛️', name:'Angle Ruins',         blurb:'Coming soon (P4, P5)', locked:true, status:'locked', grades:['P4','P5']},
  {id:'percent',   e:'⛰️', name:'Percentage Peak',     blurb:'Coming soon (P5, P6)', locked:true, status:'locked', grades:['P5','P6']},
  {id:'algebra',   e:'🌀', name:'Algebra Atoll',       blurb:'Coming soon (P6)', locked:true, status:'locked', grades:['P6']}
];

/* every node without an explicit status is live */
MAP_NODES.forEach(n => { if (!n.status) n.status = 'live'; });

const GRADES=['P2','P3','P4','P5','P6'];

/* level -> playable topic node ids (derived; do not hand-maintain) */
const LEVEL_NODES = GRADES.reduce((acc, g) => {
  acc[g] = MAP_NODES.filter(n => n.grades.includes(g)).map(n => n.id);
  return acc;
}, {});

MQI.mapNodes = MAP_NODES;
MQI.grades = GRADES;
MQI.levelNodes = LEVEL_NODES;
/* skills per node, read straight off the registered topic (locked nodes have none yet) */
MQI.skillsFor = id => (MQI.topics[id] ? Object.keys(MQI.topics[id].skills) : []);
