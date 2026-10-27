// Outside is Australia's biggest gym: embeds each chart as it nears the screen, then adds scroll
// reveals and one-off chart entrance animations. Motion is skipped when the reader prefers reduced motion.

const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const HAS_IO = "IntersectionObserver" in window;
document.documentElement.classList.add("js");

// Chart text uses DM Sans (with system fallbacks), matching --font-ui in css/style.css.
const FONT = "'DM Sans', system-ui, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

// Shared chart theme (fonts and colours match css/style.css). Per-mark ARIA labels are switched off:
// each chart's SVG keeps one aria-label from its spec description, and the caption explains the chart.
const THEME = {
  font: FONT,
  background: null,
  view: { stroke: null },
  mark: { aria: false },
  axis: {
    labelFont: FONT, titleFont: FONT, labelFontSize: 12, titleFontSize: 12, titleFontWeight: 600,
    labelColor: "#3B4757", titleColor: "#3B4757", gridColor: "#EFE5D3", domainColor: "#C9BBA5", tickColor: "#C9BBA5"
  },
  legend: {
    labelFont: FONT, titleFont: FONT, labelFontSize: 12, titleFontSize: 12,
    labelColor: "#3B4757", titleColor: "#1B2A41", titleFontWeight: 700
  },
  title: {
    font: FONT, fontSize: 15, fontWeight: 700, color: "#1B2A41",
    subtitleFont: FONT, subtitleFontSize: 12, subtitleColor: "#5D6673", anchor: "start", offset: 10
  },
  header: { labelFont: FONT, titleFont: FONT },
  text: { font: FONT }
};

// Vega measures label widths when it renders, so wait (briefly) for the chart font first
const fontsReady = Promise.race([
  document.fonts ? Promise.all([document.fonts.load("700 12px 'DM Sans'"), document.fonts.load("400 12px 'DM Sans'")]) : Promise.resolve(),
  new Promise((resolve) => setTimeout(resolve, 1500))
]);

// ---------- Embed each chart when it comes within reach ----------
async function embed(el) {
  if (el.dataset.embedded) return;
  el.dataset.embedded = "1";
  const card = el.closest(".card");
  if (!REDUCED && card) card.classList.add("anim-wait");
  try {
    await fontsReady;
    await vegaEmbed(el, el.dataset.spec, { actions: false, renderer: "svg", config: THEME });
    el.dataset.ready = "1";
    if (card && card.dataset.seen === "1") animate(el);
  } catch (err) {
    console.error(el.dataset.spec, err);
    if (card) card.classList.remove("anim-wait");
    el.innerHTML = `<p class="vis-error">This chart could not load (${el.dataset.spec}).</p>`;
  }
}

const figures = [...document.querySelectorAll(".vis[data-spec]")];
if (HAS_IO) {
  const near = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) { near.unobserve(entry.target); embed(entry.target); }
    });
  }, { rootMargin: "900px 0px" });
  figures.forEach((el) => near.observe(el));
} else {
  figures.forEach(embed);
}

// ---------- Chart entrance animations ----------
// Each chart's marks get a short, staggered entrance the first time the chart scrolls into view.
// Classes and delays are removed afterwards, so marks stay still and later interactions redraw cleanly.
// Vega draws rules as <line> and most other marks as <path>.
const MARKS = (svg, type) => svg.querySelectorAll(`.mark-${type}.role-mark > path, .mark-${type}.role-mark > line`);

