// Subtle scroll-reveal. Without JS (or with reduced motion) everything just shows.
(function () {
  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var sel = 'section > *, footer > *, main > section > *, .stats > *, .cards > *, .steps > *, .gallery > *, .logos > *';
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      var t = e.target;
      t.classList.add('in'); io.unobserve(t);
      setTimeout(function () { t.classList.remove('reveal', 'in'); }, 1000); // drop reveal so hover transforms work
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  document.querySelectorAll(sel).forEach(function (el, i) {
    if (el.closest('.hero, header') || el.matches('script, style')) return;
    if (el.getBoundingClientRect().top < innerHeight * 0.9) return; // already on screen
    el.classList.add('reveal');
    el.style.setProperty('--d', (i % 3) * 0.08 + 's');
    io.observe(el);
  });
})();

// Mobile menu: <button class="menu-btn" aria-expanded="false"> inside a <nav>; toggles .open on the nav.
(function () {
  document.querySelectorAll('.menu-btn').forEach(function (b) {
    var nav = b.closest('nav');
    function set(o) { nav.classList.toggle('open', o); b.setAttribute('aria-expanded', o); }
    b.addEventListener('click', function () { set(b.getAttribute('aria-expanded') !== 'true'); });
    nav.addEventListener('click', function (e) { if (e.target.closest('.nav-links a')) set(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') set(false); });
    function stick() { nav.classList.toggle('stuck', scrollY > 8); } // sticky nav gets its blurred background
    addEventListener('scroll', stick, { passive: true }); stick();
  });
})();

// Hero video progress: the cyan fill is the share of the clip that has played.
// If the video isn't actually playing (missing file, blocked autoplay, server without
// Range support), the bar runs a simulated 30s loop instead of freezing.
(function () {
  document.querySelectorAll('header').forEach(function (hero) {
    var bar = hero.querySelector('.reel, .v2-bar'), fill = bar && bar.querySelector('i');
    var video = hero.querySelector('.hero-video');
    var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (video) {
      if (reduced) video.pause();
      else { var p = video.play(); if (p && p.catch) p.catch(function () {}); }
    }
    if (!fill) return;
    var set = function (r) { fill.style.width = (Math.max(0, Math.min(1, r)) * 100) + '%'; };
    var playing = function () {
      return video && !video.paused && !video.ended && video.readyState >= 2 && isFinite(video.duration) && video.duration > 0;
    };
    var LOOP = 30000, start = performance.now();
    // click to seek, like YouTube
    bar.addEventListener('click', function (e) {
      var r = (e.clientX - bar.getBoundingClientRect().left) / bar.offsetWidth;
      if (playing()) video.currentTime = r * video.duration; else start = performance.now() - r * LOOP;
      set(r);
    });
    if (reduced) { set(0.36); return; }
    (function tick(now) {
      set(playing() ? video.currentTime / video.duration : ((now - start) % LOOP) / LOOP);
      requestAnimationFrame(tick);
    })(start);
  });
})();

// Selected work: play the clip while hovered, pause and fade back to the still on leave.
(function () {
  if (matchMedia('(hover: none)').matches) return;
  document.querySelectorAll('[data-hover-video]').forEach(function (box) {
    var v;
    box.addEventListener('mouseenter', function () {
      if (!v) {
        v = document.createElement('video');
        v.className = 'hover-video'; v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'auto';
        v.src = box.getAttribute('data-hover-video'); v.setAttribute('aria-hidden', 'true');
        box.appendChild(v);
      }
      var p = v.play(); if (p && p.catch) p.catch(function () {});
      box.classList.add('is-playing');
    });
    box.addEventListener('mouseleave', function () { box.classList.remove('is-playing'); if (v) v.pause(); });
  });
})();

// Services: a preview image eases after the cursor while a service row is hovered.
(function () {
  var rows = document.querySelectorAll('[data-preview]');
  if (!rows.length || matchMedia('(hover: none)').matches) return;
  var img = document.createElement('img');
  img.className = 'cursor-preview'; img.alt = ''; document.body.appendChild(img);
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var tx = 0, ty = 0, x = 0, y = 0, raf = 0;
  function loop() {
    x += (tx - x) * (reduced ? 1 : 0.15); y += (ty - y) * (reduced ? 1 : 0.15);
    var r = reduced ? 0 : Math.max(-6, Math.min(6, (tx - x) * 0.05)); // slight tilt in the direction of travel
    img.style.setProperty('--x', x + 'px'); img.style.setProperty('--y', y + 'px'); img.style.setProperty('--r', r + 'deg');
    raf = img.classList.contains('show') ? requestAnimationFrame(loop) : 0;
  }
  rows.forEach(function (row) {
    row.addEventListener('mouseenter', function (e) {
      img.src = row.getAttribute('data-preview');
      tx = x = e.clientX + 24; ty = y = e.clientY - img.offsetHeight / 2;
      img.classList.add('show'); if (!raf) raf = requestAnimationFrame(loop);
    });
    row.addEventListener('mousemove', function (e) { tx = e.clientX + 24; ty = e.clientY - img.offsetHeight / 2; });
    row.addEventListener('mouseleave', function () { img.classList.remove('show'); });
  });
})();

// Showreel lightbox: full-screen player with sound and the same cyan progress bar.
(function () {
  var triggers = document.querySelectorAll('[data-showreel]');
  if (!triggers.length || !window.HTMLDialogElement) return;
  var I = {
    play: '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>',
    sound: '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4z"/></svg>',
    muted: '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm18.6 3-2.8-2.8-1.4 1.4 2.8 2.8-2.8 2.8 1.4 1.4 2.8-2.8 2.8 2.8 1.4-1.4-2.8-2.8 2.8-2.8-1.4-1.4z"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M19 6.4 17.6 5 12 10.6 6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12z"/></svg>',
    full: '<svg viewBox="0 0 24 24"><path d="M5 5h5v2H7v3H5zm9 0h5v5h-2V7h-3zM5 14h2v3h3v2H5zm12 3v-3h2v5h-5v-2z"/></svg>'
  };
  var box = document.createElement('dialog');
  box.className = 'reel-box';
  box.setAttribute('aria-label', 'Showreel');
  box.innerHTML =
    '<span class="rb-title eyebrow">[ Ascent Films — Showreel ]</span>' +
    '<button class="rb-close" type="button" aria-label="Close">' + I.close + '</button>' +
    '<div class="rb-frame"><video playsinline preload="none"></video>' +
    '<div class="rb-ui"><button class="rb-play" type="button" aria-label="Pause">' + I.pause + '</button>' +
    '<span class="rb-time">0:00 / 0:00</span>' +
    '<div class="rb-bar" role="slider" aria-label="Seek" tabindex="0" aria-valuemin="0" aria-valuemax="100"><i></i></div>' +
    '<button class="rb-mute" type="button" aria-label="Mute">' + I.sound + '</button>' +
    '<button class="rb-full" type="button" aria-label="Fullscreen">' + I.full + '</button></div></div>';
  document.body.appendChild(box);
  var v = box.querySelector('video'), bar = box.querySelector('.rb-bar'), fill = bar.firstChild;
  var playBtn = box.querySelector('.rb-play'), muteBtn = box.querySelector('.rb-mute'), time = box.querySelector('.rb-time');
  var fmt = function (s) { s = Math.floor(s || 0); return Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2); };
  var bgVideos = [], idleT;

  function sync() {
    var d = v.duration || 0, r = d ? v.currentTime / d : 0;
    fill.style.width = r * 100 + '%';
    bar.setAttribute('aria-valuenow', Math.round(r * 100));
    time.textContent = fmt(v.currentTime) + ' / ' + fmt(d);
    if (box.open) requestAnimationFrame(sync);
  }
  function setPlayIcon() { playBtn.innerHTML = v.paused ? I.play : I.pause; playBtn.setAttribute('aria-label', v.paused ? 'Play' : 'Pause'); }
  function setMuteIcon() { muteBtn.innerHTML = v.muted ? I.muted : I.sound; muteBtn.setAttribute('aria-label', v.muted ? 'Unmute' : 'Mute'); }
  function toggle() { v.paused ? v.play() : v.pause(); }
  function wake() { box.classList.remove('idle'); clearTimeout(idleT); idleT = setTimeout(function () { if (!v.paused) box.classList.add('idle'); }, 2500); }

  function open(src) {
    if (v.getAttribute('src') !== src) v.src = src;
    v.currentTime = 0; v.muted = false;
    bgVideos = [].slice.call(document.querySelectorAll('.hero-video, .hover-video')).filter(function (x) { return !x.paused; });
    bgVideos.forEach(function (x) { x.pause(); });
    box.showModal(); document.documentElement.style.overflow = 'hidden';
    var p = v.play();
    if (p && p.catch) p.catch(function () { v.muted = true; setMuteIcon(); v.play().catch(function () {}); }); // autoplay with sound blocked: fall back to muted
    setMuteIcon(); wake(); requestAnimationFrame(sync);
  }
  function close() { if (box.open) box.close(); }

  box.addEventListener('close', function () {
    v.pause(); document.documentElement.style.overflow = '';
    if (document.fullscreenElement) document.exitFullscreen().catch(function () {});
    bgVideos.forEach(function (x) { x.play().catch(function () {}); });
  });
  box.addEventListener('click', function (e) { if (e.target === box) close(); }); // backdrop click
  box.addEventListener('mousemove', wake);
  box.querySelector('.rb-close').addEventListener('click', close);
  v.addEventListener('click', toggle);
  v.addEventListener('play', setPlayIcon); v.addEventListener('pause', function () { setPlayIcon(); wake(); });
  playBtn.addEventListener('click', toggle);
  muteBtn.addEventListener('click', function () { v.muted = !v.muted; setMuteIcon(); });
  box.querySelector('.rb-full').addEventListener('click', function () {
    var f = box.querySelector('.rb-frame');
    document.fullscreenElement ? document.exitFullscreen() : (f.requestFullscreen ? f.requestFullscreen() : v.webkitEnterFullscreen && v.webkitEnterFullscreen());
  });
  function seekTo(clientX) { var r = Math.max(0, Math.min(1, (clientX - bar.getBoundingClientRect().left) / bar.offsetWidth)); if (v.duration) v.currentTime = r * v.duration; }
  var dragging = false;
  bar.addEventListener('pointerdown', function (e) { dragging = true; bar.setPointerCapture(e.pointerId); seekTo(e.clientX); });
  bar.addEventListener('pointermove', function (e) { if (dragging) seekTo(e.clientX); });
  bar.addEventListener('pointerup', function () { dragging = false; });
  box.addEventListener('keydown', function (e) {
    if ((e.key === ' ' && !e.target.closest('button')) || e.key === 'k') { e.preventDefault(); toggle(); }
    else if (e.key === 'ArrowRight') v.currentTime = Math.min(v.duration || 0, v.currentTime + 5);
    else if (e.key === 'ArrowLeft') v.currentTime = Math.max(0, v.currentTime - 5);
    else if (e.key === 'm') { v.muted = !v.muted; setMuteIcon(); }
    else return;
    wake();
  });
  triggers.forEach(function (t) {
    t.addEventListener('click', function (e) { e.preventDefault(); open(t.getAttribute('data-showreel')); });
  });
})();

// Stats count-up: any <b> like "50+", "300+", "5M+" counts from 0 the first time it scrolls into view.
(function () {
  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var RE = /^(\d+(?:\.\d+)?)([KMB]?)(\+?)$/;
  var els = [].filter.call(document.querySelectorAll('b'), function (b) { return RE.test(b.textContent.trim()); });
  var ease = function (t) { return 1 - Math.pow(1 - t, 3); }; // easeOutCubic: fast start, gentle landing
  function run(el) {
    var m = el.textContent.trim().match(RE), end = parseFloat(m[1]), dec = (m[1].split('.')[1] || '').length;
    var live = dec || end >= 10 ? dec : 1; // small numbers like 5M count with a decimal so they don't jump in whole steps
    var t0 = performance.now(), DUR = 1600;
    (function step(now) {
      var t = Math.min(1, (now - t0) / DUR);
      el.textContent = (t === 1 ? m[1] : (end * ease(t)).toFixed(live)) + m[2] + (t === 1 ? m[3] : ''); // "+" lands at the end
      if (t < 1) requestAnimationFrame(step);
    })(t0);
  }
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { io.unobserve(e.target); run(e.target); } });
  }, { threshold: 0.6 });
  els.forEach(function (el) {
    if (getComputedStyle(el).display === 'inline') { // reserve the final width so neighbours don't shift while counting
      el.style.minWidth = el.getBoundingClientRect().width + 'px';
      el.style.display = 'inline-block';
    }
    el.style.fontVariantNumeric = 'tabular-nums';
    io.observe(el);
  });
})();

