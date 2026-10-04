/* Ashlyticss — page behaviour (no framework). The 3D scene lives in data3d.js. */
(function () {
  "use strict";
  var root = document.documentElement;
  root.classList.add("js");
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }

  /* -------------------------------------------------------------- menu */
  var header = $(".site-header");
  var menuBtn = $(".menu-btn");
  function setMenu(open) {
    document.body.classList.toggle("menu-open", open);
    if (menuBtn) { menuBtn.setAttribute("aria-expanded", open ? "true" : "false"); menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu"); }
  }
  if (menuBtn) {
    menuBtn.addEventListener("click", function () { setMenu(!document.body.classList.contains("menu-open")); });
    $$("#mobile-menu a").forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });
    addEventListener("keydown", function (e) { if (e.key === "Escape" && document.body.classList.contains("menu-open")) { setMenu(false); menuBtn.focus(); } });
  }

  /* ----------------------------------------------------------- reveals */
  var revealTargets = $$(".reveal, .row");
  if (reduce || !("IntersectionObserver" in window)) {
    revealTargets.forEach(function (el) { el.classList.add("in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.15, rootMargin: "0px 0px -6% 0px" });
    revealTargets.forEach(function (el) { io.observe(el); });
  }

  /* ------------------------------------------- scroll scenes (rAF batch) */
  // Each scene reads layout in measure() and writes styles in apply(); a frame
  // runs every measure first, then only the applies whose value changed.
  var scenes = [];
  if (header) {
    var bar = document.createElement("div");
    bar.className = "scroll-progress";
    bar.setAttribute("aria-hidden", "true");
    header.appendChild(bar);
    scenes.push({
      measure: function () {
        if (scrollY <= 8) return 0;
        var max = root.scrollHeight - innerHeight;
        return Math.max(0.0005, Math.round(clamp(scrollY / Math.max(1, max), 0, 1) * 2000) / 2000);
      },
      apply: function (v) {
        header.classList.toggle("scrolled", v > 0);
        bar.style.transform = "scaleX(" + v.toFixed(4) + ")";
      }
    });
  }

  // the journey's chapter bar marks the chapter at the middle of the screen
  // and shows only while the chapters (not the hero) are on screen; past the
  // journey the 3D scene stays behind the pages, dimmed (site.css)
  var journey = $("#journey");
  if (journey) {
    var chapters = $$("[data-ch]", journey);
    var railLinks = $$("[data-rail]", journey);
    scenes.push({
      measure: function () {
        var mid = innerHeight / 2;
        var r = journey.getBoundingClientRect();
        if (r.bottom < mid) return -2;
        if (r.top > mid) return -1;
        for (var i = chapters.length - 1; i >= 0; i--) {
          if (chapters[i].getBoundingClientRect().top <= mid) return Number(chapters[i].dataset.ch);
        }
        return 0;
      },
      apply: function (ch) {
        root.classList.toggle("in-journey", ch >= 1);
        root.classList.toggle("past-journey", ch === -2);
        railLinks.forEach(function (a) {
          var n = Number(a.dataset.rail);
          a.classList.toggle("on", n === ch);
          a.classList.toggle("done", n < ch);
          if (n === ch) a.setAttribute("aria-current", "step"); else a.removeAttribute("aria-current");
        });
      }
    });
  }

  var queued = false;
  function runScenes() {
    queued = false;
    var vals = scenes.map(function (s) { return s.measure(); });
    scenes.forEach(function (s, i) { if (vals[i] !== s.last) { s.last = vals[i]; s.apply(vals[i]); } });
  }
  function requestScenes() { if (!queued) { queued = true; requestAnimationFrame(runScenes); } }
  runScenes();
  addEventListener("scroll", requestScenes, { passive: true });
  addEventListener("resize", function () { scenes.forEach(function (s) { s.last = undefined; }); requestScenes(); });

  /* ------------------------------------------------- settle on pages */
  // When a scroll stops within a fifth of a screen of a page edge, glide the
  // rest of the way so the site reads as screens. Never mid-scroll, while the
  // scrollbar is dragged, on phones (pages there are taller than the screen)
  // or with reduced motion. CSS scroll-snap is not used: with screen-tall
  // pages it pulls short scrolls back, which feels stuck.
  if (journey && !reduce) {
    var pages = $$(".hero, .chapter, main > .section");
    var bigScreen = matchMedia("(min-width: 901px) and (min-height: 640px)");
    var pointerDown = false, settleTimer = 0, settling = false;
    addEventListener("pointerdown", function () { pointerDown = true; }, { passive: true });
    addEventListener("pointerup", function () { pointerDown = false; }, { passive: true });
    var settle = function () {
      if (!bigScreen.matches || pointerDown || settling || document.body.classList.contains("menu-open")) return;
      if (document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
      var vh = innerHeight, best = null;
      pages.forEach(function (p) {
        var top = p.getBoundingClientRect().top;
        if (Math.abs(top) < vh * 0.2 && (best === null || Math.abs(top) < Math.abs(best))) best = top;
      });
      if (best === null || Math.abs(best) < 2) return;
      settling = true;
      scrollTo({ top: scrollY + best, behavior: "smooth" });
      setTimeout(function () { settling = false; }, 700);
    };
    addEventListener("scroll", function () {
      clearTimeout(settleTimer);
      if (!settling) settleTimer = setTimeout(settle, 140);
    }, { passive: true });
  }

  /* ---------------------------------------------- sideways card rows */
  $$(".row").forEach(function (row) {
    var btns = $$('[data-row="' + row.id + '"]');
    if (!btns.length) return;
    function sync() {
      var max = row.scrollWidth - row.clientWidth - 2;
      btns.forEach(function (b) { b.disabled = Number(b.dataset.dir) < 0 ? row.scrollLeft <= 2 : row.scrollLeft >= max; });
    }
    btns.forEach(function (b) {
      b.addEventListener("click", function () {
        var card = row.firstElementChild;
        var step = card ? card.getBoundingClientRect().width + parseFloat(getComputedStyle(row).columnGap || 0) : row.clientWidth;
        row.scrollBy({ left: Number(b.dataset.dir) * step, behavior: reduce ? "auto" : "smooth" });
      });
    });
    row.addEventListener("scroll", function () { requestAnimationFrame(sync); }, { passive: true });
    addEventListener("resize", sync);
    // measured once the row comes near: its section skips layout until then
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries, obs) { if (entries[0].isIntersecting) { sync(); obs.disconnect(); } }).observe(row);
    }
  });

  /* ---------------------------------------------------- ROI calculator */
  var rs = [1, 2, 3, 4].map(function (i) { return document.getElementById("rs" + i); });
  if (rs[0]) {
    var rv = [1, 2, 3, 4].map(function (i) { return document.getElementById("rv" + i); });
    var roiMain = $("#roiMain"), rHrs = $("#rHrs"), rLabour = $("#rLabour"), rDecision = $("#rDecision"), rRevenue = $("#rRevenue"), rCost = $("#rCost");
    var fmt = function (n) { return n >= 1000000 ? "$" + (n / 1000000).toFixed(1) + "M" : n >= 1000 ? "$" + (n / 1000).toFixed(0) + "K" : "$" + n; };
    var shown = 0, anim = 0;
    var calc = function () {
      var hrs = +rs[0].value, rate = +rs[1].value, people = +rs[2].value, rev = +rs[3].value;
      rv[0].textContent = hrs + " hrs";
      rv[1].textContent = "$" + rate + " / hr";
      rv[2].textContent = people + " " + (people === 1 ? "person" : "people");
      rv[3].textContent = fmt(rev) + " / mo";
      // 85% of manual reporting time automated; 5% revenue uplift; build cost by team size
      var hrsSaved = Math.round(hrs * people * 0.85 * 52);
      var labour = Math.round(hrs * people * rate * 0.85 * 52);
      var revUplift = Math.round(rev * 12 * 0.05);
      var dashCost = people <= 2 ? 1500 : people <= 5 ? 2500 : people <= 10 ? 4000 : 6000;
      var target = Math.max(labour + revUplift - dashCost, 0);
      rHrs.textContent = hrsSaved.toLocaleString() + " hrs / yr";
      rLabour.textContent = fmt(labour) + " / yr";
      rDecision.textContent = "~3× faster";
      rRevenue.textContent = fmt(revUplift) + " / yr";
      rCost.textContent = "-" + fmt(dashCost);
      var from = shown, t0 = performance.now();
      cancelAnimationFrame(anim);
      (function tick(t) {
        var k = reduce ? 1 : Math.min((t - t0) / 600, 1);
        var cur = Math.round(from + (1 - Math.pow(1 - k, 3)) * (target - from));
        shown = cur;
        roiMain.textContent = cur >= 1000000 ? "$" + (cur / 1000000).toFixed(2) + "M" : cur >= 1000 ? "$" + (cur / 1000).toFixed(0) + "K" : "$" + cur.toLocaleString();
        if (k < 1) anim = requestAnimationFrame(tick);
      })(t0);
    };
    rs.forEach(function (s) { s.addEventListener("input", calc); });
    calc();
  }

  /* ------------------------------------------------------------ forms */
  function say(el, text, ok) { el.textContent = text; el.className = "form-msg " + (ok ? "ok" : "err"); }
  function emailReady() {
    if (typeof emailjs === "undefined") return false;
    try { emailjs.init({ publicKey: "o_XE4MKTt5m61GLYL" }); } catch (e) {}
    return true;
  }

  // ShapedOps early access — the same lead endpoint shapedops.com's own forms use
  var LEADS_ENDPOINT = "https://shapedops.ashlyticss.com/api/leads";
  var prodForm = $("#prod-form");
  if (prodForm) prodForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var name = $("#prodName").value.trim(), business = $("#prodBusiness").value.trim(), whatsapp = $("#prodWhatsapp").value.trim(), email = $("#prodEmail").value.trim(), website = $("#prodWebsite").value;
    var btn = $("#prodSubmit"), msg = $("#prodMsg");
    if (!name || !business || !whatsapp || !email || email.indexOf("@") < 0) { say(msg, "Please fill in every field with a valid email.", false); return; }
    btn.querySelector("span").textContent = "Sending…"; btn.disabled = true;
    fetch(LEADS_ENDPOINT, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "early_access", name: name, businessName: business, whatsapp: whatsapp, email: email, website: website })
    }).then(function (res) {
      if (!res.ok) throw new Error("request failed");
      say(msg, "You're on the list — we'll be in touch.", true);
      btn.querySelector("span").textContent = "Sent ✓";
      prodForm.reset();
    }).catch(function () {
      say(msg, "Something went wrong. Please try again, or message us on WhatsApp instead.", false);
      btn.querySelector("span").textContent = "Get early access →"; btn.disabled = false;
    });
  });

  // free data audit
  var auditForm = $("#audit-form");
  if (auditForm) auditForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var name = $("#auditName").value.trim(), company = $("#auditCompany").value.trim(), email = $("#auditEmail").value.trim(), goal = $("#auditGoal").value;
    var btn = $("#auditSubmit"), msg = $("#auditMsg");
    if (!name || !email || email.indexOf("@") < 0) { say(msg, "Please enter your name and a valid email.", false); return; }
    if (!emailReady()) { say(msg, "Email service failed to load. Please message us on WhatsApp instead.", false); return; }
    btn.querySelector("span").textContent = "Sending…"; btn.disabled = true;
    emailjs.send("service_mml189p", "template_1lpp3n4", {
      to_email: "hello@ashlyticss.com",
      subject: "Free Data Audit: " + name + (company ? " (" + company + ")" : ""),
      from_name: name, from_email: email, reply_to: email,
      company: company || "Not provided", services: "Free Data Audit",
      message: "👤 " + name + "\n📧 " + email + "\n🏢 " + (company || "—") + "\n🎯 " + (goal || "—") + "\n📊 ROI est: " + ($("#roiMain") ? $("#roiMain").textContent : "—")
    }).then(function () {
      say(msg, "✓ Received! We'll reply within 24 hours.", true);
      btn.querySelector("span").textContent = "Sent ✓";
    }, function () {
      say(msg, "Something went wrong. Message us on WhatsApp instead.", false);
      btn.querySelector("span").textContent = "Claim free audit →"; btn.disabled = false;
    });
  });

  // four-step enquiry
  var msf = $(".msf");
  if (msf) {
    var goTo = function (n) {
      $$(".msf-step", msf).forEach(function (s) { s.classList.toggle("active", Number(s.dataset.step) === n); });
      $("#msfStepNum").textContent = "Step " + n;
      $("#msfFill").style.width = (n / 4 * 100) + "%";
      var first = $('.msf-step[data-step="' + n + '"] input, .msf-step[data-step="' + n + '"] .msf-chip', msf);
      if (first) first.focus({ preventScroll: true });
    };
    var next = function (step) {
      if (step === 1 && !$("#msf_name").value.trim()) { $("#msf_name").focus(); return; }
      if (step === 2) { var em = $("#msf_email").value.trim(); if (!em || em.indexOf("@") < 0) { $("#msf_email").focus(); return; } }
      if (step < 4) goTo(step + 1);
    };
    $$("[data-msf-next]", msf).forEach(function (b) { b.addEventListener("click", function () { next(Number(b.dataset.msfNext)); }); });
    $$("[data-msf-go]", msf).forEach(function (b) { b.addEventListener("click", function () { goTo(Number(b.dataset.msfGo)); }); });
    $$("#msf_name, #msf_email", msf).forEach(function (inp, i) { inp.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); next(i + 1); } }); });
    $$(".msf-chip", msf).forEach(function (c) { c.addEventListener("click", function () { c.setAttribute("aria-pressed", c.getAttribute("aria-pressed") === "true" ? "false" : "true"); }); });
    var sending = false;
    $("#msfSend").addEventListener("click", function () {
      var name = $("#msf_name").value.trim(), email = $("#msf_email").value.trim();
      var chips = $$('.msf-chip[aria-pressed="true"]', msf).map(function (c) { return c.textContent; }).join(", ") || "Not specified";
      var note = $("#msf_msg").value.trim(), company = $("#msf_company").value.trim();
      if (!name || !email) { goTo(1); return; }
      if (sending) return;
      if (!emailReady()) { alert("Email service failed to load. Please refresh the page or contact us on WhatsApp."); return; }
      sending = true;
      var send = $("#msfSend"); send.disabled = true; send.textContent = "Sending…";
      emailjs.send("service_mml189p", "template_1lpp3n4", {
        to_email: "ashlytics01@gmail.com",
        subject: "New Enquiry: " + name + (company ? " (" + company + ")" : ""),
        from_name: name, from_email: email, reply_to: email,
        company: company || "Not provided", services: chips,
        message: "👤 Name: " + name + "\n📧 Email: " + email + "\n🏢 Company: " + (company || "Not provided") + "\n🛠 Services Interested In: " + chips + "\n\n💬 Message:\n" + (note || "No additional message")
      }).then(function () {
        $("#msfFill").style.width = "100%";
        $("#msfWrap").hidden = true;
        $(".msf-top", msf).hidden = true;
        $("#sm").hidden = false;
      }, function () {
        alert("Something went wrong. Please message us on WhatsApp instead.");
        sending = false; send.disabled = false; send.textContent = "Send enquiry →";
      });
    });
  }

  /* --------------------------------------------- smooth scroll after load */
  addEventListener("load", function () { setTimeout(function () { root.classList.add("smooth"); }, 400); });
})();