const ANIMS = {
  waffle: (svg) => stagger(MARKS(svg, "symbol"), "pop", (p, i) => (i % 100) * 6 + Math.floor(i / 100) * 90),
  spikes: (svg) => {
    stagger(svg.querySelectorAll(".spikes_marks > path"), "rise", (p, i) => 200 + i * 90);
    stagger(svg.querySelectorAll(".dumbbell_dots_marks > path"), "pop", (p, i) => 400 + i * 30);
    stagger(MARKS(svg, "rule"), "grow-x", (p, i) => 300 + i * 30);
    stagger(MARKS(svg, "geoshape"), "fade", () => 0);
  },
  lines: (svg) => {
    draw(MARKS(svg, "line"), (i) => i * 70);
    stagger(MARKS(svg, "symbol"), "pop", (p, i) => 500 + (i % 40) * 18);
    stagger(MARKS(svg, "circle"), "pop", (p, i) => 500 + (i % 40) * 18);
    stagger(MARKS(svg, "rule"), "fade", () => 0);
  },
  bars: (svg) => {
    svg.querySelectorAll(".mark-rect.role-mark > path, .mark-rule.role-mark > line").forEach((p, i) => {
      const group = p.parentNode.getAttribute("class") || "";
      const cls = group.includes("mosaic") || group.includes("vbar") ? "grow-y" : "grow-x";
      setOrigin(p, cls, group.includes("women"));
      p.style.setProperty("--d", `${cls === "grow-y" ? i * 35 : Math.min(i, 30) * 40}ms`);
      p.classList.add(cls);
    });
    stagger(MARKS(svg, "symbol"), "pop", (p, i) => 300 + i * 40);
    stagger(MARKS(svg, "circle"), "pop", (p, i) => 300 + i * 40);
  },
  flows: (svg) => {
    draw(MARKS(svg, "path"), (i) => 200 + i * 35);
    stagger(MARKS(svg, "rect"), "grow-y", (p, i) => i * 60);
  },
  cells: (svg) => sweep(svg.querySelectorAll(".role-mark > path"), "fade", 900),
  petals: (svg) => stagger(MARKS(svg, "arc"), "pop", (p, i) => (i % 12) * 40 + Math.floor(i / 39) * 35),
  dots: (svg) => {
    stagger(MARKS(svg, "geoshape"), "fade", () => 0);
    sweep(svg.querySelectorAll(".mark-circle.role-mark > path, .mark-symbol.role-mark > path"), "pop", 1300);
  },
  circles: (svg) => {
    const marks = svg.querySelectorAll(".mark-symbol.role-mark > path, .mark-circle.role-mark > path");
    stagger(marks, "pop", (p, i) => Math.min(i * 3, 1100));
    stagger(svg.querySelectorAll(".mark-rule.role-mark > line, .mark-text.role-mark > text"), "fade", () => 900);
  }
};

// Where each animation grows from, as a fraction of the mark's box (x, y)
const ORIGIN = { pop: [0.5, 0.5], rise: [0.5, 1], "grow-x": [0, 0.5], "grow-y": [0.5, 1], fade: [0.5, 0.5] };

// Vega positions marks with transform="translate(x,y)". Put the scale origin in the same
// coordinates (translation + point inside the mark's own box) so marks grow in place.
function setOrigin(p, cls, flipX = false) {
  const [ax, ay] = ORIGIN[cls] || [0.5, 0.5];
  const m = /translate\(\s*([-\d.e]+)[ ,]\s*([-\d.e]+)/.exec(p.getAttribute("transform") || "");
  const tx = m ? Number(m[1]) : 0, ty = m ? Number(m[2]) : 0;
  const b = p.getBBox();
  const fx = flipX ? 1 - ax : ax;
  p.style.transformBox = "view-box";
  p.style.transformOrigin = `${tx + b.x + b.width * fx}px ${ty + b.y + b.height * ay}px`;
}

function stagger(nodes, cls, delayFn) {
  nodes.forEach((p, i) => {
    setOrigin(p, cls);
    p.style.setProperty("--d", `${delayFn(p, i)}ms`);
    p.classList.add(cls);
  });
}

// Lines and bands draw themselves along their length
function draw(nodes, delayFn) {
  nodes.forEach((p, i) => {
    const len = Math.ceil(p.getTotalLength ? p.getTotalLength() : 1000);
    p.style.setProperty("--len", len);
    p.style.strokeDasharray = `${len} ${len}`;
    p.style.setProperty("--d", `${delayFn(i)}ms`);
    p.classList.add("draw");
  });
}

// Delay by horizontal position, so marks sweep in from left (west) to right (east)
function sweep(nodes, cls, span) {
  const boxes = [...nodes].map((p) => [p, p.getBBox ? p.getBBox() : { x: 0 }]);
  const xs = boxes.map(([, b]) => b.x);
  const lo = Math.min(...xs), hi = Math.max(...xs);
  boxes.forEach(([p, b]) => {
    setOrigin(p, cls);
    p.style.setProperty("--d", `${Math.round(((b.x - lo) / Math.max(hi - lo, 1)) * span)}ms`);
    p.classList.add(cls);
  });
}

function animate(el) {
  if (el.dataset.animated) return;
  el.dataset.animated = "1";
  const card = el.closest(".card");
  const svg = el.querySelector("svg");
  if (!REDUCED && svg && ANIMS[el.dataset.anim]) ANIMS[el.dataset.anim](svg);
  if (card) card.classList.remove("anim-wait");
  setTimeout(() => {
    el.querySelectorAll("svg .role-mark > *").forEach((p) => {
      p.classList.remove("pop", "rise", "grow-x", "grow-y", "fade", "draw");
      ["--d", "--len"].forEach((v) => p.style.removeProperty(v));
      p.style.strokeDasharray = p.style.transformOrigin = p.style.transformBox = "";
    });
  }, 3200);
}

// ---------- Scroll reveals ----------
const io = !HAS_IO ? null : new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add("in");
    if (entry.target.classList.contains("card")) {
      entry.target.dataset.seen = "1";
      const vis = entry.target.querySelector(".vis");
      if (vis && vis.dataset.ready === "1") setTimeout(() => animate(vis), REDUCED ? 0 : 250);
    }
    io.unobserve(entry.target);
  });
}, { threshold: 0.18 });
document.querySelectorAll(".reveal").forEach((el) => {
  if (io) io.observe(el);
  else { el.classList.add("in"); el.dataset.seen = "1"; }
});

