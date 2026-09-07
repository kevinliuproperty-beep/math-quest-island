/* ===== cube engine bundle: HOST SHIM (prepended by tools/build-cube-engine.mjs) =====
 *
 * The same shape as tools/engine/host-shim.js, and for the same reason: the four
 * logic blocks lifted out of cube/index.html are already DOM-free (the split lane
 * proved it in a bare Node vm AND in a bare JSContext), so this shim fakes as little
 * as possible. The less it invents, the less can silently diverge from what the
 * browser runs.
 *
 * What it provides:
 *
 *  1. `globalThis`, defensively normalised. A JSContext global is a bare object;
 *     this gives the rest of the bundle one name for it. The four blocks do not
 *     reach for a global at all - they are four `var X = (function(){...})()`
 *     declarations - so this exists for the API layer, not for them.
 *  2. `console` - a buffered one, drainable from Swift via CUBE_API.drainLogs.
 *     Current JavaScriptCore does provide a console on a bare JSContext, but its
 *     output goes somewhere the app cannot read, so the shim installs its own
 *     recorder over the top and delegates to the native one.
 *  3. Nothing else. In particular NO `window`, NO `document`, NO timers. The cube
 *     logic must never grow a DOM dependency: cube/js/render.js is the layer that
 *     speaks DOM, and it is deliberately not in this bundle - SceneKit replaces it.
 *     A Swift test asserts every browser global is undefined after loading.
 */
var CUBE_HOST = (function () {
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
    /* 'javascriptcore' when there is no Node process object; the same bundle is loaded
       by cube/tools/cube-engine-sanity.mjs in a Node vm, where this reads 'vm'. */
    platform: (typeof process !== 'undefined' && process && process.versions && process.versions.node)
      ? 'node' : 'javascriptcore',
    logs: logs,
    drainLogs: function () { var out = logs.slice(); logs.length = 0; return out; }
  };
})();
