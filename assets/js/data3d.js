// Ashlyticss homepage — the data journey, rendered in WebGL.
// Scattered files float on the left; their data streams through pipes and a
// cleaning gate into a star-schema model, which builds a live dashboard that
// finally lands on a laptop and a phone. At the top it plays on a clock;
// scrolling then moves the camera step by step while the page explains each.
import * as THREE from "three";

const C = {
  ink: 0x04080f,
  box: 0x0c1a2e,
  sky: 0x38bdf8,
  sky2: 0x7dd3fc,
  deep: 0x0e7490,
  warm: 0xfb923c,
  red: 0xf87171,
  violet: 0xa78bfa,
};
// where each step sits along the line
const SRC_X = -22, GATE_X = -8, MODEL_X = 5, DASH_X = 19, DECIDE_X = 31;
const STAGE = { hero: 0, today: 1, connect: 2, clean: 3, model: 4, dash: 5, decide: 6, outro: 7 };

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const smooth = (t) => t * t * (3 - 2 * t);
const clamp01 = (t) => Math.min(1, Math.max(0, t));
const mod = (a, n) => ((a % n) + n) % n;

function fontsReady() {
  if (!document.fonts || !document.fonts.load) return Promise.resolve();
  return Promise.race([
    Promise.all([
      document.fonts.load('500 40px "IBM Plex Mono"'),
      document.fonts.load('400 40px "IBM Plex Mono"'),
      document.fonts.load('600 40px "Unbounded"'),
      document.fonts.load('500 40px "Inter"'),
    ]),
    new Promise((r) => setTimeout(r, 2500)),
  ]).catch(() => {});
}
// hand control back to the browser between build steps, so startup never
// blocks scrolling or input for long
const breathe = () => new Promise((r) => setTimeout(r, 0));
function whenIdle() {
  return new Promise((r) => {
    const go = () => ("requestIdleCallback" in window ? requestIdleCallback(() => r(), { timeout: 1200 }) : setTimeout(r, 200));
    if (document.readyState === "complete") go(); else addEventListener("load", go, { once: true });
  });
}

function canvasTexture(w, h, draw, renderer) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return tex;
}
function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
const MONO = '"IBM Plex Mono", monospace', DISPLAY = '"Unbounded", sans-serif', SANS = '"Inter", sans-serif';

// ---------------------------------------------------------------------------
// The scattered files of "today" — one texture each, drawn once
function drawSource(kind, g, w, h) {
  const pad = 22;
  const sheet = (bar, title, rows, cols, opts = {}) => {
    g.fillStyle = opts.bg || "#f7f9fb"; roundRect(g, 0, 0, w, h, 14); g.fill();
    g.fillStyle = bar; roundRect(g, 0, 0, w, 58, 14); g.fill(); g.fillRect(0, 40, w, 18);
    g.fillStyle = "#fff"; g.font = `500 24px ${MONO}`; g.fillText(title, pad, 38);
    g.font = `400 19px ${MONO}`;
    const cw = (w - pad * 2) / cols.length;
    g.fillStyle = "#6b7a8a"; cols.forEach((c, i) => g.fillText(c, pad + i * cw, 92));
    g.strokeStyle = "#d9e1e8"; g.lineWidth = 1.5;
    rows.forEach((r, ri) => {
      const y = 112 + ri * 36;
      g.beginPath(); g.moveTo(pad, y - 26); g.lineTo(w - pad, y - 26); g.stroke();
      r.forEach((v, i) => {
        const bad = typeof v === "object";
        if (bad) { g.fillStyle = v.bg || "rgba(248,113,113,0.18)"; g.fillRect(pad + i * cw - 6, y - 24, cw - 4, 32); }
        g.fillStyle = bad ? (v.fg || "#c2410c") : "#24313f";
        g.fillText(bad ? v.t : v, pad + i * cw, y);
      });
    });
  };
  if (kind === "excel") {
    sheet("#1f7a4a", "sales_2026_FINAL_v3.xlsx", [
      ["North", "4,21,300", "12"], ["West", "3,88,950", "9"], ["west ", { t: "#REF!" }, "9"],
      ["South", "", { t: "??" }], ["East", "2,10,400", "7"], ["North", "4,21,300", "12"],
    ], ["Region", "Revenue", "Orders"]);
  } else if (kind === "sheet") {
    sheet("#15803d", "Leads (shared sheet)", [
      ["Patel Traders", "Called", "12/9"], ["PATEL TRADERS", "", "12-09"], ["Shree Ambica", "Quote", "Sept 14"],
      ["Mehta & Co", "??", ""], ["Patel Traders Pvt", "Won", "16/9/26"],
    ], ["Company", "Status", "Date"]);
  } else if (kind === "ads") {
    sheet("#1d4ed8", "Ads · campaign report", [
      ["Diwali_Reels", "₹42,180", "61"], ["Search_brand", "₹18,900", "44"], ["Retarget_7d", "₹9,450", "12"],
      ["Diwali_Reels", "₹42,180", "61"], ["Test_new", "₹3,200", { t: "0" }],
    ], ["Campaign", "Spend", "Purch."]);
  } else if (kind === "ledger") {
    sheet("#a16207", "Ledger — Sales A/c", [
      ["01-Sep", "By Cash", "18,400"], ["03-Sep", "By Bank", "2,10,000"], ["05-Sep", "Patel Tr.", "Dr 64,200"],
      ["07-Sep", "Journal", { t: "unposted", bg: "rgba(251,146,60,0.2)", fg: "#9a3412" }], ["09-Sep", "By Bank", "88,750"],
    ], ["Date", "Particulars", "Amount"], { bg: "#fffaf0" });
  } else if (kind === "orders") {
    sheet("#334155", "Orders · online store", [
      ["#1042", "Paid", "₹2,340"], ["#1043", "Pending", "₹980"], ["#1044", "Paid", "₹5,120"],
      ["#1044", "Paid", "₹5,120"], ["#1045", "Refund", "-₹980"],
    ], ["Order", "Status", "Total"]);
  } else if (kind === "csv" || kind === "crm") {
    g.fillStyle = "#101b2c"; roundRect(g, 0, 0, w, h, 14); g.fill();
    g.strokeStyle = "rgba(125,211,252,0.35)"; g.lineWidth = 2; roundRect(g, 1, 1, w - 2, h - 2, 14); g.stroke();
    g.fillStyle = "#7dd3fc"; g.font = `500 22px ${MONO}`;
    g.fillText(kind === "csv" ? "meta_ads_export (3).csv" : "contacts_export.csv", pad, 42);
    g.font = `400 19px ${MONO}`; g.fillStyle = "#b8cbe0";
    const lines = kind === "csv"
      ? ["campaign,spend,clicks,purch", "Diwali_Reels,42180,3412,61", "Lookalike_2,,1890,", "Diwali_Reels,42180,3412,61", "Story_ads,12040,980,17", "TOTAL,=SUM(B2:B6)"]
      : ["name,phone,city,source", "Rakesh M,98250xxxxx,Ahd,Expo", "rakesh m.,+91 98250xxxxx,AHMEDABAD,", "Anita S,,Surat,Web", "N/A,N/A,N/A,N/A", "Vikram,9909xxxxxx,Vadodara,Ref"];
    lines.forEach((l, i) => { g.fillStyle = /N\/A|,,|=SUM|rakesh m/.test(l) ? "#fb923c" : "#b8cbe0"; g.fillText(l, pad, 86 + i * 38); });
  } else if (kind === "chat") {
    g.fillStyle = "#0b141a"; roundRect(g, 0, 0, w, h, 14); g.fill();
    g.fillStyle = "#1f2c34"; roundRect(g, 0, 0, w, 58, 14); g.fill(); g.fillRect(0, 40, w, 18);
    g.fillStyle = "#e9edef"; g.font = `600 22px ${SANS}`; g.fillText("Sales team", pad, 37);
    const bubble = (x, y, bw, lines, out) => {
      g.fillStyle = out ? "#005c4b" : "#202c33"; roundRect(g, x, y, bw, 28 + lines.length * 30, 12); g.fill();
      g.fillStyle = "#e9edef"; g.font = `400 20px ${SANS}`;
      lines.forEach((t, i) => g.fillText(t, x + 16, y + 34 + i * 30));
    };
    bubble(pad, 80, 400, ["Can someone send me this", "month's sales numbers? 🙏"], false);
    bubble(w - pad - 330, 182, 330, ["will send by evening"], true);
    bubble(pad, 252, 300, ["which file is latest??"], false);
  }
}
const SOURCES = [
  { kind: "excel", p: [-25.5, 5.4, -1.8], r: [0.05, 0.38, 0.06] },
  { kind: "chat", p: [-19.6, 6.1, -2.6], r: [0.02, 0.22, -0.05] },
  { kind: "csv", p: [-27.2, 2.9, 1.2], r: [-0.04, 0.52, -0.07] },
  { kind: "sheet", p: [-21.8, 3.4, 0.9], r: [0.06, 0.3, 0.04] },
  { kind: "ads", p: [-18.2, 3.0, 2.6], r: [-0.05, 0.16, 0.08] },
  { kind: "ledger", p: [-24.0, 1.7, 3.4], r: [-0.12, 0.42, -0.03] },
  { kind: "crm", p: [-17.4, 5.2, -0.4], r: [0.04, 0.12, -0.06] },
  { kind: "orders", p: [-23.2, 6.9, 1.6], r: [0.08, 0.34, 0.05] },
];

