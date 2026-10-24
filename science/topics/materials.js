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
// showX=false drops the door-flap label X for items that never mention it (mat-002: By-Eye F11).
const matTent = (showX) => `<svg viewBox="0 0 360 200" width="100%" style="max-width:360px" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="15" fill="none" stroke="currentColor" stroke-width="2">
  <polygon points="70,160 180,40 290,160"/>
  <polygon points="180,92 214,160 196,160" fill="currentColor" fill-opacity="0.15"/>
  <line x1="180" y1="92" x2="150" y2="160"/>
  <rect x="50" y="160" width="260" height="10" fill="currentColor" fill-opacity="0.3"/>
${showX ? `  <line x1="205" y1="132" x2="290" y2="104" stroke-width="1.2"/>
  <text x="296" y="110" fill="currentColor" stroke="none" font-weight="bold">X</text>
` : ''}  <line x1="90" y1="170" x2="70" y2="188" stroke-width="1.2"/>
  <text x="50" y="196" fill="currentColor" stroke="none" font-weight="bold">G</text>
  <text x="196" y="196" fill="currentColor" stroke="none">wet grass</text>
</svg>`;
const MAT_FIG_TENT = matTent(true);

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

// ---------- x17 expansion (lane sci-x-materials): local figure helpers ----------
// One global name (MATX) so the shared-scope load of all topic files cannot collide.
// Every svg carries data-maxw so fixFigures keeps it from stretching to 640 px (By-Eye F1).
const MATX = (() => {
  const W = '#bfe3f7', WS = '#3d8fc6', DYE = '#f4a6c4';
  const t = (x, y, s, a = '') => `<text x="${x}" y="${y}" fill="currentColor" stroke="none"${a}>${s}</text>`;
  const b = (x, y, s, a = '') => t(x, y, s, ` font-weight="bold"${a}`);
  const mid = ' text-anchor="middle"';
  const lead = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke-width="1.2"/>`;
  const svg = (w, h, body, maxw, label) => `<svg viewBox="0 0 ${w} ${h}" width="100%" data-maxw="${maxw}" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="14" fill="none" stroke="currentColor" stroke-width="2">${body}</svg>`;
  const tbl = (head, rows) => `<table style="margin-top:12px"><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</table>`;
  // picture + table: picture capped at 300 px so the stem stays near the fold at 1440x900
  const withTbl = (fig, head, rows) => `<div>${fig.replace(/data-maxw="\d+"/, 'data-maxw="300"')}${tbl(head, rows)}</div>`;

  // Row of beakers. v = ml in each. o.start draws a dashed start level (+ legend); o.cover puts a
  // sheet of material over each mouth with drops falling on it; o.vals prints "N ml" under each.
  const beakers = (list, o) => {
    const n = list.length, cap = o.cap, slot = 340 / n, top = o.cover ? 72 : 50, bot = top + 106, ih = 100;
    const yOf = v => +(bot - (v / cap) * ih).toFixed(1);
    let s = '';
    if (o.start) s += `<line x1="70" y1="20" x2="100" y2="20" stroke-dasharray="4 3" stroke-width="1.5"/>` + t(108, 25, `water at the start (${o.start} ml)`);
    else if (o.title) s += t(180, 22, o.title, mid);
    list.forEach((it, i) => {
      const cx = 10 + slot * (i + 0.5), L = cx - 26, R = cx + 26;
      if (it.v > 0) s += `<rect x="${L + 1}" y="${yOf(it.v)}" width="50" height="${(bot - yOf(it.v) - 1).toFixed(1)}" fill="${W}" stroke="none"/><line x1="${L + 1}" y1="${yOf(it.v)}" x2="${R - 1}" y2="${yOf(it.v)}" stroke="${WS}" stroke-width="1.5"/>`;
      if (o.start) s += `<line x1="${L - 5}" y1="${yOf(o.start)}" x2="${R + 5}" y2="${yOf(o.start)}" stroke-dasharray="4 3" stroke-width="1.5"/>`;
      s += `<path d="M${L - 4} ${top} L${L} ${top + 4} L${L} ${bot} L${R} ${bot} L${R} ${top + 4} L${R + 4} ${top}"/>`;
      if (o.cover) s += `<rect x="${L - 7}" y="${top - 6}" width="66" height="6" fill="currentColor" fill-opacity="0.3"/>` +
        `<path d="M${cx - 8} ${top - 30} q-4 7 0 10 q4 -3 0 -10 Z M${cx + 8} ${top - 22} q-4 7 0 10 q4 -3 0 -10 Z" fill="${W}" stroke="${WS}" stroke-width="1.2"/>`;
      s += b(cx, bot + 20, it.l, `${mid} font-size="16"`);
      if (o.vals) s += t(cx, bot + 38, `${it.v} ml${o.start ? ' left' : ''}`, mid);
    });
    return svg(360, (o.vals ? 202 : 184) + top - 50, s, 460, o.label);
  };

  // One drip test: dropper, drops, sheet held over a beaker with a rubber band.
  const dripSetup = () => svg(360, 216, `
  <ellipse cx="180" cy="24" rx="13" ry="15" fill="currentColor" fill-opacity="0.25"/>
  <path d="M175 38 L175 78 L180 88 L185 78 L185 38"/>
  <path d="M180 98 q-5 8 0 11 q5 -3 0 -11 Z M180 116 q-5 8 0 11 q5 -3 0 -11 Z" fill="${W}" stroke="${WS}" stroke-width="1.2"/>
  <path d="M136 146 L140 150 L140 206 L220 206 L220 150 L224 146"/>
  <rect x="128" y="138" width="104" height="7" fill="currentColor" fill-opacity="0.3"/>
  <line x1="132" y1="154" x2="228" y2="154" stroke-width="4"/>
  ${lead(194, 28, 240, 28)}${t(246, 33, 'dropper')}
  ${lead(188, 110, 240, 104)}${t(246, 109, 'water drops')}
  ${lead(102, 134, 128, 141)}${t(98, 126, 'piece of', ' text-anchor="end"')}${t(98, 142, 'material', ' text-anchor="end"')}
  ${lead(228, 154, 250, 160)}${t(256, 165, 'rubber band')}
  ${lead(220, 192, 250, 194)}${t(256, 199, 'beaker')}`, 440, 'A piece of material held over a beaker with a rubber band, with water dripping onto it from a dropper');

  // Board resting on two bricks with books stacked on it.
  const booksBoard = () => {
    let books = '';
    for (let k = 0; k < 6; k++) books += `<rect x="${148 + (k % 2 ? 5 : 0)}" y="${110 - 12 * k}" width="${64 - (k % 2 ? 10 : 0)}" height="12" fill="currentColor" fill-opacity="${k % 2 ? 0.1 : 0.22}"/>`;
    return svg(360, 196, `
  <rect x="40" y="132" width="56" height="56" fill="currentColor" fill-opacity="0.12"/>
  <rect x="264" y="132" width="56" height="56" fill="currentColor" fill-opacity="0.12"/>
  ${t(68, 165, 'brick', `${mid} font-size="13"`)}${t(292, 165, 'brick', `${mid} font-size="13"`)}
  <rect x="28" y="122" width="304" height="10" fill="currentColor" fill-opacity="0.4"/>
  ${books}
  ${lead(214, 92, 250, 78)}${t(256, 83, 'books')}
  ${lead(180, 133, 180, 146)}${t(180, 162, 'board', mid)}
  <line x1="10" y1="188" x2="350" y2="188"/>`, 420, 'A board resting across two bricks with a pile of books on it');
  };

  // Vertical bar chart with the value printed on each bar.
  const bars = o => {
    const x0 = 66, x1 = 350, y0 = 26, y1 = 176, n = o.labels.length, slot = (x1 - x0) / n, bw = Math.min(46, slot * 0.55);
    const y = v => +(y1 - v / o.max * (y1 - y0)).toFixed(1);
    let s = '';
    for (let v = 0; v <= o.max; v += o.step) s += `<line x1="${x0}" y1="${y(v)}" x2="${x1}" y2="${y(v)}" stroke-width="0.8" stroke-opacity="0.3"/>` + t(x0 - 7, y(v) + 5, v, ' text-anchor="end" font-size="13"');
    o.values.forEach((v, i) => {
      const cx = x0 + slot * (i + 0.5);
      if (v > 0) s += `<rect x="${cx - bw / 2}" y="${y(v)}" width="${bw}" height="${(y1 - y(v)).toFixed(1)}" fill="#b9aee8" stroke-width="1.5"/>`;
      s += `<text x="${cx}" y="${y(v) - 7}" text-anchor="middle" font-weight="bold" fill="currentColor" stroke="#fff" stroke-width="4" paint-order="stroke">${v}</text>`;
      s += t(cx, y1 + 20, o.labels[i], mid);
    });
    s += `<line x1="${x0}" y1="${y0 - 8}" x2="${x0}" y2="${y1}"/><line x1="${x0}" y1="${y1}" x2="${x1}" y2="${y1}"/>`;
    s += `<text transform="translate(18 ${(y0 + y1) / 2}) rotate(-90)" text-anchor="middle" fill="currentColor" stroke="none" font-size="13">${o.yLabel}</text>`;
    s += t((x0 + x1) / 2, y1 + 42, o.xLabel, `${mid} font-size="13"`);
    return svg(360, 226, s, 440, o.label);
  };

  // Basin of water. objs: {shape:'block'|'ball', w, h | r, x, float, label, fill}
  const basin = (objs, label) => {
    const surf = 78, floor = 176;
    let s = `<polygon points="23,${surf} 337,${surf} 330,${floor} 30,${floor}" fill="${W}" stroke="none"/>` +
      `<line x1="23" y1="${surf}" x2="337" y2="${surf}" stroke="${WS}" stroke-width="1.5"/>` +
      `<path d="M20 48 L30 ${floor} L330 ${floor} L340 48" stroke-width="2.5"/>` + t(38, 100, 'water', ' font-size="13"');
    objs.forEach(o => {
      const fill = o.fill || '#d9d2e9';
      let top;
      if (o.shape === 'block') {
        top = o.float ? surf - o.h * 0.45 : floor - o.h;
        s += `<rect x="${o.x - o.w / 2}" y="${top}" width="${o.w}" height="${o.h}" fill="${fill}"/>`;
      } else {
        const cy = o.float ? surf - o.r * 0.35 : floor - o.r;
        top = cy - o.r;
        s += `<circle cx="${o.x}" cy="${cy}" r="${o.r}" fill="${fill}"/>`;
      }
      s += o.label.length > 1 ? t(o.x, top - 8, o.label, mid) : b(o.x, top - 8, o.label, `${mid} font-size="16"`);
    });
    return svg(360, 186, s, 460, label);
  };

  // Strips hanging from a rod into coloured water; the dye climbs cm up each strip.
  const wick = list => {
    const surf = 172, px = 11, n = list.length, slot = 285 / n;
    let s = `<line x1="60" y1="24" x2="345" y2="24" stroke-width="4"/>` +
      `<rect x="57" y="${surf}" width="291" height="27" fill="${DYE}" fill-opacity="0.7" stroke="none"/>` +
      `<path d="M56 158 L56 200 L349 200 L349 158"/>`;
    for (let c = 0; c <= 12; c += 2) s += `<line x1="38" y1="${surf - c * px}" x2="46" y2="${surf - c * px}" stroke-width="1.2"/>` + t(34, surf - c * px + 5, c, ' text-anchor="end" font-size="12"');
    s += `<rect x="38" y="${surf - 12 * px}" width="8" height="${12 * px}" stroke-width="1.2"/>` + t(30, surf - 12 * px - 10, 'cm', ' font-size="12"');
    list.forEach((it, i) => {
      const cx = 60 + slot * (i + 0.5);
      if (it.cm > 0) s += `<rect x="${cx - 14}" y="${surf - it.cm * px}" width="28" height="${it.cm * px}" fill="${DYE}" stroke="none"/>`;
      s += `<rect x="${cx - 14}" y="24" width="28" height="164" stroke-width="1.5"/>` + b(cx, 46, it.l, `${mid} font-size="16"`);
    });
    s += t(202, 216, 'coloured water', mid);
    return svg(360, 222, s, 440, 'Four strips hanging into coloured water; the coloured water has climbed to different heights');
  };

  // Method strip for the soak-and-weigh test (no numbers: the table carries them).
  const scale = (cx, fill) => `<rect x="${cx - 42}" y="118" width="84" height="22" rx="3"/><rect x="${cx - 18}" y="123" width="36" height="12" stroke-width="1.2"/>` +
    `<line x1="${cx}" y1="110" x2="${cx}" y2="118"/><line x1="${cx - 36}" y1="110" x2="${cx + 36}" y2="110" stroke-width="3"/>` +
    `<rect x="${cx - 16}" y="96" width="32" height="13" fill="${fill}"/>`;
  const arrow = x => `<line x1="${x}" y1="110" x2="${x + 22}" y2="110" stroke-width="1.5"/><path d="M${x + 16} 105 L${x + 22} 110 L${x + 16} 115"/>`;
  const soakWeigh = () => svg(360, 116, `<g transform="translate(0 -60)">
  ${scale(60, '#e8dcc8')}${arrow(108)}
  <polygon points="144,90 216,90 212,140 148,140" fill="${W}" stroke="none"/><path d="M140 70 L148 140 L212 140 L220 70"/>
  <rect x="166" y="118" width="28" height="12" fill="#c9b99a"/>${arrow(228)}
  ${scale(300, '#c9b99a')}
  ${t(60, 164, '1. Weigh dry', mid)}${t(180, 164, '2. Soak 5 min', mid)}${t(300, 164, '3. Weigh wet', mid)}</g>`, 440, 'Weigh a dry piece, soak it in water for 5 minutes, then weigh it again');

  // ---------- products with lettered parts ----------
  const umbrella = () => svg(360, 210, `
  <path d="M40 22 l-4 10 M78 12 l-4 10 M292 14 l-4 10 M328 28 l-4 10" stroke="${WS}" stroke-width="1.5"/>
  <line x1="180" y1="36" x2="180" y2="50"/>
  <path d="M60 104 Q180 -6 300 104 Q270 88 240 104 Q210 88 180 104 Q150 88 120 104 Q90 88 60 104 Z" fill="#9fc5e8" fill-opacity="0.6"/>
  <path d="M180 104 L180 176 Q180 198 160 198 Q142 198 142 182" stroke-width="3"/>
  ${lead(250, 72, 296, 46)}${b(302, 50, 'X', ' font-size="16"')}
  ${lead(150, 196, 112, 186)}${b(96, 190, 'Y', ' font-size="16"')}`, 380, 'An umbrella with the cover labelled X and the handle labelled Y');

  const raincoat = () => svg(360, 222, `
  <path d="M30 30 l-4 10 M50 80 l-4 10 M312 24 l-4 10 M330 80 l-4 10" stroke="${WS}" stroke-width="1.5"/>
  <path d="M144 56 L104 76 L64 170 L90 178 L122 112 L122 214 L238 214 L238 112 L270 178 L296 170 L256 76 L216 56 Z" fill="#ffd966" fill-opacity="0.8"/>
  <path d="M144 58 Q134 4 180 4 Q226 4 216 58 Z" fill="#ffd966"/>
  <path d="M156 54 Q156 20 180 20 Q204 20 204 54 Z" fill="currentColor" fill-opacity="0.15"/>
  <line x1="180" y1="58" x2="180" y2="214"/>
  <circle cx="190" cy="96" r="3" fill="currentColor"/><circle cx="190" cy="132" r="3" fill="currentColor"/><circle cx="190" cy="168" r="3" fill="currentColor"/>
  ${lead(222, 180, 290, 190)}${b(296, 196, 'X', ' font-size="16"')}`, 380, 'A hooded raincoat labelled X');

  const boot = () => svg(360, 212, `
  <ellipse cx="210" cy="200" rx="148" ry="8" fill="${W}" stroke="${WS}" stroke-width="1.2"/>
  <path d="M140 20 L210 20 L210 140 Q280 140 290 170 L290 188 L130 188 L130 170 Q134 120 140 20 Z" fill="#93c47d" fill-opacity="0.7"/>
  <rect x="128" y="186" width="164" height="9" fill="currentColor" fill-opacity="0.5"/>
  ${lead(196, 80, 256, 60)}${b(262, 64, 'X', ' font-size="16"')}
  ${t(66, 186, 'puddle', ' font-size="13"')}`, 380, 'A rain boot labelled X standing in a puddle');

  const helmet = () => svg(360, 210, `
  <ellipse cx="180" cy="132" rx="60" ry="68" fill="#fce5cd" stroke-width="1.5"/>
  <circle cx="158" cy="138" r="4" fill="currentColor"/><circle cx="202" cy="138" r="4" fill="currentColor"/>
  <path d="M164 166 Q180 177 196 166" stroke-width="1.5"/>
  <path d="M98 112 Q98 22 180 22 Q262 22 262 112 Z" fill="#ea9a9a"/>
  <path d="M140 46 Q158 38 174 44 M188 44 Q204 38 222 46" stroke-width="3"/>
  <path d="M114 110 Q130 182 180 198 M246 110 Q230 182 180 198" stroke-width="3"/>
  <rect x="172" y="191" width="16" height="12" fill="currentColor" fill-opacity="0.5"/>
  ${lead(236, 62, 290, 40)}${b(296, 44, 'X', ' font-size="16"')}
  ${lead(229, 157, 282, 170)}${b(288, 176, 'Y', ' font-size="16"')}`, 380, 'A child wearing a bicycle helmet: the shell is labelled X and the chin strap is labelled Y');

  const glasses = () => svg(360, 156, `
  <path d="M68 74 L28 62 M292 74 L332 62" stroke-width="4"/>
  <ellipse cx="120" cy="80" rx="52" ry="38" fill="#e8f4fb" stroke-width="4"/>
  <ellipse cx="240" cy="80" rx="52" ry="38" fill="#e8f4fb" stroke-width="4"/>
  <path d="M172 74 Q180 62 188 74" stroke-width="4"/>
  ${lead(128, 96, 152, 136)}${b(158, 146, 'X', ' font-size="16"')}`, 380, 'A pair of reading glasses with a lens labelled X');

  const lifevest = () => svg(360, 212, `
  <path d="M120 36 L160 36 L172 70 L172 200 L110 200 L100 92 Z" fill="#f6b26b" fill-opacity="0.8"/>
  <path d="M240 36 L200 36 L188 70 L188 200 L250 200 L260 92 Z" fill="#f6b26b" fill-opacity="0.8"/>
  <path d="M160 36 Q180 58 200 36"/>
  <line x1="168" y1="120" x2="192" y2="120" stroke-width="3"/><rect x="174" y="114" width="12" height="12" fill="currentColor" fill-opacity="0.4"/>
  <line x1="168" y1="164" x2="192" y2="164" stroke-width="3"/><rect x="174" y="158" width="12" height="12" fill="currentColor" fill-opacity="0.4"/>
  ${lead(232, 140, 290, 150)}${b(296, 156, 'X', ' font-size="16"')}`, 380, 'A life vest labelled X');

  const lunchbox = () => svg(360, 196, `
  <polygon points="70,170 290,170 340,130 340,60 290,100 70,100" fill="currentColor" fill-opacity="0.14"/>
  <path d="M290 100 L290 170 M70 100 L70 170 L290 170 L340 130 L340 60"/>
  <g opacity="0.6"><path d="M140 92 L176 68 L196 92 Z" fill="#f9e1a8" stroke-width="1.5"/>
  <circle cx="222" cy="80" r="7" fill="#8bc34a" stroke-width="1.2"/><circle cx="238" cy="74" r="7" fill="#8bc34a" stroke-width="1.2"/><circle cx="252" cy="82" r="7" fill="#8bc34a" stroke-width="1.2"/></g>
  <polygon points="70,100 120,60 340,60 290,100" fill="#cfe8f7" fill-opacity="0.45"/>
  <polygon points="70,100 290,100 340,60 340,68 290,110 70,110" fill="#cfe8f7" fill-opacity="0.9"/>
  ${lead(300, 66, 322, 28)}${b(326, 26, 'X', ' font-size="16"')}
  ${lead(110, 150, 50, 172)}${b(32, 178, 'Y', ' font-size="16"')}`, 380, 'A lunch box with the lid labelled X and the box labelled Y; the food shows through the lid');

  // ---------- shared data for the x17 items ----------
  const BOOKS = { labels: ['P', 'Q', 'R', 'S'], values: [14, 26, 9, 31], max: 35, step: 5, yLabel: 'Books held', xLabel: 'Board', label: 'Bar graph: board P held 14 books, Q 26, R 9, S 31' };
  const TOWEL = [{ l: 'A', v: 70 }, { l: 'B', v: 55 }, { l: 'C', v: 100 }, { l: 'D', v: 85 }];
  const SOAK_ROWS = [['P', 20, 20], ['Q', 35, 38], ['R', 12, 40], ['S', 50, 54]];
  return {
    withTbl, beakers, dripSetup, booksBoard, bars, basin, wick, soakWeigh,
    umbrella, raincoat, boot, helmet, glasses, lifevest, lunchbox,
    BOOKS, TOWEL, SOAK_ROWS
  };
})();

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
      body: "A waterproof material does NOT absorb water. A waterproof material also does not let water pass through it. Plastic, rubber, glass, metal and ceramic are waterproof. Cotton cloth, paper and sponge absorb water, so they are not waterproof. Useful for raincoats, umbrellas, boots and cups." },
    { title: "Float or sink",
      body: "An object floats if it stays on or near the surface of the water. Wood, cork and polystyrene float. Glass marbles, steel nails, coins and ceramic sink. Plastics can float or sink depending on the plastic, so test it to find out!" },
    { title: "Transparent, translucent, opaque",
      body: "These three words tell us how much light a material allows to pass through. Learn each word AND what it means: markers often give the mark for the meaning. TRANSPARENT: allows most light to pass through, so we can see clearly through it (clear glass, clear plastic). TRANSLUCENT: allows some light to pass through, so things seen through it look blurry (frosted glass, tracing paper). OPAQUE: does not allow light to pass through, so we cannot see through it at all (wood, metal, ceramic, cardboard). In an answer, write both: 'Clear glass is transparent. It allows most light to pass through, so we can see outside clearly.'" },
    { title: "Answering 'why is it made of...?'",
      body: "Markers want TWO parts: the property + why it suits the use. Example: 'Plastic is waterproof (property), so the raincoat does not absorb rain and keeps the body dry (use).' Just writing 'plastic is good' is not enough yet: give the property AND why it suits the use." },
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
      explain: "To bend around the pot without breaking, the hose must be flexible. Strength is holding a heavy load without breaking, which is not what the hose needs here.",
      optionFeedback: {
        0: "Strength is a sensible guess, because a hose must not break. But strength is about holding a heavy load. Bending around the pot without breaking is flexibility.",
        1: "Transparency is about letting light through so we can see through it. The hose does not need that to bend around the pot.",
        3: "A hose carries water, so a water word feels right. But part X does not need to float. Its job is to bend: flexibility." } },
    { id: "mat-002", type: "mcq", level: 2,
      stem: "The picture shows a tent. Part G is the groundsheet, which lies on the wet grass. Which property of the groundsheet material keeps the sleeping bags inside the tent dry?",
      figure: matTent(false),
      options: ["It is waterproof.", "It is flexible.", "It floats on water.", "It is transparent."],
      answer: 0,
      explain: "A waterproof material does not let water pass through and does not absorb it, so the wet grass cannot make the sleeping bags wet. Being flexible lets the groundsheet be folded, but it does not keep things dry.",
      optionFeedback: {
        1: "The groundsheet is flexible, so it can be folded. Good thinking, but folding does not stop the wet grass making things wet. That job needs waterproof.",
        2: "Floating is a water word, so it feels close. But the groundsheet lies on grass, not in water. The bags stay dry because water cannot pass through: waterproof.",
        3: "Transparent is about light passing through. The bags stay dry because WATER cannot pass through, so the property is waterproof." } },
    { id: "mat-003", type: "mcq", level: 1,
      stem: "Which material allows most light to pass through it?",
      figure: null,
      options: ["Wood", "Ceramic", "Metal", "Clear glass"],
      answer: 3,
      explain: "Clear glass allows most light to pass through, so we can see clearly through it: it is transparent. Wood, ceramic and metal do not allow light to pass through: they are opaque.",
      optionFeedback: {
        0: "Wood is a very useful material, but we cannot see through a wooden door. Wood is opaque: no light passes through.",
        1: "Ceramic cups can be shiny, but no light passes through them. Ceramic is opaque.",
        2: "Metal can be shiny and reflect light, so it may look bright. But no light passes through metal: it is opaque." } },
    { id: "mat-004", type: "mcq", level: 1,
      stem: "Which of these objects will float on water?",
      figure: null,
      options: ["A steel nail", "A glass marble", "A wooden ice-cream stick", "A metal coin"],
      answer: 2,
      explain: "Wood floats on water, so the wooden ice-cream stick floats. Steel nails, glass marbles and metal coins sink, even though they are small and light. Whether an object floats depends on its material, not just its size.",
      optionFeedback: {
        0: "A nail is small and thin, so it can seem light enough to float. But steel sinks, whatever its size.",
        1: "A marble is small and smooth, so this is a fair guess. But glass sinks.",
        3: "A coin is flat and light, so it can look like it would float. But metal coins sink." } },
    { id: "mat-005", type: "mcq", level: 2,
      stem: "The picture shows a mop. Part X is the mop head. It must soak up water that is spilt on the floor. Which material is the most suitable for part X?",
      figure: MAT_FIG_MOP,
      options: ["Cotton strands", "Plastic strips", "Rubber strips", "Metal wires"],
      answer: 0,
      explain: "Cotton absorbs water, so the mop head can soak up the spill. Plastic, rubber and metal are waterproof: they do not absorb water, so they would only push the water around.",
      optionFeedback: {
        1: "Plastic strips can be soft and bendy like a mop, which is a fair thought. But plastic is waterproof: it does not soak up water, so it would only push the spill around.",
        2: "Rubber strips are bendy, which is a fair thought. But rubber is waterproof: it does not soak up water.",
        3: "Metal wires are strong, but metal does not absorb water, so the spill would stay on the floor." } },
    { id: "mat-006", type: "mcq", level: 2,
      stem: "The picture shows a swing in a playground. Part X holds up the seat. It must hold a child's weight without breaking. Which property of the material is the most important for part X?",
      figure: MAT_FIG_SWING,
      options: ["Transparency", "Waterproof", "Strength", "Ability to float"],
      answer: 2,
      explain: "Strength is the ability to hold a heavy load without breaking. Part X must hold up the child, so it must be strong.",
      optionFeedback: {
        0: "Part X does not need to let light through. Its job is to hold the child up, so it needs strength.",
        1: "Swings are outdoors in the rain, so waterproof is a good thought. But the question asks what part X must do: hold a child's weight without breaking. That is strength.",
        3: "The swing is not in water, so floating does not matter here. Holding a child's weight without breaking needs strength." } },
    { id: "mat-007", type: "mcq", level: 2,
      stem: "The picture shows a toy sailboat. Part X is the sail. The sail must be rolled up tightly when the boat is not in use. Which material is the most suitable for part X?",
      figure: MAT_FIG_BOAT,
      options: ["Thin plastic sheet", "Thick glass sheet", "Thick wooden board", "Thin ceramic tile"],
      answer: 0,
      explain: "To be rolled up, the sail must bend without breaking: it must be flexible. A thin plastic sheet is flexible. Glass and ceramic break instead of bending, and a thick wooden board hardly bends.",
      optionFeedback: {
        1: "Glass can be smooth and thin, but it breaks instead of bending, so it cannot be rolled up.",
        2: "Wood is strong and floats, which suits a boat. Good thinking! But a thick board hardly bends, so the sail could not be rolled up.",
        3: "Even a thin tile breaks instead of bending. Ceramic is not flexible, so it cannot be rolled up." } },
    { id: "mat-008", type: "mcq", level: 1,
      stem: "The blades of a pair of scissors are made of metal. Why?",
      figure: null,
      options: ["Metal is strong.", "Metal allows light to pass through.", "Metal floats on water.", "Metal absorbs water."],
      answer: 0,
      explain: "Metal is strong, so the blades do not break when cutting. Metal does not let light through, sinks, and does not absorb water.",
      optionFeedback: {
        1: "Metal does not let light through: it is opaque. The blades are metal because metal is strong enough to cut.",
        2: "Metal sinks in water. Floating is not the blades' job: cutting without breaking needs strength.",
        3: "Metal is waterproof, so it does not absorb water. The blades are metal because metal is strong." } },
    { id: "mat-009", type: "mcq", level: 1,
      stem: "Which material breaks most easily when it is dropped on the floor?",
      figure: null,
      options: ["Rubber", "Cloth", "Plastic", "Glass"],
      answer: 3,
      explain: "Glass is not strong, so it breaks easily into sharp pieces when it is dropped. Rubber, cloth and plastic bend or bounce instead, so they usually do not break.",
      optionFeedback: { 0: 'Rubber is a fair thought, but it bends and bounces when dropped, so it does not break.', 1: 'Cloth is a fair thought, but it is soft and flexible, so it does not break when it is dropped.', 2: 'Some plastic things can crack, so this is a fair thought. But most plastic bends or bounces when dropped. Glass breaks much more easily.' } },
    { id: "mat-010", type: "mcq", level: 1,
      stem: "Which material allows only SOME light to pass through, so things seen through it look blurry?",
      figure: null,
      options: ["Tracing paper", "Clear glass", "A wooden board", "A metal tray"],
      answer: 0,
      explain: "Tracing paper is translucent: it allows some light to pass through. Clear glass is transparent: it allows most light to pass through. Wood and metal are opaque: they do not allow light to pass through.",
      optionFeedback: {
        1: "Clear glass lets light through, so you are close! But it lets MOST light through, so things look clear, not blurry. That is transparent.",
        2: "A wooden board does not let any light through, so we see nothing at all. Wood is opaque.",
        3: "A metal tray lets no light through, so we see nothing at all. Metal is opaque." } },
    { id: "mat-051", type: "mcq", level: 1,
      stem: "A material that allows most light to pass through is ______.",
      figure: null,
      options: ["opaque", "translucent", "transparent", "waterproof"],
      answer: 2,
      explain: "Transparent means it allows most light to pass through, so we can see clearly through it, like clear glass. Translucent allows only some light through. Opaque does not allow light to pass through.",
      optionFeedback: {
        0: "Opaque is one of the light words, so you are in the right family. But opaque means NO light passes through.",
        1: "So close: translucent lets SOME light through. When MOST light passes through, the word is transparent.",
        3: "Waterproof is about water, not light. The light words are transparent, translucent and opaque." } },
    { id: "mat-052", type: "mcq", level: 2,
      stem: "Ahmad sleeps in a bright room. He wants a sleeping mask that stops the light from reaching his eyes. The part of the mask that covers his eyes should be made of a material that is ______.",
      figure: null,
      options: ["transparent", "opaque", "translucent", "waterproof"],
      answer: 1,
      explain: "Opaque means it does not allow light to pass through, so no light reaches his eyes. A transparent material allows most light through and a translucent one allows some light through, so the room would still look bright.",
      optionFeedback: {
        0: "Transparent lets most light through, so the light would still reach his eyes.",
        2: "Translucent sounds dim, but it still lets some light through. To stop the light, the mask must be opaque.",
        3: "A mask might get sweaty, so waterproof is a fair thought. But the job here is to stop light, so it must be opaque." } },

    // ---------------- MCQ, level 2 ----------------
    { id: "mat-011", type: "mcq", level: 2,
      stem: "Mrs Tan wants a tablecloth that can be folded easily. Which property of the material is the most important?",
      figure: null,
      options: ["Strength", "Flexibility", "Ability to float", "Transparency"],
      answer: 1,
      explain: "To fold the tablecloth, the material must bend without breaking, so it must be flexible. A tablecloth does not need to hold heavy loads, float or let light through.",
      optionFeedback: {
        0: "A tablecloth should not tear, so strength sounds useful. But folding means bending without breaking: flexibility.",
        2: "A tablecloth is not used in water, so floating does not matter. Folding needs flexibility.",
        3: "We do not need to see through a tablecloth. Folding it needs flexibility." } },
    { id: "mat-012", type: "mcq", level: 2,
      stem: "Balloons are made of rubber. Which property of rubber makes it suitable?",
      figure: null,
      options: ["Rubber is flexible and can stretch without breaking.", "Rubber allows most light to pass through.", "Rubber absorbs water.", "Rubber sinks in water."],
      answer: 0,
      explain: "A balloon must stretch as air is blown in. Rubber is flexible, so it bends and stretches without breaking. Letting light through, absorbing water and sinking or floating are not what a balloon needs.",
      optionFeedback: {
        1: "Some balloons look see-through, so this is a fair thought. But rubber is chosen because it stretches without breaking.",
        2: "Rubber is waterproof: it does not absorb water. The balloon needs rubber because it stretches.",
        3: "Floating or sinking does not help a balloon. It must stretch without breaking, so it must be flexible." } },
    { id: "mat-013", type: "mcq", level: 2,
      stem: "A fish tank must hold water and let us see the fish clearly. Which material is the most suitable?",
      figure: null,
      options: ["Wood", "Cloth", "Ceramic", "Glass"],
      answer: 3,
      explain: "Glass is waterproof AND transparent: it allows most light to pass through, so we can see the fish. Wood and ceramic are opaque: they do not allow light to pass through. Cloth absorbs water.",
      optionFeedback: {
        0: "Wood is strong, but it is opaque, so we could not see the fish.",
        1: "Cloth absorbs water, so the water would soak through and leak out of the tank.",
        2: "Ceramic is waterproof, so it can hold water: good thinking! But it is opaque, so we could not see the fish." } },
    { id: "mat-014", type: "mcq", level: 2,
      stem: "A shower curtain must be waterproof and flexible. Which material is the most suitable?",
      figure: null,
      options: ["Paper", "Plastic", "Glass", "Wood"],
      answer: 1,
      explain: "The curtain needs two properties, and plastic has both: it is waterproof and flexible. Paper is flexible but absorbs water. Glass is waterproof but breaks instead of bending, and wood is too stiff to hang and fold.",
      optionFeedback: {
        0: "Paper is flexible, which is half of what we need. But paper absorbs water, so it would get soggy and tear.",
        2: "Glass is waterproof, which is half of what we need. But glass is not flexible: it would break instead of bending.",
        3: "Wood is too stiff to hang and fold like a curtain." } },
    { id: "mat-015", type: "mcq", level: 2,
      stem: "Bathroom floor tiles are often made of ceramic. Which property of ceramic makes it suitable?",
      figure: null,
      options: ["It is waterproof.", "It is flexible.", "It allows most light to pass through.", "It floats on water."],
      answer: 0,
      explain: "The bathroom floor gets wet. Ceramic is waterproof, so the tiles do not absorb the water. Ceramic is not flexible, does not let light through and sinks, so those are not the reasons.",
      optionFeedback: {
        1: "Ceramic is not flexible: it breaks instead of bending. The floor tiles are ceramic because ceramic is waterproof.",
        2: "Ceramic does not let light through: it is opaque.",
        3: "Ceramic sinks, and a floor does not need to float. The reason is that ceramic is waterproof." } },
    { id: "mat-016", type: "mcq", level: 2,
      stem: "Which object is correctly matched to a property of its material?",
      figure: null,
      options: ["Window glass: does not allow light to pass through", "Paper bag: waterproof", "Ceramic bowl: flexible", "Rubber gloves: waterproof"],
      answer: 3,
      explain: "Rubber is waterproof. Window glass allows most light through, paper absorbs water, and ceramic is not flexible.",
      optionFeedback: { 0: 'Window glass is chosen BECAUSE it lets most light through, so this match is back to front. Glass is transparent.', 1: 'Paper bags are handy, but paper absorbs water, so it is not waterproof.', 2: 'A ceramic bowl breaks instead of bending, so it is not flexible.' } },
    { id: "mat-017", type: "mcq", level: 2,
      stem: "Mei wants her bathroom window to let light in, but she does not want people outside to see in clearly. Which material should she use?",
      figure: null,
      options: ["Clear glass", "Frosted glass", "Wood", "Metal"],
      answer: 1,
      explain: "Frosted glass is translucent: it allows some light to pass through, so the room is bright but people cannot see in clearly. Clear glass is transparent, so people could see in. Wood and metal are opaque: they do not allow light to pass through, so the room would be dark.",
      optionFeedback: {
        0: "Clear glass lets the light in: half the job done! But it is transparent, so people outside could see in clearly.",
        2: "Wood stops people seeing in, which is half the job. But it is opaque, so no light gets in and the room is dark.",
        3: "Metal stops people seeing in, which is half the job. But it is opaque, so no light gets in and the room is dark." } },
    { id: "mat-018", type: "mcq", level: 2,
      stem: "Raju wants to build a small raft that floats and can carry a heavy load without breaking. Which material is the most suitable?",
      figure: null,
      options: ["Glass", "Ceramic", "Paper", "Wood"],
      answer: 3,
      explain: "Wood floats and is strong. Glass and ceramic sink and break easily. Paper absorbs water and is not strong.",
      optionFeedback: {
        0: "Glass sinks, and it breaks easily, so it cannot carry a heavy load.",
        1: "Ceramic sinks, and it breaks easily, so it cannot carry a heavy load.",
        2: "Paper can float for a short time, so this is a fair thought. But it soaks up water and tears, so it cannot carry a heavy load." } },
    { id: "mat-053", type: "mcq", level: 2,
      stem: "Which material is correctly matched to how much light passes through it?",
      figure: null,
      options: ["Clear plastic: opaque", "Cardboard: transparent", "Tracing paper: opaque", "Frosted glass: translucent"],
      answer: 3,
      explain: "Frosted glass is translucent: it allows some light to pass through, so things look blurry. Clear plastic is transparent (allows most light through). Cardboard is opaque (does not allow light to pass through). Tracing paper is translucent, not opaque.",
      optionFeedback: {
        0: "Clear plastic lets most light through, so it is transparent, not opaque.",
        1: "Cardboard blocks the light, so it is opaque, not transparent.",
        2: "Tracing paper does let some light through, so it is translucent, not opaque. Things look blurry through it, but they are not hidden." } },
    { id: "mat-019", type: "mcq", level: 2,
      stem: "Plates for young children are often made of plastic instead of ceramic. Why?",
      figure: null,
      options: ["Plastic allows most light to pass through.", "Plastic absorbs water.", "Plastic does not break easily when dropped.", "Plastic sinks in water."],
      answer: 2,
      explain: "Young children may drop their plates. Ceramic breaks easily, but plastic usually does not, so the child will not get hurt by sharp pieces.",
      optionFeedback: {
        0: "Most children's plates are coloured plastic that we cannot see through. The reason is safety: plastic does not break easily.",
        1: "Plastic does not absorb water: it is waterproof. The reason is that it does not break easily when dropped.",
        3: "Sinking or floating does not matter for a plate. The reason is that plastic does not break easily." } },
    { id: "mat-020", type: "mcq", level: 2,
      stem: "Siti hung weights one at a time on strips of different materials until each strip broke. The results are shown. Which material is the strongest?",
      figure: MAT_TBL_STRENGTH,
      options: ["A", "B", "C", "D"],
      answer: 1,
      explain: "B held the most weights (12) before it broke, so B is the strongest. C held the fewest (2), so C is the weakest. Next time, try Read, compare, conclude: read every row, compare them, then say your answer.",
      technique: "Read, compare, conclude",
      steps: [
        "Read what the numbers measure (weights held, how far it bent, water or light that got through).",
        "Decide what the question wants: the most, the least, or a middle amount?",
        "Compare EVERY value, not just the first few.",
        "Conclude: say the letter and the number that proves it."],
      optionFeedback: {
        0: "A held 5 weights. That is more than C, but B held more.",
        2: "C held the fewest weights (2), so C is the weakest. The strongest held the MOST weights.",
        3: "D held 8, the second most. Check every row: B held 12." } },
    { id: "mat-021", type: "mcq", level: 2,
      stem: "Jane set up the experiment shown. She added weights one at a time until the strip broke. Which property of the material was she testing?",
      figure: MAT_FIG_STRENGTH_SETUP,
      options: ["Flexibility", "Strength", "Waterproof", "Transparency"],
      answer: 1,
      explain: "Adding weights until the strip breaks tests how heavy a load it can hold: its strength. Next time, find what was measured: it tells you the property.",
      technique: "Change one thing",
      steps: [
        "Find what is changed: the type of material.",
        "Find what is measured or watched in the test.",
        "Match the measurement to the property: weights until it breaks is strength; how far it bends is flexibility; water getting through is waterproof; light getting through is transparency.",
        "Check the other options: was water or light even used in this test?"],
      optionFeedback: {
        0: "The strip may bend a little as the weights go on, so flexibility is a fair guess. But Jane kept adding weights until it BROKE. That tests strength.",
        2: "No water is used in this test, so it cannot be testing waterproof.",
        3: "No light is shone in this test, so it cannot be testing transparency." } },
    { id: "mat-022", type: "mcq", level: 2,
      stem: "Ahmad clamped strips of four materials to a table and hung the same mass at the end of each. He measured how far the end of each strip moved down. Which material is the most flexible?",
      figure: MAT_TBL_FLEX,
      options: ["P", "Q", "R", "S"],
      answer: 1,
      explain: "The strip that bends the most (moves down the furthest) is the most flexible. Q moved down 9 cm. S did not bend at all. Next time, try Read, compare, conclude: read every row, compare them, then say your answer.",
      technique: "Read, compare, conclude",
      steps: [
        "Read what the numbers measure (weights held, how far it bent, water or light that got through).",
        "Decide what the question wants: the most, the least, or a middle amount?",
        "Compare EVERY value, not just the first few.",
        "Conclude: say the letter and the number that proves it."],
      optionFeedback: {
        0: "P moved only 2 cm. Check for a bigger number: the most flexible bent the most.",
        2: "R moved 5 cm, which is quite a lot, but Q moved further (9 cm).",
        3: "S did not bend at all (0 cm), so S is the LEAST flexible. The most flexible moved down the most." } },

    // ---------------- MCQ, level 3 ----------------
    { id: "mat-023", type: "mcq", level: 3,
      stem: "Ahmad used this set-up to find out which material is the most flexible. Which of these must he keep the same to make it a fair test?",
      figure: MAT_FIG_FLEX_SETUP,
      options: ["The type of material", "The length and thickness of each strip", "How far each strip bends", "The number of strips that break"],
      answer: 1,
      explain: "Only the type of material is changed. The length and thickness (and the mass hung) are kept the same. How far each strip bends is what he measures. Next time, try Change one thing: find what changes, find what is measured, and check everything else stays the same.",
      technique: "Change one thing",
      steps: [
        "Find the ONE thing that is changed on purpose (usually the type of material).",
        "Find what is measured: the result, such as weights held, how far it bent or water left.",
        "Everything else must be kept the same: size, length, thickness, the mass hung, the amount of water, the time.",
        "Check each choice: is it the changed thing, the measured thing, or a kept-the-same thing?"],
      optionFeedback: {
        0: "The type of material is what Ahmad changes on purpose, so it cannot be kept the same.",
        2: "How far each strip bends is what he measures. It is the result, so it is allowed to be different.",
        3: "The strips are not meant to break in a bending test, and he cannot control that. It is not a kept-the-same thing." } },
    { id: "mat-024", type: "mcq", level: 3,
      stem: "Kim put 50 ml of water into each of four beakers. She put a same-sized piece of a different material into each beaker for 5 minutes, took it out and measured the water left. Which materials are waterproof?",
      figure: MAT_TBL_WATER,
      options: ["X only", "X and Y", "Y and Z", "W and Z"],
      answer: 3,
      explain: "Water absorbed = water at the start - water left. W: 50 - 50 = 0 ml. X: 50 - 32 = 18 ml. Y: 50 - 45 = 5 ml. Z: 50 - 50 = 0 ml. W and Z absorbed no water, so they are waterproof. X and Y absorbed some. Next time, try Start minus left: take away for every one before you choose.",
      technique: "Start minus left",
      steps: ['Find the water at the start and the water left for each material.', 'Take away: water at the start minus water left = water absorbed.', 'Work out the answer for EVERY material before you choose.', 'Compare: the biggest number absorbed the most. 0 ml absorbed means waterproof.'],
      optionFeedback: {
        0: "X has the least water left, so it absorbed the MOST (50 - 32 = 18 ml). Waterproof means it absorbed none.",
        1: "X and Y both have less than 50 ml left, so they absorbed some water. Waterproof ones absorbed 0 ml.",
        2: "Z is right: 50 - 50 = 0 ml. But Y absorbed 50 - 45 = 5 ml, so Y is not waterproof. W absorbed 0 ml too." } },
    { id: "mat-025", type: "mcq", level: 3,
      stem: "Leon needs a material to make a float for his fishing line. It must float on water and must not absorb water. Which material should he choose?",
      figure: `<table><tr><th>Material</th><th>Floats on water?</th><th>Absorbs water?</th></tr>
<tr><td>A</td><td>Yes</td><td>Yes</td></tr><tr><td>B</td><td>Yes</td><td>No</td></tr><tr><td>C</td><td>No</td><td>No</td></tr><tr><td>D</td><td>No</td><td>Yes</td></tr></table>`,
      options: ["A", "B", "C", "D"],
      answer: 1,
      explain: "Only B floats AND does not absorb water (it is waterproof). A floats but absorbs water; C and D sink. Next time, try Read, compare, conclude: read every row, compare them, then say your answer.",
      technique: "Read, compare, conclude",
      steps: [
        "List what the job needs: one property for each job in the question.",
        "Go down the table one row at a time.",
        "Tick only a row that has EVERY property the job needs. Ignore columns the job does not need.",
        "Conclude: say the letter and the properties that decided it."],
      optionFeedback: {
        0: "A floats, which is half the job. But A absorbs water, so the float would get soggy and heavy.",
        2: "C does not absorb water, which is half the job. But C sinks.",
        3: "D sinks, and it absorbs water too." } },
    { id: "mat-026", type: "mcq", level: 3,
      stem: "A window on a boat must be waterproof, allow us to see clearly outside, and not break easily. Which material is the most suitable?",
      figure: `<table><tr><th>Material</th><th>Waterproof?</th><th>How much light passes through</th><th>Breaks easily?</th></tr>
<tr><td>P</td><td>Yes</td><td>Most</td><td>Yes</td></tr><tr><td>Q</td><td>Yes</td><td>Most</td><td>No</td></tr><tr><td>R</td><td>No</td><td>Some</td><td>No</td></tr><tr><td>S</td><td>Yes</td><td>None</td><td>No</td></tr></table>`,
      options: ["P", "Q", "R", "S"],
      answer: 1,
      explain: "Q has all three: waterproof, transparent (allows most light to pass through, so we see clearly), and does not break easily. P breaks easily. R absorbs water and is only translucent. S is opaque: it does not allow light to pass through. Next time, try Read, compare, conclude: read every row, compare them, then say your answer.",
      technique: "Read, compare, conclude",
      steps: [
        "List what the job needs: one property for each job in the question.",
        "Go down the table one row at a time.",
        "Tick only a row that has EVERY property the job needs. Ignore columns the job does not need.",
        "Conclude: say the letter and the properties that decided it."],
      optionFeedback: {
        0: "P is waterproof and lets most light through: two out of three! But P breaks easily.",
        2: "R does not break easily, but it absorbs water and lets only some light through.",
        3: "S is waterproof and does not break easily, but no light passes through, so no one could see outside." } },
    { id: "mat-027", type: "mcq", level: 3,
      stem: "Nurul shone a torch through sheets of materials A, B and C, one at a time. A light sensor measured the amount of light that passed through: A = 90 units, B = 40 units, C = 0 units. Which material is most likely tracing paper?",
      figure: MAT_FIG_LIGHT_SETUP,
      options: ["A, because it allowed the most light to pass through", "B, because it allowed some light to pass through", "C, because it allowed no light to pass through", "A, because it allowed no light to pass through"],
      answer: 1,
      explain: "Tracing paper is translucent: it allows SOME light to pass through, like B. A allowed the most light through, so it is transparent, like clear glass or clear plastic. C allowed no light through, so it is opaque, like wood or cardboard. Next time, try Read, compare, conclude: read every row, compare them, then say your answer.",
      technique: "Read, compare, conclude",
      steps: [
        "Read how much light passed through each material.",
        "Sort them: most light is transparent; some light is translucent; no light is opaque.",
        "Decide what the job or question needs: most, some or none.",
        "Conclude with the letter and the number that proves it."],
      optionFeedback: {
        0: "A let the most light through, so A is transparent, like clear glass. Tracing paper lets only some light through.",
        2: "C let no light through, so C is opaque, like cardboard. Tracing paper lets some light through.",
        3: "A let 90 units through, the most, so the reason does not match the numbers. Tracing paper lets some light through, like B." } },
    { id: "mat-054", type: "mcq", level: 3,
      stem: "Nurul shone a torch through sheets of materials A, B and C, one at a time. A light sensor measured the amount of light that passed through: A = 90 units, B = 40 units, C = 0 units. Which sentence describes the materials correctly?",
      figure: MAT_FIG_LIGHT_SETUP,
      options: ["A is opaque, B is translucent, C is transparent.", "A is translucent, B is transparent, C is opaque.", "A is transparent, B is translucent, C is opaque.", "A is transparent, B is opaque, C is translucent."],
      answer: 2,
      explain: "A let the most light through (90 units), so it is transparent: it allows most light to pass through. B let some light through (40 units), so it is translucent. C let no light through (0 units), so it is opaque: it does not allow light to pass through. Next time, try Read, compare, conclude: read every row, compare them, then say your answer.",
      technique: "Read, compare, conclude",
      steps: [
        "Read how much light passed through each material.",
        "Sort them: most light is transparent; some light is translucent; no light is opaque.",
        "Decide what the job or question needs: most, some or none.",
        "Conclude with the letter and the number that proves it."],
      optionFeedback: {
        0: "This is the right list read backwards. A let the MOST light through, so A is transparent, not opaque.",
        1: "A and B have swapped. A let more light through (90) than B (40), so A is transparent and B is translucent.",
        3: "B and C have swapped. C let no light through (0), so C is opaque, and B is translucent." } },
    { id: "mat-028", type: "mcq", level: 3,
      stem: "Ken wanted to find out which material is the strongest. His results are shown. Why is his experiment NOT a fair test?",
      figure: MAT_TBL_KEN,
      options: ["He used strips of different lengths.", "He used three different materials.", "He counted the number of weights.", "The metal strip held the most weights."],
      answer: 0,
      explain: "Ken changed the type of material, which is the one thing he should change. But he ALSO changed the length: the plastic strip was 30 cm and the others were 20 cm. In a fair test only one thing changes, so we cannot tell whether the plastic held fewer weights because of the material or because it was longer. Next time, try Change one thing: find what changes, find what is measured, and check everything else stays the same.",
      technique: "Change one thing",
      steps: [
        "Find the ONE thing that should change (usually the type of material).",
        "Look across every row or set-up for anything ELSE that is different, such as length or thickness.",
        "If two things changed, we cannot tell which one caused the result, so the test is not fair.",
        "The fix is to keep that other thing the same for every material."],
      optionFeedback: {
        1: "Using different materials is the point of the test: it is the one thing he is meant to change.",
        2: "Counting the weights is a good way to measure strength, so that part is fine.",
        3: "That is a result, not a reason the test is unfair. Look at the lengths." } },
    { id: "mat-029", type: "mcq", level: 3,
      stem: "Meiling says, 'Objects made of metal are never flexible.' Which object shows that she is wrong?",
      figure: null,
      options: ["An iron nail", "A steel spoon", "Aluminium foil", "A metal pot"],
      answer: 2,
      explain: 'To show Meiling\'s idea is not true, we need a metal object that IS flexible. Aluminium foil is a thin metal sheet that bends easily without breaking. A nail, a spoon and a pot are stiff, so they agree with her instead.',
      optionFeedback: {
        0: "An iron nail is metal and stiff, so it agrees with Meiling. We need a metal object that bends.",
        1: "A steel spoon is metal and stiff, so it agrees with Meiling. We need a metal object that bends.",
        3: "A metal pot is stiff, so it agrees with Meiling. We need a metal object that bends." } },
    { id: "mat-030", type: "mcq", level: 2,
      stem: "Which statement about materials is correct?",
      figure: null,
      options: ["All plastics float on water.", "All waterproof materials allow light to pass through.", "A strong material is always flexible.", "One material can have more than one property."],
      answer: 3,
      explain: "Glass, for example, is waterproof AND allows most light through. Some plastics sink; metal is waterproof but lets no light through; a thick wooden block is strong but not flexible.",
      optionFeedback: {
        0: "Many plastics float, so this is easy to believe. But some plastics sink, so not ALL of them float.",
        1: "Glass is waterproof and lets light through, but metal is waterproof and lets no light through. So not ALL waterproof materials let light through.",
        2: "A thick wooden block is strong but hardly bends, so a strong material is not always flexible." } },

    // ---------------- OEQ, level 1 ----------------
    { id: "mat-031", type: "oeq", level: 1, marks: 1,
      stem: "Name one material that is waterproof.",
      figure: null,
      model: "Plastic (or rubber, glass, metal, ceramic).",
      keys: [ ["plastic", "rubber", "glass", "metal", "ceramic"] ],
      explain: "Any waterproof material earns the mark: plastic, rubber, glass, metal or ceramic. Cloth and paper are not waterproof, because they absorb water." },
    { id: "mat-032", type: "oeq", level: 3, marks: 3,
      stem: "Mia wants to make the cover of an umbrella. She says, 'Paper is a good material for the cover because it is flexible and can be folded.'\n(a) Do you agree with Mia? (1 mark)\n(b) Explain your answer. (2 marks)",
      figure: null,
      model: "(a) No, I do not agree. (b) Paper is flexible, but it absorbs water and is not waterproof. The rain will soak through the paper cover and the person under the umbrella will get wet.",
      keys: [ ["do not agree", "disagree", "no"], ["absorbs water", "not waterproof", "absorb water"], ["get wet", "rain will soak through", "not keep the rain out"] ],
      explain: "A material must have ALL the properties a use needs. An umbrella cover must be flexible AND waterproof. Paper only has one of them. Mark points: disagree; paper absorbs water / is not waterproof; so the person gets wet. Next time, try Claim, evidence, reason, and give every property its own 'so'.",
      technique: "Claim, evidence, reason",
      steps: [
        "Claim: answer the first part straight away: agree or do not agree.",
        "Evidence: say which property the material has, and which property the use needs that it is missing.",
        "Reason: tie the missing property to the use with 'so', like 'paper absorbs water, so the rain soaks through and the person gets wet'.",
        "Check: a material must have EVERY property the use needs, not just one."] },
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
      explain: "Markers look for two parts: the property (waterproof) and what it does for the raincoat (the rain cannot soak through, so the person stays dry). Next time, try Claim, evidence, reason, and give every property its own 'so'.",
      technique: "Claim, evidence, reason",
      steps: [
        "Claim: name the property of the material.",
        "Evidence: say what the object has to do, from the question.",
        "Reason: join them with 'so', like 'plastic is waterproof, so the rain cannot soak through and she stays dry'.",
        "Read it back: does your answer say what the property does for the person using it?"] },
    { id: "mat-034", type: "oeq", level: 1, marks: 2,
      stem: "Windows are usually made of clear glass. Explain why.",
      figure: null,
      model: "Clear glass is transparent. It allows most light to pass through, so the room is bright and we can see outside clearly.",
      keys: [ ["transparent", "allows most light", "lets most light pass through"], ["see outside", "see through", "room is bright", "bright"] ],
      explain: "Property (transparent: allows most light to pass through) + use (we can see out / the room is bright). Either the word 'transparent' or its meaning earns the first mark; writing both is safest. Next time, try Claim, evidence, reason, and give every property its own 'so'.",
      technique: "Claim, evidence, reason",
      steps: [
        "Claim: name the property of the material.",
        "Evidence: say what the object has to do, from the question.",
        "Reason: join them with 'so', like 'clear glass is transparent, so most light passes through and we can see outside clearly'.",
        "Read it back: does your answer say what the property does for the person using it?"] },

    // ---------------- OEQ, level 2 ----------------
    { id: "mat-035", type: "oeq", level: 2, marks: 2,
      stem: "Bath towels are made of cotton cloth. Explain why.",
      figure: null,
      model: "Cotton cloth absorbs water, so it can dry our body after a bath.",
      keys: [ ["absorbs water", "absorb water", "absorbs"], ["dry our body", "dry", "wipe"] ],
      explain: "Cotton cloth absorbs water, so the towel soaks up the water on our body and dries us. Here NOT being waterproof is exactly what we want. Next time, try Claim, evidence, reason, and give every property its own 'so'.",
      technique: "Claim, evidence, reason",
      steps: [
        "Claim: name the property of the material.",
        "Evidence: say what the object has to do, from the question.",
        "Reason: join them with 'so', like 'cotton absorbs water, so the towel soaks up the water and dries our body'.",
        "Read it back: does your answer say what the property does for the person using it?"] },
    { id: "mat-036", type: "oeq", level: 2, marks: 2,
      stem: "Rubber bands are made of rubber. Explain why rubber is suitable.",
      figure: null,
      model: "Rubber is flexible, so the rubber band can bend and stretch without breaking to hold things together.",
      keys: [ ["flexible", "bend", "stretch"], ["without breaking", "not break", "hold things", "tie"] ],
      explain: "Property (flexible) + use (stretches around things without breaking). Next time, try Claim, evidence, reason, and give every property its own 'so'.",
      technique: "Claim, evidence, reason",
      steps: [
        "Claim: name the property of the material.",
        "Evidence: say what the object has to do, from the question.",
        "Reason: join them with 'so', like 'rubber is flexible, so the band can stretch around things without breaking'.",
        "Read it back: does your answer say what the property does for the person using it?"] },
    { id: "mat-037", type: "oeq", level: 2, marks: 2,
      stem: "Why is glass NOT a suitable material for a young child's drinking cup?",
      figure: null,
      model: "Glass is not strong and breaks easily. If the child drops the cup, it may break and the sharp pieces can hurt the child.",
      keys: [ ["breaks easily", "break easily", "not strong"], ["hurt", "cut", "injure", "sharp", "dropped"] ],
      explain: "Property (breaks easily / not strong) + why that matters (the child may get hurt). Next time, try Claim, evidence, reason, and give every property its own 'so'.",
      technique: "Claim, evidence, reason",
      steps: [
        "Claim: name the property of the material.",
        "Evidence: say what the object has to do, from the question.",
        "Reason: join them with 'so', like 'glass breaks easily, so if the cup is dropped, the sharp pieces can hurt the child'.",
        "Read it back: does your answer say what the property does for the person using it?"] },
    { id: "mat-038", type: "oeq", level: 2, marks: 2,
      stem: "Give two reasons why wood is a suitable material for making a raft.",
      figure: null,
      model: "Wood can float on water. Wood is strong, so it can hold the weight of people without breaking.",
      keys: [ ["float"], ["strong", "hold heavy", "carry", "not break"] ],
      explain: "One mark for 'floats', one mark for 'strong / holds a heavy load without breaking'. Next time, try Claim, evidence, reason, and give every property its own 'so'.",
      technique: "Claim, evidence, reason",
      steps: [
        "Claim: name the first property of wood the raft needs.",
        "Evidence: say what a raft has to do: stay on top of the water and carry people.",
        "Reason: join each property to the job with 'so', like 'wood is strong, so it can hold the people without breaking'.",
        "Two reasons asked means two separate sentences, one property each."] },
    { id: "mat-039", type: "oeq", level: 2, marks: 2,
      stem: "A shower curtain is made of plastic, not cotton cloth. Explain why plastic is more suitable.",
      figure: null,
      model: "Plastic is waterproof and does not absorb water. Cotton cloth absorbs water, so the curtain would become wet and heavy.",
      keys: [ ["plastic is waterproof", "plastic does not absorb", "waterproof"], ["cloth absorbs", "cloth will absorb", "cloth is not waterproof", "cloth would get wet"] ],
      explain: "Compare both materials: plastic does not absorb water, cloth does. Next time, try Claim, evidence, reason, and give every property its own 'so'.",
      technique: "Claim, evidence, reason",
      steps: [
        "Claim: say the property of plastic that the curtain needs.",
        "Evidence: say what the curtain has to do: keep the shower water in.",
        "Reason: say what plastic does AND what cloth would do, like 'cloth absorbs water, so the curtain would get wet and heavy'.",
        "When a question compares two materials, write about both of them."] },
    { id: "mat-040", type: "oeq", level: 2, marks: 2,
      stem: "A fish tank is made of glass. State two properties of glass that make it suitable for a fish tank.",
      figure: null,
      model: "Glass is waterproof, so it can hold water without absorbing it. Glass is transparent. It allows most light to pass through, so we can see the fish clearly.",
      keys: [ ["waterproof", "does not absorb water"], ["transparent", "allows most light", "see the fish"] ],
      explain: "One mark for each property linked to its use. For the second mark, 'transparent' or 'allows most light to pass through' both name the property. Next time, try Claim, evidence, reason, and give every property its own 'so'.",
      technique: "Claim, evidence, reason",
      steps: [
        "Claim: name the first property of glass.",
        "Evidence: say what a fish tank has to do: hold water, and let us see the fish.",
        "Reason: join each property to its job with 'so', like 'glass is transparent, so we can see the fish clearly'.",
        "Two properties asked means two sentences, each with its own 'so'."] },
    { id: "mat-041", type: "oeq", level: 2, marks: 2,
      stem: "Some bathroom windows are made of frosted glass instead of clear glass. Explain why.",
      figure: null,
      model: "Frosted glass is translucent. It allows only some light to pass through. The bathroom is still bright, but people outside cannot see in clearly.",
      keys: [ ["translucent", "some light"], ["cannot see in clearly", "cannot see clearly", "privacy", "blurry"] ],
      explain: "Property (translucent: allows some light to pass through) + use (light gets in, but no one can see in clearly). Either the word or its meaning earns the first mark. Next time, try Claim, evidence, reason, and give every property its own 'so'.",
      technique: "Claim, evidence, reason",
      steps: [
        "Claim: name the property of the material.",
        "Evidence: say what the object has to do, from the question.",
        "Reason: join them with 'so', like 'frosted glass is translucent, so some light comes in but people cannot see in clearly'.",
        "Read it back: does your answer say what the property does for the person using it?"] },
    { id: "mat-042", type: "oeq", level: 2, marks: 2,
      stem: "Cups are often made of ceramic. State one property of ceramic that makes it suitable for a cup, and explain why.",
      figure: null,
      model: "Ceramic is waterproof, so it does not absorb the drink and the cup can hold the drink without leaking.",
      keys: [ ["waterproof", "does not absorb"], ["hold the drink", "hold water", "not leak", "drink"] ],
      explain: "Property (waterproof) + use (holds the drink). Waterproof is the safest property to give: ceramic still breaks easily if the cup is dropped. Next time, try Claim, evidence, reason, and give every property its own 'so'.",
      technique: "Claim, evidence, reason",
      steps: [
        "Claim: name the property of the material.",
        "Evidence: say what the object has to do, from the question.",
        "Reason: join them with 'so', like 'ceramic is waterproof, so the cup holds the drink without leaking'.",
        "Read it back: does your answer say what the property does for the person using it?"] },

    // ---------------- OEQ, level 3 (experiments) ----------------
    { id: "mat-043", type: "oeq", level: 3, marks: 2,
      stem: "Look at Siti's results. Which material, A or D, is more suitable for making a shelf to hold heavy books? Explain your answer using the results.",
      figure: MAT_TBL_STRENGTH,
      model: "Material D. It held more weights (8) than A (5) before it broke, so it is stronger and can hold heavy books without breaking.",
      keys: [ ["D"], ["more weights", "8", "stronger"] ],
      explain: "Claim: material D. Evidence: D held 8 weights before it broke, more than A (5). Reason: D is stronger, so a shelf of D can hold heavy books without breaking. Next time, try Claim, evidence, reason, and give every property its own 'so'.",
      technique: "Claim, evidence, reason",
      steps: ['Claim: say the answer first (the material, or agree / do not agree).', 'Evidence: point to the table, the picture or the numbers.', 'Reason: name the property, then add \'so\' and say what it does for the user, like \'D is strong, so the shelf holds heavy books without breaking\'.', 'One property, one \'so\' sentence. If a part needs two properties, write two sentences.'] },
    { id: "mat-044", type: "oeq", level: 3, marks: 2,
      stem: "Jane used this set-up to test the strength of four materials. (a) What did she change in her experiment? (b) State one thing she must keep the same.",
      figure: MAT_FIG_STRENGTH_SETUP,
      model: "(a) The type of material. (b) The size (length, width, thickness) of the strips / the mass of each weight / the distance between the desks.",
      keys: [ ["type of material"], ["length", "width", "thickness", "size", "mass of each weight", "distance between the desks"] ],
      explain: "Changed variable = type of material. Many answers are accepted for 'kept the same'. Next time, try Change one thing: find what changes, find what is measured, and check everything else stays the same.",
      technique: "Change one thing",
      steps: ['Find the ONE thing that is changed on purpose (usually the type of material).', 'Find what is measured: the result, such as weights held, how far it bent or water left.', 'Everything else must be kept the same: size, length, thickness, the mass hung, the amount of water, the time.', 'Check your answer: say which thing is changed, which is measured, and which are kept the same.'] },
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
      explain: "Flexibility is measured by how much the strip bends with the same mass. Next time, try Change one thing: find what changes, find what is measured, and check everything else stays the same.",
      technique: "Change one thing",
      steps: ['Find the ONE thing that is changed on purpose (usually the type of material).', 'Find what is measured: the result, such as weights held, how far it bent or water left.', 'Everything else must be kept the same: size, length, thickness, the mass hung, the amount of water, the time.', 'Check your answer: say which thing is changed, which is measured, and which are kept the same.'] },
    { id: "mat-047", type: "oeq", level: 3, marks: 2,
      stem: "Look at Kim's results. Which material, X or Y, absorbed more water? Explain using the results.",
      figure: MAT_TBL_WATER,
      model: "X. Only 32 ml of water was left in its beaker, which is less than for Y (45 ml), so X absorbed more water (18 ml).",
      keys: [ ["X"], ["less water left", "32", "18"] ],
      explain: "Water absorbed = water at the start - water left. X: 50 - 32 = 18 ml. Y: 50 - 45 = 5 ml. Less water left in the beaker means the material absorbed more, so X absorbed more. Next time, try Start minus left: take away for every one before you choose.",
      technique: "Start minus left",
      steps: ['Find the water at the start and the water left for each material.', 'Take away: water at the start minus water left = water absorbed.', 'Work out the answer for EVERY material before you choose.', 'Compare: the biggest number absorbed the most. 0 ml absorbed means waterproof.'] },
    { id: "mat-048", type: "oeq", level: 2, marks: 2,
      stem: "In Kim's experiment, why did she put the same amount of water (50 ml) into every beaker?",
      figure: MAT_TBL_WATER,
      model: "To make it a fair test, so that only the type of material was changed.",
      keys: [ ["fair test", "fair"], ["only the type of material", "only one", "type of material"] ],
      explain: "Keeping the amount of water the same means any difference is caused only by the material. Next time, try Change one thing: find what changes, find what is measured, and check everything else stays the same.",
      technique: "Change one thing",
      steps: ['Find the ONE thing that is changed on purpose (usually the type of material).', 'Find what is measured: the result, such as weights held, how far it bent or water left.', 'Everything else must be kept the same: size, length, thickness, the mass hung, the amount of water, the time.', 'Check your answer: say which thing is changed, which is measured, and which are kept the same.'] },
    { id: "mat-049", type: "oeq", level: 3, marks: 2,
      stem: "Ken's experiment was not a fair test. Suggest how he should change it, and explain why.",
      figure: MAT_TBL_KEN,
      model: "He should use strips of the same length (and size) for all three materials, so that only the type of material is changed.",
      keys: [ ["same length", "same size"], ["only the type of material", "only one", "fair"] ],
      explain: "Ken changed two things: the material AND the length (the plastic strip was 30 cm). The fix is to use strips of the same length and size, so the type of material is the only thing that changes. Next time, try Change one thing: find what changes, find what is measured, and check everything else stays the same.",
      technique: "Change one thing",
      steps: [
        "Find the ONE thing that should change (usually the type of material).",
        "Look across every row or set-up for anything ELSE that is different, such as length or thickness.",
        "If two things changed, we cannot tell which one caused the result, so the test is not fair.",
        "The fix is to keep that other thing the same for every material."] },
    { id: "mat-050", type: "oeq", level: 3, marks: 3,
      stem: "Mei thinks a plastic ruler is more flexible than a wooden ruler. Describe how she can carry out a fair test to check this.",
      figure: null,
      model: "Use a plastic ruler and a wooden ruler of the same length and thickness. Clamp each one to the edge of a table in the same way and hang the same mass at the end. Measure how far each ruler bends. The ruler that bends more is more flexible.",
      keys: [ ["same length", "same size", "same thickness"], ["same mass", "same weight", "same load"], ["measure how far", "how much it bends", "bends more", "distance"] ],
      explain: "Three marks: keep the rulers the same size; hang the same mass; measure how much each bends. Next time, try Change one thing: find what changes, find what is measured, and check everything else stays the same.",
      technique: "Change one thing",
      steps: [
        "Say the ONE thing she changes: the type of ruler (plastic or wood).",
        "Say what she keeps the same: the length and thickness, how each ruler is clamped, and the mass hung on the end.",
        "Say what she measures: how far the end of each ruler bends down.",
        "Say how she decides: the one that bends more is more flexible."] },

    // ---------------- 2026-10 hardness pass: object parts, experiments, combinations ----------------
    { id: "mat-056", type: "mcq", level: 2,
      stem: "The picture shows a tent. Part X is the door flap. It is rolled up on sunny days, and it must keep the rain out on rainy days. The table shows the properties of four materials. Which material is the most suitable for part X?",
      figure: `<div>${MAT_FIG_TENT}<table><tr><th>Material</th><th>Waterproof?</th><th>Flexible?</th><th>Floats?</th></tr>
<tr><td>A</td><td>Yes</td><td>No</td><td>Yes</td></tr><tr><td>B</td><td>No</td><td>Yes</td><td>Yes</td></tr>
<tr><td>C</td><td>Yes</td><td>Yes</td><td>No</td></tr><tr><td>D</td><td>No</td><td>No</td><td>No</td></tr></table></div>`,
      options: ["A", "B", "C", "D"],
      answer: 2,
      explain: "The flap must be flexible (to be rolled up) AND waterproof (to keep the rain out). Only C has both. A is waterproof but cannot be rolled up; B can be rolled up but lets the rain through. Whether the material floats does not matter for this part. Next time, try Read, compare, conclude: read every row, compare them, then say your answer.",
      technique: "Read, compare, conclude",
      steps: [
        "List what the job needs: one property for each job in the question.",
        "Go down the table one row at a time.",
        "Tick only a row that has EVERY property the job needs. Ignore columns the job does not need.",
        "Conclude: say the letter and the properties that decided it."],
      optionFeedback: {
        0: "A is waterproof, so it keeps the rain out: half the job! But A is not flexible, so the flap cannot be rolled up.",
        1: "B can be rolled up, but it is not waterproof, so the rain would get in.",
        3: "D is not waterproof and not flexible, so it cannot do either job." } },
    { id: "mat-057", type: "mcq", level: 3,
      stem: "The picture shows a toy sailboat. Part X, the sail, is rolled up after use and gets splashed with water. Part Y, the body of the boat, must float and must not soak up water. The table shows the properties of four materials. Which materials are the most suitable for parts X and Y?",
      figure: `<div>${MAT_FIG_BOAT}${MAT_TBL_BOAT}</div>`,
      options: ["X: P, Y: Q", "X: R, Y: Q", "X: P, Y: S", "X: S, Y: R"],
      answer: 0,
      explain: "Sail X must be flexible and waterproof: only P. Body Y must float and be waterproof: only Q. R floats but absorbs water, so it does not suit either part. S is waterproof but sinks and is not flexible. Next time, try Read, compare, conclude: read every row, compare them, then say your answer.",
      technique: "Read, compare, conclude",
      steps: [
        "List what the job needs: one property for each job in the question.",
        "Go down the table one row at a time.",
        "Tick only a row that has EVERY property the job needs. Ignore columns the job does not need.",
        "Conclude: say the letter and the properties that decided it."],
      optionFeedback: {
        1: "Q for the body is right! But R absorbs water, so a sail made of R would get soaked.",
        2: "P for the sail is right! But S sinks, so the body of the boat cannot be made of S.",
        3: "S is not flexible, so it cannot be rolled up, and R absorbs water. Both parts need a different material." } },
    { id: "mat-058", type: "oeq", level: 3, marks: 4,
      stem: "The picture shows a swing in an outdoor playground. Part X holds up the seat and must bend as the swing moves. Part Y is the seat. The table shows the properties of four materials.\n(a) Which material is the most suitable for part X? (1 mark)\n(b) Explain your answer to (a). (2 marks)\n(c) The seat, part Y, must hold the child's weight, and the swing is often left out in the rain. Which material is the most suitable for part Y? (1 mark)",
      figure: `<div>${MAT_FIG_SWING}${MAT_TBL_SWING}</div>`,
      model: "(a) Material E. (b) Material E is strong, so part X can hold up the child's weight without breaking. It is also flexible, so it can bend as the swing moves without breaking. (c) Material F.",
      keys: [ ["Material E"], ["strong", "hold up the child", "without breaking"], ["flexible", "bend"], ["Material F"] ],
      explain: "Part X needs TWO properties: strong (holds the child) and flexible (bends as the swing moves). Only E has both. The seat must hold the child and stay dry in the rain, so it must be strong and waterproof: only F. G and H are waterproof but not strong. Next time, try Claim, evidence, reason, and give every property its own 'so'.",
      technique: "Claim, evidence, reason",
      steps: [
        "Claim: say the answer first (the material, or agree / do not agree).",
        "Evidence: point to the table, the picture or the numbers.",
        "Reason: name the property, then add 'so' and say what it does for the user, like 'waterproof, so the rain cannot soak through and she stays dry'.",
        "One property, one 'so' sentence. If a part needs two properties, write two sentences."] },
    { id: "mat-059", type: "oeq", level: 3, marks: 3,
      stem: "The picture shows a mop. Part X is the mop head, which must soak up spilt water. Part Y is the handle, which is pushed hard while mopping. The table shows the properties of three materials.\n(a) Which material is the most suitable for part X? (1 mark)\n(b) Which material is the most suitable for part Y? Explain your answer. (2 marks)",
      figure: `<div>${MAT_FIG_MOP}${MAT_TBL_MOP}</div>`,
      model: "(a) Material P. (b) Material Q. It is strong, so the handle will not break when it is pushed hard.",
      keys: [ ["Material P"], ["Material Q"], ["strong", "not break"] ],
      explain: "The mop head must absorb water: only P does. The handle must be strong: only Q is. Different parts of one object can need different materials. Next time, try Claim, evidence, reason, and give every property its own 'so'.",
      technique: "Claim, evidence, reason",
      steps: ['Claim: say the answer first (the material, or agree / do not agree).', 'Evidence: point to the table, the picture or the numbers.', 'Reason: name the property, then add \'so\' and say what it does for the user, like \'Q is strong, so the handle will not break when it is pushed hard\'.', 'One property, one \'so\' sentence. If a part needs two properties, write two sentences.'] },
    { id: "mat-060", type: "oeq", level: 3, marks: 4,
      stem: "Ms Lim tested four materials. She shone a torch at a sheet of each material. Then she hung weights on a same-sized strip of each material until it broke. Her results are shown.\nA viewing deck has a floor that visitors stand on and look down through to see the river below. Wei Ming says, 'Material K should be used for the floor because it allows most light to pass through.'\n(a) Do you agree with Wei Ming? (1 mark)\n(b) Explain your answer using the results. (2 marks)\n(c) Which material is the most suitable for the floor? (1 mark)",
      figure: `<table><tr><th>Material</th><th>How much light passes through</th><th>Number of weights held before it broke</th></tr>
<tr><td>K</td><td>Most</td><td>3</td></tr><tr><td>L</td><td>Most</td><td>18</td></tr><tr><td>M</td><td>Some</td><td>20</td></tr><tr><td>N</td><td>None</td><td>25</td></tr></table>`,
      model: "(a) No, I do not agree. (b) Material K held only 3 weights before it broke, the fewest of all, so it is not strong. The floor may break when visitors stand on it. (c) Material L.",
      keys: [ ["do not agree", "disagree"], ["only 3 weights", "3 weights", "fewest", "not strong"], ["may break", "break when visitors stand", "cannot hold the weight"], ["Material L"] ],
      explain: "The floor needs TWO properties: it must allow most light to pass through (transparent, to see the river clearly) AND be strong (to hold the visitors). K is transparent but weak. L is transparent and strong. M is stronger but only translucent, so the river would look blurry; N is opaque. Next time, try Claim, evidence, reason, and give every property its own 'so'.",
      technique: "Claim, evidence, reason",
      steps: ['Claim: say the answer first (the material, or agree / do not agree).', 'Evidence: point to the table, the picture or the numbers.', 'Reason: name the property, then add \'so\' and say what it does for the user, like \'K is not strong, so the floor may break when visitors stand on it\'.', 'One property, one \'so\' sentence. If a part needs two properties, write two sentences.'] },
    { id: "mat-061", type: "oeq", level: 3, marks: 3,
      stem: "Sam put same-sized pieces of materials P, Q and R into water. His results are shown. Sam says, 'All materials that float are waterproof.'\n(a) Do you agree with Sam? (1 mark)\n(b) Explain your answer using the results. (1 mark)\n(c) Sam wants to make a bath toy that floats and does not soak up the bath water. Which material should he use? (1 mark)",
      figure: `<table><tr><th>Material</th><th>Floats?</th><th>Absorbs water?</th></tr>
<tr><td>P</td><td>Yes</td><td>Yes</td></tr><tr><td>Q</td><td>Yes</td><td>No</td></tr><tr><td>R</td><td>No</td><td>No</td></tr></table>`,
      model: "(a) No, I do not agree. (b) Material P floats but it absorbs water, so it is not waterproof. (c) Material Q.",
      keys: [ ["do not agree", "disagree"], ["P floats but", "floats but it absorbs", "absorbs water"], ["Material Q"] ],
      explain: "Floating and being waterproof are two different properties. P shows that a material can float and still absorb water. Q is the only one that floats AND is waterproof. Next time, try Claim, evidence, reason, and give every property its own 'so'.",
      technique: "Claim, evidence, reason",
      steps: [
        "Claim: agree or do not agree.",
        "Evidence: find one row in the table that breaks Sam's rule (it floats, but it is not waterproof).",
        "Reason: say what that row shows, like 'P floats but it absorbs water, so not all floating materials are waterproof'.",
        "Check: floating and waterproof are two different properties, so check each column on its own."] },
    { id: "mat-062", type: "mcq", level: 3,
      stem: "Ravi clamped same-sized strips of materials E, F, G and H to a table, one at a time, and hung the same mass at the end of each strip. He measured how far the end of each strip bent down. Which material is the most suitable for a serving tray that must stay flat when it carries cups of drinks?",
      figure: `<table><tr><th>Material</th><th>How far the end of the strip bent down (cm)</th></tr>
<tr><td>E</td><td>1</td></tr><tr><td>F</td><td>6</td></tr><tr><td>G</td><td>4</td></tr><tr><td>H</td><td>9</td></tr></table>`,
      options: ["E", "F", "G", "H"],
      answer: 0,
      explain: "E bent the least (1 cm), so it is the least flexible. A tray made of E will stay flat and not spill the drinks. H bent the most: it is the most flexible, which is what the tray must NOT be. Next time, try Read, compare, conclude: read every row, compare them, then say your answer.",
      technique: "Read, compare, conclude",
      steps: [
        "Read what the numbers measure (weights held, how far it bent, water or light that got through).",
        "Decide what the question wants: the most, the least, or a middle amount?",
        "Compare EVERY value, not just the first few.",
        "Conclude: say the letter and the number that proves it."],
      optionFeedback: {
        1: "F bent 6 cm. A tray that bends like that would spill the drinks.",
        2: "G bent 4 cm: less than F and H, but E bent even less (1 cm).",
        3: "H bent the most, so it is the MOST flexible. Lots of children pick the biggest number, but here the tray must bend the LEAST." } },
    { id: "mat-063", type: "oeq", level: 3, marks: 3,
      stem: "Hui Min hung same-sized strips of materials J, K, L and M so that the bottom of each strip touched coloured water. After 10 minutes she measured how high the coloured water had risen up each strip.\n(a) Arrange the materials in order, from non-absorbent to most absorbent. (1 mark)\n(b) Which material is the most suitable for a kitchen cloth to wipe up spilt drinks? Explain your answer using the results. (2 marks)",
      figure: `<table><tr><th>Material</th><th>Height the coloured water rose up the strip (cm)</th></tr>
<tr><td>J</td><td>8</td></tr><tr><td>K</td><td>0</td></tr><tr><td>L</td><td>3</td></tr><tr><td>M</td><td>12</td></tr></table>`,
      model: "(a) K, L, J, M. (b) Material M. The coloured water rose the highest up strip M (12 cm), so M absorbs the most water and can soak up the spilt drinks.",
      keys: [ ["K, L, J, M"], ["Material M", "rose the highest", "12 cm"], ["absorbs the most water", "soak up"] ],
      explain: "The higher the water rises, the more absorbent the material. K did not absorb any water: it is non-absorbent (waterproof). Claim (M) + evidence (rose highest, 12 cm) + reason (absorbs the most water, so it soaks up spills). Next time, try Claim, evidence, reason, and give every property its own 'so'.",
      technique: "Claim, evidence, reason",
      steps: ['For (a), sort the heights from smallest to biggest.', 'Claim: say the answer first (the material, or agree / do not agree).', 'Evidence: point to the table, the picture or the numbers.', 'Reason: name the property, then add \'so\' and say what it does for the user, like \'M absorbs the most water, so it soaks up the spilt drinks\'.', 'One property, one \'so\' sentence. If a part needs two properties, write two sentences.'] },
    { id: "mat-064", type: "mcq", level: 3,
      stem: "Farah poured 100 ml of water into each of four beakers. She dipped a same-sized piece of material A, B, C or D into each beaker for 1 minute. Then she took it out and measured the volume of water left in the beaker. Which material is the most suitable for a bath towel?",
      figure: `<table><tr><th>Material</th><th>Volume of water left in the beaker (ml)</th></tr>
<tr><td>A</td><td>70</td></tr><tr><td>B</td><td>95</td></tr><tr><td>C</td><td>100</td></tr><tr><td>D</td><td>40</td></tr></table>`,
      options: ["A", "B", "C", "D"],
      answer: 3,
      explain: "Careful: LEAST water left means the material absorbed the MOST. Water absorbed = 100 ml - water left: A 30 ml, B 5 ml, C 0 ml, D 60 ml. D absorbed the most, so it will dry the body best. C had 100 ml left, so it absorbed no water: it is waterproof and would not dry the body. Next time, try Start minus left: take away for every one before you choose.",
      technique: "Start minus left",
      steps: [
        "Find the water at the start and the water left for each material.",
        "Take away: water at the start minus water left = water absorbed.",
        "Work out the answer for EVERY material before you choose.",
        "Compare: the biggest number absorbed the most. 0 ml absorbed means waterproof.",
        "Match it to the job: a towel or mop needs the most; a raincoat or umbrella needs none."],
      optionFeedback: {
        0: "A absorbed 30 ml (100 - 70). Good working! D absorbed even more: 60 ml.",
        1: "B has a lot of water left, so it absorbed only 5 ml (100 - 95).",
        2: "C's beaker is the fullest, so it can look like the 'most water' answer. But full means C absorbed none: 100 - 100 = 0 ml." } },
    { id: "mat-065", type: "mcq", level: 3,
      stem: "Daniel shone a torch at a sheet of each material, one at a time. A light sensor on the other side measured the amount of light that passed through. The lenses of a pair of sunglasses must let the wearer see where he is going, but must stop some of the bright sunlight from reaching his eyes. Which material is the most suitable for the lenses?",
      figure: `<div>${MAT_FIG_LIGHT_SETUP}<table><tr><th>Material</th><th>Amount of light that passed through (units)</th></tr>
<tr><td>P</td><td>95</td></tr><tr><td>Q</td><td>0</td></tr><tr><td>R</td><td>45</td></tr><tr><td>S</td><td>98</td></tr></table></div>`,
      options: ["P", "Q", "R", "S"],
      answer: 2,
      explain: "The lenses need SOME light, not the most and not none. R lets some light through, so the wearer can still see but less sunlight reaches the eyes. Q lets no light through, so he could not see at all. P and S let almost all the light through, so they would not protect his eyes. Sunglasses still let him see clearly. They just let less light through than clear glass. Next time, try Read, compare, conclude: read every row, compare them, then say your answer.",
      technique: "Read, compare, conclude",
      steps: [
        "Read how much light passed through each material.",
        "Sort them: most light, some light, or no light.",
        "Decide what the job or question needs: most, some or none.",
        "Conclude with the letter and the number that proves it."],
      optionFeedback: {
        0: "P lets almost all the light through (95), so it would not cut down the bright sunlight.",
        1: "Q blocks all the light, so it does stop the sunlight! But then he could not see where he is going.",
        3: "S lets the most light through (98), like clear glass, so it gives no protection from the sun." } },
    { id: "mat-066", type: "oeq", level: 3, marks: 4,
      stem: "Aisha put same-sized blocks of materials W, X, Y and Z into a tank of water. Then she added 10 g weights, one at a time, on top of each block that floated, until the block sank. Her results are shown.\n(a) Which material sank on its own? (1 mark)\n(b) Which material is the most suitable for making a raft to carry heavy loads? (1 mark)\n(c) Explain your answer to (b) using the results. (2 marks)",
      figure: `<table><tr><th>Material</th><th>Floats or sinks?</th><th>Number of weights added before it sank</th></tr>
<tr><td>W</td><td>Floats</td><td>6</td></tr><tr><td>X</td><td>Sinks</td><td>(no weights added)</td></tr><tr><td>Y</td><td>Floats</td><td>2</td></tr><tr><td>Z</td><td>Floats</td><td>9</td></tr></table>`,
      model: "(a) Material X. (b) Material Z. (c) Block Z floated and held the most weights (9 weights) before it sank, so a raft made of Z can carry heavy loads without sinking.",
      keys: [ ["Material X"], ["Material Z"], ["held the most weights", "9 weights", "most weights"], ["without sinking", "carry heavy loads"] ],
      explain: "A raft must float AND carry a load. X sinks, so it cannot be used. Of the floating blocks, Z carried the most weights (9) before sinking. Claim (Z) + evidence (9 weights, the most) + reason (carries heavy loads without sinking). Next time, try Claim, evidence, reason, and give every property its own 'so'.",
      technique: "Claim, evidence, reason",
      steps: ['Claim: say the answer first (the material, or agree / do not agree).', 'Evidence: point to the table, the picture or the numbers.', 'Reason: name the property, then add \'so\' and say what it does for the user, like \'Z held the most weights, so the raft carries heavy loads without sinking\'.', 'One property, one \'so\' sentence. If a part needs two properties, write two sentences.'] },
    { id: "mat-067", type: "oeq", level: 2, marks: 3,
      stem: "Lina wants to find out which fabric absorbs the most water. She dips a same-sized piece of each of four fabrics into a beaker with 100 ml of water for 1 minute. Then she takes out the fabric and measures the volume of water left in the beaker.\nUse the table to help you. Write your answers below.\n(a) Which variable did she change? (1 mark)\n(b) Which variable did she measure? (1 mark)\n(c) Which TWO variables did she keep the same? (1 mark)",
      figure: `<table><tr><th>Variable</th><th>Changed</th><th>Measured</th><th>Kept the same</th></tr>
<tr><td>Type of fabric</td><td></td><td></td><td></td></tr><tr><td>Size of each piece</td><td></td><td></td><td></td></tr>
<tr><td>Volume of water at the start</td><td></td><td></td><td></td></tr><tr><td>Volume of water left after 1 minute</td><td></td><td></td><td></td></tr></table>`,
      model: "(a) Changed: the type of fabric. (b) Measured: the volume of water left after 1 minute. (c) Kept the same: the size of each piece and the volume of water at the start (100 ml).",
      keys: [ ["type of fabric"], ["volume of water left", "water left"], ["size of each piece and the volume of water at the start", "size and the amount of water at the start"] ],
      explain: "In a fair test, change only ONE variable (the type of fabric), measure the result (water left), and keep everything else the same (size of the pieces, amount of water, time). Both kept-the-same variables are needed for the mark in (c). Next time, try Change one thing: find what changes, find what is measured, and check everything else stays the same.",
      technique: "Change one thing",
      steps: ['Find the ONE thing that is changed on purpose (usually the type of material).', 'Find what is measured: the result, such as weights held, how far it bent or water left.', 'Everything else must be kept the same: size, length, thickness, the mass hung, the amount of water, the time.', 'Check your answer: say which thing is changed, which is measured, and which are kept the same.'] },
    { id: "mat-068", type: "mcq", level: 3,
      stem: "Bala wants to find out whether plastic is more flexible than wood. He will hang the same mass at the end of each strip and measure how far it bends. Which two set-ups should he compare to make it a fair test?",
      figure: `<table><tr><th>Set-up</th><th>Material</th><th>Length (cm)</th><th>Thickness (mm)</th></tr>
<tr><td>1</td><td>Plastic</td><td>30</td><td>2</td></tr><tr><td>2</td><td>Wood</td><td>30</td><td>5</td></tr>
<tr><td>3</td><td>Wood</td><td>30</td><td>2</td></tr><tr><td>4</td><td>Plastic</td><td>20</td><td>2</td></tr></table>`,
      options: ["1 and 2", "2 and 4", "1 and 3", "3 and 4"],
      answer: 2,
      explain: "Set-ups 1 and 3 differ ONLY in the material: same length (30 cm) and same thickness (2 mm). 1 and 2 also differ in thickness; 3 and 4 also differ in length; 2 and 4 differ in material, length and thickness. A fair test changes only one thing. Next time, try Change one thing: find what changes, find what is measured, and check everything else stays the same.",
      technique: "Change one thing",
      steps: [
        "Find the thing you want to test (here, the material).",
        "Pick two set-ups with DIFFERENT materials.",
        "Check every other column, such as length and thickness: they must match.",
        "If any other column is different, try another pair, until only ONE thing differs."],
      optionFeedback: {
        0: "1 and 2 have different materials: good start! But the thickness is different too (2 mm and 5 mm), so two things changed.",
        1: "2 and 4 differ in material, length AND thickness, so three things changed.",
        3: "3 and 4 have different materials: good start! But the length is different too (30 cm and 20 cm), so two things changed." } },
    { id: "mat-069", type: "mcq", level: 3,
      stem: "The table shows the properties of materials K, L and M. Which of these statements are correct?\nA: Material K is suitable for making a raincoat.\nB: Material L is suitable for making a float for a fishing line.\nC: Material M is suitable for making a shower curtain.",
      figure: `<table><tr><th>Material</th><th>Floats?</th><th>Waterproof?</th><th>Flexible?</th></tr>
<tr><td>K</td><td>No</td><td>Yes</td><td>Yes</td></tr><tr><td>L</td><td>Yes</td><td>Yes</td><td>No</td></tr><tr><td>M</td><td>Yes</td><td>No</td><td>Yes</td></tr></table>`,
      options: ["A and B only", "A and C only", "B and C only", "A, B and C"],
      answer: 0,
      explain: "A: a raincoat must be waterproof and flexible, and K is both (it does not need to float). B: a fishing float must float and be waterproof, and L is both. C: a shower curtain must be waterproof, but M is not, so statement C is not correct. Next time, try Read, compare, conclude: read every row, compare them, then say your answer.",
      technique: 'Tick or cross',
      steps: [
        "Take one statement at a time.",
        "Ask what that statement needs, and find the right row or column for it.",
        "Check the numbers or the Yes/No: mark each statement correct or not correct.",
        "Choose the option that has every correct statement and no others."],
      optionFeedback: {
        1: "A is right! Now check C again: a shower curtain must be waterproof, and M is not.",
        2: "B is right! But M is not waterproof, so C is not correct. Check A again: K is waterproof and flexible.",
        3: "A and B are right! But M is not waterproof, so C is not correct." } },
    { id: "mat-070", type: "mcq", level: 2,
      stem: "Read the statements below. Which of them are correct?\nA: Clear glass and clear plastic both allow most light to pass through.\nB: Aluminium foil is made of metal, but it is flexible.\nC: A cotton towel is waterproof because it can hold a lot of water.",
      figure: null,
      options: ["A and B only", "A and C only", "B and C only", "A, B and C"],
      answer: 0,
      technique: 'Tick or cross',
        steps: ['Take one statement at a time.', 'Check each part of the statement on its own: is ALL of it true?', 'Put a tick or a cross next to it.', 'Choose the option with every tick and no crosses.'],
        explain: "A is correct: clear glass and clear plastic are both transparent. B is correct: thin aluminium foil bends without breaking, so not all metals are stiff. C is not correct: the towel holds water because it ABSORBS it, so it is not waterproof.",
      optionFeedback: {
        1: "A is right! C sounds sensible because the towel holds lots of water. But holding water by soaking it up is ABSORBING, so the towel is not waterproof.",
        2: "B is right! C mixes up the words: the towel absorbs water, so it is not waterproof. Check A again: both are transparent.",
        3: "A and B are right! But the towel absorbs water, so it is not waterproof, and C is not correct." } },
    { id: "mat-071", type: "mcq", level: 3,
      stem: "Joel put 50 ml of water into each of three beakers. He soaked a same-sized piece of material P, Q or R in each beaker for 5 minutes, took it out, and measured the volume of water left. Which of these statements are correct?\nA: Material P absorbed the most water.\nB: Material Q is waterproof.\nC: Material R is more suitable than material P for a mop head.",
      figure: `<table><tr><th>Material</th><th>Volume of water at the start (ml)</th><th>Volume of water left (ml)</th></tr>
<tr><td>P</td><td>50</td><td>20</td></tr><tr><td>Q</td><td>50</td><td>50</td></tr><tr><td>R</td><td>50</td><td>35</td></tr></table>`,
      options: ["A only", "A and B only", "B and C only", "A, B and C"],
      answer: 1,
      explain: "Water absorbed = water at the start - water left. A: P absorbed 50 - 20 = 30 ml, the most. Correct. B: Q absorbed 50 - 50 = 0 ml, so it is waterproof. Correct. C: R absorbed 50 - 35 = 15 ml, less than P, so P is better for a mop head. Not correct. Next time, try Start minus left: take away for every one before you choose.",
      technique: "Start minus left",
      steps: [
        "Find the water at the start and the water left for each material.",
        "Take away: water at the start minus water left = water absorbed.",
        "Work out the answer for EVERY material before you choose.",
        "Compare: the biggest number absorbed the most. 0 ml absorbed means waterproof.",
        "Match it to the job: a towel or mop needs the most; a raincoat or umbrella needs none."],
      optionFeedback: {
        0: "A is right! Check B too: Q still had all 50 ml, so it absorbed none. That makes Q waterproof.",
        2: "B is right! Check C: R absorbed 15 ml and P absorbed 30 ml, so P is better for a mop head.",
        3: "A and B are right! For C, P absorbed more (30 ml) than R (15 ml), so P is the better mop head." } },
    { id: "mat-072", type: "mcq", level: 3,
      stem: "Tina tested same-sized strips of materials S, T and U. First she hung the same mass on each strip and measured how far it bent. Then she used new strips and added weights until each strip broke. Which of these statements are correct?\nA: Material T is the most flexible.\nB: Material S is the strongest.\nC: Material U is the most suitable for a bookshelf.\nD: Of the three materials, S is the most suitable for a tray that must stay flat.",
      figure: `<table><tr><th>Material</th><th>How far it bent (cm)</th><th>Number of weights held before it broke</th></tr>
<tr><td>S</td><td>1</td><td>15</td></tr><tr><td>T</td><td>8</td><td>12</td></tr><tr><td>U</td><td>3</td><td>2</td></tr></table>`,
      options: ["A and B only", "A, B and D only", "B, C and D only", "A, C and D only"],
      answer: 1,
      explain: "A: T bent the most, so it is the most flexible. Correct. B: S held the most weights, so it is the strongest. Correct. C: U held only 2 weights, so a shelf made of U would break. Not correct. D: S bent the least of the three (1 cm), so it is the most suitable for a tray that must stay flat. Correct. Next time, try Read, compare, conclude: read every row, compare them, then say your answer.",
      technique: 'Tick or cross',
      steps: [
        "Read the two columns: how far it bent shows flexibility; the weights held shows strength.",
        "Take one statement at a time, and find the right column for it.",
        "Compare the numbers: most bent is the most flexible; least bent stays flat; most weights is the strongest.",
        "Choose the option that has every correct statement and no others."],
      optionFeedback: {
        0: "A and B are right! Check D too: S bent the least (1 cm), so a tray of S stays flat.",
        2: "B and D are right! Check C: U held only 2 weights, so a bookshelf of U would break. Check A again: T bent the most.",
        3: "A and D are right! But U held only 2 weights, so C is not correct. Check B again: S held the most weights." } },
    { id: "mat-073", type: "mcq", level: 2,
      stem: "The flowchart shows how four objects, A, B, C and D, were sorted. Which letter could be a steel spoon?",
      figure: MAT_FIG_FLOW,
      options: ["A", "B", "C", "D"],
      answer: 3,
      explain: "A steel spoon does not allow light to pass through (it is opaque), so it goes to the right. It sinks in water, so it is D. Next time, try Follow the arrows: one question at a time.",
      technique: "Follow the arrows",
      steps: [
        "Start at the top box. Answer its question for the object: Yes or No.",
        "Follow that line down to the next box.",
        "Answer the next question for the same object.",
        "Keep going until you reach a letter. That is the answer."],
      optionFeedback: {
        0: "A is for things that let light through. A steel spoon is opaque, so go No at the top box.",
        1: "B is for things that let light through. A steel spoon is opaque, so go No at the top box.",
        2: "You went No at the top: good start! Next, does a steel spoon float? It sinks, so go No to D." } },
    { id: "mat-074", type: "mcq", level: 2,
      stem: "The flowchart shows how four objects, A, B, C and D, were sorted. Which object could be C?",
      figure: MAT_FIG_FLOW,
      options: ["A clear plastic file", "A clear glass marble", "A wooden chopstick", "A metal door key"],
      answer: 2,
      explain: "C does not allow light to pass through and floats. A wooden chopstick is opaque and floats. The plastic file allows light through and is flexible (A); the glass marble allows light through but is not flexible (B); the metal key is opaque and sinks (D). Next time, try Follow the arrows: one question at a time.",
      technique: "Follow the arrows",
      steps: [
        "Find the letter in the flowchart and trace its path back up to the top.",
        "Write down each answer on the path, for example: light through? No. Floats? Yes.",
        "Test each object against the path, one question at a time.",
        "The object that matches every answer on the path is the one."],
      optionFeedback: {
        0: "A clear plastic file lets light through, so it goes Yes at the top. It is flexible, so it ends at A.",
        1: "A glass marble lets light through, so it goes Yes at the top. It is not flexible, so it ends at B.",
        3: "A metal key is opaque, which matches C so far! But it sinks, so it ends at D." } },

    /* x17 science expansion — lane sci-x-materials */
    // hints: [first-miss nudge, second-miss reveal] (conn convention; the integrator adds shell support). explain stays complete.
    // ---- Archetype 2: property test set-up + results -> which property, which material ----
    { id: "x17-mat-01", type: "mcq", level: 1,
      // distractors: bending seen = flexibility test; water/float words with no water in the test
      stem: "Kumar rested a board across two bricks. He put books on the board one at a time until the board broke. Which property of the board was he testing?",
      figure: MATX.booksBoard(),
      options: ["Its flexibility", "Its strength", "Whether it is waterproof", "Whether it floats"],
      answer: 1,
      hints: ["Look at what Kumar did: he added books until the board BROKE. Which property is about holding a heavy load without breaking?",
        "He counted the books the board held until it BROKE. Holding a load without breaking is strength, so the answer is strength."],
      explain: "Strength is the ability to hold a heavy load without breaking. Adding books until the board breaks tests its strength. The board may bend a little, but Kumar did not measure the bending, so he was not testing flexibility. No water was used, so it is not a waterproof or floating test. Next time, find what was measured: it tells you the property.",
      technique: "Change one thing",
      steps: ['Find what is done to the material in the test: books or weights added, a mass hung, water dripped, or light shone.', 'Find what is measured or watched in the test.', 'Match the measurement to the property: weights until it breaks is strength; how far it bends is flexibility; water getting through is waterproof; light getting through is transparency.', 'Check the other options: was water or light even used in this test?'],
      optionFeedback: {
        0: "The board may bend before it breaks, so flexibility is a fair guess. But Kumar counted books until it BROKE. That tests strength.",
        2: "No water was used in this test, so it is not testing waterproof.",
        3: "The board was never put in water, so it is not testing floating." } },
    { id: "x17-mat-02", type: "mcq", level: 2,
      // distractors: pick the two tallest bars without checking the load; 26 read as "about 27"; any long bar
      stem: "Kumar tested four same-sized boards, P, Q, R and S, in this way. The graph shows the largest number of books each board held without breaking. Mr Lim needs a bookshelf board that can hold 27 books. Which board(s) can he use?",
      figure: MATX.bars(MATX.BOOKS),
      options: ["Q only", "P, Q and S only", "S only", "Q and S only"],
      answer: 2,
      hints: ["Check each board against the load in the question: can it hold 27 books? Holding 26 books is not enough.",
        "Only S held more than 27 books (31). Q held 26, one short, so a shelf of Q would break. The answer is S only."],
      explain: "Only S held more than 27 books (31), so only S can be used. Q held 26 books, one fewer than 27, so a shelf made of Q would break. P (14) and R (9) are far too weak. Always check the number in the question against the results; do not just pick the tallest bars. Next time, try Read, compare, conclude: read every row, compare them, then say your answer.",
      technique: "Read, compare, conclude",
      steps: [
        "Read the number in the question first: here, 27 books.",
        "Read the value on top of each bar.",
        "Compare each value with the number in the question: keep only the boards that held 27 books or more.",
        "Conclude: list every board that passes, not just the tallest bars."],
      optionFeedback: {
        0: "Q is a tall bar, but it held 26 books: one short of 27, so a shelf of Q would break.",
        1: "P held only 14 books, far fewer than 27, and Q held 26, one short.",
        3: "S is right! But Q held 26 books, one fewer than 27, so a shelf of Q would break." } },
    { id: "x17-mat-03", type: "mcq", level: 1,
      // distractors: water words confused (floats); drops = weight (strength); seeing into the beaker (transparency)
      stem: "Aishah stretched a piece of material over the mouth of a beaker and held it in place with a rubber band. She let 20 drops of water fall onto the material. Then she checked whether any water had got into the beaker. Which property was she testing?",
      figure: MATX.dripSetup(),
      options: ["Whether the material is strong", "Whether the material is transparent", "Whether the material floats", "Whether the material is waterproof"],
      answer: 3,
      hints: ["She is checking whether water gets THROUGH the material into the beaker. That is about water passing through, not about sitting on top of water.",
        "If water gets through into the beaker, the material is not waterproof. She was testing whether the material is waterproof."],
      explain: "A waterproof material does not let water pass through it. If no water gets into the beaker, the material is waterproof. Floating is tested by putting the material into water, and a few drops are far too light to test strength. Next time, find what was measured: it tells you the property.",
      technique: "Change one thing",
      steps: ['Find what is done to the material in the test: books or weights added, a mass hung, water dripped, or light shone.', 'Find what is measured or watched in the test.', 'Match the measurement to the property: weights until it breaks is strength; how far it bends is flexibility; water getting through is waterproof; light getting through is transparency.', 'Check the other options: was water or light even used in this test?'],
      optionFeedback: {
        0: "Drops of water are very light, so they cannot test strength.",
        1: "We can look into the beaker, but she was checking for WATER getting through, not light.",
        2: "Floating is tested by putting the material INTO water. Here she checks whether water passes through it." } },
    { id: "x17-mat-04", type: "mcq", level: 2,
      // distractors: most water = "best with water"; middle values
      stem: "Aishah tested materials P, Q, R and S in the same way. She dripped the same amount of water onto each material and measured how much water passed through into the beaker. She wants a material for the roof of a tent. Which material is the most suitable?",
      figure: MATX.beakers([{ l: 'P', v: 9 }, { l: 'Q', v: 0 }, { l: 'R', v: 4 }, { l: 'S', v: 15 }], { cap: 20, cover: true, vals: true, title: 'Water that passed through each material', label: 'Four beakers covered with materials P, Q, R and S. Water that passed through: P 9 ml, Q 0 ml, R 4 ml, S 15 ml' }),
      options: ["P", "Q", "R", "S"],
      answer: 1,
      hints: ['The tent roof must keep the rain OUT. The water in each beaker is water that got THROUGH the material. Which beaker has the least?', 'Q let 0 ml through: no rain gets in, so Q is waterproof and best for the roof. S let the most through, so it is the least suitable.'],
      explain: 'No water passed through Q (0 ml), so Q is waterproof and makes the best roof. S let the most water through (15 ml), so it is the least suitable choice: more water in the beaker means more rain would drip into the tent. Next time, try Read, compare, conclude: read every row, compare them, then say your answer.',
      technique: "Read, compare, conclude",
      steps: [
        "Read what the numbers measure (weights held, how far it bent, water or light that got through).",
        "Decide what the question wants: the most, the least, or a middle amount?",
        "Compare EVERY value, not just the first few.",
        "Conclude: say the letter and the number that proves it."],
      optionFeedback: {
        0: "P let 9 ml through, so rain would drip into the tent.",
        2: "R let only 4 ml through: close! But Q let 0 ml through, which keeps all the rain out.",
        3: "S has the most water, which can look like 'best with water'. But this is water that got THROUGH, so S lets the most rain in." } },
    { id: "x17-mat-05", type: "oeq", level: 2, marks: 2,
      stem: "Look at Aishah's results. Explain why material Q is the most suitable for the roof of the tent. Use the results in your answer.",
      figure: MATX.beakers([{ l: 'P', v: 9 }, { l: 'Q', v: 0 }, { l: 'R', v: 4 }, { l: 'S', v: 15 }], { cap: 20, cover: true, vals: true, title: 'Water that passed through each material', label: 'Four beakers covered with materials P, Q, R and S. Water that passed through: P 9 ml, Q 0 ml, R 4 ml, S 15 ml' }),
      model: "No water passed through Q into the beaker (0 ml), so Q is waterproof. The rain cannot pass through a roof made of Q, so the campers and their things inside the tent stay dry.",
      keys: [ ["0 ml", "no water passed through"], ["stay dry", "keeps the campers dry", "rain cannot pass through"] ],
      hints: ["Give a number from the beakers (the evidence). Then say what it means for the people inside the tent.",
        "Evidence: 0 ml passed through Q. Reason: the rain cannot pass through the roof, so the campers stay dry. Write both halves."],
      explain: 'Claim, evidence, reason. Evidence: 0 ml of water passed through Q. Reason tied to the tent: the rain cannot get in, so the campers stay dry. \'Q is waterproof\' on its own is not finished yet: add the number from the beakers (0 ml) and what being waterproof does for the tent. Next time, try Claim, evidence, reason, and give every property its own \'so\'.',
      technique: "Claim, evidence, reason",
      steps: [
        "Claim: say the answer first (the material, or agree / do not agree).",
        "Evidence: point to the table, the picture or the numbers.",
        "Reason: name the property, then add 'so' and say what it does for the user, like 'waterproof, so the rain cannot soak through and she stays dry'.",
        "One property, one 'so' sentence. If a part needs two properties, write two sentences."] },
    { id: "x17-mat-06", type: "mcq", level: 2,
      // distractors: bending read as strength; least bent read as most flexible (reversed)
      stem: "Wen Hui clamped same-sized strips of materials Q, R, S and T to the edge of a table, one at a time, and hung the same mass on the end of each strip. The graph shows how far the end of each strip bent down. What was she testing, and which material has the most of that property?",
      figure: MATX.bars({ labels: ['Q', 'R', 'S', 'T'], values: [3, 6, 1, 9], max: 10, step: 2, yLabel: 'Distance bent (cm)', xLabel: 'Material', label: 'Bar graph: Q bent 3 cm, R 6 cm, S 1 cm, T 9 cm' }),
      options: ["Strength: material S", "Strength: material T", "Flexibility: material S", "Flexibility: material T"],
      answer: 3,
      hints: ["The strips bent but did not break. Bending without breaking is which property? Then remember: the MORE a strip bends, the more of that property it has.",
        "Bending under the same mass tests flexibility. T bent the most (9 cm), so T is the most flexible."],
      explain: "Measuring how far a strip bends under the same mass tests flexibility. T bent the furthest (9 cm), so T is the most flexible. S bent the least (1 cm), so S is the LEAST flexible. Strength would be tested by adding weights until the strip breaks. Next time, try Read, compare, conclude: read every row, compare them, then say your answer.",
      technique: "Read, compare, conclude",
      steps: [
        "Read what the numbers measure (weights held, how far it bent, water or light that got through).",
        "Decide what the question wants: the most, the least, or a middle amount?",
        "Compare EVERY value, not just the first few.",
        "Conclude: say the letter and the number that proves it."],
      optionFeedback: {
        0: "The strips bent but did not break, so this is not a strength test. And S bent the least.",
        1: "T is the right material! But bending under the same mass tests flexibility, not strength.",
        2: "Flexibility is right! But S bent the LEAST (1 cm), so S is the least flexible." } },
    { id: "x17-mat-07", type: "mcq", level: 3,
      // distractors: most-to-least (reversed order); letter order; least found, then the rest unsorted
      stem: "Ben used the set-up shown to test same-sized strips of materials X, Y and Z. He hung the same mass on the end of each strip. Which order arranges the materials from the LEAST flexible to the MOST flexible?",
      figure: MATX.withTbl(MAT_FIG_FLEX_SETUP.replace('<svg ', '<svg data-maxw="400" '), ['Material', 'How far the end of the strip moved down (cm)'], [['X', 7], ['Y', 2], ['Z', 11]]),
      options: ["Z, X, Y", "X, Y, Z", "Y, X, Z", "Y, Z, X"],
      answer: 2,
      hints: ["Least flexible = bent the LEAST. Start with the smallest number, then the next smallest.",
        "Smallest bend first: Y (2 cm), then X (7 cm), then Z (11 cm). Least to most flexible is Y, X, Z."],
      explain: "Y bent 2 cm, X bent 7 cm and Z bent 11 cm. The less a strip bends, the less flexible it is, so the order from least to most flexible is Y, X, Z. Z, X, Y is the same list backwards: most to least. Next time, try Read, compare, conclude: read every row, compare them, then say your answer.",
      technique: "Read, compare, conclude",
      steps: [
        "Read how far each strip moved down.",
        "Check which way the question wants the list: here, from LEAST to MOST.",
        "Start with the smallest number, then the next smallest, then the biggest.",
        "Read your list back against the numbers before you choose."],
      optionFeedback: {
        0: "This is the right list read backwards: it goes from most flexible to least.",
        1: "This is just the letter order. Use the numbers: Y 2 cm, X 7 cm, Z 11 cm.",
        3: "Y first is right: it bent the least! Next comes X (7 cm), then Z (11 cm)." } },
    { id: "x17-mat-08", type: "mcq", level: 2,
      // distractors: tallest bar = best; "some light" = dark enough; second-tallest
      stem: "Devi shone a torch at sheets of materials J, K, L and M, one at a time. A light sensor on the other side measured how much light passed through each sheet. Her baby brother naps in the afternoon. Which material is the most suitable for a curtain that keeps his room dark?",
      figure: MATX.bars({ labels: ['J', 'K', 'L', 'M'], values: [80, 35, 0, 95], max: 100, step: 20, yLabel: 'Light (units)', xLabel: 'Material', label: 'Bar graph of light that passed through: J 80 units, K 35, L 0, M 95' }),
      options: ["J", "K", "L", "M"],
      answer: 2,
      hints: ["A dark room needs a curtain that lets NO light through. Look for the shortest bar, not the tallest.",
        "L let 0 units of light through: it is opaque, so the room stays dark. The answer is L."],
      explain: 'L let no light through (0 units): it is opaque, so the room stays dark and the baby can sleep. K lets some light through (translucent), so the room would still be bright. M let the most light through: it is the least suitable choice for a dark room. Next time, try Read, compare, conclude: read every row, compare them, then say your answer.',
      technique: "Read, compare, conclude",
      steps: [
        "Read how much light passed through each material.",
        "Sort them: most light is transparent; some light is translucent; no light is opaque.",
        "Decide what the job or question needs: most, some or none.",
        "Conclude with the letter and the number that proves it."],
      optionFeedback: {
        0: "J let a lot of light through (80 units), so the room would stay bright.",
        1: "K lets only some light through, which sounds dim. But some light still gets in. A dark room needs none.",
        3: "M is the tallest bar, so it can look like the winner. But it lets the MOST light through." } },
    { id: "x17-mat-09", type: "oeq", level: 3, marks: 2,
      stem: "Look at Kumar's results for boards P, Q, R and S. Jun noticed that board P bent the most before it broke. He says, 'Board P is the strongest.' Is Jun correct? Explain your answer using the results.",
      figure: MATX.bars(MATX.BOOKS),
      model: "No, Jun is not correct. Strength is shown by how many books a board holds before it breaks, not by how much it bends. Board S held the most books (31 books), so S is the strongest. P held only 14 books.",
      keys: [ ["S held the most books", "31 books"], ["not by how much it bends", "bending shows how flexible", "bent shows flexibility"] ],
      hints: ["What did Kumar COUNT in this test? Bending a lot tells you about a different property.",
        "No. Strength is the books held before breaking: S held the most (31). Bending more shows flexibility, not strength."],
      explain: "Claim: Jun is not correct. Evidence: S held the most books (31); P held only 14. Reason: the test measures strength by the books held before breaking; how much a board bends is about flexibility, a different property. Next time, try Claim, evidence, reason, and give every property its own 'so'.",
      technique: "Claim, evidence, reason",
      steps: ['Claim: say the answer first (the material, or agree / do not agree).', 'Evidence: point to the table, the picture or the numbers.', 'Reason: name the property the test really measures, like \'strength is the books held before breaking; bending a lot is flexibility\'.', 'One property, one \'so\' sentence. If a part needs two properties, write two sentences.'] },
    { id: "x17-mat-10", type: "mcq", level: 2,
      // distractors: lowest colour = "soaked least so stays clean" (reversed); middle values
      stem: "Hui Ling hung same-sized strips of materials J, K, L and M from a rod, with the bottom of each strip in coloured water. After 10 minutes she looked at how high the coloured water had risen up each strip. Which material is the most suitable for wiping up spilt milk?",
      figure: MATX.wick([{ l: 'J', cm: 3 }, { l: 'K', cm: 10 }, { l: 'L', cm: 0 }, { l: 'M', cm: 6 }]),
      options: ["J", "K", "L", "M"],
      answer: 1,
      hints: ["The higher the coloured water climbs, the more water the strip soaks up. Which strip is coloured the highest?",
        "The coloured water rose highest up K (10 cm), so K absorbs the most and soaks up the milk best."],
      explain: "The coloured water rose highest up K (10 cm), so K absorbs the most water and will soak up the spilt milk best. The water did not rise up L at all, so L does not absorb water: it would only push the milk around. Next time, try Read, compare, conclude: read every row, compare them, then say your answer.",
      technique: "Read, compare, conclude",
      steps: [
        "Read what the numbers measure (weights held, how far it bent, water or light that got through).",
        "Decide what the question wants: the most, the least, or a middle amount?",
        "Compare EVERY value, not just the first few.",
        "Conclude: say the letter and the number that proves it."],
      optionFeedback: {
        0: "J soaked up only a little: the colour rose 3 cm.",
        2: "L stayed clean, which can look like the best. But that means L does not absorb water, so it would only push the milk around.",
        3: "M rose 6 cm, which is good, but K rose higher (10 cm)." } },

    // ---- Archetype 3: product picture + property table -> choose the material, explain (CER) ----
    { id: "x17-mat-11", type: "mcq", level: 1,
      // distractors: towel property (absorbs) for a rain job; strong + see-through not needed; floats is a water word
      stem: "The picture shows an umbrella. Part X is the cover. It must keep the rain off the person, and it must fold up when the umbrella is closed. Which two properties must the material of part X have?",
      figure: MATX.umbrella(),
      options: ["Waterproof and flexible", "Transparent and strong", "Absorbs water and flexible", "Waterproof and floats on water"],
      answer: 0,
      hints: ["Part X has two jobs: keep the rain off, and fold up. Match one property to each job.",
        "Keep the rain off = waterproof. Fold up without breaking = flexible. The answer is waterproof and flexible."],
      explain: "To keep the rain off, the cover must be waterproof. To fold up without breaking, it must be flexible. A material that absorbs water would let the rain soak through. Floating on water is not a job the umbrella does.",
      optionFeedback: {
        1: "A strong cover is useful, but it does not need to be see-through. Its jobs are to keep the rain off and fold up.",
        2: "Flexible is right! But a material that absorbs water would let the rain soak through.",
        3: "Waterproof is right! But floating is not one of the umbrella's jobs. It must fold up, so it must be flexible." } },
    { id: "x17-mat-12", type: "oeq", level: 2, marks: 3,
      stem: "The picture shows an umbrella. The table shows the properties of four materials, A, B, C and D.\n(a) Which material is the most suitable for the cover, part X? (1 mark)\n(b) Explain your answer to (a). (2 marks)",
      figure: MATX.withTbl(MATX.umbrella(), ['Material', 'Waterproof?', 'Flexible?'], [['A', 'Yes', 'No'], ['B', 'No', 'Yes'], ['C', 'Yes', 'Yes'], ['D', 'No', 'No']]),
      model: "(a) Material C. (b) C is waterproof, so the rain cannot pass through the cover and the person under the umbrella stays dry. C is also flexible, so the cover can fold up when the umbrella is closed.",
      keys: [ ["Material C"], ["stays dry", "keeps the person dry", "rain cannot pass through"], ["fold up", "can fold", "be folded"] ],
      hints: ["Find the material with Yes in BOTH columns. Then finish each sentence: 'It is waterproof, so the person ...' and 'It is flexible, so the umbrella ...'.",
        "Material C (Yes and Yes). C is waterproof, so the person stays dry; C is flexible, so the cover can fold up."],
      explain: 'Each property earns its mark only when it is tied to the umbrella. \'Waterproof\' on its own is not enough yet; \'waterproof, so the person stays dry\' gets the mark. A is waterproof but cannot fold; B folds but lets the rain through; D does neither. Next time, try Claim, evidence, reason, and give every property its own \'so\'.',
      technique: "Claim, evidence, reason",
      steps: [
        "Claim: say the answer first (the material, or agree / do not agree).",
        "Evidence: point to the table, the picture or the numbers.",
        "Reason: name the property, then add 'so' and say what it does for the user, like 'waterproof, so the rain cannot soak through and she stays dry'.",
        "One property, one 'so' sentence. If a part needs two properties, write two sentences."] },
    { id: "x17-mat-13", type: "mcq", level: 2,
      // distractors: strongest number wins (A); waterproof but stiff (C); flexible only (D)
      stem: "The picture shows a rain boot. Part X must keep Ali's feet dry when he walks through puddles, and it must bend when he walks. The table shows four materials. Which material is the most suitable for part X?",
      figure: MATX.withTbl(MATX.boot(), ['Material', 'Waterproof?', 'Flexible?', 'Weights held before it broke'], [['A', 'No', 'Yes', 30], ['B', 'Yes', 'Yes', 18], ['C', 'Yes', 'No', 25], ['D', 'No', 'Yes', 8]]),
      options: ["A", "B", "C", "D"],
      answer: 1,
      hints: ["The boot needs two properties: one for the puddles and one for walking. Strength is not one of them, so do not just pick the biggest number.",
        "B is the only material that is waterproof (dry feet) AND flexible (bends as he walks). A is strongest but lets water in."],
      explain: "B is waterproof (keeps the feet dry in puddles) and flexible (bends as Ali walks). A is the strongest, but it is not waterproof, so his feet would get wet. C is waterproof but cannot bend. D is not waterproof. Next time, try Read, compare, conclude: read every row, compare them, then say your answer.",
      technique: "Read, compare, conclude",
      steps: [
        "List what the job needs: one property for each job in the question.",
        "Go down the table one row at a time.",
        "Tick only a row that has EVERY property the job needs. Ignore columns the job does not need.",
        "Conclude: say the letter and the properties that decided it."],
      optionFeedback: {
        0: "A is the strongest, so it is easy to pick the biggest number. But A is not waterproof, so Ali's feet would get wet.",
        2: "C is waterproof: half the job! But C is not flexible, so the boot could not bend as he walks.",
        3: "D bends, but it is not waterproof, so his feet would get wet." } },
    { id: "x17-mat-14", type: "mcq", level: 2,
      // distractors: "some light" is enough to see (translucent, Q); breaks easily ignored (P); strong only (S)
      stem: "The picture shows a pair of reading glasses. The lenses, part X, must let Grandma see the words in her book clearly, and must not break easily if the glasses fall. Which material is the most suitable for part X?",
      figure: MATX.withTbl(MATX.glasses(), ['Material', 'How much light passes through', 'Breaks easily?'], [['P', 'Most', 'Yes'], ['Q', 'Some', 'No'], ['R', 'Most', 'No'], ['S', 'None', 'No']]),
      options: ["P", "Q", "R", "S"],
      answer: 2,
      hints: ["To see clearly, a lens must let MOST light through. 'Some light' makes things look blurry. Then check that it does not break easily.",
        "R lets most light through (see the words clearly) and does not break easily. Q only lets some light through: blurry."],
      explain: "R allows most light to pass through (transparent), so Grandma sees the words clearly, and it does not break easily. P is transparent but breaks easily. Q lets only some light through, so the words would look blurry. S lets no light through. Next time, try Read, compare, conclude: read every row, compare them, then say your answer.",
      technique: "Read, compare, conclude",
      steps: [
        "List what the job needs: one property for each job in the question.",
        "Go down the table one row at a time.",
        "Tick only a row that has EVERY property the job needs. Ignore columns the job does not need.",
        "Conclude: say the letter and the properties that decided it."],
      optionFeedback: {
        0: "P lets most light through, so Grandma could see: good! But P breaks easily.",
        1: "Q lets some light through, so she could see something. But the words would look blurry.",
        3: "S does not break easily, but it lets no light through, so she could not see at all." } },
    { id: "x17-mat-15", type: "oeq", level: 3, marks: 4,   // R-A FIX: (b) is 2 marks, strong AND waterproof
      stem: "The picture shows a bicycle helmet. Part X is the hard shell. It must protect Sara's head if she falls, and she often rides in the rain. Part Y is the strap, which must bend around her chin.\n(a) Which material is the most suitable for part X? (1 mark)\n(b) Explain your answer to (a) using the table. (2 marks)\n(c) Which material is the most suitable for part Y? (1 mark)",
      figure: MATX.withTbl(MATX.helmet(), ['Material', 'Strong?', 'Flexible?', 'Waterproof?'], [['J', 'Yes', 'No', 'Yes'], ['K', 'No', 'No', 'Yes'], ['L', 'No', 'Yes', 'Yes'], ['M', 'Yes', 'No', 'No']]),
      model: "(a) Material J. (b) J is strong, so the shell does not break and it protects her head when she falls. J is also waterproof, so the rain does not soak into the shell. (c) Material L.",
      keys: [ ["Material J"], ["strong, so the shell does not break", "protects her head", "protect her head", "does not break when she falls"], ["waterproof, so the rain does not soak", "rain does not soak", "does not absorb"], ["Material L"] ],
      hints: ["The shell needs TWO properties: strong (for a fall) AND waterproof (for the rain). Two materials are strong; only one is also waterproof. The strap only needs to bend.",
        "Shell: J, strong so it protects her head when she falls, and waterproof for the rain. Strap: L, the flexible one."],
      explain: "J and M are both strong, so the rain decides it: only J is also waterproof. Part (b) needs BOTH, each tied to the helmet: 'strong, so it protects her head when she falls' AND 'waterproof, so the rain does not soak into the shell'. The strap must be flexible: only L is. Next time, try Claim, evidence, reason, and give every property its own 'so'.",
      technique: "Claim, evidence, reason",
      steps: [
        "Claim: say the answer first (the material, or agree / do not agree).",
        "Evidence: point to the table, the picture or the numbers.",
        "Reason: name the property, then add 'so' and say what it does for the user, like 'waterproof, so the rain cannot soak through and she stays dry'.",
        "One property, one 'so' sentence. If a part needs two properties, write two sentences."] },
    { id: "x17-mat-16", type: "mcq", level: 3,
      // distractors: transparent but breaks (P, like glass); strong but opaque (R, like steel); "some light" lets her see (S)
      stem: "The picture shows a lunch box. Part X is the lid: Mum wants to see the food inside without opening it. Part Y is the box: it must not break if the lunch box is dropped. Which ONE material can be used for both part X and part Y?",
      figure: MATX.withTbl(MATX.lunchbox(), ['Material', 'How much light passes through', 'Breaks easily?'], [['P', 'Most', 'Yes'], ['Q', 'Most', 'No'], ['R', 'None', 'No'], ['S', 'Some', 'No']]),
      options: ["P", "Q", "R", "S"],
      answer: 1,
      hints: ["The lid needs MOST light to pass through. The box must NOT break easily. Find the one row that does both jobs.",
        "Q: most light passes through (see the food) and it does not break easily (safe if dropped). It can do both jobs."],
      explain: "Q allows most light to pass through, so Mum can see the food clearly through the lid, and it does not break easily, so it is good for the box too. P is transparent but breaks easily. R does not let light through. S lets only some light through, so the food would look blurry. Next time, try Read, compare, conclude: read every row, compare them, then say your answer.",
      technique: "Read, compare, conclude",
      steps: [
        "List what the job needs: one property for each job in the question.",
        "Go down the table one row at a time.",
        "Tick only a row that has EVERY property the job needs. Ignore columns the job does not need.",
        "Conclude: say the letter and the properties that decided it."],
      optionFeedback: {
        0: "P lets most light through, which is perfect for the lid! But it breaks easily, so it is no good for the box.",
        2: "R does not break easily, which is good for the box. But no light passes through, so Mum cannot see the food.",
        3: "S lets some light through, so Mum might see shapes, but the food would look blurry." } },
    { id: "x17-mat-17", type: "oeq", level: 2, marks: 2,
      stem: 'The picture shows a raincoat. The table shows the properties of three materials. Mei Ling chose material B. She wrote, \'B is suitable because it is waterproof.\' Her teacher said the answer was not complete yet. Rewrite her answer so that it earns 2 marks.',
      figure: MATX.withTbl(MATX.raincoat(), ['Material', 'Waterproof?', 'Flexible?'], [['A', 'Yes', 'No'], ['B', 'Yes', 'Yes'], ['C', 'No', 'Yes']]),
      model: "Material B is waterproof, so the rain cannot soak through the raincoat and the wearer stays dry. B is also flexible, so the raincoat can bend when the wearer moves.",
      keys: [ ["wearer stays dry", "keeps the wearer dry", "does not get wet"], ["bend when the wearer moves", "wearer can move", "can be folded"] ],
      hints: ["After 'waterproof', add 'so ...' and say what that does for the person wearing it. Then look at B's other Yes.",
        "B is waterproof, so the rain cannot soak through and the wearer stays dry. B is flexible, so the coat bends when the wearer moves."],
      explain: 'A property on its own is not finished yet. Each mark needs the property AND what it does for the raincoat: waterproof, so the wearer stays dry; flexible, so the coat bends when the wearer moves. A is waterproof but stiff; C bends but lets the rain through. Next time, try Claim, evidence, reason, and give every property its own \'so\'.',
      technique: "Claim, evidence, reason",
      steps: [
        "Claim: say the answer first (the material, or agree / do not agree).",
        "Evidence: point to the table, the picture or the numbers.",
        "Reason: name the property, then add 'so' and say what it does for the user, like 'waterproof, so the rain cannot soak through and she stays dry'.",
        "One property, one 'so' sentence. If a part needs two properties, write two sentences."] },

    // ---- Archetype 13: floats / sinks / water absorbed (absorbed = start - left) ----
    { id: "x17-mat-18", type: "mcq", level: 1,
      // distractors: only small things float (C only); bottom read as floating (B and D); shape decides (A and D)
      stem: "Wei Jie put four objects, A, B, C and D, into a basin of water. The picture shows what happened. Which objects float?",
      figure: MATX.basin([{ shape: 'block', w: 70, h: 34, x: 130, float: true, label: 'A' }, { shape: 'ball', r: 11, x: 196, float: false, label: 'B' },
        { shape: 'ball', r: 13, x: 250, float: true, label: 'C' }, { shape: 'block', w: 44, h: 30, x: 298, float: false, label: 'D' }],
        'A basin of water: A and C are at the surface, B and D are at the bottom'),
      options: ["A and C only", "B and D only", "C only", "A and D only"],
      answer: 0,
      hints: ["An object that floats stays at the top of the water. An object that sinks goes down to the bottom. Which objects are at the top?",
        "A and C are at the top of the water, so they float. B and D are at the bottom, so they sink."],
      explain: "A and C stay at the surface, so they float. B and D are at the bottom, so they sink. A is big and still floats, so size alone does not decide. A and D are both blocks, but only A floats, so shape alone does not decide either.",
      optionFeedback: {
        1: "B and D are at the bottom of the water, which means they sank.",
        2: "C floats, but A is at the top too. A big block can still float.",
        3: "A and D are both blocks, but D is at the bottom. Shape does not decide." } },
    { id: "x17-mat-19", type: "mcq", level: 2,
      // distractors: big things float / small things sink (size rule); sinking because it soaks up water
      stem: "Siva put a large wooden block and a small glass marble into a basin of water. The large block floated, but the small marble sank. What does this show?",
      figure: MATX.basin([{ shape: 'block', w: 96, h: 40, x: 150, float: true, label: 'wooden block', fill: '#e3c89a' }, { shape: 'ball', r: 9, x: 270, float: false, label: 'glass marble', fill: '#d0e6ea' }],
        'A large wooden block floats at the surface; a small glass marble lies at the bottom'),
      options: ["Big objects always float.", "Small objects always sink.", "Floating depends on the material, not the size.", "Glass absorbs water, so it sinks."],
      answer: 2,
      hints: ["The BIG one floated and the SMALL one sank. So is it really about size? What else is different about them?",
        "The big wooden block floats and the small glass marble sinks, so size does not decide: the material does."],
      explain: "The block is made of wood and the marble is made of glass. Wood floats and glass sinks, so the material made the difference. A small piece of wood would also float. Glass is waterproof: it does not absorb water, so that is not why it sinks. Next time, ask Can we be sure?: is anything else different?",
      technique: "Can we be sure?",
      steps: ['List every way the objects are different, such as size AND material.', 'Test each size rule against the results: the BIG block floated and the SMALL marble sank, so \'big things sink\' and \'small things float\' cannot both be true here.', 'So size did not decide it. The other difference is the material: wood floats and glass sinks, whatever the size.', 'Choose the answer the results really show, not a rule that sounds right.'],
      optionFeedback: {
        0: "The big block did float, so this is a fair thought. But a big glass block would sink. One test cannot show that ALL big objects float.",
        1: "The small marble did sink. But a small piece of wood floats, so size is not the reason.",
        3: "Glass does not absorb water: it is waterproof. It sinks because of what it is made of, not because of water soaking in." } },
    { id: "x17-mat-20", type: "mcq", level: 2,
      // distractors: fullest beaker = best towel (C); "water left" read as water absorbed (D, second fullest)
      stem: "Priya poured 100 ml of water into each of four beakers. She dipped a same-sized piece of material A, B, C or D into each beaker for 1 minute, took it out, and measured the water left. Which material is the most suitable for a bath towel?",
      figure: MATX.beakers(MATX.TOWEL, { cap: 120, start: 100, vals: true, label: 'Water left in each beaker after the material was taken out: A 70 ml, B 55 ml, C 100 ml, D 85 ml. All started at 100 ml' }),
      options: ["A", "B", "C", "D"],
      answer: 1,
      hints: ["Careful: the beakers show the water LEFT, not the water absorbed. Water absorbed = water at the start - water left. Try A first: 100 - 70 = ?",
        "Absorbed = 100 - water left: A 30, B 45, C 0, D 15 ml. B absorbed the most, so B is the best towel."],
      explain: "Water absorbed = water at the start - water left. A: 100 - 70 = 30 ml. B: 100 - 55 = 45 ml. C: 100 - 100 = 0 ml. D: 100 - 85 = 15 ml. B absorbed the most, so it dries the body best. C's beaker is the fullest because C absorbed nothing: it is waterproof and would not dry the body. Next time, try Start minus left: take away for every one before you choose.",
      technique: "Start minus left",
      steps: [
        "Find the water at the start and the water left for each material.",
        "Take away: water at the start minus water left = water absorbed.",
        "Work out the answer for EVERY material before you choose.",
        "Compare: the biggest number absorbed the most. 0 ml absorbed means waterproof.",
        "Match it to the job: a towel or mop needs the most; a raincoat or umbrella needs none."],
      optionFeedback: {
        0: "A absorbed 30 ml (100 - 70). Good working! B absorbed even more: 45 ml.",
        2: "C's beaker is the fullest, so it looks like 'the most water'. But C absorbed none: 100 - 100 = 0 ml.",
        3: "D's beaker is still quite full, which means D absorbed only 15 ml (100 - 85)." } },
    { id: "x17-mat-21", type: "oeq", level: 3, marks: 2,
      stem: "Look at Priya's beakers. Kai says, 'Material C is the best for a bath towel, because its beaker has the most water.' Is Kai correct? Explain your answer using the results.",
      figure: MATX.beakers(MATX.TOWEL, { cap: 120, start: 100, vals: true, label: 'Water left in each beaker after the material was taken out: A 70 ml, B 55 ml, C 100 ml, D 85 ml. All started at 100 ml' }),
      model: "No, Kai is not correct. C's beaker still had all 100 ml of water, so C absorbed no water (100 - 100 = 0 ml). B absorbed the most water (100 - 55 = 45 ml), so B is the best material for drying the body.",
      keys: [ ["absorbed no water", "0 ml"], ["B absorbed the most", "45 ml"] ],
      hints: ["The water in the beaker is the water the material did NOT take. Subtract for each one: water at the start - water left.",
        "No. C absorbed 100 - 100 = 0 ml. B absorbed 100 - 55 = 45 ml, the most, so B is the best towel, not C."],
      explain: "The easy mix-up is reading 'water left' as 'water absorbed'. Water absorbed = start - left. Evidence: C absorbed 0 ml, B absorbed 45 ml. Reason: the towel that absorbs the most water dries the body best, so B, not C. Next time, try Start minus left: take away for every one before you choose.",
      technique: "Start minus left",
      steps: [
        "Find the water at the start and the water left for each material.",
        "Take away: water at the start minus water left = water absorbed.",
        "Work out the answer for EVERY material before you choose.",
        "Claim: say whether Kai is correct. Evidence: give the numbers you worked out. Reason: the material that absorbs the most dries the body best."] },
    { id: "x17-mat-22", type: "oeq", level: 3, marks: 3,
      stem: "Farid poured 60 ml of water into each of four beakers. He soaked a same-sized piece of material P, Q, R or S in each beaker for 5 minutes, then took it out. The picture shows the water left.\n(a) How much water did material R absorb? (1 mark)\n(b) Which material is the most suitable for a bath towel? (1 mark)\n(c) Explain your answer to (b). (1 mark)",
      figure: MATX.beakers([{ l: 'P', v: 48 }, { l: 'Q', v: 60 }, { l: 'R', v: 25 }, { l: 'S', v: 41 }], { cap: 72, start: 60, vals: true, label: 'Water left in each beaker: P 48 ml, Q 60 ml, R 25 ml, S 41 ml. All started at 60 ml' }),
      model: "(a) 60 - 25 = 35 ml. (b) Material R. (c) R absorbed the most water (35 ml), so a towel made of R can soak up the water on the body and dry it.",
      keys: [ ["35 ml"], ["Material R"], ["dry the body", "soak up the water on the body", "dry it"] ],
      hints: ["Water absorbed = 60 ml - water left. Do the subtraction for every beaker, then compare.",
        "(a) 60 - 25 = 35 ml. (b) R, because it absorbed the most water. (c) So a towel of R soaks up the water and dries the body."],
      explain: "Absorbed = start - left. P: 60 - 48 = 12 ml. Q: 60 - 60 = 0 ml (waterproof). R: 60 - 25 = 35 ml. S: 60 - 41 = 19 ml. R absorbed the most. For (c), tie the evidence to the towel: it soaks up the water, so it dries the body. Next time, try Start minus left: take away for every one before you choose.",
      technique: "Start minus left",
      steps: [
        "Find the water at the start and the water left for each material.",
        "Take away: water at the start minus water left = water absorbed.",
        "Work out the answer for EVERY material before you choose.",
        "Compare: the biggest number absorbed the most. 0 ml absorbed means waterproof.",
        "Match it to the job: a towel or mop needs the most; a raincoat or umbrella needs none."] },
    { id: "x17-mat-23", type: "mcq", level: 2,
      // distractors: most absorbent picked for a rain job (R); heaviest = best (S); tiny gain "almost waterproof" (Q)
      stem: "Lily weighed a dry, same-sized piece of each material. She soaked each piece in water for 5 minutes, then weighed it again. Which material is the most suitable for the cover of an umbrella?",
      figure: MATX.withTbl(MATX.soakWeigh(), ['Material', 'Mass when dry (g)', 'Mass after soaking (g)'], MATX.SOAK_ROWS),
      options: ["P", "Q", "R", "S"],
      answer: 0,
      hints: ["Mass gained = mass after soaking - mass when dry. The gain is the water the piece took in. An umbrella cover must not take in any water.",
        "Gain = after - dry: P 0 g, Q 3 g, R 28 g, S 4 g. P absorbed no water, so P is best for the umbrella cover."],
      explain: 'Water absorbed = mass after soaking - mass when dry. P: 20 - 20 = 0 g, so P absorbed no water: it is waterproof and keeps the rain off. Q gained 3 g, R gained 28 g and S gained 4 g, so they all soak up some rain. Next time, take away for every one before you choose. Here the piece gets heavier, so it is mass after soaking minus mass when dry.',
      technique: "Start minus left",
      steps: ['Find the mass when dry and the mass after soaking for each material.', 'Here the piece gets HEAVIER, so take away the other way round: mass after soaking minus mass when dry = water soaked up.', 'Do not just pick the heaviest wet piece: it may have been the heaviest when dry too.', 'Compare the gains: the biggest gain soaked up the most. 0 g means waterproof.', 'Match it to the job: a towel needs the biggest gain; an umbrella cover needs 0 g.'],
      optionFeedback: { 1: 'Q gained only 3 g, but it still soaked up some water, so it is not waterproof.', 2: 'R gained the most (28 g), so it is great at soaking up water. That is a towel\'s job, not an umbrella\'s.', 3: 'S gained only 4 g, but any gain means it soaks up some rain. P gained 0 g.' } },
    { id: "x17-mat-24", type: "mcq", level: 3,
      // distractors: biggest 'after' number (S); smallest gain (P, reversed); middle (Q)
      stem: "Lily weighed a dry, same-sized piece of each material. She soaked each piece in water for 5 minutes, then weighed it again. Which material is the most suitable for a bath towel?",
      figure: MATX.withTbl(MATX.soakWeigh(), ['Material', 'Mass when dry (g)', 'Mass after soaking (g)'], MATX.SOAK_ROWS),
      options: ["P", "Q", "R", "S"],
      answer: 2,
      hints: ["Do not just pick the biggest 'after soaking' number. Subtract for each material: mass after soaking - mass when dry.",
        "Gain = after - dry: P 0 g, Q 3 g, R 28 g, S 4 g. R absorbed the most, so R is the best towel (not S)."],
      explain: 'Water absorbed = mass after - mass before. P: 0 g. Q: 38 - 35 = 3 g. R: 40 - 12 = 28 g. S: 54 - 50 = 4 g. R absorbed the most water, so it dries the body best. S is the heaviest after soaking only because it was already the heaviest when dry. Next time, take away for every one before you choose. Here the piece gets heavier, so it is mass after soaking minus mass when dry.',
      technique: "Start minus left",
      steps: ['Find the mass when dry and the mass after soaking for each material.', 'Here the piece gets HEAVIER, so take away the other way round: mass after soaking minus mass when dry = water soaked up.', 'Do not just pick the heaviest wet piece: it may have been the heaviest when dry too.', 'Compare the gains: the biggest gain soaked up the most. 0 g means waterproof.', 'Match it to the job: a towel needs the biggest gain; an umbrella cover needs 0 g.'],
      optionFeedback: {
        0: "P gained 0 g, so it did not absorb any water. That makes it waterproof, which a towel should not be.",
        1: "Q gained only 3 g (38 - 35), so it soaks up very little water.",
        3: "S is the heaviest after soaking, so it is easy to pick. But S was already the heaviest when dry (50 g), and it gained only 4 g. Subtract first!" } },
    { id: "x17-mat-25", type: "mcq", level: 2,
      // distractors: floats but soaks up water (P); waterproof but sinks (R); neither (S)
      stem: "The picture shows a life vest. Part X must keep a swimmer's head above the water, and it must not become heavy with water. Which material is the most suitable for part X?",
      figure: MATX.withTbl(MATX.lifevest(), ['Material', 'Floats?', 'Absorbs water?'], [['P', 'Yes', 'Yes'], ['Q', 'Yes', 'No'], ['R', 'No', 'No'], ['S', 'No', 'Yes']]),
      options: ["P", "Q", "R", "S"],
      answer: 1,
      hints: ["The vest needs two things: Floats = Yes, and Absorbs water = No.",
        "Q is the only material that floats AND does not absorb water, so Q keeps the head up and stays light."],
      explain: "Q floats, so it keeps the swimmer's head above the water, and it does not absorb water, so it does not become heavy. P floats but soaks up water and gets heavy. R does not absorb water but it sinks. S sinks and absorbs water. Next time, try Read, compare, conclude: read every row, compare them, then say your answer.",
      technique: "Read, compare, conclude",
      steps: [
        "List what the job needs: one property for each job in the question.",
        "Go down the table one row at a time.",
        "Tick only a row that has EVERY property the job needs. Ignore columns the job does not need.",
        "Conclude: say the letter and the properties that decided it."],
      optionFeedback: {
        0: "P floats: half the job! But it soaks up water and gets heavy.",
        2: "R does not absorb water: half the job! But it sinks.",
        3: "S sinks, and it absorbs water too." } },
    { id: "x17-mat-26", type: "oeq", level: 2, marks: 2,
      stem: "Look at the table for the life vest. Explain why material Q is suitable for part X. Use the table in your answer.",
      figure: MATX.withTbl(MATX.lifevest(), ['Material', 'Floats?', 'Absorbs water?'], [['P', 'Yes', 'Yes'], ['Q', 'Yes', 'No'], ['R', 'No', 'No'], ['S', 'No', 'Yes']]),
      model: "Q floats, so the life vest keeps the swimmer's head above the water. Q does not absorb water, so the vest does not become heavy and pull the swimmer down.",
      keys: [ ["keeps the swimmer's head above the water", "above the water", "stay afloat"], ["does not become heavy", "not become heavy", "not pull the swimmer down"] ],
      hints: ["Use both columns. For each one, say what it does for the swimmer: 'Q floats, so ...' and 'Q does not absorb water, so ...'.",
        "Q floats, so it keeps the swimmer's head above the water. Q does not absorb water, so the vest does not become heavy."],
      explain: 'Claim, evidence, reason for each mark. \'Q floats\' on its own is not finished yet; \'Q floats, so it keeps the swimmer\'s head above the water\' earns the mark. The same goes for \'does not absorb water, so the vest does not become heavy\'. Next time, try Claim, evidence, reason, and give every property its own \'so\'.',
      technique: "Claim, evidence, reason",
      steps: [
        "Claim: say the answer first (the material, or agree / do not agree).",
        "Evidence: point to the table, the picture or the numbers.",
        "Reason: name the property, then add 'so' and say what it does for the user, like 'waterproof, so the rain cannot soak through and she stays dry'.",
        "One property, one 'so' sentence. If a part needs two properties, write two sentences."] }
  ]
});
