"use strict";
/* Math Quest Island topic: p4area (P4). Self-contained.
 * Authoring rules + registration shape: js/topics/README.md
 *
 * Scope (MOE Oct 2025, p.39, MEASUREMENT AND GEOMETRY / AREA AND VOLUME / 1. Area and Perimeter):
 *   1.1 finding one dimension of a rectangle given the other dimension and its area/perimeter
 *   1.2 finding the length of one side of a square given its area/perimeter
 *   1.3 finding the area and perimeter of composite figures made up of rectangles and squares
 * NOT here: concepts of area/perimeter and area of a plain rectangle/square (P3, topic
 * `geometry`); area of a triangle (P5); volume (P5).
 *
 * Composite figures are either DESCRIBED in words with every dimension stated, or
 * RENDERED as an inline-styled L-shape whose six sides ALL carry a printed number
 * label a child can read on screen. Nothing lives in a data-* attribute: the harness
 * oracle re-derives area and perimeter by parsing those same printed labels.
 */
(function () {
  const G = MQI.gen;
  const ri = G.ri, pick = G.pick, finishNum = G.finishNum, finishTyped = G.finishTyped;

  /* finishNum prepends its own space to the unit, so these carry none. */
  const CM2 = 'cm²', CM = 'cm';
  const shuffle = G.shuffle;

  /* DEPTH PILOT 2026-09-05 (Kevin 23:02). PRINCIPLE for the L-shape bank: the
     perimeter of a composite figure is still the whole walk around the outside,
     and cutting a rectangular corner out of a rectangle leaves that walk exactly
     as long as it was. FORMAT BANK: direct compute on the rendered figure
     (gLPerimeter, gLArea), described in words (gLWords), concept check
     (gLConcept), error spotting (gLError), compare with a square (gLCompare),
     inverse from area (gLCornerInverse), two-step word problem (gLSkirting). */
  function mcNum(stem, extra, correct, cands, unit, explain){
    const seen = new Set([correct]); const d = [];
    for (const c of cands){
      if (d.length >= 3) break;
      if (!Number.isInteger(c) || c <= 0 || seen.has(c)) continue;
      seen.add(c); d.push(c);
    }
    const authored = d.length === 3;
    let t = 1;
    while (d.length < 3 && t < 80){
      if (!seen.has(correct + t)) { seen.add(correct + t); d.push(correct + t); }
      else if (correct - t > 0 && !seen.has(correct - t)) { seen.add(correct - t); d.push(correct - t); }
      t++;
    }
    const q = finishNum(stem, extra, correct, d, unit, explain);
    if (authored) q.authored = d;
    return q;
  }
  function mcText(stem, extra, correctText, wrongs, explain){
    const opts = shuffle([correctText].concat(wrongs.slice(0, 3)));
    return { q: stem, extra: extra || '', choices: opts, correct: opts.indexOf(correctText),
             explain: explain, answerText: correctText };
  }

  /* ---- COINCIDENCE BAN (refutation kill 3, 2026-09-05) --------------------
     paOk: no figure in this file may print the same number for its perimeter
     and its area. optsOk: every NAMED distractor is a positive integer,
     distinct from the key and from every other named distractor - finishNum
     shuffles the candidate list, so the whole list has to be clean, and a
     clean list also means the padding branch never fires and the authored-
     distractor contract binds on every draw.
     (gCompositeWordsSub is exempt from paOk: a card with a hole in the middle
     has no single perimeter to coincide with, and it is never asked for one.) */
  function paOk(per, area){ return per !== area; }
  function optsOk(correct, cands){
    const s = new Set([correct]);
    for (const c of cands){
      if (!Number.isInteger(c) || c <= 0 || s.has(c)) return false;
      s.add(c);
    }
    return true;
  }
  /* WOUND 3 (refutation): the cut may never exceed two thirds of a side, or the
     L is a thin unbuildable sliver. Applied to every corner cut in this file. */
  const capCut = n => Math.max(2, Math.min(n - 3, Math.floor(2 * n / 3)));

  /* ---- rectangles and squares: find the missing dimension (1.1, 1.2) ---- */

  const RECT_CTX = [
    ['a rectangular notice board in the school hall', 'board'],
    ['a rectangular vegetable plot in the community garden', 'plot'],
    ['a rectangular tray of kaya toast', 'tray'],
    ['a rectangular sticker for the Children’s Day booth', 'sticker'],
    ['a rectangular photo of the Merlion', 'photo']
  ];
  const SQ_CTX = [
    ['a square floor tile at the void deck', 'tile'],
    ['a square handkerchief', 'handkerchief'],
    ['a square kite for the Marina Barrage', 'kite'],
    ['a square placemat at the hawker centre', 'placemat']
  ];

  /* pool 1: rectangle, area and one side given, find the other side */
  function gRectSideFromArea() {
    const c = pick(RECT_CTX);
    let l = 7, w = 4;
    /* never a square, and never a coincidence draw (perimeter = area) */
    do { l = ri(4, 15); w = ri(3, 12); } while (w === l || 2 * (l + w) === l * w);
    const area = w * l;
    return finishTyped(
      'Mei Ling has ' + c[0] + '. The ' + c[1] + ' has an area of ' + area +
      ' cm² and its length is ' + l + ' cm. What is its breadth, in cm?',
      w,
      'Area of a rectangle = length × breadth, so breadth = area ÷ length. ' +
      area + ' ÷ ' + l + ' = ' + w + ' cm.',
      'cm');
  }

  /* pool 1: square, perimeter given, find one side */
  function gSquareSideFromPerimeter() {
    const c = pick(SQ_CTX);
    let s = 5;
    do { s = ri(3, 20); } while (4 * s === s * s);   /* side 4: perimeter 16, area 16 */
    return finishTyped(
      'Ravi has ' + c[0] + '. The perimeter of the ' + c[1] + ' is ' + (4 * s) +
      ' cm. What is the length of one side, in cm?',
      s,
      'A square has 4 equal sides, so one side = perimeter ÷ 4. ' +
      (4 * s) + ' ÷ 4 = ' + s + ' cm.',
      'cm');
  }

  /* pool 2: rectangle, perimeter and one side given, find the other side */
  function gRectSideFromPerimeter() {
    const c = pick(RECT_CTX);
    let l = 8, w = 5;
    do { l = ri(4, 18); w = ri(3, 14); } while (w === l || 2 * (l + w) === l * w);
    const per = 2 * (w + l);
    return finishTyped(
      'Siti has ' + c[0] + '. The perimeter of the ' + c[1] + ' is ' + per +
      ' cm and its length is ' + l + ' cm. What is its breadth, in cm?',
      w,
      'Perimeter = 2 × (length + breadth), so length + breadth = ' + per + ' ÷ 2 = ' +
      (per / 2) + '. Then ' + (per / 2) + ' − ' + l + ' = ' + w + ' cm. ' +
      'Taking the length away from the whole perimeter is the usual slip.',
      'cm');
  }

  /* pool 2: square, area given, find one side (perfect squares only) */
  function gSquareSideFromArea() {
    const c = pick(SQ_CTX);
    let s = 5;
    do { s = ri(2, 15); } while (4 * s === s * s);   /* side 4: perimeter 16, area 16 */
    return finishTyped(
      'Kumar has ' + c[0] + '. The ' + c[1] + ' has an area of ' + (s * s) +
      ' cm². What is the length of one side, in cm?',
      s,
      'A square’s area = side × side. ' + s + ' × ' + s + ' = ' + (s * s) +
      ', so one side is ' + s + ' cm.',
      'cm');
  }

  /* ---- composite figures described in words (1.3) ---- */

  /* pool 2: two non-overlapping rectangles, total area by addition */
  function gCompositeWordsAdd() {
    const a = ri(3, 12), b = ri(2, 9), c = ri(3, 10), d = ri(2, 8);
    return finishTyped(
      'A badge is made of two rectangles that do not overlap. One rectangle measures ' +
      a + ' cm by ' + b + ' cm. The other measures ' + c + ' cm by ' + d +
      ' cm. What is the total area of the badge, in cm²?',
      a * b + c * d,
      'Work out each rectangle, then add. ' + a + ' × ' + b + ' = ' + (a * b) + ' and ' +
      c + ' × ' + d + ' = ' + (c * d) + '. Altogether ' + (a * b) + ' + ' + (c * d) +
      ' = ' + (a * b + c * d) + ' cm².',
      'cm²');
  }

  /* pool 3: big rectangle with a square hole cut out, area by subtraction */
  function gCompositeWordsSub() {
    const W = ri(8, 20), H = ri(6, 16);
    const s = ri(2, Math.min(W, H) - 3);
    return finishTyped(
      'A rectangular piece of card measures ' + W + ' cm by ' + H +
      ' cm. A square hole of side ' + s +
      ' cm is cut out from the middle of the card. What is the area of the card that is left, in cm²?',
      W * H - s * s,
      'Whole card: ' + W + ' × ' + H + ' = ' + (W * H) + ' cm². Hole: ' + s +
      ' × ' + s + ' = ' + (s * s) + ' cm². What is left is ' + (W * H) + ' − ' +
      (s * s) + ' = ' + (W * H - s * s) + ' cm².',
      'cm²');
  }

  /* ---- composite L-shape, RENDERED with every side labelled (1.3) ---- */

  const S = 11;   /* px per cm */

  /* An L-shape: a W x H rectangle with an a x b piece removed from the top-right.
     Sides clockwise from the top-left corner:
       top = W - a, cut down = b, cut across = a, right = H - b, bottom = W, left = H.
     Every one of the six is printed on the figure. */
  function makeL(extra) {
    let W = 13, H = 11, a = 4, b = 3, ok = false;
    for (let i = 0; i < 400 && !ok; i++) {
      W = ri(7, 16); H = ri(6, 14);
      a = ri(2, capCut(W)); b = ri(2, capCut(H));
      const per = 2 * (W + H), area = W * H - a * b;
      ok = paOk(per, area) && (!extra || extra({ W, H, a, b, per, area }));
    }
    if (!ok) { W = 13; H = 11; a = 4; b = 3; }
    const lab = (cls, v, css) =>
      '<span class="lf-' + cls + '" style="position:absolute;font-size:12px;font-weight:600;' +
      'color:#0f172a;background:#fff;padding:0 2px;' + css + '">' + v + '</span>';

    const w = W * S, h = H * S, aw = a * S, bh = b * S;
    let html = '<div class="lfig" style="display:inline-block;background:#fff;padding:16px 22px;' +
      'border-radius:8px;color:#0f172a">' +
      '<div style="position:relative;width:' + w + 'px;height:' + h + 'px">' +
      /* the L drawn as two solid blocks */
      '<div style="position:absolute;left:0;top:0;width:' + (w - aw) + 'px;height:' + bh +
      'px;background:#93c5fd;border:2px solid #1d4ed8;border-right:none;border-bottom:none;box-sizing:border-box"></div>' +
      '<div style="position:absolute;left:0;top:' + bh + 'px;width:' + w + 'px;height:' + (h - bh) +
      'px;background:#93c5fd;border:2px solid #1d4ed8;border-top:none;box-sizing:border-box"></div>' +
      '<div style="position:absolute;left:0;top:' + bh + 'px;width:' + (w - aw) +
      'px;height:2px;background:#93c5fd"></div>' +
      /* the six printed side lengths */
      lab('top', W - a, 'left:' + ((w - aw) / 2) + 'px;top:-9px;transform:translateX(-50%)') +
      lab('cutdown', b, 'left:' + (w - aw) + 'px;top:' + (bh / 2) + 'px;transform:translate(-50%,-50%)') +
      lab('cutacross', a, 'left:' + (w - aw / 2) + 'px;top:' + (bh - 9) + 'px;transform:translateX(-50%)') +
      lab('right', H - b, 'left:' + w + 'px;top:' + (bh + (h - bh) / 2) + 'px;transform:translate(-50%,-50%)') +
      lab('bottom', W, 'left:' + (w / 2) + 'px;top:' + (h - 9) + 'px;transform:translateX(-50%)') +
      lab('left', H, 'left:0;top:' + (h / 2) + 'px;transform:translate(-50%,-50%)') +
      '</div>' +
      '<div style="margin-top:10px;font-size:.85em;color:#475569">All lengths are in cm. ' +
      'Every side of the figure is labelled. The corners are all right angles.</div></div>';
    return { html, W, H, a, b, area: W * H - a * b, per: 2 * (W + H) };
  }

  /* pool 3: area of the rendered L-shape */
  function gLArea() {
    const g = makeL(x => optsOk(x.area, [x.W * x.H, x.per, x.a * x.b, x.area + x.a, x.area + 1]));
    const wrong = g.W * g.H;
    return finishNum(
      'What is the area of this figure?', g.html, g.area,
      [wrong, g.per, g.a * g.b, g.area + g.a, g.area + 1], CM2,
      'Take the whole ' + g.W + ' cm by ' + g.H + ' cm rectangle, ' + g.W + ' × ' + g.H +
      ' = ' + wrong + ' cm², then take away the ' + g.a + ' cm by ' + g.b +
      ' cm corner, ' + (g.a * g.b) + ' cm². ' + wrong + ' − ' + (g.a * g.b) +
      ' = ' + g.area + ' cm².');
  }

  /* pool 3: perimeter of the rendered L-shape */
  function gLPerimeter() {
    const g = makeL(x => optsOk(x.per, [x.area, x.W + x.H, x.per - x.a, x.per + x.a, x.per - 2 * x.b]));
    return finishNum(
      'What is the perimeter of this figure?', g.html, g.per,
      [g.area, g.W + g.H, g.per - g.a, g.per + g.a, g.per - 2 * g.b], CM,
      'Perimeter means all the way round, so add the six labelled sides: ' +
      (g.W - g.a) + ' + ' + g.b + ' + ' + g.a + ' + ' + (g.H - g.b) + ' + ' + g.W + ' + ' + g.H +
      ' = ' + g.per + ' cm. Missing out the two sides at the notch is the usual slip.');
  }

  /* pool 3: error spotting on the rendered figure, misconception named */
  /* KILL 1 (refutation, 67% of draws): the stem said Ravi adds "the four longest
     sides" while the two he omits - the notch sides a and b - were regularly NOT
     the two shortest, so a child who did exactly what the stem describes got a
     third number that was neither the key nor the printed claim. The premise is
     now made TRUE of the figure by construction: the draw is rejected unless both
     notch sides are strictly shorter than all four of the others, so "the four
     longest sides" names exactly the four Ravi added and the printed claim IS
     their sum. gen-sanity.mjs re-checks this from the six printed labels. */
  function gLError() {
    const g = makeL(x =>
      Math.max(x.a, x.b) < Math.min(x.W - x.a, x.H - x.b, x.W, x.H) &&
      optsOk(x.per, [x.per - x.a - x.b, x.area, x.W + x.H]));
    const claim = g.per - g.a - g.b;      /* the four longest sides, summed */
    return mcNum(
      'Ravi walks around this figure and adds up only the four longest sides. He says the perimeter is ' +
      claim + ' cm. <b>What is the correct perimeter of this figure?</b>', g.html,
      g.per, [claim, g.area, g.W + g.H], CM,
      'The four longest sides are ' + (g.W - g.a) + ' cm, ' + (g.H - g.b) + ' cm, ' + g.W +
      ' cm and ' + g.H + ' cm, and they add to ' + claim + ' cm. Ravi left out the two shortest sides, ' +
      'the ' + g.a + ' cm and the ' + g.b + ' cm at the notch. Every side of an L-shape is part of the ' +
      'walk around: ' + (g.W - g.a) + ' + ' + g.b + ' + ' + g.a + ' + ' + (g.H - g.b) + ' + ' + g.W +
      ' + ' + g.H + ' = ' + g.per + ' cm.');
  }

  /* pool 3: compare the figure with a square, and by how much */
  function gLCompare() {
    const g = makeL();
    let s = ri(3, 20), sOk = false;
    for (let i = 0; i < 200 && !sOk; i++) {
      s = ri(3, 20);
      sOk = 4 * s !== g.per && optsOk(Math.abs(g.per - 4 * s), [g.per, 4 * s, g.area]);
    }
    while (4 * s === g.per) s = ri(3, 20);
    const diff = Math.abs(g.per - 4 * s);
    const bigger = g.per > 4 * s ? 'the figure' : 'the square';
    return mcNum(
      'A square of side ' + s + ' cm sits beside this figure. <b>How much longer is the perimeter of ' +
      bigger + ' than the perimeter of the other shape?</b>', g.html,
      diff, [g.per, 4 * s, g.area], CM,
      'The figure: add the six labelled sides, ' + (g.W - g.a) + ' + ' + g.b + ' + ' + g.a + ' + ' +
      (g.H - g.b) + ' + ' + g.W + ' + ' + g.H + ' = ' + g.per + ' cm. The square: 4 × ' + s + ' = ' +
      (4 * s) + ' cm. The difference is ' + diff + ' cm. Comparing areas answers a different question.');
  }

  /* pool 2: the same figure DESCRIBED in words, every dimension stated */
  function gLWords() {
    let W = 12, H = 9, a = 4, b = 3, ok = false;
    for (let i = 0; i < 400 && !ok; i++) {
      W = ri(8, 18); H = ri(6, 15);
      a = ri(2, capCut(W)); b = ri(2, capCut(H));
      ok = paOk(2 * (W + H), W * H - a * b) &&
           optsOk(2 * (W + H), [2 * (W + H) - a - b, 2 * (W + H) - 2 * a - 2 * b, W * H - a * b]);
    }
    if (!ok) { W = 12; H = 9; a = 4; b = 3; }
    return mcNum(
      'A rectangular sheet of card is ' + W + ' cm long and ' + H + ' cm wide. A corner piece ' + a +
      ' cm by ' + b + ' cm is cut away, leaving an L-shape with right angles at every corner. ' +
      '<b>What is the perimeter of the L-shape?</b>', '',
      2 * (W + H), [2 * (W + H) - a - b, 2 * (W + H) - 2 * a - 2 * b, W * H - a * b], CM,
      'Slide the two cut sides back out to the corner: the ' + a + ' cm across and the ' + b +
      ' cm down replace exactly the pieces they removed. So the walk around is still 2 × (' + W +
      ' + ' + H + ') = ' + (2 * (W + H)) + ' cm. Cutting a rectangular corner changes the area, not the perimeter.');
  }

  /* pool 2: concept check on what the cut does */
  function gLConcept() {
    return mcText(
      'A rectangular corner is cut out of a rectangle to make an L-shape with right angles at every corner. ' +
      '<b>What happens to the perimeter?</b>', '',
      'It stays the same.',
      ['It gets smaller.', 'It gets bigger.', 'It is halved.'],
      'The two new sides at the notch are exactly as long as the two pieces removed from the old sides, ' +
      'so the total walk around is unchanged. The AREA does get smaller: that is the measurement the cut takes away.');
  }

  /* pool 3: inverse - the area is given, find the missing corner dimension */
  function gLCornerInverse() {
    let W = 12, H = 9, a = 4, b = 3, ok = false;
    for (let i = 0; i < 400 && !ok; i++) {
      W = ri(8, 16); H = ri(6, 14);
      a = ri(2, capCut(W)); b = ri(2, capCut(H));   /* wound 3: cut <= 2/3 of the side */
      ok = paOk(2 * (W + H), W * H - a * b) &&
           optsOk(b, [a, a * b, W * H - a * b - a]);
    }
    if (!ok) { W = 12; H = 9; a = 4; b = 3; }
    const area = W * H - a * b;
    return mcNum(
      'An L-shape is made from a ' + W + ' cm by ' + H + ' cm rectangle with a rectangular corner cut out. ' +
      'The corner cut out is ' + a + ' cm wide. The area of the L-shape is ' + area +
      ' cm². <b>How tall is the corner that was cut out?</b>', '',
      b, [a, W * H - area, area - a], CM,
      'Step 1: the whole rectangle is ' + W + ' × ' + H + ' = ' + (W * H) + ' cm², so the missing corner is ' +
      (W * H) + ' − ' + area + ' = ' + (a * b) + ' cm². Step 2: ' + (a * b) + ' ÷ ' + a + ' = ' + b +
      ' cm. Working backwards from the area is the whole move here.');
  }

  /* pool 3: two-step word problem in a Singapore context */
  function gLSkirting() {
    let W = 10, H = 8, rate = 5, a = 3, b = 2, ok = false;
    for (let i = 0; i < 400 && !ok; i++) {
      W = ri(6, 14); H = ri(5, 12); rate = ri(2, 9);
      a = ri(2, capCut(W)); b = ri(2, capCut(H));
      const p = 2 * (W + H);
      ok = paOk(p, W * H - a * b) &&
           optsOk(p * rate, [(W * H - a * b) * rate, (p - a - b) * rate, p]);
    }
    if (!ok) { W = 10; H = 8; rate = 5; a = 3; b = 2; }
    const per = 2 * (W + H);
    return mcNum(
      'An L-shaped kitchen floor is a ' + W + ' m by ' + H + ' m rectangle with a ' + a + ' m by ' + b +
      ' m corner taken out for a store room. Skirting board is fitted right around the edge of the floor at $' +
      rate + ' per metre. <b>What does the skirting cost altogether, in dollars?</b>', '',
      per * rate, [(W * H - a * b) * rate, (per - a - b) * rate, per], '',
      'Step 1: the edge of an L-shape cut from a rectangle is still 2 × (' + W + ' + ' + H + ') = ' + per +
      ' m, because the two cut sides replace the pieces they removed. Step 2: ' + per + ' × $' + rate +
      ' = $' + (per * rate) + '. Costing the floor area would buy tiles, not skirting.');
  }

  /* pool 2: MOVED HERE from the P3 `geometry` topic (refutation wound 1). Area in,
     perimeter out is MOE P4 1.1 - one dimension of a rectangle from the other and
     its area - and there is no inverse work at P3 at all. Stem unchanged so the
     existing gen-sanity oracle keeps binding. */
  function gPeriFromArea() {
    let B = 4, L = 7;
    do { B = ri(2, 9); L = ri(3, 12); }
    while (L === B || 2 * (L + B) === L * B ||
           !optsOk(2 * (L + B), [L * B, L + B, 2 * L + B]));
    const a = L * B, p = 2 * (L + B);
    return mcNum('A rectangular photo frame has an <b>area of ' + a + ' cm²</b> and a length of ' + L +
      ' cm. What is its <b>perimeter</b>?', '',
      p, [a, L + B, 2 * L + B], CM,
      'Step 1: breadth = area ÷ length = ' + a + ' ÷ ' + L + ' = ' + B + ' cm. Step 2: perimeter = 2 × (' +
      L + ' + ' + B + ') = ' + p + ' cm. Area and perimeter are different measurements: cm² for the ' +
      'space inside, cm for the walk around.');
  }

  /* pool 2: the cut, asked as a DIFFERENCE rather than as a perimeter (refutation
     wound 4). The answer is 0, and that is the entire point: five of the L formats
     all evaluated 2(W + H), so this one asks the child to compare two perimeters
     and discover the cut changed nothing. Not a 2(W + H) computation. */
  function gLPerimDiff() {
    let W = 12, H = 9, a = 4, b = 3, ok = false;
    for (let i = 0; i < 400 && !ok; i++) {
      W = ri(8, 18); H = ri(6, 15);
      a = ri(2, capCut(W)); b = ri(2, capCut(H));
      ok = new Set([a + b, 2 * (a + b), a * b]).size === 3 &&
           paOk(2 * (W + H), W * H - a * b);
    }
    if (!ok) { W = 12; H = 9; a = 4; b = 3; }
    return mcText(
      'A ' + W + ' cm by ' + H + ' cm rectangular tile has a corner piece ' + a + ' cm by ' + b +
      ' cm cut away, leaving an L-shape with right angles at every corner. <b>How much longer is ' +
      'the perimeter of the whole rectangle than the perimeter of the L-shape?</b>', '',
      '0 cm, the perimeters are the same.',
      [(a + b) + ' cm', (2 * (a + b)) + ' cm', (a * b) + ' cm'],
      'The cut removes ' + a + ' cm from one side and ' + b + ' cm from the other, but it adds two ' +
      'brand new sides of exactly ' + a + ' cm and ' + b + ' cm at the notch. What is taken off the walk ' +
      'is put straight back on, so both perimeters are 2 × (' + W + ' + ' + H + ') = ' + (2 * (W + H)) +
      ' cm. It is the AREA that drops, by ' + (a * b) + ' cm².');
  }

  /* pool 3: a composite whose perimeter is NOT the bounding rectangle's. A notch
     cut out of the MIDDLE of a side (not a corner) adds two new sides and takes
     none away, so the walk around grows by twice the depth. Six-plus sides,
     genuinely not 2(W + H) - the counterweight to the corner-cut family. */
  function gNotchPerimeter() {
    let W = 14, H = 8, n = 4, d = 3, ok = false;
    for (let i = 0; i < 400 && !ok; i++) {
      W = ri(12, 20); H = ri(6, 10);   /* the notched side is the LONG side */
      n = ri(2, W - 4); d = ri(2, H - 3);
      ok = optsOk(2 * (W + H) + 2 * d,
                  [2 * (W + H), 2 * (W + H) + 2 * n, 2 * (W + H) - 2 * d, W * H - n * d]);
    }
    if (!ok) { W = 14; H = 8; n = 4; d = 3; }
    const per = 2 * (W + H) + 2 * d;
    return mcNum(
      'A rectangular banner is ' + W + ' cm long and ' + H + ' cm wide. A notch ' + n +
      ' cm wide and ' + d + ' cm deep is cut out of the middle of one long side, so the notch does not ' +
      'reach either end. Every corner is a right angle. <b>What is the perimeter of the banner now?</b>', '',
      per, [2 * (W + H), 2 * (W + H) + 2 * n, 2 * (W + H) - 2 * d, W * H - n * d], CM,
      'Careful: this notch is in the middle of a side, not at a corner. The ' + n +
      ' cm taken out of the top edge is replaced by the ' + n + ' cm along the bottom of the notch, so ' +
      'that part of the walk is unchanged. But the two sides of the notch, ' + d + ' cm down and ' + d +
      ' cm back up, are brand new. Perimeter = 2 × (' + W + ' + ' + H + ') + 2 × ' + d + ' = ' + per +
      ' cm. A corner cut leaves the perimeter alone; a middle notch makes it longer.');
  }

  MQI.registerTopic({
    id: 'p4area', level: 'P4', strand: 'Measurement and Geometry',
    moeSubTopic: 'Area and Perimeter: finding one dimension of a rectangle given the other dimension and its area/perimeter; finding the length of one side of a square given its area/perimeter; finding the area and perimeter of composite figures made up of rectangles and squares',
    label: 'Missing Side Marsh', short: 'Area & perimeter', e: '📏',
    skills: {
      missing: { label: 'Finding a missing side', tip: 'Say the formula out loud first, then work it backwards. Area ÷ length = breadth; perimeter ÷ 4 = one side of a square.' },
      compose: { label: 'Composite figures', tip: 'Cut the shape into rectangles with a pencil line, work out each piece, then add. For a hole, take the hole away from the whole.' },
      around: { label: 'Perimeter of an L-shape', tip: 'Walk a finger right around the outside and count every labelled side. The two sides at the notch are the ones children forget — and a corner cut never changes the perimeter, only the area.' }
    },
    pools: {
      1: [[gRectSideFromArea, 'missing'], [gSquareSideFromPerimeter, 'missing'], [gLConcept, 'around']],
      2: [[gRectSideFromPerimeter, 'missing'], [gSquareSideFromArea, 'missing'], [gCompositeWordsAdd, 'compose'],
          [gLWords, 'around'], [gPeriFromArea, 'missing'], [gLPerimDiff, 'around']],
      3: [[gCompositeWordsSub, 'compose'], [gLArea, 'compose'], [gLPerimeter, 'around'],
          [gLError, 'around'], [gLCompare, 'around'], [gLCornerInverse, 'compose'], [gLSkirting, 'around'],
          [gNotchPerimeter, 'around']]
    }
  });
})();
