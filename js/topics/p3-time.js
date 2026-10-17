"use strict";
/* Math Quest Island topic: p3time (P3). Self-contained. MC + typed.
 * Authoring rules + registration shape: js/topics/README.md
 *
 * Scope (MOE 2021 syllabus, updated Oct 2025, p.36, PRIMARY THREE, Measurement,
 * "2. Time"): 2.1 measuring time in seconds; 2.2 finding the starting time,
 * finishing time or duration given the other two quantities; 2.3 24-hour clock.
 * h <-> min conversion is P2 2.3 (p.35) and is used here as the prerequisite it
 * is. min/s conversion stays at "1 min = 60 s" with small numbers.
 *
 * NOTATION (Singapore textbook / exam style, used consistently):
 *   12-hour clock   9.45 a.m., 12.15 p.m.  (a dot between hours and minutes)
 *                   a full hour in an explanation prints as 10.00 a.m.; noon as "12 noon"
 *   24-hour clock   HH:MM, 2-digit hours and 2-digit minutes with a colon, leading
 *                   zero kept, no "h", no "hrs":  09:45, 13:15, 21:30, 00:25
 *                   (Kev's ruling 2026-10-07; was 4 bare digits "0945" before)
 *   durations       1 h 35 min, 45 min, 2 h
 * No item ever prints a time after 11.55 p.m. or a stem time in the 12 a.m. hour,
 * and nothing prints 24xx or a minute value of 60 or more.
 *
 * Typed answers are bare whole numbers only (minutes or seconds) because
 * MQI.gradeTyped reads numbers: "10.20 a.m." and "2 h 15 min" would not parse, so
 * every item whose answer IS a clock time or an h-min duration is multiple choice.
 * core.js is untouched.
 */
