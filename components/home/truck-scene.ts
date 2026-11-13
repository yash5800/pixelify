import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/**
 * The floating tow-truck scene from the standalone hero mockup.
 *
 * Kept out of the React component so the effect body stays readable: this
 * module owns the renderer, the procedural track/air effects and all cleanup.
 * The only DOM it touches is the canvas and the stage wrapper it is given.
 */

export interface TruckSceneOptions {
  canvas: HTMLCanvasElement;
  stage: HTMLElement;
  modelUrl?: string;
  decoderPath?: string;
}

type SpeedField = {
  group: THREE.Group;
  items: THREE.Mesh[];
  range: number;
};

type Puff = {
  sprite: THREE.Sprite;
  life: number;
  maxLife: number;
  vel: THREE.Vector3;
};

type WheelFx = {
  wheel: THREE.Object3D;
  glow: THREE.Sprite;
  smear: THREE.Sprite;
  phase: number;
};

function disposeObject(root: THREE.Object3D) {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();

    const material = (obj as THREE.Mesh).material;
    if (!material) return;

    const materials = Array.isArray(material) ? material : [material];
    for (const entry of materials) {
      const map = (entry as THREE.MeshBasicMaterial).map;
      if (map) map.dispose();
      entry.dispose();
    }
  });
}

