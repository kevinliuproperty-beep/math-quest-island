"use strict";
// P3 Science — Diversity of Materials (MOE Primary Science Syllabus 2023, Diversity theme).
// Syllabus properties: strength, flexibility, ability to float/sink in water, waterproof, transparency.
// Deliberately excluded: hardness (not in the 2023 property list) and heat conduction (P4 Heat).

// ---------- shared figures (data only) ----------
const MAT_FIG_STRENGTH_SETUP = `<svg viewBox="0 0 320 170" width="100%" style="max-width:340px" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="12" fill="none" stroke="currentColor">
  <rect x="10" y="50" width="70" height="14"/><line x1="18" y1="64" x2="18" y2="150"/><line x1="72" y1="64" x2="72" y2="150"/>
  <rect x="240" y="50" width="70" height="14"/><line x1="248" y1="64" x2="248" y2="150"/><line x1="302" y1="64" x2="302" y2="150"/>
  <rect x="60" y="44" width="200" height="6" stroke-width="2"/>
  <line x1="160" y1="50" x2="160" y2="80"/>
  <rect x="148" y="80" width="24" height="12"/><rect x="148" y="94" width="24" height="12"/><rect x="148" y="108" width="24" height="12"/>
  <text x="105" y="36" fill="currentColor" stroke="none">strip of material</text>
  <text x="180" y="104" fill="currentColor" stroke="none">weights</text>
  <text x="22" y="164" fill="currentColor" stroke="none">desk</text>
  <text x="256" y="164" fill="currentColor" stroke="none">desk</text>
</svg>`;

const MAT_FIG_FLEX_SETUP = `<svg viewBox="0 0 320 170" width="100%" style="max-width:340px" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="12" fill="none" stroke="currentColor">
  <rect x="10" y="44" width="110" height="18"/><line x1="20" y1="62" x2="20" y2="150"/><line x1="110" y1="62" x2="110" y2="150"/>
  <rect x="88" y="30" width="20" height="40"/>
  <line x1="108" y1="40" x2="250" y2="40" stroke-dasharray="4 3"/>
  <path d="M108 42 Q180 46 248 72" stroke-width="3"/>
  <line x1="248" y1="72" x2="248" y2="96"/><rect x="234" y="96" width="28" height="22"/>
  <rect x="280" y="26" width="14" height="110"/>
  <line x1="280" y1="40" x2="286" y2="40"/><line x1="280" y1="56" x2="286" y2="56"/><line x1="280" y1="72" x2="286" y2="72"/><line x1="280" y1="88" x2="286" y2="88"/>
  <line x1="266" y1="40" x2="266" y2="72" stroke-width="1.5"/><path d="M262 66 L266 72 L270 66"/>
  <text x="76" y="22" fill="currentColor" stroke="none">clamp</text>
  <text x="130" y="30" fill="currentColor" stroke="none">strip (before)</text>
  <text x="150" y="84" fill="currentColor" stroke="none">strip bends</text>
  <text x="226" y="134" fill="currentColor" stroke="none">mass</text>
  <text x="272" y="152" fill="currentColor" stroke="none">ruler</text>
  <text x="40" y="164" fill="currentColor" stroke="none">table</text>
</svg>`;

const MAT_FIG_LIGHT_SETUP = `<svg viewBox="0 0 320 120" width="100%" style="max-width:340px" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="12" fill="none" stroke="currentColor">
  <rect x="10" y="48" width="60" height="24" rx="4"/><path d="M70 48 L84 40 L84 80 L70 72"/>
  <line x1="90" y1="60" x2="140" y2="60" stroke-dasharray="4 3"/><path d="M134 56 L140 60 L134 64"/>
  <rect x="148" y="24" width="10" height="72"/>
  <line x1="164" y1="60" x2="220" y2="60" stroke-dasharray="4 3"/><path d="M214 56 L220 60 L214 64"/>
  <rect x="226" y="44" width="60" height="32" rx="4"/>
  <text x="22" y="98" fill="currentColor" stroke="none">torch</text>
  <text x="120" y="112" fill="currentColor" stroke="none">sheet of material</text>
  <text x="228" y="98" fill="currentColor" stroke="none">light sensor</text>
</svg>`;

const MAT_TBL_STRENGTH = `<table><tr><th>Material</th><th>Number of weights the strip held before it broke</th></tr>
<tr><td>A</td><td>5</td></tr><tr><td>B</td><td>12</td></tr><tr><td>C</td><td>2</td></tr><tr><td>D</td><td>8</td></tr></table>`;

const MAT_TBL_FLEX = `<table><tr><th>Material</th><th>How far the end of the strip moved down (cm)</th></tr>
<tr><td>P</td><td>2</td></tr><tr><td>Q</td><td>9</td></tr><tr><td>R</td><td>5</td></tr><tr><td>S</td><td>0</td></tr></table>`;

const MAT_TBL_WATER = `<table><tr><th>Material</th><th>Volume of water at the start (ml)</th><th>Volume of water left after 5 minutes (ml)</th></tr>
<tr><td>W</td><td>50</td><td>50</td></tr><tr><td>X</td><td>50</td><td>32</td></tr><tr><td>Y</td><td>50</td><td>45</td></tr><tr><td>Z</td><td>50</td><td>50</td></tr></table>`;

const MAT_TBL_KEN = `<table><tr><th>Material</th><th>Length of strip (cm)</th><th>Number of weights held before it broke</th></tr>
<tr><td>Wood</td><td>20</td><td>6</td></tr><tr><td>Plastic</td><td>30</td><td>3</td></tr><tr><td>Metal</td><td>20</td><td>10</td></tr></table>`;

// Labelled objects (part letters only; the stem says what each part must do).
const MAT_FIG_TENT = `<svg viewBox="0 0 360 200" width="100%" style="max-width:360px" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="15" fill="none" stroke="currentColor" stroke-width="2">
  <polygon points="70,160 180,40 290,160"/>
  <polygon points="180,92 214,160 196,160" fill="currentColor" fill-opacity="0.15"/>
  <line x1="180" y1="92" x2="150" y2="160"/>
  <rect x="50" y="160" width="260" height="10" fill="currentColor" fill-opacity="0.3"/>
  <line x1="205" y1="132" x2="290" y2="104" stroke-width="1.2"/>
  <text x="296" y="110" fill="currentColor" stroke="none" font-weight="bold">X</text>
  <line x1="90" y1="170" x2="70" y2="188" stroke-width="1.2"/>
  <text x="50" y="196" fill="currentColor" stroke="none" font-weight="bold">G</text>
  <text x="196" y="196" fill="currentColor" stroke="none">wet grass</text>
</svg>`;

const MAT_FIG_MOP = `<svg viewBox="0 0 360 200" width="100%" style="max-width:360px" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="15" fill="none" stroke="currentColor" stroke-width="2">
  <line x1="110" y1="16" x2="200" y2="132" stroke-width="7"/>
  <rect x="186" y="128" width="30" height="12"/>
  <path d="M190 140 L160 186 M195 140 L178 188 M200 140 L196 190 M205 140 L214 190 M210 140 L232 188 M214 140 L250 184"/>
  <line x1="150" y1="70" x2="250" y2="56" stroke-width="1.2"/>
  <text x="256" y="62" fill="currentColor" stroke="none" font-weight="bold">Y</text>
  <line x1="240" y1="170" x2="296" y2="150" stroke-width="1.2"/>
  <text x="302" y="156" fill="currentColor" stroke="none" font-weight="bold">X</text>
</svg>`;

const MAT_FIG_SWING = `<svg viewBox="0 0 360 210" width="100%" style="max-width:360px" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="15" fill="none" stroke="currentColor" stroke-width="2">
  <line x1="40" y1="30" x2="320" y2="30" stroke-width="5"/>
  <line x1="60" y1="30" x2="30" y2="196" stroke-width="4"/><line x1="300" y1="30" x2="330" y2="196" stroke-width="4"/>
  <line x1="150" y1="30" x2="150" y2="150"/><line x1="210" y1="30" x2="210" y2="150"/>
  <rect x="134" y="150" width="92" height="12" fill="currentColor" fill-opacity="0.2"/>
  <line x1="10" y1="196" x2="350" y2="196"/>
  <line x1="212" y1="90" x2="252" y2="80" stroke-width="1.2"/>
  <text x="258" y="86" fill="currentColor" stroke="none" font-weight="bold">X</text>
  <line x1="226" y1="158" x2="256" y2="172" stroke-width="1.2"/>
  <text x="262" y="180" fill="currentColor" stroke="none" font-weight="bold">Y</text>
</svg>`;