(function () {
  const G = MQI.gen;
  const ri = G.ri, pick = G.pick, shuffle = G.shuffle, finishTyped = G.finishTyped;

  const NAMES = ['Wei Jie','Aisyah','Kavitha','Jun Hao','Siti','Priya','Daryl','Xin Yi','Farhan','Mei Ling','Charlotte','Nurul'];

  /* ---------- time helpers (t = minutes after midnight) ---------- */
  const pad2 = n => (n < 10 ? '0' : '') + n;
  function t12(t) {
    if (t === 720) return '12 noon';
    const h = Math.floor(t / 60), m = t % 60;
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return h12 + '.' + pad2(m) + ' ' + (h < 12 ? 'a.m.' : 'p.m.');
  }
  const T12 = t12;
  const t24 = t => pad2(Math.floor(t / 60)) + ':' + pad2(t % 60);
  function dur(d) {
    const h = Math.floor(d / 60), m = d % 60;
    if (!h) return m + ' min';
    if (!m) return h + ' h';
    return h + ' h ' + m + ' min';
  }
  /* a clock time a stem or an option may print: 12.05 a.m. is allowed ONLY as the
     a.m./p.m. slip on a 12.xx p.m. key; nothing reaches midnight */
  const okT = t => Number.isInteger(t) && t >= 5 && t <= 23 * 60 + 55;
  const m5 = (lo, hi) => 5 * ri(Math.ceil(lo / 5), Math.floor(hi / 5));
  const floorH = t => t - (t % 60);
  const ceilH = t => (t % 60 ? t - (t % 60) + 60 : t);

  /* "count on" the way SG pupils draw a timeline: to the next hour, whole hours,
     then the minutes left. Returns one child-readable sentence. */
  function countOn(s, e, fmt) {
    const t12 = fmt || T12;   /* the 24-hour T1 items count on in HH:MM */
    const parts = [], steps = [];
    let cur = s;
    if (cur % 60 && ceilH(cur) <= e) {
      const nx = ceilH(cur);
      parts.push('From ' + t12(cur) + ' to ' + t12(nx) + ' is ' + dur(nx - cur) + '.');
      steps.push(nx - cur); cur = nx;
    }
    const whole = floorH(e) - cur;
    if (whole >= 60 && cur % 60 === 0) {
      parts.push('From ' + t12(cur) + ' to ' + t12(cur + whole) + ' is ' + dur(whole) + '.');
      steps.push(whole); cur += whole;
    }
    if (e > cur) {
      parts.push('From ' + t12(cur) + ' to ' + t12(e) + ' is ' + dur(e - cur) + '.');
      steps.push(e - cur);
    }
    if (steps.length > 1) parts.push('Altogether: ' + steps.map(dur).join(' + ') + ' = ' + dur(e - s) + '.');
    return parts.join(' ');
  }

  /* MC with string options: three distinct distractors drawn at random from a list
     of named misconceptions. Returns null when the draw cannot field three (the
     generator then redraws), so no padding ever ships. */
  /* a 12-hour time already ends in a full stop ("9.45 a.m."), so a sentence that
     ends on one must not add a second */
  const tidy = s => String(s).replace(/(a\.m|p\.m)\.\./g, '$1.');
  const typed = (stem, ans, explain, unit) => {
    const q = finishTyped(tidy(stem), ans, tidy(explain), unit);
    return q;
  };
  function mcStr(stem, key, cands, explain) {
    stem = tidy(stem); explain = tidy(explain);
    const seen = new Set([key]), ds = [];
    for (const c of shuffle(cands)) {
      if (c && !seen.has(c)) { seen.add(c); ds.push(c); if (ds.length === 3) break; }
    }
    if (ds.length < 3) return null;
    const opts = shuffle([key].concat(ds));
    return { q: stem, extra: '', choices: opts, correct: opts.indexOf(key),
             explain, answerText: key, optionSet: opts.slice() };
  }
  function redraw(f) {
    for (let i = 0; i < 500; i++) { const q = f(); if (q) return q; }
    throw new Error('p3time: generator could not draw a valid item');
  }
  /* difficulty band for the mock (hard lane 2026-10-07): 2 = standard, 3 = exam-hard multi-step;
     stretch marks a shape beyond the core exam (a slow watch) */
  const band3 = (q, stretch) => { if (q) { q.band = 3; if (stretch) q.stretch = true; } return q; };
  const band2 = q => { if (q) q.band = 2; return q; };
  const times = ts => ts.every(okT) ? ts.map(t12) : [];

  /* MATHS COACHING CARD 2026-10-17: the multi-step items emit a named technique and 3-5
     think-aloud steps built from their own drawn numbers (tools/coach-steps.mjs re-checks
     every clock sum "9.45 a.m. + 1 h 20 min = 11.05 a.m." and every minute sum, and that
     the last step reaches the key, on 2,000+ draws). A step never ends a 12-hour time
     with a second full stop (tidy). optionFeedback speaks to a named slip; a value two
     slips share is left uncoached. */
  const coach = (q, technique, steps) => { if (q) { q.technique = technique; q.steps = steps.map(tidy); } return q; };
  function slips(q, pairs) {
    if (!q) return q;
    const n = {};
    pairs.forEach(p => { if (p[0]) n[p[0]] = (n[p[0]] || 0) + 1; });
    const of = {};
    for (const [txt, say] of pairs) {
      if (!txt || n[txt] > 1) continue;
      const i = q.choices.indexOf(txt);
      if (i >= 0 && i !== q.correct) of[i] = tidy(say);
    }
    if (Object.keys(of).length) q.optionFeedback = of;
    return q;
  }
  /* count on (or back) by a duration, the end time bold:
     "13:35 + 2 h = 15:35, then 15:35 + 10 min = <b>15:45</b>" */
  function onBy(s, d, fmt, back) {
    const h = Math.floor(d / 60), m = d % 60, sg = back ? ' − ' : ' + ', dir = back ? -1 : 1, e = s + dir * d;
    const parts = [];
    let cur = s;
    if (h) { const nx = cur + dir * h * 60; parts.push(fmt(cur) + sg + h + ' h = ' + (m ? fmt(nx) : '<b>' + fmt(nx) + '</b>')); cur = nx; }
    if (m) parts.push(fmt(cur) + sg + m + ' min = <b>' + fmt(e) + '</b>');
    return parts.join(', then ');
  }
  /* the timeline jumps from s to e: to the next o'clock, whole hours, the minutes left */
  function legs(s, e) {
    const out = [];
    let cur = s;
    if (cur % 60 && ceilH(cur) <= e) { out.push([cur, ceilH(cur)]); cur = ceilH(cur); }
    if (floorH(e) - cur >= 60) { out.push([cur, floorH(e)]); cur = floorH(e); }
    if (e > cur) out.push([cur, e]);
    return out;
  }
  /* two steps: the jumps as clock sums, then the jumps added up. asMin: the key is
     "N min" (typed); otherwise it is the h-min duration dur(e - s) */
  function jumpSteps(s, e, fmt, asMin) {
    const L = legs(s, e), d = e - s;
    const st = ['Jump along the timeline: ' + L.map(x => fmt(x[0]) + ' + ' + dur(x[1] - x[0]) + ' = ' + fmt(x[1])).join(', then ') + '.'];
    if (L.length > 1) st.push('Add the jumps: ' + L.map(x => (x[1] - x[0]) + ' min').join(' + ') + ' = ' +
      (asMin ? '<b>' + d + ' min</b>.' : d + ' min, which is <b>' + dur(d) + '</b>.'));
    else {
      const k = '<b>' + (asMin ? d + ' min' : dur(d)) + '</b>.';
      if (floorH(s) === floorH(e)) st.push('Count the minutes: ' + (e % 60) + ' − ' + (s % 60) + ' = ' + k);
      else if (e === ceilH(s)) st.push('To the o\'clock is 60 − ' + (s % 60) + ' = ' + k);
      else st.push('That is ' + dur(d) + ' = ' + d + ' min, so it took ' + k);
    }
    return st;
  }
  /* the slips a duration answer is usually built from */
  function durSlips(s, e, borrow, fmt) {
    const d = e - s, t12 = fmt || T12;
    return [[dur(d + 60), 'Close: one hour too many. Count the whole hours on the timeline again.'],
      [dur(d - 60), 'Close: one hour went missing. Count the whole hours on the timeline again.'],
      [dur(floorH(e) - s), 'Lots of children pick this, because they stop at ' + t12(floorH(e)) + '. Keep going for the last ' + (e % 60) + ' min too.'],
      [dur(e - ceilH(s)), 'Lots of children pick this, because they start at the next o\'clock. The first ' + (ceilH(s) - s) + ' min count too.'],
      [borrow ? dur(d + 40) : '', 'Lots of children pick this, because they take the times away like ordinary numbers. An hour is 60 min, not 100, so count on along a timeline instead.']];
  }

  /* =====================================================================
     SKILL units: seconds, and hours <-> minutes
     ===================================================================== */

  /* 2.1 "a sense of 1 second / 10 seconds": which unit fits? The number is fixed
     and plausible for exactly one unit; the other three are 60 times (or more)
     too short or too long. */
  const UNITS = ['second', 'minute', 'hour', 'day'];
  const ACTS = [
    ['Blinking your eyes once takes about', 1, 'second'],
    ['Writing your own name takes about', 10, 'second'],
    ['Clapping your hands 5 times takes about', 3, 'second'],
    ['Running 50 m on sports day takes about', 12, 'second'],
    ['Tying your shoelaces takes about', 20, 'second'],
    ['Saying "Good morning, teacher!" takes about', 2, 'second'],
    ['Brushing your teeth takes about', 2, 'minute'],
    ['Eating a plate of chicken rice takes about', 15, 'minute'],
    ['Taking a shower takes about', 10, 'minute'],
    ['Recess at school lasts about', 30, 'minute'],
    ['Boiling an egg takes about', 10, 'minute'],
    ['Singing "Majulah Singapura" takes about', 1, 'minute'],
    ['A night of sleep for a P3 pupil lasts about', 9, 'hour'],
    ['A school day lasts about', 6, 'hour'],
    ['A flight from Singapore to Tokyo takes about', 7, 'hour'],
    ['A movie at the cinema lasts about', 2, 'hour'],
    ['The June school holidays last about', 28, 'day'],
    ['A long-weekend family trip to Malaysia lasts about', 3, 'day'],
    ['A bunch of bananas stays fresh for about', 5, 'day']
  ];
  const plural = (n, u) => n === 1 ? u : u + 's';
  function gUnitJudge() {
    const [text, n, unit] = pick(ACTS);
    const i = UNITS.indexOf(unit);
    const opts = UNITS.map(u => plural(n, u));
    const key = plural(n, unit);
    const shorter = i > 0 ? n + ' ' + plural(n, UNITS[i - 1]) + ' would be far too short' : '';
    const longer = i < 3 ? n + ' ' + plural(n, UNITS[i + 1]) + ' would be far too long' : '';
    const why = [shorter, longer].filter(Boolean).join(', and ');
    const q = mcStr('Which word fits best? ' + text + ' ' + n + ' ____.', key,
      opts.filter(o => o !== key),
      text + ' ' + n + ' ' + key + '. ' + why.charAt(0).toUpperCase() + why.slice(1) + '.');
    return q;
  }

  function gHMinToMin() {
    const h = ri(1, 4), m = ri(3, 57);
    const a = h * 60 + m;
    return typed(h + ' h ' + m + ' min = ? min', a,
      '1 h = 60 min, so ' + h + ' h = ' + (h * 60) + ' min. Then ' + (h * 60) + ' min + ' + m + ' min = ' + a + ' min.',
      'min');
  }

  function gMinToHMin() {
    return redraw(() => {
      const T = ri(65, 290);
      if (T % 60 === 0) return null;
      const h = Math.floor(T / 60), m = T % 60;
      const cands = [];
      /* 1 h treated as 100 min: 135 min read as 1 h 35 min */
      if (T >= 100 && T % 100 < 60 && T % 100 > 0) cands.push(Math.floor(T / 100) + ' h ' + (T % 100) + ' min');
      cands.push(dur(T - 60), dur(T + 60));
      /* the minutes taken away from 60 instead of left over */
      if (m !== 30) cands.push(dur(h * 60 + (60 - m)));
      return mcStr('Write ' + T + ' min in hours and minutes.', dur(T), cands,
        (h === 1 ? '60 min = 1 h. ' : '60 min = 1 h, so ' + (h * 60) + ' min = ' + h + ' h. ') + T + ' min - ' + (h * 60) + ' min = ' + m + ' min left over. So ' +
        T + ' min = ' + dur(T) + '.');
    });
  }

  /* pool 3, two steps: change both laps to seconds, then add or compare */
  const SPORTS = [['swam', 'lap', 'laps', 'of the pool'], ['ran', 'round', 'rounds', 'of the school field'], ['cycled', 'round', 'rounds', 'of the park']];
  function gTwoLaps() {
    return band2(redraw(() => {
      const who = pick(NAMES), [verb, one, many, where] = pick(SPORTS);
      const a = 60 * ri(1, 2) + ri(5, 55), b = 60 * ri(1, 2) + ri(5, 55);
      if (a === b) return null;
      const ms = x => Math.floor(x / 60) + ' min ' + (x % 60) + ' s';
      const conv = x => ms(x) + ' = ' + (Math.floor(x / 60) * 60) + ' s + ' + (x % 60) + ' s = ' + x + ' s.';
      const toS = (x, n) => 'The ' + n + ' ' + one + ', ' + ms(x) + ': ' + Math.floor(x / 60) + ' × 60 + ' + (x % 60) + ' = ' + x + ' s.';
      const lead = ['Units check: the answer is in seconds, so change both times to seconds first. 1 min = 60 s.', toS(a, 'first'), toS(b, 'second')];
      if (ri(0, 1)) {
        return coach(typed(who + ' ' + verb + ' 2 ' + many + ' ' + where + '. The first ' + one + ' took ' + ms(a) + ' and the second took ' +
          ms(b) + '. How many seconds did ' + who + ' take for both ' + many + ' altogether?', a + b,
          '1 min = 60 s. ' + conv(a) + ' ' + conv(b) + ' Then ' + a + ' s + ' + b + ' s = ' + (a + b) + ' s.', 's'),
          'Units check', lead.concat(['Both ' + many + ' together: ' + a + ' + ' + b + ' = <b>' + (a + b) + ' s</b>.']));
      }
      const fast = Math.min(a, b), slow = Math.max(a, b);
      const which = a < b ? 'first' : 'second';
      return coach(typed(who + ' ' + verb + ' 2 ' + many + ' ' + where + '. The first ' + one + ' took ' + ms(a) + ' and the second took ' +
        ms(b) + '. How many seconds faster was the ' + which + ' one?', slow - fast,
        '1 min = 60 s. ' + conv(a) + ' ' + conv(b) + ' Then ' + slow + ' s - ' + fast + ' s = ' + (slow - fast) + ' s.', 's'),
        'Units check', lead.concat(['"How much faster" is the difference: ' + slow + ' − ' + fast + ' = <b>' + (slow - fast) + ' s</b>.']));
    }));
  }

  /* =====================================================================
     SKILL duration: starting time, finishing time, duration
     ===================================================================== */
  const LESSONS = ['The Maths lesson', 'The P.E. lesson', 'The spelling test', 'The art lesson', 'The library period', 'The English lesson'];
  const SHOWS = ['A magic show', 'A school concert', 'A movie', 'A puppet show', 'A swimming carnival', 'A National Day rehearsal'];
  const TRIPS = ['The bus ride to the zoo', 'The ferry trip to Pulau Ubin', 'The drive to Johor Bahru', 'The train ride to Changi Airport', 'The school excursion'];

  function gDurationMin() {
    return redraw(() => {
      const s = 60 * ri(7, 12) + m5(5, 55), d = m5(15, 55), e = s + d;   /* school hours */
      if (!okT(e) || e === 720) return null;
      const what = pick(LESSONS);
      return typed(what + ' started at ' + t12(s) + ' and ended at ' + t12(e) + '. How long did it last, in minutes?',
        d, countOn(s, e), 'min');
    });
  }

  function gFinishTime() {
    return redraw(() => {
      const s = 60 * ri(9, 19) + m5(5, 55);
      const dh = ri(1, 2), dm = m5(5, 55), d = dh * 60 + dm;
      if ((s % 60) + dm < 60 && ri(0, 3)) return null;       /* mostly carry across an hour */
      const e = s + d;
      if (!okT(e) || e > 22 * 60 + 55 || e % 60 === 0) return null;
      const cands = [e - 60, e + 60, floorH(s) + d, ceilH(s) + d];
      if (s < 720 && e >= 720) cands.push(e - 720 >= 60 ? e - 720 : null);   /* kept the a.m. */
      const opts = cands.filter(c => c !== null && okT(c) && c >= 60).map(t12);
      const show = pick(SHOWS);
      return slips(coach(mcStr(show + ' started at ' + t12(s) + ' and lasted ' + dur(d) + '. What time did it end?', t12(e), opts,
        'Count on from ' + t12(s) + ': ' + t12(s) + ' + ' + dh + ' h = ' + t12(s + dh * 60) + '. Then ' + t12(s + dh * 60) + ' + ' + dm +
        ' min = ' + t12(e) + '.'), 'Draw a timeline', [
          'Draw a timeline. Mark the start, ' + t12(s) + ', then count on ' + dur(d) + ': the hours first, then the minutes.',
          'The hours: ' + t12(s) + ' + ' + dh + ' h = ' + t12(s + dh * 60) + '.',
          'The minutes: ' + t12(s + dh * 60) + ' + ' + dm + ' min = <b>' + t12(e) + '</b>']), [
          [t12(e - 60), 'Close: one hour went missing. Count on exactly ' + dh + ' h, then ' + dm + ' min.'],
          [t12(e + 60), 'Close: one hour too many. Count on exactly ' + dh + ' h, then ' + dm + ' min.'],
          [t12(floorH(s) + d), 'Lots of children pick this, because they count on from ' + t12(floorH(s)) + ' and drop the ' + (s % 60) + ' min of the start time.'],
          [t12(ceilH(s) + d), 'Lots of children pick this, because they start counting at the next o\'clock, ' + t12(ceilH(s)) + '. Start from ' + t12(s) + ' itself.'],
          [s < 720 && e >= 720 && e - 720 >= 60 ? t12(e - 720) : '', 'The hours and minutes are right. The show ran past 12 noon, so it ended in the p.m.']]);
    });
  }

  function gStartTime() {
    return redraw(() => {
      const e = 60 * ri(9, 21) + m5(5, 55);
      const dh = ri(1, 2), dm = m5(5, 55), d = dh * 60 + dm;
      if ((e % 60) >= dm && ri(0, 3)) return null;            /* mostly borrow an hour */
      const s = e - d;
      if (!okT(s) || s < 7 * 60 || s % 60 === 0) return null;
      const cands = [e + d, s + 60, s - 60, floorH(e) - d];
      if (s < 720 && e >= 720) cands.push(s + 720);          /* wrote p.m. for the start */
      const opts = cands.filter(c => okT(c) && c >= 60 && c !== e).map(t12);
      const what = pick(SHOWS.concat(TRIPS));
      return slips(coach(mcStr(what + ' ended at ' + t12(e) + '. It lasted ' + dur(d) + '. What time did it start?', t12(s), opts,
        'Count back from ' + t12(e) + ': ' + t12(e) + ' - ' + dh + ' h = ' + t12(e - dh * 60) + '. Then ' + t12(e - dh * 60) + ' - ' + dm +
        ' min = ' + t12(s) + '. Check: ' + t12(s) + ' + ' + dur(d) + ' = ' + t12(e) + '.'), 'Work backwards', [
          'Work backwards: start at the end, ' + t12(e) + ', and count back ' + dur(d) + '.',
          'Take off the hours first: ' + t12(e) + ' − ' + dh + ' h = ' + t12(e - dh * 60) + '.',
          'Then the minutes: ' + t12(e - dh * 60) + ' − ' + dm + ' min = <b>' + t12(s) + '</b>']), [
          [t12(e + d), 'Lots of children pick this, because they count on. ' + t12(e) + ' is when it ENDED, so count back to find the start.'],
          [t12(s + 60), 'Close: one hour too few was taken off. Count back exactly ' + dh + ' h, then ' + dm + ' min.'],
          [t12(s - 60), 'Close: one hour too many was taken off. Count back exactly ' + dh + ' h, then ' + dm + ' min.'],
          [t12(floorH(e) - d), 'Lots of children pick this, because they count back from ' + t12(floorH(e)) + ' and drop the ' + (e % 60) + ' min of the end time.'],
          [s < 720 && e >= 720 ? t12(s + 720) : '', 'The hours and minutes are right. It started before 12 noon, so the start is a.m.']]);
    });
  }

  function gDurationHMin() {
    return redraw(() => {
      const s = 60 * ri(7, 18) + m5(5, 55), d = m5(65, 175), e = s + d;
      if (!okT(e) || e % 60 === 0 || e === 720) return null;
      const borrow = (e % 60) < (s % 60);
      if (!borrow && ri(0, 3)) return null;
      const cands = [d + 60, d - 60,
        floorH(e) - s,                                         /* left off the minutes after the last o'clock */
        e - ceilH(s)];                                         /* started counting at the next o'clock */
      if (borrow) cands.push(d + 40);                          /* 1 h treated as 100 min */
      const sh = Math.floor(s / 60) % 12 || 12, eh = Math.floor(e / 60) % 12 || 12;
      if (eh > sh) cands.push((eh - sh) * 60 + Math.abs((e % 60) - (s % 60)));   /* took the smaller minutes from the bigger */
      if (s < 720 && e >= 720) cands.push(720 - d);           /* subtracted the clock numbers the wrong way */
      const opts = cands.filter(c => c > 0 && c < 12 * 60).map(dur);
      const what = pick(TRIPS);
      return slips(coach(mcStr(what + ' started at ' + t12(s) + ' and ended at ' + t12(e) + '. How long did it take?', dur(d), opts,
        countOn(s, e)), 'Draw a timeline',
        ['Draw a timeline from ' + t12(s) + ' to ' + t12(e) + '. Jump to the next o\'clock first, then whole hours, then the minutes left.']
          .concat(jumpSteps(s, e, t12))), durSlips(s, e, borrow));
    });
  }

  /* pool 3, two steps: add the two parts, then count on from the start */
  const TASKS = [['her homework', 'Maths', 'English'], ['her chores', 'washing the dishes', 'folding the clothes'],
                 ['his homework', 'Science', 'Chinese'], ['his practice', 'the piano', 'the violin']];
  function gTwoActivities() {
    return band2(redraw(() => {
      const [what, a, b] = pick(TASKS);
      const he = what.startsWith('his');
      const who = he ? pick(['Wei Jie', 'Jun Hao', 'Daryl', 'Farhan']) : pick(['Aisyah', 'Kavitha', 'Siti', 'Priya', 'Xin Yi', 'Charlotte']);
      const s = 60 * ri(14, 19) + m5(5, 55), x = m5(15, 55), y = m5(15, 55), e = s + x + y;
      if (x === y || !okT(e) || e % 60 === 0 || e > 21 * 60 + 55) return null;
      if ((s % 60) + x + y < 60) return null;
      const cands = [s + x, s + y, e - 60, e + 60, ceilH(s) + x + y].filter(c => okT(c) && c !== e).map(t12);
      return slips(coach(mcStr(who + ' started ' + what + ' at ' + t12(s) + '. ' + (he ? 'He' : 'She') + ' spent ' + x + ' min on ' + a +
        ' and then ' + y + ' min on ' + b + '. What time did ' + (he ? 'he' : 'she') + ' finish?', t12(e), cands,
        'First add the two parts: ' + x + ' min + ' + y + ' min = ' + dur(x + y) + '. Then count on from ' + t12(s) + ' by ' +
        dur(x + y) + ': the answer is ' + t12(e) + '.'), 'Draw a timeline', [
          'Draw a timeline from ' + t12(s) + ' with two parts: ' + x + ' min of ' + a + ', then ' + y + ' min of ' + b + '.',
          'Add the two parts: ' + x + ' min + ' + y + ' min = ' + (x + y) + ' min' + (x + y >= 60 ? ', which is ' + dur(x + y) : '') + '.',
          'Count on from ' + t12(s) + ': ' + onBy(s, x + y, t12)]), [
          [t12(s + x), 'Good start: that is when ' + a + ' ended. Keep going: add the ' + y + ' min of ' + b + ' too.'],
          [t12(s + y), 'Close: the ' + x + ' min of ' + a + ' was left out. Both parts go on the timeline.'],
          [t12(e - 60), 'Close: one hour went missing. Count on again along the timeline.'],
          [t12(e + 60), 'Close: one hour too many. Count on again along the timeline.'],
          [t12(ceilH(s) + x + y), 'Lots of children pick this, because they start counting at the next o\'clock, ' + t12(ceilH(s)) + '. Start from ' + t12(s) + ' itself.']]);
    }));
  }

  /* =====================================================================
     SKILL clock24: the 24-hour clock
     ===================================================================== */
  function gTo24() {
    return redraw(() => {
      const kind = ri(0, 5);   /* 0: a.m., 1: 12.xx p.m., else afternoon/evening */
      let t, cands, why;
      if (kind === 0) {
        t = 60 * ri(6, 11) + m5(5, 55);
        cands = [t + 720, t + 600, t + 60, t - 60];
        why = 'An a.m. time keeps its hours. Write the hours with 2 digits, putting a 0 in front of a one-digit hour, then a colon and the minutes: ' + t12(t) + ' is ' + t24(t) + '.';
      } else if (kind === 1) {
        t = 720 + m5(5, 55);
        cands = [t - 720, t - 120, t + 60, t + 120];
        why = t12(t) + ' is just after 12 noon, so the hours stay at 12. So ' + t12(t) + ' is ' + t24(t) + '. Only add 12 to p.m. hours from 1 to 11. (00:' + t24(t).slice(3) + ' would be just after midnight.)';
      } else {
        t = 60 * ri(13, 22) + m5(5, 55);
        cands = [t - 720, t - 120, t - 60, t + 60, t + 120];
        const h = Math.floor(t / 60);
        why = 'For a p.m. time, add 12 to the hours: ' + (h - 12) + ' + 12 = ' + h + '. So ' + t12(t) + ' is ' + t24(t) + '.';
      }
      const opts = cands.filter(c => okT(c) && c >= 0).map(t24);
      return mcStr('Write ' + t12(t) + ' in the 24-hour clock.', t24(t), opts, why);
    });
  }

  const PLACES = ['The train to Kuala Lumpur leaves at', 'The ferry to Batam leaves at', 'The plane to Bangkok takes off at',
                  'The last bus leaves at', 'The night safari tram starts at', 'The movie starts at'];
  function gFrom24() {
    return redraw(() => {
      const t = ri(0, 4) ? 60 * ri(13, 22) + m5(5, 55) : 720 + m5(5, 55);
      const cands = [t - 720, t + 120, t - 60, t + 60].filter(c => okT(c) && c !== t).map(t12);
      const h = Math.floor(t / 60);
      const why = h === 12
        ? t24(t) + ' starts with 12, which is the hour just after 12 noon. So it is ' + t12(t) + '.'
        : t24(t) + ' is after 12:00, so it is a p.m. time. Take away 12 from the hours: ' + h + ' - 12 = ' + (h - 12) + '. So it is ' + t12(t) + '.';
      return mcStr(pick(PLACES) + ' ' + t24(t) + '. What is this time in the 12-hour clock?', t12(t), cands, why);
    });
  }

  /* pool 3, two steps: read two 24-hour times, then find the duration */
  const JOURNEYS = ['A train', 'A coach to Malacca', 'A ferry', 'A plane'];
  function gTrain24() {
    return band2(redraw(() => {
      const s = 60 * ri(6, 12) + m5(5, 55), d = m5(95, 290), e = s + d;
      if (!okT(e) || e > 21 * 60 + 55 || e % 60 === 0 || e < 12 * 60) return null;
      const borrow = (e % 60) < (s % 60);
      if (!borrow && ri(0, 3)) return null;
      const cands = [d + 60, d - 60, floorH(e) - s, e - ceilH(s)];
      if (borrow) cands.push(d + 40);
      const sh = Math.floor(s / 60), eh = Math.floor(e / 60);
      cands.push((eh - sh) * 60 + Math.abs((e % 60) - (s % 60)));
      const opts = cands.filter(c => c > 0).map(dur);
      return slips(coach(mcStr(pick(JOURNEYS) + ' left at ' + t24(s) + ' and arrived at ' + t24(e) + '. How long was the journey?', dur(d), opts,
        t24(s) + ' is ' + t12(s) + ' and ' + t24(e) + ' is ' + t12(e) + '. ' + countOn(s, e)), 'Draw a timeline',
        ['Draw a timeline from ' + t24(s) + ' to ' + t24(e) + '. Jump to the next o\'clock first, then whole hours, then the minutes left.']
          .concat(jumpSteps(s, e, t24))), durSlips(s, e, borrow, t24));
    }));
  }

  /* pool 3, two steps: find the finishing time across noon, then write it in the 24-hour clock */
  function gEnd24() {
    return band2(redraw(() => {
      const s = 60 * ri(9, 11) + m5(5, 55), dh = ri(1, 3), dm = m5(5, 55), d = dh * 60 + dm, e = s + d;
      if (e < 12 * 60 + 5 || e % 60 === 0 || e > 17 * 60 + 55) return null;
      const cands = [e - 720, e - 60, e + 60, floorH(s) + d, ceilH(s) + d].filter(c => okT(c) && c !== e).map(t24);
      const show = pick(SHOWS);
      return slips(coach(mcStr(show + ' started at ' + t12(s) + ' and lasted ' + dur(d) + '. When did it end? Give the time in the 24-hour clock.',
        t24(e), cands,
        t12(s) + ' + ' + dh + ' h = ' + t12(s + dh * 60) + ', then + ' + dm + ' min = ' + t12(e) + '. In the 24-hour clock, ' + t12(e) +
        ' is ' + t24(e) + '.'), 'Draw a timeline', [
          'Draw a timeline from the start and count on ' + dur(d) + ', the hours first and then the minutes.',
          'Write the start in the 24-hour clock first: ' + t12(s) + ' is ' + t24(s) + '. After 12:00 the hours keep going: 13, 14, 15 ...',
          'Count on: ' + onBy(s, d, t24)]), [
          [t24(e - 720), 'The hours and minutes on the clock face are right. In the 24-hour clock the hours do not start again after 12 noon, so ' + t12(e) + ' is ' + t24(e) + '.'],
          [t24(e - 60), 'Close: one hour went missing. Count on exactly ' + dh + ' h, then ' + dm + ' min.'],
          [t24(e + 60), 'Close: one hour too many. Count on exactly ' + dh + ' h, then ' + dm + ' min.'],
          [t24(floorH(s) + d), 'Lots of children pick this, because they count on from ' + t24(floorH(s)) + ' and drop the ' + (s % 60) + ' min of the start time.'],
          [t24(ceilH(s) + d), 'Lots of children pick this, because they start counting at the next o\'clock, ' + t24(ceilH(s)) + '. Start from ' + t24(s) + ' itself.']]);
    }));
  }

  /* =====================================================================
     T1 (hard lane 2026-10-07): multi-segment timelines, exam-hard (band 3).
     Every item strings three or more parts together on one timeline, and at
     least one step needs an interpretation: a part to leave out, a time to work
     back from, or a watch that is behind the real time. Distractors are the
     named slips: no carry past 60 (1 h read as 100 min), a part left out, an
     hour gained or lost, the a.m./p.m. slip, and the 12-hour hour written into
     a 24-hour answer (03:10 for 15:10).
     ===================================================================== */
  const GIRLS = ['Aisyah', 'Kavitha', 'Siti', 'Priya', 'Xin Yi', 'Mei Ling', 'Charlotte', 'Nurul'];
  const BOYS = ['Wei Jie', 'Jun Hao', 'Daryl', 'Farhan', 'Ken', 'Arjun'];
  const anyName = () => pick(GIRLS.concat(BOYS));
  /* "13:35 + 2 h = 15:35, then 15:35 + 10 min = 15:45" */
  function stepOn(s, d, fmt) {
    const h = Math.floor(d / 60), m = d % 60, parts = [];
    let cur = s;
    if (h) { parts.push(fmt(cur) + ' + ' + h + ' h = ' + fmt(cur + h * 60)); cur += h * 60; }
    if (m) { parts.push(fmt(cur) + ' + ' + m + ' min = ' + fmt(cur + m)); }
    return parts.join(', then ');
  }
  function stepBack(e, d, fmt) {
    const h = Math.floor(d / 60), m = d % 60, parts = [];
    let cur = e;
    if (h) { parts.push(fmt(cur) + ' - ' + h + ' h = ' + fmt(cur - h * 60)); cur -= h * 60; }
    if (m) { parts.push(fmt(cur) + ' - ' + m + ' min = ' + fmt(cur - m)); }
    return parts.join(', then ');
  }
  /* add the parts in minutes: "1 h 5 min = 65 min. 40 min + 65 min + 25 min = 130 min = 2 h 10 min." */
  function sumParts(ds) {
    const conv = ds.filter(d => d >= 60).map(d => dur(d) + ' = ' + d + ' min. ').join('');
    const tot = ds.reduce((a, b) => a + b, 0);
    return conv + ds.map(d => d + ' min').join(' + ') + ' = ' + tot + ' min' + (tot >= 60 ? ' = ' + dur(tot) : '') + '.';
  }
  /* the "1 h = 100 min" slip when adding: the minutes column carries at 100, not 60 */
  function slip100On(s, tot) {
    const v = (s % 60) + tot;
    if (v < 60 || v % 100 >= 60) return null;
    return floorH(s) + 60 * Math.floor(v / 100) + (v % 100);
  }
  /* Pick the three distractors so the key's place in the row (earliest .. latest,
     shortest .. longest) is spread evenly: misconceptions that all land on one side
     of the key would let a child answer by picking the latest time. Returns [] when
     the draw cannot balance, and mcStr then redraws. */
  function balance(key, below, above, fmt, ok) {
    const uniq = (xs, side) => [...new Set(xs.filter(x => x !== null && ok(x) && side(x)))];
    const lo = uniq(below, x => x < key), hi = uniq(above, x => x > key);
    const feasible = [0, 1, 2, 3].filter(r => lo.length >= r && hi.length >= 3 - r);
    if (!feasible.length) return [];
    const r = pick(feasible);
    return shuffle(lo).slice(0, r).concat(shuffle(hi).slice(0, 3 - r)).map(fmt);
  }
  const okClock = x => okT(x) && x >= 60;
  const okDur = x => x > 0 && x < 12 * 60;
  const PAPER = t => ' (An exam paper may print ' + t24(t) + ' as ' + t24(t).replace(':', ' ') + ', with a space. It means the same time.)';

  /* T1a: three parts on one afternoon, answer in the 24-hour clock */
  const JOBS = ['Maths homework', 'piano practice', 'Chinese spelling', 'a jigsaw puzzle', 'tidying the room', 'reading a storybook', 'a Science project'];
  function gChain24() {
    return redraw(() => {
      const who = anyName(), [A, B, C] = shuffle(JOBS).slice(0, 3);
      const s = 60 * ri(13, 17) + m5(5, 55), a = m5(15, 55), b = ri(0, 1) ? m5(65, 105) : m5(15, 55), c = m5(15, 55);
      const tot = a + b + c, e = s + tot;
      if (!okT(e) || e > 21 * 60 + 55 || e % 60 === 0) return null;
      const cands = balance(e,
        [e - 720, e - 60, e - a, e - b, e - c, slip100On(s, tot)],   /* 12-h hour kept; no carry; a part left out; carried at 100 */
        [e + 60, ceilH(s) + tot, e + c, b >= 60 ? e + 40 : null],    /* an hour too many; counted from the next o'clock; a part twice; 1 h 5 min read as 105 min */
        t24, okClock);
      return slips(coach(band3(mcStr(who + ' started work at ' + t24(s) + '. ' + who + ' spent ' + dur(a) + ' on ' + A + ', ' + dur(b) + ' on ' + B +
        ' and then ' + dur(c) + ' on ' + C + '. At what time did ' + who + ' finish? Give the time in the 24-hour clock.', t24(e), cands,
        'First add the three parts. ' + sumParts([a, b, c]) + ' Then count on from ' + t24(s) + ': ' + stepOn(s, tot, t24) +
        '. So ' + who + ' finished at ' + t24(e) + '. Afternoon hours stay above 12 in the 24-hour clock.' + PAPER(e))), 'Draw a timeline', [
          'Draw a timeline from ' + t24(s) + ' with three parts: ' + A + ', ' + B + ' and ' + C + '.',
          (b >= 60 ? 'Change to minutes first: ' + dur(b) + ' = ' + b + ' min. ' : '') +
            'Add the parts: ' + a + ' min + ' + b + ' min + ' + c + ' min = ' + tot + ' min' + (tot >= 60 ? ', which is ' + dur(tot) : '') + '.',
          'Count on from ' + t24(s) + ': ' + onBy(s, tot, t24)]), [
          [t24(e - 720), 'The hours and minutes on the clock face are right. Afternoon hours stay above 12 in the 24-hour clock.'],
          [t24(e - a), 'Close: the ' + dur(a) + ' of ' + A + ' was left out. All three parts go on the timeline.'],
          [t24(e - b), 'Close: the ' + dur(b) + ' of ' + B + ' was left out. All three parts go on the timeline.'],
          [t24(e - c), 'Close: the ' + dur(c) + ' of ' + C + ' was left out. All three parts go on the timeline.'],
          [t24(e + c), 'Close: the ' + dur(c) + ' of ' + C + ' was counted twice. Put each part on the timeline once.'],
          [t24(e - 60), 'Close: one hour went missing. Count on again along the timeline.'],
          [t24(e + 60), 'Close: one hour too many. Count on again along the timeline.'],
          [t24(ceilH(s) + tot), 'Lots of children pick this, because they start counting at the next o\'clock, ' + t24(ceilH(s)) + '. Start from ' + t24(s) + ' itself.'],
          [slip100On(s, tot) !== null ? t24(slip100On(s, tot)) : '', 'Lots of children pick this, because the minutes were carried at 100. An hour is 60 min, so 60 minutes make the next hour.'],
          [b >= 60 ? t24(e + 40) : '', 'Lots of children pick this, because ' + dur(b) + ' was read as ' + (Math.floor(b / 60) * 100 + b % 60) + ' min. Change it with 1 h = 60 min.']]);
    });
  }

  /* T1b: wait, then a show, then a bus ride home, all in the 12-hour clock */
  const OUTINGS = ['the Esplanade', 'the Science Centre', 'the Singapore Zoo', 'Gardens by the Bay', 'the National Museum'];
  function gTimeline12() {
    return redraw(() => {
      const who = anyName(), where = pick(OUTINGS);
      const s = 60 * ri(10, 16) + m5(5, 55), w = m5(10, 40), show = m5(65, 135), bus = m5(15, 55);
      const tot = w + show + bus, e = s + tot;
      if (!okT(e) || e % 60 === 0 || e === 720 || e > 20 * 60 + 55) return null;
      if (s >= 720 === e >= 720 && ri(0, 1)) return null;          /* half the draws cross 12 noon */
      const opts = balance(e,
        [e - 60, e - bus, e - w, slip100On(s, tot), s < 720 && e >= 780 ? e - 720 : null],   /* ...; kept the a.m. */
        [e + 60, ceilH(s) + tot, e + 40, e < 720 ? e + 720 : null],     /* ...; 1 h 45 min read as 145 min; wrote p.m. */
        t12, okClock);
      return slips(coach(band3(mcStr(who + ' arrived at ' + where + ' at ' + t12(s) + '. ' + who + ' waited ' + w + ' min for a show to start, watched the ' +
        dur(show) + ' show and then took a ' + bus + ' min bus ride home. What time did ' + who + ' get home?', t12(e), opts,
        'Draw a timeline with three parts: the wait, the show and the bus ride. ' + sumParts([w, show, bus]) + ' Then count on from ' + t12(s) + ': ' +
        stepOn(s, tot, t12) + '. So ' + who + ' got home at ' + t12(e) + '.')), 'Draw a timeline', [
          'Draw a timeline from ' + t12(s) + ' with three parts: the wait, the show and the bus ride.',
          'Change the show to minutes: ' + dur(show) + ' = ' + show + ' min. Add the parts: ' + w + ' min + ' + show + ' min + ' + bus + ' min = ' + tot + ' min, which is ' + dur(tot) + '.',
          'Count on from ' + t12(s) + ': ' + onBy(s, tot, t12)]), [
          [t12(e - bus), 'Good start: that is when the show ended. Add the ' + bus + ' min bus ride home too.'],
          [t12(e - w), 'Close: the ' + w + ' min wait was left out. All three parts go on the timeline.'],
          [slip100On(s, tot) !== null ? t12(slip100On(s, tot)) : '', 'Lots of children pick this, because the minutes were carried at 100. An hour is 60 min, so 60 minutes make the next hour.'],
          [s < 720 && e >= 780 ? t12(e - 720) : '', 'The hours and minutes are right. The trip went past 12 noon, so the time is p.m.'],
          [e < 720 ? t12(e + 720) : '', 'The hours and minutes are right. It is still before 12 noon, so the time is a.m.'],
          [t12(e - 60), 'Close: one hour went missing. Count on again along the timeline.'],
          [t12(e + 60), 'Close: one hour too many. Count on again along the timeline.'],
          [t12(ceilH(s) + tot), 'Lots of children pick this, because they start counting at the next o\'clock, ' + t12(ceilH(s)) + '. Start from ' + t12(s) + ' itself.']]);
    });
  }

  /* T1c: opening hours are given, but only the leaving time matters (the opening time is not needed) */
  const VENUES = [['The library', 'the library'], ['The swimming complex', 'the swimming complex'], ['The Science Centre', 'the Science Centre'],
                  ['The community club', 'the community club']];
  function gStayDuration() {
    return redraw(() => {
      const who = anyName(), [V, v] = pick(VENUES);
      const o = 60 * ri(8, 10) + pick([0, 30]), c = 60 * ri(17, 21) + pick([0, 15, 30, 45]);
      const a = o + m5(40, 240), k = m5(15, 55), l = c - k, d = l - a;
      if (d < 65 || d > 270 || d % 60 === 0 || l % 60 === 0) return null;
      const borrow = (l % 60) < (a % 60);
      if (!borrow && ri(0, 2)) return null;
      const opts = balance(d,
        [d - 60, floorH(l) - a, l - ceilH(a)],                      /* lost an hour; dropped the minutes after the last o'clock; began at the next o'clock */
        [c - a, l - o, d + 60, borrow ? d + 40 : null],             /* stayed till closing; counted from opening; ...; 1 h treated as 100 min */
        dur, okDur);
      return slips(coach(band3(mcStr(V + ' is open from ' + t24(o) + ' to ' + t24(c) + '. ' + who + ' arrived at ' + t24(a) + ' and left ' + k +
        ' min before it closed. How long was ' + who + ' at ' + v + '?', dur(d), opts,
        'First find when ' + who + ' left: ' + stepBack(c, k, t24) + '. The opening time, ' + t24(o) + ', is not needed. ' +
        'Then count on from ' + t24(a) + ' to ' + t24(l) + '. ' + countOn(a, l, t24) +
        (countOn(a, l, t24).indexOf('Altogether') < 0 ? ' So ' + who + ' was there for ' + dur(d) + '.' : ''))), 'Draw a timeline',
        ['Draw a timeline. ' + who + ' left ' + k + ' min before closing: ' + t24(c) + ' − ' + k + ' min = ' + t24(l) + '. The opening time, ' + t24(o) + ', is not needed.',
         'Now count on from ' + t24(a) + ' to ' + t24(l) + '.'].concat(jumpSteps(a, l, t24))), [
          [dur(c - a), 'Lots of children pick this, because they count on to closing time. ' + who + ' left ' + k + ' min before it closed.'],
          [dur(l - o), 'Lots of children pick this, because they count from the opening time. Start from when ' + who + ' arrived, ' + t24(a) + '.']]
          .concat(durSlips(a, l, borrow, t24)));
    });
  }

  /* T1d: work backwards from a deadline over three parts */
  function gLatestStart() {
    return redraw(() => {
      const who = anyName();
      const e = 60 * ri(16, 21) + m5(5, 55), a = m5(20, 45), b = m5(15, 55), c = ri(0, 1) ? m5(25, 55) : m5(65, 95);
      const tot = a + b + c, s = e - tot;
      if (s < 13 * 60 + 5 || s % 60 === 0 || e > 21 * 60 + 55) return null;
      const borrow = (e % 60) < tot % 60;
      const opts = balance(s,
        [s - 720, s - 60, floorH(e) - tot],                         /* 12-h hour; ...; counted back from the o'clock before */
        [s + 60, s + c, s + a, e + tot, borrow ? s + 40 : null],    /* ...; taxi left out; gave the time to start packing; counted on; borrowed 100 min */
        t24, okClock);
      return slips(coach(band3(mcStr(who + ' has to reach Changi Airport by ' + t24(e) + '. Before leaving home, ' + who + ' will eat dinner for ' + a +
        ' min and then pack for ' + b + ' min. The taxi ride to the airport takes ' + dur(c) + '. What is the latest time ' + who +
        ' can start eating dinner? Give the time in the 24-hour clock.', t24(s), opts,
        'Work backwards from ' + t24(e) + '. The three parts are the dinner, the packing and the taxi ride. ' + sumParts([a, b, c]) +
        ' Count back from ' + t24(e) + ': ' + stepBack(e, tot, t24) + '. So the latest time to start dinner is ' + t24(s) +
        '. Check: ' + t24(s) + ' + ' + dur(tot) + ' = ' + t24(e) + '.')), 'Work backwards', [
          'Work backwards from the end, ' + t24(e) + '. Before it come three parts: dinner, packing and the taxi ride.',
          (c >= 60 ? 'Change to minutes first: ' + dur(c) + ' = ' + c + ' min. ' : '') +
            'Add the parts: ' + a + ' min + ' + b + ' min + ' + c + ' min = ' + tot + ' min' + (tot >= 60 ? ', which is ' + dur(tot) : '') + '.',
          'Count back from ' + t24(e) + ': ' + onBy(e, tot, t24, true)]), [
          [t24(s - 720), 'The hours and minutes on the clock face are right. Afternoon and evening hours stay above 12 in the 24-hour clock.'],
          [t24(s - 60), 'Close: one hour too many was taken off. Count back again along the timeline.'],
          [t24(s + 60), 'Close: one hour too few was taken off. Count back again along the timeline.'],
          [t24(floorH(e) - tot), 'Lots of children pick this, because they count back from ' + t24(floorH(e)) + ' and drop the ' + (e % 60) + ' min of the arrival time.'],
          [t24(s + c), 'Close: the ' + dur(c) + ' taxi ride was left out. All three parts go on the timeline.'],
          [t24(s + a), 'Good start: that is the latest time to start packing. Dinner comes before it, so go back ' + a + ' min more.'],
          [t24(e + tot), 'Lots of children pick this, because they count on. ' + t24(e) + ' is the deadline, so count back from it.']]);
    });
  }

  /* T1e: a timeline with a gap to find, typed in minutes */
  const STOPS = ['Changi Airport', 'Jurong East', 'Woodlands', 'HarbourFront', 'Pasir Ris', 'Bishan'];
  function gJourneyMin() {
    return redraw(() => {
      const who = anyName(), stop = pick(STOPS);
      const s = 60 * ri(7, 17) + m5(5, 55), bus = m5(15, 45), wait = m5(5, 20), train = m5(25, 95);
      const board = s + bus + wait, arr = board + train;
      if (!okT(arr) || arr > 21 * 60 + 55 || train === 60 || Math.floor(arr / 60) === Math.floor(board / 60)) return null;
      return coach(band3(typed(who + ' left home at ' + t24(s) + '. The bus ride to the MRT station took ' + bus + ' min. Then ' + who +
        ' waited ' + wait + ' min for a train. The train reached ' + stop + ' at ' + t24(arr) + '. How many minutes did the train ride take?',
        train,
        'Draw a timeline. ' + who + ' got off the bus at ' + t24(s) + ' + ' + bus + ' min = ' + t24(s + bus) + '. The train left at ' +
        t24(s + bus) + ' + ' + wait + ' min = ' + t24(board) + '. Then count on from ' + t24(board) + ' to ' + t24(arr) + '. ' +
        countOn(board, arr, t24) + (train > 60 ? ' ' + dur(train) + ' = 60 min + ' + (train - 60) + ' min = ' + train + ' min.' : '') +
        ' The train ride took ' + train + ' min.', 'min')), 'Draw a timeline', [
          'Draw a timeline with three parts: the bus ride, the wait, then the train.',
          'Off the bus: ' + t24(s) + ' + ' + bus + ' min = ' + t24(s + bus) + '. The train left at ' + t24(s + bus) + ' + ' + wait + ' min = ' + t24(board) + '.',
          'Now count on from ' + t24(board) + ' to ' + t24(arr) + '.'].concat(jumpSteps(board, arr, t24, true)));
    });
  }

  /* T1 stretch: a slow watch */
  function gSlowWatch() {
    return redraw(() => {
      const who = anyName(), k = pick([5, 10, 15]);
      const w = 60 * ri(13, 19) + m5(5, 55), d = m5(65, 150), r = w + k, e = r + d;
      if (!okT(e) || e > 21 * 60 + 55 || e % 60 === 0 || r % 60 === 0 && ri(0, 1)) return null;
      const cands = balance(e,
        [e - 2 * k, e - k, e - 60, e - 720],                        /* took the slow minutes off; ignored the watch; ...; 12-h hour */
        [e + 60, e + 40, ceilH(r) + d],                             /* ...; 1 h 25 min read as 125 min; counted from the next o'clock */
        t24, okClock);
      return slips(coach(band3(mcStr(who + "'s watch is " + k + ' min slow. When a movie started, the watch showed ' + t24(w) + '. The movie lasted ' +
        dur(d) + '. What was the real time when the movie ended? Give the time in the 24-hour clock.', t24(e), cands,
        'A slow watch is behind the real time, so the real time is ' + k + ' min later than the watch shows. When the movie started, the real time was ' +
        t24(w) + ' + ' + k + ' min = ' + t24(r) + '. Then count on by ' + dur(d) + ': ' + stepOn(r, d, t24) + '. The real time was ' + t24(e) + '.'), true),
        'Draw a timeline', [
          'A slow watch is behind, so the real time is ' + k + ' min LATER than the watch shows.',
          'The real start: ' + t24(w) + ' + ' + k + ' min = ' + t24(r) + '. Mark it on the timeline.',
          'Count on ' + dur(d) + ': ' + onBy(r, d, t24)]), [
          [t24(e - 2 * k), 'Lots of children pick this, because they take the ' + k + ' min off. A slow watch is behind, so ADD them.'],
          [t24(e - k), 'Good start: the movie part is right. Now add the ' + k + ' min the watch is behind.'],
          [t24(e - 60), 'Close: one hour went missing. Count on again along the timeline.'],
          [t24(e + 60), 'Close: one hour too many. Count on again along the timeline.'],
          [t24(e - 720), 'The hours and minutes on the clock face are right. Afternoon hours stay above 12 in the 24-hour clock.'],
          [t24(ceilH(r) + d), 'Lots of children pick this, because they start counting at the next o\'clock, ' + t24(ceilH(r)) + '. Start from ' + t24(r) + ' itself.']]);
    });
  }

  MQI.registerTopic({
    id: 'p3time', level: 'P3', strand: 'Measurement and Geometry',
    moeSubTopic: "Time: measuring time in seconds; finding the starting time, finishing time or duration given the other two quantities; 24-hour clock",
    label: 'Clocktower Quay', short: 'Time', e: '⏰',
    skills: {
      units:    { label: 'Seconds, hours and minutes', tip: '1 h = 60 min and 1 min = 60 s, never 100. Ask "is that seconds, minutes or hours?" about everyday jobs.' },
      duration: { label: 'Start, finish and how long', tip: 'Draw a timeline: count on to the next o\'clock first, then whole hours, then the minutes left.' },
      clock24:  { label: 'The 24-hour clock', tip: 'For p.m. times from 1 p.m. on, add 12 to the hours (3.15 p.m. is 15:15). Always write 2 digits for the hours: 9.05 a.m. is 09:05. Read train and bus timetables together. Exam papers often print 24-hour times with a space instead of a colon (14 25 means 14:25). For a journey with several parts, draw a timeline and mark each part on it.' }
    },
    pools: {
      1: [[gUnitJudge, 'units'], [gHMinToMin, 'units'], [gDurationMin, 'duration'], [gTo24, 'clock24']],
      2: [[gMinToHMin, 'units'], [gFinishTime, 'duration'], [gStartTime, 'duration'], [gDurationHMin, 'duration'], [gFrom24, 'clock24']],
      3: [[gTwoActivities, 'duration'], [gTwoLaps, 'units'], [gTrain24, 'clock24'], [gEnd24, 'clock24'],
          [gChain24, 'clock24'], [gTimeline12, 'duration'], [gStayDuration, 'clock24'], [gLatestStart, 'clock24'],
          [gJourneyMin, 'duration'], [gSlowWatch, 'clock24']]
    }
  });
})();
