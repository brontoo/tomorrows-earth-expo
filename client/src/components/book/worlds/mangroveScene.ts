import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { ForestAction, ForestView } from "@shared/hiddenForest";
import {
  branch,
  leafStudy,
  mangroveSpecimen,
  sedimentStudy,
} from "./forestModels";
import { forestSpecimens, type ForestSpecimen } from "./forestSpecimens";

export interface MangroveWorldHandle {
  setTide(value: number): void;
  setView(view: ForestView): void;
  inspect(action: ForestAction): void;
  setSpecimen(specimen: ForestSpecimen | null): void;
  orbit(turn: number, lift: number): void;
  zoom(amount: number): void;
  setReducedMotion(value: boolean): void;
  dispose(): void;
}

const frame = (
  pos: [number, number, number],
  target: [number, number, number]
) => [new THREE.Vector3(...pos), new THREE.Vector3(...target)] as const;

const views = {
  canopy: frame([13.7, 8.2, 15.8], [-1.6, 1.4, -0.9]),
  underwater: frame([1.1, -0.35, 4.8], [-1.1, -0.33, -1.1]),
  roots: frame([-8.45, 2.8, 6.35], [-6.0, 0.75, 2.05]),
  tides: frame([8.1, 5.5, 12.8], [0.3, 0.05, -1.5]),
  carbon: frame([11.5, 3.1, 8.1], [7.8, 0.2, 4.1]),
} satisfies Record<ForestView, ReturnType<typeof frame>>;

const detail = {
  "inspect-tree": frame([-2.2, 4.8, 7.3], [-7.1, 3, -0.65]),
  "inspect-leaf": frame([6.2, 3.2, 8.3], [4.9, 1.15, 5.45]),
  "watch-heron": frame([6.9, 2.6, -6.9], [5.7, 2.1, -9.1]),
  "inspect-crab": frame([6.65, 1.17, 3.28], [5.65, 0.27, 1.9]),
  "compare-shelter": frame([-1.4, -0.36, 2.7], [-3.1, -0.35, -0.85]),
  "connect-habitats": frame([4.1, 8.1, 10.5], [-0.4, 0.1, -13]),
} as const;

const channel = (z: number) => 2.2 * Math.sin(z * 0.16);
const bankY = (x: number, z: number) => {
  const distance = Math.abs(x - channel(z));
  return (
    0.66 -
    1.59 * Math.exp(-Math.pow(distance / 4.55, 2)) +
    0.055 * Math.sin(x * 0.83) * Math.cos(z * 0.43)
  );
};
const groundColor = new THREE.Color(0xab9167);
const underColor = new THREE.Color(0x596959);
const air = new THREE.Color(0xc9dcd1);
const marine = new THREE.Color(0x145c59);
const initialTide = 47;

function waterMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      time: { value: 0 },
      underwater: { value: 0 },
      teal: { value: new THREE.Color(0x297d77) },
      glint: { value: new THREE.Color(0xf2e6bf) },
    },
    vertexShader: `
      uniform float time;
      varying vec3 world;
      varying float depth;
      void main() {
        vec3 p=position;
        p.y += sin(p.x*.88+p.z*.48+time*.65)*.019 +
               sin(p.z*1.46-p.x*.44-time*.73)*.012;
        vec4 w=modelMatrix*vec4(p,1.);
        world=w.xyz;
        float bank=(world.x-2.2*sin(world.z*.16))/4.55;
        depth=world.y-.66+1.59*exp(-bank*bank);
        gl_Position=projectionMatrix*viewMatrix*w;
      }`,
    fragmentShader: `
      uniform float time, underwater;
      uniform vec3 teal, glint;
      varying vec3 world;
      varying float depth;
      void main() {
        vec2 p=world.xz;
        vec3 v=normalize(cameraPosition-world);
        float a=cos(p.x*.88+p.y*.48+time*.65);
        float b=cos(p.y*1.46-p.x*.44-time*.73);
        vec3 n=normalize(vec3(-.022*a+.007*b,1.,-.014*a-.024*b));
        float grazing=1.-abs(dot(n,v));
        float fresnel=grazing*grazing*grazing;
        float shimmer=pow(.5+.5*sin(p.x*1.47+p.y*2.7+time*.61+b*.82),9.);
        float reflection=pow(max(dot(reflect(-normalize(vec3(-.57,.75,.29)),n),v),0.),45.);
        float edge=1.-smoothstep(.012,.12,abs(depth));
        vec3 water=mix(teal,glint,fresnel*.25+reflection*.48+shimmer*.06+edge*.16);
        float opacity=mix(.25,.76,smoothstep(.0,.94,depth)) + fresnel*.09;
        gl_FragColor=vec4(water,mix(opacity,.30,underwater));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}

function fitModel(
  model: THREE.Group,
  size: number,
  rotation: [number, number, number],
  ground = false
) {
  const oriented = new THREE.Group();
  oriented.rotation.set(...rotation);
  oriented.add(model);
  const bounds = new THREE.Box3().setFromObject(oriented, true);
  const extent = bounds.getSize(new THREE.Vector3());
  const scale = size / Math.max(extent.x, extent.y, extent.z, 0.001);
  const center = bounds.getCenter(new THREE.Vector3());
  if (ground) center.y = bounds.min.y;
  oriented.scale.setScalar(scale);
  oriented.position.copy(center.multiplyScalar(-scale));
  return oriented;
}

function disposeModels(roots: Iterable<THREE.Object3D>) {
  const geometry = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  Array.from(roots).forEach(root =>
    root.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      geometry.add(object.geometry);
      (Array.isArray(object.material)
        ? object.material
        : [object.material]
      ).forEach(mat => materials.add(mat));
      if (object instanceof THREE.InstancedMesh) object.dispose();
    })
  );
  geometry.forEach(item => item.dispose());
  materials.forEach(item => {
    Object.values(item).forEach(value => {
      if (value?.isTexture) textures.add(value);
    });
    item.dispose();
  });
  textures.forEach(texture => {
    texture.dispose();
    if (
      typeof ImageBitmap !== "undefined" &&
      texture.image instanceof ImageBitmap
    )
      texture.image.close();
  });
}

export function mountMangroveWorld(
  host: HTMLElement,
  onAction: (action: ForestAction) => void,
  onReady: () => void,
  onIssue: (message: string) => void,
  onExhibitState: (state: "loading" | "ready" | "failed") => void
): MangroveWorldHandle {
  const scene = new THREE.Scene();
  const background = air.clone();
  scene.background = background;
  const fog = new THREE.FogExp2(air, 0.023);
  scene.fog = fog;
  const camera = new THREE.PerspectiveCamera(47, 1, 0.04, 86);
  camera.position.copy(views.canopy[0]);
  const constrained =
    (navigator.hardwareConcurrency || 8) <= 4 ||
    matchMedia("(max-width: 700px)").matches;
  const renderer = new THREE.WebGLRenderer({
    antialias: !constrained,
    powerPreference: "high-performance",
  });
  let pixelRatio = Math.min(devicePixelRatio || 1, constrained ? 0.9 : 1.25);
  renderer.setPixelRatio(pixelRatio);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.13;
  host.appendChild(renderer.domElement);
  renderer.domElement.setAttribute("aria-hidden", "true");

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.minDistance = 1.4;
  controls.maxDistance = 35;
  controls.maxPolarAngle = Math.PI * 0.48;
  controls.target.copy(views.canopy[1]);
  controls.update();

  const fill = new THREE.HemisphereLight(0xfff4dd, 0x635e48, 2.03);
  const sun = new THREE.DirectionalLight(0xffe1a8, 2.35);
  sun.position.set(-12, 17, 6);
  scene.add(fill, sun);
  const landscape = new THREE.Group();
  scene.add(landscape);
  const terrain = new THREE.PlaneGeometry(50, 46, 95, 80).rotateX(-Math.PI / 2);
  const vertices = terrain.getAttribute("position");
  const shade = new THREE.Color();
  const colors = new Float32Array(vertices.count * 3);
  for (let i = 0; i < vertices.count; i++) {
    const x = vertices.getX(i),
      z = vertices.getZ(i),
      y = bankY(x, z);
    vertices.setY(i, y);
    const mix = THREE.MathUtils.smoothstep(y, -0.7, 0.51);
    shade.copy(underColor).lerp(groundColor, mix);
    shade.multiplyScalar(
      0.93 +
        0.06 * Math.sin(x * 6.8 + z * 2.7) +
        0.045 * Math.cos(z * 9.2 - x * 3.1)
    );
    shade.toArray(colors, i * 3);
  }
  terrain.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  terrain.computeVertexNormals();
  const earth = new THREE.Mesh(
    terrain,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96 })
  );
  landscape.add(earth);

  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(54, 50, 36, 34).rotateX(-Math.PI / 2),
    waterMaterial()
  );
  const tideY = (value: number) => -0.38 + value * 0.012;
  water.position.y = tideY(initialTide);
  water.renderOrder = 2;
  landscape.add(water);

  const materials = {
    root: new THREE.MeshStandardMaterial({ color: 0x715645, roughness: 0.87 }),
    shell: new THREE.MeshStandardMaterial({ color: 0xb6a086, roughness: 0.9 }),
    shade: new THREE.MeshBasicMaterial({
      color: 0x363f30,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
    }),
  };
  const hits = new Map<THREE.Object3D, ForestAction>();
  function pickable(object: THREE.Object3D, action: ForestAction) {
    object.traverse(node => {
      if (node instanceof THREE.Mesh) hits.set(node, action);
    });
  }
  let seed = 1147;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const transform = new THREE.Object3D();
  const roots = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.017, 0.048, 0.53, 5),
    materials.root,
    constrained ? 195 : 315
  );
  for (let i = 0; i < roots.count; i++) {
    const z = rand() * 32 - 16,
      side = i % 3 ? -1 : 1;
    const x = channel(z) + side * (3.4 + rand() * 4.65);
    const size = 0.53 + rand() * 0.9;
    transform.position.set(x, bankY(x, z) + size * 0.201, z);
    transform.rotation.set(
      (rand() - 0.5) * 0.19,
      rand() * 6.28,
      (rand() - 0.5) * 0.19
    );
    transform.scale.setScalar(size);
    transform.updateMatrix();
    roots.setMatrixAt(i, transform.matrix);
  }
  landscape.add(roots);
  pickable(roots, "inspect-pneumatophores");
  const shells = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(0.098, 0),
    materials.shell,
    116
  );
  for (let i = 0; i < shells.count; i++) {
    const z = rand() * 38 - 19,
      x = channel(z) + (i % 2 ? 1 : -1) * (2.4 + rand() * 6.5);
    transform.position.set(x, bankY(x, z) + 0.017, z);
    transform.rotation.set(rand(), rand() * 6.28, rand());
    transform.scale.set(1, 0.31, 0.64);
    transform.updateMatrix();
    shells.setMatrixAt(i, transform.matrix);
  }
  landscape.add(shells);
  const molluscs = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.12, 8, 4),
    materials.shell,
    22
  );
  for (let i = 0; i < molluscs.count; i++) {
    const z = -8 + i * 0.82;
    const x = channel(z) + (i % 2 ? -1 : 1) * (2.4 + (i % 5) * 0.22);
    transform.position.set(x, bankY(x, z) + 0.025, z);
    transform.rotation.set(0.18, i * 0.72, 0.33);
    transform.scale.set(0.72, 0.39, 1.06);
    transform.updateMatrix();
    molluscs.setMatrixAt(i, transform.matrix);
  }
  landscape.add(molluscs);

  const nearRoot = mangroveSpecimen();
  nearRoot.root.position.set(-6, 0.86, 2);
  const cut = new THREE.Mesh(
    new THREE.BoxGeometry(3.8, 0.56, 3.65),
    new THREE.MeshStandardMaterial({
      color: 0x9a6b4f,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
    })
  );
  cut.position.y = -0.28;
  nearRoot.root.add(cut);
  scene.add(nearRoot.root);
  pickable(nearRoot.tips, "inspect-pneumatophores");
  pickable(nearRoot.lateral, "reveal-lateral-roots");

  const leaf = leafStudy();
  const slab = new THREE.Mesh(
    new THREE.CylinderGeometry(1.66, 1.8, 0.2, 40),
    new THREE.MeshStandardMaterial({ color: 0xb8a585, roughness: 0.96 })
  );
  slab.scale.x = 1.47;
  slab.position.y = -0.23;
  leaf.root.add(slab);
  leaf.root.position.set(4.9, 1.1, 5.45);
  scene.add(leaf.root);
  pickable(leaf.root, "inspect-leaf");

  const sediment = sedimentStudy();
  sediment.root.position.set(7.75, 0.68, 4.2);
  const miniTree = mangroveSpecimen();
  miniTree.root.scale.setScalar(0.59);
  miniTree.root.position.set(0.3, 0.36, -0.1);
  sediment.root.add(miniTree.root);
  scene.add(sediment.root);
  pickable(sediment.root, "inspect-sediment");

  const crab = new THREE.Group();
  const coastalBird = new THREE.Group();
  const crabShadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.24, 20).rotateX(-Math.PI / 2),
    materials.shade
  );
  crabShadow.scale.z = 0.68;
  landscape.add(crab, crabShadow, coastalBird);
  const school = Array.from({ length: constrained ? 4 : 6 }, (_, i) => {
    const group = new THREE.Group();
    group.scale.setScalar(0.78 + (i % 4) * 0.085);
    landscape.add(group);
    return { group, phase: rand() * 6.28, z: -6.8 + i * 1.55 };
  });

  const exhibit = new THREE.Group();
  const exhibitPlinth = new THREE.Mesh(
    new THREE.CylinderGeometry(1.27, 1.35, 0.15, 32),
    new THREE.MeshStandardMaterial({ color: 0x31574a, roughness: 0.92 })
  );
  exhibitPlinth.position.y = -0.075;
  exhibit.add(exhibitPlinth);
  scene.add(exhibit);
  const exhibitModels = new Map<ForestSpecimen, THREE.Group>();

  const treePositions: [number, number, number, number][] = [
    [-7.1, -0.8, 1.05, 0.24],
    [-13.5, -8.7, 1.08, 0.5],
    [-10.8, -5.4, 0.8, 2.2],
    [-7.4, -10.7, 0.91, 1.31],
    [-17.6, -11.7, 1.1, 1.6],
    [-12.8, -15.6, 0.89, 1.0],
    [-8.5, -18.7, 0.92, 0.4],
    [-14.4, 3.6, 0.91, 1.8],
    [-18.8, 6.1, 0.7, 2.1],
    [-10.9, 8.25, 0.89, 0.4],
    [-13, 13.6, 0.79, 1.58],
    [-18.2, 13.3, 0.75, 1.3],
    [10.6, -14.7, 1.07, 1.1],
    [15.7, -11.2, 0.82, 1.3],
    [9.3, -8.5, 0.78, 0.7],
    [14.8, -3.6, 1.01, 2.01],
    [14.6, 4.9, 0.86, 0.4],
    [18.4, 8.3, 1.01, 1.4],
    [11.3, 12.4, 0.79, 0.7],
    [15.1, 16.2, 0.84, 1.1],
  ];
  let lowForeground: THREE.Group | undefined;
  let hero: THREE.Group | undefined,
    rootsStudyStarted = false;
  let lowReady = false,
    entryDrawn = false,
    destroyed = false;
  let needsPaint = true;
  const invalidate = () => {
    needsPaint = true;
  };
  const detached = new Set<THREE.Object3D>();
  const abort = new AbortController();
  const loader = new GLTFLoader();
  async function model(file: string) {
    const url = `/worlds/abu-dhabi/${file}`;
    const response = await fetch(url, { signal: abort.signal });
    if (!response.ok) throw new Error(file);
    const { scene: group } = await loader.parseAsync(
      await response.arrayBuffer(),
      "/worlds/abu-dhabi/"
    );
    if (destroyed) {
      disposeModels([group]);
      return undefined;
    }
    return group;
  }
  const wildlifeRequests = new Set<string>();
  function requestWildlife(
    file: string,
    place: (group: THREE.Group) => void,
    failed?: () => void
  ) {
    if (wildlifeRequests.has(file)) return;
    wildlifeRequests.add(file);
    void model(file)
      .then(group => {
        if (!group) return;
        place(group);
        invalidate();
      })
      .catch(() => {
        wildlifeRequests.delete(file);
        if (destroyed) return;
        if (failed) failed();
        else
          onIssue("A wildlife model could not load. Reopen its view to retry.");
      });
  }
  function loadCrab() {
    requestWildlife("wildlife/mangrove-crab.glb", model => {
      crab.add(fitModel(model, 0.69, [-Math.PI / 2, 0, Math.PI], true));
      pickable(crab, "inspect-crab");
    });
  }
  function loadBird() {
    requestWildlife("wildlife/little-bird.glb", model => {
      coastalBird.add(fitModel(model, 1.25, [0, 0, 0]));
      pickable(coastalBird, "watch-heron");
    });
  }
  function loadFish() {
    requestWildlife("wildlife/flathead-mullet.glb", model => {
      const fish = fitModel(model, 0.54, [0, Math.PI / 2, 0]);
      for (const { group } of school) {
        group.add(group === school[0].group ? fish : fish.clone());
        pickable(group, "follow-fish");
      }
    });
  }
  function treeMaterial(mesh: THREE.Mesh) {
    const material = mesh.material as THREE.MeshStandardMaterial;
    material.roughness = 0.91;
    material.metalness = 0;
    material.color.set(0xf0e5ce);
    material.side = THREE.DoubleSide;
  }
  const landShadow = new THREE.InstancedMesh(
    new THREE.CircleGeometry(1.92, 20).rotateX(-Math.PI / 2),
    materials.shade,
    treePositions.length
  );
  treePositions.forEach(([x, z, s, r], i) => {
    transform.position.set(x, bankY(x, z) + 0.025, z);
    transform.rotation.set(0, r, 0);
    transform.scale.set(s * 1.2, 1, s * 0.75);
    transform.updateMatrix();
    landShadow.setMatrixAt(i, transform.matrix);
  });
  landscape.add(landShadow);
  const placeForeground = (group: THREE.Group) => {
    group.traverse(node => {
      if (node instanceof THREE.Mesh) treeMaterial(node);
    });
    const [x, z, scale, rotation] = treePositions[0];
    group.position.set(x, bankY(x, z) - 0.04, z);
    group.scale.setScalar(scale);
    group.rotation.y = rotation;
    landscape.add(group);
    pickable(group, "inspect-tree");
  };
  void model("mangrove-low.glb")
    .then(low => {
      if (!low) return;
      placeForeground(low);
      lowForeground = low;
      lowReady = true;
      invalidate();
    })
    .catch(() => {
      if (destroyed) return;
      const stem = mangroveSpecimen().root;
      stem.position.set(-7, bankY(-7, -1), -1);
      landscape.add(stem);
      onIssue("The detailed tree model could not load.");
      lowReady = true;
      invalidate();
    });
  void model("mangrove-far.glb")
    .then(far => {
      if (!far) return;
      detached.add(far);
      far.updateMatrixWorld(true);
      const plants = treePositions
        .slice(1)
        .filter((_, i) => !constrained || i % 3 !== 2);
      far.traverse(node => {
        if (!(node instanceof THREE.Mesh)) return;
        treeMaterial(node);
        const batch = new THREE.InstancedMesh(
          node.geometry,
          node.material,
          plants.length
        );
        const matrix = new THREE.Matrix4();
        plants.forEach(([x, z, size, rotation], i) => {
          transform.position.set(x, bankY(x, z) - 0.04, z);
          transform.rotation.set(0, rotation, 0);
          transform.scale.setScalar(size);
          transform.updateMatrix();
          batch.setMatrixAt(
            i,
            matrix.multiplyMatrices(transform.matrix, node.matrixWorld)
          );
          batch.setColorAt(
            i,
            new THREE.Color().setHSL(
              0.195 + rand() * 0.025,
              0.09,
              0.81 + rand() * 0.17
            )
          );
        });
        batch.computeBoundingSphere();
        landscape.add(batch);
        pickable(batch, "inspect-tree");
      });
      invalidate();
    })
    .catch(() => {
      if (!destroyed) onIssue("Some background trees could not load.");
    });

  let specimen: ForestSpecimen | null = null;
  let exhibitDrawn: ForestSpecimen | null = null;
  let view: ForestView = "canopy",
    reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let targetWater = water.position.y,
    t = 0,
    previous = 0,
    lastPaint = 0;
  let sub = 0,
    transition: ReturnType<typeof frame> | undefined,
    active: ForestAction | null = null;
  let brown = 0,
    referenceRoot: THREE.Group | undefined;
  const following = new THREE.Vector3();
  const cursor = new THREE.Vector2();
  const ray = new THREE.Raycaster();
  const offset = new THREE.Vector3(),
    spherical = new THREE.Spherical();
  const labels = host.parentElement;
  function navigate(next: ReturnType<typeof frame>) {
    if (reduced) {
      transition = undefined;
      camera.position.copy(next[0]);
      controls.target.copy(next[1]);
      controls.update();
    } else transition = next;
  }
  function show() {
    invalidate();
    const leafOn =
      view === "canopy" &&
      (active === "inspect-leaf" || active === "reveal-salt");
    leaf.root.visible = !specimen && leafOn;
    leaf.salt.visible = active === "reveal-salt";
    nearRoot.root.visible = !specimen && view === "roots";
    nearRoot.lateral.visible = active === "reveal-lateral-roots";
    cut.visible = nearRoot.lateral.visible;
    sediment.root.visible = !specimen && view === "carbon";
    landscape.visible = !specimen && !leafOn && view !== "carbon";
    if (referenceRoot) referenceRoot.visible = !specimen && view === "roots";
    exhibit.visible = specimen !== null;
    for (const [id, item] of Array.from(exhibitModels.entries())) {
      item.visible = id === specimen;
    }
    sediment.pathways.children.forEach((item, i) => {
      item.visible =
        active === ["trace-uptake", "trace-litter", "trace-burial"][i];
    });
  }
  function setView(next: ForestView) {
    specimen = null;
    exhibitDrawn = null;
    view = next;
    if (next === "underwater") loadFish();
    if (next === "tides") loadCrab();
    if (next === "canopy" || next === "tides") loadBird();
    active = null;
    controls.enableDamping = !reduced;
    controls.maxPolarAngle =
      next === "underwater" ? Math.PI * 0.62 : Math.PI * 0.48;
    controls.minDistance = next === "underwater" ? 1.1 : 1.4;
    navigate(views[next]);
    show();
  }
  function frameExhibit() {
    const framing = frame([2.6, 1.8, 3.55], [0, 0.77, 0]);
    const distanceScale = Math.max(1, 0.55 / camera.aspect);
    framing[0].sub(framing[1]).multiplyScalar(distanceScale).add(framing[1]);
    return framing;
  }
  function setSpecimen(next: ForestSpecimen | null) {
    if (!next) {
      setView(view);
      return;
    }
    specimen = next;
    active = null;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.minDistance = 1.45;
    navigate(frameExhibit());
    show();
    onExhibitState(exhibitModels.has(next) ? "ready" : "loading");
    if (!exhibitModels.has(next)) {
      requestWildlife(
        forestSpecimens[next].file,
        model => {
          const isFish = next === "perch";
          const item = new THREE.Group();
          item.add(
            fitModel(
              model,
              isFish ? 2 : 1.62,
              isFish ? [0, -0.64, 0] : [0, 0, 0],
              true
            )
          );
          if (isFish) item.position.y = 0.34;
          exhibitModels.set(next, item);
          exhibit.add(item);
          show();
        },
        () => {
          if (specimen === next) onExhibitState("failed");
        }
      );
    }
  }
  function inspect(action: ForestAction) {
    if (action === "inspect-crab") loadCrab();
    if (action === "watch-heron") loadBird();
    if (action === "follow-fish") loadFish();
    active = action;
    transition = undefined;
    const target = detail[action as keyof typeof detail];
    if (target) navigate(target);
    if (action === "reveal-salt") navigate(detail["inspect-leaf"]);
    if (
      action === "inspect-pneumatophores" ||
      action === "reveal-lateral-roots"
    )
      navigate(views.roots);
    if (
      action === "reveal-lateral-roots" &&
      !rootsStudyStarted &&
      !constrained
    ) {
      rootsStudyStarted = true;
      void model("roots-study.glb")
        .then(root => {
          if (!root) return;
          const box = new THREE.Box3().setFromObject(root);
          root.scale.setScalar(
            0.9 / Math.max(0.001, box.getSize(new THREE.Vector3()).y)
          );
          box.setFromObject(root);
          const center = box.getCenter(new THREE.Vector3());
          root.position.set(
            -7.65 - center.x,
            0.08 - box.min.y,
            0.14 - center.z
          );
          scene.add(root);
          referenceRoot = root;
          show();
        })
        .catch(() => {
          /* scientific anatomy uses the authored cutaway */
        });
    }
    show();
  }
  show();

  const pointers = new Map<number, { x: number; y: number }>();
  const cancel = () => {
    pointers.clear();
    transition = undefined;
    if (active === "follow-fish") active = null;
  };
  const start = (event: PointerEvent) => {
    if (pointers.size)
      for (const item of Array.from(pointers.keys())) pointers.delete(item);
    else pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    transition = undefined;
  };
  const end = (event: PointerEvent) => {
    const from = pointers.get(event.pointerId);
    pointers.delete(event.pointerId);
    if (!from || Math.hypot(event.clientX - from.x, event.clientY - from.y) > 7)
      return;
    const rect = renderer.domElement.getBoundingClientRect();
    cursor.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      1 - ((event.clientY - rect.top) / rect.height) * 2
    );
    ray.setFromCamera(cursor, camera);
    const visible = Array.from(hits.keys()).filter(mesh => {
      for (let node: THREE.Object3D | null = mesh; node; node = node.parent)
        if (!node.visible) return false;
      return true;
    });
    const hit = ray.intersectObjects(visible, false)[0];
    const action = hit && hits.get(hit.object);
    if (action) onAction(action);
  };
  const canvas = renderer.domElement;
  canvas.addEventListener("pointerdown", start);
  canvas.addEventListener("pointerup", end);
  canvas.addEventListener("pointercancel", cancel);
  const onControl = () => {
    transition = undefined;
    if (active === "follow-fish") active = null;
  };
  controls.addEventListener("start", onControl);
  controls.addEventListener("change", invalidate);
  const contextLost = (event: Event) => {
    event.preventDefault();
    onIssue(
      "The graphics context was lost. Return to the book and reopen the forest to restart it."
    );
  };
  canvas.addEventListener("webglcontextlost", contextLost);
  const resize = () => {
    const width = Math.max(host.clientWidth, 1),
      height = Math.max(host.clientHeight, 1);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    invalidate();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  let perfStart = 0,
    frames = 0,
    slowWindows = 0,
    heroStarted = false;
  function draw(ms: number) {
    if (
      destroyed ||
      document.hidden ||
      (reduced && !needsPaint) ||
      (!reduced && constrained && ms - lastPaint < 31)
    )
      return;
    needsPaint = false;
    const dt = THREE.MathUtils.clamp((ms - (previous || ms)) / 1000, 0, 0.1);
    previous = ms;
    lastPaint = ms;
    if (!reduced) t += dt;
    const blend = reduced ? 1 : 1 - Math.exp(-5 * dt);
    water.position.y = THREE.MathUtils.lerp(
      water.position.y,
      targetWater,
      blend
    );
    water.material.uniforms.time.value = t;
    sub = THREE.MathUtils.lerp(
      sub,
      !specimen && view === "underwater" ? 1 : 0,
      blend
    );
    water.material.uniforms.underwater.value = sub;
    background.copy(air).lerp(marine, sub);
    fog.color.copy(background);
    const waterAboveCamera = Math.max(0, water.position.y - camera.position.y);
    fog.density =
      0.022 + sub * (0.12 + Math.min(0.07, waterAboveCamera * 0.06));
    fill.intensity = 2.03 - sub * 0.55;
    sun.intensity = 2.35 - sub * 1.41;
    const inspectingCrab = active === "inspect-crab";
    crab.position.x = 5.65 + (inspectingCrab ? 0 : Math.sin(t * 0.9) * 0.23);
    crab.position.z = 1.9;
    crab.position.y = bankY(crab.position.x, crab.position.z);
    crab.rotation.y = 0.35 + Math.sin(t * 0.71) * 0.18;
    crab.visible = inspectingCrab || water.position.y < crab.position.y + 0.28;

    crabShadow.visible = crab.visible && crab.children.length > 0;
    crabShadow.position.copy(crab.position);
    crabShadow.position.y += 0.012;
    const bankSlope =
      (bankY(crab.position.x + 0.1, 1.9) - crab.position.y) / 0.1;
    crabShadow.rotation.z = Math.atan(bankSlope);

    const watchingBird = active === "watch-heron";
    const flight = t * (watchingBird ? 0.29 : 0.46);
    const circle = watchingBird ? 0.48 : 2.2;
    coastalBird.position.set(
      5.7 + Math.cos(flight) * circle,
      2.08 + Math.sin(t * 1.7) * 0.15,
      -9.1 + Math.sin(flight) * circle
    );
    coastalBird.rotation.set(
      -0.025,
      watchingBird ? 0.79 : -flight,
      Math.sin(t * 1.7) * 0.17
    );

    school.forEach(({ group, z, phase }, i) => {
      const travel = z + Math.cos(t * 0.68 + phase) * 1.44;
      const x = channel(travel) + Math.sin(t * 0.86 + phase) * 1.14;
      const bed = bankY(x, travel);
      group.position.set(
        x,
        Math.max(bed + 0.16, water.position.y - 0.37 + (i % 3) * 0.055),
        travel
      );
      group.visible = water.position.y - bed > 0.31;
      group.rotation.y =
        Math.atan2(Math.cos(t * 0.86 + phase), -Math.sin(t * 0.68 + phase)) +
        Math.sin(t * 10 + phase) * 0.1;
      group.rotation.z = Math.sin(t * 2.6 + phase) * 0.08;
    });
    brown = THREE.MathUtils.lerp(
      brown,
      active === "compare-disturbance" ? 0.48 : 0,
      blend
    );
    sediment.layers.forEach((layer, i) => {
      layer.position.x = i * (brown - 0.01) * 0.36;
      layer.position.y = -i * (0.36 + brown * 0.34);
    });
    for (const { route, tracer, curve } of sediment.tracers) {
      if (sediment.root.visible && route.visible) {
        curve.getPoint(reduced ? 0.55 : (t / 2.8) % 1, tracer.position);
      }
    }
    if (transition) {
      camera.position.lerp(transition[0], blend);
      controls.target.lerp(transition[1], blend);
      if (camera.position.distanceToSquared(transition[0]) < 0.001)
        transition = undefined;
    }
    if (!specimen && view === "underwater") {
      camera.position.y = THREE.MathUtils.clamp(
        camera.position.y,
        bankY(camera.position.x, camera.position.z) + 0.11,
        water.position.y - 0.1
      );
      const focusFish = school[school.length - 1].group;
      if (active === "follow-fish" && focusFish.visible) {
        following.copy(focusFish.position);
        controls.target.lerp(following, reduced ? 1 : blend);
      }
    }
    controls.update();
    if (hero && lowForeground) {
      const close =
        active === "inspect-tree" &&
        view === "canopy" &&
        camera.position.distanceToSquared(hero.position) < 49;
      hero.visible = close;
      lowForeground.visible = !close;
    }
    renderer.render(scene, camera);
    if (specimen && specimen !== exhibitDrawn && exhibitModels.has(specimen)) {
      exhibitDrawn = specimen;
      onExhibitState("ready");
    }
    if (labels) {
      labels.dataset.drawCalls = String(renderer.info.render.calls);
      labels.dataset.triangles = String(renderer.info.render.triangles);
      labels.dataset.renderQuality = reduced
        ? "on-demand"
        : constrained
          ? "30fps"
          : "full";
      labels.dataset.pixelRatio = pixelRatio.toFixed(2);
    }
    if (lowReady && !entryDrawn) {
      entryDrawn = true;
      onReady();
      loadBird();
    }
    if (
      entryDrawn &&
      active === "inspect-tree" &&
      !heroStarted &&
      !constrained &&
      pixelRatio >= 0.85
    ) {
      heroStarted = true;
      void model("mangrove-hero.glb")
        .then(group => {
          if (!group) return;
          placeForeground(group);
          group.visible = false;
          hero = group;
          invalidate();
        })
        .catch(() => {
          /* low-detail trees remain visible */
        });
    }
    if (reduced) {
      frames = 0;
      perfStart = 0;
      if (labels) delete labels.dataset.frameMs;
      return;
    }
    if (!perfStart) perfStart = ms;
    frames++;
    if (ms - perfStart >= 1100) {
      const frameMs = (ms - perfStart) / frames;
      if (labels) labels.dataset.frameMs = frameMs.toFixed(1);
      slowWindows = frameMs > 43 && frames > 1 ? slowWindows + 1 : 0;
      if (slowWindows >= 2 && pixelRatio > 0.6) {
        pixelRatio = Math.max(0.6, pixelRatio * 0.8);
        renderer.setPixelRatio(pixelRatio);
        resize();
        slowWindows = 0;
      }
      perfStart = ms;
      frames = 0;
    }
  }
  renderer.setAnimationLoop(draw);

  function orbit(turn: number, lift: number) {
    transition = undefined;
    offset.copy(camera.position).sub(controls.target);
    spherical.setFromVector3(offset);
    spherical.theta += turn;
    spherical.phi = THREE.MathUtils.clamp(
      spherical.phi + lift,
      0.15,
      controls.maxPolarAngle
    );
    camera.position
      .copy(controls.target)
      .add(offset.setFromSpherical(spherical));
    controls.update();
  }
  return {
    setView,
    inspect,
    setSpecimen,
    orbit,
    setTide(value) {
      targetWater = tideY(THREE.MathUtils.clamp(value, 0, 100));
      invalidate();
    },
    zoom(amount) {
      transition = undefined;
      offset.copy(camera.position).sub(controls.target);
      offset.setLength(
        THREE.MathUtils.clamp(
          offset.length() * amount,
          controls.minDistance,
          controls.maxDistance
        )
      );
      camera.position.copy(controls.target).add(offset);
      controls.update();
    },
    setReducedMotion(value) {
      reduced = value;
      invalidate();
      controls.enableDamping = !value;
      if (value && transition) navigate(transition);
    },
    dispose() {
      destroyed = true;
      abort.abort();
      observer.disconnect();
      canvas.removeEventListener("pointerdown", start);
      canvas.removeEventListener("pointerup", end);
      canvas.removeEventListener("pointercancel", cancel);
      canvas.removeEventListener("webglcontextlost", contextLost);
      controls.removeEventListener("start", onControl);
      controls.removeEventListener("change", invalidate);
      controls.dispose();
      renderer.setAnimationLoop(null);
      disposeModels([scene, ...Array.from(detached)]);
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
