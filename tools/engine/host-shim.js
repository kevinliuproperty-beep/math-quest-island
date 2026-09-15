/* ===== engine bundle: HOST SHIM (prepended by tools/build-engine.mjs) =====
 *
 * The engine files are already DOM-free by contract (js/topics/README.md forbids
 * DOM access in a generator, and tools/gen-sanity.mjs loads them in a bare Node vm
 * with no browser globals). So this shim fakes as little as possible - the less it
 * invents, the less can silently diverge from what the browser runs.
 *
 * What it actually provides:
 *
 *  1. `globalThis`. Guaranteed on every JavaScriptCore the app can ship against,
 *     but a JSContext is a bare global object, so this normalises it defensively
 *     and gives the rest of the bundle one name for the global.
 *  2. `console`. Whether a bare JSContext has one is a moving target: historically it
 *     had none at all (a stray console.log in an engine file was then a ReferenceError
 *     that killed the whole evaluation), current JavaScriptCore does provide one, and
 *     its output goes somewhere the app cannot read. Either way the shim installs its
 *     OWN buffered console, delegating to whatever was there, so a message from the
 *     engine reaches the host through MQI_API.drainLogs instead of vanishing.
 *  3. Nothing else. In particular it does NOT define `window` or `document`. If a
 *     future engine file starts touching them, the failure is loud and lands on
 *     the lane that wrote it, which is the intended outcome; core.js's own
 *     `typeof window !== 'undefined' ? window : globalThis` already resolves to
 *     the global object here, exactly as it does in the Node harnesses.
 */
var MQI_HOST = (function () {
  var g = (typeof globalThis !== 'undefined') ? globalThis : this;
  if (typeof g.globalThis === 'undefined') { g.globalThis = g; }

  var LOG_CAP = 500;
  var logs = [];
  function record(level, args) {
    var parts = [];
    for (var i = 0; i < args.length; i++) {
      var a = args[i];
      try { parts.push(typeof a === 'string' ? a : JSON.stringify(a)); }
      catch (e) { parts.push(String(a)); }
    }
    logs.push({ level: level, message: parts.join(' ') });
    if (logs.length > LOG_CAP) logs.shift();
  }
  var native = (typeof g.console !== 'undefined' && g.console) ? g.console : null;
  function level(name) {
    var fallthrough = native && typeof native[name] === 'function' ? native[name] : null;
    return function () {
      record(name, arguments);
      if (fallthrough) { try { fallthrough.apply(native, arguments); } catch (e) { /* host console is best-effort */ } }
    };
  }
  g.console = {
    log: level('log'), info: level('info'), warn: level('warn'),
    error: level('error'), debug: level('debug')
  };

  return {
    global: g,
    /* 'javascriptcore' when there is no Node process object; the same bundle is
       loaded by tools/engine-api-test.mjs in a Node vm, where this reads 'vm'. */
    platform: (typeof process !== 'undefined' && process && process.versions && process.versions.node)
      ? 'node' : 'javascriptcore',
    logs: logs,
    drainLogs: function () { var out = logs.slice(); logs.length = 0; return out; }
  };
})();
