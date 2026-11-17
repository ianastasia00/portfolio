(function () {
  document.documentElement.classList.add('js');

  var canHover = window.matchMedia('(hover: hover) and (pointer: fine)');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- Case pages: things that start when they scroll into view ----------
     [data-play-in-view] video plays once each time it enters the screen;
     [data-in-view] element gets .is-in-view (used to run CSS animations). */
  var inViewItems = document.querySelectorAll('[data-play-in-view], [data-in-view]');
  if (inViewItems.length && 'IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var el = entry.target;
        if (el.hasAttribute('data-in-view')) el.classList.toggle('is-in-view', entry.isIntersecting);
        if (!el.hasAttribute('data-play-in-view')) return;

        if (entry.isIntersecting) {
          if (reduceMotion.matches) return;
          el.currentTime = 0;
          var playing = el.play();
          if (playing && playing.catch) playing.catch(function () {});
        } else {
          el.pause();
        }
      });
    }, { threshold: 0.4 });

    inViewItems.forEach(function (el) {
      if (el.tagName === 'VIDEO') el.muted = true;
      observer.observe(el);
    });
  }

  /* ---------- [data-reveal]: content appears once when scrolled into view ---------- */
  var revealItems = document.querySelectorAll('[data-reveal]');
  if (revealItems.length) {
    if ('IntersectionObserver' in window) {
      var revealer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-revealed');
          revealer.unobserve(entry.target);
        });
      }, { threshold: 0.2, rootMargin: '0px 0px -10% 0px' });
      revealItems.forEach(function (el) { revealer.observe(el); });
    } else {
      revealItems.forEach(function (el) { el.classList.add('is-revealed'); });
    }
  }

  /* ---------- Loyalty program: beige switcher changes the phone screen ---------- */
  document.querySelectorAll('[data-loyalty-tabs]').forEach(function (tabs) {
    var buttons = Array.prototype.slice.call(tabs.querySelectorAll('[role="tab"]'));
    var panel = document.getElementById(buttons[0].getAttribute('aria-controls'));
    var screens = panel ? panel.querySelectorAll('.mgf-loyalty__screen') : [];
    var current = 0;

    function placePill() {
      var b = buttons[current];
      tabs.style.setProperty('--pill-x', b.offsetLeft + 'px');
      tabs.style.setProperty('--pill-w', b.offsetWidth + 'px');
    }

    function select(index, focus) {
      current = index;
      buttons.forEach(function (b, i) {
        var on = i === index;
        b.setAttribute('aria-selected', on ? 'true' : 'false');
        b.tabIndex = on ? 0 : -1;
      });
      Array.prototype.forEach.call(screens, function (s, i) {
        s.classList.toggle('is-active', i === index);
        if (i === index) s.loading = 'eager';
      });
      placePill();
      if (focus) buttons[index].focus();
    }

    buttons.forEach(function (b, i) {
      b.addEventListener('click', function () { select(i); });
      b.addEventListener('keydown', function (e) {
        var next = null;
        if (e.key === 'ArrowRight') next = (current + 1) % buttons.length;
        if (e.key === 'ArrowLeft') next = (current - 1 + buttons.length) % buttons.length;
        if (e.key === 'Home') next = 0;
        if (e.key === 'End') next = buttons.length - 1;
        if (next !== null) { e.preventDefault(); select(next, true); }
      });
    });

    // screens are small: load all four up front so switching is instant
    Array.prototype.forEach.call(screens, function (s) { s.loading = 'eager'; });

    placePill();
    tabs.classList.add('is-ready');
    window.addEventListener('resize', placePill);
  });

  /* ---------- Main page v2: NDA card animation, scaled to cover the card, replays in a loop ---------- */
  document.querySelectorAll('[data-nda-anim]').forEach(function (anim) {
    var holder = anim.parentElement;
    var LOOP_MS = 5600;
    var timer = null;

    function fit() {
      var scale = Math.max(holder.clientWidth / 940, holder.clientHeight / 319);
      anim.style.setProperty('--nda-scale', scale);
    }

    function play() {
      clearTimeout(timer);
      anim.classList.remove('is-playing');
      void anim.offsetWidth; // restart the CSS animations
      anim.classList.add('is-playing');
      timer = setTimeout(play, LOOP_MS);
    }

    fit();
    if (window.ResizeObserver) new ResizeObserver(fit).observe(holder);
    else window.addEventListener('resize', fit);

    if (reduceMotion.matches) return;
    var start = function () { requestAnimationFrame(play); };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(start); else start();
  });

  /* ---------- Hover pill ("View project", gallery labels) follows the cursor ---------- */
  if (!canHover.matches) return;
  document.documentElement.classList.add('has-card-cursor');

  var EASE = 0.22; // share of the distance covered each frame: lower = more lag

  document.querySelectorAll('.card, .fd-shot, .contact-tile, .bento__card').forEach(function (card) {
    var button = card.querySelector('.card__cursor');
    if (!button) return;

    var target = { x: 0, y: 0 };
    var current = { x: 0, y: 0 };
    var frame = null;

    function apply() {
      button.style.setProperty('--btn-x', current.x + 'px');
      button.style.setProperty('--btn-y', current.y + 'px');
    }

    function tick() {
      current.x += (target.x - current.x) * EASE;
      current.y += (target.y - current.y) * EASE;
      apply();
      if (Math.abs(target.x - current.x) > 0.1 || Math.abs(target.y - current.y) > 0.1) {
        frame = requestAnimationFrame(tick);
      } else {
        frame = null;
      }
    }

    function setTarget(event) {
      var rect = card.getBoundingClientRect();
      target.x = event.clientX - rect.left;
      target.y = event.clientY - rect.top;
    }

    card.addEventListener('pointerenter', function (event) {
      setTarget(event);
      current.x = target.x; // appear right at the cursor, no fly-in
      current.y = target.y;
      apply();
    });

    card.addEventListener('pointermove', function (event) {
      setTarget(event);
      if (reduceMotion.matches) {
        current.x = target.x;
        current.y = target.y;
        apply();
      } else if (!frame) {
        frame = requestAnimationFrame(tick);
      }
    });
  });
})();
