"use strict";
/* Math Quest Island topic: p3measure (P3). Self-contained. MC, unit-bearing.
 * Authoring rules + registration shape: js/topics/README.md
 * Scope limit (MOE Oct 2025, p.36): compound units and conversion between a
 * compound measurement and the smaller unit, for km/m, m/cm, kg/g and l/ml ONLY,
 * with "numbers involved within easy manipulation". No decimals (that is P4),
 * no area/volume units, no cm2/m2 conversion.
 * Unit convention: finishNum's unit argument appends the unit to EVERY choice.
 */
(function () {
  const G = MQI.gen;
  const ri = G.ri, pick = G.pick, shuffle = G.shuffle, finishNum = G.finishNum, finishTyped = G.finishTyped;

  const NAMES = ['Wei Jie','Aisyah','Kavitha','Jun Hao','Siti','Priya','Daryl','Xin Yi','Farhan','Nurul'];
  /* [big unit, small unit, factor] - the four pairs the syllabus names */
  const PAIRS = [['km','m',1000], ['m','cm',100], ['kg','g',1000], ['ℓ','ml',1000]];
  /* MATHS COACHING CARD 2026-10-17: named technique + 3-5 think-aloud steps from the
     draw's own numbers (tools/coach-steps.mjs re-computes every equation and checks the
     last step reaches the key). optionFeedback names the slip behind a distractor, only
     where exactly one named slip gives that option's value. */
  const coach = (q, technique, steps) => (q.technique = technique, q.steps = steps, q);
  const ofb = (q, slips, fmt) => {
    const cnt = {};
    for (const [v] of slips) { const t = fmt(v); cnt[t] = (cnt[t] || 0) + 1; }
    const of = {};
    for (const [v, say] of slips) {
      const t = fmt(v), i = q.choices.indexOf(t);
      if (cnt[t] === 1 && i >= 0 && i !== q.correct) of[i] = say;
    }
    if (Object.keys(of).length) q.optionFeedback = of;
    return q;
  };
  /* "2 × 1000 + 350 = 2350": the conversion to the smaller unit as working */
  const toSmall = (v, f) => Math.floor(v / f) + ' × ' + f + (v % f ? ' + ' + (v % f) : '') + ' = ' + v;

  function gToSmallEasy(){
    const [B, S, f] = pick(PAIRS);
    const big = ri(2, 9), small = f === 100 ? ri(10, 99) : ri(100, 900);
    const total = big*f + small;
    /* real trap: the child converts with the wrong power of ten (500 m read as 50). */
    const cands = [big*(f/10) + small, big + small, big*f, total + f].filter(c => c > 0 && c !== total);
    const q = finishNum(big + ' ' + B + ' ' + small + ' ' + S + ' = ?', '', total,
      cands, S,
      big + ' ' + B + ' = ' + (big*f) + ' ' + S + '. Add the extra ' + small + ' ' + S + ': ' + (big*f) + ' + ' + small + ' = ' + total + ' ' + S + '.');
    q.authored = cands;   /* harness contract: no authored distractor equals the answer */
    return q;
  }
  function gToSmallZero(){
    /* the classic trap: 5 km 40 m is 5040 m, not 540 m */
    const [B, S, f] = pick(PAIRS);
    const big = ri(2, 9), small = f === 100 ? ri(1, 9) : ri(5, 95);
    const total = big*f + small;
    const squash = Number(String(big) + String(small));
    return finishNum(big + ' ' + B + ' ' + small + ' ' + S + ' = ?', '', total,
      [squash, big*f, total + f, big*f + small*10], S,
      'The ' + small + ' ' + S + ' is small, so a zero has to hold the empty place: ' + big + ' ' + B + ' = ' + (big*f) +
      ' ' + S + ', and ' + (big*f) + ' + ' + small + ' = ' + total + ' ' + S + '.');
  }
  function gToCompoundSmall(){
    const [B, S, f] = pick(PAIRS);
    const big = ri(2, 9), small = f === 100 ? ri(11, 99) : ri(105, 950);
    const total = big*f + small;
    return finishNum(total + ' ' + S + ' = ' + big + ' ' + B + ' ? ' + S, '', small,
      [total - big, big*f - small, small*10, total], S,
      big + ' ' + B + ' is ' + (big*f) + ' ' + S + ', so the leftover is ' + total + ' - ' + (big*f) + ' = ' + small + ' ' + S + '.');
  }
  function gToCompoundBig(){
    const [B, S, f] = pick(PAIRS);
    const big = ri(2, 9), small = f === 100 ? ri(11, 99) : ri(105, 950);
    const total = big*f + small;
    return finishNum(total + ' ' + S + ' = ? ' + B + ' ' + small + ' ' + S, '', big,
      [big + 1, big*10, total - small, big + 10], B,
      'Take away the ' + small + ' ' + S + ' first: ' + total + ' - ' + small + ' = ' + (big*f) + ' ' + S + ', and ' + (big*f) + ' ' + S + ' = ' + big + ' ' + B + '.');
  }
  function gWordLeft(){
    const [B, S, f] = pick([PAIRS[3], PAIRS[2]]);   /* litres/ml or kg/g */
    const who = pick(NAMES);
    const big = ri(1, 4), small = f === 100 ? ri(10, 90) : ri(100, 800);
    const total = big*f + small;
    const used = ri(50, Math.min(900, total - 50));
    const noun = S === 'ml' ? 'of bandung' : 'of rice';
    const verb = S === 'ml' ? 'drinks' : 'cooks';
    const ans = total - used;
    const cands = [total + used, big*f - used, ans + f, big*(f/10) + small - used, ans + 10, ans + 100]
      .filter(x => x > 0 && x !== ans);
    const q = finishNum(who + ' has a container holding ' + big + ' ' + B + ' ' + small + ' ' + S + ' ' + noun +
      ', then ' + verb + ' ' + used + ' ' + S + '. How much is left?', '', ans,
      cands, S,
      big + ' ' + B + ' ' + small + ' ' + S + ' = ' + total + ' ' + S + '. Then ' + total + ' - ' + used + ' = ' + ans + ' ' + S + '.');
    q.authored = cands;   /* harness contract: no authored distractor equals the answer */
    coach(q, 'Units check', [
      'Say the unit first: the answer is in ' + S + '. Change ' + big + ' ' + B + ' ' + small + ' ' + S + ' into ' + S + ': ' + toSmall(total, f) + ' ' + S + '.',
      'Now both amounts are in ' + S + ': ' + total + ' ' + S + ' at first, and ' + used + ' ' + S + ' used.',
      '"How much is left" means take away: ' + total + ' − ' + used + ' = <b>' + ans + ' ' + S + '</b>.']);
    return ofb(q, [
      [total + used, 'Lots of children pick this, because they add the two amounts. But the ' + used + ' ' + S + ' was used up, so we take it away.'],
      [big*f - used, 'Good start changing ' + B + ' to ' + S + '! The extra ' + small + ' ' + S + ' got left behind, though: ' + big + ' ' + B + ' ' + small + ' ' + S + ' is ' + total + ' ' + S + '.'],
      [big*(f/10) + small - used, 'Lots of children pick this, because they change 1 ' + B + ' into ' + (f/10) + ' ' + S + '. 1 ' + B + ' is ' + f + ' ' + S + '.']
    ], v => v + ' ' + S);
  }
  function gWordCompare(){
    const [B, S, f] = pick([PAIRS[2], PAIRS[0], PAIRS[1]]);
    const who = pick(NAMES);
    let other = pick(NAMES); while (other === who) other = pick(NAMES);
    const bigA = S === 'g' ? ri(2, 4) : (S === 'm' ? 2 : ri(2, 6));   /* 4 kg durian is big; a 2 km walk is the cap */
    const smallA = f === 100 ? ri(20, 95) : ri(200, 900);
    const bigB = ri(1, bigA - 1), smallB = f === 100 ? ri(5, 90) : ri(50, 900);
    const a = bigA*f + smallA, b = bigB*f + smallB;
    const noun = S === 'g' ? 'durian' : (S === 'm' ? 'walk to the MRT station' : 'ribbon');
    const verb = S === 'g' ? 'weighs' : 'measures';
    const adj  = S === 'g' ? 'heavier' : 'longer';
    const q = finishNum(who + "'s " + noun + ' ' + verb + ' ' + bigA + ' ' + B + ' ' + smallA + ' ' + S + ' and ' + other + "'s " + verb + ' ' +
      bigB + ' ' + B + ' ' + smallB + ' ' + S + '. How much ' + adj + ' is ' + who + "'s?", '', a - b,
      [a + b, (bigA - bigB)*f, Math.abs(smallA - smallB), a - b + f], S,
      'Change both to ' + S + ' first: ' + a + ' ' + S + ' and ' + b + ' ' + S + '. Then ' + a + ' - ' + b + ' = ' + (a - b) + ' ' + S + '.');
    coach(q, 'Units check', [
      'Say the unit first: the answer is in ' + S + ', so change both amounts into ' + S + '.',
      who + "'s: " + toSmall(a, f) + ' ' + S + '. ' + other + "'s: " + toSmall(b, f) + ' ' + S + '.',
      '"How much ' + adj + '" means the difference: ' + a + ' − ' + b + ' = <b>' + (a - b) + ' ' + S + '</b>.']);
    return ofb(q, [
      [a + b, 'Lots of children pick this, because they add the two amounts. "How much ' + adj + '" asks for the difference, so we take away.'],
      [(bigA - bigB)*f, 'Good, you compared the ' + B + '! The ' + S + ' parts count too, so change both whole amounts to ' + S + ' first.'],
      [Math.abs(smallA - smallB), 'Lots of children pick this, because they compare only the ' + S + ' parts. The ' + B + ' count too, so change both to ' + S + ' first.']
    ], v => v + ' ' + S);
  }

  /* ===== lane/hard-measure 2026-10-07: exam-hard items (calibration cards M1, M2) =====
     Every item carries q.band (3 = exam-hard multi-step, 2 = standard) and stretch
     items carry q.stretch, which the mock routes on. Typed answers are ONE unit;
     compound answers are MCQ, and every option is written in the same compound form
     (never "900 g" beside "2 kg 350 g": a form tell). */
  const PEOPLE = [['Wei Jie','He','he'],['Aisyah','She','she'],['Kavitha','She','she'],['Jun Hao','He','he'],
    ['Siti','She','she'],['Priya','She','she'],['Daryl','He','he'],['Xin Yi','She','she'],['Farhan','He','he'],
    ['Nurul','She','she'],['Mdm Tan','She','she'],['Mr Lim','He','he']];
  const tag = (q, band, stretch) => { q.band = band; if (stretch) q.stretch = true; return q; };
  /* base-unit value -> "2 kg 350 g" / "2 kg" / "350 g" */
  const fmtC = (v, B, S, f) => {
    const b = Math.floor(v / f), s = v % f;
    return b && s ? b + ' ' + B + ' ' + s + ' ' + S : (b ? b + ' ' + B : s + ' ' + S);
  };
  const ord = n => n + ((n % 100 >= 11 && n % 100 <= 13) ? 'th' : ({1:'st', 2:'nd', 3:'rd'}[n % 10] || 'th'));
  /* MCQ with compound options. Every option must be a full "a B b S" with both parts
     non-zero; returns null when the named slips cannot fill three such options, and
     the caller redraws. */
  function finishCompound(stem, key, cands, B, S, f, explain){
    const ok = v => Number.isInteger(v) && v > f && v % f !== 0;
    if (!ok(key)) return null;
    const vals = [key];
    for (const c of shuffle(cands)) if (vals.length < 4 && ok(c) && vals.indexOf(c) < 0) vals.push(c);
    if (vals.length < 4) return null;
    const order = shuffle([0, 1, 2, 3]);
    return { q:stem, extra:'', choices:order.map(i => fmtC(vals[i], B, S, f)), correct:order.indexOf(0),
             explain, answerText:fmtC(key, B, S, f) };
  }

  /* M1a. Units model inside a measurement: "N times as much; together T". */
  function gTimesAsMuch(){
    const ctx = pick([
      {kind:'vol', a:'jug', b:'bottle', stuff:'water', rel:'holds', relN:'as much water as', tog:'Together they hold', moreQ:'How much more water does the jug hold than the bottle', oneQ:'How much water does the jug hold'},
      {kind:'vol', a:'pail', b:'kettle', stuff:'water', rel:'holds', relN:'as much water as', tog:'Together they hold', moreQ:'How much more water does the pail hold than the kettle', oneQ:'How much water does the pail hold'},
      {kind:'mass', a:'bag of rice', b:'bag of sugar', rel:'is', relN:'as heavy as', tog:'Together they weigh', moreQ:'How much heavier is the bag of rice than the bag of sugar', oneQ:'What is the mass of the bag of rice'},
      {kind:'mass', a:'watermelon', b:'papaya', rel:'is', relN:'as heavy as', tog:'Together they weigh', moreQ:'How much heavier is the watermelon than the papaya', oneQ:'What is the mass of the watermelon'}
    ]);
    const [B, S, f, cap] = ctx.kind === 'vol' ? ['ℓ', 'ml', 1000, 2000] : ['kg', 'g', 1000, 4000];
    const N = ri(3, 5);
    let u, T;
    do { u = 50 * ri(2, Math.floor(cap / (N + 1) / 50)); T = (N + 1) * u; } while (T < 1000);
    const askMore = Math.random() < 0.6;
    const key = askMore ? (N - 1) * u : N * u;
    const oneUnitWrong = T % N === 0 ? [T / N, (N - 1) * (T / N)] : [];
    const cands = (askMore ? [u, N * u, T] : [u, (N - 1) * u, T]).concat(oneUnitWrong).filter(c => c !== key);
    const stem = 'A ' + ctx.a + ' ' + ctx.rel + ' ' + N + ' times ' + ctx.relN + ' a ' + ctx.b + '. ' + ctx.tog + ' ' +
      fmtC(T, B, S, f) + '. ' + (askMore ? ctx.moreQ : ctx.oneQ) + ', in ' + S + '?';
    const explain = 'Draw a model. The ' + ctx.b + ' is 1 unit and the ' + ctx.a + ' is ' + N + ' units, so together they are ' +
      (N + 1) + ' units. Change to ' + S + ': ' + fmtC(T, B, S, f) + ' = ' + T + ' ' + S + '. 1 unit = ' + T + ' ÷ ' + (N + 1) +
      ' = ' + u + ' ' + S + '. ' + (askMore
        ? 'The ' + ctx.a + ' has ' + N + ' - 1 = ' + (N - 1) + ' more units than the ' + ctx.b + ': ' + (N - 1) + ' × ' + u + ' = ' + key + ' ' + S + '.'
        : 'The ' + ctx.a + ' is ' + N + ' units: ' + N + ' × ' + u + ' = ' + key + ' ' + S + '.');
    const q = finishNum(stem, '', key, cands, S, explain);
    q.authored = cands;
    coach(q, 'Draw a model', [
      'Units check first: the answer is in ' + S + '. ' + fmtC(T, B, S, f) + ' is ' + toSmall(T, f) + ' ' + S + '.',
      'Draw the ' + ctx.b + ' as 1 unit and the ' + ctx.a + ' as ' + N + ' units. Together: ' + N + ' + 1 = ' + (N + 1) + ' units.',
      '1 unit = ' + T + ' ÷ ' + (N + 1) + ' = ' + u + ' ' + S + '.',
      askMore ? 'The ' + ctx.a + ' has ' + N + ' − 1 = ' + (N - 1) + ' more units: ' + (N - 1) + ' × ' + u + ' = <b>' + key + ' ' + S + '</b>.'
              : 'The ' + ctx.a + ' is ' + N + ' units: ' + N + ' × ' + u + ' = <b>' + key + ' ' + S + '</b>.']);
    ofb(q, [
      [u, 'Good, that is 1 unit! It is the ' + ctx.b + ', though. Read the question again to see which part it asks for.'],
      [T, 'Lots of children pick this, because it is the total in the question. The total is all ' + (N + 1) + ' units together; the question asks for part of it.'],
      [askMore ? N * u : (N - 1) * u, askMore ? 'Good, that is the whole ' + ctx.a + '! The question asks how much MORE, so take away the 1 unit of the ' + ctx.b + '.'
                                              : 'Lots of children pick this, because it is how much more. The question asks for the whole ' + ctx.a + ': all ' + N + ' units.'],
      [T % N === 0 ? T / N : -1, 'Lots of children pick this, because they share the total into ' + N + ' parts. Count the ' + ctx.b + ' too: there are ' + (N + 1) + ' units.'],
      /* BUILD DAY 2026-10-23 (B1): the same one-unit slip, then "how much more" done right */
      [askMore && T % N === 0 ? (N - 1) * (T / N) : -1, 'Good, you took away the ' + ctx.b + "'s unit! First count all the units: " + N + ' + 1 = ' + (N + 1) + ', so share the total into ' + (N + 1) + '.']
    ], v => v + ' ' + S);
    return tag(q, 3);
  }

  /* M1b. Use some, then share the rest equally (typed, one unit). */
  function gUseThenShare(){
    const [who, He] = pick(PEOPLE);
    const ctx = pick([
      {B:'kg', S:'g', f:1000, stuff:'flour', used:'used', rest:'packed the rest equally into', box:'bags', ask:'How much flour is in each bag'},
      {B:'kg', S:'g', f:1000, stuff:'rice', used:'cooked', rest:'packed the rest equally into', box:'containers', ask:'How much rice is in each container'},
      {B:'ℓ', S:'ml', f:1000, stuff:'bandung', used:'drank', rest:'poured the rest equally into', box:'cups', ask:'How much bandung is in each cup'},
      {B:'m', S:'cm', f:100, stuff:'ribbon', used:'used', rest:'cut the rest into', box:'equal pieces', ask:'How long is each piece'}
    ]);
    let n, each, used, total;
    do {
      n = ri(3, 8);
      if (ctx.S === 'g')       { each = 10 * ri(12, 60); used = 50 * ri(2, 18); }
      else if (ctx.S === 'ml') { each = 10 * ri(10, 40); used = 50 * ri(2, 12); }
      else                     { each = ri(15, 90);      used = 5 * ri(4, 19); }
      total = n * each + used;
    } while (total <= ctx.f || total % ctx.f === 0 || total > (ctx.S === 'g' ? 4000 : ctx.S === 'ml' ? 2000 : 900));
    const rest = total - used;
    const stem = who + ' had ' + fmtC(total, ctx.B, ctx.S, ctx.f) + ' of ' + ctx.stuff + '. ' + He + ' ' + ctx.used + ' ' +
      used + ' ' + ctx.S + ' and ' + ctx.rest + ' ' + n + ' ' + ctx.box + '. ' + ctx.ask + ', in ' + ctx.S + '?';
    const explain = 'Change to ' + ctx.S + ' first: ' + fmtC(total, ctx.B, ctx.S, ctx.f) + ' = ' + total + ' ' + ctx.S +
      '. Take away what was ' + ctx.used + ': ' + total + ' - ' + used + ' = ' + rest + ' ' + ctx.S +
      '. Share it equally: ' + rest + ' ÷ ' + n + ' = ' + each + ' ' + ctx.S + '.';
    return tag(coach(finishTyped(stem, each, explain, ctx.S), 'Units check', [
      'Say the unit first: the answer is in ' + ctx.S + '. Change ' + fmtC(total, ctx.B, ctx.S, ctx.f) + ' into ' + ctx.S + ': ' + toSmall(total, ctx.f) + ' ' + ctx.S + '.',
      'Take away the ' + used + ' ' + ctx.S + ' first: ' + total + ' − ' + used + ' = ' + rest + ' ' + ctx.S + ' is left to share.',
      'Share the rest equally into ' + n + ': ' + rest + ' ÷ ' + n + ' = <b>' + each + ' ' + ctx.S + '</b>.']), 3);
  }

  /* M1c. Pour two amounts into a container: overflow, or how much more to fill it. */
  function gPourIn(){
    const [who, He, he] = pick(PEOPLE);
    const over = Math.random() < 0.5;
    /* two pours of at most 950 ml can never overflow 2 l, so 2 l is a "fill it" jug only */
    const C = over ? pick([1000, 1000, 1200, 1500]) : pick([1000, 1500, 2000]);
    let a, b;
    do { a = 10 * ri(25, 95); b = 10 * ri(25, 95); }
    while (a === b || a >= C || b >= C || (over ? a + b <= C + 50 : a + b >= C - 50));
    const key = over ? a + b - C : C - a - b;
    const cands = [...new Set([a + b, C - a, C - b, Math.abs(a - b)])].filter(c => c > 0 && c !== key);
    if (cands.length < 3) return gPourIn();   /* three named slips or redraw: never a padded +1 */
    const stem = who + ' has a bottle with ' + a + ' ml of water and a beaker with ' + b + ' ml of water. ' + He +
      ' pours all of it into an empty jug that can hold ' + fmtC(C, 'ℓ', 'ml', 1000) + '. ' +
      (over ? 'How much water overflows, in ml?' : 'How much more water is needed to fill the jug, in ml?');
    const explain = 'Change to ml: ' + fmtC(C, 'ℓ', 'ml', 1000) + ' = ' + C + ' ml. Water poured in: ' + a + ' + ' + b + ' = ' +
      (a + b) + ' ml. ' + (over
        ? 'The jug holds only ' + C + ' ml, so ' + (a + b) + ' - ' + C + ' = ' + key + ' ml overflows.'
        : 'The jug holds ' + C + ' ml, so ' + C + ' - ' + (a + b) + ' = ' + key + ' ml more is needed.');
    const q = finishNum(stem, '', key, cands, 'ml', explain);
    q.authored = cands;
    coach(q, 'Units check', [
      'Say the unit first: the answer is in ml. The jug holds ' + fmtC(C, 'ℓ', 'ml', 1000) + ', which is ' + toSmall(C, 1000) + ' ml.',
      'Water poured in: ' + a + ' + ' + b + ' = ' + (a + b) + ' ml.',
      over ? 'The jug holds only ' + C + ' ml, so the extra spills over: ' + (a + b) + ' − ' + C + ' = <b>' + key + ' ml</b>.'
           : 'The jug holds ' + C + ' ml, so the gap still to fill is ' + C + ' − ' + (a + b) + ' = <b>' + key + ' ml</b>.']);
    ofb(q, [
      [a + b, 'Good, that is all the water poured in! The question asks how much ' + (over ? 'overflows' : 'more is needed') + ', so compare it with the ' + C + ' ml jug.'],
      [C - a, (over ? 'Lots of children pick this, because they take one pour from the jug. Add both pours first: ' + a + ' ml + ' + b + ' ml.' : 'Lots of children pick this, because they use only one of the two pours. Add both: ' + a + ' ml and ' + b + ' ml.')],
      [C - b, (over ? 'Lots of children pick this, because they take one pour from the jug. Add both pours first: ' + a + ' ml + ' + b + ' ml.' : 'Lots of children pick this, because they use only one of the two pours. Add both: ' + a + ' ml and ' + b + ' ml.')],
      [Math.abs(a - b), 'Lots of children pick this, because they compare the two pours. Both go into the jug, so add them first.']
    ], v => v + ' ml');
    return tag(q, 3);
  }

  /* M1d. Comparison, then total, answered in compound units (MCQ). */
  function gCompareTotal(){
    for (;;) {
      const [p1] = pick(PEOPLE); let p2 = pick(PEOPLE)[0]; while (p2 === p1) p2 = pick(PEOPLE)[0];
      const len = Math.random() < 0.4;
      const [B, S, f] = len ? ['m', 'cm', 100] : ['kg', 'g', 1000];
      const W = len ? 100 * ri(2, 4) + ri(11, 95) : 10 * ri(105, 195);
      const d = len ? ri(15, 95) : 10 * ri(15, 95);
      const up = Math.random() < 0.5;
      const other = up ? W + d : W - d;
      const key = W + other;
      /* slips on both sides of the key, so 'pick the biggest' is not a strategy */
      const cands = up ? [W + d, 2 * W - d, 2 * W, 2 * W + 2 * d] : [W - d, 2 * W + d, 2 * W, 2 * W - 2 * d];
      const thing = len ? 'ribbon' : 'parcel';
      const word = len ? (up ? 'longer' : 'shorter') : (up ? 'heavier' : 'lighter');
      const stem = p1 + "'s " + thing + (len ? ' is ' : ' weighs ') + fmtC(W, B, S, f) + (len ? ' long. ' : '. ') +
        p2 + "'s " + thing + ' is ' + d + ' ' + S + ' ' + word + ' than ' + p1 + "'s. " +
        (len ? 'What is the total length of the two ribbons?' : 'What is the total mass of the two parcels?');
      const explain = 'Change to ' + S + ': ' + fmtC(W, B, S, f) + ' = ' + W + ' ' + S + '. ' + p2 + "'s " + thing + ' is ' +
        W + (up ? ' + ' : ' - ') + d + ' = ' + other + ' ' + S + '. Both together: ' + W + ' + ' + other + ' = ' + key + ' ' + S +
        ' = ' + fmtC(key, B, S, f) + '.';
      const q = finishCompound(stem, key, cands, B, S, f, explain);
      if (q) {
        coach(q, 'Units check', [
          'Units check first: change to ' + S + ' so every number is in the same unit. ' + fmtC(W, B, S, f) + ' is ' + toSmall(W, f) + ' ' + S + '.',
          p2 + "'s " + thing + ' is ' + d + ' ' + S + ' ' + word + ': ' + W + (up ? ' + ' : ' − ') + d + ' = ' + other + ' ' + S + '.',
          'The total is both together: ' + W + ' + ' + other + ' = ' + key + ' ' + S + ', which is <b>' + fmtC(key, B, S, f) + '</b>.']);
        ofb(q, [
          [other, 'Good, that is ' + p2 + "'s " + thing + '! The question asks for the total, so add ' + p1 + "'s too."],
          [up ? 2 * W - d : 2 * W + d, 'Lots of children pick this, because they ' + (up ? 'take the ' + d + ' ' + S + ' away' : 'add the ' + d + ' ' + S) + '. ' + p2 + "'s is " + word + ', so ' + (up ? 'add it.' : 'take it away.')],
          [2 * W, 'Lots of children pick this, because they double ' + p1 + "'s. " + p2 + "'s is " + d + ' ' + S + ' ' + word + ', so it is not the same.'],
          /* BUILD DAY 2026-10-23 (B1) */
          [2 * other, 'Lots of children pick this, because they double ' + p2 + "'s. Only " + p2 + "'s is " + d + ' ' + S + ' ' + word + '; ' + p1 + "'s stays " + fmtC(W, B, S, f) + '.']
        ], v => fmtC(v, B, S, f));
        return tag(q, 3);
      }
    }
  }

  /* M1e. Working backwards: equal packs plus a leftover; how much at first? (MCQ compound) */
  function gPackedBack(){
    for (;;) {
      const [who, He, he] = pick(PEOPLE);
      const vol = Math.random() < 0.4;
      const [B, S, f] = vol ? ['ℓ', 'ml', 1000] : ['kg', 'g', 1000];
      const n = ri(3, 8);
      const each = vol ? 10 * ri(15, 30) : 10 * ri(15, 60);
      const left = vol ? 10 * ri(5, 40) : 10 * ri(5, 60);
      const key = n * each + left;
      if (key > (vol ? 2500 : 4500)) continue;
      const cands = [n * each, n * each - left, n * (each + left), (n - 1) * each + left, (n + 1) * each + left];
      const stem = vol
        ? who + ' poured some soya bean milk into ' + n + ' cups. Each cup held ' + each + ' ml, and ' + left +
          ' ml was left in the jug. How much soya bean milk was there at first?'
        : who + ' packed some sugar into ' + n + ' bags of ' + each + ' g each. ' + He + ' had ' + left +
          ' g of sugar left over. How much sugar did ' + he + ' have at first?';
      const explain = 'Work backwards. The ' + (vol ? 'cups' : 'bags') + ' held ' + n + ' × ' + each + ' = ' + (n * each) + ' ' + S +
        '. Add what was left: ' + (n * each) + ' + ' + left + ' = ' + key + ' ' + S + ' = ' + fmtC(key, B, S, f) + '.';
      const q = finishCompound(stem, key, cands, B, S, f, explain);
      if (q) {
        const box = vol ? 'cups' : 'bags';
        coach(q, 'Work backwards', [
          'Work backwards from the end: ' + left + ' ' + S + ' was left over after filling the ' + box + '.',
          'The ' + box + ' held ' + n + ' × ' + each + ' = ' + (n * each) + ' ' + S + '.',
          'Put back what was left: ' + (n * each) + ' + ' + left + ' = ' + key + ' ' + S + ', which is <b>' + fmtC(key, B, S, f) + '</b>.']);
        ofb(q, [
          [n * each, 'Good, that is what the ' + box + ' held! Add back the ' + left + ' ' + S + ' that was left over too.'],
          [n * each - left, 'Lots of children pick this, because they take the leftover away. Working backwards, we put it back: add it.'],
          [n * (each + left), 'Lots of children pick this, because they add the leftover to every one of the ' + box + '. It was left over only once.'],
          /* BUILD DAY 2026-10-23 (B1): off-by-one counts of the boxes */
          [(n - 1) * each + left, 'So close! That counts ' + (n - 1) + ' ' + box + '. Count them again: there were ' + n + ' ' + box + '.'],
          [(n + 1) * each + left, 'So close! That counts ' + (n + 1) + ' ' + box + '. Count them again: there were ' + n + ' ' + box + '.']
        ], v => fmtC(v, B, S, f));
        return tag(q, 3);
      }
    }
  }

  /* M2. Gap-counting: posts, trees and flags equally far apart. Gaps = posts - 1. */
  const LINES = [
    {thing:'Lamp posts', one:'lamp post', where:'along a road', v:'stand'},
    {thing:'Trees', one:'tree', where:'along one side of a path', v:'stand'},
    {thing:'Flag poles', one:'flag pole', where:'along one side of a school field', v:'stand'},
    {thing:'Lanterns', one:'lantern', where:'along a corridor', v:'hang'}
  ];
  /* M2a. One span gives the gap; find another span (MCQ, m). */
  function gPostSpan(){
    const L = pick(LINES);
    const gap = ri(2, 15), i = ri(1, 3), j = i + ri(2, 6), k = ri(1, 3), l = k + ri(4, 12);
    if (l - k === j - i) return gPostSpan();
    const span = gap * (j - i), key = gap * (l - k);
    const cands = [gap * (l - k + 1), gap * (l - k - 1)];
    if ((span * (l - k + 1)) % (j - i + 1) === 0) cands.push(span * (l - k + 1) / (j - i + 1));
    cands.push(gap * l, gap * (l - i));   /* posts as gaps; measuring from the first post named */
    if (new Set(cands.filter(c => c > 0 && c !== key)).size < 3) return gPostSpan();
    const stem = L.thing + ' ' + L.v + ' equally far apart ' + L.where + '. The ' + ord(i) + ' ' + L.one + ' is ' + span + ' m from the ' +
      ord(j) + ' ' + L.one + '. How far is the ' + ord(k) + ' ' + L.one + ' from the ' + ord(l) + ' ' + L.one + '?';
    const explain = 'Count the gaps, not the ' + L.thing.toLowerCase() + '. From the ' + ord(i) + ' to the ' + ord(j) + ' there are ' +
      j + ' - ' + i + ' = ' + (j - i) + ' gaps, so each gap is ' + span + ' ÷ ' + (j - i) + ' = ' + gap + ' m. From the ' + ord(k) +
      ' to the ' + ord(l) + ' there are ' + l + ' - ' + k + ' = ' + (l - k) + ' gaps: ' + (l - k) + ' × ' + gap + ' = ' + key + ' m.';
    const q = finishNum(stem, '', key, cands.filter(c => Number.isInteger(c) && c > 0 && c !== key), 'm', explain);
    q.authored = cands.filter(c => c !== key);
    const things = L.thing.toLowerCase();
    coach(q, 'Draw a model', [
      'Draw the ' + things + ' as dots in a row with gaps between them. Count the gaps, not the ' + things + '.',
      'From the ' + ord(i) + ' to the ' + ord(j) + ' ' + L.one + ': ' + j + ' − ' + i + ' = ' + (j - i) + ' gaps. One gap: ' + span + ' ÷ ' + (j - i) + ' = ' + gap + ' m.',
      'From the ' + ord(k) + ' to the ' + ord(l) + ': ' + l + ' − ' + k + ' = ' + (l - k) + ' gaps.',
      (l - k) + ' gaps of ' + gap + ' m: ' + (l - k) + ' × ' + gap + ' = <b>' + key + ' m</b>.']);
    ofb(q, [
      [gap * (l - k + 1), 'Lots of children pick this, because they count the ' + things + '. Between the ' + ord(k) + ' and the ' + ord(l) + ' there is one gap fewer than ' + things + ': ' + (l - k) + ' gaps.'],
      [gap * (l - k - 1), 'So close! Count the gaps again on a drawing: from the ' + ord(k) + ' to the ' + ord(l) + ' there are ' + (l - k) + ' gaps.'],
      [gap * l, 'Lots of children pick this, because they count ' + l + ' gaps up to the ' + ord(l) + ' ' + L.one + '. This part starts at the ' + ord(k) + ', so there are ' + l + ' − ' + k + ' = ' + (l - k) + ' gaps.'],
      [gap * (l - i), 'Lots of children pick this, because they start counting from the ' + ord(i) + ' ' + L.one + ', the one in the first sentence. This part starts at the ' + ord(k) + '.'],
      /* BUILD DAY 2026-10-23 (B1): the posts counted as gaps in BOTH parts */
      [(span * (l - k + 1)) % (j - i + 1) === 0 ? span * (l - k + 1) / (j - i + 1) : -1,
        'Lots of children pick this, because they count the ' + things + ' both times. Count the gaps instead: ' + (j - i) + ' gaps make ' + span + ' m.']
    ], v => v + ' m');
    return tag(q, 3);
  }
  /* M2b. Both ends: count the things from a length, or the length from a count (typed). */
  const ROWS = [
    {noun:'flags', sing:'flag', where:'along a running track', track:'running track', set:'Flags are placed'},
    {noun:'trees', sing:'tree', where:'along a straight path', track:'path', set:'Trees are planted'},
    {noun:'cones', sing:'cone', where:'along a straight line on a field', track:'line', set:'Cones are placed'},
    {noun:'poles', sing:'pole', where:'along a straight fence', track:'fence', set:'Poles are put up'}
  ];
  function gEndToEnd(){
    const R = pick(ROWS);
    const gap = ri(2, 10), gaps = ri(6, 20), len = gap * gaps, count = gaps + 1;
    if (Math.random() < 0.6) {
      const stem = R.set + ' ' + gap + ' m apart ' + R.where + ' that is ' + len + ' m long, with one ' + R.sing +
        ' at each end. How many ' + R.noun + ' are there?';
      const explain = 'First find the gaps: ' + len + ' ÷ ' + gap + ' = ' + gaps + ' gaps. With one ' + R.sing + ' at each end there is one more ' +
        R.sing + ' than gaps: ' + gaps + ' + 1 = ' + count + ' ' + R.noun + '.';
      return tag(coach(finishTyped(stem, count, explain, R.noun), 'Draw a model', [
        'Draw the ' + R.track + ' with a ' + R.sing + ' at each end and gaps of ' + gap + ' m between them.',
        'Find the gaps first: ' + len + ' ÷ ' + gap + ' = ' + gaps + ' gaps.',
        'With one at each end there is one more ' + R.sing + ' than gaps: ' + gaps + ' + 1 = <b>' + count + '</b> ' + R.noun + '.']), 2);
    }
    const stem = 'There are ' + count + ' ' + R.noun + ' ' + R.where + ', ' + gap + ' m apart, with one ' + R.sing +
      ' at each end. How long is the ' + R.track + ', in m?';
    const explain = count + ' ' + R.noun + ' with one at each end make one gap fewer: ' + count + ' - 1 = ' + gaps + ' gaps. ' +
      gaps + ' × ' + gap + ' = ' + len + ' m.';
    return tag(coach(finishTyped(stem, len, explain, 'm'), 'Draw a model', [
      'Draw the ' + count + ' ' + R.noun + ' in a row, one at each end. Count the gaps, not the ' + R.noun + '.',
      'There is always one gap fewer than ' + R.noun + ': ' + count + ' − 1 = ' + gaps + ' gaps.',
      'Each gap is ' + gap + ' m: ' + gaps + ' × ' + gap + ' = <b>' + len + ' m</b>.']), 2);
  }
  /* M2c. A span gives the gap, then the whole line from the number of trees (MCQ, m). */
  function gLineLength(){
    const L = pick(LINES);
    const gap = ri(3, 12), j = ri(4, 7), n = ri(j + 4, 18);
    const span = gap * (j - 1), key = gap * (n - 1);
    /* both sides of the key: trees as gaps, the first span counted twice; one gap short, only the part after the named tree */
    const cands = [gap * n, span + gap * (n - 1), gap * (n - 2), gap * (n - j)];
    if ((span * n) % j === 0) cands.push(span * n / j);
    const stem = L.thing + ' ' + L.v + ' equally far apart ' + L.where + ', with one at each end. The 1st ' + L.one + ' is ' + span +
      ' m from the ' + ord(j) + ' ' + L.one + '. There are ' + n + ' ' + L.thing.toLowerCase() + ' altogether. How long is the line of ' +
      L.thing.toLowerCase() + ', from the first to the last?';
    const explain = 'From the 1st to the ' + ord(j) + ' there are ' + j + ' - 1 = ' + (j - 1) + ' gaps, so each gap is ' + span + ' ÷ ' +
      (j - 1) + ' = ' + gap + ' m. ' + n + ' ' + L.thing.toLowerCase() + ' make ' + n + ' - 1 = ' + (n - 1) + ' gaps: ' + (n - 1) +
      ' × ' + gap + ' = ' + key + ' m.';
    const q = finishNum(stem, '', key, cands.filter(c => c > 0 && c !== key), 'm', explain);
    q.authored = cands.filter(c => c !== key);
    const things = L.thing.toLowerCase();
    coach(q, 'Draw a model', [
      'Draw the ' + things + ' as dots in a row with gaps between them. Count the gaps, not the ' + things + '.',
      'From the 1st to the ' + ord(j) + ': ' + j + ' − 1 = ' + (j - 1) + ' gaps. One gap: ' + span + ' ÷ ' + (j - 1) + ' = ' + gap + ' m.',
      n + ' ' + things + ' with one at each end make ' + n + ' − 1 = ' + (n - 1) + ' gaps.',
      'The whole line: ' + (n - 1) + ' × ' + gap + ' = <b>' + key + ' m</b>.']);
    ofb(q, [
      [gap * n, 'Lots of children pick this, because they count the ' + things + '. ' + n + ' ' + things + ' make one gap fewer: ' + (n - 1) + ' gaps.'],
      [gap * (n - 2), 'So close! Count the gaps again on a drawing: ' + n + ' ' + things + ' make ' + (n - 1) + ' gaps.'],
      [gap * (n - j), 'Good, that is the part after the ' + ord(j) + ' ' + L.one + '! The question asks for the whole line, from the first to the last.'],
      [span + gap * (n - 1), 'Lots of children pick this, because they add the first ' + span + ' m on again. It is already part of the whole line.'],
      /* BUILD DAY 2026-10-23 (B1): the trees counted as gaps in BOTH parts */
      [(span * n) % j === 0 ? span * n / j : -1,
        'Lots of children pick this, because they count the ' + things + ' both times. Count the gaps instead: ' + (j - 1) + ' gaps make ' + span + ' m.']
    ], v => v + ' m');
    return tag(q, 3);
  }
  /* M2d STRETCH. Two spans: the gap from one, the count from the other (typed). */
  function gTwoSpans(){
    const R = pick([['posts', 'post', 'along a fence'], ['trees', 'tree', 'along a road'], ['poles', 'pole', 'along a canal']]);
    const gap = ri(3, 12), j = ri(3, 6), i2 = ri(2, 3), last = ri(i2 + 8, 22);
    const span1 = gap * (j - 1), span2 = gap * (last - i2);
    const stem = R[0][0].toUpperCase() + R[0].slice(1) + ' stand equally far apart ' + R[2] + '. The 1st ' + R[1] + ' is ' + span1 +
      ' m from the ' + ord(j) + ' ' + R[1] + '. The ' + ord(i2) + ' ' + R[1] + ' is ' + span2 + ' m from the last ' + R[1] +
      '. How many ' + R[0] + ' are there altogether?';
    const explain = 'From the 1st to the ' + ord(j) + ' there are ' + (j - 1) + ' gaps, so each gap is ' + span1 + ' ÷ ' + (j - 1) + ' = ' +
      gap + ' m. From the ' + ord(i2) + ' ' + R[1] + ' to the last there are ' + span2 + ' ÷ ' + gap + ' = ' + (last - i2) +
      ' gaps, so the last ' + R[1] + ' is ' + (last - i2) + ' places after the ' + ord(i2) + ': ' + i2 + ' + ' + (last - i2) + ' = ' +
      last + ' ' + R[0] + '.';
    return tag(coach(finishTyped(stem, last, explain, R[0]), 'Draw a model', [
      'Draw the ' + R[0] + ' as dots in a row with equal gaps. Count the gaps, not the ' + R[0] + '.',
      'From the 1st to the ' + ord(j) + ': ' + j + ' − 1 = ' + (j - 1) + ' gaps. One gap: ' + span1 + ' ÷ ' + (j - 1) + ' = ' + gap + ' m.',
      'From the ' + ord(i2) + ' to the last: ' + span2 + ' ÷ ' + gap + ' = ' + (last - i2) + ' gaps, so the last ' + R[1] + ' is ' + (last - i2) + ' places after the ' + ord(i2) + '.',
      'The last ' + R[1] + ' is number ' + i2 + ' + ' + (last - i2) + ' = <b>' + last + '</b>, so there are ' + last + ' ' + R[0] + '.']), 3, true);
  }

  MQI.registerTopic({
    id:'p3measure', level:'P3', strand:'Measurement and Geometry',
    moeSubTopic:"Length, Mass and Volume: measuring length/mass/volume (of liquid) in compound units; converting a measurement in compound units to the smaller unit, and vice versa",
    label:'Compound Cove', short:'Compound units', e:'📏',
    skills:{
      tosmall:   {label:'Compound to smaller unit', tip:'1 km = 1000 m, 1 m = 100 cm, 1 kg = 1000 g, 1 litre = 1000 ml. Chant the four, they cover everything at P3.'},
      tocompound:{label:'Smaller unit to compound', tip:'Read the number backwards: 3250 g splits into 3 kg and the 250 g left over.'},
      word:      {label:'Measurement word problems', tip:'Convert to the smaller unit first, then add or subtract. Mixing units is where marks are lost.'},
      multistep: {label:'Multi-step measurement problems', tip:'Change everything to the smaller unit first, then draw a model before you calculate.'},
      gaps:      {label:'Posts and gaps', tip:'Count the gaps, not the posts: with a post at each end there is always one more post than gaps.'}
    },
    pools:{
      1:[[gToSmallEasy,'tosmall'],[gToCompoundSmall,'tocompound']],
      2:[[gToCompoundBig,'tocompound'],[gWordLeft,'word'],[gEndToEnd,'gaps'],[gPostSpan,'gaps']],
      3:[[gToSmallZero,'tosmall'],[gWordCompare,'word'],[gTimesAsMuch,'multistep'],[gUseThenShare,'multistep'],
         [gPourIn,'multistep'],[gCompareTotal,'multistep'],[gPackedBack,'multistep'],[gLineLength,'gaps'],[gTwoSpans,'gaps'],
         /* PRE-EXAM CONTENT CARD 2026-10-17 (coverage scan card 3): band 3 but pool 2
            only, so the mock's long slots never drew it. Kept in pool 2 as well. */
         [gPostSpan,'gaps']]
    }
  });
})();
