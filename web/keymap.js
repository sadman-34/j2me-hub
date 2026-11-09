/* keymap.js - physical keypad remap for a self-hosted freej2me-web.
 *
 * Load as the FIRST script in every page of web/ that can receive game input
 * (at least index.html and run.html):
 *     <script src="keymap.js"></script>
 *
 * Phone-type note: in freej2me-web press Esc -> Phone type -> "Standard" once.
 * Then keys 2/4/6/8 act as arrows and 5 as fire natively, so they are passed
 * through untouched here. Only the soft keys need remapping:
 *     '*'  -> Left soft key  (the emulator's Q key)
 *     '#'  -> Right soft key (the emulator's W key)
 */
(function () {
  "use strict";

  // Set true if your phone has an Escape key you want to use as Right Soft Key.
  // Note: freej2me-web uses Escape to open its options menu, so leave false
  // unless your phone has another way to reach it.
  var ESCAPE_AS_RSK = false;

  var LSK = { key: "q", code: "KeyQ", keyCode: 81 };
  var RSK = { key: "w", code: "KeyW", keyCode: 87 };
  var busy = false;

  function pick(e) {
    var k = e.key, c = e.keyCode || e.which;
    if (k === "*" || c === 106 || (e.code === "Digit8" && e.shiftKey)) return LSK;
    if (k === "#" || (e.code === "Digit3" && e.shiftKey)) return RSK;
    if (k === "SoftLeft") return LSK;
    if (k === "SoftRight") return RSK;
    if (k === "Escape" && ESCAPE_AS_RSK) return RSK;
    return null;
  }

  function make(type, m, src) {
    var ev;
    try {
      ev = new KeyboardEvent(type, {
        key: m.key, code: m.code, keyCode: m.keyCode, which: m.keyCode,
        bubbles: true, cancelable: true, repeat: !!src.repeat
      });
    } catch (_) {
      ev = document.createEvent("Event");
      ev.initEvent(type, true, true);
    }
    // Some engines ignore keyCode/which/key in the constructor; force them.
    var props = { keyCode: m.keyCode, which: m.keyCode, key: m.key, code: m.code };
    Object.keys(props).forEach(function (p) {
      try { Object.defineProperty(ev, p, { get: function () { return props[p]; } }); } catch (_) {}
    });
    return ev;
  }

  function handler(e) {
    if (busy) return;                       // our own re-dispatched event
    var m = pick(e);
    if (!m) return;                         // everything else passes through
    e.preventDefault();
    e.stopImmediatePropagation();
    if (e.type === "keypress") return;      // emulator uses keydown/keyup only
    var ae = document.activeElement;
    var target = ae && ae !== document.body ? ae : document;
    busy = true;
    try { target.dispatchEvent(make(e.type, m, e)); } finally { busy = false; }
  }

  ["keydown", "keyup", "keypress"].forEach(function (t) {
    window.addEventListener(t, handler, true);
  });
})();