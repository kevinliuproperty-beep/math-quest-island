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
 *   24-hour clock   four digits, no colon, no space, no "h":  0945, 1315, 2130
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
  const t24 = t => pad2(Math.floor(t / 60)) + pad2(t % 60);
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
  function countOn(s, e) {
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
  const times = ts => ts.every(okT) ? ts.map(t12) : [];

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
    return redraw(() => {
      const who = pick(NAMES), [verb, one, many, where] = pick(SPORTS);
      const a = 60 * ri(1, 2) + ri(5, 55), b = 60 * ri(1, 2) + ri(5, 55);
      if (a === b) return null;
      const ms = x => Math.floor(x / 60) + ' min ' + (x % 60) + ' s';
      const conv = x => ms(x) + ' = ' + (Math.floor(x / 60) * 60) + ' s + ' + (x % 60) + ' s = ' + x + ' s.';
      if (ri(0, 1)) {
        return typed(who + ' ' + verb + ' 2 ' + many + ' ' + where + '. The first ' + one + ' took ' + ms(a) + ' and the second took ' +
          ms(b) + '. How many seconds did ' + who + ' take for both ' + many + ' altogether?', a + b,
          '1 min = 60 s. ' + conv(a) + ' ' + conv(b) + ' Then ' + a + ' s + ' + b + ' s = ' + (a + b) + ' s.', 's');
      }
      const fast = Math.min(a, b), slow = Math.max(a, b);
      const which = a < b ? 'first' : 'second';
      return typed(who + ' ' + verb + ' 2 ' + many + ' ' + where + '. The first ' + one + ' took ' + ms(a) + ' and the second took ' +
        ms(b) + '. How many seconds faster was the ' + which + ' one?', slow - fast,
        '1 min = 60 s. ' + conv(a) + ' ' + conv(b) + ' Then ' + slow + ' s - ' + fast + ' s = ' + (slow - fast) + ' s.', 's');
    });
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
      return mcStr(show + ' started at ' + t12(s) + ' and lasted ' + dur(d) + '. What time did it end?', t12(e), opts,
        'Count on from ' + t12(s) + ': ' + t12(s) + ' + ' + dh + ' h = ' + t12(s + dh * 60) + '. Then ' + t12(s + dh * 60) + ' + ' + dm +
        ' min = ' + t12(e) + '.');
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
      return mcStr(what + ' ended at ' + t12(e) + '. It lasted ' + dur(d) + '. What time did it start?', t12(s), opts,
        'Count back from ' + t12(e) + ': ' + t12(e) + ' - ' + dh + ' h = ' + t12(e - dh * 60) + '. Then ' + t12(e - dh * 60) + ' - ' + dm +
        ' min = ' + t12(s) + '. Check: ' + t12(s) + ' + ' + dur(d) + ' = ' + t12(e) + '.');
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
      return mcStr(what + ' started at ' + t12(s) + ' and ended at ' + t12(e) + '. How long did it take?', dur(d), opts,
        countOn(s, e));
    });
  }

  /* pool 3, two steps: add the two parts, then count on from the start */
  const TASKS = [['her homework', 'Maths', 'English'], ['her chores', 'washing the dishes', 'folding the clothes'],
                 ['his homework', 'Science', 'Chinese'], ['his practice', 'the piano', 'the violin']];
  function gTwoActivities() {
    return redraw(() => {
      const [what, a, b] = pick(TASKS);
      const he = what.startsWith('his');
      const who = he ? pick(['Wei Jie', 'Jun Hao', 'Daryl', 'Farhan']) : pick(['Aisyah', 'Kavitha', 'Siti', 'Priya', 'Xin Yi', 'Charlotte']);
      const s = 60 * ri(14, 19) + m5(5, 55), x = m5(15, 55), y = m5(15, 55), e = s + x + y;
      if (x === y || !okT(e) || e % 60 === 0 || e > 21 * 60 + 55) return null;
      if ((s % 60) + x + y < 60) return null;
      const cands = [s + x, s + y, e - 60, e + 60, ceilH(s) + x + y].filter(c => okT(c) && c !== e).map(t12);
      return mcStr(who + ' started ' + what + ' at ' + t12(s) + '. ' + (he ? 'He' : 'She') + ' spent ' + x + ' min on ' + a +
        ' and then ' + y + ' min on ' + b + '. What time did ' + (he ? 'he' : 'she') + ' finish?', t12(e), cands,
        'First add the two parts: ' + x + ' min + ' + y + ' min = ' + dur(x + y) + '. Then count on from ' + t12(s) + ' by ' +
        dur(x + y) + ': the answer is ' + t12(e) + '.');
    });
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
        why = 'An a.m. time keeps its hours. Write it with 4 digits, putting a 0 in front of a one-digit hour: ' + t12(t) + ' is ' + t24(t) + '.';
      } else if (kind === 1) {
        t = 720 + m5(5, 55);
        cands = [t - 720, t - 120, t + 60, t + 120];
        why = t12(t) + ' is just after 12 noon, so the hours stay at 12: ' + t24(t) + '. Only add 12 to p.m. hours from 1 to 11.';
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
        : t24(t) + ' is after 1200, so it is a p.m. time. Take away 12 from the hours: ' + h + ' - 12 = ' + (h - 12) + '. So it is ' + t12(t) + '.';
      return mcStr(pick(PLACES) + ' ' + t24(t) + '. What is this time in the 12-hour clock?', t12(t), cands, why);
    });
  }

  /* pool 3, two steps: read two 24-hour times, then find the duration */
  const JOURNEYS = ['A train', 'A coach to Malacca', 'A ferry', 'A plane'];
  function gTrain24() {
    return redraw(() => {
      const s = 60 * ri(6, 12) + m5(5, 55), d = m5(95, 290), e = s + d;
      if (!okT(e) || e > 21 * 60 + 55 || e % 60 === 0 || e < 12 * 60) return null;
      const borrow = (e % 60) < (s % 60);
      if (!borrow && ri(0, 3)) return null;
      const cands = [d + 60, d - 60, floorH(e) - s, e - ceilH(s)];
      if (borrow) cands.push(d + 40);
      const sh = Math.floor(s / 60), eh = Math.floor(e / 60);
      cands.push((eh - sh) * 60 + Math.abs((e % 60) - (s % 60)));
      const opts = cands.filter(c => c > 0).map(dur);
      return mcStr(pick(JOURNEYS) + ' left at ' + t24(s) + ' and arrived at ' + t24(e) + '. How long was the journey?', dur(d), opts,
        t24(s) + ' is ' + t12(s) + ' and ' + t24(e) + ' is ' + t12(e) + '. ' + countOn(s, e));
    });
  }

  /* pool 3, two steps: find the finishing time across noon, then write it in the 24-hour clock */
  function gEnd24() {
    return redraw(() => {
      const s = 60 * ri(9, 11) + m5(5, 55), dh = ri(1, 3), dm = m5(5, 55), d = dh * 60 + dm, e = s + d;
      if (e < 12 * 60 + 5 || e % 60 === 0 || e > 17 * 60 + 55) return null;
      const cands = [e - 720, e - 60, e + 60, floorH(s) + d, ceilH(s) + d].filter(c => okT(c) && c !== e).map(t24);
      const show = pick(SHOWS);
      return mcStr(show + ' started at ' + t12(s) + ' and lasted ' + dur(d) + '. When did it end? Give the time in the 24-hour clock.',
        t24(e), cands,
        t12(s) + ' + ' + dh + ' h = ' + t12(s + dh * 60) + ', then + ' + dm + ' min = ' + t12(e) + '. In the 24-hour clock, ' + t12(e) +
        ' is ' + t24(e) + '.');
    });
  }

  MQI.registerTopic({
    id: 'p3time', level: 'P3', strand: 'Measurement and Geometry',
    moeSubTopic: "Time: measuring time in seconds; finding the starting time, finishing time or duration given the other two quantities; 24-hour clock",
    label: 'Clocktower Quay', short: 'Time', e: '⏰',
    skills: {
      units:    { label: 'Seconds, hours and minutes', tip: '1 h = 60 min and 1 min = 60 s, never 100. Ask "is that seconds, minutes or hours?" about everyday jobs.' },
      duration: { label: 'Start, finish and how long', tip: 'Draw a timeline: count on to the next o\'clock first, then whole hours, then the minutes left.' },
      clock24:  { label: 'The 24-hour clock', tip: 'For p.m. times from 1 p.m. on, add 12 to the hours (3.15 p.m. is 1515). Read train and bus timetables together.' }
    },
    pools: {
      1: [[gUnitJudge, 'units'], [gHMinToMin, 'units'], [gDurationMin, 'duration'], [gTo24, 'clock24']],
      2: [[gMinToHMin, 'units'], [gFinishTime, 'duration'], [gStartTime, 'duration'], [gDurationHMin, 'duration'], [gFrom24, 'clock24']],
      3: [[gTwoActivities, 'duration'], [gTwoLaps, 'units'], [gTrain24, 'clock24'], [gEnd24, 'clock24']]
    }
  });
})();
