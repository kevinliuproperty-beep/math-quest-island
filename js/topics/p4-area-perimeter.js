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
 * emitted as PURE DATA on `q.figure` ({type:'lshape', W, H, a, b, unit}) and drawn
 * by the shared renderer js/figures.js as an L-shape whose six sides ALL carry a
 * printed number label a child can read on screen. Nothing lives in a data-*
 * attribute: the harness oracle re-derives area and perimeter by parsing those
 * same printed labels. Spec fields are documented in js/topics/README.md.
 */
(function () {
  const G = MQI.gen;
  const ri = G.ri, pick = G.pick, finishNum = G.finishNum, finishTyped = G.finishTyped;

  /* attach a figure spec to a finished question */
  const fig = (q, figure) => (q.figure = figure, q);

  /* finishNum prepends its own space to the unit, so these carry none. */
  const CM2 = 'cm²', CM = 'cm';

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
    const l = ri(4, 15);
    let w = ri(3, 12);
    while (w === l) w = ri(3, 12);   /* a rectangle called a rectangle: never a square */
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
    const s = ri(3, 20);
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
    const l = ri(4, 18);
    let w = ri(3, 14);
    while (w === l) w = ri(3, 14);
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
    const s = ri(2, 15);
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

  /* An L-shape: a W x H rectangle with an a x b piece removed from the top-right.
     Sides clockwise from the top-left corner:
       top = W - a, cut down = b, cut across = a, right = H - b, bottom = W, left = H.
     The renderer derives and prints every one of the six from W/H/a/b, so the spec
     and the picture can never disagree. */
  function makeL() {
    const W = ri(7, 16), H = ri(6, 14);
    const a = ri(2, W - 3), b = ri(2, H - 3);
    return { figure: { type: 'lshape', W, H, a, b, unit: 'cm' },
             W, H, a, b, area: W * H - a * b, per: 2 * (W + H) };
  }

  /* pool 3: area of the rendered L-shape */
  function gLArea() {
    const g = makeL();
    const wrong = g.W * g.H;
    return fig(finishNum(
      'What is the area of this figure?', '', g.area,
      [wrong, g.per, g.a * g.b, g.area + g.a, g.area + 1], CM2,
      'Take the whole ' + g.W + ' cm by ' + g.H + ' cm rectangle, ' + g.W + ' × ' + g.H +
      ' = ' + wrong + ' cm², then take away the ' + g.a + ' cm by ' + g.b +
      ' cm corner, ' + (g.a * g.b) + ' cm². ' + wrong + ' − ' + (g.a * g.b) +
      ' = ' + g.area + ' cm².'), g.figure);
  }

  /* pool 3: perimeter of the rendered L-shape */
  function gLPerimeter() {
    const g = makeL();
    return fig(finishNum(
      'What is the perimeter of this figure?', '', g.per,
      [g.area, g.W + g.H, g.per - g.a, g.per + g.a, g.per - 2 * g.b], CM,
      'Perimeter means all the way round, so add the six labelled sides: ' +
      (g.W - g.a) + ' + ' + g.b + ' + ' + g.a + ' + ' + (g.H - g.b) + ' + ' + g.W + ' + ' + g.H +
      ' = ' + g.per + ' cm. Missing out the two short sides at the corner is the usual slip.'), g.figure);
  }

  MQI.registerTopic({
    id: 'p4area', level: 'P4', strand: 'Measurement and Geometry',
    moeSubTopic: 'Area and Perimeter: finding one dimension of a rectangle given the other dimension and its area/perimeter; finding the length of one side of a square given its area/perimeter; finding the area and perimeter of composite figures made up of rectangles and squares',
    label: 'Missing Side Marsh', short: 'Area & perimeter', e: '📏',
    skills: {
      missing: { label: 'Finding a missing side', tip: 'Say the formula out loud first, then work it backwards. Area ÷ length = breadth; perimeter ÷ 4 = one side of a square.' },
      compose: { label: 'Composite figures', tip: 'Cut the shape into rectangles with a pencil line, work out each piece, then add. For a hole, take the hole away from the whole.' },
      around: { label: 'Perimeter of an L-shape', tip: 'Walk a finger right around the outside and count every labelled side. The two short sides at the notch are the ones children forget.' }
    },
    pools: {
      1: [[gRectSideFromArea, 'missing'], [gSquareSideFromPerimeter, 'missing'], [gCompositeWordsAdd, 'compose']],
      2: [[gRectSideFromPerimeter, 'missing'], [gSquareSideFromArea, 'missing'], [gCompositeWordsAdd, 'compose']],
      3: [[gCompositeWordsSub, 'compose'], [gLArea, 'compose'], [gLPerimeter, 'around']]
    }
  });
})();
