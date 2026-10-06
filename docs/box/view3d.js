// The assembled box in 3D, from the same pieces as the cut files: each piece's 2D outline is extruded by the
// sheet thickness and put back in its place. World coordinates are the Python model's (x across the front,
// y going back, z up, mm). The viewer is a guided tour: each stop moves the camera, fades the walls in the
// way and lights up what it's about.

import * as THREE from "./vendor/three.js";
import { pieces, standins, dims, SIZE } from "./box.js";

const { W, H, D } = SIZE;
const WOOD = {
  front: 0xe9c9a0, back: 0xd9b68a, left: 0xe2bf93, right: 0xe2bf93, top: 0xedd0a8,
  bottom: 0xd4ae80, deck: 0xcfa676, ipad_holder: 0xc29462, lock_bar: 0xb98a58,
};
const THINGS = { printer: 0xf2f2f2, labels: 0xffffff, macbook: 0xb8bcc2, ipad: 0x2b2b2e, paper: 0xffffff };
const ACCENT = new THREE.Color(0xff6fa3);
const AXIS = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) };
const LABEL_W = 101.6, LABEL_OUT = 70; // a 4 in label, and how far it sticks out of the slot

// Model coordinates to the viewer's (y up, front facing the camera, box centred).
const view = (x, y, z) => new THREE.Vector3(x - W / 2, z - H / 2, D / 2 - y);

export function tour(T) {
  const d = dims(T), slotZ = (d.SLOT_Z0 + d.SLOT_Z1) / 2;
  return [
    {
      title: "The box",
      text: "The whole booth lives in here. Guests only see the iPad and the slot the photo comes out of.",
      target: view(W / 2, D / 2, H / 2), offset: [-520, 360, 760],
    },
    {
      title: "The iPad",
      text: "The iPad stands on the shelf (the deck), screen against the window in the front. The plate behind it holds it in place, and its charging cable goes straight down through a notch in the shelf.",
      target: view(d.IPAD_CX, 10, d.IPAD_CZ), offset: [-400, 210, 660],
      light: ["ipad", "ipad_holder"], ghost: ["front", "top", "left"],
    },
    {
      title: "The printer",
      text: "The printer sits on the shelf on the right, pushed right up behind the front.",
      target: view(d.PRINTER_CX, 45, d.DECK_TOP + 45), offset: [440, 380, 640],
      light: ["printer"], ghost: ["front", "top", "right"],
    },
    {
      title: "The print slot",
      text: "Photos come out through this slot. It's tall on purpose, so the label finds its way out wherever it leaves the printer.",
      target: view(d.PRINTER_CX, 0, slotZ - 10), offset: [200, 440, 800],
      light: ["paper"], paper: true,
    },
    {
      title: "The paper",
      text: "The stack of 4 x 6 labels sits behind the printer on the shelf and feeds into the back of it.",
      target: view(d.PRINTER_CX, 150, d.DECK_TOP + 40), offset: [540, 500, -400],
      light: ["labels"], ghost: ["top", "right", "back"],
    },
    {
      title: "The MacBook",
      text: "The MacBook lies closed under the shelf. The printer cable goes down to it through the hole in the shelf.",
      target: view(W / 2, D / 2, 30), offset: [-500, 440, 660],
      light: ["macbook"], ghost: ["front", "top", "left", "right", "deck", "ipad_holder", "ipad"],
    },
    {
      title: "The back",
      text: "To get the MacBook out: pull the lock bar out by its heart, tip the back panel out, and slide the MacBook out the back.",
      target: view(W / 2, D, H / 2), offset: [-440, 240, -860],
      light: ["back", "lock_bar"], bar: true,
    },
  ];
}

function pieceMesh(piece, T, color) {
  const geom = new THREE.ExtrudeGeometry(piece.shape.map(([outer, ...holes]) => {
    const s = new THREE.Shape(outer.map(([u, v]) => new THREE.Vector2(u, v)));
    s.holes = holes.map(h => new THREE.Path(h.map(([u, v]) => new THREE.Vector2(u, v))));
    return s;
  }), { depth: T, bevelEnabled: false, curveSegments: 1 });
  // Local (u, v, thickness) to model axes.
  const [u, v, w] = piece.plane;
  const m = new THREE.Matrix4().makeBasis(AXIS[u], AXIS[v], AXIS[w]);
  m.setPosition(AXIS[w].clone().multiplyScalar(piece.slab[0]));
  geom.applyMatrix4(m);
  geom.computeVertexNormals();
  return geom;
}

function boxGeom([x0, x1, y0, y1, z0, z1]) {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return g;
}