function labelTexture(num, name, renderer) {
  return canvasTexture(1024, 256, (g) => {
    g.font = `500 64px ${MONO}`; g.fillStyle = "#38bdf8"; g.fillText(num, 8, 80);
    g.fillStyle = "rgba(56,189,248,0.45)"; g.fillRect(124, 52, 70, 4);
    g.font = `500 92px ${MONO}`; g.fillStyle = "#e6f4ff"; g.fillText(name, 4, 196);
  }, renderer);
}
function tagTexture(text, sub, renderer) {
  return canvasTexture(512, 160, (g, w, h) => {
    g.fillStyle = "rgba(7,18,34,0.92)"; roundRect(g, 4, 4, w - 8, h - 8, 22); g.fill();
    g.strokeStyle = "rgba(56,189,248,0.6)"; g.lineWidth = 3; roundRect(g, 4, 4, w - 8, h - 8, 22); g.stroke();
    g.textAlign = "center"; g.fillStyle = "#e6f4ff"; g.font = `600 46px ${DISPLAY}`; g.fillText(text, w / 2, sub ? 76 : 96);
    if (sub) { g.font = `400 26px ${MONO}`; g.fillStyle = "#7dd3fc"; g.fillText(sub, w / 2, 122); }
  }, renderer);
}
function glowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.25, "rgba(255,255,255,0.75)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