// Hero headline reveal: wrap each word of the hero <h1> in a mask so CSS can slide it up.
(function () {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var n = 0;
  function split(node) {
    [].slice.call(node.childNodes).forEach(function (c) {
      if (c.nodeType === 1) return split(c); // keep inner spans (e.g. the cyan highlight) and split inside them
      if (c.nodeType !== 3 || !c.textContent.trim()) return;
      var frag = document.createDocumentFragment();
      c.textContent.split(/(\s+)/).forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) return frag.appendChild(document.createTextNode(' '));
        var w = document.createElement('span'), wi = document.createElement('span');
        w.className = 'w'; wi.className = 'wi'; wi.textContent = part; wi.style.setProperty('--w', n++);
        w.appendChild(wi); frag.appendChild(w);
      });
      c.replaceWith(frag);
    });
  }
  document.querySelectorAll('header h1, .hub h1').forEach(function (h1) {
    n = 0;
    h1.setAttribute('aria-label', h1.textContent.replace(/\s+/g, ' ').trim()); // screen readers get the whole line
    split(h1);
    [].forEach.call(h1.querySelectorAll('.w'), function (w) { w.setAttribute('aria-hidden', 'true'); });
    // copy/buttons start as the last word lands
    h1.parentElement.style.setProperty('--hr-base', (0.35 + n * 0.07) + 's');
    h1.classList.add('hr-split');
  });
})();