// ---------- Pause the ambient scenery while it is off screen ----------
if (HAS_IO && !REDUCED) {
  const scenery = new IntersectionObserver((entries) => {
    entries.forEach((entry) => entry.target.classList.toggle("paused", !entry.isIntersecting));
  });
  document.querySelectorAll(".hero, .hill-edge, .dusk-top, .dusk").forEach((el) => scenery.observe(el));
}

// ---------- Headline numbers rise in and count up once, when they scroll into view ----------
function countUp(el) {
  const target = Number(el.dataset.count);
  const suffix = el.dataset.suffix || "";
  const fmt = (v) => (el.dataset.format === "comma" ? Math.round(v).toLocaleString("en-AU") : Math.round(v)) + suffix;
  if (REDUCED) { el.textContent = fmt(target); return; }
  el.textContent = fmt(0);
  const start = performance.now() + 300, dur = 1400;
  const step = (now) => {
    const t = Math.max(0, Math.min((now - start) / dur, 1));
    el.textContent = fmt(target * (1 - Math.pow(1 - t, 3)));
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
const kpis = document.querySelector(".kpis");
function showKpis() {
  kpis.classList.add("in");
  kpis.querySelectorAll(".kpi-num[data-count]").forEach(countUp);
}
if (kpis && HAS_IO) {
  const kpiWatch = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) { kpiWatch.disconnect(); showKpis(); }
  }, { threshold: 0.35 });
  kpiWatch.observe(kpis);
} else if (kpis) {
  showKpis();
}

// ---------- In-page links glide to their section without adding #section to the address ----------
// (a #section left in the address would make the browser jump there on every reload)
document.querySelectorAll('a[href^="#"]:not(.skip)').forEach((a) => {
  a.addEventListener("click", (e) => {
    const target = document.querySelector(a.getAttribute("href"));
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: REDUCED ? "auto" : "smooth", block: "start" });
  });
});
if (window.openedWithHash) {
  scrollTo({ top: 0, behavior: "instant" });
  addEventListener("load", () => scrollTo({ top: 0, behavior: "instant" }), { once: true });
}

// ---------- Reading progress and active section ----------
const bar = document.getElementById("progress");
const links = [...document.querySelectorAll(".topbar nav a")];
const sections = links.map((a) => document.querySelector(a.getAttribute("href")));
let ticking = false;
let lastCurrent = null;
function onScroll() {
  ticking = false;
  const h = document.documentElement;
  const p = h.scrollTop / Math.max(h.scrollHeight - h.clientHeight, 1);
  bar.style.transform = `scaleX(${p.toFixed(4)})`;
  let current = -1;
  sections.forEach((s, i) => { if (s && s.getBoundingClientRect().top < 140) current = i; });
  // Only touch the nav when the active section changes, so scrolling causes no style work
  if (current === lastCurrent) return;
  lastCurrent = current;
  links.forEach((a, i) => {
    a.classList.toggle("active", i === current);
    if (i === current) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
  });
}
document.addEventListener("scroll", () => {
  if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
}, { passive: true });
onScroll();
