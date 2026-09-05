"use strict";
/* Math Quest Island island map registry: level -> topic nodes -> skills.
 * MAP_NODES drives which islands render for the selected grade (GRADES).
 * A node with status:'locked' renders as "Coming soon" and is not playable;
 * a content lane unlocks one by shipping js/topics/<file>.js AND flipping
 * status to 'live' here. Nothing else in the app needs editing.
 */
const MAP_NODES=[
  /* ---- P2 ---- */
  {id:'p2',        e:'🏖️', name:'Number Beach',        blurb:'Add, subtract, number bonds & first tables (P2)', grades:['P2']},
  /* ---- P3 ---- */
  {id:'p3numbers', e:'🏝️', name:'Thousand Isles',      blurb:'Numbers up to 10 000: place value, compare & order (P3)', grades:['P3']},
  {id:'tables',    e:'🌋', name:'Times Table Volcano', blurb:'Multiplication & division facts (P2, P3)', grades:['P2','P3']},
  {id:'p3divide',  e:'🐚', name:'Remainder Reef',      blurb:'Division with remainder & the long algorithms. TYPE your answer! (P3)', grades:['P3']},
  {id:'fractions', e:'🌳', name:'Fraction Forest',     blurb:'Halves, quarters and fraction magic (P3)', grades:['P3']},
  {id:'p3money',   e:'💵', name:'Hawker Coins',        blurb:'Adding & subtracting money in dollars and cents. TYPE your answer! (P3)', grades:['P3']},
  {id:'p3measure', e:'📏', name:'Compound Cove',       blurb:'Length, mass & volume in compound units (P3)', grades:['P3']},
  {id:'p3bargraph',e:'📊', name:'Data Docks',          blurb:'Reading bar graphs, including scaled axes (P3)', grades:['P3']},
  {id:'geometry',  e:'🏰', name:'Perimeter Palace',    blurb:'Area & perimeter of squares and rectangles (P3, P4)', grades:['P3','P4']},
  {id:'heuristics',e:'🧩', name:'Puzzle Caves',        blurb:'Patterns & puzzles. TYPE your answer, no choices!', grades:['P2','P3','P4','P5','P6']},
  /* ---- P4 ---- */
  {id:'p4numbers', e:'🏝️', name:'Ten Thousand Bay',    blurb:'Numbers to 100 000: place value, rounding & patterns (P4)', grades:['P4']},
  {id:'p4factors', e:'🐚', name:'Factor Reef',         blurb:'Factors, multiples and what they share (P4)', grades:['P4']},
  {id:'decimals',  e:'🌊', name:'Decimal Bay',         blurb:'Tenths, hundredths, rounding & decimal sums (P4)', grades:['P4']},
  /* ---- P5 ---- */
  {id:'p5numbers', e:'🔟', name:'Ten Million Trench',  blurb:'Numbers to 10 million, powers of ten & order of operations (P5)', grades:['P5']},
  {id:'p5percent', e:'💯', name:'Percent Peak',        blurb:'Percentage of a whole, discounts, GST & interest (P5)', grades:['P5']},
  {id:'p5triangle',e:'📐', name:'Triangle Terrace',    blurb:'Area of a triangle, base, height & composites (P5)', grades:['P5']},
  {id:'p5volume',  e:'🧊', name:'Cuboid Quarry',       blurb:'Volume of cubes, cuboids and tanks of water (P5)', grades:['P5']},
  /* ---- still locked: no topic file has shipped for these ---- */
  {id:'angles',    e:'🏛️', name:'Angle Ruins',         blurb:'Coming soon (P4, P5)', locked:true, status:'locked', grades:['P4','P5']},
  {id:'percent',   e:'⛰️', name:'Percentage Peak',     blurb:'Coming soon (P6)', locked:true, status:'locked', grades:['P6']},
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
