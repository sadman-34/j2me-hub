/* CloudPhone layer for manage.html and run.html: animated loading screen with progress %,
   D-pad/touch helpers (manage) and the library snapshot for the instant launcher. */
(function () {
  var run = /run(\.html)?$/.test(location.pathname);
  document.body.classList.add(run ? 'cp-run' : 'cp-launcher');
  window.addEventListener('load', function () { window.focus(); });
  document.body.addEventListener('click', function () { window.focus(); });

  /* ---------- loading screen (progress is an estimate: stage based + easing) ---------- */
  var ov = document.createElement('div'); ov.id = 'cp-load';
  ov.innerHTML = '<img src="icon.png" alt="" width="40" height="40"><div class="cp-name">J2ME HUB</div><div class="cp-ring"></div><div id="cp-pct">0%</div>' +
    '<div class="cp-track"><div id="cp-fill"></div></div><div id="cp-msg">Starting Java engine</div>';
  document.body.appendChild(ov);
  var pct = 0, floor = 0, cap = 60, done = false, failed = false, msg = document.getElementById('cp-msg');
  function paint() { document.getElementById('cp-pct').textContent = Math.floor(pct) + '%'; document.getElementById('cp-fill').style.width = pct + '%'; }
  var tick = setInterval(function () { if (done || failed) return; pct = Math.max(pct, floor); pct += (cap - pct) * 0.035 + 0.03; if (pct > cap) pct = cap; paint(); }, 100);
  function stage(n) {
    if (n === 'cheerpjInit') { floor = 62; cap = 86; msg.textContent = 'Loading emulator'; }
    else if (n === 'cheerpjRunLibrary') { floor = 88; cap = 97; msg.textContent = run ? 'Starting game' : 'Almost ready'; }
  }
  function finish() { if (done || failed) return; done = true; pct = 100; paint(); setTimeout(function () { ov.classList.add('cp-out'); setTimeout(function () { ov.style.display = 'none'; }, 350); }, 250); clearInterval(tick); }
  function fail(t) { if (done || failed) return; failed = true; ov.classList.add('cp-err'); msg.textContent = t; document.getElementById('cp-pct').textContent = '!'; }
  ['cheerpjInit', 'cheerpjRunLibrary'].forEach(function (n) {
    var f = window[n]; if (typeof f !== 'function') return;
    window[n] = function () { var r = f.apply(this, arguments); Promise.resolve(r).then(function () { stage(n); }); return r; };
  });
  window.addEventListener('unhandledrejection', function () { fail('Could not start the Java engine. Check your internet, then go Back and try again.'); });
  window.addEventListener('error', function (e) { if (e.target && e.target.tagName === 'SCRIPT') fail('Could not load the Java engine. Check your internet, then go Back and try again.'); }, true);
  setTimeout(function () { if (!done && !failed) msg.textContent += ' (first load can take a minute)'; }, 15000);
  var ld = document.getElementById('loading');
  if (ld) new MutationObserver(function () { if (/Crash/.test(ld.textContent)) fail('The game crashed. Press Back.'); }).observe(ld, { childList: true, characterData: true, subtree: true });

  if (run) {
    window.cpGameStarted = function () {
      finish();
      try { if (sessionStorage.getItem('j2me.hint')) return; sessionStorage.setItem('j2me.hint', '1'); } catch (e) {}
      var t = document.createElement('div'); t.id = 'cp-toast'; t.textContent = 'Left key: tap = soft key, hold = menu. Right key = soft key.';
      document.body.appendChild(t); setTimeout(function () { t.remove(); }, 4500);
    };
    return;  /* in a game the emulator owns all keys */
  }

  /* ---------- manage.html: Wipe Data / Uninstall shown directly under the selected game ---------- */
  var pcHome = null, pcNext = null;
  window.cpRestoreControls = function () {
    var pc = document.getElementById('preview-controls'); if (!pc || !pcHome) return;
    if (pc.parentNode !== pcHome) pcHome.insertBefore(pc, pcNext && pcNext.parentNode === pcHome ? pcNext : null);
    var o = document.querySelector('.game-item.cp-open'); if (o) o.classList.remove('cp-open');
  };
  window.cpPlaceControls = function (id) {
    var pc = document.getElementById('preview-controls'); if (!pc) return;
    if (!pcHome) { pcHome = pc.parentNode; pcNext = pc.nextSibling; }
    window.cpRestoreControls();
    var list = document.getElementById('game-list'), item = null;
    Array.prototype.forEach.call(list.querySelectorAll('.game-item'), function (g) { if (g.dataset.appId === id) item = g; });
    if (!item) return;
    item.appendChild(pc); item.classList.add('cp-open');
    var b = pc.querySelector('button:not([disabled])'); if (b) b.focus();
    item.scrollIntoView({ block: 'nearest' });
  };

  /* ---------- manage.html: dialogs (no native alert/confirm), softkey bar, D-pad/touch helpers ---------- */
  function dialog(msg, btns) {
    return new Promise(function (res) {
      var d = document.createElement('div'); d.id = 'cp-dlg';
      d.innerHTML = '<div class="cp-box"><div class="cp-dmsg"></div><div class="cp-dbtns"></div></div>';
      d.querySelector('.cp-dmsg').textContent = msg;
      btns.forEach(function (b) { var x = document.createElement('button'); x.textContent = b.t; x.onclick = function () { d.remove(); res(b.v); }; d.querySelector('.cp-dbtns').appendChild(x); });
      document.body.appendChild(d); d.querySelector('button').focus();
    });
  }
  window.cpAdded = function () {
    var add = document.body.dataset.page === 'add';
    var t = document.createElement('div'); t.id = 'cp-toast'; t.textContent = add ? 'Installed! Opening your games...' : 'Saved';
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); if (add) location.href = './'; }, 1700);
  };
  /* ---------- add.html: games shipped in the Preload folder ---------- */
  function preloadNames() {
    return fetch('Preload/index.json', { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (a) { a = (a || []).map(function (x) { return typeof x === 'string' ? x : x && x.file; }).filter(function (n) { return n && /\.jar$/i.test(n); }); if (!a.length) throw 0; return a; })
      .catch(function () {   /* GitHub Pages has no folder listing: ask the GitHub API instead */
        var m = location.hostname.match(/^([^.]+)\.github\.io$/); if (!m) return [];
        var seg = location.pathname.split('/')[1], repo = seg && seg.indexOf('.') < 0 ? seg : location.hostname;
        return fetch('https://api.github.com/repos/' + m[1] + '/' + repo + '/contents/Preload').then(function (r) { return r.ok ? r.json() : []; })
          .then(function (a) { return (Array.isArray(a) ? a : []).filter(function (x) { return x.type === 'file' && /\.jar$/i.test(x.name); }).map(function (x) { return x.name; }); });
      }).catch(function () { return []; });
  }
  if (document.body.dataset.page === 'add') {
    var sec = document.createElement('div'); sec.id = 'cp-preload'; sec.style.display = 'none';
    sec.innerHTML = '<h2>Preloaded games</h2><div id="cp-pre-list"></div><h2>Or pick your own file</h2>';
    var anchor = document.querySelector('.add-edit-header'); if (anchor) anchor.parentNode.insertBefore(sec, anchor);
    preloadNames().then(function (names) {
      if (!names.length) return;
      var box = document.getElementById('cp-pre-list');
      names.sort().forEach(function (n) {
        var b = document.createElement('button'); b.className = 'cp-pre-btn'; b.textContent = n.replace(/\.jar$/i, '');
        b.onclick = function () {
          sec.style.display = 'none';
          fetch('Preload/' + encodeURIComponent(n)).then(function (r) { if (!r.ok) throw new Error('File not found: ' + n); return r.arrayBuffer(); })
            .then(function (buf) { return window.cpInstallBuffer(buf, n); })
            .catch(function (e) { sec.style.display = ''; window.cpError('Could not load ' + n, e); });
        };
        box.appendChild(b);
      });
      sec.style.display = '';
    });
    var fis = document.getElementById('file-input-step');
    if (fis) new MutationObserver(function () { if (fis.style.display === 'none') sec.style.display = 'none'; else if (document.getElementById('cp-pre-list').children.length) sec.style.display = ''; }).observe(fis, { attributes: true, attributeFilter: ['style'] });
  }

  window.cpConfirm = function (m) { return dialog(m, [{ t: 'Yes', v: true }, { t: 'No', v: false }]); };
  window.cpAlert = function (m) { return dialog(m, [{ t: 'OK', v: true }]); };
  window.cpError = function (title, e) {
    var t = ''; try { t = (e && (e.message || e.toString())) || String(e); } catch (x) {}
    window.cpAlert(title + (t ? ': ' + t.slice(0, 240) : ''));
  };

  var bar = document.createElement('div'); bar.id = 'cp-bar';
  bar.innerHTML = '<span id="softkey-left">Select</span><span id="softkey-right">Back</span>';
  document.body.appendChild(bar);
  function items() {
    var dl = document.getElementById('cp-dlg'); if (dl) return Array.prototype.slice.call(dl.querySelectorAll('button'));
    return Array.prototype.filter.call(document.querySelectorAll('button,a[href],input,select,textarea,[tabindex]'),
      function (e) { return !e.disabled && e.type !== 'hidden' && e.offsetParent !== null && e.tabIndex >= 0 && e.id !== 'cp-bar'; });
  }
  function step(d) {
    var l = items(); if (!l.length) return;
    var i = l.indexOf(document.activeElement), dl = document.getElementById('cp-dlg');
    if (!dl) {  /* let Up/Down also scroll text that has nothing focusable left */
      var bottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      if (d > 0 && i === l.length - 1 && !bottom) { window.scrollBy(0, 60); return; }
      if (d < 0 && i <= 0 && window.scrollY > 0) { window.scrollBy(0, -60); return; }
    }
    var n = l[(i + d + l.length) % l.length]; n.focus(); n.scrollIntoView({ block: 'nearest' });
  }
  function select() { var a = document.activeElement; if (a && a !== document.body) a.click(); }
  function back() { if (history.length > 1) history.back(); else location.href = './'; }
  window.addEventListener('keydown', function (e) {
    var t = e.target && e.target.tagName, ty = e.target && e.target.type;
    if (e.key === 'Escape') { e.preventDefault(); select(); return; }
    if (t === 'SELECT' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      e.preventDefault(); var s = e.target, n = s.selectedIndex + (e.key === 'ArrowRight' ? 1 : -1);
      if (n >= 0 && n < s.options.length) { s.selectedIndex = n; s.dispatchEvent(new Event('change', { bubbles: true })); } return;
    }
    if (t === 'TEXTAREA' || (t === 'INPUT' && /^(text|search|number|url|email|password)$/.test(ty) && (e.key === 'ArrowLeft' || e.key === 'ArrowRight'))) return;
    var dlg = !!document.getElementById('cp-dlg');
    if (e.key === 'ArrowDown' || (dlg && e.key === 'ArrowRight')) { e.preventDefault(); step(1); } else if (e.key === 'ArrowUp' || (dlg && e.key === 'ArrowLeft')) { e.preventDefault(); step(-1); }
  });
  document.getElementById('softkey-left').addEventListener('click', select);
  document.getElementById('softkey-right').addEventListener('click', back);

  var timer = null;
  function snap() {
    var m = document.getElementById('main'); if (!m || m.style.display === 'none') return;
    finish();
    var out = [];
    document.querySelectorAll('#game-list .game-item').forEach(function (it) {
      var a = it.querySelector('a'), im = it.querySelector('img.icon'), n = it.querySelector('.game-info'); if (!a) return;
      var id = new URL(a.href, location.href).searchParams.get('app');
      out.push({ id: id, name: n ? n.textContent : id, icon: im && im.src.indexOf('data:image/gif') !== 0 ? im.src : '' });
    });
    try { localStorage.setItem('j2me.games', JSON.stringify(out)); } catch (e) { return; }
    if (/[?&]sync=1/.test(location.search)) location.replace('./');
  }
  function later() { clearTimeout(timer); timer = setTimeout(snap, 600); }
  var mo = new MutationObserver(later);
  var gl = document.getElementById('game-list'), mn = document.getElementById('main');
  if (gl) mo.observe(gl, { childList: true, subtree: true });
  if (mn) mo.observe(mn, { attributes: true, attributeFilter: ['style'] });
  var f = items()[0]; if (f) f.focus();
})();
