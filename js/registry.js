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
  {id:'p4ops',     e:'✖️', name:'Long Sum Landing',    blurb:'Long multiplication & division, and what is left over (P4)', grades:['P4']},
  {id:'p4fractions',e:'🥧', name:'Mixed Number Cove',  blurb:'Mixed numbers, fraction of a set, adding & subtracting (P4)', grades:['P4']},
  {id:'p4area',    e:'📏', name:'Missing Side Marsh',  blurb:'Missing sides and composite shapes. TYPE your answer! (P4)', grades:['P4']},
  {id:'p4data',    e:'📈', name:'Line Graph Lagoon',   blurb:'Reading tables and line graphs, and comparing points (P4)', grades:['P4']},
  /* ---- P5 ---- */
  {id:'p5numbers', e:'🔟', name:'Ten Million Trench',  blurb:'Numbers to 10 million, powers of ten & order of operations (P5)', grades:['P5']},
  {id:'p5percent', e:'💯', name:'Percent Peak',        blurb:'Percentage of a whole, discounts, GST & interest (P5)', grades:['P5']},
  {id:'p5triangle',e:'📐', name:'Triangle Terrace',    blurb:'Area of a triangle, base, height & composites (P5)', grades:['P5']},
  {id:'p5volume',  e:'🧊', name:'Cuboid Quarry',       blurb:'Volume of cubes, cuboids and tanks of water (P5)', grades:['P5']},
  {id:'p5fractions',e:'🥭', name:'Mixed Number Mangrove', blurb:'Division as a fraction, fractions as decimals, mixed numbers & multiplying (P5)', grades:['P5']},
  {id:'p5decimals',e:'⚓', name:'Thousandth Straits',   blurb:'Multiplying & dividing decimals by 10, 100, 1000 and converting units (P5)', grades:['P5']},
  {id:'p5rate',    e:'🚰', name:'Rate Rapids',         blurb:'Rate, total amount and number of units. TYPE your answer! (P5)', grades:['P5']},
  /* Angle Ruins ships P5-only. The MOE angle sub-strand (straight line, at a point,
     vertically opposite, unknown angles) is p.42 = PRIMARY FIVE; the locked stub used
     to advertise it to P4 too, which no topic file backs. grades is ['P5']. */
  {id:'angles',    e:'🏛️', name:'Angle Ruins',        blurb:'Angles on a line, at a point and vertically opposite (P5)', grades:['P5']},
  /* ---- still locked: no topic file has shipped for these ---- */
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
