/* Lock and Key Locksmith DE — main.js
   Classic script, no modules. Each init is isolated so one failure cannot take
   the page down, and the page must still read and still call with JS switched
   off: every phone number is a plain <a href="tel:"> in the HTML. */
(function () {
  "use strict";

  var PHONE = "(302) 271-0155";

  function safe(name, fn) {
    try { fn(); } catch (e) { if (window.console) console.warn("init " + name + " failed:", e); }
  }

  /* ---------------- open / closed ----------------
     Sun-Thu 7am-10pm · Fri 7am-6pm · Sat closed, Delaware time.
     DUPLICATED from gen/data.mjs BRAND.hours on purpose (this file ships static);
     if the hours change there, change them here too — qa.mjs compares the two.
     Says only whether the phone is being answered now — never an arrival time. */
  safe("status", function () {
    var HOURS = { 0: [420, 1320], 1: [420, 1320], 2: [420, 1320], 3: [420, 1320], 4: [420, 1320], 5: [420, 1080], 6: null };
    var DAYS = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

    var now;
    try {
      var map = {};
      new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York", weekday: "short",
        hour: "2-digit", minute: "2-digit", hour12: false
      }).formatToParts(new Date()).forEach(function (p) { map[p.type] = p.value; });
      var h = parseInt(map.hour, 10); if (h === 24) h = 0;
      now = { day: DAYS[map.weekday], mins: h * 60 + parseInt(map.minute, 10) };
    } catch (e) {
      var d = new Date();
      now = { day: d.getDay(), mins: d.getHours() * 60 + d.getMinutes() };
    }

    var span = HOURS[now.day];
    var open = !!span && now.mins >= span[0] && now.mins < span[1];

    var t = document.getElementById("statusText");
    if (t) t.textContent = open ? "Open now" : "Closed — leave a request";
    var wrap = document.getElementById("barStatus");
    if (wrap) wrap.hidden = false;   /* only now is the claim true */
    var p = document.getElementById("pulse");
    if (p && !open) p.className = "pulse off";
  });

  /* ---------------- navigation ----------------
     The menu is a plain list of <a> in the HTML, so it works with JS off; this
     only handles opening the panel on a phone. */
  safe("menu", function () {
    var burger = document.getElementById("burger");
    var nav = document.getElementById("nav");
    if (!burger || !nav) return;

    function set(open) {
      nav.setAttribute("data-open", open ? "true" : "false");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      document.body.style.overflow = open ? "hidden" : "";
    }

    burger.addEventListener("click", function () {
      set(nav.getAttribute("data-open") !== "true");
    });
    nav.addEventListener("click", function (e) {
      if (e.target.tagName === "A") set(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.getAttribute("data-open") === "true") { set(false); burger.focus(); }
    });
    /* A resize back to desktop must not leave the body scroll-locked. */
    addEventListener("resize", function () {
      if (innerWidth > 900 && nav.getAttribute("data-open") === "true") set(false);
    });
  });

  /* ---------------- wizard steps ----------------
     The All Seasons 3-step layout: pick a category, pick the situation, leave
     your details. The buttons only DRIVE the real service <select> inside the
     form — with JS off the select stays visible and everything still submits. */
  safe("wizard", function () {
    var wizards = document.querySelectorAll("[data-wiz]");
    Array.prototype.forEach.call(wizards, function (w) {
      w.classList.add("js");
      var cats = w.querySelectorAll("[data-wiz-cat]");
      var svcs = w.querySelectorAll("[data-wiz-svc]");
      var sel = w.querySelector("select[name=service]");

      Array.prototype.forEach.call(cats, function (b) {
        b.addEventListener("click", function () {
          Array.prototype.forEach.call(cats, function (x) { x.classList.remove("on"); });
          b.classList.add("on");
          var cat = b.getAttribute("data-wiz-cat");
          Array.prototype.forEach.call(svcs, function (sb) {
            sb.classList.toggle("show", sb.getAttribute("data-wiz-of") === cat);
            sb.classList.remove("on");
          });
          if (sel) sel.value = "";
        });
      });

      Array.prototype.forEach.call(svcs, function (sb) {
        sb.addEventListener("click", function () {
          Array.prototype.forEach.call(svcs, function (x) { x.classList.remove("on"); });
          sb.classList.add("on");
          if (sel) sel.value = sb.getAttribute("data-wiz-svc");
          var name = w.querySelector("input[name=name]");
          if (name) name.focus();
        });
      });
    });
  });

  /* ---------------- request form ----------------
     There are now TWO on the site — one on /request/ and one on the home page —
     so this binds EVERY form that carries a delivery endpoint rather than one
     hard-coded id. Fields are found by name, not by id, because two forms on one
     page cannot share ids.

     HARD RULE: never show a success message unless delivery was confirmed. A
     lead form that lies about delivery is the worst failure mode on the site;
     on a sister site it said "thanks, we got it" for months while nothing
     arrived. */
  safe("form", function () {
    var PHONE_HREF = "tel:+13022710155";
    var forms = document.querySelectorAll("form[data-endpoint-enc], form[data-endpoint]");

    Array.prototype.forEach.call(forms, function (form) {
      var msg = form.querySelector(".msg");
      var btn = form.querySelector("button[type=submit]");
      if (!msg || !btn) return;

      function endpoint() {
        var enc = form.getAttribute("data-endpoint-enc");
        if (enc) { try { return atob(enc); } catch (e) { return ""; } }
        return form.getAttribute("data-endpoint") || "";
      }
      function field(n) { return form.querySelector("[name=" + n + "]"); }
      function show(kind, html) { msg.className = "msg msg--" + kind; msg.innerHTML = html; }
      function fail() {
        show("err", "We could not send that from the website. Please call " +
          "<a href=\"" + PHONE_HREF + "\">" + PHONE + "</a> and we will take the details over the phone.");
      }

      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var name = field("name"), phone = field("phone");

        if (!name.value.trim() || !phone.value.trim()) {
          show("err", "Please add your name and a phone number so we can call you back.");
          (name.value.trim() ? phone : name).focus();
          return;
        }
        var url = endpoint();
        if (!url) { fail(); return; }

        btn.disabled = true;
        var original = btn.textContent;
        btn.textContent = "Sending…";

        var data = {};
        new FormData(form).forEach(function (v, k) { data[k] = v; });
        data._subject = "Website request — " + (data.town || "Delaware") + " — " + (data.service || "locksmith");

        fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(data)
        })
          .then(function (r) {
            return r.json().catch(function () { return {}; })
              .then(function (j) { return { ok: r.ok, j: j }; });
          })
          .then(function (res) {
            if (res.ok && String(res.j.success) !== "false") {
              show("ok", "Got it. We have your details and will call you back on " +
                phone.value.trim() + ". If it is urgent, call " + PHONE + ".");
              form.reset();
            } else {
              fail();
            }
          })
          .catch(fail)
          .then(function () { btn.disabled = false; btn.textContent = original; });
      });
    });
  });
})();

