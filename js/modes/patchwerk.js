/* Math Quest Island - Patchwerk mode (hard mode, boss training dummy)
 *
 * Kevin's spec, 2026-09-05: NOT a gauntlet of N questions. A fixed X-minute
 * timer against a boss that ENRAGES at the end. You do as much DAMAGE as you
 * can. Leaderboard ranks total damage. Streaks build STACKS (a visible
 * counter, WoW debuff style). A STREAK FREEZE credit absorbs one wrong answer
 * so a single mistake never makes quitting the rational move.
 *
 * Contract: window.MQI.registerMode(mode) with
 *   { id, name, description, start(ctx), onAnswer(ctx, correct, meta), tick(ctx), end(ctx) }
 * Pure vanilla ES2020, no deps, no build step. Browser bits are guarded so the
 * file also runs under node for the self-test:  node js/modes/patchwerk.js --selftest
 */
(function (global) {
  "use strict";

  /* ------------------------------------------------------------------ *
   * CONFIG - every knob Kevin may want to taste-test lives here.        *
   * ------------------------------------------------------------------ */
  var CONFIG = {
    /* Boss tiers: the selectable fight lengths. Default = normal (3 min). */
    TIERS: {
      short:  { id: "short",  label: "Trash Pull",  durationMs: 2 * 60 * 1000 },
      normal: { id: "normal", label: "Patchwerk",   durationMs: 3 * 60 * 1000 },
      long:   { id: "long",   label: "Heroic",      durationMs: 5 * 60 * 1000 }
    },
    DEFAULT_TIER: "normal",

    /* Base damage per correct answer, by difficulty pool (level 1/2/3).
       Anchored to the main game's 18 + level*6 curve, flattened a little so
       stacks (not pool) are the thing you chase. */
    BASE_DAMAGE: { 1: 10, 2: 15, 3: 25 },
    BASE_DAMAGE_FALLBACK: 10,

    /* Stacks: +10% per stack, capped at 10 stacks = 2.00x. */
    STACK_STEP: 0.10,
    STACK_CAP: 10,

    /* Speed: a small kicker only. Full bonus under FAST_MS, decaying linearly
       to zero at ZERO_MS. Max is deliberately smaller than one stack. */
    SPEED_BONUS_MAX: 0.15,
    SPEED_FAST_MS: 2000,
    SPEED_ZERO_MS: 8000,

    /* Streak freeze credits. */
    FREEZE_EARN_EVERY: 5,   /* consecutive correct answers per credit */
    FREEZE_MAX_HELD: 2,

    /* Wrong answer stun: input locked, the clock keeps running. This is the
       anti-spam guard - guessing costs you more time than thinking does. */
    STUN_MS: 1500,

    /* Enrage: the last N ms of the fight, damage multiplied. */
    ENRAGE_WINDOW_MS: 20 * 1000,
    ENRAGE_MULT: 1.5,

    /* Boss health bar is cosmetic only - it never ends the run, it just
       refills ("the dummy heals to full") so the fight is always the timer. */
    BOSS_HP_PER_PHASE: 1200
  };

  /* ------------------------------------------------------------------ *
   * Pure run core - no DOM, no timers. Fully testable.                  *
   * ------------------------------------------------------------------ */
  function createRun(opts) {
    opts = opts || {};
    var cfg = opts.config || CONFIG;
    var tier = cfg.TIERS[opts.tier] ? cfg.TIERS[opts.tier] : cfg.TIERS[cfg.DEFAULT_TIER];

    /* All run state lives in this closure and dies with the run. Nothing is
       persisted between runs - the fade-out law forbids retention machinery. */
    var s = {
      tierId: tier.id,
      durationMs: tier.durationMs,
      damage: 0,
      stacks: 0,
      maxStacks: 0,
      correct: 0,
      wrong: 0,
      freezes: 0,
      freezesUsed: 0,
      earnProgress: 0,
      stunUntilMs: -1,
      lastEventMs: 0,
      enraged: false,
      bossHp: cfg.BOSS_HP_PER_PHASE,
      bossPhase: 1,
      ended: false
    };

    function timeLeftMs(elapsedMs) {
      return Math.max(0, s.durationMs - elapsedMs);
    }

    function isEnraged(elapsedMs) {
      return timeLeftMs(elapsedMs) <= cfg.ENRAGE_WINDOW_MS && timeLeftMs(elapsedMs) > 0;
    }

    function stackMult() {
      return 1 + cfg.STACK_STEP * Math.min(s.stacks, cfg.STACK_CAP);
    }

    function speedBonus(answerMs) {
      if (typeof answerMs !== "number" || !isFinite(answerMs)) return 0;
      if (answerMs <= cfg.SPEED_FAST_MS) return cfg.SPEED_BONUS_MAX;
      if (answerMs >= cfg.SPEED_ZERO_MS) return 0;
      var span = cfg.SPEED_ZERO_MS - cfg.SPEED_FAST_MS;
      return cfg.SPEED_BONUS_MAX * (1 - (answerMs - cfg.SPEED_FAST_MS) / span);
    }

    function baseFor(level) {
      var b = cfg.BASE_DAMAGE[level];
      return typeof b === "number" ? b : cfg.BASE_DAMAGE_FALLBACK;
    }

    function isStunned(elapsedMs) {
      return elapsedMs < s.stunUntilMs;
    }

    /* The single scoring entry point.
       correct  -> boolean
       meta     -> { level, answerMs, elapsedMs } */
    function applyAnswer(correct, meta) {
      meta = meta || {};
      var elapsedMs = typeof meta.elapsedMs === "number" ? meta.elapsedMs : s.lastEventMs;
      var level = meta.level || 1;
      var ev = {
        correct: !!correct, damage: 0, stacks: s.stacks, froze: false,
        earnedFreeze: false, stunMs: 0, enraged: isEnraged(elapsedMs), ignored: false
      };

      if (s.ended || timeLeftMs(elapsedMs) <= 0) { ev.ignored = true; return ev; }
      if (isStunned(elapsedMs)) { ev.ignored = true; return ev; }

      s.lastEventMs = elapsedMs;
      s.enraged = ev.enraged;

      if (correct) {
        var dmg = baseFor(level) * stackMult() * (1 + speedBonus(meta.answerMs));
        if (ev.enraged) dmg *= cfg.ENRAGE_MULT;
        dmg = Math.round(dmg);

        s.damage += dmg;                       /* total never decreases */
        s.correct += 1;
        s.stacks = Math.min(s.stacks + 1, cfg.STACK_CAP);
        s.maxStacks = Math.max(s.maxStacks, s.stacks);

        s.earnProgress += 1;
        if (s.earnProgress >= cfg.FREEZE_EARN_EVERY) {
          s.earnProgress = 0;
          if (s.freezes < cfg.FREEZE_MAX_HELD) { s.freezes += 1; ev.earnedFreeze = true; }
        }

        /* Cosmetic boss bar: it refills rather than ending the fight. */
        s.bossHp -= dmg;
        while (s.bossHp <= 0) { s.bossPhase += 1; s.bossHp += cfg.BOSS_HP_PER_PHASE; }

        ev.damage = dmg;
        ev.stacks = s.stacks;
        return ev;
      }

      /* Wrong. */
      s.wrong += 1;
      if (s.freezes > 0) {
        s.freezes -= 1;
        s.freezesUsed += 1;
        ev.froze = true;                       /* stacks survive, credit spent */
      } else {
        s.stacks = 0;
      }
      /* Earn progress always resets, even on a frozen wrong - otherwise a
         freeze would both save the streak AND keep banking the next credit,
         which is a self-sustaining loop. */
      s.earnProgress = 0;
      s.stunUntilMs = elapsedMs + cfg.STUN_MS;
      ev.stunMs = cfg.STUN_MS;
      ev.stacks = s.stacks;
      return ev;
    }

    function finish(elapsedMs, extra) {
      extra = extra || {};
      s.ended = true;
      return {
        mode: "patchwerk",
        tier: s.tierId,
        level: extra.level || 1,
        damage: s.damage,
        maxStacks: s.maxStacks,
        correct: s.correct,
        wrong: s.wrong,
        freezesUsed: s.freezesUsed,
        durationMs: s.durationMs,
        date: extra.date || new Date().toISOString().slice(0, 10)
      };
    }

    return {
      state: function () { var c = {}; for (var k in s) c[k] = s[k]; return c; },
      config: cfg,
      tier: tier,
      applyAnswer: applyAnswer,
      finish: finish,
      timeLeftMs: timeLeftMs,
      isEnraged: isEnraged,
      isStunned: isStunned,
      stackMult: stackMult,
      speedBonus: speedBonus
    };
  }

  /* ------------------------------------------------------------------ *
   * HUD rendering (string only - safe to call under node in tests).     *
   * ------------------------------------------------------------------ */
  function fmtClock(ms) {
    var t = Math.max(0, Math.ceil(ms / 1000));
    var m = Math.floor(t / 60), sec = t % 60;
    return m + ":" + (sec < 10 ? "0" : "") + sec;
  }

  function renderHud(run, elapsedMs, flash) {
    var st = run.state();
    var cfg = run.config;
    var enraged = run.isEnraged(elapsedMs);
    var pips = "";
    for (var i = 0; i < cfg.FREEZE_MAX_HELD; i++) {
      pips += '<span class="pw-pip' + (i < st.freezes ? " pw-pip-on" : "") + '">*</span>';
    }
    var bossPct = Math.max(0, Math.min(100, Math.round(100 * st.bossHp / cfg.BOSS_HP_PER_PHASE)));
    return '' +
      '<div class="pw-hud' + (enraged ? " pw-enraged" : "") + '">' +
        '<div class="pw-timer">' + fmtClock(run.timeLeftMs(elapsedMs)) +
          (enraged ? ' <b class="pw-enrage-tag">ENRAGE</b>' : '') + '</div>' +
        '<div class="pw-boss"><div class="pw-boss-fill" style="width:' + bossPct + '%"></div></div>' +
        '<div class="pw-dmg">' + st.damage.toLocaleString() + ' dmg</div>' +
        '<div class="pw-stacks" title="Streak stacks">x' + st.stacks +
          ' <small>(' + run.stackMult().toFixed(2) + 'x)</small></div>' +
        '<div class="pw-freeze" title="Streak freeze credits">' + pips + '</div>' +
        (flash ? '<div class="pw-flash pw-flash-' + flash + '">' +
          (flash === "freeze" ? "FREEZE!" : flash === "earned" ? "+FREEZE" : "") + '</div>' : '') +
      '</div>';
  }

  /* ------------------------------------------------------------------ *
   * The mode object (browser side).                                     *
   * ------------------------------------------------------------------ */
  var mode = {
    id: "patchwerk",
    name: "Patchwerk",
    description: "Boss timer. Hit as hard as you can before the enrage. Streaks stack.",
    config: CONFIG,
    createRun: createRun,

    start: function (ctx) {
      var tierId = (ctx && ctx.options && ctx.options.tier) || CONFIG.DEFAULT_TIER;
      var run = createRun({ tier: tierId });
      this._run = run;                 /* one closure-backed run object */
      this._flash = null;
      this._flashUntil = 0;
      this._lastQuestionAt = 0;
      this._announcedEnrage = false;

      if (ctx && ctx.ui) {
        ctx.ui.setTheme("mode-patchwerk");
        ctx.ui.setBanner("<b>" + run.tier.label + "</b> - " +
          fmtClock(run.tier.durationMs) + " on the dummy. Every answer is damage. Do not stop.");
        ctx.ui.setHud(renderHud(run, 0, null));
      }
      if (ctx && ctx.nextQuestion) { ctx.nextQuestion(); this._lastQuestionAt = 0; }
      return run;
    },

    onAnswer: function (ctx, correct, meta) {
      var run = this._run;
      if (!run) return;
      var elapsedMs = (ctx && typeof ctx.elapsedMs === "number") ? ctx.elapsedMs : 0;
      var answerMs = (meta && typeof meta.answerMs === "number")
        ? meta.answerMs : Math.max(0, elapsedMs - this._lastQuestionAt);
      var level = (meta && meta.level) || (ctx && ctx.level) || (ctx && ctx.difficulty) || 1;

      var ev = run.applyAnswer(correct, { level: level, answerMs: answerMs, elapsedMs: elapsedMs });
      if (ev.ignored) return ev;       /* stunned or time is up - swallow it */

      if (ctx && ctx.ui) {
        if (ev.correct) {
          ctx.ui.pulse(ev.enraged ? "crit" : "hit");
          this._flash = ev.earnedFreeze ? "earned" : null;
        } else if (ev.froze) {
          ctx.ui.pulse("freeze");
          this._flash = "freeze";
        } else {
          ctx.ui.pulse("miss");
          this._flash = null;
        }
        this._flashUntil = elapsedMs + 900;
        ctx.ui.setHud(renderHud(run, elapsedMs, this._flash));
      }

      /* Next question after the stun (the stun IS the anti-spam guard). */
      var self = this;
      var delay = ev.correct ? 0 : run.config.STUN_MS;
      var fire = function () {
        self._lastQuestionAt = (ctx && typeof ctx.elapsedMs === "number") ? ctx.elapsedMs : elapsedMs + delay;
        if (ctx && ctx.nextQuestion) ctx.nextQuestion();
      };
      if (delay > 0 && typeof setTimeout === "function") setTimeout(fire, delay); else fire();
      return ev;
    },

    tick: function (ctx) {
      var run = this._run;
      if (!run) return;
      var elapsedMs = (ctx && typeof ctx.elapsedMs === "number") ? ctx.elapsedMs : 0;
      if (this._flash && elapsedMs > this._flashUntil) this._flash = null;

      if (!this._announcedEnrage && run.isEnraged(elapsedMs)) {
        this._announcedEnrage = true;
        if (ctx && ctx.ui) {
          ctx.ui.setTheme("mode-patchwerk enraged");
          ctx.ui.setBanner("<b>ENRAGE!</b> Damage x" + run.config.ENRAGE_MULT + " - finish strong.");
          ctx.ui.pulse("enrage");
        }
      }
      if (ctx && ctx.ui) ctx.ui.setHud(renderHud(run, elapsedMs, this._flash));
      if (run.timeLeftMs(elapsedMs) <= 0) return this.end(ctx);
    },

    end: function (ctx) {
      var run = this._run;
      if (!run) return null;
      var elapsedMs = (ctx && typeof ctx.elapsedMs === "number") ? ctx.elapsedMs : run.tier.durationMs;
      var st = run.state();
      if (st.ended) return null;
      var record = run.finish(elapsedMs, { level: (ctx && ctx.level) || 1 });
      if (ctx && ctx.ui) {
        ctx.ui.setBanner("<b>" + record.damage.toLocaleString() + " damage</b> - best stack x" +
          record.maxStacks + " - " + record.correct + " hits, " + record.wrong + " misses" +
          (record.freezesUsed ? ", " + record.freezesUsed + " freeze saved you" : ""));
      }
      if (ctx && ctx.leaderboard && ctx.leaderboard.submit) ctx.leaderboard.submit(record);
      return record;
    }
  };

  /* ------------------------------------------------------------------ *
   * Self-test: 3 seeded runs, arithmetic asserted.                      *
   * ------------------------------------------------------------------ */
  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function selfTest(log) {
    log = log || function () {};
    var fails = 0, checks = 0;
    function ok(cond, label, got, want) {
      checks++;
      if (cond) { log("  PASS  " + label); }
      else { fails++; log("  FAIL  " + label + "  got=" + got + " want=" + want); }
    }
    function eq(a, b, label) { ok(a === b, label, a, b); }

    var rng = mulberry32(20260905);

    /* --- Run 1: all correct, level 2, slow answers (no speed bonus). ---- */
    log("Run 1 - all correct, pool 2, 5s answers (no speed bonus)");
    var r1 = createRun({ tier: "normal" });
    var t = 0, i;
    for (i = 0; i < 12; i++) { t += 5000; r1.applyAnswer(true, { level: 2, answerMs: 5000, elapsedMs: t }); }
    var s1 = r1.state();
    /* A hit is scored with the stacks you ALREADY hold, then adds one - so the
       first hit is 1.00x and the HUD counter predicts your next hit.
       base 15, answerMs 5000 -> bonus = 0.15*(1 - 3000/6000) = 0.075.
       Damage_n = round(15 * (1 + 0.1*min(n,10)) * 1.075), n = 0..11. */
    var want1 = 0;
    for (i = 0; i < 12; i++) {
      var st = Math.min(i, 10);
      want1 += Math.round(15 * (1 + 0.10 * st) * 1.075);
    }
    eq(s1.correct, 12, "12 correct recorded");
    eq(s1.stacks, 10, "stacks capped at 10");
    eq(s1.maxStacks, 10, "maxStacks 10");
    eq(s1.damage, want1, "damage matches closed form (" + want1 + ")");
    eq(s1.freezes, 2, "freeze credits capped at 2 (earned 2 of 2 possible)");
    eq(s1.wrong, 0, "no wrongs");
    ok(Math.abs(r1.stackMult() - 2.0) < 1e-9, "stack multiplier is 2.00x at cap", r1.stackMult(), 2);

    /* --- Run 2: alternating right/wrong, no freeze ever banked. --------- */
    log("Run 2 - alternating correct/wrong, pool 1, stacks never survive");
    var r2 = createRun({ tier: "short" });
    t = 0;
    var want2 = 0;
    for (i = 0; i < 8; i++) {
      t += 4000;
      var ev = r2.applyAnswer(true, { level: 1, answerMs: 4000, elapsedMs: t });
      want2 += ev.damage;
      t += 4000;   /* > STUN_MS, so the wrong lands */
      r2.applyAnswer(false, { level: 1, answerMs: 4000, elapsedMs: t });
    }
    var s2 = r2.state();
    /* Every correct lands at stacks=0 -> mult 1.0; answerMs 4000 -> bonus
       0.15*(1-2000/6000)=0.10 -> 10*1.0*1.10 = 11 each. */
    eq(s2.damage, 8 * 11, "alternating damage = 8 x 11");
    eq(want2, s2.damage, "event damage sums to total");
    eq(s2.stacks, 0, "stacks reset by every wrong");
    eq(s2.maxStacks, 1, "maxStacks only ever reached 1");
    eq(s2.freezes, 0, "never banked a freeze (earn progress resets on wrong)");
    eq(s2.freezesUsed, 0, "no freezes spent");
    eq(s2.wrong, 8, "8 wrongs");

    /* stun guard: an answer inside the stun window is ignored */
    var stunned = r2.applyAnswer(true, { level: 1, answerMs: 100, elapsedMs: t + 500 });
    ok(stunned.ignored === true, "answer during 1.5s stun is ignored (anti-spam)", stunned.ignored, true);
    eq(r2.state().damage, 8 * 11, "ignored answer added no damage");

    /* --- Run 3: 5 correct -> bank a freeze -> 1 wrong -> recover. ------- */
    log("Run 3 - bank a freeze, eat one wrong, keep the stacks, recover");
    var r3 = createRun({ tier: "normal" });
    t = 0;
    for (i = 0; i < 5; i++) { t += 3000; r3.applyAnswer(true, { level: 3, answerMs: 3000, elapsedMs: t }); }
    var mid = r3.state();
    eq(mid.stacks, 5, "5 stacks after 5 correct");
    eq(mid.freezes, 1, "1 freeze credit earned at 5 in a row");
    t += 3000;
    var wrongEv = r3.applyAnswer(false, { level: 3, answerMs: 3000, elapsedMs: t });
    var afterWrong = r3.state();
    ok(wrongEv.froze === true, "wrong answer consumed the freeze", wrongEv.froze, true);
    eq(afterWrong.stacks, 5, "stacks preserved by the freeze");
    eq(afterWrong.freezes, 0, "credit spent");
    eq(afterWrong.freezesUsed, 1, "freezesUsed = 1");
    eq(afterWrong.damage, mid.damage, "damage total never decreases on a wrong");
    t += 2000;   /* clear the stun */
    var recover = r3.applyAnswer(true, { level: 3, answerMs: 3000, elapsedMs: t });
    eq(r3.state().stacks, 6, "streak resumed at 6 stacks, not 1");
    /* base 25, scored on the 5 stacks it entered with -> 1.5x,
       answerMs 3000 -> bonus 0.15*(1 - 1000/6000) = 0.125 */
    eq(recover.damage, Math.round(25 * 1.5 * 1.125), "recovery hit damage arithmetic");

    /* --- Enrage window + record shape. --------------------------------- */
    log("Enrage window and leaderboard record");
    var r4 = createRun({ tier: "normal" });      /* 180000 ms */
    ok(r4.isEnraged(159000) === false, "not enraged at 21s left", r4.isEnraged(159000), false);
    ok(r4.isEnraged(161000) === true, "enraged at 19s left", r4.isEnraged(161000), true);
    var enrageHit = r4.applyAnswer(true, { level: 1, answerMs: 9000, elapsedMs: 165000 });
    eq(enrageHit.damage, Math.round(10 * 1.0 * 1.0 * 1.5), "enrage hit is x1.5 (15)");
    var late = r4.applyAnswer(true, { level: 1, answerMs: 1000, elapsedMs: 181000 });
    ok(late.ignored === true, "answers after time expiry are ignored", late.ignored, true);
    var rec = r4.finish(180000, { level: 2, date: "2026-09-05" });
    var keys = Object.keys(rec).join(",");
    eq(keys, "mode,tier,level,damage,maxStacks,correct,wrong,freezesUsed,durationMs,date",
       "record shape matches the leaderboard contract");
    eq(rec.mode, "patchwerk", "record.mode");
    eq(rec.tier, "normal", "record.tier");
    eq(rec.durationMs, 180000, "record.durationMs");

    /* rng is seeded and deterministic - proves the harness is reproducible */
    var firstDraw = Math.round(rng() * 1e6);
    eq(firstDraw, Math.round(mulberry32(20260905)() * 1e6), "seeded RNG is deterministic");

    log("");
    log(fails === 0 ? "SELFTEST OK - " + checks + " checks passed"
                    : "SELFTEST FAILED - " + fails + "/" + checks + " checks failed");
    return { checks: checks, fails: fails, ok: fails === 0 };
  }

  mode.selfTest = selfTest;

  /* ------------------------------------------------------------------ *
   * Registration / export.                                              *
   * ------------------------------------------------------------------ */
  if (typeof window !== "undefined") {
    window.MQI = window.MQI || {};
    if (typeof window.MQI.registerMode === "function") window.MQI.registerMode(mode);
    else (window.MQI.pendingModes = window.MQI.pendingModes || []).push(mode);
    window.MQI.patchwerk = mode;
  }
  if (typeof module !== "undefined" && module.exports) module.exports = mode;

  if (typeof process !== "undefined" && process.argv && process.argv.indexOf("--selftest") !== -1) {
    var res = selfTest(function (l) { console.log(l); });
    process.exit(res.ok ? 0 : 1);
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