export function initTruckScene({
  canvas,
  stage,
  modelUrl = '/truck-hero/truck.glb',
  decoderPath = '/truck-hero/draco/',
}: TruckSceneOptions): () => void {
  let disposed = false;

  const reduceMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  const params = new URLSearchParams(window.location.search);
  const num = (key: string, fallback: number) => {
    const value = Number(params.get(key));
    return Number.isFinite(value) && params.has(key) ? value : fallback;
  };
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(29, 1, 0.1, 200);
  const baseCamera = new THREE.Vector3(
    num('cx', 10.6),
    num('cy', 6.4),
    num('cz', 17.5)
  );
  const lookAt = new THREE.Vector3(0, num('ly', 2.15), 0);
  camera.position.copy(baseCamera);
  camera.lookAt(lookAt);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = environment;
  if ('environmentIntensity' in scene) scene.environmentIntensity = 0.85;

  scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x151a12, 0.55));

  const key = new THREE.DirectionalLight(0xfff6e8, 3.35);
  key.position.set(9, 13, 10);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -11;
  key.shadow.camera.right = 11;
  key.shadow.camera.top = 11;
  key.shadow.camera.bottom = -11;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 55;
  key.shadow.bias = -0.0006;
  key.shadow.normalBias = 0.02;
  scene.add(key);

  const rim = new THREE.DirectionalLight(0x8bffb8, 4.2);
  rim.position.set(-11, 7, -7);
  scene.add(rim);

  const fill = new THREE.DirectionalLight(0x9ac8ff, 1.7);
  fill.position.set(-6, 2.5, 11);
  scene.add(fill);

  const front = new THREE.DirectionalLight(0xffd9b8, 1.35);
  front.position.set(-9, 8, 12);
  scene.add(front);

  const under = new THREE.PointLight(0xc9fb5a, 32, 18, 2);
  under.position.set(1.5, -1.2, 2.5);
  scene.add(under);

  // Soft landing glow behind the floating truck.
  function glowTexture() {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext('2d');
    if (!ctx) return new THREE.CanvasTexture(c);
    const g = ctx.createRadialGradient(128, 128, 4, 128, 128, 128);
    g.addColorStop(0, 'rgba(208,255,143,0.9)');
    g.addColorStop(0.28, 'rgba(150,255,110,0.32)');
    g.addColorStop(0.62, 'rgba(80,255,120,0.09)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  }

  const backGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture(),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.62,
    })
  );
  backGlow.position.set(0.4, 1.7, -5.5);
  backGlow.scale.set(18, 18, 1);
  scene.add(backGlow);

  // Thin holographic halo behind the truck — echoes the reference's tech ring.
  const halo = new THREE.Group();
  halo.position.set(0.4, 1.55, -4.7);
  const haloRing = new THREE.Mesh(
    new THREE.RingGeometry(6.55, 6.59, 180),
    new THREE.MeshBasicMaterial({
      color: 0xb8ff86,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  halo.add(haloRing);

  const haloInner = new THREE.Mesh(
    new THREE.RingGeometry(5.95, 5.97, 160),
    new THREE.MeshBasicMaterial({
      color: 0x7dff9e,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  halo.add(haloInner);

  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    const dot = new THREE.Mesh(
      new THREE.PlaneGeometry(
        i % 4 === 0 ? 0.06 : 0.028,
        i % 4 === 0 ? 0.06 : 0.028
      ),
      new THREE.MeshBasicMaterial({
        color: 0xd8ffb6,
        transparent: true,
        opacity: i % 4 === 0 ? 0.7 : 0.3,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    dot.position.set(Math.cos(a) * 6.18, Math.sin(a) * 6.18, 0.01);
    halo.add(dot);
  }
  scene.add(halo);

  // Contact shadow.
  function shadowTexture() {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext('2d');
    if (!ctx) return new THREE.CanvasTexture(c);
    const g = ctx.createRadialGradient(128, 128, 2, 128, 128, 124);
    g.addColorStop(0, 'rgba(0,0,0,0.72)');
    g.addColorStop(0.5, 'rgba(0,0,0,0.3)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  }

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(13, 6.4),
    new THREE.MeshBasicMaterial({
      map: shadowTexture(),
      transparent: true,
      depthWrite: false,
      opacity: 0.9,
    })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -1.79;
  scene.add(shadow);

  const shadowCatcher = new THREE.Mesh(
    new THREE.CircleGeometry(8.6, 80),
    new THREE.ShadowMaterial({ color: 0x000000, opacity: 0.16 })
  );
  shadowCatcher.rotation.x = -Math.PI / 2;
  shadowCatcher.position.y = -1.8;
  shadowCatcher.receiveShadow = true;
  scene.add(shadowCatcher);

  // Landing rings.
  const rings = new THREE.Group();
  [5.1, 5.55, 6.8].forEach((r, i) => {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(r, r + (i === 2 ? 0.015 : 0.055), 160),
      new THREE.MeshBasicMaterial({
        color: i === 2 ? 0xb9ff75 : 0x7dff9e,
        transparent: true,
        opacity: i === 2 ? 0.1 : 0.26 - i * 0.035,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -1.79 + i * 0.002;
    rings.add(ring);
  });

  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    const tick = new THREE.Mesh(
      new THREE.PlaneGeometry(0.025, i % 3 === 0 ? 0.3 : 0.14),
      new THREE.MeshBasicMaterial({
        color: 0xc9fb5a,
        transparent: true,
        opacity: i % 3 === 0 ? 0.42 : 0.18,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    tick.position.set(Math.cos(a) * 6.8, -1.785, Math.sin(a) * 6.8);
    tick.rotation.x = -Math.PI / 2;
    tick.rotation.z = -a;
    rings.add(tick);
  }
  scene.add(rings);

  // Floating dust.
  const dustCount = 90;
  const dustPositions = new Float32Array(dustCount * 3);
  const dustSeed: number[] = [];
  for (let i = 0; i < dustCount; i++) {
    dustPositions[i * 3] = (Math.random() - 0.5) * 16;
    dustPositions[i * 3 + 1] = Math.random() * 7 - 1;
    dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 12;
    dustSeed.push(Math.random() * Math.PI * 2);
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  const dust = new THREE.Points(
    dustGeo,
    new THREE.PointsMaterial({
      color: 0xdfffae,
      size: 0.035,
      transparent: true,
      opacity: 0.66,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    })
  );
  scene.add(dust);

  // Truck.
  const truckPivot = new THREE.Group();
  const baseYaw = THREE.MathUtils.degToRad(num('yaw', 152));
  truckPivot.rotation.y = baseYaw;
  truckPivot.rotation.z = 0.025;
  truckPivot.position.y = 1.55;
  scene.add(truckPivot);

  // ——— Motion: a glowing light-track streaming beneath the hovering truck ———
  const travelDir = new THREE.Vector3(
    Math.sin(baseYaw),
    0,
    Math.cos(baseYaw)
  ).normalize();
  const TRACK_Y = 1.34;
  const TRACK_SPAN = 20;

  function streakTexture() {
    const c = document.createElement('canvas');
    c.width = 32;
    c.height = 256;
    const ctx = c.getContext('2d');
    if (!ctx) return new THREE.CanvasTexture(c);
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.3, 'rgba(255,255,255,0.9)');
    g.addColorStop(0.62, 'rgba(255,255,255,0.38)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 32, 256);
    return new THREE.CanvasTexture(c);
  }

  const streakMap = streakTexture();
  const streakGeo = new THREE.PlaneGeometry(1, 1);

  function makeStreakMats(tints: number[], opacities: number[]) {
    return tints.map(
      (color, i) =>
        new THREE.MeshBasicMaterial({
          map: streakMap,
          color,
          transparent: true,
          opacity: opacities[i],
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
        })
    );
  }

  const roadMats = makeStreakMats(
    [0xc9fb5a, 0x9dffd0, 0xe6ffc2],
    [0.34, 0.48, 0.64]
  );
  const airMats = makeStreakMats(
    [0xc9fb5a, 0x9dffd0, 0xd8ffbe],
    [0.05, 0.09, 0.13]
  );

  function buildSpeedField({
    count,
    mats,
    yMin,
    yMax,
    spread,
    range,
    lenMin,
    lenMax,
    widMin,
    widMax,
    speedMin,
    speedMax,
  }: {
    count: number;
    mats: THREE.MeshBasicMaterial[];
    yMin: number;
    yMax: number;
    spread: number;
    range: number;
    lenMin: number;
    lenMax: number;
    widMin: number;
    widMax: number;
    speedMin: number;
    speedMax: number;
  }): SpeedField {
    const group = new THREE.Group();
    group.rotation.y = baseYaw;
    const items: THREE.Mesh[] = [];
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(
        streakGeo,
        mats[Math.floor(Math.random() * mats.length)]
      );
      const len = lenMin + Math.random() * (lenMax - lenMin);
      const wid = widMin + Math.random() * (widMax - widMin);
      mesh.scale.set(wid, len, 1);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(
        (Math.random() * 2 - 1) * spread,
        yMin + Math.random() * (yMax - yMin),
        (Math.random() * 2 - 1) * range
      );
      mesh.userData.speed =
        speedMin + Math.random() * (speedMax - speedMin);
      group.add(mesh);
      items.push(mesh);
    }
    scene.add(group);
    return { group, items, range };
  }

  // Bright streaks skimming the deck, plus faint high-altitude airflow.
  const wheelField = buildSpeedField({
    count: 30,
    mats: roadMats,
    yMin: 1.29,
    yMax: 1.46,
    spread: 4.8,
    range: 13,
    lenMin: 1.4,
    lenMax: 4.2,
    widMin: 0.03,
    widMax: 0.075,
    speedMin: 6.5,
    speedMax: 13,
  });

  const airField = buildSpeedField({
    count: 20,
    mats: airMats,
    yMin: 1.95,
    yMax: 3.9,
    spread: 6.6,
    range: 15,
    lenMin: 2.2,
    lenMax: 6,
    widMin: 0.01,
    widMax: 0.022,
    speedMin: 3.8,
    speedMax: 8.6,
  });

  // ——— The light track itself ———
  // Wheel footprint centre in world space (front + rear axle midpoints).
  const TRACK_CENTER = new THREE.Vector3(-2.0, TRACK_Y, 3.85);
  wheelField.group.position.set(TRACK_CENTER.x, 0, TRACK_CENTER.z);
  airField.group.position.set(TRACK_CENTER.x, 0, TRACK_CENTER.z);

  const trackGroup = new THREE.Group();
  trackGroup.rotation.y = baseYaw;
  trackGroup.position.copy(TRACK_CENTER);
  scene.add(trackGroup);

  function trackBedTexture() {
    const W = 256;
    const H = 1024;
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const ctx = c.getContext('2d');
    if (!ctx) return new THREE.CanvasTexture(c);
    // A soft elliptical pool of light: no hard side walls or end caps.
    ctx.setTransform(1, 0, 0, H / W, W / 2, H / 2);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, W / 2);
    g.addColorStop(0, 'rgba(190,255,120,0.46)');
    g.addColorStop(0.42, 'rgba(190,255,120,0.24)');
    g.addColorStop(0.72, 'rgba(190,255,120,0.07)');
    g.addColorStop(1, 'rgba(190,255,120,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-W / 2, -W / 2, W, W);
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  const trackBed = new THREE.Mesh(
    new THREE.PlaneGeometry(5.0, TRACK_SPAN + 4),
    new THREE.MeshBasicMaterial({
      map: trackBedTexture(),
      color: 0xc9fb5a,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    })
  );
  trackBed.rotation.x = -Math.PI / 2;
  trackGroup.add(trackBed);

  function edgeLineTexture() {
    const c = document.createElement('canvas');
    c.width = 8;
    c.height = 256;
    const ctx = c.getContext('2d');
    if (!ctx) return new THREE.CanvasTexture(c);
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.24, 'rgba(255,255,255,1)');
    g.addColorStop(0.78, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 8, 256);
    return new THREE.CanvasTexture(c);
  }

  const edgeMat = new THREE.MeshBasicMaterial({
    map: edgeLineTexture(),
    color: 0xb9ff6e,
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });

  for (const x of [-1.72, 1.72]) {
    const line = new THREE.Mesh(
      new THREE.PlaneGeometry(0.06, TRACK_SPAN),
      edgeMat
    );
    line.rotation.x = -Math.PI / 2;
    line.position.set(x, 0.004, 0);
    trackGroup.add(line);
  }

  // Cross-rungs, like runway ticks, give the deck a readable surface.
  function rungTexture() {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 8;
    const ctx = c.getContext('2d');
    if (!ctx) return new THREE.CanvasTexture(c);
    const g = ctx.createLinearGradient(0, 0, 256, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.14, 'rgba(255,255,255,0.85)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.34)');
    g.addColorStop(0.86, 'rgba(255,255,255,0.85)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 8);
    return new THREE.CanvasTexture(c);
  }

  const rungGeo = new THREE.PlaneGeometry(4.1, 0.13);
  const rungMat = new THREE.MeshBasicMaterial({
    map: rungTexture(),
    color: 0xc4ff7a,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const rungs: THREE.Mesh[] = [];
  const rungStep = 1.35;
  for (let z = -TRACK_SPAN / 2; z < TRACK_SPAN / 2; z += rungStep) {
    const rung = new THREE.Mesh(rungGeo, rungMat.clone());
    rung.rotation.x = -Math.PI / 2;
    rung.position.set(0, 0.003, z);
    trackGroup.add(rung);
    rungs.push(rung);
  }

  // Centre dashes streaming toward the viewer.
  const dashGeo = new THREE.PlaneGeometry(0.3, 1.35);
  const dashStep = 2.2;
  const dashCount = Math.round(TRACK_SPAN / dashStep);
  const dashes: THREE.Mesh[] = [];
  for (let i = 0; i < dashCount; i++) {
    const mat = new THREE.MeshBasicMaterial({
      map: streakMap,
      color: 0xd9ff8a,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const dash = new THREE.Mesh(dashGeo, mat);
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(0, 0.006, -TRACK_SPAN / 2 + i * dashStep);
    trackGroup.add(dash);
    dashes.push(dash);
  }

  // ——— Air: soft camera-facing streaks rushing past the truck ———
  function windTexture() {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 16;
    const ctx = c.getContext('2d');
    if (!ctx) return new THREE.CanvasTexture(c);
    const g = ctx.createLinearGradient(0, 0, 128, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.28, 'rgba(255,255,255,0.85)');
    g.addColorStop(0.62, 'rgba(255,255,255,0.4)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 16);
    return new THREE.CanvasTexture(c);
  }

  const windTex = windTexture();
  const windGroup = new THREE.Group();
  windGroup.rotation.y = baseYaw;
  scene.add(windGroup);
  const windItems: THREE.Sprite[] = [];
  for (let i = 0; i < 14; i++) {
    const mat = new THREE.SpriteMaterial({
      map: windTex,
      color: i % 3 === 0 ? 0x9dffd0 : 0xd8ffb0,
      transparent: true,
      opacity: 0.06 + Math.random() * 0.14,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      rotation: -0.18,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(
      (Math.random() - 0.5) * 9,
      2.2 + Math.random() * 2.4,
      (Math.random() - 0.5) * 20
    );
    sprite.scale.set(2.6 + Math.random() * 3.6, 0.05 + Math.random() * 0.08, 1);
    sprite.userData.speed = 4.5 + Math.random() * 7;
    windGroup.add(sprite);
    windItems.push(sprite);
  }

  if (reduceMotion) {
    wheelField.group.visible = false;
    airField.group.visible = false;
    trackGroup.visible = false;
    windGroup.visible = false;
  }

  // Track markings roll backwards (+z) because local -z is the truck's nose.
  function driftSpeedField(field: SpeedField, dt: number, scale: number) {
    for (const mesh of field.items) {
      mesh.position.z += mesh.userData.speed * dt * scale;
      if (mesh.position.z > field.range) mesh.position.z -= field.range * 2;
    }
  }

  // ——— Tire dust ———
  function puffTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d');
    if (!ctx) return new THREE.CanvasTexture(c);
    const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
    g.addColorStop(0, 'rgba(226,255,198,0.9)');
    g.addColorStop(0.34, 'rgba(190,240,160,0.32)');
    g.addColorStop(1, 'rgba(150,200,120,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }

  const puffMap = puffTexture();
  const puffPool: Puff[] = [];
  const PUFF_COUNT = 22;
  for (let i = 0; i < PUFF_COUNT; i++) {
    const material = new THREE.SpriteMaterial({
      map: puffMap,
      color: 0xe6ffcf,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const sprite = new THREE.Sprite(material);
    sprite.visible = false;
    scene.add(sprite);
    puffPool.push({ sprite, life: 0, maxLife: 1, vel: new THREE.Vector3() });
  }
  let puffCursor = 0;
  let puffTimer = 0;

  const rearWheels: THREE.Object3D[] = [];
  const tireNodes: THREE.Object3D[] = [];
  const wheelWorld = new THREE.Vector3();

  // ——— Per-tire contact glow + skid smear ———
  function contactGlowTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d');
    if (!ctx) return new THREE.CanvasTexture(c);
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.26, 'rgba(255,255,255,0.55)');
    g.addColorStop(0.62, 'rgba(255,255,255,0.14)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }

  const glowMap = contactGlowTexture();
  const wheelFx: WheelFx[] = [];

  function buildWheelFx() {
    for (const wheel of tireNodes) {
      const glow = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowMap,
          color: 0xc8ff7a,
          transparent: true,
          opacity: 0.36,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      );
      glow.scale.set(1.1, 0.3, 1);
      scene.add(glow);

      const smear = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: streakMap,
          color: 0xc9fb5a,
          transparent: true,
          opacity: 0.34,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      );
      smear.scale.set(2.9, 0.055, 1);
      scene.add(smear);

      if (reduceMotion) {
        glow.visible = false;
        smear.visible = false;
      }
      wheelFx.push({
        wheel,
        glow,
        smear,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  function spawnPuff() {
    if (!rearWheels.length) return;
    const wheel = rearWheels[Math.floor(Math.random() * rearWheels.length)];
    wheel.getWorldPosition(wheelWorld);
    const puff = puffPool[puffCursor++ % PUFF_COUNT];
    puff.sprite.position.set(
      wheelWorld.x + (Math.random() - 0.5) * 0.26,
      wheelWorld.y - 0.44 - Math.random() * 0.1,
      wheelWorld.z + (Math.random() - 0.5) * 0.26
    );
    puff.maxLife = 0.8 + Math.random() * 0.6;
    puff.life = puff.maxLife;
    puff.vel.copy(travelDir).multiplyScalar(1.6 + Math.random() * 2.2);
    puff.vel.y += 0.12 + Math.random() * 0.34;
    puff.vel.x += (Math.random() - 0.5) * 0.6;
    puff.vel.z += (Math.random() - 0.5) * 0.6;
    puff.sprite.scale.set(0.24, 0.2, 1);
    puff.sprite.material.opacity = 0.6;
    puff.sprite.visible = true;
  }

  function updatePuffs(dt: number) {
    for (const p of puffPool) {
      if (!p.sprite.visible) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.sprite.visible = false;
        continue;
      }
      p.sprite.position.addScaledVector(p.vel, dt);
      p.vel.multiplyScalar(1 - Math.min(0.9, dt * 1.1));
      const t = 1 - p.life / p.maxLife;
      p.sprite.scale.set(0.24 + t * 2.1, 0.2 + t * 1.35, 1);
      p.sprite.material.opacity = (1 - t) * 0.62;
    }
  }

  let truckReady = false;

  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath(decoderPath);

  const gltfLoader = new GLTFLoader();
  gltfLoader.setDRACOLoader(dracoLoader);
  gltfLoader.load(
    modelUrl,
    (gltf) => {
      if (disposed) {
        disposeObject(gltf.scene);
        return;
      }

      const model = gltf.scene;
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());

      model.position.set(-center.x, -box.min.y, -center.z);
      model.traverse((child) => {
        if (/^tire_0[1-4]$/.test(child.name)) {
          tireNodes.push(child);
          if (child.name === 'tire_03' || child.name === 'tire_04') {
            rearWheels.push(child);
          }
        }
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          const materials = Array.isArray(child.material)
            ? child.material
            : [child.material];
          for (const material of materials) {
            if ('envMapIntensity' in material) {
              (material as THREE.MeshStandardMaterial).envMapIntensity = 0.9;
            }
          }
        }
      });

      // The model is ~19.4 units long; bring it down to stage scale.
      const targetLength = num('tl', 12.7);
      const modelScale = Math.min(
        targetLength / size.z,
        targetLength / size.x,
        7 / size.y
      );
      truckPivot.scale.setScalar(modelScale);
      truckPivot.add(model);
      buildWheelFx();

      truckReady = true;
      requestAnimationFrame(() => {
        if (!disposed) stage.classList.add('is-ready');
      });
    },
    undefined,
    (err) => {
      console.error('Truck failed to load', err);
      if (disposed) return;
      stage.classList.add('is-ready');
      const loader = stage.querySelector<HTMLElement>('.stage-loader');
      if (loader) loader.style.display = 'none';
    }
  );

  // Pointer parallax.
  let parallaxX = 0;
  let parallaxY = 0;
  let targetX = 0;
  let targetY = 0;
  let onScreen = true;

  const onPointerMove = (e: PointerEvent) => {
    if (!onScreen) return;
    const rect = stage.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    targetX = THREE.MathUtils.clamp(nx, -0.7, 0.7);
    targetY = THREE.MathUtils.clamp(ny, -0.7, 0.7);
  };

  window.addEventListener('pointermove', onPointerMove, { passive: true });

  // Pause the render loop once the section is out of view.
  const visibilityObserver =
    typeof IntersectionObserver === 'undefined'
      ? null
      : new IntersectionObserver(
          ([entry]) => {
            onScreen = entry.isIntersecting;
          },
          { rootMargin: '250px 0px' }
        );
  visibilityObserver?.observe(stage);

  let frameScale = 1;

  // The canvas is full-bleed so glows and rings never clip against an inset
  // stage. The 3D framing still matches the layout: a wider frustum, shifted
  // so the scene sits exactly where the reference composition wants it.
  const BASE_FOV = 29;
  const VIEW = { l: 0.32, r: 0.92, t: 0.267, b: 0.884 };
  const stacked = window.matchMedia('(max-width: 1180px)');
  const clampFov = (f: number) => Math.min(f, 78);

  function resize() {
    // clientWidth/Height ignore the entrance transform, so the drawing buffer
    // gets the section's real size instead of the 0.985 scale at mount.
    const width = stage.clientWidth;
    const height = stage.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);

    if (stacked.matches) {
      camera.clearViewOffset();
      camera.fov = BASE_FOV;
      camera.aspect = width / height;
      frameScale = Math.max(1, 1.55 / camera.aspect);
      camera.updateProjectionMatrix();
      return;
    }

    const vw = VIEW.r - VIEW.l;
    const vh = VIEW.b - VIEW.t;
    const zoom = 1 / vh;
    camera.fov = clampFov(
      THREE.MathUtils.radToDeg(
        2 *
          Math.atan(
            Math.tan(THREE.MathUtils.degToRad(BASE_FOV / 2)) * zoom
          )
      )
    );
    camera.aspect = width / height;
    camera.setViewOffset(
      width,
      height,
      -((VIEW.l + VIEW.r) / 2 - 0.5) * width,
      -((VIEW.t + VIEW.b) / 2 - 0.5) * height,
      width,
      height
    );
    // Keep the long truck framed when the panel becomes narrow.
    frameScale = Math.max(1, 1.55 / ((vw * width) / (vh * height)));
    camera.updateProjectionMatrix();
  }
  resize();
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(stage);

  const startTime = performance.now();
  let lastTime = startTime;
  let rafId = 0;

  function animate() {
    if (disposed) return;
    rafId = requestAnimationFrame(animate);
    if (!onScreen) return;

    const now = performance.now();
    const elapsed = (now - startTime) / 1000;
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    if (truckReady) {
      if (!reduceMotion) {
        truckPivot.position.y = 1.55 + Math.sin(elapsed * 0.72) * 0.085;
        truckPivot.rotation.z =
          0.025 + Math.sin(elapsed * 0.48) * 0.006;
        truckPivot.rotation.y =
          baseYaw + Math.sin(elapsed * 0.22) * 0.008;
        rings.rotation.y = elapsed * 0.035;
        dust.rotation.y = elapsed * 0.018;
        backGlow.material.opacity = 0.56 + Math.sin(elapsed * 0.9) * 0.06;

        driftSpeedField(airField, dt, 0.85);
        driftSpeedField(wheelField, dt, 1.05);

        for (const rung of rungs) {
          rung.position.z += 6.4 * dt;
          if (rung.position.z > TRACK_SPAN / 2) rung.position.z -= TRACK_SPAN;
          const rungEdge = Math.min(
            rung.position.z + TRACK_SPAN / 2,
            TRACK_SPAN / 2 - rung.position.z
          );
          (rung.material as THREE.MeshBasicMaterial).opacity =
            Math.max(0, Math.min(1, rungEdge / 2.6)) * 0.18;
        }

        for (const dash of dashes) {
          dash.position.z += 6.4 * dt;
          if (dash.position.z > TRACK_SPAN / 2) {
            dash.position.z -= TRACK_SPAN;
          }
          const edge = Math.min(
            dash.position.z + TRACK_SPAN / 2,
            TRACK_SPAN / 2 - dash.position.z
          );
          (dash.material as THREE.MeshBasicMaterial).opacity =
            Math.max(0, Math.min(1, edge / 2.4)) * 0.85;
        }

        for (const fx of wheelFx) {
          fx.wheel.getWorldPosition(wheelWorld);
          const by = wheelWorld.y - 0.44;
          fx.glow.position.set(wheelWorld.x, by, wheelWorld.z);
          fx.glow.material.opacity =
            0.3 + Math.sin(elapsed * 8 + fx.phase) * 0.08;
          fx.smear.position.set(
            wheelWorld.x + travelDir.x * 0.6,
            by + 0.02,
            wheelWorld.z + travelDir.z * 0.6
          );
          fx.smear.material.opacity =
            0.26 + Math.sin(elapsed * 6.5 + fx.phase) * 0.09;
        }

        for (const sprite of windItems) {
          sprite.position.z += sprite.userData.speed * dt;
          if (sprite.position.z > 11) {
            sprite.position.z -= 22;
            sprite.position.x = (Math.random() - 0.5) * 9;
          }
        }

        for (const tire of tireNodes) {
          tire.rotation.x -= 9 * dt;
        }

        puffTimer -= dt;
        if (puffTimer <= 0) {
          spawnPuff();
          if (rearWheels.length > 1) spawnPuff();
          puffTimer = 0.06;
        }
        updatePuffs(dt);

        const pos = dust.geometry.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < dustCount; i++) {
          pos.array[i * 3 + 1] +=
            Math.sin(elapsed * 0.35 + dustSeed[i]) * 0.0014;
        }
        pos.needsUpdate = true;
      }

      parallaxX += (targetX - parallaxX) * Math.min(1, dt * 3.2);
      parallaxY += (targetY - parallaxY) * Math.min(1, dt * 3.2);
      camera.position.x = (baseCamera.x + parallaxX * 1.5) * frameScale;
      camera.position.y = (baseCamera.y - parallaxY * 0.9) * frameScale;
      camera.position.z = baseCamera.z * frameScale;
      camera.lookAt(lookAt);
    }

    renderer.render(scene, camera);
  }

  animate();

  return () => {
    disposed = true;
    cancelAnimationFrame(rafId);
    resizeObserver.disconnect();
    visibilityObserver?.disconnect();
    window.removeEventListener('pointermove', onPointerMove);
    dracoLoader.dispose();
    disposeObject(scene);
    environment.dispose();
    pmrem.dispose();
    renderer.dispose();
  };
}