const MAT_FIG_BOAT = `<svg viewBox="0 0 360 200" width="100%" style="max-width:360px" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="15" fill="none" stroke="currentColor" stroke-width="2">
  <line x1="180" y1="26" x2="180" y2="140" stroke-width="3"/>
  <polygon points="184,32 184,130 262,130" fill="currentColor" fill-opacity="0.12"/>
  <path d="M80 140 L280 140 L250 172 L110 172 Z" fill="currentColor" fill-opacity="0.2"/>
  <path d="M20 172 Q40 164 60 172 T100 172 T140 172 T180 172 T220 172 T260 172 T300 172 T340 172"/>
  <line x1="220" y1="100" x2="290" y2="76" stroke-width="1.2"/>
  <text x="296" y="82" fill="currentColor" stroke="none" font-weight="bold">X</text>
  <line x1="262" y1="156" x2="300" y2="140" stroke-width="1.2"/>
  <text x="306" y="146" fill="currentColor" stroke="none" font-weight="bold">Y</text>
  <text x="24" y="194" fill="currentColor" stroke="none">water</text>
</svg>`;

const MAT_FIG_HOSE = `<svg viewBox="0 0 360 190" width="100%" style="max-width:360px" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="15" fill="none" stroke="currentColor" stroke-width="2">
  <line x1="10" y1="20" x2="10" y2="90" stroke-width="4"/>
  <rect x="10" y="40" width="40" height="16"/><path d="M42 56 L42 68"/>
  <path d="M42 68 C 42 160, 140 170, 170 140 S 230 60, 300 80 S 340 160, 320 176" stroke-width="7"/>
  <polygon points="190,150 250,150 242,184 198,184" fill="currentColor" fill-opacity="0.15"/>
  <path d="M220 150 L210 126 M220 150 L230 124 M220 150 L220 120"/>
  <line x1="300" y1="80" x2="316" y2="40" stroke-width="1.2"/>
  <text x="312" y="34" fill="currentColor" stroke="none" font-weight="bold">X</text>
  <text x="60" y="30" fill="currentColor" stroke="none">tap</text>
  <text x="120" y="186" fill="currentColor" stroke="none">plant pot</text>
</svg>`;

const MAT_FIG_FLOW = `<svg viewBox="0 0 360 226" width="100%" style="max-width:360px" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="14" fill="none" stroke="currentColor" stroke-width="1.5">
  <rect x="55" y="6" width="250" height="34" rx="6"/>
  <text x="180" y="28" text-anchor="middle" fill="currentColor" stroke="none">Allows light to pass through?</text>
  <line x1="130" y1="40" x2="90" y2="88"/><line x1="230" y1="40" x2="270" y2="88"/>
  <text x="74" y="66" text-anchor="end" fill="currentColor" stroke="none">Yes</text>
  <text x="262" y="66" fill="currentColor" stroke="none">No</text>
  <rect x="15" y="88" width="150" height="34" rx="6"/>
  <text x="90" y="110" text-anchor="middle" fill="currentColor" stroke="none">Is it flexible?</text>
  <rect x="195" y="88" width="150" height="34" rx="6"/>
  <text x="270" y="110" text-anchor="middle" fill="currentColor" stroke="none">Floats on water?</text>
  <line x1="60" y1="122" x2="40" y2="180"/><line x1="120" y1="122" x2="140" y2="180"/>
  <line x1="240" y1="122" x2="220" y2="180"/><line x1="300" y1="122" x2="320" y2="180"/>
  <text x="44" y="156" text-anchor="end" fill="currentColor" stroke="none">Yes</text>
  <text x="134" y="156" fill="currentColor" stroke="none">No</text>
  <text x="224" y="156" text-anchor="end" fill="currentColor" stroke="none">Yes</text>
  <text x="314" y="156" fill="currentColor" stroke="none">No</text>
  <rect x="15" y="180" width="50" height="34" rx="6"/><text x="40" y="203" text-anchor="middle" fill="currentColor" stroke="none" font-weight="bold">A</text>
  <rect x="115" y="180" width="50" height="34" rx="6"/><text x="140" y="203" text-anchor="middle" fill="currentColor" stroke="none" font-weight="bold">B</text>
  <rect x="195" y="180" width="50" height="34" rx="6"/><text x="220" y="203" text-anchor="middle" fill="currentColor" stroke="none" font-weight="bold">C</text>
  <rect x="295" y="180" width="50" height="34" rx="6"/><text x="320" y="203" text-anchor="middle" fill="currentColor" stroke="none" font-weight="bold">D</text>
</svg>`;

const MAT_TBL_SWING = `<table><tr><th>Material</th><th>Strong?</th><th>Flexible?</th><th>Waterproof?</th></tr>
<tr><td>E</td><td>Yes</td><td>Yes</td><td>No</td></tr><tr><td>F</td><td>Yes</td><td>No</td><td>Yes</td></tr>
<tr><td>G</td><td>No</td><td>Yes</td><td>Yes</td></tr><tr><td>H</td><td>No</td><td>No</td><td>Yes</td></tr></table>`;

const MAT_TBL_BOAT = `<table><tr><th>Material</th><th>Waterproof?</th><th>Flexible?</th><th>Floats?</th></tr>
<tr><td>P</td><td>Yes</td><td>Yes</td><td>No</td></tr><tr><td>Q</td><td>Yes</td><td>No</td><td>Yes</td></tr>
<tr><td>R</td><td>No</td><td>Yes</td><td>Yes</td></tr><tr><td>S</td><td>Yes</td><td>No</td><td>No</td></tr></table>`;

const MAT_TBL_MOP = `<table><tr><th>Material</th><th>Absorbs water?</th><th>Strong?</th><th>Flexible?</th></tr>
<tr><td>P</td><td>Yes</td><td>No</td><td>Yes</td></tr><tr><td>Q</td><td>No</td><td>Yes</td><td>No</td></tr>
<tr><td>R</td><td>No</td><td>No</td><td>Yes</td></tr></table>`;

