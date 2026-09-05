# Mode contract

A mode is a way to play the questions. It owns pacing, scoring and the HUD. It never
touches the DOM directly and never reaches into the topic registry.

## Registration

```js
window.MQI.registerMode(mode);
```

Order is not load-bearing. A mode file that loads before `js/core.js` pushes itself onto
`window.MQI.pendingModes` instead; `core.js` drains that queue the moment `registerMode`
exists, and `MQI.boot()` drains it again. The standard tail of a mode file:

```js
if (typeof window !== "undefined") {
  window.MQI = window.MQI || {};
  if (typeof window.MQI.registerMode === "function") window.MQI.registerMode(mode);
  else (window.MQI.pendingModes = window.MQI.pendingModes || []).push(mode);
}
```

## Shape

```js
const mode = {
  id:   'patchwerk',              // unique, kebab-case
  name: 'Patchwerk',              // display name
  start(ctx) {},                  // called once when the run begins
  onAnswer(ctx, correct, meta) {},// called after every answer; correct = boolean
  tick(ctx) {},                   // called on a ~200ms interval while the run is live
  end(ctx) {}                     // called once; RETURNS a scoreRecord object
};
```

`end(ctx)` must return a score record (a plain JSON-serialisable object). The shell hands
that record to the leaderboard.

## ctx

`ctx` is built by `MQI.makeModeCtx(opts)` in `js/app.js` and is the mode's ONLY door to the
running game:

```js
{
  options,                 // the opts object passed to MQI.startMode (e.g. { tier, durationMs })
  nextQuestion(),          // advance to the next question; returns the question object
  submitAnswer(a),         // a = choice index (MCQ) or the typed string (typed answers)
  timeLeftMs,              // getter; Infinity when the mode declared no duration
  elapsedMs,               // getter; ms since start()
  streak,                  // getter; current correct-answer streak
  difficulty,              // getter; current pool level 1-3
  level,                   // getter; the selected grade, e.g. 'P4'
  topicId,                 // getter; the topic node being played, e.g. 'fractions'
  ui: {
    setHud(html),          // replaces the mode HUD block
    setBanner(html),       // transient banner over the board
    setTheme(className),   // sets data-mode-theme on <body> for mode-specific CSS
    pulse(kind)            // audio/visual beat: 'hit' | 'crit' | 'miss' | 'freeze' | 'enrage'
  },
  leaderboard: { submit(record) }   // POSTs the score record to api/leaderboard
}
```

`MQI.startMode(id, { durationMs, onEnd })` starts a registered mode (installs the tick interval
and calls `start`). Everything in that opts object reaches the mode as `ctx.options`. When
`tick(ctx)` returns a score record the shell clears the interval, drops `MQI.activeMode` and
calls `opts.onEnd(record)`, so a mode ends its own run without the shell owning a clock.
`MQI.endMode()` clears the interval and returns `end(ctx)`'s score record for a manual stop.

A mode that locks input (Patchwerk's stun) is honoured by the shell: `answer()` and
`answerTyped()` swallow submissions while the lock is up, and `ctx.nextQuestion()` clears it.
A mode may also install a question feed by driving `ctx.nextQuestion()`; the shell decides
which topic and pool that draws from.

## Rules

1. A mode file is self-contained. It edits no other file. New CSS for a mode hangs off
   `body[data-mode-theme="<class>"]`.
2. A mode never reads `TOPICS`, `MAP_NODES` or `DB` directly. Everything comes through `ctx`.
3. A mode must survive `timeLeftMs === Infinity` (no duration) and a `ctx.ui` that no-ops.
4. Keep a `--selftest` path runnable under bare node so the mode can be gated without a browser.
