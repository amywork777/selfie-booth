// The assembled box in 3D, from the same pieces as the cut files: each piece's 2D outline is extruded by the
// sheet thickness and put back in its place. World coordinates are the Python model's (z up, mm).

import * as THREE from "./vendor/three.js";
import { pieces, standins, SIZE } from "./box.js";

const WOOD = {
  front: 0xe9c9a0, back: 0xd9b68a, left: 0xe2bf93, right: 0xe2bf93, top: 0xedd0a8,
  bottom: 0xd4ae80, deck: 0xcfa676, ipad_holder: 0xc29462, lock_bar: 0xb98a58,
};
const THINGS = { printer: 0xf2f2f2, labels: 0xffffff, macbook: 0xb8bcc2, ipad: 0x2b2b2e };
const AXIS = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) };

function pieceMesh(piece, T, color) {
  const geom = new THREE.ExtrudeGeometry(piece.shape.map(([outer, ...holes]) => {
    const s = new THREE.Shape(outer.map(([u, v]) => new THREE.Vector2(u, v)));
    s.holes = holes.map(h => new THREE.Path(h.map(([u, v]) => new THREE.Vector2(u, v))));
    return s;
  }), { depth: T, bevelEnabled: false, curveSegments: 1 });
  // Local (u, v, thickness) to world axes.
  const [u, v, w] = piece.plane;
  const m = new THREE.Matrix4().makeBasis(AXIS[u], AXIS[v], AXIS[w]);
  m.setPosition(AXIS[w].clone().multiplyScalar(piece.slab[0]));
  geom.applyMatrix4(m);
  geom.computeVertexNormals();
  const mesh = new THREE.Mesh(geom, new THREE.MeshStandardMaterial({ color, roughness: 0.85, side: THREE.DoubleSide }));
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geom, 30), new THREE.LineBasicMaterial({ color: 0x3a2a47, transparent: true, opacity: 0.35 }));
  return [mesh, edges];
}

function build(T) {
  const group = new THREE.Group();
  for (const [name, piece] of Object.entries(pieces(T))) group.add(...pieceMesh(piece, T, WOOD[name]));
  for (const [name, [x0, x1, y0, y1, z0, z1]] of Object.entries(standins(T))) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0),
      new THREE.MeshStandardMaterial({ color: THINGS[name], roughness: 0.6 }));
    mesh.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    group.add(mesh);
  }
  // Model is z up with y going back from the front; show it y up, front facing the camera.
  group.rotation.x = -Math.PI / 2;
  group.position.set(-SIZE.W / 2, -SIZE.H / 2, SIZE.D / 2);
  return group;
}

export function makeViewer(canvas, T) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 10, 5000);
  camera.position.set(-520, 360, 760);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd8c8a8, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(-300, 600, 500);
  scene.add(sun);
  const controls = new THREE.OrbitControls(camera, canvas);
  controls.enableDamping = true;
  let model = build(T);
  scene.add(model);

  function resize() {
    const { clientWidth: w, clientHeight: h } = canvas;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas);
  resize();
  renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });

  return {
    update(t) {
      scene.remove(model);
      model.traverse(o => { o.geometry?.dispose(); o.material?.dispose(); });
      model = build(t);
      scene.add(model);
    },
  };
}
