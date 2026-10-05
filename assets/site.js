// Sewzy motion system: Lenis (sole smooth-scroll engine) + GSAP ScrollTrigger.
// Everything is visible without JS; this file only adds motion. Reduced motion → final states, no smoothing.
(() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.documentElement.classList.add("js");
  if (reduce || !window.gsap) { document.documentElement.classList.add("still"); return; }
  const { gsap } = window; gsap.registerPlugin(ScrollTrigger);

  // ---- smooth scroll (Lenis) wired to ScrollTrigger
  const lenis = new Lenis({ duration: 1.1, smoothWheel: true });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0);
  document.querySelectorAll('a[href^="#"], a[href*="/#"]').forEach((a) => a.addEventListener("click", (e) => {
    const id = a.getAttribute("href").split("#")[1]; const el = id && document.getElementById(id);
    if (el && a.pathname === location.pathname) { e.preventDefault(); lenis.scrollTo(el, { offset: -70 }); }
  }));

  // ---- word-by-word headings (accessible: real text kept in aria-label)
  document.querySelectorAll("[data-split]").forEach((h) => {
    if (h.querySelector("a")) return;
    const text = h.textContent.trim(); h.setAttribute("aria-label", text);
    h.innerHTML = text.split(/\s+/).map((w) => `<span class="w" aria-hidden="true"><span>${w}</span></span>`).join(" ");
    gsap.from(h.querySelectorAll(".w > span"), {
      yPercent: 110, rotate: 4, duration: 0.9, ease: "power4.out", stagger: 0.06,
      scrollTrigger: h.closest(".hero") ? undefined : { trigger: h, start: "top 85%" },
      delay: h.closest(".hero") ? 0.15 : 0,
    });
  });

  // ---- hero intro
  const hero = document.querySelector(".hero");
  if (hero) {
    gsap.timeline({ delay: 0.25 })
      .from(".hero .chip", { y: 14, opacity: 0, duration: 0.5 })
      .from(".hero .lead, .hero .row, .hero .note", { y: 22, opacity: 0, duration: 0.7, stagger: 0.08, ease: "power3.out" }, 0.45)
      .from(".hero .stage", { scale: 0.92, opacity: 0, duration: 1.1, ease: "power3.out" }, 0.1)
      .from(".hero .float", { y: 40, opacity: 0, duration: 0.8, stagger: 0.12, ease: "back.out(1.6)" }, 0.6);
    gsap.to(".hero .float.a", { y: -70, scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true } });
    gsap.to(".hero .float.b", { y: -130, scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true } });
  }

  // ---- generic reveals
  gsap.utils.toArray("[data-reveal]").forEach((el) => {
    gsap.from(el.children.length && el.hasAttribute("data-stagger") ? el.children : el, {
      y: 36, opacity: 0, duration: 0.85, ease: "power3.out", stagger: 0.08,
      scrollTrigger: { trigger: el, start: "top 86%" },
    });
  });

  // ---- counters
  gsap.utils.toArray("[data-count]").forEach((el) => {
    const end = +el.dataset.count, o = { v: 0 };
    gsap.to(o, { v: end, duration: 1.6, ease: "power2.out", scrollTrigger: { trigger: el, start: "top 90%" }, onUpdate: () => (el.textContent = Math.round(o.v)) });
  });

  // ---- pinned "how it works": phone screen swaps per step (desktop only)
  const how = document.querySelector(".how");
  if (how && matchMedia("(min-width: 900px)").matches) {
    const steps = how.querySelectorAll(".how-step"), shots = how.querySelectorAll(".how-phone img");
    gsap.set([...steps].slice(1), { opacity: 0.25 });
    const tl = gsap.timeline({ scrollTrigger: { trigger: how, start: "top top", end: `+=${steps.length * 70}%`, scrub: 0.6, pin: true } });
    steps.forEach((s, i) => {
      if (i === 0) return;
      tl.to(steps[i - 1], { opacity: 0.25, duration: 0.5 }, i)
        .to(s, { opacity: 1, duration: 0.5 }, i)
        .to(shots[i - 1], { opacity: 0, scale: 0.96, duration: 0.5 }, i)
        .fromTo(shots[i], { opacity: 0, scale: 1.04 }, { opacity: 1, scale: 1, duration: 0.5 }, i)
        .to(how.querySelector(".how-bar i"), { scaleY: (i + 1) / steps.length, duration: 0.5 }, i);
    });
  }

  // ---- horizontal goose gallery
  const hz = document.querySelector(".hz");
  if (hz && matchMedia("(min-width: 900px)").matches) {
    const track = hz.querySelector(".hz-track");
    gsap.to(track, { x: () => -(track.scrollWidth - innerWidth + 80), ease: "none",
      scrollTrigger: { trigger: hz, start: "top top", end: () => `+=${track.scrollWidth - innerWidth}`, scrub: 0.5, pin: true, invalidateOnRefresh: true } });
  }

  // ---- tilt cards (fine pointers only)
  if (matchMedia("(pointer: fine)").matches) {
    document.querySelectorAll("[data-tilt]").forEach((c) => {
      c.addEventListener("pointermove", (e) => { const r = c.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        gsap.to(c, { rotateY: x * 8, rotateX: -y * 8, duration: 0.4, ease: "power2.out", transformPerspective: 800 }); });
      c.addEventListener("pointerleave", () => gsap.to(c, { rotateX: 0, rotateY: 0, duration: 0.6, ease: "power3.out" }));
    });
    document.querySelectorAll(".magnet").forEach((b) => {
      b.addEventListener("pointermove", (e) => { const r = b.getBoundingClientRect(); gsap.to(b, { x: (e.clientX - r.left - r.width / 2) * 0.25, y: (e.clientY - r.top - r.height / 2) * 0.35, duration: 0.3 }); });
      b.addEventListener("pointerleave", () => gsap.to(b, { x: 0, y: 0, duration: 0.5, ease: "elastic.out(1,.4)" }));
    });
  }

  // ---- thread line drawn down the page
  const path = document.querySelector(".thread path");
  if (path) {
    const L = path.getTotalLength(); path.style.strokeDasharray = L; path.style.strokeDashoffset = L;
    gsap.to(path, { strokeDashoffset: 0, ease: "none", scrollTrigger: { trigger: document.body, start: "top top", end: "bottom bottom", scrub: 0.3 } });
  }

  addEventListener("load", () => ScrollTrigger.refresh());
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
  addEventListener("pagehide", () => { lenis.destroy(); ScrollTrigger.getAll().forEach((s) => s.kill()); });
})();