// Client logos: turn the static grid/row into an endless strip that pauses on hover.
(function () {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('.logos, .v2-logos, .trusted .row').forEach(function (el) {
    var items = [].filter.call(el.children, function (c) { return !c.classList.contains('more'); }); // "+ more clients" doesn't belong in a loop
    if (items.length < 3) return;
    var track = document.createElement('div'), set = document.createElement('div');
    track.className = 'mq-track'; set.className = 'mq-set';
    items.forEach(function (c) { c.classList.remove('reveal', 'in'); c.style.removeProperty('--d'); set.appendChild(c); }); // the strip fades in as one; logos inside must not wait for their own scroll-reveal
    [].slice.call(el.children).forEach(function (c) { c.remove(); });
    track.appendChild(set); el.appendChild(track); el.classList.add('mq');
    // the strip must be wider than the box, or a gap shows before the loop restarts
    var base = [].slice.call(set.children);
    while (set.scrollWidth < el.clientWidth && base.length) base.forEach(function (c) { set.appendChild(c.cloneNode(true)); });
    var copy = set.cloneNode(true); copy.setAttribute('aria-hidden', 'true');
    [].forEach.call(copy.querySelectorAll('img'), function (i) { i.alt = ''; });
    track.appendChild(copy);
    track.style.setProperty('--mq-dur', Math.max(20, set.scrollWidth / 50) + 's'); // ~50px per second, whatever the length
  });
})();

