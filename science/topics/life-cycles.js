"use strict";
// Science Quest — topic: Life Cycles (MOE 2023 Primary Science, Cycles theme, P3).
// Data only; the small helpers below only build SVG / HTML strings (no DOM access).
(function () {
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const FONT = 'font-family="system-ui, -apple-system, sans-serif"';

  // Labelled stage cycle: boxes placed round an ellipse, arrows clockwise.
  // '|' in a label breaks it onto two lines. A label of '?' or a single letter is drawn dashed.
  function cycle(labels) {
    const n = labels.length, W = 360, H = 260, cx = 180, cy = 130, rx = 118, ry = 88, bw = 118, bh = 40;
    const pts = labels.map((_, i) => {
      const a = -Math.PI / 2 + (2 * Math.PI * i) / n;
      return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)];
    });
    let out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" style="max-width:360px" role="img" aria-label="Life cycle diagram: ${esc(labels.join(', then ').replace(/\|/g, ' '))}, then back to the start" ${FONT}>`;
    for (let i = 0; i < n; i++) {
      const [px, py] = pts[i], [qx, qy] = pts[(i + 1) % n];
      const dx = qx - px, dy = qy - py, d = Math.hypot(dx, dy), ux = dx / d, uy = dy / d;
      const cut = Math.min(Math.abs(ux) > 1e-6 ? bw / 2 / Math.abs(ux) : 1e9, Math.abs(uy) > 1e-6 ? bh / 2 / Math.abs(uy) : 1e9) + 5;
      const sx = px + ux * cut, sy = py + uy * cut, ex = qx - ux * cut, ey = qy - uy * cut;
      const hx = ex - ux * 10, hy = ey - uy * 10, nx = -uy * 5, ny = ux * 5;
      out += `<line x1="${sx.toFixed(1)}" y1="${sy.toFixed(1)}" x2="${hx.toFixed(1)}" y2="${hy.toFixed(1)}" stroke="currentColor" stroke-width="2"/>`;
      out += `<polygon points="${ex.toFixed(1)},${ey.toFixed(1)} ${(hx + nx).toFixed(1)},${(hy + ny).toFixed(1)} ${(hx - nx).toFixed(1)},${(hy - ny).toFixed(1)}" fill="currentColor"/>`;
    }
    labels.forEach((lab, i) => {
      const [px, py] = pts[i];
      const unknown = lab === '?' || /^[A-Z]$/.test(lab);
      out += `<rect x="${(px - bw / 2).toFixed(1)}" y="${(py - bh / 2).toFixed(1)}" width="${bw}" height="${bh}" rx="8" fill="none" stroke="currentColor" stroke-width="${unknown ? 2.5 : 1.5}"${unknown ? ' stroke-dasharray="5 4"' : ''}/>`;
      const lines = lab.split('|');
      lines.forEach((t, k) => {
        const y = py + (k - (lines.length - 1) / 2) * 15 + 5;
        out += `<text x="${px.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" font-size="${unknown ? 18 : 13}" font-weight="${unknown ? 700 : 500}" fill="currentColor">${esc(t)}</text>`;
      });
    });
    return out + '</svg>';
  }

  // Simple bordered HTML table. Cells are trusted plain strings (escaped here).
  function tbl(head, rows, caption) {
    const td = 'style="border:1px solid currentColor;padding:4px 8px;text-align:center"';
    let h = '<table style="border-collapse:collapse;margin:0 auto;font-size:14px">';
    if (caption) h += `<caption style="padding-bottom:4px;font-weight:600">${esc(caption)}</caption>`;
    h += '<tr>' + head.map((c) => `<th ${td}>${esc(c)}</th>`).join('') + '</tr>';
    rows.forEach((r) => { h += '<tr>' + r.map((c) => `<td ${td}>${esc(c)}</td>`).join('') + '</tr>'; });
    return h + '</table>';
  }

  const daysTable = tbl(['Stage', 'Egg', 'Larva', 'Pupa', 'Adult'], [['Number of days', '4', '18', '9', '14']], 'Days animal X spent in each stage');

  const germTable4 = tbl(
    ['Set-up', 'Water', 'Air', 'Warmth', 'Light'],
    [['A', 'Yes', 'Yes', 'Yes', 'Yes'], ['B', 'No', 'Yes', 'Yes', 'Yes'], ['C', 'Yes', 'Yes', 'No (cold)', 'Yes'], ['D', 'Yes', 'Yes', 'Yes', 'No (dark)']],
    'Was each condition given to the seeds?');

  const fairPick = tbl(
    ['Set-up', 'Cotton wool', 'Temperature', 'Light'],
    [['P', 'wet', '25°C', 'light'], ['Q', 'dry', '25°C', 'light'], ['R', 'dry', '5°C', 'dark'], ['S', 'wet', '5°C', 'light']],
    'Each dish has 10 green bean seeds');

  const meiExp = tbl(
    ['Dish', 'Cotton wool', 'Place', 'Number of seeds', 'Seeds that germinated after 5 days'],
    [['A', 'wet', 'on the table', '10', '9'], ['B', 'dry', 'on the table', '10', '0']],
    "Mei's experiment");

  const fridgeExp = tbl(
    ['Set-up', 'Cotton wool', 'Placed', 'Germinated?'],
    [['A', 'wet', 'on a sunny windowsill', 'Yes'], ['B', 'wet', 'inside a fridge', 'No']],
    "Ali's experiment");

  const threeAnimals = tbl(
    ['Animal', 'Stages in its life cycle'],
    [['A', 'egg → nymph → adult'], ['B', 'egg → larva → pupa → adult'], ['C', 'egg → tadpole → adult frog']]); // 3-stage frog per the 2026-10-07 ruling (By-Eye F12)

  const compareTable = tbl(
    ['Animal', 'Stages in its life cycle'],
    [['Cockroach', 'egg → nymph → adult'], ['Butterfly', 'egg → larva → pupa → adult']]);

  // Bar chart with gridlines and the value printed on every bar.
  // o = { title, cats (use '|' for a 2nd line), series: [{ name, vals }], yMax, yStep, yLabel, xLabel }
  function bars(o) {
    const W = 360, x0 = 52, x1 = 350, yTop = o.title ? 40 : 16, yBot = yTop + 160;
    const n = o.cats.length, ns = o.series.length, gw = (x1 - x0) / n;
    const bw = Math.min(40, (gw - 14) / ns);
    const catLines = Math.max(...o.cats.map((c) => c.split('|').length));
    let y = yBot + 4 + catLines * 15;
    const xLabY = o.xLabel ? (y += 18) : 0;
    const legY = ns > 1 ? (y += 24) : 0;
    const H = y + 10;
    const sy = (v) => yBot - (v / o.yMax) * (yBot - yTop);
    const aria = o.series.map((s) => (s.name ? s.name + ': ' : '') + o.cats.map((c, i) => c.replace('|', ' ') + ' ' + s.vals[i]).join(', ')).join('; ');
    let out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" style="max-width:360px" role="img" aria-label="Bar chart. ${esc(aria)}" ${FONT}>`;
    if (o.title) out += `<text x="${(x0 + x1) / 2}" y="20" text-anchor="middle" font-size="14" font-weight="700" fill="currentColor">${esc(o.title)}</text>`;
    for (let v = 0; v <= o.yMax; v += o.yStep) {
      const gy = sy(v).toFixed(1);
      out += `<line x1="${x0}" y1="${gy}" x2="${x1}" y2="${gy}" stroke="currentColor" stroke-width="${v === 0 ? 1.5 : 0.7}" stroke-opacity="${v === 0 ? 1 : 0.35}"/>`;
      out += `<text x="${x0 - 6}" y="${(+gy + 4.5).toFixed(1)}" text-anchor="end" font-size="13" fill="currentColor">${v}</text>`;
    }
    out += `<line x1="${x0}" y1="${yTop}" x2="${x0}" y2="${yBot}" stroke="currentColor" stroke-width="1.5"/>`;
    const my = (yTop + yBot) / 2;
    out += `<text x="13" y="${my}" text-anchor="middle" font-size="13" fill="currentColor" transform="rotate(-90 13 ${my})">${esc(o.yLabel)}</text>`;
    o.cats.forEach((c, i) => {
      const gx = x0 + i * gw, start = gx + (gw - bw * ns) / 2;
      o.series.forEach((s, k) => {
        const v = s.vals[i], bx = start + k * bw, by = sy(v);
        if (v > 0) out += `<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${(bw - 2).toFixed(1)}" height="${(yBot - by).toFixed(1)}" fill="currentColor" fill-opacity="${k === 0 ? 0.7 : 0.18}" stroke="currentColor" stroke-width="1.2"/>`;
        out += `<text x="${(bx + (bw - 2) / 2).toFixed(1)}" y="${(by - 4).toFixed(1)}" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor">${v}</text>`;
      });
      c.split('|').forEach((t, k) => {
        out += `<text x="${(gx + gw / 2).toFixed(1)}" y="${yBot + 17 + k * 15}" text-anchor="middle" font-size="13" fill="currentColor">${esc(t)}</text>`;
      });
    });
    if (o.xLabel) out += `<text x="${(x0 + x1) / 2}" y="${xLabY}" text-anchor="middle" font-size="13" font-weight="600" fill="currentColor">${esc(o.xLabel)}</text>`;
    if (ns > 1) {
      o.series.forEach((s, k) => {
        const lx = 90 + k * 130;
        out += `<rect x="${lx}" y="${legY - 12}" width="16" height="14" fill="currentColor" fill-opacity="${k === 0 ? 0.7 : 0.18}" stroke="currentColor" stroke-width="1.2"/>`;
        out += `<text x="${lx + 22}" y="${legY}" font-size="13" fill="currentColor">${esc(s.name)}</text>`;
      });
    }
    return out + '</svg>';
  }

  const daysP = bars({ title: 'Days insect P spent in each stage', cats: ['Egg', 'Larva', 'Pupa', 'Adult'],
    series: [{ vals: [5, 14, 10, 12] }], yMax: 16, yStep: 2, yLabel: 'Number of days' });

  const daysJK = bars({ title: 'Days insects J and K spent in each stage', cats: ['Egg', 'Larva', 'Pupa'],
    series: [{ name: 'Insect J', vals: [4, 15, 7] }, { name: 'Insect K', vals: [6, 20, 6] }], yMax: 25, yStep: 5, yLabel: 'Number of days' });

  const daysMozzie = bars({ title: 'Days a mosquito spends in each stage', cats: ['Egg', 'Larva', 'Pupa', 'Adult|male', 'Adult|female'],
    series: [{ vals: [2, 6, 2, 7, 28] }], yMax: 30, yStep: 5, yLabel: 'Number of days' });

  const beetleFood = bars({ title: 'Mass of food the beetle ate each week', cats: ['1', '2', '3', '4', '5', '6', '7'],
    series: [{ vals: [0, 2, 5, 8, 0, 0, 3] }], yMax: 10, yStep: 2, yLabel: 'Mass of food (g)', xLabel: 'Week' });

  // Line graph: body mass of a butterfly over time, the four stages marked W, X, Y, Z (not named).
  const massGraph = (() => {
    const x0 = 52, x1 = 345, yTop = 40, yBot = 196, dMax = 35, mMax = 3;
    const sx = (d) => x0 + (d / dMax) * (x1 - x0), sy = (m) => yBot - (m / mMax) * (yBot - yTop);
    const pts = [[0, 0.05], [5, 0.05], [8, 0.3], [11, 0.9], [14, 1.9], [17, 2.8], [27, 2.8], [28, 2.2], [35, 2.2]];
    let out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 250" width="100%" style="max-width:360px" role="img" aria-label="Line graph of body mass against day. W: days 0 to 5, mass almost 0. X: days 5 to 17, mass rises steeply to 2.8 g. Y: days 17 to 27, mass stays at 2.8 g. Z: days 27 to 35, mass about 2.2 g." ${FONT}>`;
    for (let m = 0; m <= mMax; m += 0.5) {
      const gy = sy(m).toFixed(1);
      out += `<line x1="${x0}" y1="${gy}" x2="${x1}" y2="${gy}" stroke="currentColor" stroke-width="${m === 0 ? 1.5 : 0.7}" stroke-opacity="${m === 0 ? 1 : 0.35}"/>`;
      out += `<text x="${x0 - 6}" y="${(+gy + 4.5).toFixed(1)}" text-anchor="end" font-size="13" fill="currentColor">${m}</text>`;
    }
    for (let d = 0; d <= dMax; d += 5) {
      out += `<text x="${sx(d).toFixed(1)}" y="${yBot + 17}" text-anchor="middle" font-size="13" fill="currentColor">${d}</text>`;
    }
    out += `<line x1="${x0}" y1="${yTop}" x2="${x0}" y2="${yBot}" stroke="currentColor" stroke-width="1.5"/>`;
    [5, 17, 27].forEach((d) => { out += `<line x1="${sx(d).toFixed(1)}" y1="${yTop - 14}" x2="${sx(d).toFixed(1)}" y2="${yBot}" stroke="currentColor" stroke-width="1.2" stroke-dasharray="4 4"/>`; });
    [['W', 0, 5], ['X', 5, 17], ['Y', 17, 27], ['Z', 27, 35]].forEach(([L, a, b]) => {
      out += `<text x="${sx((a + b) / 2).toFixed(1)}" y="${yTop - 12}" text-anchor="middle" font-size="16" font-weight="700" fill="currentColor">${L}</text>`;
    });
    out += `<polyline points="${pts.map(([d, m]) => sx(d).toFixed(1) + ',' + sy(m).toFixed(1)).join(' ')}" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/>`;
    out += `<text x="${(x0 + x1) / 2}" y="${yBot + 36}" text-anchor="middle" font-size="13" font-weight="600" fill="currentColor">Day (from the day the egg was laid)</text>`;
    out += `<text x="13" y="${(yTop + yBot) / 2}" text-anchor="middle" font-size="13" fill="currentColor" transform="rotate(-90 13 ${(yTop + yBot) / 2})">Body mass (g)</text>`;
    return out + '</svg>';
  })();

  // Four butterfly stages drawn without names, labelled P-S in a mixed-up order:
  // P adult, Q eggs on a leaf, R pupa hanging from a twig, S caterpillar.
  const butterflyPics = (() => {
    const S = 'stroke="currentColor" stroke-width="2"';
    let out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 260" width="100%" style="max-width:360px" role="img" aria-label="Four unlabelled drawings: P, an insect with two pairs of wings; Q, tiny round dots on a leaf; R, a closed case hanging from a twig; S, a long soft body made of segments, on a stem" ${FONT}>`;
    [[4, 4, 'P'], [182, 4, 'Q'], [4, 132, 'R'], [182, 132, 'S']].forEach(([x, y, L]) => {
      out += `<rect x="${x}" y="${y}" width="174" height="124" rx="10" fill="none" stroke="currentColor" stroke-width="1.5"/>`;
      out += `<text x="${x + 12}" y="${y + 24}" font-size="20" font-weight="700" fill="currentColor">${L}</text>`;
    });
    // P: adult butterfly
    const bx = 98, by = 70;
    out += `<ellipse cx="${bx - 24}" cy="${by - 12}" rx="24" ry="18" fill="currentColor" fill-opacity="0.2" ${S}/>`;
    out += `<ellipse cx="${bx + 24}" cy="${by - 12}" rx="24" ry="18" fill="currentColor" fill-opacity="0.2" ${S}/>`;
    out += `<ellipse cx="${bx - 16}" cy="${by + 16}" rx="15" ry="12" fill="currentColor" fill-opacity="0.2" ${S}/>`;
    out += `<ellipse cx="${bx + 16}" cy="${by + 16}" rx="15" ry="12" fill="currentColor" fill-opacity="0.2" ${S}/>`;
    out += `<ellipse cx="${bx}" cy="${by + 2}" rx="5" ry="27" fill="currentColor"/>`;
    out += `<path d="M${bx - 2},${by - 24} Q${bx - 8},${by - 40} ${bx - 16},${by - 46} M${bx + 2},${by - 24} Q${bx + 8},${by - 40} ${bx + 16},${by - 46}" fill="none" ${S}/>`;
    out += `<circle cx="${bx - 16}" cy="${by - 46}" r="3" fill="currentColor"/><circle cx="${bx + 16}" cy="${by - 46}" r="3" fill="currentColor"/>`;
    // Q: eggs on a leaf
    out += `<path d="M200,78 Q262,30 342,70 Q268,112 200,78 Z" fill="currentColor" fill-opacity="0.12" ${S}/>`;
    out += `<path d="M200,78 Q270,72 342,70" fill="none" stroke="currentColor" stroke-width="1.2"/>`;
    [[262, 62], [276, 60], [269, 85], [284, 82]].forEach(([x, y]) => { out += `<circle cx="${x}" cy="${y}" r="4.5" fill="currentColor"/>`; });
    // R: pupa hanging from a twig
    out += `<line x1="24" y1="164" x2="160" y2="160" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>`;
    out += `<line x1="96" y1="162" x2="96" y2="172" ${S}/>`;
    out += `<path d="M96,172 C116,188 114,228 96,246 C78,228 76,188 96,172 Z" fill="currentColor" fill-opacity="0.25" ${S}/>`;
    out += `<path d="M86,200 Q96,206 106,200 M84,218 Q96,224 108,218" fill="none" stroke="currentColor" stroke-width="1.2"/>`;
    // S: caterpillar on a stem
    out += `<line x1="196" y1="232" x2="346" y2="232" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>`;
    for (let i = 0; i < 8; i++) {
      const cx = 216 + i * 14, cy = 212 - (i % 2 ? 3 : 0);
      out += `<line x1="${cx}" y1="${cy + 8}" x2="${cx}" y2="229" stroke="currentColor" stroke-width="1.5"/>`;
      out += `<circle cx="${cx}" cy="${cy}" r="9" fill="currentColor" fill-opacity="0.25" ${S}/>`;
    }
    out += `<circle cx="${216 + 8 * 14 + 2}" cy="206" r="11" fill="currentColor" fill-opacity="0.45" ${S}/>`;
    out += `<path d="M${330},197 L${334},186 M${338},199 L${344},190" ${S}/>`;
    return out + '</svg>';
  })();

  // Three plant stages drawn without names, labelled J-L in a mixed-up order:
  // J adult plant with flowers and fruits, K seed, L young plant with a few leaves.
  const plantPics = (() => {
    const S = 'stroke="currentColor" stroke-width="2"';
    const leaf = (x, y, dir, len) => `<ellipse cx="${x + dir * len / 2}" cy="${y}" rx="${len / 2}" ry="${len / 5}" transform="rotate(${-dir * 25} ${x} ${y})" fill="currentColor" fill-opacity="0.3" ${S}/>`;
    const flower = (x, y) => [0, 72, 144, 216, 288].map((a) => `<circle cx="${(x + 7 * Math.cos(a * Math.PI / 180)).toFixed(1)}" cy="${(y + 7 * Math.sin(a * Math.PI / 180)).toFixed(1)}" r="5" fill="none" ${S}/>`).join('') + `<circle cx="${x}" cy="${y}" r="3" fill="currentColor"/>`;
    let out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 216" width="100%" style="max-width:360px" role="img" aria-label="Three unlabelled drawings: J, a tall plant with many leaves, flowers and fruits; K, a seed; L, a small plant with a short stem and two leaves" ${FONT}>`;
    [[2, 'J'], [122, 'K'], [242, 'L']].forEach(([x, L]) => {
      out += `<rect x="${x}" y="2" width="116" height="210" rx="10" fill="none" stroke="currentColor" stroke-width="1.5"/>`;
      out += `<text x="${x + 10}" y="26" font-size="20" font-weight="700" fill="currentColor">${L}</text>`;
    });
    // J: adult plant
    out += `<line x1="8" y1="178" x2="112" y2="178" stroke="currentColor" stroke-width="2.5"/>`;
    out += `<path d="M60,178 L58,190 M60,178 L48,196 M60,178 L72,198 M60,178 L62,202" fill="none" stroke="currentColor" stroke-width="1.5"/>`;
    out += `<line x1="60" y1="178" x2="60" y2="52" stroke="currentColor" stroke-width="3"/>`;
    out += leaf(60, 160, -1, 34) + leaf(60, 150, 1, 34) + leaf(60, 126, -1, 30) + leaf(60, 112, 1, 30);
    out += `<line x1="60" y1="92" x2="84" y2="78" ${S}/>` + `<line x1="60" y1="98" x2="36" y2="86" ${S}/>`;
    out += flower(60, 46) + flower(88, 72);
    out += `<line x1="36" y1="86" x2="34" y2="96" ${S}/><ellipse cx="33" cy="106" rx="6" ry="11" fill="currentColor"/>`;
    out += `<line x1="84" y1="98" x2="86" y2="108" stroke="currentColor" stroke-width="2"/><line x1="60" y1="104" x2="84" y2="98" ${S}/><ellipse cx="87" cy="118" rx="6" ry="11" fill="currentColor"/>`;
    // K: seed
    out += `<ellipse cx="180" cy="112" rx="30" ry="19" fill="currentColor" fill-opacity="0.15" ${S}/>`;
    out += `<ellipse cx="180" cy="104" rx="7" ry="3" fill="currentColor"/>`;
    // L: young plant
    out += `<line x1="248" y1="178" x2="354" y2="178" stroke="currentColor" stroke-width="2.5"/>`;
    out += `<path d="M300,178 L298,192 M300,178 L290,190 M300,178 L310,192" fill="none" stroke="currentColor" stroke-width="1.5"/>`;
    out += `<line x1="300" y1="178" x2="300" y2="132" stroke="currentColor" stroke-width="2.5"/>`;
    out += leaf(300, 134, -1, 30) + leaf(300, 134, 1, 30);
    return out + '</svg>';
  })();

  // Two tanks of water with a mosquito larva hanging from the surface; tank B has a thin layer of oil.
  const oilTanks = (() => {
    const larva = (x, top) => {
      let s = `<line x1="${x}" y1="${top}" x2="${x + 4}" y2="${top + 12}" stroke="currentColor" stroke-width="2.5"/>`;
      for (let i = 0; i < 6; i++) s += `<circle cx="${x + 6 + i * 2.4}" cy="${top + 16 + i * 7}" r="4" fill="currentColor" fill-opacity="0.5" stroke="currentColor" stroke-width="1"/>`;
      return s + `<circle cx="${x + 21}" cy="${top + 62}" r="6" fill="currentColor"/>`;
    };
    let out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 214" width="100%" style="max-width:360px" role="img" aria-label="Tank A: water with a larva hanging below the surface, its breathing tube touching the air. Tank B: the same, but a thin layer of oil covers the water, so the breathing tube touches the oil" ${FONT}>`;
    [[14, 'Tank A'], [196, 'Tank B']].forEach(([x, L]) => {
      out += `<text x="${x + 75}" y="20" text-anchor="middle" font-size="14" font-weight="700" fill="currentColor">${L}</text>`;
      out += `<rect x="${x}" y="72" width="150" height="122" fill="currentColor" fill-opacity="0.1"/>`;
      out += `<path d="M${x},40 L${x},194 L${x + 150},194 L${x + 150},40" fill="none" stroke="currentColor" stroke-width="2.5"/>`;
      out += `<text x="${x + 110}" y="160" text-anchor="middle" font-size="13" fill="currentColor">water</text>`;
      out += `<text x="${x + 32}" y="58" text-anchor="middle" font-size="13" fill="currentColor">air</text>`;
    });
    out += `<rect x="196" y="64" width="150" height="8" fill="currentColor" fill-opacity="0.6"/>`;
    out += `<text x="300" y="58" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor">oil layer</text>`;
    out += larva(62, 72) + larva(244, 72);
    out += `<line x1="64" y1="78" x2="94" y2="96" stroke="currentColor" stroke-width="1"/>`;
    out += `<text x="96" y="100" font-size="13" fill="currentColor">breathing</text><text x="96" y="115" font-size="13" fill="currentColor">tube</text>`;
    out += `<text x="${66}" y="${154}" text-anchor="middle" font-size="13" fill="currentColor">larva</text>`;
    return out + '</svg>';
  })();

  /* ---------- x17 science expansion helpers (lane sci-x-plantcycle) ---------- */
  // One small stage cycle centred on (cx, cy): boxes round an ellipse, arrows clockwise.
  function x17CycleAt(labels, cx, cy, rx, ry, bw, bh) {
    const n = labels.length;
    const pts = labels.map((_, i) => {
      const a = -Math.PI / 2 + (2 * Math.PI * i) / n;
      return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)];
    });
    let out = '';
    for (let i = 0; i < n; i++) {
      const [px, py] = pts[i], [qx, qy] = pts[(i + 1) % n];
      const dx = qx - px, dy = qy - py, d = Math.hypot(dx, dy), ux = dx / d, uy = dy / d;
      const cut = Math.min(Math.abs(ux) > 1e-6 ? bw / 2 / Math.abs(ux) : 1e9, Math.abs(uy) > 1e-6 ? bh / 2 / Math.abs(uy) : 1e9) + 4;
      const sx = px + ux * cut, sy = py + uy * cut, ex = qx - ux * cut, ey = qy - uy * cut;
      const hx = ex - ux * 9, hy = ey - uy * 9, nx = -uy * 4.5, ny = ux * 4.5;
      out += `<line x1="${sx.toFixed(1)}" y1="${sy.toFixed(1)}" x2="${hx.toFixed(1)}" y2="${hy.toFixed(1)}" stroke="currentColor" stroke-width="2"/>`;
      out += `<polygon points="${ex.toFixed(1)},${ey.toFixed(1)} ${(hx + nx).toFixed(1)},${(hy + ny).toFixed(1)} ${(hx - nx).toFixed(1)},${(hy - ny).toFixed(1)}" fill="currentColor"/>`;
    }
    labels.forEach((lab, i) => {
      const [px, py] = pts[i];
      out += `<rect x="${(px - bw / 2).toFixed(1)}" y="${(py - bh / 2).toFixed(1)}" width="${bw}" height="${bh}" rx="7" fill="none" stroke="currentColor" stroke-width="1.5"/>`;
      out += `<text x="${px.toFixed(1)}" y="${(py + 5).toFixed(1)}" text-anchor="middle" font-size="13" font-weight="500" fill="currentColor">${esc(lab)}</text>`;
    });
    return out;
  }

  // Two life cycles side by side: animal A (3 stages) and animal B (4 stages).
  const x17PairAB = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 214" width="100%" style="max-width:360px" role="img" aria-label="Two life cycle diagrams. Animal A: egg, then young, then adult, then back to egg. Animal B: egg, then larva, then pupa, then adult, then back to egg." ${FONT}>` +
    `<text x="90" y="18" text-anchor="middle" font-size="15" font-weight="700" fill="currentColor">Animal A</text>` +
    `<text x="270" y="18" text-anchor="middle" font-size="15" font-weight="700" fill="currentColor">Animal B</text>` +
    `<line x1="180" y1="6" x2="180" y2="208" stroke="currentColor" stroke-width="1" stroke-opacity="0.35"/>` +
    x17CycleAt(['Egg', 'Young', 'Adult'], 90, 118, 58, 60, 62, 30) +
    x17CycleAt(['Egg', 'Larva', 'Pupa', 'Adult'], 270, 118, 52, 62, 64, 30) + '</svg>';

  // Four stages in a row with arrows between; panel k is drawn by draw[k](x0) (84 wide, 142 tall).
  function x17Strip(letters, draw, aria) {
    let out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 150" width="100%" style="max-width:400px" role="img" aria-label="${esc(aria)}" ${FONT}>`;
    [4, 106, 208, 310].forEach((x, k) => {
      const blank = letters[k].blank;
      out += `<rect x="${x}" y="4" width="84" height="142" rx="9" fill="none" stroke="currentColor" stroke-width="${blank ? 2.5 : 1.5}"${blank ? ' stroke-dasharray="6 4"' : ''}/>`;
      out += `<text x="${x + 9}" y="24" font-size="17" font-weight="700" fill="currentColor">${letters[k].L}</text>`;
      out += blank ? `<text x="${x + 42}" y="96" text-anchor="middle" font-size="44" font-weight="700" fill="currentColor">?</text>` : draw[k](x);
      if (k < 3) {
        const ax = x + 87, ay = 75;
        out += `<line x1="${ax}" y1="${ay}" x2="${ax + 10}" y2="${ay}" stroke="currentColor" stroke-width="2"/><polygon points="${ax + 15},${ay} ${ax + 9},${ay - 4} ${ax + 9},${ay + 4}" fill="currentColor"/>`;
      }
    });
    return out + '</svg>';
  }
  const x17Water = (x, top) => `<rect x="${x + 2}" y="${top}" width="80" height="${144 - top}" fill="currentColor" fill-opacity="0.1"/><line x1="${x + 2}" y1="${top}" x2="${x + 82}" y2="${top}" stroke="currentColor" stroke-width="1.5"/>`;

  // Mosquito: W eggs floating on water, X larva hanging from the surface, Y missing, Z adult.
  const x17Mozzie = x17Strip([{ L: 'W' }, { L: 'X' }, { L: 'Y', blank: true }, { L: 'Z' }], [
    (x) => x17Water(x, 76) + [0, 1, 2, 3, 4, 5].map((i) => `<ellipse cx="${x + 27 + i * 6}" cy="${72}" rx="2.6" ry="5.5" fill="currentColor"/>`).join(''),
    (x) => {
      let s = x17Water(x, 50) + `<line x1="${x + 34}" y1="50" x2="${x + 37}" y2="62" stroke="currentColor" stroke-width="2.5"/>`;
      for (let i = 0; i < 6; i++) s += `<circle cx="${(x + 39 + i * 1.6).toFixed(1)}" cy="${66 + i * 8}" r="4.2" fill="currentColor" fill-opacity="0.5" stroke="currentColor" stroke-width="1"/>`;
      return s + `<circle cx="${x + 50}" cy="${119}" r="6" fill="currentColor"/>`;
    },
    null,
    (x) => {
      const S = 'stroke="currentColor" stroke-width="1.6" fill="none"';
      let s = `<ellipse cx="${x + 52}" cy="64" rx="16" ry="5" transform="rotate(-25 ${x + 52} 64)" fill="currentColor" fill-opacity="0.15" stroke="currentColor" stroke-width="1.4"/>`;
      s += `<ellipse cx="${x + 58}" cy="70" rx="15" ry="4.5" transform="rotate(-8 ${x + 58} 70)" fill="currentColor" fill-opacity="0.15" stroke="currentColor" stroke-width="1.4"/>`;
      s += `<ellipse cx="${x + 38}" cy="80" rx="7" ry="6" fill="currentColor"/>`;
      s += `<ellipse cx="${x + 58}" cy="86" rx="15" ry="4" transform="rotate(14 ${x + 58} 86)" fill="currentColor" fill-opacity="0.7"/>`;
      s += `<circle cx="${x + 27}" cy="78" r="4.5" fill="currentColor"/>`;
      s += `<line x1="${x + 23}" y1="80" x2="${x + 10}" y2="90" stroke="currentColor" stroke-width="1.6"/>`;
      s += `<path d="M${x + 35},84 L${x + 20},104 L${x + 14},124 M${x + 38},85 L${x + 34},108 L${x + 30},128 M${x + 41},84 L${x + 50},106 L${x + 58},126" ${S}/>`;
      // R-B NIT: the far-side legs, so Z has 6 legs (3 per side) like the insects she is drilled on
      s += `<path d="M${x + 33},83 L${x + 25},100 L${x + 22},120 M${x + 40},84 L${x + 43},105 L${x + 44},126 M${x + 43},83 L${x + 60},101 L${x + 72},118" stroke="currentColor" stroke-width="1.4" stroke-opacity="0.55" fill="none"/>`;
      return s;
    }], 'Four drawings in a row with arrows: W, tiny eggs floating on water; X, a wriggly young animal hanging from the water surface; Y, an empty box with a question mark; Z, a flying insect with six long thin legs and two wings');

  // Tomato plant: E seed, F missing, G adult plant with flowers, H fruit cut open with seeds.
  const x17Tomato = x17Strip([{ L: 'E' }, { L: 'F', blank: true }, { L: 'G' }, { L: 'H' }], [
    (x) => `<line x1="${x + 6}" y1="112" x2="${x + 78}" y2="112" stroke="currentColor" stroke-width="2"/><ellipse cx="${x + 42}" cy="100" rx="15" ry="9" fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-width="2"/><ellipse cx="${x + 42}" cy="95" rx="4" ry="2" fill="currentColor"/>`,
    null,
    (x) => {
      const c = x + 42, S = 'stroke="currentColor" stroke-width="1.6"';
      const lf = (lx, ly, dir) => `<ellipse cx="${lx + dir * 11}" cy="${ly}" rx="11" ry="4.5" transform="rotate(${-dir * 25} ${lx} ${ly})" fill="currentColor" fill-opacity="0.3" ${S}/>`;
      const fl = (fx, fy) => [0, 72, 144, 216, 288].map((a) => `<circle cx="${(fx + 5 * Math.cos(a * Math.PI / 180)).toFixed(1)}" cy="${(fy + 5 * Math.sin(a * Math.PI / 180)).toFixed(1)}" r="3.6" fill="none" ${S}/>`).join('') + `<circle cx="${fx}" cy="${fy}" r="2" fill="currentColor"/>`;
      let s = `<line x1="${x + 6}" y1="122" x2="${x + 78}" y2="122" stroke="currentColor" stroke-width="2"/>`;
      s += `<path d="M${c},122 L${c - 2},136 M${c},122 L${c - 10},134 M${c},122 L${c + 9},136" fill="none" stroke="currentColor" stroke-width="1.4"/>`;
      s += `<line x1="${c}" y1="122" x2="${c}" y2="40" stroke="currentColor" stroke-width="2.5"/>`;
      s += lf(c, 108, -1) + lf(c, 98, 1) + lf(c, 84, -1) + lf(c, 72, 1);
      s += `<line x1="${c}" y1="58" x2="${c + 16}" y2="48" ${S}/>`;
      return s + fl(c, 36) + fl(c + 19, 45);
    },
    (x) => {
      const c = x + 42;
      // a round fruit cut across: skin, flesh ring, seeds in the middle, leafy cap and stalk on top
      let s = `<circle cx="${c}" cy="84" r="27" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="2.2"/>`;
      s += `<circle cx="${c}" cy="84" r="17" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="3 2"/>`;
      [0, 60, 120, 180, 240, 300].forEach((a) => { const r = a * Math.PI / 180; s += `<ellipse cx="${(c + 10 * Math.cos(r)).toFixed(1)}" cy="${(84 + 10 * Math.sin(r)).toFixed(1)}" rx="2.2" ry="3.4" transform="rotate(${a + 90} ${(c + 10 * Math.cos(r)).toFixed(1)} ${(84 + 10 * Math.sin(r)).toFixed(1)})" fill="currentColor"/>`; });
      s += `<path d="M${c - 14},55 Q${c - 6},60 ${c},57 Q${c + 6},60 ${c + 14},55 Q${c + 6},52 ${c},53 Q${c - 6},52 ${c - 14},55 Z" fill="currentColor" fill-opacity="0.5"/>`;
      s += `<line x1="${c}" y1="54" x2="${c + 2}" y2="42" stroke="currentColor" stroke-width="2.5"/>`;
      s += `<text x="${c}" y="132" text-anchor="middle" font-size="13" fill="currentColor">cut fruit</text>`;
      return s;
    }], 'Four drawings in a row with arrows: E, a seed in the soil; F, an empty box with a question mark; G, a tall plant with many leaves and flowers; H, a round fruit cut in half with seeds inside');

  // Mealworm beetle stages, unnamed and in a mixed-up order: W adult, X larva, Y pupa, Z eggs.
  const x17Meal = (() => {
    const S = 'stroke="currentColor" stroke-width="2"';
    let out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 260" width="100%" data-maxw="560" style="max-width:360px" role="img" aria-label="Four unlabelled drawings: W, a beetle with six legs, feelers and a hard body; X, a long thin worm-like body made of segments, with tiny legs near the head; Y, a pale body with folded legs lying still on its side on the ground; Z, a few tiny oval eggs on the ground" ${FONT}>`;
    [[4, 4, 'W'], [182, 4, 'X'], [4, 132, 'Y'], [182, 132, 'Z']].forEach(([x, y, L]) => {
      out += `<rect x="${x}" y="${y}" width="174" height="124" rx="10" fill="none" stroke="currentColor" stroke-width="1.5"/>`;
      out += `<text x="${x + 12}" y="${y + 24}" font-size="20" font-weight="700" fill="currentColor">${L}</text>`;
    });
    // W: adult beetle (top view)
    out += `<path d="M77,58 L58,46 M76,74 L54,76 M78,88 L60,104 M105,58 L124,46 M106,74 L128,76 M104,88 L122,104" fill="none" ${S}/>`;
    out += `<ellipse cx="91" cy="76" rx="16" ry="30" fill="currentColor" fill-opacity="0.55" ${S}/>`;
    out += `<line x1="91" y1="52" x2="91" y2="105" stroke="#fff" stroke-width="1.5"/>`;
    out += `<circle cx="91" cy="40" r="8" fill="currentColor"/>`;
    out += `<path d="M87,34 L78,18 M95,34 L104,18" fill="none" ${S}/>`;
    // X: larva (mealworm), segmented, tiny legs near the head on the right
    out += `<line x1="196" y1="96" x2="346" y2="96" stroke="currentColor" stroke-width="2.5"/>`;
    for (let i = 0; i < 10; i++) out += `<circle cx="${212 + i * 12}" cy="76" r="8" fill="currentColor" fill-opacity="0.28" stroke="currentColor" stroke-width="1.4"/>`;
    out += `<circle cx="336" cy="75" r="7" fill="currentColor" fill-opacity="0.6" stroke="currentColor" stroke-width="1.4"/>`;
    [306, 314, 322].forEach((lx) => { out += `<line x1="${lx}" y1="83" x2="${lx + 2}" y2="93" stroke="currentColor" stroke-width="1.6"/>`; });
    // Y: pupa lying on the ground, curled, with folded leg and wing pads
    out += `<line x1="18" y1="238" x2="168" y2="238" stroke="currentColor" stroke-width="2.5"/>`;
    // body lying on its side: tapering, segmented tail end on the left, head end on the right with folded legs and wing pads
    out += `<path d="M30,214 C34,204 52,198 80,196 C110,194 138,196 146,208 C150,218 140,232 112,234 C84,236 54,232 38,224 C32,221 28,218 30,214 Z" fill="currentColor" fill-opacity="0.15" ${S}/>`;
    [46, 58, 70, 82].forEach((sx) => { out += `<path d="M${sx},${199 - (sx - 46) / 12} Q${sx + 5},215 ${sx},${231 + (sx - 46) / 12}" fill="none" stroke="currentColor" stroke-width="1.2"/>`; });
    out += `<path d="M30,214 L20,208 M30,214 L20,220" fill="none" stroke="currentColor" stroke-width="1.4"/>`;
    out += `<ellipse cx="112" cy="214" rx="17" ry="10" fill="none" stroke="currentColor" stroke-width="1.3"/>`;
    out += `<path d="M126,222 L120,230 M134,220 L130,230 M140,214 L144,224" fill="none" stroke="currentColor" stroke-width="1.3"/>`;
    // Z: eggs
    out += `<line x1="196" y1="222" x2="346" y2="222" stroke="currentColor" stroke-width="2.5"/>`;
    [[246, 212], [260, 214], [274, 211], [253, 202], [267, 203]].forEach(([ex, ey]) => { out += `<ellipse cx="${ex}" cy="${ey}" rx="6" ry="4" fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-width="1.5"/>`; });
    return out + '</svg>';
  })();

  const x17Days = tbl(['Insect', 'Egg', 'Larva', 'Pupa'], [['Beetle A', '7', '30', '12'], ['Moth B', '5', '21', '18']], 'Number of days each insect spent in each stage');

  SCI.registerTopic({
    id: 'life-cycles',
    title: 'Life Cycles',
    emoji: '🦋',
    theme: 'Cycles',
    moeRef: 'Cycles in Plants and Animals: show an understanding that different living things have different life cycles; observe and compare the life cycles of plants grown from seeds and of animals over a period of time (para)',
    notes: [
      { title: 'What is a life cycle?',
        body: 'A life cycle is the stages a living thing goes through from the start of its life (an egg or a seed) until it becomes an adult that can reproduce. The adult lays eggs or makes seeds, so the cycle starts again. This makes sure its kind does not die out. Different living things have different life cycles, with different numbers of stages.' },
      { title: '4-stage life cycles',
        body: 'Egg → larva → pupa → adult. Butterfly, moth, mosquito, beetle and housefly have 4 stages. The young (larva) does NOT look like the adult. The larva feeds the most and grows the fastest. The pupa does NOT feed; inside it, the body changes into the adult.' },
      { title: 'The butterfly',
        body: 'Egg: laid on (usually the underside of) leaves the caterpillar can eat. Larva (caterpillar): eats a lot, grows, and sheds its skin (moults) several times so it can grow bigger. Pupa (chrysalis): does not feed and hardly moves — it is alive and changing into a butterfly. Adult: has wings, sucks nectar from flowers, mates and lays eggs.' },
      { title: 'The mosquito',
        body: 'Egg → larva → pupa → adult (4 stages). Eggs are laid on the surface of still (stagnant) water. The larva and pupa live in water and come to the surface to take in air. The larva feeds; the pupa does NOT feed. Only the adult can fly and lives on land. Ways to break the life cycle: remove stagnant water (no place for eggs, larvae and pupae); put a thin layer of oil on the water (the larva\'s breathing tube cannot reach the air, so it dies); release special male mosquitoes whose eggs do not hatch (no larvae, so no new adults). Fewer mosquitoes means less dengue.' },
      { title: '3-stage life cycles',
        body: 'Egg → nymph → adult. Cockroach and grasshopper have 3 stages and NO pupa stage. The nymph looks like the adult but is smaller and has no wings. It moults (sheds its skin) several times as it grows. The chicken also has 3 stages: egg → chick → adult chicken. The young of the cockroach, grasshopper and chicken looks like the adult.' },
      { title: 'The frog',
        body: 'Egg → tadpole → adult frog: 3 stages. Eggs are laid in water in a jelly. A tadpole lives only in water and has a tail and no legs at first. As it grows, back legs grow first, then front legs, and the tail gets shorter. A tadpole that has grown legs is sometimes called a froglet or young frog, and some books draw it as a 4th stage: follow your book. The adult frog has no tail and can live on land and in water. The tadpole does not look like the adult.' },
      { title: 'The life cycle of a flowering plant',
        body: 'Seed → young plant → adult plant. Some books add a seedling stage (a very young plant) after the seed. Once the young plant has green leaves, it can make its own food. The adult plant bears flowers, which develop into fruits with seeds inside. A farmer who keeps some seeds to plant again gets a continuous supply: the seeds grow into adult plants that make new seeds. When a seed germinates (starts to grow), the seed coat splits, the root grows out first and grows downwards, then the shoot grows upwards. The seed leaves hold stored food for the seedling; they shrivel and drop off when the food is used up.' },
      { title: 'Germination and fair tests',
        body: 'A seed needs water, air and warmth (a suitable temperature) to germinate. It does NOT need light or soil to germinate — seeds on wet cotton wool in a dark cupboard still germinate. In a fair test, change only ONE thing (the variable you are testing) and keep everything else the same. Use many seeds (e.g. 10) in each set-up so the result is reliable, because some seeds may not germinate anyway.' },
      { title: 'How to compare two life cycles',
        body: 'Ask: (1) How many stages? (2) Is there a pupa stage? (3) Does the young look like the adult? (4) Which stage does not feed / feeds the most? (5) Where does each stage live (water or land)? A similarity: both start as eggs / both have an adult stage. A difference: e.g. a butterfly has a pupa stage but a cockroach does not.' },
      { title: 'Reading life-cycle charts and graphs',
        body: '"Days AFTER HATCHING" starts when the young comes out of the egg, so do NOT count the egg days. "Days after the egg was laid" counts the egg days too. On a graph of food eaten or body mass: the larva eats the most, so its mass rises fastest; the pupa does not feed, so it eats nothing and its mass stays about the same. Eating nothing does not mean dead: the pupa is alive and changing into the adult. Laying many eggs helps: many eggs and young are eaten or destroyed, but enough survive to become adults and reproduce.' }
    ],
    items: [
      // ---------- MCQ ----------
      { id: 'lc-001', type: 'mcq', level: 2,
        stem: 'The drawings show four stages in the life cycle of a butterfly, in a mixed-up order. Starting from the egg, which is the correct order?',
        figure: butterflyPics,
        options: ['Q → R → S → P', 'S → Q → R → P', 'Q → S → R → P', 'Q → S → P → R'],
        answer: 2,
        technique: 'Count, then check',
        steps: [
          'Name each drawing: egg, larva, pupa or adult (or seed, young plant, adult plant).',
          'Count the stages, and look for a pupa.',
          'Start at the egg or the seed.',
          'Put the rest in order, then check each step: does this stage really come out of the one before?'],
        optionFeedback: {
          0: 'Q, the eggs, is the right start! But the caterpillar (S) hatches from the egg, so it comes before the pupa (R).',
          1: 'S is the caterpillar, and a caterpillar hatches from an egg. So the egg (Q) must come first.',
          3: 'The adult butterfly comes out of the pupa, so the pupa (R) comes before the adult (P), not after.' },
        explain: 'Q is the eggs on a leaf. A caterpillar (S) hatches and eats a lot. It then becomes a pupa (R), a case hanging from a twig. The adult butterfly (P) comes out of the pupa.' },
      { id: 'lc-002', type: 'mcq', level: 2,
        stem: 'The diagram shows the life cycle of a mosquito. Which correctly describes stages P and Q?',
        figure: cycle(['Egg', 'P', 'Q', 'Adult']),
        options: ['P is the larva and does not feed; Q is the pupa and feeds', 'P is the pupa and lives on land; Q is the larva and lives in water', 'P is the larva and feeds; Q is the pupa and does not feed', 'P is the nymph and feeds; Q is the pupa and lives on land'],
        answer: 2,
        technique: 'Count, then check',
        steps: [
          'Count the stages in the cycle. Is there a pupa?',
          'Name each lettered stage from where it sits.',
          'Recall what that stage does: does it feed? Where does it live?',
          'Check every part of the option, not just the first half.'],
        optionFeedback: {
          0: 'P and Q are in the right places! But the feeding is swapped: the larva feeds and the pupa does not.',
          1: 'After the egg comes the larva, not the pupa. And a mosquito larva and pupa both live in water, not on land.',
          3: 'A nymph is the young of a cockroach or grasshopper. A mosquito\'s young is a larva.' },
        explain: 'Mosquito: egg → larva (P) → pupa (Q) → adult. The larva feeds; the pupa does not. Both live in water and come to the surface to take in air. A nymph is the young of a cockroach or grasshopper, not a mosquito.' },
      { id: 'lc-003', type: 'mcq', level: 1,
        stem: 'What is the young of a cockroach called?',
        figure: null,
        options: ['Larva', 'Pupa', 'Nymph', 'Tadpole'],
        answer: 2,
        optionFeedback: {
          0: 'Larva is a good science word! It is the young of insects with 4 stages, like the butterfly. A cockroach has no pupa, and its young is a nymph.',
          3: 'A tadpole is the young of a frog, not an insect.' },
        explain: 'The cockroach has a 3-stage life cycle: egg → nymph → adult. The nymph looks like the adult but is smaller and has no wings.' },
      { id: 'lc-004', type: 'mcq', level: 1,
        stem: 'Which stage of a butterfly feeds the most?',
        figure: null,
        options: ['Egg', 'Larva (caterpillar)', 'Pupa', 'Adult'],
        answer: 1,
        optionFeedback: {
          2: 'The pupa does not feed at all. It uses the food the caterpillar stored up.',
          3: 'The adult butterfly does feed on nectar, so this is a fair guess! But the caterpillar eats much more, and grows very fast.' },
        explain: 'The caterpillar eats leaves all the time and grows very fast. The egg and the pupa do not feed at all.' },
      { id: 'lc-005', type: 'mcq', level: 2,
        stem: 'The drawings show four stages in the life cycle of a butterfly, in a mixed-up order. Stage R hung from the twig without moving for 10 days. Which statement about stage R is correct?',
        figure: butterflyPics,
        options: ['It is dead and its body will not change any more', 'It feeds on the leaves of the twig at night', 'It will soon hatch into a small caterpillar', 'It does not feed but is changing into an adult'],
        answer: 3,
        technique: 'Count, then check',
        steps: [
          'Name the stage. A stage that stays still and does not feed is the pupa.',
          'Remember: still and not feeding does NOT mean dead.',
          'Recall: the pupa is alive and changing into the adult.',
          'Check each option against what a pupa does.'],
        optionFeedback: {
          0: 'It does look lifeless, so this is a fair guess! But a pupa is alive: inside the case, its body is changing into a butterfly.',
          1: 'A pupa does not feed at all, by day or by night.',
          2: 'A caterpillar hatches from an egg. What comes out of a pupa is the adult butterfly.' },
        explain: 'R is the pupa (chrysalis). It does not feed and does not move from place to place, but it is alive: inside the case its body is changing into a butterfly. The caterpillar hatches from the egg, not from the pupa.' },
      { id: 'lc-006', type: 'mcq', level: 2,
        stem: 'Which describes how a tadpole changes as it grows into an adult frog?',
        figure: null,
        options: ['Its tail grows longer and its legs slowly disappear', 'Front legs grow, then wings, and the tail gets longer', 'It becomes a pupa and stops feeding for a few weeks', 'Back legs grow, then front legs, and the tail gets shorter'],
        answer: 3,
        optionFeedback: {
          0: 'That is the change backwards: the tail gets shorter and the legs grow.',
          2: 'A frog has no pupa stage. Pupa stages belong to insects like the butterfly.' },
        explain: 'A tadpole hatches with a tail and no legs. Back legs grow first, then front legs, while the tail gets shorter until the adult frog has no tail. A frog has no pupa stage.' },
      { id: 'lc-007', type: 'mcq', level: 1,
        stem: 'Which animal has a life cycle with only 3 stages?',
        figure: null,
        options: ['Butterfly', 'Mosquito', 'Beetle', 'Grasshopper'],
        answer: 3,
        optionFeedback: {
          0: 'A butterfly has a pupa stage, so it has 4 stages.',
          1: 'A mosquito has a pupa stage, so it has 4 stages.',
          2: 'A beetle has a pupa stage, so it has 4 stages.' },
        explain: 'Grasshopper: egg → nymph → adult (3 stages). Butterfly, mosquito and beetle all have 4 stages with a pupa.' },
      { id: 'lc-008', type: 'mcq', level: 2,
        stem: 'Kumar observed an animal. Its young did not look like the adult, and later it went through a stage in which it did not feed or move from place to place. Which animal could it be?',
        figure: null,
        options: ['Cockroach', 'Beetle', 'Grasshopper', 'Chicken'],
        answer: 1,
        technique: 'Count, then check',
        steps: [
          'Count the stages: 3 or 4?',
          'Look for the pupa. A pupa means 4 stages.',
          'Check the clue about the young: does it look like the adult?',
          'Pick the animal that matches every clue.'],
        optionFeedback: {
          0: 'A cockroach\'s young (a nymph) looks like the adult, and a cockroach has no pupa stage.',
          2: 'A grasshopper\'s young (a nymph) looks like the adult, and a grasshopper has no pupa stage.',
          3: 'A chick looks like a small chicken, and a chicken has no pupa stage.' },
        explain: 'The stage that does not feed or move from place to place is a pupa, and the young that does not look like the adult is a larva. Only the beetle (egg → larva → pupa → adult) has these. The cockroach, grasshopper and chicken have no pupa, and their young look like the adults.' },
      { id: 'lc-009', type: 'mcq', level: 1,
        stem: 'What is germination?',
        figure: null,
        options: ['When a seed starts to grow into a new plant', 'When a flower turns into a fruit', 'When a plant makes new seeds', 'When a seed is carried away from its parent plant'],
        answer: 0,
        optionFeedback: {
          1: 'A flower turning into a fruit happens later in the plant\'s life. Germination is the very start: a seed beginning to grow.' },
        explain: 'Germination is when a seed starts to grow. The seed coat splits and a root, then a shoot, grow out.' },
      { id: 'lc-010', type: 'mcq', level: 1,
        stem: 'When a seed germinates, which part grows out of the seed first?',
        figure: null,
        options: ['The shoot', 'The leaves', 'The root', 'The flower'],
        answer: 2,
        optionFeedback: {
          0: 'Lots of children pick the shoot, because it is the part we see first above the soil! But the root comes out first and grows downwards.' },
        explain: 'The root comes out first and grows downwards to hold the seedling in place and take in water. The shoot comes out after.' },
      { id: 'lc-011', type: 'mcq', level: 1,
        stem: 'Which of these does a seed need in order to germinate?',
        figure: null,
        options: ['Water, light and soil', 'Air, light and soil', 'Water, air and warmth', 'Water, soil and fertiliser'],
        answer: 2,
        optionFeedback: { 0: 'Light and soil are common guesses! But seeds germinate on wet cotton wool in the dark. They need water, air and warmth.', 1: 'Air is right! But light and soil are not needed: seeds germinate on wet cotton wool in the dark. They also need water and warmth.', 3: 'Seeds can germinate without soil or fertiliser, on wet cotton wool. They need water, air and warmth.' },
        explain: 'A seed needs water, air and warmth to germinate. It does not need light or soil — seeds can germinate on wet cotton wool in the dark.' },
      { id: 'lc-012', type: 'mcq', level: 2,
        stem: 'The diagram shows the life cycle of a butterfly. In which stage(s) does the butterfly feed?',
        figure: cycle(['Egg', 'A', 'B', 'Adult']),
        options: ['A only', 'B only', 'A and the adult only', 'B and the adult only'],
        answer: 2,
        technique: 'Count, then check',
        steps: [
          'Count the stages in the cycle. Is there a pupa?',
          'Name each lettered stage from where it sits.',
          'Recall what that stage does: does it feed? Where does it live?',
          'Check every part of the option, not just the first half.'],
        optionFeedback: {
          0: 'The caterpillar (A) feeds, well spotted! The adult butterfly feeds too: it sucks nectar from flowers.',
          1: 'B comes after the larva, so it is the pupa, and the pupa does not feed.',
          3: 'B is the pupa, which does not feed. The stage that eats leaves is A, the caterpillar.' },
        explain: 'A is the larva (caterpillar), which eats leaves. B is the pupa, which does not feed. The adult butterfly feeds too: it sucks nectar from flowers. The egg does not feed.' },
      { id: 'lc-013', type: 'mcq', level: 2,
        stem: 'The diagram shows the life cycle of a mealworm beetle. A mealworm is the young that hatches from the egg and eats a lot. Stage Y does not feed and does not move from place to place. What are stages X and Y?',
        figure: cycle(['Egg', 'X', 'Y', 'Adult beetle']),
        options: ['X is a nymph, Y is a pupa', 'X is a pupa, Y is a larva', 'X is a larva, Y is a nymph', 'X is a larva, Y is a pupa'],
        answer: 3,
        technique: 'Count, then check',
        steps: [
          'Count the stages in the cycle. Is there a pupa?',
          'Name each lettered stage from where it sits.',
          'Recall what that stage does: does it feed? Where does it live?',
          'Check every part of the option, not just the first half.'],
        optionFeedback: {
          0: 'A nymph is the young of a cockroach or grasshopper, which have no pupa. A beetle\'s young is a larva.',
          1: 'These are swapped: the larva hatches from the egg first, and later it becomes a pupa.',
          2: 'Y does not feed, so it is a pupa. A nymph feeds and grows.' },
        explain: 'A beetle has 4 stages: egg → larva → pupa → adult. The mealworm is the larva (X): it eats a lot and does not look like the adult. The pupa (Y) does not feed. A nymph is the young of a cockroach or grasshopper.' },
      { id: 'lc-014', type: 'mcq', level: 2,
        stem: 'The diagram shows the life cycle of a frog. Which statement about stage X is correct?',
        figure: cycle(['Egg', 'X', 'Adult frog']),
        options: ['It lives in water and has a tail', 'It has wings and lives on land', 'It does not feed and stays in a case', 'It looks like a small adult frog'],
        answer: 0,
        technique: 'Count, then check',
        steps: [
          'Count the stages in the cycle. Is there a pupa?',
          'Name each lettered stage from where it sits.',
          'Recall what that stage does: does it feed? Where does it live?',
          'Check every part of the option, not just the first half.'],
        optionFeedback: {
          1: 'Frogs never have wings. Wings belong to some adult insects and birds.',
          2: 'A stage that does not feed and stays in a case is a pupa, and a frog has no pupa stage.',
          3: 'A tadpole does not look like the adult frog: it has a tail and no legs at first.' },
        explain: 'X is the tadpole. It lives in water and has a tail; at first it has no legs, so it does not look like the adult frog. (A tadpole that has grown legs is sometimes called a froglet; some books draw it as a separate stage.)' },
      { id: 'lc-015', type: 'mcq', level: 2,
        stem: 'Where does a mosquito usually lay its eggs?',
        figure: null,
        options: ['On the underside of leaves', 'In dry soil', 'Inside fruits', 'On the surface of still (stagnant) water'],
        answer: 3,
        optionFeedback: {
          0: 'Butterflies lay their eggs under leaves. Mosquitoes need still water for their young.',
          1: 'Mosquito young live in water, so the eggs are laid on still water, not dry soil.' },
        explain: 'Mosquitoes lay eggs on still water. The larva and pupa that hatch live in the water.' },
      { id: 'lc-016', type: 'mcq', level: 2,
        stem: 'We are told to turn over pails and empty water from flower-pot plates. How does this help to reduce the number of mosquitoes?',
        figure: null,
        options: ['The larva and pupa live in water, so the life cycle is broken', 'Adult mosquitoes need the water to drink, so they will die of thirst', 'Mosquito eggs can only hatch on dry ground, so the eggs will dry up', 'The water helps the wings of young mosquitoes to grow'],
        answer: 0,
        technique: 'Claim, evidence, reason',
        steps: [
          'Name the stages that need the water.',
          'Ask: what happens to them if the water is gone or blocked?',
          'So they cannot become adults: the life cycle is broken.',
          'End with the result: fewer adult mosquitoes.'],
        optionFeedback: {
          1: 'It is not about thirst. Emptying the water takes away the place where the eggs, larvae and pupae live.',
          2: 'Mosquito eggs are laid on water, not on dry ground. Without water, there is nowhere for the young to live.',
          3: 'Wings belong to the adult mosquito, and water does not make them grow. The water is where the young live.' },
        explain: 'The egg, larva and pupa of the mosquito all need water. No stagnant water means the life cycle is broken and fewer adults are produced.' },
      { id: 'lc-017', type: 'mcq', level: 2,
        stem: 'Which statement about a cockroach nymph is correct?',
        figure: null,
        options: ['It looks like the adult but has no wings', 'It does not feed until it becomes an adult', 'It will turn into a pupa before it becomes an adult', 'It lives in water and breathes at the surface'],
        answer: 0,
        optionFeedback: {
          1: 'A nymph eats and grows, so it does feed.',
          2: 'A cockroach has no pupa stage. The nymph grows straight into an adult.',
          3: 'That describes a mosquito larva. A cockroach nymph lives on land.' },
        explain: 'A nymph looks like a small adult without wings. It feeds, moults as it grows, and becomes an adult directly — there is no pupa stage.' },
      { id: 'lc-018', type: 'mcq', level: 2,
        stem: 'In which pair do BOTH animals have young that look like their adults?',
        figure: null,
        options: ['Butterfly and frog', 'Mosquito and grasshopper', 'Chicken and cockroach', 'Beetle and chicken'],
        answer: 2,
        technique: 'Count, then check',
        steps: [
          'Take the first animal: does its young look like its adult?',
          'Take the second animal and ask the same thing.',
          'Remember: a larva or a tadpole does not look like its adult.',
          'Pick the pair where BOTH answers are yes.'],
        optionFeedback: {
          0: 'A caterpillar and a tadpole both look very different from their adults.',
          1: 'The grasshopper fits! But a mosquito larva does not look like the adult mosquito.',
          3: 'The chicken fits! But a beetle larva, like a mealworm, does not look like the adult beetle.' },
        explain: 'A chick looks like a small chicken, and a cockroach nymph looks like a small cockroach without wings. Butterfly, frog, mosquito and beetle young look very different from their adults.' },
      { id: 'lc-019', type: 'mcq', level: 2,
        stem: 'What is one similarity between the life cycle of a butterfly and the life cycle of a mosquito?',
        figure: null,
        options: ['Both have a pupa stage', 'Both lay their eggs in water', 'Both larvae live on land', 'Both have 3 stages'],
        answer: 0,
        technique: 'Count, then check',
        steps: ['Count the stages in each life cycle.', 'Look for the pupa: which animal has it?', 'A similarity is something both have. A difference is something only one has.', 'Write about BOTH animals. Similarity: "Both A and B have ...". Difference: "A has ..., but B does not."'],
        optionFeedback: {
          1: 'Only the mosquito lays eggs in water. A butterfly lays them on leaves.',
          2: 'A mosquito larva lives in water, so this is not true for both.',
          3: 'Both have 4 stages, with a pupa, so they do not have 3.' },
        explain: 'Both have 4 stages: egg, larva, pupa and adult. Only the mosquito lays eggs in water and has larvae that live in water.' },
      { id: 'lc-020', type: 'mcq', level: 2,
        stem: 'What is one difference between the life cycle of a grasshopper and the life cycle of a beetle?',
        figure: null,
        options: ['The grasshopper does not lay eggs', 'The beetle has a nymph stage', 'The grasshopper has no pupa stage', 'The young grasshopper does not look like its adult'],
        answer: 2,
        technique: 'Count, then check',
        steps: [
          'Count the stages in each life cycle.',
          'Look for the pupa: which animal has it?',
          'A similarity is something both have. A difference is something only one has.',
          'Write about BOTH animals: "A has ..., but B ...".'],
        optionFeedback: {
          0: 'A grasshopper does lay eggs. Its life cycle starts with an egg too.',
          1: 'A beetle\'s young is a larva, not a nymph.',
          3: 'A young grasshopper (a nymph) does look like the adult, just smaller and with no wings.' },
        explain: 'Grasshopper: egg → nymph → adult (no pupa). Beetle: egg → larva → pupa → adult. Both lay eggs.' },
      { id: 'lc-021', type: 'mcq', level: 2,
        stem: 'The table shows the number of days animal X spent in each stage of its life cycle. In which stage did it spend the longest time?',
        figure: daysTable,
        options: ['Egg', 'Larva', 'Pupa', 'Adult'],
        answer: 1,
        technique: 'Read, compare, conclude',
        steps: [
          'Read the number for every stage.',
          'Compare them to find the biggest or the smallest.',
          'Answer with the stage name, not the number.',
          'Check that I read the right row or bar.'],
        optionFeedback: {
          2: 'The pupa is 9 days. Compare it with the others: the larva has 18, which is more.',
          3: 'The adult is 14 days, quite a long time! But the larva has 18, which is more.' },
        explain: 'Compare the numbers: egg 4, larva 18, pupa 9, adult 14. The largest is 18 days, the larva stage.' },
      { id: 'lc-022', type: 'mcq', level: 2,
        stem: 'The table shows the number of days animal X spent in each stage of its life cycle. How many days after the egg was laid did the adult of animal X come out?',
        figure: daysTable,
        options: ['22 days', '27 days', '31 days', '45 days'],
        answer: 2,
        technique: 'Read, compare, conclude',
        steps: [
          'Ask: when does the counting start? "After hatching" skips the egg; "after the egg was laid" counts it.',
          'Ask: when does it stop? The adult comes out when the pupa stage ends.',
          'Add only the stages in between.',
          'Check: did I add a stage before the start or after the end?'],
        optionFeedback: {
          0: '4 + 18 = 22 adds the egg and the larva. The pupa stage still has to finish before the adult comes out, so add its 9 days too.',
          1: '18 + 9 = 27 counts from hatching. This question counts from the day the egg was laid, so add the 4 egg days too.',
          3: '45 adds the 14 adult days as well. The adult has already come out at the start of those days, so leave them out.' },
        explain: 'The adult comes out after the egg, larva and pupa stages: 4 + 18 + 9 = 31 days. Leave out the 14 days of the adult stage, because the adult has already come out by then.' },
      { id: 'lc-023', type: 'mcq', level: 2,
        stem: 'A caterpillar sheds its skin several times. Why?',
        figure: null,
        options: ['So that it can grow bigger', 'So that it can turn into an adult at once', 'To keep itself warm', 'Because it is sick'],
        answer: 0,
        optionFeedback: {
          1: 'Moulting does not turn it into an adult at once. It still has to become a pupa first.',
          3: 'Moulting is normal, healthy growing. Its old skin cannot stretch, so it sheds it to grow bigger.' },
        explain: 'The caterpillar\'s skin does not grow with it, so it sheds (moults) the old skin to grow bigger. Nymphs of cockroaches and grasshoppers moult too.' },
      { id: 'lc-024', type: 'mcq', level: 2,
        stem: 'The boxes show four stages of a plant\'s life cycle, mixed up. Starting from the seed, which is the correct order?',
        figure: tbl(['P', 'Q', 'R', 'S'], [['Young plant', 'Seed', 'Adult plant with flowers and fruits', 'Seedling']]),
        options: ['Q → P → S → R', 'Q → S → P → R', 'S → Q → P → R', 'R → Q → S → P'],
        answer: 1,
        technique: 'Count, then check',
        steps: ['Read each box: seed, seedling, young plant or adult plant.', 'Find the start: the seed.', 'Put the rest in order, from youngest to the adult with flowers and fruits.', 'Check each step: does this stage really grow out of the one before?'],
        optionFeedback: {
          0: 'The seed (Q) is the right start! But a seedling (S) is younger than a young plant (P), so S comes next.',
          2: 'A seedling grows out of a seed, so the seed (Q) must come first.',
          3: 'This goes round the cycle in the right direction, well done! But the question asks you to start from the seed, so Q comes first.' },
        explain: 'Seed (Q) → seedling (S) → young plant (P) → adult plant with flowers and fruits (R). The fruits hold seeds, so the cycle starts again.' },
      { id: 'lc-025', type: 'mcq', level: 2,
        stem: 'Which describes a tadpole that has just hatched?',
        figure: null,
        options: ['It has four legs and no tail', 'It has two legs and lives on land', 'It has wings', 'It has a tail and no legs'],
        answer: 3,
        optionFeedback: {
          0: 'Four legs and no tail describes the adult frog. A tadpole starts with a tail and no legs.',
          1: 'A new tadpole lives only in water, and its legs grow later.' },
        explain: 'A newly hatched tadpole lives in water and has a tail but no legs. Legs grow later, back legs first.' },
      { id: 'lc-026', type: 'mcq', level: 1,
        stem: 'Which of these is NOT a stage in the life cycle of a frog?',
        figure: null,
        options: ['Egg', 'Tadpole', 'Pupa', 'Adult'],
        answer: 2,
        optionFeedback: {
          0: 'The egg really is a stage of the frog. This asks for the one that is NOT.',
          1: 'The tadpole really is a stage of the frog. This asks for the one that is NOT.',
          3: 'The adult really is a stage of the frog. This asks for the one that is NOT.' },
        explain: 'Frog: egg → tadpole → (froglet) → adult. A pupa stage is found in insects like the butterfly and mosquito, not in frogs.' },
      { id: 'lc-027', type: 'mcq', level: 3,
        stem: 'Green bean seeds were given the conditions in the table. In which set-up(s) would the seeds germinate?',
        figure: germTable4,
        options: ['A only', 'A and D only', 'A, B and D only', 'A, B, C and D'],
        answer: 1,
        technique: 'Tick or cross',
        steps: [
          'List what a seed needs: water, air and warmth.',
          'Check one set-up at a time: does it have all three?',
          'Tick or cross each set-up. Light and soil do not count.',
          'Pick the option with exactly your ticks.'],
        optionFeedback: {
          0: 'A germinates, yes! But D is only missing light, and seeds do not need light to germinate.',
          2: 'A and D are right! But B has no water, and seeds need water to germinate.',
          3: 'A and D are right! But B has no water and C is too cold, and seeds need water and warmth.' },
        explain: 'Seeds need water, air and warmth. A and D have all three. Light is not needed, so D (dark) still germinates. B has no water and C is too cold.' },
      { id: 'lc-028', type: 'mcq', level: 3,
        stem: 'Ali wants to find out if seeds need water to germinate. Which TWO set-ups should he compare?',
        figure: fairPick,
        options: ['P and R', 'P and Q', 'Q and S', 'R and S'],
        answer: 1,
        technique: 'Change one thing',
        steps: [
          'Read what is being tested.',
          'For each pair, list every way the two set-ups are different.',
          'Keep the pair that differs ONLY in the thing being tested.',
          'Check: everything else must be the same.'],
        optionFeedback: {
          0: 'P and R differ in water, but also in temperature and light: three changes at once.',
          2: 'Q and S differ in water, but also in temperature: two changes at once.',
          3: 'R and S differ in water, but also in light: two changes at once.' },
        explain: 'P and Q differ ONLY in water (wet vs dry); temperature and light are the same. That is a fair test. Q and S also differ in temperature; R and S also differ in light.' },
      { id: 'lc-029', type: 'mcq', level: 2,
        stem: 'Mei put 10 seeds in each dish instead of only 1 seed. Why?',
        figure: null,
        options: ['So that the seeds will germinate faster', 'So that the result is more reliable', 'So that the plants will grow taller', 'So that less water is needed'],
        answer: 1,
        optionFeedback: {
          0: 'More seeds do not make each seed grow faster. Many seeds help in case one seed is dead or damaged.' },
        explain: 'One seed might be damaged or dead and not germinate for a reason that has nothing to do with the test. Using many seeds makes the result more reliable.' },
      { id: 'lc-030', type: 'mcq', level: 2,
        stem: 'The larva and the pupa of a mosquito both live in water. Which statement shows a difference between them?',
        figure: null,
        options: ['The larva feeds but the pupa does not', 'The pupa feeds but the larva does not', 'The larva lives on land but the pupa lives in water', 'The pupa has wings but the larva does not'],
        answer: 0,
        optionFeedback: {
          1: 'This is swapped: the larva feeds and the pupa does not.',
          2: 'The larva and the pupa of a mosquito both live in water.',
          3: 'Neither has wings. Only the adult mosquito has wings.' },
        explain: 'The larva feeds and grows; the pupa does not feed while its body changes into the adult. Both live in water and take in air at the surface. Only the adult has wings.' },
      { id: 'lc-031', type: 'mcq', level: 3,
        stem: 'The diagram shows the life cycle of an animal. Stage Y looks like the adult but is smaller and has no wings. Which animal could it be?',
        figure: cycle(['Egg', 'Y', 'Adult']),
        options: ['Butterfly', 'Frog', 'Cockroach', 'Mosquito'],
        answer: 2,
        technique: 'Count, then check',
        steps: [
          'Count the stages: 3 or 4?',
          'Look for the pupa. A pupa means 4 stages.',
          'Check the clue about the young: does it look like the adult?',
          'Pick the animal that matches every clue.'],
        optionFeedback: {
          0: 'A butterfly has 4 stages, and its young (a caterpillar) does not look like the adult.',
          1: 'A frog has 3 stages too, good counting! But a tadpole does not look like the adult, and frogs never have wings.',
          3: 'A mosquito has 4 stages, and its young (a larva) does not look like the adult.' },
        explain: 'A 3-stage life cycle with a young that looks like the adult but has no wings: egg → nymph → adult. That is the cockroach.' },
      { id: 'lc-032', type: 'mcq', level: 3,
        stem: 'A few days after a seed germinates, its seed leaves become smaller, shrivel and drop off. Why?',
        figure: null,
        options: ['The seedling has used up the food stored in the seed leaves', 'The seedling did not get enough light', 'Insects have eaten the seed leaves', 'The seed leaves have turned into roots'],
        answer: 0,
        optionFeedback: {
          1: 'Seed leaves shrivel even in good light, because the food stored in them gets used up.',
          3: 'The roots grow from the seed and go down into the soil. The seed leaves do not turn into roots.' },
        explain: 'The seed leaves store food for the young seedling. As the seedling grows, it uses up this food, so the seed leaves shrivel and fall off.' },
      { id: 'lc-033', type: 'mcq', level: 2,
        stem: 'Which statement about life cycles is correct?',
        figure: null,
        options: ['All animals have 4 stages in their life cycle', 'All young animals look like their parents', 'Plants do not have life cycles', 'Different animals can have different numbers of stages'],
        answer: 3,
        optionFeedback: {
          0: 'A butterfly has 4 stages, but a cockroach has only 3.',
          1: 'A caterpillar does not look like a butterfly, and a tadpole does not look like a frog.',
          2: 'Plants have life cycles too: seed, young plant, adult plant.' },
        explain: 'A butterfly has 4 stages but a cockroach has 3. Plants have life cycles too: seed → seedling → young plant → adult plant.' },

      // ---------- OEQ ----------
      { id: 'lc-040', type: 'oeq', level: 1, marks: 2,
        stem: 'Starting from the egg, name the four stages in the life cycle of a butterfly, in the correct order.',
        figure: null,
        model: 'Egg → larva (caterpillar) → pupa (chrysalis) → adult butterfly.',
        keys: [['larva', 'caterpillar'], ['pupa', 'chrysalis']],
        explain: 'Markers look for larva/caterpillar and pupa in the middle, in the right order between egg and adult.' },
      { id: 'lc-041', type: 'oeq', level: 1, marks: 1,
        stem: 'What is the young of a grasshopper called?',
        figure: null,
        model: 'A nymph.',
        keys: [['nymph']],
        explain: 'Grasshoppers and cockroaches have 3 stages: egg, nymph, adult. Their young is called a nymph. The word larva is for the young of 4-stage insects like the butterfly.' },
      { id: 'lc-042', type: 'oeq', level: 1, marks: 3,
        stem: 'State the three conditions a seed needs in order to germinate.',
        figure: null,
        model: 'Water, air and warmth (a suitable temperature).',
        keys: [['water'], ['air', 'oxygen'], ['warmth', 'warm', 'suitable temperature']],
        explain: 'Water, air and warmth. Light and soil are not needed for germination. Lots of children add them, so watch out for them.' },
      { id: 'lc-043', type: 'oeq', level: 1, marks: 1,
        stem: 'In the life cycle of a plant, which stage comes right after the seed?',
        figure: null,
        model: 'The seedling (young plant).',
        keys: [['seedling', 'young plant']],
        explain: 'Seed → young plant → adult plant. Some books call the very young plant a seedling; both answers are accepted.' },
      { id: 'lc-044', type: 'oeq', level: 2, marks: 2,
        stem: 'State two ways in which a newly hatched tadpole is different from an adult frog.',
        figure: null,
        model: 'A tadpole has a tail but an adult frog has no tail. A tadpole has no legs but an adult frog has four legs. (Also accepted: a tadpole lives only in water but an adult frog can live on land and in water.)',
        keys: [['tail'], ['legs', 'land']],
        technique: 'Count, then check',
        steps: [
          'Picture the young and the adult side by side.',
          'Check one feature at a time: tail, legs, wings, where it lives.',
          'Pick a feature that is different.',
          'Write about BOTH: "The young has ..., but the adult has ...".'],
        explain: 'Each difference must compare BOTH animals, e.g. "tadpole has a tail BUT the adult frog has no tail".' },
      { id: 'lc-045', type: 'oeq', level: 2, marks: 2,
        stem: 'People are told to remove stagnant water around their homes. Using the life cycle of the mosquito, explain how this helps.',
        figure: null,
        model: 'Mosquitoes lay their eggs in stagnant water, and the larvae and pupae live in water. Without stagnant water, mosquitoes cannot complete their life cycle, so there will be fewer adult mosquitoes.',
        keys: [['lay eggs', 'larva', 'larvae', 'pupa', 'pupae', 'breed'], ['cannot complete', 'life cycle', 'fewer mosquitoes', 'fewer adult']],
        technique: 'Claim, evidence, reason',
        steps: [
          'Name the stages that need the water.',
          'Ask: what happens to them if the water is gone or blocked?',
          'So they cannot become adults: the life cycle is broken.',
          'End with the result: fewer adult mosquitoes.'],
        explain: 'Point 1: which stages need water. Point 2: the life cycle is broken, so fewer mosquitoes.' },
      { id: 'lc-046', type: 'oeq', level: 2, marks: 3,
        stem: 'The table shows the life cycles of the cockroach and the butterfly.\n(a) State one similarity between the two life cycles. (1 mark)\n(b) State one difference between the two life cycles. (1 mark)\n(c) Which of the two animals has a young that looks like its adult? (1 mark)',
        figure: compareTable,
        model: '(a) Both start as eggs / both have an egg and an adult stage. (b) The butterfly has a pupa stage but the cockroach does not (the cockroach has 3 stages, the butterfly has 4). (c) The cockroach: its nymph looks like the adult but is smaller and has no wings.',
        keys: [['egg', 'both'], ['pupa', 'number of stages', '3 stages', '4 stages'], ['cockroach']],
        technique: 'Count, then check',
        steps: ['Count the stages in each life cycle.', 'Look for the pupa: which animal has it?', 'A similarity is something both have. A difference is something only one has.', 'Write about BOTH animals. Similarity: "Both A and B have ...". Difference: "A has ..., but B does not."'],
        explain: 'For a difference, mention both animals: "the butterfly has a pupa stage BUT the cockroach does not". The butterfly\'s young (caterpillar) does not look like the adult.' },
      { id: 'lc-047', type: 'oeq', level: 2, marks: 2,
        stem: 'The pupa of a butterfly does not eat. Explain how it can still stay alive and change into an adult.',
        figure: null,
        model: 'As a caterpillar (larva), it ate a lot of food. The pupa uses the food stored from the larva stage.',
        keys: [['caterpillar', 'larva'], ['food', 'ate', 'stored']],
        technique: 'Claim, evidence, reason',
        steps: [
          'Claim: answer the question in one short sentence.',
          'Evidence: point to what the picture, table or story shows.',
          'Reason: say the science idea that links them.',
          'Read it back: did I use the words from the question?'],
        explain: 'This is why the larva stage feeds the most — it stores food for the pupa stage.' },
      { id: 'lc-048', type: 'oeq', level: 1, marks: 1,
        stem: 'A cockroach nymph sheds its skin several times. Why does it do this?',
        figure: null,
        model: 'So that it can grow bigger.',
        keys: [['grow', 'bigger']],
        explain: 'Its outer covering cannot grow, so it sheds it to grow bigger. This is called moulting.' },
      { id: 'lc-049', type: 'oeq', level: 3, marks: 3,
        stem: 'Ali set up the experiment in the table, using 10 green bean seeds in each set-up. Seeds in A germinated; seeds in B did not. Ali concluded: "Seeds need light to germinate."\n(a) Explain why his conclusion is not correct. (2 marks)\n(b) How should Ali change set-up B so that he can find out if seeds need light to germinate? (1 mark)',
        figure: fridgeExp,
        model: '(a) It is not a fair test because two things were changed: light and temperature (the fridge is dark AND cold). The seeds in B did not germinate because it was too cold, as seeds need warmth to germinate. (b) Take B out of the fridge, cover it with a black box and put it on the same windowsill as A, so that only light is different.',
        keys: [['two', 'more than one', 'not a fair test', 'light and temperature'], ['cold', 'warmth'], ['black box', 'cover', 'same windowsill', 'same temperature']],
        technique: 'Can we be sure?',
        steps: [
          'Read the conclusion: what does it say caused the result?',
          'List EVERY way the set-ups are different.',
          'If more than one thing is different, we cannot be sure which one caused it.',
          'To fix it, change only the one thing being tested.'],
        explain: 'A fridge is both dark AND cold, so two things changed at once. Seeds do not need light to germinate; the seeds in B did not germinate because it was too cold. To test light, keep the temperature the same and change only the light.' },
      { id: 'lc-050', type: 'oeq', level: 3, marks: 2,
        stem: 'Mei did the experiment in the table to find out if seeds need water to germinate. (a) What did she change? (b) What did she measure?',
        figure: meiExp,
        model: '(a) Whether the cotton wool was wet or dry (the presence of water). (b) The number of seeds that germinated.',
        keys: [['water', 'wet', 'dry'], ['number of seeds', 'germinated']],
        technique: 'Change one thing',
        steps: [
          'Compare the set-ups row by row.',
          'The thing that is different is the one that was changed.',
          'The things that are the same in every set-up are kept the same.',
          'Name it fully, like "the amount of water", not just "water".'],
        explain: 'Change one thing (water). Measure the result (number of seeds that germinated).' },
      { id: 'lc-051', type: 'oeq', level: 2, marks: 2,
        stem: 'Mei did the experiment in the table to find out if seeds need water to germinate. Name two things she must keep the same in both dishes to make it a fair test.',
        figure: meiExp,
        model: 'Any two: the type of seed, the number of seeds, the amount of cotton wool, the size of the dish, the place / temperature.',
        keys: [['type of seed', 'kind of seed', 'number of seeds', 'size of seed'], ['cotton wool', 'dish', 'place', 'temperature', 'light']],
        technique: 'Change one thing',
        steps: [
          'Compare the set-ups row by row.',
          'The thing that is different is the one that was changed.',
          'The things that are the same in every set-up are kept the same.',
          'Name it fully, like "the amount of water", not just "water".'],
        explain: 'Everything except the water must be the same, so that only water can cause the difference.' },
      { id: 'lc-052', type: 'oeq', level: 2, marks: 1,
        stem: 'Mei did the experiment in the table to find out if seeds need water to germinate. Only 9 of the 10 seeds in dish A germinated. Why was it better to use 10 seeds in each dish instead of 1?',
        figure: meiExp,
        model: 'Some seeds may not germinate even with water (they may be damaged or dead), so using more seeds makes the result more reliable.',
        keys: [['reliable', 'may not germinate', 'damaged', 'dead']],
        explain: 'If she had used just one seed and it happened to be dead, she might think water does not help, when really that one seed was the problem.' },
      { id: 'lc-053', type: 'oeq', level: 2, marks: 1,
        stem: 'A mosquito larva keeps swimming up to the surface of the water. Why?',
        figure: null,
        model: 'To take in air (to breathe).',
        keys: [['air', 'breathe', 'oxygen']],
        explain: 'The larva and pupa live in water but take in air at the water surface.' },
      { id: 'lc-054', type: 'oeq', level: 3, marks: 2,
        stem: 'The table shows the life cycles of animals A, B and C. Which animal could be a grasshopper? Give a reason.',
        figure: threeAnimals,
        model: 'A. A grasshopper has a 3-stage life cycle with a nymph stage (egg, nymph, adult) and no pupa stage.',
        keys: [['A'], ['nymph', 'no pupa', '3 stages', 'three stages']],
        technique: 'Count, then check',
        steps: [
          'Count the stages: 3 or 4?',
          'Look for the pupa. A pupa means 4 stages.',
          'Check the clue about the young: does it look like the adult?',
          'Pick the animal that matches every clue.'],
        explain: 'B is a 4-stage insect like a butterfly or beetle; C is a frog (egg, tadpole, adult frog). Only A has a nymph stage, as a grasshopper does.' },
      { id: 'lc-055', type: 'oeq', level: 2, marks: 2,
        stem: 'Kumar said, "All young animals look like their parents." Using one example, explain why he is wrong.',
        figure: null,
        model: 'A caterpillar (larva) does not look like the adult butterfly. / A tadpole does not look like the adult frog.',
        keys: [['butterfly', 'caterpillar', 'larva', 'mosquito', 'beetle', 'frog', 'tadpole'], ['does not look like', 'different', 'not like']],
        technique: 'Claim, evidence, reason',
        steps: ['Claim: decide yes or no, and say it first.', 'Recall the science rule that fits this question.', 'Check the thing in the question against that rule.', 'Reason: write "because..." using the rule and the example.'],
        explain: 'Name an animal whose young looks different, and say that it does not look like the adult.' },
      { id: 'lc-056', type: 'oeq', level: 2, marks: 3,
        stem: 'The diagram shows the life cycle of a frog.\n(a) Name stage B. (1 mark)\n(b) Where does a frog lay its eggs? (1 mark)\n(c) State one way in which stage B is different from the adult frog. (1 mark)',
        figure: cycle(['Egg', 'B', 'Adult frog']),
        model: '(a) Tadpole. (b) In water (for example, in a pond), in a jelly. (c) Stage B has a tail but the adult frog has no tail. / Stage B lives only in water but the adult frog can live on land and in water.',
        keys: [['tadpole'], ['water', 'pond'], ['tail', 'only in water', 'land']],
        technique: 'Count, then check',
        steps: [
          'Picture the young and the adult side by side.',
          'Check one feature at a time: tail, legs, wings, where it lives.',
          'Pick a feature that is different.',
          'Write about BOTH: "The young has ..., but the adult has ...".'],
        explain: 'For (c), compare BOTH: "B has a tail BUT the adult has no tail". A tadpole that has grown legs is sometimes called a froglet, but it is still before the adult stage.' },
      { id: 'lc-057', type: 'oeq', level: 3, marks: 2,
        stem: 'A butterfly lays its eggs on the underside of the leaves of one kind of plant. Give two reasons why.',
        figure: null,
        model: 'When the caterpillars hatch, the leaves are food they can eat straight away. Under the leaf, the eggs are hidden from predators (birds) and protected from rain and hot sun.',
        keys: [['food', 'eat', 'feed'], ['hidden', 'predators', 'birds', 'rain', 'sun', 'protect']],
        technique: 'Claim, evidence, reason',
        steps: [
          'Claim: answer the question in one short sentence.',
          'Evidence: point to what the picture, table or story shows.',
          'Reason: say the science idea that links them.',
          'Read it back: did I use the words from the question?'],
        explain: 'Reason 1: food for the larva. Reason 2: protection for the eggs.' },
      { id: 'lc-058', type: 'oeq', level: 3, marks: 2,
        stem: 'Jane put green bean seeds on wet cotton wool inside a dark cupboard at room temperature. After 3 days, the seeds germinated. What does this tell you about germination?',
        figure: null,
        model: 'Seeds do not need light to germinate. They only need water, air and warmth.',
        keys: [['light'], ['not need', 'do not need', 'not needed', 'not necessary']],
        technique: 'Claim, evidence, reason',
        steps: [
          'Claim: answer the question in one short sentence.',
          'Evidence: point to what the picture, table or story shows.',
          'Reason: say the science idea that links them.',
          'Read it back: did I use the words from the question?'],
        explain: 'The seeds had no light but still germinated, so light is not needed for germination.' },
      { id: 'lc-059', type: 'oeq', level: 2, marks: 1,
        stem: 'The pupa of a butterfly hardly moves and does not feed. Siti thinks it is dead. What is actually happening inside the pupa?',
        figure: null,
        model: 'It is alive; its body is changing into an adult butterfly.',
        keys: [['adult', 'butterfly', 'changing', 'developing']],
        explain: 'The pupa is a resting stage — the larva\'s body is changing into the adult.' },

      // ---------- Exam-style additions (hardness calibration, 2026-10-07) ----------
      { id: 'lc-060', type: 'mcq', level: 3,
        stem: 'Insect P has a 4-stage life cycle. The bar chart shows the number of days it spent in each stage. How many days after hatching did insect P become an adult?',
        figure: daysP,
        options: ['10 days', '24 days', '29 days', '41 days'],
        answer: 1,
        technique: 'Read, compare, conclude',
        steps: [
          'Ask: when does the counting start? "After hatching" skips the egg; "after the egg was laid" counts it.',
          'Ask: when does it stop? The adult comes out when the pupa stage ends.',
          'Add only the stages in between.',
          'Check: did I add a stage before the start or after the end?'],
        optionFeedback: {
          0: '10 is only the pupa days. The larva days come before the pupa, so add them too.',
          2: '29 includes the 5 egg days. "After hatching" starts when the larva comes out, so leave the egg out.',
          3: '41 adds every bar, including the 12 adult days. The adult has already come out by then.' },
        explain: '"After hatching" means the egg stage is over, so leave out the 5 egg days. P hatched as a larva, spent 14 days as a larva and 10 days as a pupa: 14 + 10 = 24 days. 29 days would count the egg stage too.' },
      { id: 'lc-061', type: 'mcq', level: 3,
        stem: 'Insects J and K both have 4-stage life cycles. The bar chart shows the number of days each spent as an egg, a larva and a pupa. On the 18th day after hatching, which stage was each insect in?',
        figure: daysJK,
        options: ['J: larva, K: larva', 'J: pupa, K: pupa', 'J: adult, K: larva', 'J: pupa, K: larva'],
        answer: 3,
        technique: 'Read, compare, conclude',
        steps: [
          'Start counting from hatching, so skip the egg.',
          'Add up the stages one at a time until I pass the day asked.',
          'The stage I am in when I pass that day is the answer.',
          'Do each insect on its own.'],
        optionFeedback: {
          0: 'If you add J\'s 4 egg days, J seems to still be a larva. But we count from hatching, so J stopped being a larva after 15 days.',
          1: 'J was a pupa on day 18, well done! But K was a larva for 20 days after hatching, so it was still a larva.',
          2: 'J becomes an adult only after 15 + 7 = 22 days, so on day 18 it was still a pupa.' },
        explain: 'Count from hatching, so skip the egg bars. J was a larva for 15 days after hatching, then a pupa until day 22, so on day 18 J was a pupa. K was a larva for 20 days after hatching, so on day 18 K was still a larva. If you add the egg days too, J would seem to be a larva.' },
      { id: 'lc-062', type: 'oeq', level: 3, marks: 4,
        stem: 'The bar chart shows the number of days a type of mosquito spends in each stage. The adult male and the adult female live for different lengths of time.\n(a) How many days after hatching does the mosquito become an adult? (1 mark)\n(b) How many days does a female mosquito live altogether, from the day its egg is laid? (1 mark)\n(c) People are asked to empty stagnant water around their homes at least once every 7 days. Using the bar chart, explain how this stops new adult mosquitoes from coming out. (2 marks)',
        figure: daysMozzie,
        model: '(a) 8 days (6 days as a larva + 2 days as a pupa). (b) 38 days (2 + 6 + 2 + 28). (c) The egg, larva and pupa live in water and need 2 + 6 + 2 = 10 days in the water to become an adult. If the water is emptied every 7 days, they are removed before they can become adults, so the life cycle is broken and no new adults come out.',
        keys: [['8 days'], ['38'], ['10 days'], ['before they can become adults', 'life cycle is broken', 'broken']],
        technique: 'Read, compare, conclude',
        steps: [
          'Ask: when does the counting start? "After hatching" skips the egg; "after the egg was laid" counts it.',
          'Ask: when does it stop? The adult comes out when the pupa stage ends.',
          'Add only the stages in between.',
          'Check: did I add a stage before the start or after the end?'],
        explain: '(a) After hatching: skip the egg. (b) From the egg: add egg, larva, pupa and the female adult (not the male bar). (c) Evidence: 10 days in water is longer than 7 days. Reason: the young are removed before they become adults, so the life cycle is broken.' },
      { id: 'lc-063', type: 'mcq', level: 3,
        stem: 'A butterfly has a 4-stage life cycle. The graph shows how its body mass changed from the day its egg was laid. W, X, Y and Z are its four stages. Which shows the larva stage and the pupa stage?',
        figure: massGraph,
        options: ['Larva: W, pupa: X', 'Larva: X, pupa: Z', 'Larva: Y, pupa: Z', 'Larva: X, pupa: Y'],
        answer: 3,
        technique: 'Read, compare, conclude',
        steps: [
          'Read the graph or chart part by part, from left to right.',
          'Compare: where is it rising or high, and where is it flat or zero?',
          'The larva eats the most and grows fastest. The pupa eats nothing, and comes right after the larva.',
          'Conclude: name the stages in order, egg first.'],
        optionFeedback: {
          0: 'W stays flat near 0: that is the egg, which does not feed. The steep rise after it is the larva.',
          1: 'X is the larva, well done! But Z comes after the mass drops: that is the adult. The pupa is Y, the flat part right after the larva.',
          2: 'Y is flat: the mass stays the same, so it is not feeding. That is the pupa. The larva is X, where the mass rises fast.' },
        explain: 'The larva eats the most, so its mass rises the fastest: that is X. The pupa does not feed, so its mass stays the same: that is Y, right after the larva. W is the egg and Z is the adult.' },
      { id: 'lc-064', type: 'oeq', level: 3, marks: 4,
        stem: 'A beetle has a 4-stage life cycle: egg, larva, pupa and adult. Lily kept a beetle egg in a box with food. Each week she recorded the mass of food eaten. The bar chart shows her results.\n(a) Which stage was the beetle in during week 4? (1 mark)\n(b) In which weeks was the beetle a pupa? (1 mark)\n(c) Lily\'s brother said, "The beetle was dead in weeks 5 and 6 because it ate nothing." Do you agree? Explain your answer using the bar chart. (2 marks)',
        figure: beetleFood,
        model: '(a) Larva. (b) Weeks 5 and 6. (c) No, I do not agree. The beetle ate food again in week 7, so it was alive. In weeks 5 and 6 it was a pupa, which does not feed but is alive and changing into an adult.',
        keys: [['larva'], ['5 and 6'], ['week 7', 'ate food again'], ['pupa', 'does not feed', 'changing into an adult']],
        technique: 'Read, compare, conclude',
        steps: [
          'Read the graph or chart part by part, from left to right.',
          'Compare: where is it rising or high, and where is it flat or zero?',
          'The larva eats the most and grows fastest. The pupa eats nothing, and comes right after the larva.',
          'Conclude: name the stages in order, egg first.'],
        explain: 'Week 1 (nothing eaten) is the egg. Weeks 2 to 4 (eating more and more) are the larva. The pupa does not feed, so weeks 5 and 6 show 0. In week 7 the adult beetle eats again. Claim (No) + evidence (ate in week 7) + reason (the pupa does not feed but is alive).' },
      { id: 'lc-065', type: 'mcq', level: 2,
        stem: 'The drawings J, K and L show three stages in the life cycle of a plant, in a mixed-up order. At which stage can the plant FIRST make its own food, and why?',
        figure: plantPics,
        options: ['L, because it has green leaves', 'K, because it has food stored inside it', 'J, because it has flowers and fruits', 'K, because it can take in water'],
        answer: 0,
        technique: 'Claim, evidence, reason',
        steps: [
          'Ask: which part of a plant makes food? The leaves.',
          'Look at each stage: does it have green leaves yet?',
          'The first stage with green leaves is the first that can make food.',
          'Give the reason: leaves make food using light, water and air.'],
        optionFeedback: {
          1: 'The seed does have food stored inside, so this is a fair thought! But it is using up that food, not making it. Food is made in green leaves.',
          2: 'The adult plant does make food, but the question asks when it FIRST can. The young plant gets green leaves earlier.',
          3: 'Taking in water is not the same as making food. Food is made in green leaves, and a seed has none.' },
        explain: 'The order is seed (K) → young plant (L) → adult plant (J). A plant makes its own food in its leaves, so it can first make food at the young plant stage, once it has leaves. The seed uses food stored inside it. The adult plant also makes food, but it comes later.' },
      { id: 'lc-066', type: 'oeq', level: 3, marks: 3,
        stem: 'Farmer Lim grows chilli plants. The diagram shows the life cycle of a chilli plant. Each season he sells most of the chillies he harvests, but he keeps some of the seeds.\n(a) At which stage of its life cycle does a chilli plant bear chillies (fruits)? (1 mark)\n(b) Explain how keeping some seeds gives Farmer Lim a continuous supply of chilli plants. (2 marks)',
        figure: cycle(['Seed', 'Young plant', 'Adult plant']),
        model: '(a) The adult plant stage. (b) He plants the seeds next season. They germinate and grow into new adult plants. These adult plants bear flowers and fruits with new seeds, so the life cycle repeats and he always has chilli plants.',
        keys: [['adult plant', 'adult'], ['grow into new adult plants', 'grow into adult plants', 'germinate'], ['new seeds', 'life cycle repeats', 'bear flowers and fruits']],
        technique: 'Claim, evidence, reason',
        steps: [
          'Claim: answer the question in one short sentence.',
          'Evidence: point to what the picture, table or story shows.',
          'Reason: say the science idea that links them.',
          'Read it back: did I use the words from the question?'],
        explain: '(a) Only the adult plant bears flowers and fruits; the chillies are its fruits, with seeds inside. (b) Point 1: the kept seeds grow into adult plants. Point 2: those adults reproduce (make fruits with new seeds), so the cycle continues every season.' },
      { id: 'lc-067', type: 'mcq', level: 3,
        stem: 'The diagram shows the life cycle of a plant. Which of these statements are correct?\nA: Stage P has leaves, so it can make its own food.\nB: Only the adult plant bears flowers and fruits.\nC: The seed needs light to germinate.',
        figure: cycle(['Seed', 'P', 'Adult plant']),
        options: ['A and B only', 'A and C only', 'B and C only', 'A, B and C'],
        answer: 0,
        technique: 'Tick or cross',
        steps: [
          'Read one statement at a time.',
          'Ask: is it true? Put a tick or a cross beside it.',
          'Check every statement before you look at the options.',
          'Pick the option that lists exactly your ticks.'],
        optionFeedback: {
          1: 'A is right! But C is not: a seed needs water, air and warmth, not light. Check B again: only the adult plant bears flowers and fruits.',
          2: 'B is right! But C is not: a seed needs water, air and warmth, not light. Check A again: P has leaves, so it can make food.',
          3: 'A and B are right. C is the one to cross out: a seed does not need light to germinate.' },
        explain: 'P is the young plant. A is correct: it has leaves, so it can make its own food. B is correct: flowers and fruits appear only on the adult plant. C is not correct: a seed needs water, air and warmth to germinate, not light.' },
      { id: 'lc-068', type: 'oeq', level: 3, marks: 4,
        stem: 'Ali put 10 mosquito larvae into each of two tanks of water, A and B. He poured a thin layer of oil on the water in tank B. The drawing shows a larva in each tank. After two days, the larvae in tank A were alive, but all the larvae in tank B had died.\n(a) Why does a mosquito larva come up to the surface of the water? (1 mark)\n(b) Explain why the larvae in tank B died. (2 marks)\n(c) Explain how a layer of oil on stagnant water can reduce the number of adult mosquitoes. (1 mark)',
        figure: oilTanks,
        model: '(a) To take in air (to breathe) through its breathing tube. (b) The layer of oil stopped the breathing tube from reaching the air, so the larvae could not take in air and died. (c) The larvae die before they can become pupae and adults, so the life cycle is broken and there are fewer adult mosquitoes.',
        keys: [['air', 'breathe'], ['oil stopped the breathing tube', 'reaching the air', 'oil'], ['could not take in air', 'cannot take in air', 'could not breathe'], ['before they can become', 'life cycle is broken', 'fewer adult']],
        technique: 'Claim, evidence, reason',
        steps: [
          'Name the stages that need the water.',
          'Ask: what happens to them if the water is gone or blocked?',
          'So they cannot become adults: the life cycle is broken.',
          'End with the result: fewer adult mosquitoes.'],
        explain: '(b) Evidence: the breathing tube touches the oil, not the air. Reason: the larva cannot take in air, so it dies. (c) Dead larvae never become pupae or adults.' },
      { id: 'lc-069', type: 'mcq', level: 3,
        stem: 'Scientists release special male mosquitoes. When these males mate with female mosquitoes, the eggs that the females lay do not hatch. Which of these statements are correct?\nA: No larvae come out of these eggs.\nB: Fewer adult mosquitoes are produced later.\nC: The special male mosquitoes lay eggs that do not hatch.',
        figure: null,
        options: ['A only', 'A and B only', 'B and C only', 'A, B and C'],
        answer: 1,
        technique: 'Tick or cross',
        steps: [
          'Read one statement at a time.',
          'Ask: is it true? Put a tick or a cross beside it.',
          'Check every statement before you look at the options.',
          'Pick the option that lists exactly your ticks.'],
        optionFeedback: {
          0: 'A is right! Now check B: with no larvae, there will be no pupae and no new adults later.',
          2: 'B is right! But C is not: male mosquitoes do not lay eggs. Only the females do.',
          3: 'A and B are right. C is the one to cross out: male mosquitoes do not lay eggs.' },
        explain: 'A: the eggs do not hatch, so no larvae come out. B: with no larvae there are no pupae and no new adults, so the number of mosquitoes falls. C is not correct: male mosquitoes do not lay eggs; the females do. (Singapore\'s NEA uses this idea in Project Wolbachia.)' },
      { id: 'lc-070', type: 'oeq', level: 3, marks: 3,
        stem: 'Scientists followed 200 eggs laid by butterflies in a garden and counted how many were still alive at each stage. The table shows their results.\n(a) Suggest one reason why fewer of the young were left at each stage. (1 mark)\n(b) A butterfly lays many eggs. Explain how this helps the butterfly\'s kind to survive. (2 marks)',
        figure: tbl(['Stage', 'Number still alive'], [['Egg', '200'], ['Larva', '60'], ['Pupa', '15'], ['Adult', '8']]),
        model: '(a) Many eggs and young were eaten by predators such as birds and ants (or destroyed by heavy rain). (b) Even though many eggs and young are eaten or destroyed, enough of them survive to become adults. These adults reproduce and lay eggs, so the butterfly\'s kind does not die out.',
        keys: [['eaten', 'predators', 'birds', 'ants', 'destroyed', 'rain'], ['enough of them survive', 'survive to become adults'], ['reproduce', 'lay eggs', 'does not die out']],
        technique: 'Claim, evidence, reason',
        steps: [
          'Claim: answer the question in one short sentence.',
          'Evidence: point to what the picture, table or story shows.',
          'Reason: say the science idea that links them.',
          'Read it back: did I use the words from the question?'],
        explain: 'Only 8 out of 200 became adults. If the butterfly laid only a few eggs, maybe none would survive. Point 1: some survive to become adults. Point 2: they reproduce, so the kind continues.' },
      { id: 'lc-071', type: 'mcq', level: 3,
        stem: 'The table shows the life cycles of the grasshopper and the mosquito. Which of these statements are correct for BOTH animals?\nA: The young looks like the adult.\nB: The young sheds its skin (moults) as it grows.\nC: The whole life cycle takes place on land.',
        figure: tbl(['Animal', 'Stages in its life cycle'], [['Grasshopper', 'egg → nymph → adult'], ['Mosquito', 'egg → larva → pupa → adult']]),
        options: ['A only', 'B only', 'A and B only', 'B and C only'],
        answer: 1,
        technique: 'Tick or cross',
        steps: ['Read one statement at a time.', 'Ask: is it true for BOTH animals? Tick it only if it is true for the grasshopper AND the mosquito.', 'Check every statement before you look at the options.', 'Pick the option that lists exactly your ticks.'],
        optionFeedback: {
          0: 'A is true only for the grasshopper. A mosquito larva does not look like the adult.',
          2: 'B is true for both! But A is true only for the grasshopper: a mosquito larva does not look like the adult.',
          3: 'B is true for both! But C is true only for the grasshopper: the mosquito\'s egg, larva and pupa live in water.' },
        explain: 'B is true for both: a grasshopper nymph and a mosquito larva both moult to grow. A is true only for the grasshopper; a mosquito larva does not look like the adult. C is true only for the grasshopper; the mosquito\'s egg, larva and pupa live in water.' },
      { id: 'lc-072', type: 'mcq', level: 3,
        stem: 'The table shows the life cycles of the chicken and the mosquito. Which of these statements are correct?\nA: The young of the chicken looks like its adult, but the young of the mosquito does not.\nB: All the stages of the mosquito live on land.\nC: The mosquito has one more stage in its life cycle than the chicken.',
        figure: tbl(['Animal', 'Stages in its life cycle'], [['Chicken', 'egg → chick → adult'], ['Mosquito', 'egg → larva → pupa → adult']]),
        options: ['A and B only', 'B and C only', 'A and C only', 'A, B and C'],
        answer: 2,
        technique: 'Tick or cross',
        steps: [
          'Read one statement at a time.',
          'Ask: is it true? Put a tick or a cross beside it.',
          'Check every statement before you look at the options.',
          'Pick the option that lists exactly your ticks.'],
        optionFeedback: {
          0: 'A is right! But B is not: the mosquito\'s egg, larva and pupa live in water. Check C as well.',
          1: 'C is right! But B is not: the mosquito\'s egg, larva and pupa live in water. Check A as well.',
          3: 'A and C are right. B is the one to cross out: only the adult mosquito lives on land.' },
        explain: 'A is correct: a chick looks like a small chicken, but a mosquito larva does not look like the adult. B is not correct: the egg, larva and pupa live in water; only the adult lives on land. C is correct: 4 stages vs 3 stages.' },
      { id: 'lc-073', type: 'mcq', level: 3,
        stem: 'Which of these statements about the life cycles of the frog and the chicken are correct?\nA: Both lay eggs.\nB: The young of both look like their adults.\nC: Both have 3 stages in their life cycles.',
        figure: null,
        options: ['A only', 'A and B only', 'B and C only', 'A and C only'],
        answer: 3,
        technique: 'Tick or cross',
        steps: [
          'Read one statement at a time.',
          'Ask: is it true? Put a tick or a cross beside it.',
          'Check every statement before you look at the options.',
          'Pick the option that lists exactly your ticks.'],
        optionFeedback: {
          0: 'A is right! Now check C: a frog has 3 stages (egg, tadpole, adult frog) and so does a chicken.',
          1: 'A is right, but B is not true for the frog: a tadpole does not look like a frog.',
          2: 'C is right, but B is not true for the frog: a tadpole does not look like a frog.' },
        explain: 'A is correct: both lay eggs. B is not correct: a chick looks like a small chicken, but a tadpole does not look like a frog. C is correct: most exam papers show the frog with 3 stages (egg → tadpole → adult frog), the same number as the chicken (egg → chick → adult). If your book draws a froglet as a 4th stage, follow your book.' },
      { id: 'lc-074', type: 'oeq', level: 3, marks: 3,
        stem: 'Siti put 10 green bean seeds in each of three dishes, A, B and C, and placed them in the same warm room. The table shows what she did and her results after 5 days.\n(a) Which two set-ups should she compare to show that seeds need water to germinate? (1 mark)\n(b) The seeds in B had plenty of water but did not germinate. Explain why. (2 marks)',
        figure: tbl(['Set-up', 'What Siti did', 'Germinated?'], [['A', 'seeds on wet cotton wool', 'Yes'], ['B', 'seeds kept completely under water, with a layer of oil on top of the water', 'No'], ['C', 'seeds on dry cotton wool', 'No']]),
        model: '(a) A and C. (b) The seeds in B were completely under water and the oil stopped air from reaching the water, so the seeds had no air. Seeds need air to germinate.',
        keys: [['A and C'], ['no air', 'stopped air'], ['need air']],
        technique: 'Change one thing',
        steps: [
          'Find the two set-ups that differ ONLY in the thing being tested.',
          'For a set-up that did not work, list what it had and what it was missing.',
          'Match the missing thing to what seeds need: water, air and warmth.',
          'Write the reason using the set-up\'s letter.'],
        explain: 'A and C differ only in water. In B there is water and warmth but no air, and seeds need water, air AND warmth to germinate. Claim + evidence (no air reached the seeds) + reason (seeds need air).' },
      { id: 'lc-075', type: 'mcq', level: 3,
        stem: 'Ali kept a cockroach nymph in a box and fed it every day. He measured its length at the end of each week. The table shows his results. What most likely happened between week 2 and week 3?',
        figure: tbl(['Week', 'Length of nymph (mm)'], [['1', '8'], ['2', '8'], ['3', '12'], ['4', '12'], ['5', '17']]),
        options: ['It shed its skin and then grew bigger', 'It became a pupa and then grew bigger', 'It stopped feeding and then grew bigger', 'It grew wings and then grew bigger'],
        answer: 0,
        technique: 'Read, compare, conclude',
        steps: ['Read the numbers in order, week by week.', 'Compare: where does it stay the same, and where does it jump?', 'Ask: what does the animal do at each jump?', 'Conclude: say the pattern in a sentence.'],
        optionFeedback: {
          1: 'A cockroach has no pupa stage. Its nymph grows straight into an adult.',
          2: 'It was fed every day, and a growing nymph keeps feeding.',
          3: 'A cockroach gets wings only when it becomes an adult, and it was still a nymph.' },
        explain: 'A nymph\'s outer skin cannot stretch, so it sheds (moults) its old skin to grow bigger. That is why its length goes up in steps. A cockroach has no pupa stage, and it gets wings only when it becomes an adult.' },

      /* x17 science expansion — lane sci-x-plantcycle */
      { id: 'x17-lc-001', type: 'mcq', level: 2,
        stem: 'The diagrams show the life cycles of two animals, A and B. Which pair of animals could A and B be?',
        figure: x17PairAB,
        options: ['A: mosquito, B: grasshopper', 'A: butterfly, B: cockroach', 'A: cockroach, B: mosquito', 'A: chicken, B: grasshopper'],
        answer: 2,
        hints: ['Count the stages in each cycle. Which one has a pupa?', 'A has 3 stages (no pupa), like a cockroach or chicken. B has 4 stages with a pupa, like a mosquito or butterfly. Only one option has both right.'],
        technique: 'Count, then check',
        steps: [
          'Count the stages: 3 or 4?',
          'Look for the pupa. A pupa means 4 stages.',
          'Check the clue about the young: does it look like the adult?',
          'Pick the animal that matches every clue.'],
        optionFeedback: {
          0: 'These are swapped! A has 3 stages and B has 4 with a pupa. A mosquito has a pupa, so it would be B.',
          1: 'These are swapped! A butterfly has a pupa, so it would be B, and a cockroach would be A.',
          3: 'A chicken fits A, good counting! But a grasshopper has no pupa, so it cannot be B.' },
        explain: 'A has 3 stages (egg, young, adult) and no pupa: a cockroach fits. B has 4 stages (egg, larva, pupa, adult): a mosquito fits. Option 2 swaps them. A grasshopper has only 3 stages and no pupa, so it cannot be B.' },
      { id: 'x17-lc-002', type: 'oeq', level: 2, marks: 2,
        stem: 'Look at the life cycles of animals A and B.\n(a) State one similarity between the two life cycles. (1 mark)\n(b) State one difference between the two life cycles. (1 mark)',
        figure: x17PairAB,
        model: '(a) Both life cycles start with an egg (both have an egg stage and an adult stage). (b) Animal B has a pupa stage but animal A does not (A has 3 stages, B has 4 stages).',
        keys: [['egg', 'adult stage'], ['pupa', '3 stages', '4 stages', 'larva']],
        hints: ['Look for a stage both cycles have, then a stage only one of them has.', 'Both start with an egg. Only B has a pupa (and a larva). Write each answer as a full sentence naming A and B.'],
        technique: 'Count, then check',
        steps: ['Count the stages in each life cycle.', 'Look for the pupa: which animal has it?', 'A similarity is something both have. A difference is something only one has.', 'Write about BOTH animals. Similarity: "Both A and B have ...". Difference: "A has ..., but B does not."'],
        explain: 'Similarity: name a stage found in BOTH (egg, or adult). Difference: name the stage only one animal has, and say which animal: "B has a pupa stage but A does not." "A has fewer stages" earns the mark only if you give the numbers (3 and 4) or name the missing stage.' },
      { id: 'x17-lc-003', type: 'mcq', level: 3,
        stem: 'Look at the life cycles of animals A and B. Which statement is NOT correct?',
        figure: x17PairAB,
        options: ['Both A and B start life as an egg.', 'Only animal B has a pupa stage.', 'Animal A has fewer stages than animal B.', 'The larva of B looks like the adult of B.'],
        answer: 3,
        hints: ['This asks for the statement that is NOT correct. Check each one against the diagrams and what you know about larvae.', 'Statements 1 to 3 can be read straight off the diagrams. In a 4-stage life cycle, the larva does NOT look like the adult (a caterpillar is not like a butterfly).'],
        technique: 'Tick or cross',
        steps: [
          'This asks for the one that is NOT correct, so I am looking for a cross.',
          'Read one statement at a time and tick or cross it.',
          'The true ones are not the answer.',
          'Pick the one with the cross.'],
        optionFeedback: {
          0: 'That one is true: both cycles do start with an egg. The question asks for the one that is NOT correct.',
          1: 'That one is true: only B has a pupa. The question asks for the one that is NOT correct.',
          2: 'That one is true: A has 3 stages and B has 4. The question asks for the one that is NOT correct.' },
        explain: 'Both cycles start with an egg, only B has a pupa, and A has 3 stages while B has 4: these are correct. In a 4-stage life cycle the larva (like a caterpillar or a mosquito larva) does not look like the adult, so statement 4 is the one that is NOT correct.' },
      { id: 'x17-lc-004', type: 'mcq', level: 2,
        stem: 'The drawings show the life cycle of a mosquito in order, from W to Z. The drawing of stage Y is missing. Which correctly describes stage Y?',
        figure: x17Mozzie,
        options: ['It is a nymph, and it flies to find food.', 'It is a pupa, and it lives on land.', 'It is a larva, and it feeds in the water.', 'It is a pupa, and it lives in water but does not feed.'],
        answer: 3,
        hints: ['X hangs from the water surface and Z can fly. What stage comes between the larva and the adult?', 'Mosquito: egg (W) → larva (X) → pupa (Y) → adult (Z). The pupa stays in the water, comes up for air, and does not feed.'],
        technique: 'Count, then check',
        steps: [
          'Count the stages in the cycle. Is there a pupa?',
          'Name each lettered stage from where it sits.',
          'Recall what that stage does: does it feed? Where does it live?',
          'Check every part of the option, not just the first half.'],
        optionFeedback: {
          0: 'A nymph is the young of a cockroach or grasshopper. A mosquito has a larva and a pupa.',
          1: 'Y is the pupa, well done! But a mosquito pupa lives in water, not on land.',
          2: 'X is already the larva. Y comes after the larva, so it is the pupa.' },
        explain: 'W is the eggs, X is the larva and Z is the adult, so Y is the pupa. A mosquito pupa lives in water like the larva, but it does not feed. A nymph is the young of a cockroach or grasshopper, and the mosquito larva is already shown as X.' },
      { id: 'x17-lc-005', type: 'oeq', level: 2, marks: 2,
        stem: 'Look at the drawings of the mosquito\'s life cycle.\n(a) Name stage Y. (1 mark)\n(b) State one way in which stage Y is different from stage X. (1 mark)',
        figure: x17Mozzie,
        model: '(a) Stage Y is the pupa. (b) Stage X (the larva) feeds, but stage Y (the pupa) does not feed.',
        keys: [['pupa'], ['does not feed', 'not feed', 'does not eat', 'no food']],
        hints: ['Y comes after the larva and before the adult. Then think: which of the two eats?', 'Y is the pupa. The larva X feeds in the water; the pupa Y does not feed while it changes into the adult.'],
        technique: 'Count, then check',
        steps: ['Name each stage from where it sits: egg, larva, pupa, adult.', 'Recall what each stage does: does it feed? Where does it live?', 'Find one thing that is true for one stage but not the other.', 'Write about BOTH stages: "X feeds, but Y does not feed."'],
        explain: 'Name the stage, then compare it with X using the same idea for both: "X feeds but Y does not feed." Both live in water and both come up to the surface for air, so "lives in water" is NOT a difference.' },
      { id: 'x17-lc-006', type: 'mcq', level: 1,
        stem: 'The drawings show the life cycle of a tomato plant in order, from E to H. The drawing of stage F is missing. What is stage F?',
        figure: x17Tomato,
        options: ['A larva', 'A young plant', 'A fruit', 'A flower'],
        answer: 1,
        hints: ['What does a seed grow into before it becomes a big plant with flowers?', 'Seed (E) → young plant (F) → adult plant with flowers (G) → fruit with seeds (H). A larva is an animal stage, not a plant stage.'],
        optionFeedback: {
          0: 'A larva is an animal stage. Plants do not have one.',
          2: 'The fruit is already shown in H. F comes straight after the seed.',
          3: 'Flowers grow on the adult plant (G). F comes straight after the seed.' },
        explain: 'A seed germinates and grows into a young plant, which grows into an adult plant that bears flowers. The flowers develop into fruits with seeds inside. Plants have no larva stage, and the fruit is already shown as H.' },
      { id: 'x17-lc-007', type: 'oeq', level: 2, marks: 2,
        stem: 'Look at the life cycle of the tomato plant. The young plant at stage F can make its own food, but the seed at stage E cannot. Explain why.',
        figure: x17Tomato,
        model: 'The young plant at stage F has green leaves, and leaves make food for the plant using light, water and air. The seed at stage E has no leaves, so it cannot make food. It uses the food stored inside it.',
        keys: [['leaves', 'leaf'], ['make food', 'makes food', 'make its own food']],
        hints: ['Which part of a plant makes food? Does the seed have it?', 'Stage F has green leaves, and leaves make food. The seed has no leaves, so it lives on the food stored inside it.'],
        technique: 'Claim, evidence, reason',
        steps: [
          'Ask: which part of a plant makes food? The leaves.',
          'Look at each stage: does it have green leaves yet?',
          'The first stage with green leaves is the first that can make food.',
          'Give the reason: leaves make food using light, water and air.'],
        explain: 'Claim: F can make food. Evidence: a young plant has green leaves; a seed has none. Reasoning: leaves make food for the plant using light, water and air.' },
      { id: 'x17-lc-008', type: 'mcq', level: 3,
        stem: 'Gopal kept a beetle and a moth from the day their eggs were laid. The table shows how many days each insect spent in each stage. The adults were still alive when he stopped. Based only on the table, which statement is definitely true?',
        figure: x17Days,
        options: ['Moth B will live longer than beetle A.', 'Beetle A eats more food than moth B.', 'Beetle A took more days than moth B to become an adult.', 'The adult stage of moth B is shorter than its pupa stage.'],
        answer: 2,
        hints: ['The table has no Adult column. Which statement can you check using ONLY the numbers given?', 'Add up the days before each adult came out: A is 7 + 30 + 12 = 49 days, B is 5 + 21 + 18 = 44 days. The table says nothing about how long the adults live or how much they eat.'],
        technique: 'Read, compare, conclude',
        steps: [
          'Read what the table actually shows.',
          'Notice what is NOT in it.',
          'For each option, ask: can I be sure from these numbers alone?',
          'Cross out the ones I cannot be sure of. Pick the one I can work out.'],
        optionFeedback: {
          0: 'Moth B had a longer pupa stage, but the days in one stage do not tell us how long it will live. The table has no adult days.',
          1: 'The table shows days, not food. More days does not tell us how much was eaten.',
          3: 'The table stops at the pupa. With no adult column, we cannot compare the adult stage with anything.' },
        explain: 'A became an adult after 7 + 30 + 12 = 49 days and B after 5 + 21 + 18 = 44 days, so statement 3 is true. The table does not show the adult stage, so we cannot tell how long each insect lives (statements 1 and 4). The number of days says nothing about how much food is eaten (statement 2).' },
      { id: 'x17-lc-009', type: 'oeq', level: 3, marks: 2,
        stem: 'Look at Gopal\'s table. Wei Ling says, "Moth B spent more days as a pupa than beetle A, so moth B will live longer." Explain why she cannot tell this from the table.',
        figure: x17Days,
        model: 'The table does not show the adult stage. It gives only the days spent as an egg, a larva and a pupa, so we cannot tell how long each adult will live, or which insect will live longer.',
        keys: [['adult'], ['does not show', 'not shown', 'cannot tell', 'not given']],
        hints: ['How long an insect lives includes its adult stage. Is the adult stage in the table?', 'The table stops at the pupa. The days spent in one stage do not tell you how long the adult will live.'],
        technique: 'Can we be sure?',
        steps: [
          'Read the claim: what does the person say?',
          'Ask: what would I need to know to be sure?',
          'Check the table: is that thing there?',
          'Write: "We cannot tell, because the table does not show ...".'],
        explain: 'Claim: she cannot tell. Evidence: the table has no Adult column. Reasoning: a longer pupa stage does not mean a longer life; how long the insect lives also depends on its adult stage, which the table does not show.' },
      { id: 'x17-lc-010', type: 'mcq', level: 3,
        stem: 'The drawings show the four stages in the life cycle of a mealworm beetle, in a mixed-up order. Stage Y lies still and does not move from place to place.\nA: Y is alive.\nB: Y needs air.\nC: Y feeds on bran.\nD: Y sheds its skin several times to grow bigger.\nWhich statements about stage Y are correct?',
        figure: x17Meal,
        options: ['A and B only', 'C and D only', 'A, B and D only', 'B, C and D only'],
        answer: 0,
        hints: ['Y is the pupa. A pupa looks lifeless. Is it really dead?', 'The pupa is alive and needs air, like every living thing. It does not feed, and it does not moult to grow bigger: that is what the larva does.'],
        technique: 'Tick or cross',
        steps: [
          'Read one statement at a time.',
          'Ask: is it true? Put a tick or a cross beside it.',
          'Check every statement before you look at the options.',
          'Pick the option that lists exactly your ticks.'],
        optionFeedback: {
          1: 'C and D are about the larva: it feeds and moults. Y is the pupa, which does neither.',
          2: 'A and B are right, well done! But D is what the larva does: the pupa does not moult to grow bigger.',
          3: 'B is right! But C and D describe the larva, not the pupa. And check A: the pupa is alive.' },
        explain: 'Y is the pupa. It is alive, and like all living things it needs air (A and B are correct). The pupa does not feed, so C is not correct. The larva, not the pupa, sheds its skin several times to grow bigger, so D is not correct either.' },
      { id: 'x17-lc-011', type: 'mcq', level: 1,
        stem: 'Look at the drawings of the mealworm beetle. Stage X hatches from stage Z and eats a lot of bran. Which stage sheds its skin (moults) several times as it grows?',
        figure: x17Meal,
        options: ['W', 'X', 'Y', 'Z'],
        answer: 1,
        hints: ['Which stage is growing bigger and bigger by eating?', 'X is the larva (the mealworm). It eats and grows, and it sheds its skin so it can grow bigger. The pupa (Y) does not moult to grow.'],
        optionFeedback: {
          0: 'W is the adult beetle, which has stopped growing, so it does not moult to grow.',
          2: 'Y is the pupa, which does not feed or grow, so it does not moult to grow.',
          3: 'Z is the eggs. An egg does not eat or grow bigger, so it does not moult.' },
        explain: 'X is the larva. Its skin cannot stretch, so it moults several times as it grows. Z is the eggs, Y is the pupa (it does not feed or grow) and W is the adult beetle, which no longer grows.' },
      { id: 'x17-lc-012', type: 'oeq', level: 2, marks: 2,
        stem: 'Look at the drawings of the mealworm beetle. Ben says, "Stage Y does not need air, because it does not move or feed." Do you agree? Explain.',
        figure: x17Meal,
        model: 'No, I do not agree. Stage Y is the pupa, and it is alive: inside it, the body is changing into the adult beetle. All living things need air, so stage Y needs air to stay alive.',
        keys: [['alive', 'living'], ['need air', 'needs air']],
        hints: ['Is stage Y alive or dead? What do all living things need?', 'Y is the pupa: it is alive and changing into the adult. Every living thing needs air, so Y needs air too.'],
        technique: 'Claim, evidence, reason',
        steps: ['Claim: decide yes or no, and say it first.', 'Recall the science rule that fits this question.', 'Check the thing in the question against that rule.', 'Reason: write "because..." using the rule and the example.'],
        explain: 'Claim: disagree. Evidence: Y is the pupa, which is alive and changing into the adult. Reasoning: all living things need air. Not moving and not feeding do not mean it is dead.' },

      // ---------- q24 gap fill (lane q24-scigap, 2026-10-24): naming the plant stages, incl. the seedling ----------
      { id: 'lc-096', type: 'mcq', level: 2,
        stem: 'The sentences describe the life cycle of a balsam plant, in a mixed-up order.\nP: The adult plant bears flowers.\nQ: The seed germinates and a seedling grows out of it.\nR: The flowers develop into fruits with seeds inside.\nS: The seedling grows into a young plant with more leaves.\nT: The young plant grows into an adult plant.\nStarting from the seed, which is the correct order?',
        figure: null,
        options: ['Q → T → S → P → R', 'S → Q → T → P → R', 'Q → S → T → P → R', 'Q → S → T → R → P'],
        answer: 2,
        hints: ['Start with the seed (Q). Which is younger: the seedling or the young plant?', 'Q seed and seedling, S young plant, T adult plant, P flowers, R fruits with seeds.'],
        technique: 'Count, then check',
        steps: ['Find the start: the seed.', 'Put the plant stages in order: seedling, young plant, adult plant.', 'Then the adult plant: flowers come first, fruits after.', 'Check each step: does this one really grow out of the one before?'],
        optionFeedback: {
          0: 'Q is the right start! But the seedling comes before the young plant, so S must come before T.',
          1: 'A seedling grows out of a seed, so Q (the seed germinating) must come first.',
          3: 'So close! The plant stages are right, but the flowers come before the fruits: a fruit develops from a flower.' },
        explain: 'Seed and seedling (Q) → young plant (S) → adult plant (T) → flowers (P) → fruits with seeds (R). The seeds in the fruits can germinate, so the cycle starts again. Remember: a fruit develops from a flower, so P comes before R.' },
      { id: 'lc-097', type: 'mcq', level: 1,
        stem: 'Lin put a green bean seed on moist cotton wool. After 4 days the seed coat had split. A root had grown downwards and a short shoot with two small seed leaves had grown upwards. Which stage of the plant\'s life cycle is this?',
        figure: null,
        options: ['Seed', 'Seedling', 'Adult plant', 'Fruit'],
        answer: 1,
        hints: ['The seed has started to grow: it has a root and a shoot. What do we call a very young plant that has just come out of its seed?', 'A seedling: the very young plant that grows out of the seed after it germinates.'],
        optionFeedback: {
          0: 'It started as a seed, you are right! But the seed coat has split and a root and shoot have grown out, so it has germinated and is no longer just a seed.',
          2: 'An adult plant is fully grown and bears flowers and fruits. This plant has only two small seed leaves, so it is still very young.',
          3: 'A fruit develops from a flower on an adult plant and holds seeds. This is a very young plant that has just come out of a seed.' },
        explain: 'When a seed germinates, the seed coat splits, the root grows out first and then the shoot. The very young plant that grows out of the seed is called a seedling. Its seed leaves still hold food stored in the seed.' },
      { id: 'lc-098', type: 'oeq', level: 2, marks: 2,
        stem: 'Ravi put some green bean seeds on moist cotton wool in a dark cupboard. After a few days the seeds germinated and grew into seedlings.\n(a) What did Ravi see that told him the seeds had germinated? (1 mark)\n(b) The seeds did not need light to germinate. Explain why the seedlings will need light to keep growing into young plants. (1 mark)',
        figure: null,
        model: '(a) The seed coat split and a root grew out of each seed, followed by a shoot. (b) The seedling uses up the food stored in its seed leaves. After that it must make its own food in its green leaves, and it needs light to make food.',
        keys: [['root grew out', 'seed coat split', 'shoot'], ['make its own food', 'needs light to make food']],
        hints: ['(a) What is the first part to come out of a seed when it starts to grow? (b) Where does the seedling get its food at first, and what happens when that food runs out?', '(a) A root grew out of the split seed coat. (b) Once the stored food is used up, the seedling must make its own food, and it needs light to do that.'],
        technique: 'Claim, evidence, reason',
        steps: ['(a) Picture the seed on the cotton wool: what would you SEE when it starts to grow?', '(a) Name the part that comes out of the seed first.', '(b) Ask: where does the seedling get its food at the start?', '(b) Reason: once that food is used up, what must it do, and what does it need for that?'],
        explain: '(a) Mark 1: something Ravi could see: the seed coat split and a root (then a shoot) grew out. (b) Mark 2: the reason, not just the word "light". At first the seedling lives on the food stored in its seed leaves. When that food is used up, it must make its own food in its green leaves, and it needs light to do that. "It needs light" alone does not explain why, so add "to make its own food".' }
    ]
  });
})();