/* Coverage map: hovering a town in the list lights its dot, and the reverse.
   Progressive enhancement only — every link works with this file absent. */
(function () {
  var wrap = document.querySelector(".m-wrap");
  if (!wrap) return;
  function sync(slug, on) {
    var all = wrap.querySelectorAll('[data-t="' + slug + '"]');
    for (var i = 0; i < all.length; i++) all[i].classList.toggle("is-hot", on);
  }
  wrap.addEventListener("mouseover", function (e) {
    var el = e.target.closest("[data-t]"); if (el) sync(el.getAttribute("data-t"), true);
  });
  wrap.addEventListener("mouseout", function (e) {
    var el = e.target.closest("[data-t]"); if (el) sync(el.getAttribute("data-t"), false);
  });
  wrap.addEventListener("focusin", function (e) {
    var el = e.target.closest("[data-t]"); if (el) sync(el.getAttribute("data-t"), true);
  });
  wrap.addEventListener("focusout", function (e) {
    var el = e.target.closest("[data-t]"); if (el) sync(el.getAttribute("data-t"), false);
  });
})();

/* The map: the tap opens the NEAREST town, not whichever circle happens to be
   on top.
 *
 * The hit circles have to be ~25px across to be tappable, and in the beach
 * cluster the towns are closer together than that, so the circles overlap.
 * SVG resolves an overlap by document order, which from the user's side is
 * arbitrary: a tap clearly closer to Dewey Beach could open Rehoboth. Measuring
 * the distance settles it the way the eye expects.
 *
 * The anchors stay exactly as they are, so this is an enhancement: with the
 * script absent every dot is still an ordinary link, and modifier-clicks are
 * left alone so "open in new tab" keeps working.
 */
(function () {
  var svg = document.querySelector(".m-svg");
  if (!svg || !svg.createSVGPoint || !svg.getScreenCTM) return;

  var dots = [];
  var nodes = svg.querySelectorAll(".m-dot");
  for (var i = 0; i < nodes.length; i++) {
    var c = nodes[i].querySelector("circle");
    if (!c) continue;
    dots.push({
      x: parseFloat(c.getAttribute("cx")),
      y: parseFloat(c.getAttribute("cy")),
      href: nodes[i].getAttribute("href")
    });
  }
  if (!dots.length) return;

  var REACH = 90;   /* viewBox units: about 32px on a phone, 0 beyond that */

  svg.addEventListener("click", function (e) {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var ctm = svg.getScreenCTM();
    if (!ctm) return;
    var pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    var p = pt.matrixTransform(ctm.inverse());

    var best = null, bestD = Infinity;
    for (var k = 0; k < dots.length; k++) {
      var dx = dots[k].x - p.x, dy = dots[k].y - p.y;
      var d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = dots[k]; }
    }
    if (!best || !best.href || Math.sqrt(bestD) > REACH) return;

    e.preventDefault();
    window.location.href = best.href;
  });
})();
