// Sewzy hero: a 3D thread spool that follows the pointer and unwinds as you scroll.
// One job only: the spool + its loose thread. Poster image stays underneath if WebGL/motion is unavailable.
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.min.js";

const host = document.querySelector("[data-spool]");
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
if (host && !reduce) {
  try { start(host); } catch (e) { /* poster stays */ }
}

function start(host) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power", preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  host.appendChild(renderer.domElement);
  host.classList.add("live");

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0.4, 9.5);

  scene.add(new THREE.HemisphereLight(0xfff6ea, 0x1f6f5f, 1.35));
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(4, 6, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(0xf27b67, 1.4); rim.position.set(-5, -2, -4); scene.add(rim);

  // wound-thread texture: fine diagonal grooves on coral
  const c = document.createElement("canvas"); c.width = 512; c.height = 256;
  const g = c.getContext("2d");
  g.fillStyle = "#F27B67"; g.fillRect(0, 0, 512, 256);
  for (let y = 0; y < 256; y += 5) {
    g.strokeStyle = y % 10 ? "rgba(255,255,255,.16)" : "rgba(120,30,20,.22)";
    g.lineWidth = 2; g.beginPath(); g.moveTo(0, y); g.lineTo(512, y + 14); g.stroke();
  }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(3, 2);

  const spool = new THREE.Group(); scene.add(spool);
  const threadMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75, metalness: 0.02 });
  const capMat = new THREE.MeshStandardMaterial({ color: 0x1f6f5f, roughness: 0.38, metalness: 0.08 });
  const core = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 2.3, 96, 1, true), threadMat);
  spool.add(core);
  // rounded caps via lathe
  const prof = [];
  for (let i = 0; i <= 12; i++) { const a = (i / 12) * Math.PI; prof.push(new THREE.Vector2(0.32 + 1.25 + Math.sin(a) * 0.14, -0.17 + (i / 12) * 0.34)); }
  prof.unshift(new THREE.Vector2(0.32, -0.17)); prof.push(new THREE.Vector2(0.32, 0.17));
  const capGeo = new THREE.LatheGeometry(prof, 96);
  const capTop = new THREE.Mesh(capGeo, capMat); capTop.position.y = 1.3; spool.add(capTop);
  const capBot = new THREE.Mesh(capGeo, capMat); capBot.position.y = -1.3; spool.add(capBot);
  const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 2.95, 32), new THREE.MeshStandardMaterial({ color: 0x0f3a32, roughness: 0.9 }));
  spool.add(hole);

  // loose thread: a tube from the spool surface that sways
  const threadColor = new THREE.MeshStandardMaterial({ color: 0xf27b67, roughness: 0.6 });
  const pts = Array.from({ length: 9 }, () => new THREE.Vector3());
  const curve = new THREE.CatmullRomCurve3(pts);
  let tube = null;
  const base = [[1.05, 0.2, 0.2], [1.6, -0.3, 0.6], [2.1, -1.2, 0.3], [2.3, -2.2, -0.2], [1.9, -3.1, 0.2], [2.5, -3.9, 0.5], [3.4, -4.4, 0.1], [4.4, -4.6, -0.3], [5.6, -4.9, 0]];
  function buildThread(t, extra) {
    base.forEach((b, i) => {
      const k = i / (base.length - 1);
      pts[i].set(b[0] + k * extra * 1.4, b[1] - k * extra * 0.6, b[2] + Math.sin(t * 1.3 + i * 0.9) * 0.18 * k);
    });
    if (tube) { tube.geometry.dispose(); spool.remove(tube); }
    tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 120, 0.035, 8, false), threadColor);
    spool.add(tube);
  }

  // needle
  const needle = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: 0xd9dde0, metalness: 0.95, roughness: 0.22 });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.4, 16), steel);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.35, 16), steel); tip.position.y = -1.37;
  const eye = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.018, 8, 24), steel); eye.position.y = 1.22;
  needle.add(shaft, tip, eye); needle.rotation.z = -0.75; needle.position.set(-2.2, 1.6, 0.4); scene.add(needle);

  spool.rotation.set(0.35, 0, -0.22);
  let tx = 0, ty = 0, px = 0, py = 0, scrollK = 0, visible = true, raf = 0, last = 0;
  const onMove = (e) => { const r = host.getBoundingClientRect(); tx = ((e.clientX - r.left) / r.width - 0.5) * 2; ty = ((e.clientY - r.top) / r.height - 0.5) * 2; };
  addEventListener("pointermove", onMove, { passive: true });
  const onScroll = () => { scrollK = Math.min(1, scrollY / (innerHeight * 1.2)); };
  addEventListener("scroll", onScroll, { passive: true });
  const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible && !raf) loop(performance.now()); }, { threshold: 0 });
  io.observe(host);
  document.addEventListener("visibilitychange", () => { if (!document.hidden && visible && !raf) loop(performance.now()); });

  function size() { const w = host.clientWidth, h = host.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  new ResizeObserver(size).observe(host); size();

  const t0 = performance.now();
  function loop(now) {
    if (!visible || document.hidden) { raf = 0; return; }
    raf = requestAnimationFrame(loop);
    if (now - last < 16) return; last = now;
    const t = (now - t0) / 1000;
    px += (tx - px) * 0.06; py += (ty - py) * 0.06;
    spool.rotation.y = t * 0.35 + px * 0.5 + scrollK * 3.2;
    spool.rotation.x = 0.35 + py * 0.18;
    spool.position.y = Math.sin(t * 0.9) * 0.08 + scrollK * 0.6;
    tex.offset.x = -scrollK * 1.5;
    needle.position.y = 1.6 + Math.sin(t * 1.1 + 1) * 0.12 - py * 0.15;
    needle.rotation.y = px * 0.3;
    if (Math.floor(t * 30) % 2 === 0) buildThread(t, scrollK * 2.2);
    renderer.render(scene, camera);
  }
  buildThread(0, 0); renderer.render(scene, camera); loop(performance.now());

  renderer.domElement.addEventListener("webglcontextlost", (e) => { e.preventDefault(); cancelAnimationFrame(raf); host.classList.remove("live"); renderer.domElement.remove(); });
  addEventListener("pagehide", () => {
    cancelAnimationFrame(raf); io.disconnect(); removeEventListener("pointermove", onMove); removeEventListener("scroll", onScroll);
    scene.traverse((o) => { o.geometry?.dispose(); o.material?.dispose?.(); }); tex.dispose(); renderer.dispose();
  });
}