// ---------------------------------------------------------------------------
// The sample dashboard: panel 10 × 6 world units, drawn at 160 px per unit
const PW = 10, PH = 6, PX = 160;
const BARS = [0.42, 0.55, 0.48, 0.66, 0.6, 0.78, 0.71, 0.92];
const MONTHS = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov"];
const BAR_X0 = -4.3, BAR_X1 = -0.5, BAR_BASE = -2.35, BAR_MAX = 2.4;
const LINE_X0 = 0.5, LINE_X1 = 4.4, LINE_Y0 = -2.35, LINE_Y1 = 0.25;
const LINE = [0.18, 0.3, 0.26, 0.42, 0.38, 0.55, 0.5, 0.64, 0.6, 0.74, 0.7, 0.86];
const tx = (x) => (x + PW / 2) * PX, ty = (y) => (PH / 2 - y) * PX;
function drawPanel(g, w, h) {
  g.fillStyle = "#071222"; roundRect(g, 0, 0, w, h, 34); g.fill();
  g.strokeStyle = "rgba(56,189,248,0.45)"; g.lineWidth = 4; roundRect(g, 2, 2, w - 4, h - 4, 34); g.stroke();
  g.fillStyle = "#e6f4ff"; g.font = `600 46px ${DISPLAY}`; g.fillText("Sales overview", 56, 92);
  g.font = `400 22px ${MONO}`; g.fillStyle = "#62809c"; g.textAlign = "right";
  g.fillText("SAMPLE DASHBOARD · ILLUSTRATIVE DATA", w - 56, h - 28); g.textAlign = "left";
  ["This quarter", "All regions", "All channels"].forEach((t, i) => {
    const x = w - 56 - (3 - i) * 200 + 18;
    g.strokeStyle = "rgba(125,211,252,0.35)"; g.lineWidth = 2; roundRect(g, x, 60, 182, 44, 22); g.stroke();
    g.fillStyle = "#9cb6cf"; g.font = `400 21px ${SANS}`; g.fillText(t + " ▾", x + 20, 89);
  });
  g.font = `500 24px ${MONO}`; g.fillStyle = "#9cb6cf";
  g.fillText("REVENUE BY MONTH", tx(BAR_X0), ty(0.55));
  g.fillText("ORDERS TREND", tx(LINE_X0), ty(0.55));
  g.strokeStyle = "rgba(125,211,252,0.12)"; g.lineWidth = 2;
  for (let k = 0; k <= 4; k++) {
    const yb = ty(BAR_BASE + (BAR_MAX * k) / 4);
    g.beginPath(); g.moveTo(tx(BAR_X0), yb); g.lineTo(tx(BAR_X1), yb); g.stroke();
    const yl = ty(LINE_Y0 + ((LINE_Y1 - LINE_Y0) * k) / 4);
    g.beginPath(); g.moveTo(tx(LINE_X0), yl); g.lineTo(tx(LINE_X1), yl); g.stroke();
  }
  g.font = `400 20px ${MONO}`; g.fillStyle = "#62809c"; g.textAlign = "center";
  const step = (BAR_X1 - BAR_X0) / BARS.length;
  MONTHS.forEach((m, i) => g.fillText(m, tx(BAR_X0 + step * (i + 0.5)), ty(BAR_BASE) + 34));
  g.textAlign = "left";
}
// the finished dashboard as one flat image, for the laptop screen
function drawPanelFull(g, w, h) {
  drawPanel(g, w, h);
  KPIS.forEach((k, i) => {
    const cx = tx(-3.55 + i * 2.37), cy = ty(1.7), kw = 2.15 * PX, kh = 0.975 * PX;
    g.fillStyle = "#0c1a2e"; roundRect(g, cx - kw / 2, cy - kh / 2, kw, kh, 16); g.fill();
    g.strokeStyle = "rgba(56,189,248,0.4)"; g.lineWidth = 2; roundRect(g, cx - kw / 2, cy - kh / 2, kw, kh, 16); g.stroke();
    g.font = `500 18px ${MONO}`; g.fillStyle = "#9cb6cf"; g.fillText(k[0], cx - kw / 2 + 20, cy - 26);
    g.font = `600 44px ${DISPLAY}`; g.fillStyle = "#f0f8ff"; g.fillText(k[1], cx - kw / 2 + 18, cy + 22);
    g.font = `500 17px ${MONO}`; g.fillStyle = k[3]; g.fillText(k[2], cx - kw / 2 + 20, cy + 56);
  });
  const step = (BAR_X1 - BAR_X0) / BARS.length;
  g.fillStyle = "#38bdf8";
  BARS.forEach((b, i) => { const x0 = tx(BAR_X0 + step * (i + 0.19)), bw = step * 0.62 * PX, top = ty(BAR_BASE + b * BAR_MAX); g.fillRect(x0, top, bw, ty(BAR_BASE) - top); });
  g.strokeStyle = "#7dd3fc"; g.lineWidth = 5; g.beginPath();
  LINE.forEach((v, i) => { const x = tx(LINE_X0 + ((LINE_X1 - LINE_X0) * i) / (LINE.length - 1)), y = ty(LINE_Y0 + v * (LINE_Y1 - LINE_Y0)); i ? g.lineTo(x, y) : g.moveTo(x, y); });
  g.stroke();
}
const KPIS = [
  ["REVENUE", "₹4.8 Cr", "▲ 12% vs last qtr", "#4ade80"],
  ["GROSS MARGIN", "31.4%", "▲ 2.1 pts", "#4ade80"],
  ["ORDERS", "12,480", "▲ 8%", "#4ade80"],
  ["REPEAT BUYERS", "38%", "▼ 1.2 pts", "#fb923c"],
];
function kpiTexture(k, renderer) {
  return canvasTexture(512, 232, (g, w, h) => {
    g.fillStyle = "#0c1a2e"; roundRect(g, 4, 4, w - 8, h - 8, 24); g.fill();
    g.strokeStyle = "rgba(56,189,248,0.4)"; g.lineWidth = 3; roundRect(g, 4, 4, w - 8, h - 8, 24); g.stroke();
    g.font = `500 26px ${MONO}`; g.fillStyle = "#9cb6cf"; g.fillText(k[0], 34, 58);
    g.font = `600 66px ${DISPLAY}`; g.fillStyle = "#f0f8ff"; g.fillText(k[1], 30, 142);
    g.font = `500 26px ${MONO}`; g.fillStyle = k[3]; g.fillText(k[2], 34, 194);
  }, renderer);
}
function phoneTexture(renderer) {
  return canvasTexture(360, 720, (g, w, h) => {
    g.fillStyle = "#071222"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#e6f4ff"; g.font = `600 28px ${DISPLAY}`; g.fillText("Sales", 26, 76);
    g.font = `400 16px ${MONO}`; g.fillStyle = "#62809c"; g.fillText("SAMPLE DATA", 26, 104);
    KPIS.forEach((k, i) => {
      const y = 132 + i * 112;
      g.fillStyle = "#0c1a2e"; roundRect(g, 20, y, w - 40, 96, 16); g.fill();
      g.font = `500 16px ${MONO}`; g.fillStyle = "#9cb6cf"; g.fillText(k[0], 38, y + 32);
      g.font = `600 34px ${DISPLAY}`; g.fillStyle = "#f0f8ff"; g.fillText(k[1], 36, y + 76);
      g.font = `500 15px ${MONO}`; g.fillStyle = k[3]; g.textAlign = "right"; g.fillText(k[2].split(" vs")[0], w - 36, y + 76); g.textAlign = "left";
    });
    g.fillStyle = "#38bdf8";
    BARS.forEach((b, i) => { const bh = b * 120; g.fillRect(30 + i * 38, 690 - bh, 24, bh); });
  }, renderer);
}