// Work filter chips: [data-filters="#target"] holds chips with data-filter; items inside the target carry data-tags.
(function () {
  document.querySelectorAll('[data-filters]').forEach(function (bar) {
    var scope = document.querySelector(bar.getAttribute('data-filters'));
    if (!scope) return;
    var chips = bar.querySelectorAll('[data-filter]'), items = scope.querySelectorAll('[data-tags]'), timer;
    var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    bar.addEventListener('click', function (e) {
      var chip = e.target.closest('[data-filter]');
      if (!chip || chip.getAttribute('aria-pressed') === 'true') return;
      var f = chip.getAttribute('data-filter');
      [].forEach.call(chips, function (c) { var on = c === chip; c.setAttribute('aria-pressed', on); c.classList.toggle('on', on); });
      var match = function (it) { return f === 'all' || it.getAttribute('data-tags').split(' ').indexOf(f) > -1; };
      // 1) fade out everything that's leaving, 2) swap the layout, 3) fade the matches back in
      [].forEach.call(items, function (it) { it.classList.add('f-anim'); if (!match(it)) it.classList.add('f-out'); });
      clearTimeout(timer); clearTimeout(bar._done);
      bar._done = setTimeout(function () { [].forEach.call(items, function (it) { it.classList.remove('f-anim'); }); }, 700);
      timer = setTimeout(function () {
        scope.classList.toggle('is-filtered', f !== 'all');
        [].forEach.call(items, function (it) {
          var show = match(it);
          it.hidden = !show;
          if (show) { it.classList.add('f-out'); requestAnimationFrame(function () { requestAnimationFrame(function () { it.classList.remove('f-out'); }); }); }
        });
      }, reduced ? 0 : 250);
    });
  });
})();

