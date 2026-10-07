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
    [['A', 'egg → nymph → adult'], ['B', 'egg → larva → pupa → adult'], ['C', 'egg → tadpole → froglet → adult']]);

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
        explain: 'Q is the eggs on a leaf. A caterpillar (S) hatches and eats a lot. It then becomes a pupa (R), a case hanging from a twig. The adult butterfly (P) comes out of the pupa.' },
      { id: 'lc-002', type: 'mcq', level: 2,
        stem: 'The diagram shows the life cycle of a mosquito. Which correctly describes stages P and Q?',
        figure: cycle(['Egg', 'P', 'Q', 'Adult']),
        options: ['P is the larva and does not feed; Q is the pupa and feeds', 'P is the pupa and lives on land; Q is the larva and lives in water', 'P is the larva and feeds; Q is the pupa and does not feed', 'P is the nymph and feeds; Q is the pupa and lives on land'],
        answer: 2,
        explain: 'Mosquito: egg → larva (P) → pupa (Q) → adult. The larva feeds; the pupa does not. Both live in water and come to the surface to take in air. A nymph is the young of a cockroach or grasshopper, not a mosquito.' },
      { id: 'lc-003', type: 'mcq', level: 1,
        stem: 'What is the young of a cockroach called?',
        figure: null,
        options: ['Larva', 'Pupa', 'Nymph', 'Tadpole'],
        answer: 2,
        explain: 'The cockroach has a 3-stage life cycle: egg → nymph → adult. The nymph looks like the adult but is smaller and has no wings.' },
      { id: 'lc-004', type: 'mcq', level: 1,
        stem: 'Which stage of a butterfly feeds the most?',
        figure: null,
        options: ['Egg', 'Larva (caterpillar)', 'Pupa', 'Adult'],
        answer: 1,
        explain: 'The caterpillar eats leaves all the time and grows very fast. The egg and the pupa do not feed at all.' },
      { id: 'lc-005', type: 'mcq', level: 2,
        stem: 'The drawings show four stages in the life cycle of a butterfly, in a mixed-up order. Stage R hung from the twig without moving for 10 days. Which statement about stage R is correct?',
        figure: butterflyPics,
        options: ['It is dead and its body will not change any more', 'It feeds on the leaves of the twig at night', 'It will soon hatch into a small caterpillar', 'It does not feed but is changing into an adult'],
        answer: 3,
        explain: 'R is the pupa (chrysalis). It does not feed and does not move from place to place, but it is alive: inside the case its body is changing into a butterfly. The caterpillar hatches from the egg, not from the pupa.' },
      { id: 'lc-006', type: 'mcq', level: 2,
        stem: 'Which describes how a tadpole changes as it grows into an adult frog?',
        figure: null,
        options: ['Its tail grows longer and its legs slowly disappear', 'Front legs grow, then wings, and the tail gets longer', 'It becomes a pupa and stops feeding for a few weeks', 'Back legs grow, then front legs, and the tail gets shorter'],
        answer: 3,
        explain: 'A tadpole hatches with a tail and no legs. Back legs grow first, then front legs, while the tail gets shorter until the adult frog has no tail. A frog has no pupa stage.' },
      { id: 'lc-007', type: 'mcq', level: 1,
        stem: 'Which animal has a life cycle with only 3 stages?',
        figure: null,
        options: ['Butterfly', 'Mosquito', 'Beetle', 'Grasshopper'],
        answer: 3,
        explain: 'Grasshopper: egg → nymph → adult (3 stages). Butterfly, mosquito and beetle all have 4 stages with a pupa.' },
      { id: 'lc-008', type: 'mcq', level: 2,
        stem: 'Kumar observed an animal. Its young did not look like the adult, and later it went through a stage in which it did not feed or move from place to place. Which animal could it be?',
        figure: null,
        options: ['Cockroach', 'Beetle', 'Grasshopper', 'Chicken'],
        answer: 1,
        explain: 'The stage that does not feed or move from place to place is a pupa, and the young that does not look like the adult is a larva. Only the beetle (egg → larva → pupa → adult) has these. The cockroach, grasshopper and chicken have no pupa, and their young look like the adults.' },
      { id: 'lc-009', type: 'mcq', level: 1,
        stem: 'What is germination?',
        figure: null,
        options: ['When a seed starts to grow into a new plant', 'When a flower turns into a fruit', 'When a plant makes new seeds', 'When a seed is carried away from its parent plant'],
        answer: 0,
        explain: 'Germination is when a seed starts to grow. The seed coat splits and a root, then a shoot, grow out.' },
      { id: 'lc-010', type: 'mcq', level: 1,
        stem: 'When a seed germinates, which part grows out of the seed first?',
        figure: null,
        options: ['The shoot', 'The leaves', 'The root', 'The flower'],
        answer: 2,
        explain: 'The root comes out first and grows downwards to hold the seedling in place and take in water. The shoot comes out after.' },
      { id: 'lc-011', type: 'mcq', level: 1,
        stem: 'Which of these does a seed need in order to germinate?',
        figure: null,
        options: ['Water, light and soil', 'Air, light and soil', 'Water, air and warmth', 'Water, soil and fertiliser'],
        answer: 2,
        explain: 'A seed needs water, air and warmth to germinate. It does not need light or soil — seeds can germinate on wet cotton wool in the dark.' },
      { id: 'lc-012', type: 'mcq', level: 2,
        stem: 'The diagram shows the life cycle of a butterfly. In which stage(s) does the butterfly feed?',
        figure: cycle(['Egg', 'A', 'B', 'Adult']),
        options: ['A only', 'B only', 'A and the adult only', 'B and the adult only'],
        answer: 2,
        explain: 'A is the larva (caterpillar), which eats leaves. B is the pupa, which does not feed. The adult butterfly feeds too: it sucks nectar from flowers. The egg does not feed.' },
      { id: 'lc-013', type: 'mcq', level: 2,
        stem: 'The diagram shows the life cycle of a mealworm beetle. A mealworm is the young that hatches from the egg and eats a lot. Stage Y does not feed and does not move from place to place. What are stages X and Y?',
        figure: cycle(['Egg', 'X', 'Y', 'Adult beetle']),
        options: ['X is a nymph, Y is a pupa', 'X is a pupa, Y is a larva', 'X is a larva, Y is a nymph', 'X is a larva, Y is a pupa'],
        answer: 3,
        explain: 'A beetle has 4 stages: egg → larva → pupa → adult. The mealworm is the larva (X): it eats a lot and does not look like the adult. The pupa (Y) does not feed. A nymph is the young of a cockroach or grasshopper.' },
      { id: 'lc-014', type: 'mcq', level: 2,
        stem: 'The diagram shows the life cycle of a frog. Which statement about stage X is correct?',
        figure: cycle(['Egg', 'X', 'Adult frog']),
        options: ['It lives in water and has a tail', 'It has wings and lives on land', 'It does not feed and stays in a case', 'It looks like a small adult frog'],
        answer: 0,
        explain: 'X is the tadpole. It lives in water and has a tail; at first it has no legs, so it does not look like the adult frog. (A tadpole that has grown legs is sometimes called a froglet; some books draw it as a separate stage.)' },
      { id: 'lc-015', type: 'mcq', level: 2,
        stem: 'Where does a mosquito usually lay its eggs?',
        figure: null,
        options: ['On the underside of leaves', 'In dry soil', 'Inside fruits', 'On the surface of still (stagnant) water'],
        answer: 3,
        explain: 'Mosquitoes lay eggs on still water. The larva and pupa that hatch live in the water.' },
      { id: 'lc-016', type: 'mcq', level: 2,
        stem: 'We are told to turn over pails and empty water from flower-pot plates. How does this help to reduce the number of mosquitoes?',
        figure: null,
        options: ['The larva and pupa live in water, so the life cycle is broken', 'Adult mosquitoes need the water to drink, so they will die of thirst', 'Mosquito eggs can only hatch on dry ground, so the eggs will dry up', 'The water helps the wings of young mosquitoes to grow'],
        answer: 0,
        explain: 'The egg, larva and pupa of the mosquito all need water. No stagnant water means the life cycle is broken and fewer adults are produced.' },
      { id: 'lc-017', type: 'mcq', level: 2,
        stem: 'Which statement about a cockroach nymph is correct?',
        figure: null,
        options: ['It looks like the adult but has no wings', 'It does not feed until it becomes an adult', 'It will turn into a pupa before it becomes an adult', 'It lives in water and breathes at the surface'],
        answer: 0,
        explain: 'A nymph looks like a small adult without wings. It feeds, moults as it grows, and becomes an adult directly — there is no pupa stage.' },
      { id: 'lc-018', type: 'mcq', level: 2,
        stem: 'In which pair do BOTH animals have young that look like their adults?',
        figure: null,
        options: ['Butterfly and frog', 'Mosquito and grasshopper', 'Chicken and cockroach', 'Beetle and chicken'],
        answer: 2,
        explain: 'A chick looks like a small chicken, and a cockroach nymph looks like a small cockroach without wings. Butterfly, frog, mosquito and beetle young look very different from their adults.' },
      { id: 'lc-019', type: 'mcq', level: 2,
        stem: 'What is one similarity between the life cycle of a butterfly and the life cycle of a mosquito?',
        figure: null,
        options: ['Both have a pupa stage', 'Both lay their eggs in water', 'Both larvae live on land', 'Both have 3 stages'],
        answer: 0,
        explain: 'Both have 4 stages: egg, larva, pupa and adult. Only the mosquito lays eggs in water and has larvae that live in water.' },
      { id: 'lc-020', type: 'mcq', level: 2,
        stem: 'What is one difference between the life cycle of a grasshopper and the life cycle of a beetle?',
        figure: null,
        options: ['The grasshopper does not lay eggs', 'The beetle has a nymph stage', 'The grasshopper has no pupa stage', 'The young grasshopper does not look like its adult'],
        answer: 2,
        explain: 'Grasshopper: egg → nymph → adult (no pupa). Beetle: egg → larva → pupa → adult. Both lay eggs.' },
      { id: 'lc-021', type: 'mcq', level: 2,
        stem: 'The table shows the number of days animal X spent in each stage of its life cycle. In which stage did it spend the longest time?',
        figure: daysTable,
        options: ['Egg', 'Larva', 'Pupa', 'Adult'],
        answer: 1,
        explain: 'Compare the numbers: egg 4, larva 18, pupa 9, adult 14. The largest is 18 days, the larva stage.' },
      { id: 'lc-022', type: 'mcq', level: 2,
        stem: 'The table shows the number of days animal X spent in each stage of its life cycle. How many days after the egg was laid did the adult of animal X come out?',
        figure: daysTable,
        options: ['22 days', '27 days', '31 days', '45 days'],
        answer: 2,
        explain: 'The adult comes out after the egg, larva and pupa stages: 4 + 18 + 9 = 31 days. Do not add the 14 days of the adult stage.' },
      { id: 'lc-023', type: 'mcq', level: 2,
        stem: 'A caterpillar sheds its skin several times. Why?',
        figure: null,
        options: ['So that it can grow bigger', 'So that it can turn into an adult at once', 'To keep itself warm', 'Because it is sick'],
        answer: 0,
        explain: 'The caterpillar\'s skin does not grow with it, so it sheds (moults) the old skin to grow bigger. Nymphs of cockroaches and grasshoppers moult too.' },
      { id: 'lc-024', type: 'mcq', level: 2,
        stem: 'The boxes show four stages of a plant\'s life cycle, mixed up. Which is the correct order?',
        figure: tbl(['P', 'Q', 'R', 'S'], [['Young plant', 'Seed', 'Adult plant with flowers and fruits', 'Seedling']]),
        options: ['Q → P → S → R', 'Q → S → P → R', 'S → Q → P → R', 'R → Q → S → P'],
        answer: 1,
        explain: 'Seed (Q) → seedling (S) → young plant (P) → adult plant with flowers and fruits (R). The fruits hold seeds, so the cycle starts again.' },
      { id: 'lc-025', type: 'mcq', level: 2,
        stem: 'Which describes a tadpole that has just hatched?',
        figure: null,
        options: ['It has four legs and no tail', 'It has two legs and lives on land', 'It has wings', 'It has a tail and no legs'],
        answer: 3,
        explain: 'A newly hatched tadpole lives in water and has a tail but no legs. Legs grow later, back legs first.' },
      { id: 'lc-026', type: 'mcq', level: 1,
        stem: 'Which of these is NOT a stage in the life cycle of a frog?',
        figure: null,
        options: ['Egg', 'Tadpole', 'Pupa', 'Adult'],
        answer: 2,
        explain: 'Frog: egg → tadpole → (froglet) → adult. A pupa stage is found in insects like the butterfly and mosquito, not in frogs.' },
      { id: 'lc-027', type: 'mcq', level: 3,
        stem: 'Green bean seeds were given the conditions in the table. In which set-up(s) would the seeds germinate?',
        figure: germTable4,
        options: ['A only', 'A and D only', 'A, B and D only', 'A, B, C and D'],
        answer: 1,
        explain: 'Seeds need water, air and warmth. A and D have all three. Light is not needed, so D (dark) still germinates. B has no water and C is too cold.' },
      { id: 'lc-028', type: 'mcq', level: 3,
        stem: 'Ali wants to find out if seeds need water to germinate. Which TWO set-ups should he compare?',
        figure: fairPick,
        options: ['P and R', 'P and Q', 'Q and S', 'R and S'],
        answer: 1,
        explain: 'P and Q differ ONLY in water (wet vs dry); temperature and light are the same. That is a fair test. Q and S also differ in temperature; R and S also differ in light.' },
      { id: 'lc-029', type: 'mcq', level: 2,
        stem: 'Mei put 10 seeds in each dish instead of only 1 seed. Why?',
        figure: null,
        options: ['So that the seeds will germinate faster', 'So that the result is more reliable', 'So that the plants will grow taller', 'So that less water is needed'],
        answer: 1,
        explain: 'One seed might be damaged or dead and not germinate for a reason that has nothing to do with the test. Using many seeds makes the result more reliable.' },
      { id: 'lc-030', type: 'mcq', level: 2,
        stem: 'The larva and the pupa of a mosquito both live in water. Which statement shows a difference between them?',
        figure: null,
        options: ['The larva feeds but the pupa does not', 'The pupa feeds but the larva does not', 'The larva lives on land but the pupa lives in water', 'The pupa has wings but the larva does not'],
        answer: 0,
        explain: 'The larva feeds and grows; the pupa does not feed while its body changes into the adult. Both live in water and take in air at the surface. Only the adult has wings.' },
      { id: 'lc-031', type: 'mcq', level: 3,
        stem: 'The diagram shows the life cycle of an animal. Stage Y looks like the adult but is smaller and has no wings. Which animal could it be?',
        figure: cycle(['Egg', 'Y', 'Adult']),
        options: ['Butterfly', 'Frog', 'Cockroach', 'Mosquito'],
        answer: 2,
        explain: 'A 3-stage life cycle with a young that looks like the adult but has no wings: egg → nymph → adult. That is the cockroach.' },
      { id: 'lc-032', type: 'mcq', level: 3,
        stem: 'A few days after a seed germinates, its seed leaves become smaller, shrivel and drop off. Why?',
        figure: null,
        options: ['The seedling has used up the food stored in the seed leaves', 'The seedling did not get enough light', 'Insects have eaten the seed leaves', 'The seed leaves have turned into roots'],
        answer: 0,
        explain: 'The seed leaves store food for the young seedling. As the seedling grows, it uses up this food, so the seed leaves shrivel and fall off.' },
      { id: 'lc-033', type: 'mcq', level: 2,
        stem: 'Which statement about life cycles is correct?',
        figure: null,
        options: ['All animals have 4 stages in their life cycle', 'All young animals look like their parents', 'Plants do not have life cycles', 'Different animals can have different numbers of stages'],
        answer: 3,
        explain: 'A butterfly has 4 stages but a cockroach has 3. Plants have life cycles too: seed → seedling → young plant → adult plant.' },

      // ---------- OEQ ----------
      { id: 'lc-040', type: 'oeq', level: 1, marks: 2,
        stem: 'Name the four stages in the life cycle of a butterfly, in the correct order.',
        figure: null,
        model: 'Egg → larva (caterpillar) → pupa (chrysalis) → adult butterfly.',
        keys: [['larva', 'caterpillar'], ['pupa', 'chrysalis']],
        explain: 'Markers look for larva/caterpillar and pupa in the middle, in the right order between egg and adult.' },
      { id: 'lc-041', type: 'oeq', level: 1, marks: 1,
        stem: 'What is the young of a grasshopper called?',
        figure: null,
        model: 'A nymph.',
        keys: [['nymph']],
        explain: 'Grasshoppers and cockroaches: egg → nymph → adult. Do not call it a larva.' },
      { id: 'lc-042', type: 'oeq', level: 1, marks: 3,
        stem: 'State the three conditions a seed needs in order to germinate.',
        figure: null,
        model: 'Water, air and warmth (a suitable temperature).',
        keys: [['water'], ['air', 'oxygen'], ['warmth', 'warm', 'suitable temperature']],
        explain: 'Light and soil are NOT needed for germination — a common trap.' },
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
        explain: 'Each difference must compare BOTH animals, e.g. "tadpole has a tail BUT the adult frog has no tail".' },
      { id: 'lc-045', type: 'oeq', level: 2, marks: 2,
        stem: 'People are told to remove stagnant water around their homes. Using the life cycle of the mosquito, explain how this helps.',
        figure: null,
        model: 'Mosquitoes lay their eggs in stagnant water, and the larvae and pupae live in water. Without stagnant water, mosquitoes cannot complete their life cycle, so there will be fewer adult mosquitoes.',
        keys: [['lay eggs', 'larva', 'larvae', 'pupa', 'pupae', 'breed'], ['cannot complete', 'life cycle', 'fewer mosquitoes', 'fewer adult']],
        explain: 'Point 1: which stages need water. Point 2: the life cycle is broken, so fewer mosquitoes.' },
      { id: 'lc-046', type: 'oeq', level: 2, marks: 3,
        stem: 'The table shows the life cycles of the cockroach and the butterfly.\n(a) State one similarity between the two life cycles. (1 mark)\n(b) State one difference between the two life cycles. (1 mark)\n(c) Which of the two animals has a young that looks like its adult? (1 mark)',
        figure: compareTable,
        model: '(a) Both start as eggs / both have an egg and an adult stage. (b) The butterfly has a pupa stage but the cockroach does not (the cockroach has 3 stages, the butterfly has 4). (c) The cockroach: its nymph looks like the adult but is smaller and has no wings.',
        keys: [['egg', 'both'], ['pupa', 'number of stages', '3 stages', '4 stages'], ['cockroach']],
        explain: 'For a difference, mention both animals: "the butterfly has a pupa stage BUT the cockroach does not". The butterfly\'s young (caterpillar) does not look like the adult.' },
      { id: 'lc-047', type: 'oeq', level: 2, marks: 2,
        stem: 'The pupa of a butterfly does not eat. Explain how it can still stay alive and change into an adult.',
        figure: null,
        model: 'As a caterpillar (larva), it ate a lot of food. The pupa uses the food stored from the larva stage.',
        keys: [['caterpillar', 'larva'], ['food', 'ate', 'stored']],
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
        explain: 'Classic trap: a fridge is both dark and cold. Seeds do not need light to germinate. To test light, keep the temperature the same and change only the light.' },
      { id: 'lc-050', type: 'oeq', level: 3, marks: 2,
        stem: 'Mei did the experiment in the table to find out if seeds need water to germinate. (a) What did she change? (b) What did she measure?',
        figure: meiExp,
        model: '(a) Whether the cotton wool was wet or dry (the presence of water). (b) The number of seeds that germinated.',
        keys: [['water', 'wet', 'dry'], ['number of seeds', 'germinated']],
        explain: 'Change one thing (water). Measure the result (number of seeds that germinated).' },
      { id: 'lc-051', type: 'oeq', level: 2, marks: 2,
        stem: 'Mei did the experiment in the table to find out if seeds need water to germinate. Name two things she must keep the same in both dishes to make it a fair test.',
        figure: meiExp,
        model: 'Any two: the type of seed, the number of seeds, the amount of cotton wool, the size of the dish, the place / temperature.',
        keys: [['type of seed', 'kind of seed', 'number of seeds', 'size of seed'], ['cotton wool', 'dish', 'place', 'temperature', 'light']],
        explain: 'Everything except the water must be the same, so that only water can cause the difference.' },
      { id: 'lc-052', type: 'oeq', level: 2, marks: 1,
        stem: 'Mei did the experiment in the table to find out if seeds need water to germinate. Only 9 of the 10 seeds in dish A germinated. Why was it better to use 10 seeds in each dish instead of 1?',
        figure: meiExp,
        model: 'Some seeds may not germinate even with water (they may be damaged or dead), so using more seeds makes the result more reliable.',
        keys: [['reliable', 'may not germinate', 'damaged', 'dead']],
        explain: 'If she had used just one seed and it happened to be dead, she would wrongly conclude water does not help.' },
      { id: 'lc-053', type: 'oeq', level: 2, marks: 1,
        stem: 'A mosquito larva keeps swimming up to the surface of the water. Why?',
        figure: null,
        model: 'To take in air (to breathe).',
        keys: [['air', 'breathe', 'oxygen']],
        explain: 'The larva and pupa live in water but take in air at the water surface.' },
      { id: 'lc-054', type: 'oeq', level: 3, marks: 2,
        stem: 'The table shows the life cycles of animals A, B and C. Which animal could be a grasshopper? Give a reason.',
        figure: threeAnimals,
        model: 'A. A grasshopper has a 3-stage life cycle (egg, nymph, adult) with no pupa stage.',
        keys: [['A'], ['nymph', 'no pupa', '3 stages', 'three stages']],
        explain: 'B is a 4-stage insect like a butterfly or beetle; C is a frog.' },
      { id: 'lc-055', type: 'oeq', level: 2, marks: 2,
        stem: 'Kumar said, "All young animals look like their parents." Using one example, explain why he is wrong.',
        figure: null,
        model: 'A caterpillar (larva) does not look like the adult butterfly. / A tadpole does not look like the adult frog.',
        keys: [['butterfly', 'caterpillar', 'larva', 'mosquito', 'beetle', 'frog', 'tadpole'], ['does not look like', 'different', 'not like']],
        explain: 'Name an animal whose young looks different, and say that it does not look like the adult.' },
      { id: 'lc-056', type: 'oeq', level: 2, marks: 3,
        stem: 'The diagram shows the life cycle of a frog.\n(a) Name stage B. (1 mark)\n(b) Where does a frog lay its eggs? (1 mark)\n(c) State one way in which stage B is different from the adult frog. (1 mark)',
        figure: cycle(['Egg', 'B', 'Adult frog']),
        model: '(a) Tadpole. (b) In water (for example, in a pond), in a jelly. (c) Stage B has a tail but the adult frog has no tail. / Stage B lives only in water but the adult frog can live on land and in water.',
        keys: [['tadpole'], ['water', 'pond'], ['tail', 'only in water', 'land']],
        explain: 'For (c), compare BOTH: "B has a tail BUT the adult has no tail". A tadpole that has grown legs is sometimes called a froglet, but it is still before the adult stage.' },
      { id: 'lc-057', type: 'oeq', level: 3, marks: 2,
        stem: 'A butterfly lays its eggs on the underside of the leaves of one kind of plant. Give two reasons why.',
        figure: null,
        model: 'When the caterpillars hatch, the leaves are food they can eat straight away. Under the leaf, the eggs are hidden from predators (birds) and protected from rain and hot sun.',
        keys: [['food', 'eat', 'feed'], ['hidden', 'predators', 'birds', 'rain', 'sun', 'protect']],
        explain: 'Reason 1: food for the larva. Reason 2: protection for the eggs.' },
      { id: 'lc-058', type: 'oeq', level: 3, marks: 2,
        stem: 'Jane put green bean seeds on wet cotton wool inside a dark cupboard at room temperature. After 3 days, the seeds germinated. What does this tell you about germination?',
        figure: null,
        model: 'Seeds do not need light to germinate. They only need water, air and warmth.',
        keys: [['light'], ['not need', 'do not need', 'not needed', 'not necessary']],
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
        explain: '"After hatching" means the egg stage is over, so do not count the 5 egg days. P hatched as a larva, spent 14 days as a larva and 10 days as a pupa: 14 + 10 = 24 days. 29 days wrongly adds the egg stage too.' },
      { id: 'lc-061', type: 'mcq', level: 3,
        stem: 'Insects J and K both have 4-stage life cycles. The bar chart shows the number of days each spent as an egg, a larva and a pupa. On the 18th day after hatching, which stage was each insect in?',
        figure: daysJK,
        options: ['J: larva, K: larva', 'J: pupa, K: pupa', 'J: adult, K: larva', 'J: pupa, K: larva'],
        answer: 3,
        explain: 'Count from hatching, so skip the egg bars. J was a larva for 15 days after hatching, then a pupa until day 22, so on day 18 J was a pupa. K was a larva for 20 days after hatching, so on day 18 K was still a larva. If you wrongly add the egg days, J would seem to be a larva.' },
      { id: 'lc-062', type: 'oeq', level: 3, marks: 4,
        stem: 'The bar chart shows the number of days a type of mosquito spends in each stage. The adult male and the adult female live for different lengths of time.\n(a) How many days after hatching does the mosquito become an adult? (1 mark)\n(b) How many days does a female mosquito live altogether, from the day its egg is laid? (1 mark)\n(c) People are asked to empty stagnant water around their homes at least once every 7 days. Using the bar chart, explain how this stops new adult mosquitoes from coming out. (2 marks)',
        figure: daysMozzie,
        model: '(a) 8 days (6 days as a larva + 2 days as a pupa). (b) 38 days (2 + 6 + 2 + 28). (c) The egg, larva and pupa live in water and need 2 + 6 + 2 = 10 days in the water to become an adult. If the water is emptied every 7 days, they are removed before they can become adults, so the life cycle is broken and no new adults come out.',
        keys: [['8 days'], ['38'], ['10 days'], ['before they can become adults', 'life cycle is broken', 'broken']],
        explain: '(a) After hatching: skip the egg. (b) From the egg: add egg, larva, pupa and the female adult (not the male bar). (c) Evidence: 10 days in water is longer than 7 days. Reason: the young are removed before they become adults, so the life cycle is broken.' },
      { id: 'lc-063', type: 'mcq', level: 3,
        stem: 'A butterfly has a 4-stage life cycle. The graph shows how its body mass changed from the day its egg was laid. W, X, Y and Z are its four stages. Which shows the larva stage and the pupa stage?',
        figure: massGraph,
        options: ['Larva: W, pupa: X', 'Larva: X, pupa: Z', 'Larva: Y, pupa: Z', 'Larva: X, pupa: Y'],
        answer: 3,
        explain: 'The larva eats the most, so its mass rises the fastest: that is X. The pupa does not feed, so its mass stays the same: that is Y, right after the larva. W is the egg and Z is the adult.' },
      { id: 'lc-064', type: 'oeq', level: 3, marks: 4,
        stem: 'A beetle has a 4-stage life cycle: egg, larva, pupa and adult. Lily kept a beetle egg in a box with food. Each week she recorded the mass of food eaten. The bar chart shows her results.\n(a) Which stage was the beetle in during week 4? (1 mark)\n(b) In which weeks was the beetle a pupa? (1 mark)\n(c) Lily\'s brother said, "The beetle was dead in weeks 5 and 6 because it ate nothing." Do you agree? Explain your answer using the bar chart. (2 marks)',
        figure: beetleFood,
        model: '(a) Larva. (b) Weeks 5 and 6. (c) No, I do not agree. The beetle ate food again in week 7, so it was alive. In weeks 5 and 6 it was a pupa, which does not feed but is alive and changing into an adult.',
        keys: [['larva'], ['5 and 6'], ['week 7', 'ate food again'], ['pupa', 'does not feed', 'changing into an adult']],
        explain: 'Week 1 (nothing eaten) is the egg. Weeks 2 to 4 (eating more and more) are the larva. The pupa does not feed, so weeks 5 and 6 show 0. In week 7 the adult beetle eats again. Claim (No) + evidence (ate in week 7) + reason (the pupa does not feed but is alive).' },
      { id: 'lc-065', type: 'mcq', level: 2,
        stem: 'The drawings J, K and L show three stages in the life cycle of a plant, in a mixed-up order. At which stage can the plant FIRST make its own food, and why?',
        figure: plantPics,
        options: ['L, because it has green leaves', 'K, because it has food stored inside it', 'J, because it has flowers and fruits', 'K, because it can take in water'],
        answer: 0,
        explain: 'The order is seed (K) → young plant (L) → adult plant (J). A plant makes its own food in its leaves, so it can first make food at the young plant stage, once it has leaves. The seed uses food stored inside it. The adult plant also makes food, but it comes later.' },
      { id: 'lc-066', type: 'oeq', level: 3, marks: 3,
        stem: 'Farmer Lim grows chilli plants. The diagram shows the life cycle of a chilli plant. Each season he sells most of the chillies he harvests, but he keeps some of the seeds.\n(a) At which stage of its life cycle does a chilli plant bear chillies (fruits)? (1 mark)\n(b) Explain how keeping some seeds gives Farmer Lim a continuous supply of chilli plants. (2 marks)',
        figure: cycle(['Seed', 'Young plant', 'Adult plant']),
        model: '(a) The adult plant stage. (b) He plants the seeds next season. They germinate and grow into new adult plants. These adult plants bear flowers and fruits with new seeds, so the life cycle repeats and he always has chilli plants.',
        keys: [['adult plant', 'adult'], ['grow into new adult plants', 'grow into adult plants', 'germinate'], ['new seeds', 'life cycle repeats', 'bear flowers and fruits']],
        explain: '(a) Only the adult plant bears flowers and fruits; the chillies are its fruits, with seeds inside. (b) Point 1: the kept seeds grow into adult plants. Point 2: those adults reproduce (make fruits with new seeds), so the cycle continues every season.' },
      { id: 'lc-067', type: 'mcq', level: 3,
        stem: 'The diagram shows the life cycle of a plant. Which of these statements are correct?\nA: Stage P has leaves, so it can make its own food.\nB: Only the adult plant bears flowers and fruits.\nC: The seed needs light to germinate.',
        figure: cycle(['Seed', 'P', 'Adult plant']),
        options: ['A and B only', 'A and C only', 'B and C only', 'A, B and C'],
        answer: 0,
        explain: 'P is the young plant. A is correct: it has leaves, so it can make its own food. B is correct: flowers and fruits appear only on the adult plant. C is wrong: a seed needs water, air and warmth to germinate, not light.' },
      { id: 'lc-068', type: 'oeq', level: 3, marks: 4,
        stem: 'Ali put 10 mosquito larvae into each of two tanks of water, A and B. He poured a thin layer of oil on the water in tank B. The drawing shows a larva in each tank. After two days, the larvae in tank A were alive, but all the larvae in tank B had died.\n(a) Why does a mosquito larva come up to the surface of the water? (1 mark)\n(b) Explain why the larvae in tank B died. (2 marks)\n(c) Explain how a layer of oil on stagnant water can reduce the number of adult mosquitoes. (1 mark)',
        figure: oilTanks,
        model: '(a) To take in air (to breathe) through its breathing tube. (b) The layer of oil stopped the breathing tube from reaching the air, so the larvae could not take in air and died. (c) The larvae die before they can become pupae and adults, so the life cycle is broken and there are fewer adult mosquitoes.',
        keys: [['air', 'breathe'], ['oil stopped the breathing tube', 'reaching the air', 'oil'], ['could not take in air', 'cannot take in air', 'could not breathe'], ['before they can become', 'life cycle is broken', 'fewer adult']],
        explain: '(b) Evidence: the breathing tube touches the oil, not the air. Reason: the larva cannot take in air, so it dies. (c) Dead larvae never become pupae or adults.' },
      { id: 'lc-069', type: 'mcq', level: 3,
        stem: 'Scientists release special male mosquitoes. When these males mate with female mosquitoes, the eggs that the females lay do not hatch. Which of these statements are correct?\nA: No larvae come out of these eggs.\nB: Fewer adult mosquitoes are produced later.\nC: The special male mosquitoes lay eggs that do not hatch.',
        figure: null,
        options: ['A only', 'A and B only', 'B and C only', 'A, B and C'],
        answer: 1,
        explain: 'A: the eggs do not hatch, so no larvae come out. B: with no larvae there are no pupae and no new adults, so the number of mosquitoes falls. C is wrong: male mosquitoes do not lay eggs; the females do. (Singapore\'s NEA uses this idea in Project Wolbachia.)' },
      { id: 'lc-070', type: 'oeq', level: 3, marks: 3,
        stem: 'Scientists followed 200 eggs laid by butterflies in a garden and counted how many were still alive at each stage. The table shows their results.\n(a) Suggest one reason why fewer of the young were left at each stage. (1 mark)\n(b) A butterfly lays many eggs. Explain how this helps the butterfly\'s kind to survive. (2 marks)',
        figure: tbl(['Stage', 'Number still alive'], [['Egg', '200'], ['Larva', '60'], ['Pupa', '15'], ['Adult', '8']]),
        model: '(a) Many eggs and young were eaten by predators such as birds and ants (or destroyed by heavy rain). (b) Even though many eggs and young are eaten or destroyed, enough of them survive to become adults. These adults reproduce and lay eggs, so the butterfly\'s kind does not die out.',
        keys: [['eaten', 'predators', 'birds', 'ants', 'destroyed', 'rain'], ['enough of them survive', 'survive to become adults'], ['reproduce', 'lay eggs', 'does not die out']],
        explain: 'Only 8 out of 200 became adults. If the butterfly laid only a few eggs, maybe none would survive. Point 1: some survive to become adults. Point 2: they reproduce, so the kind continues.' },
      { id: 'lc-071', type: 'mcq', level: 3,
        stem: 'The table shows the life cycles of the grasshopper and the mosquito. Which of these statements are correct for BOTH animals?\nA: The young looks like the adult.\nB: The young sheds its skin (moults) as it grows.\nC: The whole life cycle takes place on land.',
        figure: tbl(['Animal', 'Stages in its life cycle'], [['Grasshopper', 'egg → nymph → adult'], ['Mosquito', 'egg → larva → pupa → adult']]),
        options: ['A only', 'B only', 'A and B only', 'B and C only'],
        answer: 1,
        explain: 'B is true for both: a grasshopper nymph and a mosquito larva both moult to grow. A is true only for the grasshopper; a mosquito larva does not look like the adult. C is true only for the grasshopper; the mosquito\'s egg, larva and pupa live in water.' },
      { id: 'lc-072', type: 'mcq', level: 3,
        stem: 'The table shows the life cycles of the chicken and the mosquito. Which of these statements are correct?\nA: The young of the chicken looks like its adult, but the young of the mosquito does not.\nB: All the stages of the mosquito live on land.\nC: The mosquito has one more stage in its life cycle than the chicken.',
        figure: tbl(['Animal', 'Stages in its life cycle'], [['Chicken', 'egg → chick → adult'], ['Mosquito', 'egg → larva → pupa → adult']]),
        options: ['A and B only', 'B and C only', 'A and C only', 'A, B and C'],
        answer: 2,
        explain: 'A is correct: a chick looks like a small chicken, but a mosquito larva does not look like the adult. B is wrong: the egg, larva and pupa live in water; only the adult lives on land. C is correct: 4 stages vs 3 stages.' },
      { id: 'lc-073', type: 'mcq', level: 3,
        stem: 'Which of these statements about the life cycles of the frog and the chicken are correct?\nA: Both lay eggs.\nB: The young of both look like their adults.\nC: Both have 3 stages in their life cycles.',
        figure: null,
        options: ['A only', 'A and B only', 'B and C only', 'A and C only'],
        answer: 3,
        explain: 'A is correct: both lay eggs. B is wrong: a chick looks like a small chicken, but a tadpole does not look like a frog. C is correct: most exam papers show the frog with 3 stages (egg → tadpole → adult frog), the same number as the chicken (egg → chick → adult). If your book draws a froglet as a 4th stage, follow your book.' },
      { id: 'lc-074', type: 'oeq', level: 3, marks: 3,
        stem: 'Siti put 10 green bean seeds in each of three dishes, A, B and C, and placed them in the same warm room. The table shows what she did and her results after 5 days.\n(a) Which two set-ups should she compare to show that seeds need water to germinate? (1 mark)\n(b) The seeds in B had plenty of water but did not germinate. Explain why. (2 marks)',
        figure: tbl(['Set-up', 'What Siti did', 'Germinated?'], [['A', 'seeds on wet cotton wool', 'Yes'], ['B', 'seeds kept completely under water, with a layer of oil on top of the water', 'No'], ['C', 'seeds on dry cotton wool', 'No']]),
        model: '(a) A and C. (b) The seeds in B were completely under water and the oil stopped air from reaching the water, so the seeds had no air. Seeds need air to germinate.',
        keys: [['A and C'], ['no air', 'stopped air'], ['need air']],
        explain: 'A and C differ only in water. In B there is water and warmth but no air, and seeds need water, air AND warmth to germinate. Claim + evidence (no air reached the seeds) + reason (seeds need air).' },
      { id: 'lc-075', type: 'mcq', level: 3,
        stem: 'Ali kept a cockroach nymph in a box and fed it every day. He measured its length at the end of each week. The table shows his results. What most likely happened between week 2 and week 3?',
        figure: tbl(['Week', 'Length of nymph (mm)'], [['1', '8'], ['2', '8'], ['3', '12'], ['4', '12'], ['5', '17']]),
        options: ['It shed its skin and then grew bigger', 'It became a pupa and then grew bigger', 'It stopped feeding and then grew bigger', 'It grew wings and then grew bigger'],
        answer: 0,
        explain: 'A nymph\'s outer skin cannot stretch, so it sheds (moults) its old skin to grow bigger. That is why its length goes up in steps. A cockroach has no pupa stage, and it gets wings only when it becomes an adult.' }
    ]
  });
})();