// ---------------------------------------------------------------------------
async function main() {
  if (document.readyState === "loading") await new Promise((r) => addEventListener("DOMContentLoaded", r, { once: true }));
  const canvas = document.querySelector(".journey-canvas");
  const journey = document.querySelector("#journey");
  if (!canvas || !journey) return;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch (err) {
    document.documentElement.classList.add("no-webgl");
    return;
  }
  await Promise.all([fontsReady(), whenIdle()]);
  await breathe();

  const small = () => innerWidth < 901;
  const stacked = () => innerWidth < 1201;
  let mobile = small();
  let dpr = Math.min(devicePixelRatio || 1, 1.5);
  renderer.setPixelRatio(dpr);
  renderer.debug.checkShaderErrors = false;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(C.ink, 30, 80);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 220);
  let ready = false, visible = true, frameQueued = false, lastG = -1;
  let animating = true;
  const clock = new THREE.Clock();
  let halfRate = mobile, skip = false, acc = 0, sampleSum = 0, samples = 0;

  // ---- light and floor
  scene.add(new THREE.HemisphereLight(0xbfe8ff, 0x04080f, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.position.set(12, 22, 14);
  scene.add(key);
  const grid = new THREE.GridHelper(180, 90, 0x163a55, 0x0b1c2e);
  grid.material.transparent = true;
  grid.material.opacity = 0.7;
  // the grid's centre is often nearer the camera than the floating pieces, so
  // sorted by distance it would draw over them
  grid.renderOrder = -2;
  scene.add(grid);
  const glowTex = glowTexture();

  // faint "data dust" for depth: static, so it costs nothing per frame
  {
    const n = mobile ? 160 : 320, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = -34 + Math.random() * 74; pos[i * 3 + 1] = 0.5 + Math.random() * 12; pos[i * 3 + 2] = -14 + Math.random() * 20;
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const dust = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0x2b5d80, size: 0.09, map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    dust.renderOrder = -1;
    scene.add(dust);
  }
  await breathe();

  const edgeMat = new THREE.LineBasicMaterial({ color: C.sky, transparent: true, opacity: 0.75 });
  const boxMat = new THREE.MeshStandardMaterial({ color: C.box, emissive: 0x05101f, roughness: 0.55, metalness: 0.25 });
  function block(w, h, d) {
    const grp = new THREE.Group();
    const geo = new THREE.BoxGeometry(w, h, d);
    grp.add(new THREE.Mesh(geo, boxMat));
    grp.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat));
    return grp;
  }
  function sprite(tex, w, h) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
    return m;
  }
  const billboards = [];

  // ---- step labels above each station
  const LABELS = [["00", "SOURCES", SRC_X - 1, 9.4], ["01", "CONNECT", -14, 7.4], ["02", "CLEAN", GATE_X, 7.6], ["03", "MODEL", MODEL_X, 6.8], ["04", "DASHBOARD", DASH_X - 3.6, 9.2], ["05", "DECIDE", DECIDE_X, 6.4]];
  for (const [n, name, x, y] of LABELS) {
    const m = sprite(labelTexture(n + " —", name, renderer), 4.0, 1.0);
    m.position.set(x, y, 0);
    m.material.opacity = 0.9;
    scene.add(m);
    billboards.push(m);
    await breathe();
  }

  // ---- 00 sources: the scattered files
  const cardGeo = new THREE.PlaneGeometry(2.6, 1.72);
  const cards = [];
  for (const s of SOURCES) {
    const tex = canvasTexture(512, 340, (g, w, h) => drawSource(s.kind, g, w, h), renderer);
    const mesh = new THREE.Mesh(cardGeo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, toneMapped: false }));
    mesh.position.set(...s.p);
    mesh.rotation.set(...s.r);
    scene.add(mesh);
    cards.push({ mesh, base: new THREE.Vector3(...s.p), rot: s.r, seed: Math.random() * 10 });
    await breathe();
  }

  // ---- 01 connect: one pipe from each file, converging through the gate into the model
  const curves = SOURCES.map((s, i) => {
    const [x, y, z] = s.p;
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(x + 1.1, y - 0.4, z),
      new THREE.Vector3(-14.5, 3 + (y - 4) * 0.45, z * 0.7),
      new THREE.Vector3(GATE_X - 0.6, 3 + (i % 4 - 1.5) * 0.28, (Math.floor(i / 4) - 0.5) * 0.5),
      new THREE.Vector3(GATE_X + 3, 2.9, z * 0.08),
      new THREE.Vector3(MODEL_X - 1.6, 2.6, 0),
    ], false, "catmullrom", 0.4);
  });
  // a lookup table per pipe, so particles never call getPointAt per frame
  const LUT_N = 160;
  const luts = curves.map((c) => { const pts = c.getSpacedPoints(LUT_N); return pts; });
  const gateU = luts.map((pts) => { let k = 0; while (k < LUT_N && pts[k].x < GATE_X) k++; return k / LUT_N; });
  const pipeMat = new THREE.MeshBasicMaterial({ color: C.sky, transparent: true, opacity: 0.22, depthWrite: false });
  const pipes = curves.map((c) => {
    const m = new THREE.Mesh(new THREE.TubeGeometry(c, 90, 0.035, 6, false), pipeMat);
    scene.add(m);
    return m;
  });
  await breathe();

  // particles: messy and warm before the gate, clean and blue after it; a few
  // "bad rows" are stopped at the gate and drop away
  const PER = mobile ? 50 : 80, NP = PER * curves.length;
  const pPos = new Float32Array(NP * 3), pCol = new Float32Array(NP * 3);
  const pInfo = [];
  const warmCols = [new THREE.Color(C.warm), new THREE.Color(C.red), new THREE.Color(C.violet), new THREE.Color(0xfacc15)];
  for (let i = 0; i < NP; i++) {
    pInfo.push({
      c: i % curves.length, t0: Math.random(), spd: 0.8 + Math.random() * 0.4,
      bad: Math.random() < 0.09, jit: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(0.9),
      warm: warmCols[i % warmCols.length],
    });
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3).setUsage(THREE.DynamicDrawUsage));
  pGeo.setAttribute("color", new THREE.BufferAttribute(pCol, 3).setUsage(THREE.DynamicDrawUsage));
  const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({ size: mobile ? 0.26 : 0.2, map: glowTex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  particles.frustumCulled = false;
  scene.add(particles);
  const skyCol = new THREE.Color(C.sky2), tmpCol = new THREE.Color();
  await breathe();

  // ---- 02 clean: the gate
  const gate = new THREE.Group();
  gate.position.set(GATE_X, 3, 0);
  gate.rotation.y = Math.PI / 2;
  const ringMat = new THREE.MeshBasicMaterial({ color: C.sky, transparent: true, opacity: 0.9, toneMapped: false });
  gate.add(new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.07, 12, 96), ringMat));
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(2.62, 0.02, 8, 96), new THREE.MeshBasicMaterial({ color: C.sky2, transparent: true, opacity: 0.4 }));
  gate.add(ring2);
  const veilMat = new THREE.MeshBasicMaterial({ map: glowTex, color: C.sky, transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending });
  const veil = new THREE.Mesh(new THREE.CircleGeometry(2.3, 48), veilMat);
  gate.add(veil);
  scene.add(gate);
  const gateTag = sprite(tagTexture("Dedupe · validate", "BAD ROWS REMOVED", renderer), 2.6, 0.81);
  gateTag.position.set(GATE_X, 0.9, 1.8);
  scene.add(gateTag);
  billboards.push(gateTag);
  await breathe();

  // ---- 03 model: a star schema
  const fact = block(2.6, 1.0, 1.7);
  fact.position.set(MODEL_X, 2.6, 0);
  scene.add(fact);
  const factTag = sprite(tagTexture("Sales", "FACT TABLE", renderer), 2.2, 0.69);
  factTag.position.set(MODEL_X, 3.75, 0);
  scene.add(factTag); billboards.push(factTag);
  const DIMS = [["Date", 3.9, -2.4], ["Customer", 0.6, -3.9], ["Product", 0.6, 3.9], ["Region", 3.9, 2.4], ["Channel", -2.9, 3.4]];
  const dims = [], rels = [];
  const relMat = new THREE.LineBasicMaterial({ color: C.sky2, transparent: true, opacity: 0.8 });
  for (const [name, dx, dz] of DIMS) {
    const b = block(1.6, 0.7, 1.0);
    b.position.set(MODEL_X + dx, 2.6, dz);
    scene.add(b);
    const t = sprite(tagTexture(name, null, renderer), 1.6, 0.5);
    t.position.set(MODEL_X + dx, 3.35, dz);
    scene.add(t); billboards.push(t);
    const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(MODEL_X, 2.6, 0), new THREE.Vector3(MODEL_X + dx, 2.6, dz)]);
    const line = new THREE.Line(geo, relMat);
    scene.add(line);
    dims.push({ b, t }); rels.push(line);
    await breathe();
  }

  // beams from the model to the dashboard, with data riding them
  const beamCurves = [-0.6, 0, 0.6].map((o) => new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(MODEL_X + 1.3, 2.7 + o * 0.3, o), new THREE.Vector3((MODEL_X + DASH_X) / 2 - 2, 5.2 + o, o * 2), new THREE.Vector3(DASH_X - PW / 2 + 0.1, 3.2 + o * 1.2, 0)));
  const beamLuts = beamCurves.map((c) => c.getSpacedPoints(80));
  const beamMat = new THREE.LineBasicMaterial({ color: C.sky, transparent: true, opacity: 0.35 });
  beamCurves.forEach((c) => scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(c.getPoints(40)), beamMat)));
  const NB = mobile ? 36 : 60, bPos = new Float32Array(NB * 3);
  const bInfo = Array.from({ length: NB }, (_, i) => ({ c: i % 3, t0: Math.random() }));
  const bGeo = new THREE.BufferGeometry();
  bGeo.setAttribute("position", new THREE.BufferAttribute(bPos, 3).setUsage(THREE.DynamicDrawUsage));
  const beamPts = new THREE.Points(bGeo, new THREE.PointsMaterial({ color: C.sky2, size: mobile ? 0.24 : 0.18, map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  beamPts.frustumCulled = false;
  scene.add(beamPts);
  await breathe();

  // ---- 04 dashboard
  const dash = new THREE.Group();
  dash.position.set(DASH_X, 4.4, 0);
  scene.add(dash);
  const panelTex = canvasTexture(PW * PX, PH * PX, drawPanel, renderer);
  // opaque (corners cut by alphaTest): as a transparent sheet it would be sorted
  // against the KPI tiles in front of it and could draw over them
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), new THREE.MeshBasicMaterial({ map: panelTex, alphaTest: 0.5, toneMapped: false }));
  dash.add(panel);
  await breathe();
  const kpis = KPIS.map((k, i) => {
    const m = sprite(kpiTexture(k, renderer), 2.15, 0.975);
    m.position.set(-3.55 + i * 2.37, 1.7, 0.06);
    dash.add(m);
    return m;
  });
  await breathe();
  const barW = (BAR_X1 - BAR_X0) / BARS.length;
  const barGeo = new THREE.BoxGeometry(barW * 0.62, 1, 0.34);
  barGeo.translate(0, 0.5, 0.17);
  const barMat = new THREE.MeshStandardMaterial({ color: C.sky, emissive: 0x0a4a6e, roughness: 0.35, metalness: 0.2 });
  const bars = new THREE.InstancedMesh(barGeo, barMat, BARS.length);
  const m4 = new THREE.Matrix4(), v3 = new THREE.Vector3(), q4 = new THREE.Quaternion(), sc = new THREE.Vector3();
  dash.add(bars);
  const lineGeo = new THREE.BufferGeometry().setFromPoints(LINE.map((v, i) => new THREE.Vector3(LINE_X0 + ((LINE_X1 - LINE_X0) * i) / (LINE.length - 1), LINE_Y0 + v * (LINE_Y1 - LINE_Y0), 0.08)));
  const trend = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: C.sky2, linewidth: 2 }));
  dash.add(trend);
  const dotGeo = new THREE.SphereGeometry(0.07, 10, 8);
  const dots = new THREE.InstancedMesh(dotGeo, new THREE.MeshBasicMaterial({ color: 0xe0f2fe }), LINE.length);
  LINE.forEach((v, i) => { m4.makeTranslation(LINE_X0 + ((LINE_X1 - LINE_X0) * i) / (LINE.length - 1), LINE_Y0 + v * (LINE_Y1 - LINE_Y0), 0.08); dots.setMatrixAt(i, m4); });
  dash.add(dots);
  // soft glow behind the panel
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(PW * 1.5, PH * 1.6), new THREE.MeshBasicMaterial({ map: glowTex, color: C.deep, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.position.z = -0.3;
  dash.add(halo);
  await breathe();

  // ---- 05 decide: the dashboard on a laptop and a phone
  const decide = new THREE.Group();
  decide.position.set(DECIDE_X, 0, 0);
  scene.add(decide);
  const lapBase = block(3.4, 0.14, 2.3);
  lapBase.position.set(-0.6, 1.6, 0.4);
  decide.add(lapBase);
  const deskMat = new THREE.MeshStandardMaterial({ color: 0x0a1626, roughness: 0.8, metalness: 0.1 });
  const desk = new THREE.Mesh(new THREE.BoxGeometry(8, 0.18, 4.2), deskMat);
  desk.position.set(0.2, 1.44, 0.4);
  decide.add(desk);
  const lapScreen = new THREE.Group();
  lapScreen.position.set(-0.6, 1.67, -0.75);
  lapScreen.rotation.x = -0.22;
  decide.add(lapScreen);
  const lapFrame = block(3.4, 2.12, 0.08);
  lapFrame.position.y = 1.06;
  lapScreen.add(lapFrame);
  const lapMat = new THREE.MeshBasicMaterial({ map: canvasTexture(PW * PX, PH * PX, drawPanelFull, renderer), toneMapped: false, transparent: true, opacity: 0, fog: false });
  const lapDisp = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.92), lapMat);
  lapDisp.position.set(0, 1.06, 0.05);
  lapScreen.add(lapDisp);
  const phone = new THREE.Group();
  phone.position.set(2.5, 1.53, 0.9);
  phone.rotation.set(-1.25, 0, -0.32);
  decide.add(phone);
  phone.add(block(0.95, 1.9, 0.08));
  const phoneMat = new THREE.MeshBasicMaterial({ map: phoneTexture(renderer), toneMapped: false, transparent: true, opacity: 0, fog: false });
  const phoneDisp = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 1.7), phoneMat);
  phoneDisp.position.z = 0.05;
  phone.add(phoneDisp);
  await breathe();

  // ---- scroll → journey coordinate g (section index + progress at mid-screen)
  const sections = [...document.querySelectorAll("[data-ch]")].sort((a, b) => a.dataset.ch - b.dataset.ch);
  const LAST = sections.length - 1;
  let tops = [], heights = [];
  function measure() {
    const y = scrollY;
    tops = sections.map((s) => s.getBoundingClientRect().top + y);
    heights = sections.map((s) => s.offsetHeight || 1);
  }
  measure();
  let sy = scrollY;
  addEventListener("scroll", () => { sy = scrollY; requestFrame(); }, { passive: true });
  if ("ResizeObserver" in window) new ResizeObserver(() => { measure(); requestFrame(); }).observe(document.body);
  function journeyG() {
    const mid = sy + innerHeight / 2;
    for (let j = LAST; j >= 0; j--) if (mid >= tops[j]) return j + Math.min(1, (mid - tops[j]) / heights[j]);
    return 0.5 * Math.min(1, mid / Math.max(1, tops[0] + heights[0]));
  }

  // ---- camera keyframes, one per section, rebuilt per breakpoint
  let viewW = 1, viewH = 1;
  const KF = [];
  const kf = (pos, tgt, fov, ox, oy) => ({ pos: new THREE.Vector3(...pos), tgt: new THREE.Vector3(...tgt), fov, ox, oy });
  function layout() {
    mobile = small();
    viewW = canvas.clientWidth || innerWidth;
    viewH = canvas.clientHeight || innerHeight;
    renderer.setSize(viewW, viewH, false);
    camera.aspect = viewW / viewH;
    const back = Math.pow(Math.max(1, 1.6 / camera.aspect), 0.9);
    const side = stacked() ? -0.14 : -0.2;
    // a station shot: target t, camera offset o; phones pull back and raise the subject
    const shot = (t, o, fov, phone) => mobile
      ? phone ? kf(phone[0], t, phone[1], 0, 0.17) : kf([t[0] + o[0] * 0.75, t[1] + o[1] * 1.25, t[2] + o[2] * 1.45], t, fov + 8, 0, 0.17)
      : kf([t[0] + o[0], t[1] + o[1], t[2] + o[2]], t, fov, side, -0.02);
    KF.length = 0;
    // 0 · hero: the whole journey, beside (or below) the headline
    const H = mobile || stacked()
      ? kf([3 + 30 * back, 17 * back, 34 * back], [4, 3, 0], 30, 0, -0.22)
      : kf([4 + 52 * back, 20 * back, 33 * back], [3, 3, 0], 28, -0.22, -0.07);
    KF.push(H);
    KF.push(shot([SRC_X + 0.4, 4.2, 0.4], [6.5, 1.6, 11.5], 34));        // 1 · today
    KF.push(shot([-15, 3.6, 0], [8, 4.6, 13.5], 34));                    // 2 · connect
    KF.push(shot([GATE_X + 0.6, 3, 0], [6.5, 2.4, 9.5], 34));            // 3 · clean
    KF.push(shot([MODEL_X + 0.8, 2.4, 0], [8, 10, 13.5], 36));         // 4 · model
    KF.push(shot([DASH_X, 4.4, 0], [3.2, 1.2, 19.5], 30, [[DASH_X + 2, 7, 36], 38]));              // 5 · dashboard
    KF.push(shot([DECIDE_X + 0.4, 2.4, 0.4], [7, 5, 12], 32));      // 6 · decide
    KF.push(H);                                                          // 7 · outro
    // the pages after the journey hold the outro view (site.css dims it)
    while (KF.length < sections.length) KF.push(KF[KF.length - 1]);
    measure();
  }
  layout();

  // ---- pointer parallax (fine pointers only)
  const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  if (!reduce && matchMedia("(pointer: fine)").matches) {
    addEventListener("pointermove", (e) => {
      pointer.x = (e.clientX / innerWidth) * 2 - 1;
      pointer.y = (e.clientY / innerHeight) * 2 - 1;
      requestFrame();
    }, { passive: true });
  }

  // ---- per-frame state from the journey coordinate
  const camPos = new THREE.Vector3(), camTgt = new THREE.Vector3();
  let timePhase = 0, clockT = 0;
  function apply(g, dt) {
    const a = Math.max(0, g - 0.5);
    let j = Math.min(LAST - 1, Math.floor(a));
    let u = a - j;
    if (a >= LAST) { j = LAST - 1; u = 1; }
    const e = reduce ? (u < 0.5 ? 0 : 1) : smooth(clamp01((u - 0.22) / 0.56));
    const A = KF[j], B = KF[j + 1];
    pointer.sx += (pointer.x - pointer.sx) * 0.05;
    pointer.sy += (pointer.y - pointer.sy) * 0.05;
    camPos.lerpVectors(A.pos, B.pos, e);
    camTgt.lerpVectors(A.tgt, B.tgt, e);
    camera.position.set(camPos.x + pointer.sx * 0.8, camPos.y - pointer.sy * 0.45, camPos.z);
    camera.lookAt(camTgt);
    camera.fov = A.fov + (B.fov - A.fov) * e;
    camera.setViewOffset(viewW, viewH, viewW * (A.ox + (B.ox - A.ox) * e), viewH * (A.oy + (B.oy - A.oy) * e), viewW, viewH);
    camera.updateProjectionMatrix();
    const dist = camPos.distanceTo(camTgt);
    scene.fog.near = dist * 0.8;
    scene.fog.far = dist * 2.4;

    const inHero = g < 1;
    // the story's progress through each step (all "done" in the hero view)
    const step = (from, len) => (inHero ? 1 : smooth(clamp01((g - from) / len)));
    const connect = step(1.75, 0.7), model = step(3.75, 0.6), build = step(4.65, 0.75), handed = step(5.7, 0.6);
    const outro = clamp01(g - (STAGE.outro + 0.3));
    const done = Math.max(outro, 0);

    if (animating && !reduce) timePhase += dt * 0.11;
    clockT += dt;
    const phase = timePhase + g * 0.32;

    // files bob gently while the top of the page is on screen
    cards.forEach((c, i) => {
      const bob = reduce ? 0 : Math.sin(clockT * 0.9 + c.seed) * 0.12;
      c.mesh.position.set(c.base.x, c.base.y + bob, c.base.z);
      c.mesh.rotation.z = c.rot[2] + (reduce ? 0 : Math.sin(clockT * 0.6 + c.seed) * 0.03);
    });

    // pipes draw out of the files during "connect"
    const reveal = Math.max(connect, done);
    pipes.forEach((p) => { p.geometry.setDrawRange(0, Math.ceil(p.geometry.index.count * reveal / 3) * 3); });
    // particles along the pipes
    for (let i = 0; i < NP; i++) {
      const pi = pInfo[i], lut = luts[pi.c], gu = gateU[pi.c];
      const t = mod(pi.t0 + phase * pi.spd, 1);
      let k = t * LUT_N, k0 = Math.floor(k), f = k - k0;
      const p0 = lut[k0], p1 = lut[Math.min(LUT_N, k0 + 1)];
      let x = p0.x + (p1.x - p0.x) * f, y = p0.y + (p1.y - p0.y) * f, z = p0.z + (p1.z - p0.z) * f;
      let col;
      if (t > reveal) { pPos[i * 3 + 1] = -50; continue; }
      if (t < gu) {
        const mess = 1 - t / gu * 0.6;
        x += pi.jit.x * mess; y += pi.jit.y * mess; z += pi.jit.z * mess;
        col = pi.warm;
      } else if (pi.bad) {
        // a bad row: stopped at the gate, falls away and fades
        const fall = (t - gu) / (1 - gu);
        const gp = lut[Math.round(gu * LUT_N)];
        x = gp.x - 0.3; y = gp.y - fall * 3.2; z = gp.z + pi.jit.z;
        col = tmpCol.copy(warmCols[1]).multiplyScalar(Math.max(0, 1 - fall * 1.4));
      } else {
        col = tmpCol.copy(pi.warm).lerp(skyCol, clamp01((t - gu) * 14));
      }
      pPos[i * 3] = x; pPos[i * 3 + 1] = y; pPos[i * 3 + 2] = z;
      pCol[i * 3] = col.r; pCol[i * 3 + 1] = col.g; pCol[i * 3 + 2] = col.b;
    }
    pGeo.attributes.position.needsUpdate = true;
    pGeo.attributes.color.needsUpdate = true;

    // the gate brightens while you read "clean"
    const atClean = inHero ? 0.6 : Math.max(0, 1 - Math.abs(g - 3.5) / 0.9);
    ringMat.opacity = 0.5 + 0.5 * Math.max(atClean, reveal * 0.4);
    veilMat.opacity = 0.08 + 0.3 * atClean;
    ring2.rotation.z = clockT * 0.2;
    gateTag.material.opacity = Math.max(atClean, inHero ? 1 : 0.35);

    // the model's relationships light up
    relMat.opacity = 0.15 + 0.75 * Math.max(model, done);
    dims.forEach((d, i) => { const s = 0.6 + 0.4 * smooth(clamp01(Math.max(model, done) * 1.6 - i * 0.12)); d.b.scale.setScalar(s); });

    // data rides the beams into the dashboard once the model exists
    const beamOn = Math.max(model, done);
    for (let i = 0; i < NB; i++) {
      const bi = bInfo[i], t = mod(bi.t0 + phase * 1.4, 1), lut = beamLuts[bi.c];
      const p = lut[Math.floor(t * 80)];
      if (t > beamOn) { bPos[i * 3 + 1] = -50; continue; }
      bPos[i * 3] = p.x; bPos[i * 3 + 1] = p.y; bPos[i * 3 + 2] = p.z;
    }
    bGeo.attributes.position.needsUpdate = true;

    // the dashboard builds: KPIs pop in, bars grow, the trend line draws
    const b = Math.max(build, done);
    kpis.forEach((k, i) => { const s = smooth(clamp01(b * 1.8 - i * 0.18)); k.scale.setScalar(0.6 + 0.4 * s); k.material.opacity = s; });
    for (let i = 0; i < BARS.length; i++) {
      const s = smooth(clamp01(b * 1.6 - i * 0.07)), hgt = Math.max(0.02, BARS[i] * BAR_MAX * s);
      m4.compose(v3.set(BAR_X0 + barW * (i + 0.5), BAR_BASE, 0.02), q4, sc.set(1, hgt, 1));
      bars.setMatrixAt(i, m4);
    }
    bars.instanceMatrix.needsUpdate = true;
    const drawn = Math.max(2, Math.round(LINE.length * smooth(clamp01(b * 1.4 - 0.3))));
    lineGeo.setDrawRange(0, drawn);
    dots.count = drawn;
    halo.material.opacity = 0.15 + 0.3 * b;

    // screens light up on "decide"
    const h = Math.max(handed, done);
    lapMat.opacity = h; phoneMat.opacity = h;

    billboards.forEach((m) => m.quaternion.copy(camera.quaternion));
    return { inHero, live: !reduce && g < 3.95 };
  }

  // ---- first frame, then reveal
  apply(Math.min(journeyG(), STAGE.outro + 1), 0);
  if (renderer.compileAsync) { try { await renderer.compileAsync(scene, camera); } catch (e) {} }
  renderer.render(scene, camera);
  canvas.classList.add("ready");
  journey.classList.add("gl-ready");
  ready = true;
  new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; requestFrame(); }, { threshold: 0 }).observe(document.body);
  addEventListener("resize", () => { layout(); requestFrame(); });
  addEventListener("load", () => { measure(); requestFrame(); });

  // ---- rendering: continuous while data flows (hero → clean), otherwise only
  // when scroll or the pointer changed something. Phones render that flow at
  // 30fps; elsewhere slow frames first lower the resolution (to 0.75x), then
  // the frame rate.
  let renderedLast = false;
  function adapt(dt) {
    sampleSum += dt; samples++;
    if (samples < 45) return;
    const avg = sampleSum / samples;
    sampleSum = 0; samples = 0;
    if (avg <= 1 / 45) return;
    const floor = mobile ? 1 : 0.75;
    if (dpr > floor) { dpr = Math.max(floor, +(dpr - 0.25).toFixed(2)); renderer.setPixelRatio(dpr); layout(); }
    else if (!halfRate) halfRate = true;
  }
  function requestFrame() {
    if (!ready || frameQueued || !visible || document.hidden) return;
    frameQueued = true;
    requestAnimationFrame(tick);
  }
  function tick() {
    frameQueued = false;
    if (!visible || document.hidden) return;
    const dt = Math.min(0.05, clock.getDelta());
    // past the journey the view is fixed, so nothing changes to render
    const g = Math.min(journeyG(), STAGE.outro + 1);
    const pointerMoving = Math.abs(pointer.x - pointer.sx) + Math.abs(pointer.y - pointer.sy) > 0.002;
    if (!animating && !pointerMoving && Math.abs(g - lastG) < 1e-5) { renderedLast = false; return; }
    if (halfRate && animating) {
      acc += dt;
      skip = !skip;
      if (skip) { requestFrame(); return; }
    }
    const frameDt = halfRate && animating ? Math.min(0.1, acc) : dt;
    acc = 0;
    if (animating ? !halfRate : renderedLast) adapt(dt);
    renderedLast = true;
    lastG = g;
    const st = apply(g, frameDt);
    animating = st.live;
    renderer.render(scene, camera);
    if (animating || pointerMoving) requestFrame();
  }
  document.addEventListener("visibilitychange", () => { clock.getDelta(); requestFrame(); });
  requestFrame();
}

main().catch(() => { document.documentElement.classList.add("no-webgl"); });