function build(T) {
  // Returns the model and its parts by name, each {mesh, edges}.
  const d = dims(T), group = new THREE.Group(), parts = {};
  const add = (name, geom, color, edgesToo) => {
    const mesh = new THREE.Mesh(geom, new THREE.MeshStandardMaterial({ color, roughness: 0.8, side: THREE.DoubleSide }));
    const edges = edgesToo ? new THREE.LineSegments(new THREE.EdgesGeometry(geom, 30),
      new THREE.LineBasicMaterial({ color: 0x3a2a47, transparent: true, opacity: 0.35 })) : null;
    group.add(mesh);
    if (edges) group.add(edges);
    parts[name] = { mesh, edges };
  };
  for (const [name, piece] of Object.entries(pieces(T))) add(name, pieceMesh(piece, T, WOOD[name]), WOOD[name], true);
  for (const [name, box] of Object.entries(standins(T))) add(name, boxGeom(box), THINGS[name], false);
  // A printed label, from the printer's front out through the slot. Its length is animated.
  const z = d.DECK_TOP + 55;
  add("paper", boxGeom([d.PRINTER_CX - LABEL_W / 2, d.PRINTER_CX + LABEL_W / 2, 0, 1, z, z + 0.6]), THINGS.paper, false);
  parts.paper.mesh.visible = false;
  parts.paper.from = d.PRINTER_Y0;
  // Model is z up with y going back; show it y up, front facing the camera, centred.
  group.rotation.x = -Math.PI / 2;
  group.position.set(-W / 2, -H / 2, D / 2);
  return { group, parts };
}

export function makeViewer(canvas, T, onStep) {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 10, 5000);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd8c8a8, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(-300, 600, 500);
  scene.add(sun);
  const controls = new THREE.OrbitControls(camera, canvas);
  controls.enableDamping = true;

  let stops = tour(T), step = 0, model = build(T), started = performance.now();
  scene.add(model.group);
  const fly = { t: 1, fromPos: new THREE.Vector3(), toPos: new THREE.Vector3(), fromTarget: new THREE.Vector3(), toTarget: new THREE.Vector3() };

  function dress() {
    // Fade, light and show parts for the current stop.
    const s = stops[step], ghost = new Set(s.ghost ?? []), light = new Set(s.light ?? []);
    for (const [name, { mesh, edges }] of Object.entries(model.parts)) {
      const m = mesh.material, faded = ghost.has(name);
      m.transparent = faded;
      m.opacity = faded ? 0.12 : 1;
      m.depthWrite = !faded;
      m.emissive.set(light.has(name) ? ACCENT : 0x000000);
      m.emissiveIntensity = 0;
      if (edges) edges.material.opacity = faded ? 0.12 : 0.35;
    }
    model.parts.paper.mesh.visible = !!s.paper;
    started = performance.now();
  }

  function go(i, instant) {
    step = Math.max(0, Math.min(stops.length - 1, i));
    const s = stops[step];
    fly.fromPos.copy(camera.position);
    fly.fromTarget.copy(controls.target);
    fly.toTarget.copy(s.target);
    fly.toPos.copy(s.target).add(new THREE.Vector3(...s.offset));
    fly.t = instant || reduce ? 1 : 0;
    if (fly.t === 1) { camera.position.copy(fly.toPos); controls.target.copy(fly.toTarget); }
    dress();
    onStep?.(step, stops.length, s);
  }

  function animate(now) {
    if (fly.t < 1) {
      fly.t = Math.min(1, fly.t + 1 / 50);
      const e = 1 - (1 - fly.t) ** 3;
      camera.position.lerpVectors(fly.fromPos, fly.toPos, e);
      controls.target.lerpVectors(fly.fromTarget, fly.toTarget, e);
    }
    const s = stops[step], age = (now - started) / 1000;
    // Lit parts glow gently; the label slides out of the slot; the lock bar slides out and back.
    const glow = reduce ? 0.5 : 0.45 + 0.25 * Math.sin(age * 3);
    for (const name of s.light ?? []) if (model.parts[name]) model.parts[name].mesh.material.emissiveIntensity = glow;
    const paper = model.parts.paper;
    if (s.paper) {
      const p = reduce ? 1 : Math.min(1, (age % 4) / 2.5);
      const length = Math.max(0.01, (paper.from + LABEL_OUT) * p);
      paper.mesh.scale.y = length;
      paper.mesh.position.y = paper.from - length;
    }
    const bar = model.parts.lock_bar;
    const out = s.bar && !reduce ? 90 * Math.max(0, Math.sin(age * 1.2)) : 0;
    bar.mesh.position.x = out;
    bar.edges.position.x = out;
    controls.update();
    renderer.render(scene, camera);
  }

  function resize() {
    const { clientWidth: w, clientHeight: h } = canvas;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas);
  resize();
  go(0, true);
  renderer.setAnimationLoop(animate);

  return {
    next: () => go(step + 1),
    back: () => go(step - 1),
    update(t) {
      stops = tour(t);
      scene.remove(model.group);
      model.group.traverse(o => { o.geometry?.dispose(); o.material?.dispose(); });
      model = build(t);
      scene.add(model.group);
      dress();
    },
  };
}
