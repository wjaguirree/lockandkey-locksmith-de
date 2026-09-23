/* Scroll reveals and counting statistics.
 *
 * Three rules this file obeys, in order of importance:
 *
 * 1. NOTHING IS HIDDEN BY THE STYLESHEET. The .reveal class is added here, so a
 *    browser that never runs this file shows every element normally. Hiding
 *    content in CSS and waiting for JavaScript is one failed request away from
 *    a blank page — on a locksmith's site, at 2am, that is the whole business.
 *
 * 2. NOTHING ALREADY ON SCREEN IS ANIMATED. The hero headline and its
 *    photograph are the Largest Contentful Paint on most pages; fading them in
 *    would delay the one number Google measures. Only elements below the fold
 *    at load are ever touched.
 *
 * 3. REDUCED MOTION MEANS NO MOTION. Not "less" — none.
 */
(function () {
  "use strict";

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || !("IntersectionObserver" in window)) return;

  var EASE_MS = 620;
  var STEP = 70;        /* stagger between siblings */
  var MAX_STEP = 280;   /* nobody waits longer than this for the fourth card */

  /* What gets revealed, and how. Order matters: the first match wins. */
  var GROUPS = [
    { sel: ".shot img, .card img, .m-fig, .job img", img: true },
    { sel: ".stat" },
    { sel: ".job, .card, .catgroup, .faq details, .m-towns a" },
    { sel: ".sec__head > *, .prose > p, .readnext, .chips, .stats, .band > *" }
  ];

  /* Never touched, whatever the measurement says. These are the Largest
     Contentful Paint on most pages, and measuring "is it above the fold?" at
     load proved unreliable — the hero photograph picked up a reveal class on a
     1000px viewport where it sits 248px down. A selector cannot drift. */
  var NEVER = ".hero, .hero *, .shot, .shot *, h1, .bar, .bar *, .head, .head *, .callbar, .callbar *";

  var seen = [];
  function collect() {
    var out = [];
    for (var g = 0; g < GROUPS.length; g++) {
      var nodes = document.querySelectorAll(GROUPS[g].sel);
      for (var i = 0; i < nodes.length; i++) {
        var el = nodes[i];
        if (seen.indexOf(el) > -1) continue;
        if (el.matches && el.matches(NEVER)) continue;
        seen.push(el);
        out.push({ el: el, img: !!GROUPS[g].img });
      }
    }
    return out;
  }

  /* Which way a picture comes in.
   *
   * Not alternating blindly: a photograph that lives in the right-hand column
   * should arrive from the right, so it reads as settling into its place
   * rather than flying in from the wrong side of the page. Only pictures that
   * span the width have no side of their own, and those alternate. */
  function sideFor(el, n) {
    var r = el.getBoundingClientRect();
    var vw = document.documentElement.clientWidth;
    if (!r.width || !vw) return "reveal--img";
    /* something occupying most of the width is not on a side */
    if (r.width > vw * 0.72) return (n % 2) ? "reveal--r" : "reveal--l";
    var centre = r.left + r.width / 2;
    return centre > vw / 2 ? "reveal--r" : "reveal--l";
  }
  /* Elements sharing a parent go up one after another, not all at once. */
  function delayFor(el, index) {
    return Math.min(index * STEP, MAX_STEP);
  }

  var io = new IntersectionObserver(function (entries) {
    for (var i = 0; i < entries.length; i++) {
      var e = entries[i];
      if (!e.isIntersecting) continue;
      var el = e.target;
      io.unobserve(el);
      var d = parseInt(el.getAttribute("data-rd") || "0", 10);
      setTimeout(function (node) {
        return function () {
          node.classList.add("is-in");
          /* let the compositor drop the layer once it has settled */
          setTimeout(function () { node.style.willChange = ""; }, EASE_MS + 60);
          if (node.hasAttribute("data-count")) countUp(node);
          var stats = node.querySelectorAll ? node.querySelectorAll("[data-count]") : [];
          for (var k = 0; k < stats.length; k++) countUp(stats[k]);
        };
      }(el), d);
    }
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });

  function arm() {
    var items = collect();
    var armed = [];
    var imgSeen = 0;
    var fold = window.innerHeight || 800;
    var perParent = {};
    for (var i = 0; i < items.length; i++) {
      var el = items[i].el;
      var top = el.getBoundingClientRect().top;
      /* already visible: leave it exactly as the page rendered it */
      if (top < fold * 0.92) {
        var pre = el.querySelectorAll ? el.querySelectorAll("[data-count]") : [];
        for (var p = 0; p < pre.length; p++) countUp(pre[p]);
        if (el.hasAttribute && el.hasAttribute("data-count")) countUp(el);
        continue;
      }
      var key = el.parentNode ? (el.parentNode.className || "x") : "x";
      perParent[key] = (perParent[key] || 0) + 1;
      el.setAttribute("data-rd", String(delayFor(el, perParent[key] - 1)));
      el.classList.add("reveal");
      if (items[i].img) el.classList.add(sideFor(el, imgSeen++));
      el.style.willChange = "opacity, transform";
      armed.push(el);
    }
    /* One reflow for the whole batch. The elements are hidden now and carry
       no transition, so nothing animated out. Only after this is the
       transition attached, which means only the arrival is animated. */
    if (armed.length) {
      void document.body.offsetHeight;
      for (var q = 0; q < armed.length; q++) {
        armed[q].classList.add("is-armed");
        io.observe(armed[q]);
      }
    }
  }

  /* ---------------------------------------------------------------- counters
     The figures are real text in the HTML ("12,400+", "5.0", "35+"), so they
     are correct for a crawler and for anyone who never triggers the animation.
     Parsing keeps the prefix, the separator style and the suffix intact. */
  function parseNum(text) {
    var m = text.match(/^([^0-9]*)([0-9][0-9,.]*)(.*)$/);
    if (!m) return null;
    var raw = m[2];
    var hasComma = raw.indexOf(",") > -1;
    var plain = raw.split(",").join("");
    var dot = plain.indexOf(".");
    var decimals = dot > -1 ? plain.length - dot - 1 : 0;
    var value = parseFloat(plain);
    if (!isFinite(value)) return null;
    return { pre: m[1], post: m[3], value: value, decimals: decimals, comma: hasComma };
  }

  function render(n, spec) {
    var s = spec.decimals > 0 ? n.toFixed(spec.decimals) : String(Math.round(n));
    if (spec.comma) {
      var parts = s.split(".");
      parts[0] = parts[0].replace(/\B(?=([0-9]{3})+(?![0-9]))/g, ",");
      s = parts.join(".");
    }
    return spec.pre + s + spec.post;
  }

  function countUp(node) {
    if (node.getAttribute("data-counted")) return;
    node.setAttribute("data-counted", "1");
    var spec = parseNum(node.getAttribute("data-count") || node.textContent.trim());
    if (!spec) return;
    var final = render(spec.value, spec);

    /* A hidden tab does not run requestAnimationFrame. Zeroing the text first
       and trusting a frame to arrive is how "12,400+ completed projects"
       became "0+ completed projects" on screen — a wrong number, which is far
       worse than no animation. So: never animate what nobody is watching, and
       never blank the figure outside a frame that is actually running. */
    if (document.hidden) return;

    var dur = 1100, t0 = 0, done = false;
    function finish() {
      if (done) return;
      done = true;
      node.textContent = final;
      node.style.minWidth = "";
    }
    /* last line of defence: whatever happens to the frame loop, the real
       figure is on screen well before anyone reads it */
    setTimeout(finish, dur + 600);

    function frame(t) {
      if (done) return;
      if (!t0) {
        t0 = t;
        /* the countdown starts HERE, inside a frame we know fired */
        node.style.minWidth = node.getBoundingClientRect().width + "px";
        node.textContent = render(0, spec);
        requestAnimationFrame(frame);
        return;
      }
      var k = Math.min((t - t0) / dur, 1);
      var eased = 1 - Math.pow(1 - k, 3);          /* ease-out cubic */
      node.textContent = render(spec.value * eased, spec);
      if (k < 1) requestAnimationFrame(frame);
      else finish();
    }
    requestAnimationFrame(frame);
  }

  /* mark the statistics before anything is observed */
  function tagCounters() {
    var b = document.querySelectorAll(".stat b, .shot__glass b");
    for (var i = 0; i < b.length; i++) {
      var txt = b[i].textContent.trim();
      if (parseNum(txt)) b[i].setAttribute("data-count", txt);
    }
  }

  function start() { tagCounters(); arm(); }
  /* on load, not DOMContentLoaded: web fonts and images have settled, so the
     "is this already on screen?" test is taken against the final layout */
  if (document.readyState === "complete") start();
  else window.addEventListener("load", start);
})();