SCI.registerTopic({
  id: "materials",
  title: "Materials", emoji: "🪵",
  theme: "Diversity",
  moeRef: "Relate the use of various types of materials (wood, metal, ceramic, rubber, glass, plastic, fabric) to their physical properties; compare the physical properties of materials based on strength, flexibility, ability to float/sink in water, waterproof and transparency (para)",
  notes: [
    { title: "Objects are made of materials",
      body: "Common materials: wood, metal, plastic, glass, rubber, fabric (cloth), ceramic and paper. One object can be made of more than one material. Example: a pair of scissors has metal blades and a plastic handle. We choose a material because of its properties." },
    { title: "Strength",
      body: "Strength is the ability of a material to hold heavy loads without breaking. Metal and wood are strong. Paper tears easily, so it is not strong. Glass and ceramic break easily when they are dropped or knocked. To compare strength, count how many weights a strip can hold before it breaks: more weights = stronger." },
    { title: "Flexibility",
      body: "Flexibility is the ability of a material to bend without breaking. Rubber, cloth, paper and many plastics are flexible. Glass and ceramic are not flexible: they break instead of bending. Thin metal (like aluminium foil) can be flexible too." },
    { title: "Waterproof",
      body: "A waterproof material does NOT absorb water. Plastic, rubber, glass, metal and ceramic are waterproof. Cotton cloth, paper and sponge absorb water, so they are not waterproof. Useful for raincoats, umbrellas, boots and cups." },
    { title: "Float or sink",
      body: "An object floats if it stays on or near the surface of the water. Wood, cork and polystyrene float. Glass marbles, steel nails, coins and ceramic sink. Plastics can float or sink depending on the plastic, so test it to find out!" },
    { title: "Transparent, translucent, opaque",
      body: "These three words tell us how much light a material allows to pass through. Learn each word AND what it means: markers often give the mark for the meaning. TRANSPARENT: allows most light to pass through, so we can see clearly through it (clear glass, clear plastic). TRANSLUCENT: allows some light to pass through, so things seen through it look blurry (frosted glass, tracing paper). OPAQUE: does not allow light to pass through, so we cannot see through it at all (wood, metal, ceramic, cardboard). In an answer, write both: 'Clear glass is transparent. It allows most light to pass through, so we can see outside clearly.'" },
    { title: "Answering 'why is it made of...?'",
      body: "Markers want TWO parts: the property + why it suits the use. Example: 'Plastic is waterproof (property), so the raincoat does not absorb rain and keeps the body dry (use).' Just writing 'plastic is good' gets no marks." },
    { title: "Fair test experiments",
      body: "Change only ONE thing: the type of material. Keep everything else the same: size, length and thickness of the strips, the mass of each weight, the amount of water. Measure the result (number of weights, how far it bends, volume of water left). Repeat the experiment to make the results more reliable." },
    { title: "Reading results tables",
      body: "Strength: held MORE weights before breaking = stronger. Flexibility: bent MORE (moved down further) = more flexible. Waterproof: LESS water left in the beaker = the material absorbed more water. If no water was absorbed, the material is waterproof. Coloured water rose HIGHER up a strip = the strip is more absorbent. For a tray or shelf that must stay flat, choose the strip that bent the LEAST. Sunglasses need a material that allows only SOME light through, not the most and not none. A material must have EVERY property a part needs: a viewing-deck floor must be transparent AND strong." }
  ],
  items: [
    // ---------------- MCQ, level 1 ----------------
    { id: "mat-001", type: "mcq", level: 2,
      stem: "The picture shows a garden hose joined to a tap. Part X must be able to bend around the plant pot without breaking. Which property must the material of part X have?",
      figure: MAT_FIG_HOSE,
      options: ["Strength", "Transparency", "Flexibility", "Ability to float"],
      answer: 2,
      explain: "To bend around the pot without breaking, the hose must be flexible. Strength is holding a heavy load without breaking, which is not what the hose needs here." },
    { id: "mat-002", type: "mcq", level: 2,
      stem: "The picture shows a tent. Part G is the groundsheet, which lies on the wet grass. Which property of the groundsheet material keeps the sleeping bags inside the tent dry?",
      figure: MAT_FIG_TENT,
      options: ["It is waterproof.", "It is flexible.", "It floats on water.", "It is transparent."],
      answer: 0,
      explain: "A waterproof material does not let water pass through and does not absorb it, so the wet grass cannot make the sleeping bags wet. Being flexible lets the groundsheet be folded, but it does not keep things dry." },
    { id: "mat-003", type: "mcq", level: 1,
      stem: "Which material allows most light to pass through it?",
      figure: null,
      options: ["Wood", "Ceramic", "Metal", "Clear glass"],
      answer: 3,
      explain: "Clear glass allows most light to pass through, so we can see clearly through it: it is transparent. Wood, ceramic and metal do not allow light to pass through: they are opaque." },
    { id: "mat-004", type: "mcq", level: 1,
      stem: "Which of these objects will float on water?",
      figure: null,
      options: ["A steel nail", "A glass marble", "A wooden ice-cream stick", "A metal coin"],
      answer: 2,
      explain: "Wood floats on water. Steel nails, glass marbles and metal coins sink." },
    { id: "mat-005", type: "mcq", level: 2,
      stem: "The picture shows a mop. Part X is the mop head. It must soak up water that is spilt on the floor. Which material is the most suitable for part X?",
      figure: MAT_FIG_MOP,
      options: ["Cotton strands", "Plastic strips", "Rubber strips", "Metal wires"],
      answer: 0,
      explain: "Cotton absorbs water, so the mop head can soak up the spill. Plastic, rubber and metal are waterproof: they do not absorb water, so they would only push the water around." },
    { id: "mat-006", type: "mcq", level: 2,
      stem: "The picture shows a swing in a playground. Part X holds up the seat. It must hold a child's weight without breaking. Which property of the material is the most important for part X?",
      figure: MAT_FIG_SWING,
      options: ["Transparency", "Waterproof", "Strength", "Ability to float"],
      answer: 2,
      explain: "Strength is the ability to hold a heavy load without breaking. Part X must hold up the child, so it must be strong." },
    { id: "mat-007", type: "mcq", level: 2,
      stem: "The picture shows a toy sailboat. Part X is the sail. The sail must be rolled up tightly when the boat is not in use. Which material is the most suitable for part X?",
      figure: MAT_FIG_BOAT,
      options: ["Thin plastic sheet", "Thick glass sheet", "Thick wooden board", "Thin ceramic tile"],
      answer: 0,
      explain: "To be rolled up, the sail must bend without breaking: it must be flexible. A thin plastic sheet is flexible. Glass and ceramic break instead of bending, and a thick wooden board hardly bends." },
    { id: "mat-008", type: "mcq", level: 1,
      stem: "The blades of a pair of scissors are made of metal. Why?",
      figure: null,
      options: ["Metal is strong.", "Metal allows light to pass through.", "Metal floats on water.", "Metal absorbs water."],
      answer: 0,
      explain: "Metal is strong, so the blades do not break when cutting. Metal does not let light through, sinks, and does not absorb water." },
    { id: "mat-009", type: "mcq", level: 1,
      stem: "Which material breaks most easily when it is dropped on the floor?",
      figure: null,
      options: ["Rubber", "Cloth", "Plastic", "Glass"],
      answer: 3,
      explain: "Glass is not strong and breaks easily when dropped. Rubber, cloth and plastic usually do not break." },
    { id: "mat-010", type: "mcq", level: 1,
      stem: "Which material allows only SOME light to pass through, so things seen through it look blurry?",
      figure: null,
      options: ["Tracing paper", "Clear glass", "A wooden board", "A metal tray"],
      answer: 0,
      explain: "Tracing paper is translucent: it allows some light to pass through. Clear glass is transparent: it allows most light to pass through. Wood and metal are opaque: they do not allow light to pass through." },
    { id: "mat-051", type: "mcq", level: 1,
      stem: "A material that allows most light to pass through is ______.",
      figure: null,
      options: ["opaque", "translucent", "transparent", "waterproof"],
      answer: 2,
      explain: "Transparent means it allows most light to pass through, so we can see clearly through it, like clear glass. Translucent allows only some light through. Opaque does not allow light to pass through." },
    { id: "mat-052", type: "mcq", level: 2,
      stem: "Ahmad sleeps in a bright room. He wants a sleeping mask that stops the light from reaching his eyes. The part of the mask that covers his eyes should be made of a material that is ______.",
      figure: null,
      options: ["transparent", "opaque", "translucent", "waterproof"],
      answer: 1,
      explain: "Opaque means it does not allow light to pass through, so no light reaches his eyes. A transparent material allows most light through and a translucent one allows some light through, so the room would still look bright." },

    // ---------------- MCQ, level 2 ----------------
    { id: "mat-011", type: "mcq", level: 2,
      stem: "Mrs Tan wants a tablecloth that can be folded easily. Which property of the material is the most important?",
      figure: null,
      options: ["Strength", "Flexibility", "Ability to float", "Transparency"],
      answer: 1,
      explain: "To fold the tablecloth, the material must bend without breaking, so it must be flexible." },
    { id: "mat-012", type: "mcq", level: 2,
      stem: "Balloons are made of rubber. Which property of rubber makes it suitable?",
      figure: null,
      options: ["Rubber is flexible and can stretch without breaking.", "Rubber allows most light to pass through.", "Rubber absorbs water.", "Rubber sinks in water."],
      answer: 0,
      explain: "A balloon must stretch as air is blown in. Rubber is flexible, so it bends and stretches without breaking." },
    { id: "mat-013", type: "mcq", level: 2,
      stem: "A fish tank must hold water and let us see the fish clearly. Which material is the most suitable?",
      figure: null,
      options: ["Wood", "Cloth", "Ceramic", "Glass"],
      answer: 3,
      explain: "Glass is waterproof AND transparent: it allows most light to pass through, so we can see the fish. Wood and ceramic are opaque: they do not allow light to pass through. Cloth absorbs water." },
    { id: "mat-014", type: "mcq", level: 2,
      stem: "A shower curtain must be waterproof and flexible. Which material is the most suitable?",
      figure: null,
      options: ["Paper", "Plastic", "Glass", "Wood"],
      answer: 1,
      explain: "Plastic is waterproof and flexible. Paper absorbs water; glass and wood are not flexible." },
    { id: "mat-015", type: "mcq", level: 2,
      stem: "Bathroom floor tiles are often made of ceramic. Which property of ceramic makes it suitable?",
      figure: null,
      options: ["It is waterproof.", "It is flexible.", "It allows most light to pass through.", "It floats on water."],
      answer: 0,
      explain: "The bathroom floor gets wet. Ceramic is waterproof, so the tiles do not absorb the water." },
    { id: "mat-016", type: "mcq", level: 2,
      stem: "Which object is correctly matched to a property of its material?",
      figure: null,
      options: ["Window glass: does not allow light to pass through", "Paper bag: waterproof", "Ceramic bowl: flexible", "Rubber gloves: waterproof"],
      answer: 3,
      explain: "Rubber is waterproof. Window glass allows most light through, paper absorbs water, and ceramic is not flexible." },
    { id: "mat-017", type: "mcq", level: 2,
      stem: "Mei wants her bathroom window to let light in, but she does not want people outside to see in clearly. Which material should she use?",
      figure: null,
      options: ["Clear glass", "Frosted glass", "Wood", "Metal"],
      answer: 1,
      explain: "Frosted glass is translucent: it allows some light to pass through, so the room is bright but people cannot see in clearly. Clear glass is transparent, so people could see in. Wood and metal are opaque: they do not allow light to pass through, so the room would be dark." },
    { id: "mat-018", type: "mcq", level: 2,
      stem: "Raju wants to build a small raft that floats and can carry a heavy load without breaking. Which material is the most suitable?",
      figure: null,
      options: ["Glass", "Ceramic", "Paper", "Wood"],
      answer: 3,
      explain: "Wood floats and is strong. Glass and ceramic sink and break easily. Paper absorbs water and is not strong." },
    { id: "mat-053", type: "mcq", level: 2,
      stem: "Which material is correctly matched to how much light passes through it?",
      figure: null,
      options: ["Clear plastic: opaque", "Cardboard: transparent", "Tracing paper: opaque", "Frosted glass: translucent"],
      answer: 3,
      explain: "Frosted glass is translucent: it allows some light to pass through, so things look blurry. Clear plastic is transparent (allows most light through). Cardboard is opaque (does not allow light to pass through). Tracing paper is translucent, not opaque." },
    { id: "mat-019", type: "mcq", level: 2,
      stem: "Plates for young children are often made of plastic instead of ceramic. Why?",
      figure: null,
      options: ["Plastic allows most light to pass through.", "Plastic absorbs water.", "Plastic does not break easily when dropped.", "Plastic sinks in water."],
      answer: 2,
      explain: "Young children may drop their plates. Ceramic breaks easily, but plastic usually does not, so the child will not get hurt by sharp pieces." },
    { id: "mat-020", type: "mcq", level: 2,
      stem: "Siti hung weights one at a time on strips of different materials until each strip broke. The results are shown. Which material is the strongest?",
      figure: MAT_TBL_STRENGTH,
      options: ["A", "B", "C", "D"],
      answer: 1,
      explain: "B held the most weights (12) before it broke, so B is the strongest. C is the weakest." },
    { id: "mat-021", type: "mcq", level: 2,
      stem: "Jane set up the experiment shown. She added weights one at a time until the strip broke. Which property of the material was she testing?",
      figure: MAT_FIG_STRENGTH_SETUP,
      options: ["Flexibility", "Strength", "Waterproof", "Transparency"],
      answer: 1,
      explain: "Adding weights until the strip breaks tests how heavy a load it can hold: its strength." },
    { id: "mat-022", type: "mcq", level: 2,
      stem: "Ahmad clamped strips of four materials to a table and hung the same mass at the end of each. He measured how far the end of each strip moved down. Which material is the most flexible?",
      figure: MAT_TBL_FLEX,
      options: ["P", "Q", "R", "S"],
      answer: 1,
      explain: "The strip that bends the most (moves down the furthest) is the most flexible. Q moved down 9 cm. S did not bend at all." },

    // ---------------- MCQ, level 3 ----------------
    { id: "mat-023", type: "mcq", level: 3,
      stem: "Ahmad used this set-up to find out which material is the most flexible. Which of these must he keep the same to make it a fair test?",
      figure: MAT_FIG_FLEX_SETUP,
      options: ["The type of material", "The length and thickness of each strip", "How far each strip bends", "The number of strips that break"],
      answer: 1,
      explain: "Only the type of material is changed. The length and thickness (and the mass hung) are kept the same. How far each strip bends is what he measures." },
    { id: "mat-024", type: "mcq", level: 3,
      stem: "Kim put 50 ml of water into each of four beakers. She put a same-sized piece of a different material into each beaker for 5 minutes, took it out and measured the water left. Which materials are waterproof?",
      figure: MAT_TBL_WATER,
      options: ["X only", "X and Y", "Y and Z", "W and Z"],
      answer: 3,
      explain: "W and Z still had 50 ml left, so they absorbed no water: they are waterproof. X and Y absorbed some water." },
    { id: "mat-025", type: "mcq", level: 3,
      stem: "Leon needs a material to make a float for his fishing line. It must float on water and must not absorb water. Which material should he choose?",
      figure: `<table><tr><th>Material</th><th>Floats on water?</th><th>Absorbs water?</th></tr>
<tr><td>A</td><td>Yes</td><td>Yes</td></tr><tr><td>B</td><td>Yes</td><td>No</td></tr><tr><td>C</td><td>No</td><td>No</td></tr><tr><td>D</td><td>No</td><td>Yes</td></tr></table>`,
      options: ["A", "B", "C", "D"],
      answer: 1,
      explain: "Only B floats AND does not absorb water (it is waterproof). A floats but absorbs water; C and D sink." },
    { id: "mat-026", type: "mcq", level: 3,
      stem: "A window on a boat must be waterproof, allow us to see clearly outside, and not break easily. Which material is the most suitable?",
      figure: `<table><tr><th>Material</th><th>Waterproof?</th><th>How much light passes through</th><th>Breaks easily?</th></tr>
<tr><td>P</td><td>Yes</td><td>Most</td><td>Yes</td></tr><tr><td>Q</td><td>Yes</td><td>Most</td><td>No</td></tr><tr><td>R</td><td>No</td><td>Some</td><td>No</td></tr><tr><td>S</td><td>Yes</td><td>None</td><td>No</td></tr></table>`,
      options: ["P", "Q", "R", "S"],
      answer: 1,
      explain: "Q has all three: waterproof, transparent (allows most light to pass through, so we see clearly), and does not break easily. P breaks easily. R absorbs water and is only translucent. S is opaque: it does not allow light to pass through." },
    { id: "mat-027", type: "mcq", level: 3,
      stem: "Nurul shone a torch through sheets of materials A, B and C, one at a time. A light sensor measured the amount of light that passed through: A = 90 units, B = 40 units, C = 0 units. Which material is most likely tracing paper?",
      figure: MAT_FIG_LIGHT_SETUP,
      options: ["A, because it allowed the most light to pass through", "B, because it allowed some light to pass through", "C, because it allowed no light to pass through", "A, because it allowed no light to pass through"],
      answer: 1,
      explain: "Tracing paper is translucent: it allows SOME light to pass through, like B. A allowed the most light through, so it is transparent, like clear glass or clear plastic. C allowed no light through, so it is opaque, like wood or cardboard." },
    { id: "mat-054", type: "mcq", level: 3,
      stem: "Nurul shone a torch through sheets of materials A, B and C, one at a time. A light sensor measured the amount of light that passed through: A = 90 units, B = 40 units, C = 0 units. Which sentence describes the materials correctly?",
      figure: MAT_FIG_LIGHT_SETUP,
      options: ["A is opaque, B is translucent, C is transparent.", "A is translucent, B is transparent, C is opaque.", "A is transparent, B is translucent, C is opaque.", "A is transparent, B is opaque, C is translucent."],
      answer: 2,
      explain: "A let the most light through (90 units), so it is transparent: it allows most light to pass through. B let some light through (40 units), so it is translucent. C let no light through (0 units), so it is opaque: it does not allow light to pass through." },
    { id: "mat-028", type: "mcq", level: 3,
      stem: "Ken wanted to find out which material is the strongest. His results are shown. Why is his experiment NOT a fair test?",
      figure: MAT_TBL_KEN,
      options: ["He used strips of different lengths.", "He used three different materials.", "He counted the number of weights.", "The metal strip held the most weights."],
      answer: 0,
      explain: "Ken changed the type of material (correct) but ALSO the length: the plastic strip was 30 cm. Only one thing should change in a fair test." },
    { id: "mat-029", type: "mcq", level: 3,
      stem: "Meiling says, 'All objects made of metal are not flexible.' Which object shows that she is wrong?",
      figure: null,
      options: ["An iron nail", "A steel spoon", "Aluminium foil", "A metal pot"],
      answer: 2,
      explain: "Aluminium foil is a thin metal sheet that bends easily without breaking, so some metal objects are flexible." },
    { id: "mat-030", type: "mcq", level: 2,
      stem: "Which statement about materials is correct?",
      figure: null,
      options: ["All plastics float on water.", "All waterproof materials allow light to pass through.", "A strong material is always flexible.", "One material can have more than one property."],
      answer: 3,
      explain: "Glass, for example, is waterproof AND allows most light through. Some plastics sink; metal is waterproof but lets no light through; a thick wooden block is strong but not flexible." },

    // ---------------- OEQ, level 1 ----------------
    { id: "mat-031", type: "oeq", level: 1, marks: 1,
      stem: "Name one material that is waterproof.",
      figure: null,
      model: "Plastic (or rubber, glass, metal, ceramic).",
      keys: [ ["plastic", "rubber", "glass", "metal", "ceramic"] ],
      explain: "Any waterproof material earns the mark. Cloth and paper are wrong: they absorb water." },
    { id: "mat-032", type: "oeq", level: 3, marks: 3,
      stem: "Mia wants to make the cover of an umbrella. She says, 'Paper is a good material for the cover because it is flexible and can be folded.'\n(a) Do you agree with Mia? (1 mark)\n(b) Explain your answer. (2 marks)",
      figure: null,
      model: "(a) No, I do not agree. (b) Paper is flexible, but it absorbs water and is not waterproof. The rain will soak through the paper cover and the person under the umbrella will get wet.",
      keys: [ ["do not agree", "disagree", "no"], ["absorbs water", "not waterproof", "absorb water"], ["get wet", "rain will soak through", "not keep the rain out"] ],
      explain: "A material must have ALL the properties a use needs. An umbrella cover must be flexible AND waterproof. Paper only has one of them. Mark points: disagree; paper absorbs water / is not waterproof; so the person gets wet." },
    { id: "mat-055", type: "oeq", level: 1, marks: 2,
      stem: "Tracing paper is translucent. (a) What does 'translucent' mean? (b) What do things look like when we see them through tracing paper?",
      figure: null,
      model: "(a) Translucent means it allows some light to pass through. (b) Things seen through it look blurry; we cannot see them clearly.",
      keys: [ ["allows some light", "some light"], ["blurry", "cannot see them clearly", "not clear"] ],
      explain: "Know the word AND its meaning. Translucent = allows some light to pass through. Transparent = allows most light to pass through. Opaque = does not allow light to pass through." },
    { id: "mat-033", type: "oeq", level: 1, marks: 2,
      stem: "Raincoats are made of plastic. State the property of plastic that makes it suitable, and explain why.",
      figure: null,
      model: "Plastic is waterproof, so it does not absorb the rain and keeps the person's body dry.",
      keys: [ ["waterproof", "does not absorb water"], ["dry", "not get wet", "keeps the rain out"] ],
      explain: "Markers look for: the property (waterproof) + why it suits the use (keeps the body dry)." },
    { id: "mat-034", type: "oeq", level: 1, marks: 2,
      stem: "Windows are usually made of clear glass. Explain why.",
      figure: null,
      model: "Clear glass is transparent. It allows most light to pass through, so the room is bright and we can see outside clearly.",
      keys: [ ["transparent", "allows most light", "lets most light pass through"], ["see outside", "see through", "room is bright", "bright"] ],
      explain: "Property (transparent: allows most light to pass through) + use (we can see out / the room is bright). Either the word 'transparent' or its meaning earns the first mark; writing both is safest." },

    // ---------------- OEQ, level 2 ----------------
    { id: "mat-035", type: "oeq", level: 2, marks: 2,
      stem: "Bath towels are made of cotton cloth. Explain why.",
      figure: null,
      model: "Cotton cloth absorbs water, so it can dry our body after a bath.",
      keys: [ ["absorbs water", "absorb water", "absorbs"], ["dry our body", "dry", "wipe"] ],
      explain: "Here NOT being waterproof is useful: the towel absorbs water to dry us." },
    { id: "mat-036", type: "oeq", level: 2, marks: 2,
      stem: "Rubber bands are made of rubber. Explain why rubber is suitable.",
      figure: null,
      model: "Rubber is flexible, so the rubber band can bend and stretch without breaking to hold things together.",
      keys: [ ["flexible", "bend", "stretch"], ["without breaking", "not break", "hold things", "tie"] ],
      explain: "Property (flexible) + use (stretches around things without breaking)." },
    { id: "mat-037", type: "oeq", level: 2, marks: 2,
      stem: "Why is glass NOT a suitable material for a young child's drinking cup?",
      figure: null,
      model: "Glass is not strong and breaks easily. If the child drops the cup, it may break and the sharp pieces can hurt the child.",
      keys: [ ["breaks easily", "break easily", "not strong"], ["hurt", "cut", "injure", "sharp", "dropped"] ],
      explain: "Property (breaks easily / not strong) + why that matters (the child may get hurt)." },
    { id: "mat-038", type: "oeq", level: 2, marks: 2,
      stem: "Give two reasons why wood is a suitable material for making a raft.",
      figure: null,
      model: "Wood can float on water. Wood is strong, so it can hold the weight of people without breaking.",
      keys: [ ["float"], ["strong", "hold heavy", "carry", "not break"] ],
      explain: "One mark for 'floats', one mark for 'strong / holds a heavy load without breaking'." },
    { id: "mat-039", type: "oeq", level: 2, marks: 2,
      stem: "A shower curtain is made of plastic, not cotton cloth. Explain why plastic is more suitable.",
      figure: null,
      model: "Plastic is waterproof and does not absorb water. Cotton cloth absorbs water, so the curtain would become wet and heavy.",
      keys: [ ["plastic is waterproof", "plastic does not absorb", "waterproof"], ["cloth absorbs", "cloth will absorb", "cloth is not waterproof", "cloth would get wet"] ],
      explain: "Compare both materials: plastic does not absorb water, cloth does." },
    { id: "mat-040", type: "oeq", level: 2, marks: 2,
      stem: "A fish tank is made of glass. State two properties of glass that make it suitable for a fish tank.",
      figure: null,
      model: "Glass is waterproof, so it can hold water without absorbing it. Glass is transparent. It allows most light to pass through, so we can see the fish clearly.",
      keys: [ ["waterproof", "does not absorb water"], ["transparent", "allows most light", "see the fish"] ],
      explain: "One mark for each property linked to its use. For the second mark, 'transparent' or 'allows most light to pass through' both name the property." },
    { id: "mat-041", type: "oeq", level: 2, marks: 2,
      stem: "Some bathroom windows are made of frosted glass instead of clear glass. Explain why.",
      figure: null,
      model: "Frosted glass is translucent. It allows only some light to pass through. The bathroom is still bright, but people outside cannot see in clearly.",
      keys: [ ["translucent", "some light"], ["cannot see in clearly", "cannot see clearly", "privacy", "blurry"] ],
      explain: "Property (translucent: allows some light to pass through) + use (light gets in, but no one can see in clearly). Either the word or its meaning earns the first mark." },
    { id: "mat-042", type: "oeq", level: 2, marks: 2,
      stem: "Cups are often made of ceramic. State one property of ceramic that makes it suitable for a cup, and explain why.",
      figure: null,
      model: "Ceramic is waterproof, so it does not absorb the drink and the cup can hold the drink without leaking.",
      keys: [ ["waterproof", "does not absorb"], ["hold the drink", "hold water", "not leak", "drink"] ],
      explain: "Property (waterproof) + use (holds the drink). Waterproof is the safest property to give: ceramic still breaks easily if the cup is dropped." },

    // ---------------- OEQ, level 3 (experiments) ----------------
    { id: "mat-043", type: "oeq", level: 3, marks: 2,
      stem: "Look at Siti's results. Which material, A or D, is more suitable for making a shelf to hold heavy books? Explain your answer using the results.",
      figure: MAT_TBL_STRENGTH,
      model: "Material D. It held more weights (8) than A (5) before it broke, so it is stronger and can hold heavy books without breaking.",
      keys: [ ["D"], ["more weights", "8", "stronger"] ],
      explain: "Name the material AND use the evidence from the table: more weights held = stronger." },
    { id: "mat-044", type: "oeq", level: 3, marks: 2,
      stem: "Jane used this set-up to test the strength of four materials. (a) What did she change in her experiment? (b) State one thing she must keep the same.",
      figure: MAT_FIG_STRENGTH_SETUP,
      model: "(a) The type of material. (b) The size (length, width, thickness) of the strips / the mass of each weight / the distance between the desks.",
      keys: [ ["type of material"], ["length", "width", "thickness", "size", "mass of each weight", "distance between the desks"] ],
      explain: "Changed variable = type of material. Many answers are accepted for 'kept the same'." },
    { id: "mat-045", type: "oeq", level: 2, marks: 1,
      stem: "Jane repeated her experiment two more times. Why did she do this?",
      figure: MAT_FIG_STRENGTH_SETUP,
      model: "To make her results more reliable.",
      keys: [ ["reliable"] ],
      explain: "SG markers want the word 'reliable'. Repeating does NOT make the test fair; it checks the results are consistent." },
    { id: "mat-046", type: "oeq", level: 3, marks: 2,
      stem: "Ahmad used this set-up to find out which material is the most flexible. (a) What did he measure? (b) How can he tell which material is the most flexible?",
      figure: MAT_FIG_FLEX_SETUP,
      model: "(a) How far the end of each strip moved down (bent), using the ruler. (b) The strip that bent the most / moved down the furthest is the most flexible.",
      keys: [ ["how far", "distance", "how much"], ["bent the most", "bends the most", "moved down the most", "furthest"] ],
      explain: "Flexibility is measured by how much the strip bends with the same mass." },
    { id: "mat-047", type: "oeq", level: 3, marks: 2,
      stem: "Look at Kim's results. Which material, X or Y, absorbed more water? Explain using the results.",
      figure: MAT_TBL_WATER,
      model: "X. Only 32 ml of water was left in its beaker, which is less than for Y (45 ml), so X absorbed more water (18 ml).",
      keys: [ ["X"], ["less water left", "32", "18"] ],
      explain: "Less water left in the beaker means the material absorbed more water." },
    { id: "mat-048", type: "oeq", level: 2, marks: 2,
      stem: "In Kim's experiment, why did she put the same amount of water (50 ml) into every beaker?",
      figure: MAT_TBL_WATER,
      model: "To make it a fair test, so that only the type of material was changed.",
      keys: [ ["fair test", "fair"], ["only the type of material", "only one", "type of material"] ],
      explain: "Keeping the amount of water the same means any difference is caused only by the material." },
    { id: "mat-049", type: "oeq", level: 3, marks: 2,
      stem: "Ken's experiment was not a fair test. Suggest how he should change it, and explain why.",
      figure: MAT_TBL_KEN,
      model: "He should use strips of the same length (and size) for all three materials, so that only the type of material is changed.",
      keys: [ ["same length", "same size"], ["only the type of material", "only one", "fair"] ],
      explain: "Fix: same length. Reason: only one variable (the material) should change." },
    { id: "mat-050", type: "oeq", level: 3, marks: 3,
      stem: "Mei thinks a plastic ruler is more flexible than a wooden ruler. Describe how she can carry out a fair test to check this.",
      figure: null,
      model: "Use a plastic ruler and a wooden ruler of the same length and thickness. Clamp each one to the edge of a table in the same way and hang the same mass at the end. Measure how far each ruler bends. The ruler that bends more is more flexible.",
      keys: [ ["same length", "same size", "same thickness"], ["same mass", "same weight", "same load"], ["measure how far", "how much it bends", "bends more", "distance"] ],
      explain: "Three marks: keep the rulers the same size; hang the same mass; measure how much each bends." },

    // ---------------- 2026-10 hardness pass: object parts, experiments, combinations ----------------
    { id: "mat-056", type: "mcq", level: 2,
      stem: "The picture shows a tent. Part X is the door flap. It is rolled up on sunny days, and it must keep the rain out on rainy days. The table shows the properties of four materials. Which material is the most suitable for part X?",
      figure: `<div>${MAT_FIG_TENT}<table><tr><th>Material</th><th>Waterproof?</th><th>Flexible?</th><th>Floats?</th></tr>
<tr><td>A</td><td>Yes</td><td>No</td><td>Yes</td></tr><tr><td>B</td><td>No</td><td>Yes</td><td>Yes</td></tr>
<tr><td>C</td><td>Yes</td><td>Yes</td><td>No</td></tr><tr><td>D</td><td>No</td><td>No</td><td>No</td></tr></table></div>`,
      options: ["A", "B", "C", "D"],
      answer: 2,
      explain: "The flap must be flexible (to be rolled up) AND waterproof (to keep the rain out). Only C has both. A is waterproof but cannot be rolled up; B can be rolled up but lets the rain through. Whether the material floats does not matter for this part." },
    { id: "mat-057", type: "mcq", level: 3,
      stem: "The picture shows a toy sailboat. Part X, the sail, is rolled up after use and gets splashed with water. Part Y, the body of the boat, must float and must not soak up water. The table shows the properties of four materials. Which materials are the most suitable for parts X and Y?",
      figure: `<div>${MAT_FIG_BOAT}${MAT_TBL_BOAT}</div>`,
      options: ["X: P, Y: Q", "X: R, Y: Q", "X: P, Y: S", "X: S, Y: R"],
      answer: 0,
      explain: "Sail X must be flexible and waterproof: only P. Body Y must float and be waterproof: only Q. R floats but absorbs water, so it is wrong for both parts. S is waterproof but sinks and is not flexible." },
    { id: "mat-058", type: "oeq", level: 3, marks: 4,
      stem: "The picture shows a swing in an outdoor playground. Part X holds up the seat and must bend as the swing moves. Part Y is the seat. The table shows the properties of four materials.\n(a) Which material is the most suitable for part X? (1 mark)\n(b) Explain your answer to (a). (2 marks)\n(c) The swing is often left out in the rain. Which material is the most suitable for the seat, part Y? (1 mark)",
      figure: `<div>${MAT_FIG_SWING}${MAT_TBL_SWING}</div>`,
      model: "(a) Material E. (b) Material E is strong, so part X can hold up the child's weight without breaking. It is also flexible, so it can bend as the swing moves without breaking. (c) Material F.",
      keys: [ ["Material E"], ["strong", "hold up the child", "without breaking"], ["flexible", "bend"], ["Material F"] ],
      explain: "Part X needs TWO properties: strong (holds the child) and flexible (bends as the swing moves). Only E has both. The seat must hold the child and stay dry in the rain, so it must be strong and waterproof: only F. G and H are waterproof but not strong." },
    { id: "mat-059", type: "oeq", level: 3, marks: 3,
      stem: "The picture shows a mop. Part X is the mop head, which must soak up spilt water. Part Y is the handle, which is pushed hard while mopping. The table shows the properties of three materials.\n(a) Which material is the most suitable for part X? (1 mark)\n(b) Which material is the most suitable for part Y? Explain your answer. (2 marks)",
      figure: `<div>${MAT_FIG_MOP}${MAT_TBL_MOP}</div>`,
      model: "(a) Material P. (b) Material Q. It is strong, so the handle will not break when it is pushed hard.",
      keys: [ ["Material P"], ["Material Q"], ["strong", "not break"] ],
      explain: "The mop head must absorb water: only P does. The handle must be strong: only Q is. Different parts of one object can need different materials." },
    { id: "mat-060", type: "oeq", level: 3, marks: 4,
      stem: "Ms Lim tested four materials. She shone a torch at a sheet of each material. Then she hung weights on a same-sized strip of each material until it broke. Her results are shown.\nA viewing deck has a floor that visitors stand on and look down through to see the river below. Wei Ming says, 'Material K should be used for the floor because it allows most light to pass through.'\n(a) Do you agree with Wei Ming? (1 mark)\n(b) Explain your answer using the results. (2 marks)\n(c) Which material is the most suitable for the floor? (1 mark)",
      figure: `<table><tr><th>Material</th><th>How much light passes through</th><th>Number of weights held before it broke</th></tr>
<tr><td>K</td><td>Most</td><td>3</td></tr><tr><td>L</td><td>Most</td><td>18</td></tr><tr><td>M</td><td>Some</td><td>20</td></tr><tr><td>N</td><td>None</td><td>25</td></tr></table>`,
      model: "(a) No, I do not agree. (b) Material K held only 3 weights before it broke, the fewest of all, so it is not strong. The floor may break when visitors stand on it. (c) Material L.",
      keys: [ ["do not agree", "disagree"], ["only 3 weights", "3 weights", "fewest", "not strong"], ["may break", "break when visitors stand", "cannot hold the weight"], ["Material L"] ],
      explain: "The floor needs TWO properties: it must allow most light to pass through (transparent, to see the river clearly) AND be strong (to hold the visitors). K is transparent but weak. L is transparent and strong. M is stronger but only translucent, so the river would look blurry; N is opaque." },
    { id: "mat-061", type: "oeq", level: 3, marks: 3,
      stem: "Sam put same-sized pieces of materials P, Q and R into water. His results are shown. Sam says, 'All materials that float are waterproof.'\n(a) Do you agree with Sam? (1 mark)\n(b) Explain your answer using the results. (1 mark)\n(c) Sam wants to make a bath toy that floats and does not soak up the bath water. Which material should he use? (1 mark)",
      figure: `<table><tr><th>Material</th><th>Floats?</th><th>Absorbs water?</th></tr>
<tr><td>P</td><td>Yes</td><td>Yes</td></tr><tr><td>Q</td><td>Yes</td><td>No</td></tr><tr><td>R</td><td>No</td><td>No</td></tr></table>`,
      model: "(a) No, I do not agree. (b) Material P floats but it absorbs water, so it is not waterproof. (c) Material Q.",
      keys: [ ["do not agree", "disagree"], ["P floats but", "floats but it absorbs", "absorbs water"], ["Material Q"] ],
      explain: "Floating and being waterproof are two different properties. P shows that a material can float and still absorb water. Q is the only one that floats AND is waterproof." },
    { id: "mat-062", type: "mcq", level: 3,
      stem: "Ravi clamped same-sized strips of materials E, F, G and H to a table, one at a time, and hung the same mass at the end of each strip. He measured how far the end of each strip bent down. Which material is the most suitable for a serving tray that must stay flat when it carries cups of drinks?",
      figure: `<table><tr><th>Material</th><th>How far the end of the strip bent down (cm)</th></tr>
<tr><td>E</td><td>1</td></tr><tr><td>F</td><td>6</td></tr><tr><td>G</td><td>4</td></tr><tr><td>H</td><td>9</td></tr></table>`,
      options: ["E", "F", "G", "H"],
      answer: 0,
      explain: "E bent the least (1 cm), so it is the least flexible. A tray made of E will stay flat and not spill the drinks. H bent the most: it is the most flexible, which is what the tray must NOT be." },
    { id: "mat-063", type: "oeq", level: 3, marks: 3,
      stem: "Hui Min hung same-sized strips of materials J, K, L and M so that the bottom of each strip touched coloured water. After 10 minutes she measured how high the coloured water had risen up each strip.\n(a) Arrange the materials in order, from non-absorbent to most absorbent. (1 mark)\n(b) Which material is the most suitable for a kitchen cloth to wipe up spilt drinks? Explain your answer using the results. (2 marks)",
      figure: `<table><tr><th>Material</th><th>Height the coloured water rose up the strip (cm)</th></tr>
<tr><td>J</td><td>8</td></tr><tr><td>K</td><td>0</td></tr><tr><td>L</td><td>3</td></tr><tr><td>M</td><td>12</td></tr></table>`,
      model: "(a) K, L, J, M. (b) Material M. The coloured water rose the highest up strip M (12 cm), so M absorbs the most water and can soak up the spilt drinks.",
      keys: [ ["K, L, J, M"], ["Material M", "rose the highest", "12 cm"], ["absorbs the most water", "soak up"] ],
      explain: "The higher the water rises, the more absorbent the material. K did not absorb any water: it is non-absorbent (waterproof). Claim (M) + evidence (rose highest, 12 cm) + reason (absorbs the most water, so it soaks up spills)." },
    { id: "mat-064", type: "mcq", level: 3,
      stem: "Farah poured 100 ml of water into each of four beakers. She dipped a same-sized piece of material A, B, C or D into each beaker for 1 minute. Then she took it out and measured the volume of water left in the beaker. Which material is the most suitable for a bath towel?",
      figure: `<table><tr><th>Material</th><th>Volume of water left in the beaker (ml)</th></tr>
<tr><td>A</td><td>70</td></tr><tr><td>B</td><td>95</td></tr><tr><td>C</td><td>100</td></tr><tr><td>D</td><td>40</td></tr></table>`,
      options: ["A", "B", "C", "D"],
      answer: 3,
      explain: "Careful: LEAST water left means the material absorbed the MOST. D absorbed 60 ml (100 - 40), more than any other, so it will dry the body best. C had 100 ml left, so it absorbed no water: it is waterproof and would make a useless towel." },
    { id: "mat-065", type: "mcq", level: 3,
      stem: "Daniel shone a torch at a sheet of each material, one at a time. A light sensor on the other side measured the amount of light that passed through. The lenses of a pair of sunglasses must let the wearer see where he is going, but must stop some of the bright sunlight from reaching his eyes. Which material is the most suitable for the lenses?",
      figure: `<div>${MAT_FIG_LIGHT_SETUP}<table><tr><th>Material</th><th>Amount of light that passed through (units)</th></tr>
<tr><td>P</td><td>95</td></tr><tr><td>Q</td><td>0</td></tr><tr><td>R</td><td>45</td></tr><tr><td>S</td><td>98</td></tr></table></div>`,
      options: ["P", "Q", "R", "S"],
      answer: 2,
      explain: "The lenses need SOME light, not the most and not none. R lets some light through, so the wearer can still see but less sunlight reaches the eyes. Q lets no light through, so he could not see at all. P and S let almost all the light through, so they would not protect his eyes." },
    { id: "mat-066", type: "oeq", level: 3, marks: 4,
      stem: "Aisha put same-sized blocks of materials W, X, Y and Z into a tank of water. Then she added 10 g weights, one at a time, on top of each block that floated, until the block sank. Her results are shown.\n(a) Which material sank on its own? (1 mark)\n(b) Which material is the most suitable for making a raft to carry heavy loads? (1 mark)\n(c) Explain your answer to (b) using the results. (2 marks)",
      figure: `<table><tr><th>Material</th><th>Floats or sinks?</th><th>Number of weights added before it sank</th></tr>
<tr><td>W</td><td>Floats</td><td>6</td></tr><tr><td>X</td><td>Sinks</td><td>(no weights added)</td></tr><tr><td>Y</td><td>Floats</td><td>2</td></tr><tr><td>Z</td><td>Floats</td><td>9</td></tr></table>`,
      model: "(a) Material X. (b) Material Z. (c) Block Z floated and held the most weights (9 weights) before it sank, so a raft made of Z can carry heavy loads without sinking.",
      keys: [ ["Material X"], ["Material Z"], ["held the most weights", "9 weights", "most weights"], ["without sinking", "carry heavy loads"] ],
      explain: "A raft must float AND carry a load. X sinks, so it cannot be used. Of the floating blocks, Z carried the most weights (9) before sinking. Claim (Z) + evidence (9 weights, the most) + reason (carries heavy loads without sinking)." },
    { id: "mat-067", type: "oeq", level: 2, marks: 3,
      stem: "Lina wants to find out which fabric absorbs the most water. She dips a same-sized piece of each of four fabrics into a beaker with 100 ml of water for 1 minute. Then she takes out the fabric and measures the volume of water left in the beaker.\nUse the table to sort the variables.\n(a) Which variable did she change? (1 mark)\n(b) Which variable did she measure? (1 mark)\n(c) Which TWO variables did she keep the same? (1 mark)",
      figure: `<table><tr><th>Variable</th><th>Changed</th><th>Measured</th><th>Kept the same</th></tr>
<tr><td>Type of fabric</td><td></td><td></td><td></td></tr><tr><td>Size of each piece</td><td></td><td></td><td></td></tr>
<tr><td>Volume of water at the start</td><td></td><td></td><td></td></tr><tr><td>Volume of water left after 1 minute</td><td></td><td></td><td></td></tr></table>`,
      model: "(a) Changed: the type of fabric. (b) Measured: the volume of water left after 1 minute. (c) Kept the same: the size of each piece and the volume of water at the start (100 ml).",
      keys: [ ["type of fabric"], ["volume of water left", "water left"], ["size of each piece and the volume of water at the start", "size and the amount of water at the start"] ],
      explain: "In a fair test, change only ONE variable (the type of fabric), measure the result (water left), and keep everything else the same (size of the pieces, amount of water, time). Both kept-the-same variables are needed for the mark in (c)." },
    { id: "mat-068", type: "mcq", level: 3,
      stem: "Bala wants to find out whether plastic is more flexible than wood. He will hang the same mass at the end of each strip and measure how far it bends. Which two set-ups should he compare to make it a fair test?",
      figure: `<table><tr><th>Set-up</th><th>Material</th><th>Length (cm)</th><th>Thickness (mm)</th></tr>
<tr><td>1</td><td>Plastic</td><td>30</td><td>2</td></tr><tr><td>2</td><td>Wood</td><td>30</td><td>5</td></tr>
<tr><td>3</td><td>Wood</td><td>30</td><td>2</td></tr><tr><td>4</td><td>Plastic</td><td>20</td><td>2</td></tr></table>`,
      options: ["1 and 2", "2 and 4", "1 and 3", "3 and 4"],
      answer: 2,
      explain: "Set-ups 1 and 3 differ ONLY in the material: same length (30 cm) and same thickness (2 mm). 1 and 2 also differ in thickness; 3 and 4 also differ in length; 2 and 4 differ in material, length and thickness. A fair test changes only one thing." },
    { id: "mat-069", type: "mcq", level: 3,
      stem: "The table shows the properties of materials K, L and M. Which of these statements are correct?\nA: Material K is suitable for making a raincoat.\nB: Material L is suitable for making a float for a fishing line.\nC: Material M is suitable for making a shower curtain.",
      figure: `<table><tr><th>Material</th><th>Floats?</th><th>Waterproof?</th><th>Flexible?</th></tr>
<tr><td>K</td><td>No</td><td>Yes</td><td>Yes</td></tr><tr><td>L</td><td>Yes</td><td>Yes</td><td>No</td></tr><tr><td>M</td><td>Yes</td><td>No</td><td>Yes</td></tr></table>`,
      options: ["A and B only", "A and C only", "B and C only", "A, B and C"],
      answer: 0,
      explain: "A: a raincoat must be waterproof and flexible: K is both (it does not need to float). B: a fishing float must float and be waterproof: L is both. C: a shower curtain must be waterproof, but M is not, so C is wrong." },
    { id: "mat-070", type: "mcq", level: 2,
      stem: "Read the statements below. Which of them are correct?\nA: Clear glass and clear plastic both allow most light to pass through.\nB: Aluminium foil is made of metal, but it is flexible.\nC: A cotton towel is waterproof because it can hold a lot of water.",
      figure: null,
      options: ["A and B only", "A and C only", "B and C only", "A, B and C"],
      answer: 0,
      explain: "A is correct: both are transparent. B is correct: thin aluminium foil bends without breaking, so not all metals are stiff. C is wrong: the towel holds water because it ABSORBS it, so it is not waterproof." },
    { id: "mat-071", type: "mcq", level: 3,
      stem: "Joel put 50 ml of water into each of three beakers. He soaked a same-sized piece of material P, Q or R in each beaker for 5 minutes, took it out, and measured the volume of water left. Which of these statements are correct?\nA: Material P absorbed the most water.\nB: Material Q is waterproof.\nC: Material R is more suitable than material P for a mop head.",
      figure: `<table><tr><th>Material</th><th>Volume of water at the start (ml)</th><th>Volume of water left (ml)</th></tr>
<tr><td>P</td><td>50</td><td>20</td></tr><tr><td>Q</td><td>50</td><td>50</td></tr><tr><td>R</td><td>50</td><td>35</td></tr></table>`,
      options: ["A only", "A and B only", "B and C only", "A, B and C"],
      answer: 1,
      explain: "A: P left the least water, so it absorbed the most (30 ml). Correct. B: Q left all 50 ml, so it absorbed none: waterproof. Correct. C: R absorbed only 15 ml, less than P, so P is better for a mop head. Wrong." },
    { id: "mat-072", type: "mcq", level: 3,
      stem: "Tina tested same-sized strips of materials S, T and U. First she hung the same mass on each strip and measured how far it bent. Then she used new strips and added weights until each strip broke. Which of these statements are correct?\nA: Material T is the most flexible.\nB: Material S is the strongest.\nC: Material U is the most suitable for a bookshelf.\nD: Material S is suitable for a tray that must not bend.",
      figure: `<table><tr><th>Material</th><th>How far it bent (cm)</th><th>Number of weights held before it broke</th></tr>
<tr><td>S</td><td>1</td><td>15</td></tr><tr><td>T</td><td>8</td><td>12</td></tr><tr><td>U</td><td>3</td><td>2</td></tr></table>`,
      options: ["A and B only", "A, B and D only", "B, C and D only", "A, C and D only"],
      answer: 1,
      explain: "A: T bent the most, so it is the most flexible. Correct. B: S held the most weights, so it is the strongest. Correct. C: U held only 2 weights, so a shelf of U would break. Wrong. D: S bent the least, so the tray stays flat. Correct." },
    { id: "mat-073", type: "mcq", level: 2,
      stem: "The flowchart shows how four objects, A, B, C and D, were sorted. Which letter could be a steel spoon?",
      figure: MAT_FIG_FLOW,
      options: ["A", "B", "C", "D"],
      answer: 3,
      explain: "A steel spoon does not allow light to pass through (it is opaque), so it goes to the right. It sinks in water, so it is D." },
    { id: "mat-074", type: "mcq", level: 2,
      stem: "The flowchart shows how four objects, A, B, C and D, were sorted. Which object could be C?",
      figure: MAT_FIG_FLOW,
      options: ["A clear plastic file", "A clear glass marble", "A wooden chopstick", "A metal door key"],
      answer: 2,
      explain: "C does not allow light to pass through and floats. A wooden chopstick is opaque and floats. The plastic file allows light through and is flexible (A); the glass marble allows light through but is not flexible (B); the metal key is opaque and sinks (D)." }
  ]
});