// Custom cursor: over [data-cursor] work cards, a cyan "View"/"Play" badge eases after the pointer.
(function () {
  var targets = document.querySelectorAll('[data-cursor]');
  if (!targets.length || matchMedia('(hover: none)').matches) return;
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var badge = document.createElement('div');
  badge.className = 'cursor-badge'; badge.setAttribute('aria-hidden', 'true');
  document.body.appendChild(badge);
  document.documentElement.classList.add('has-cursor');
  var tx = 0, ty = 0, x = 0, y = 0, raf = 0, on = false;
  function loop() {
    x += (tx - x) * (reduced ? 1 : 0.22); y += (ty - y) * (reduced ? 1 : 0.22);
    badge.style.setProperty('--x', x + 'px'); badge.style.setProperty('--y', y + 'px');
    raf = on ? requestAnimationFrame(loop) : 0;
  }
  function show(label) {
    badge.textContent = label;
    if (!on) { x = tx; y = ty; on = true; badge.classList.add('show', 'pop'); setTimeout(function () { badge.classList.remove('pop'); }, 300); if (!raf) raf = requestAnimationFrame(loop); }
  }
  function hide() { on = false; badge.classList.remove('show'); }
  document.addEventListener('mousemove', function (e) {
    tx = e.clientX; ty = e.clientY;
    var t = e.target.closest ? e.target.closest('[data-cursor]') : null;
    // over a real button/link inside the card (e.g. "View case study"), give the normal pointer back
    var inner = t && e.target.closest('a, button');
    if (t && !(inner && inner !== t)) show(t.getAttribute('data-cursor')); else if (on) hide();
  }, { passive: true });
  document.addEventListener('mouseleave', hide);
  window.addEventListener('scroll', function () { if (on && !document.elementFromPoint(tx, ty).closest('[data-cursor]')) hide(); }, { passive: true });
})();

// V7 selected-work carousel: [data-carousel] > .car-track (slides), .car-dots, .prev/.next.
// The active dash's CSS fill animation is the timer: when it ends we move on. Pausing on hover,
// focus or off-screen is pure CSS; with reduced motion there is no animation, so no autoplay.
(function () {
  document.querySelectorAll('[data-carousel]').forEach(function (car) {
    var track = car.querySelector('.car-track'), slides = [].slice.call(track.children), dots = car.querySelector('.car-dots'), cur = 0;
    slides.forEach(function (s, i) {
      var b = document.createElement('button');
      b.type = 'button'; b.setAttribute('aria-label', 'Show project ' + (i + 1)); b.innerHTML = '<i></i>';
      b.addEventListener('click', function () { go(i); });
      dots.appendChild(b);
    });
    function mark() { [].forEach.call(dots.children, function (b, i) { b.classList.toggle('on', i === cur); b.setAttribute('aria-current', i === cur); }); }
    function go(i) { cur = (i + slides.length) % slides.length; track.scrollTo({ left: slides[cur].offsetLeft, behavior: 'smooth' }); mark(); }
    dots.addEventListener('animationend', function () { go(cur + 1); });
    car.querySelector('.prev').addEventListener('click', function () { go(cur - 1); });
    car.querySelector('.next').addEventListener('click', function () { go(cur + 1); });
    // follow manual swipes/trackpad scrolls so the dashes stay in sync
    var t;
    track.addEventListener('scroll', function () {
      clearTimeout(t);
      t = setTimeout(function () {
        var x = track.scrollLeft, best = 0;
        if (x >= track.scrollWidth - track.clientWidth - 2) best = slides.length - 1;
        else slides.forEach(function (s, i) { if (Math.abs(s.offsetLeft - x) < Math.abs(slides[best].offsetLeft - x)) best = i; });
        if (best !== cur) { cur = best; mark(); }
      }, 120);
    }, { passive: true });
    new IntersectionObserver(function (e) { car.classList.toggle('live', e[0].isIntersecting); }, { threshold: .4 }).observe(car);
    mark();
  });
  // decorative background videos stay still for reduced-motion users
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) document.querySelectorAll('.bg-video').forEach(function (v) { v.removeAttribute('autoplay'); v.pause(); });
})();

// V8 testimonial slider: [data-slider] holds .t-track (cards) and .prev/.next; arrows move one card, ends disable.
(function () {
  document.querySelectorAll('[data-slider]').forEach(function (s) {
    var track = s.querySelector('.t-track'), prev = s.querySelector('.prev'), next = s.querySelector('.next');
    function step() { var c = track.children[0]; return c.offsetWidth + parseFloat(getComputedStyle(track).columnGap || 0); }
    function sync() { prev.disabled = track.scrollLeft < 4; next.disabled = track.scrollLeft > track.scrollWidth - track.clientWidth - 4; }
    prev.addEventListener('click', function () { track.scrollBy({ left: -step() }); });
    next.addEventListener('click', function () { track.scrollBy({ left: step() }); });
    track.addEventListener('scroll', sync, { passive: true }); addEventListener('resize', sync); sync();
  });
})();
