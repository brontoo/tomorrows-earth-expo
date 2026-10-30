// Fit the original guide to a responsive stage and dispose all scene resources.
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export let characterModel: THREE.Group | null = null;

let mixer: THREE.AnimationMixer | null = null;

export function init3DPod(
  container: HTMLDivElement,
  onUnavailable?: () => void
): () => void {
  let alive = true;
  const clock = new THREE.Clock();
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const release = (root: THREE.Object3D) =>
    root.traverse(object => {
      const mesh = object as THREE.Mesh;
      mesh.geometry?.dispose();
      const materials = mesh.material
        ? Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material]
        : [];
      materials.forEach(material => {
        Object.values(material).forEach(value => {
          if (value instanceof THREE.Texture) value.dispose();
        });
        material.dispose();
      });
    });
  const startWidth = container.clientWidth || 600;
  const startHeight = container.clientHeight || 600;

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    45,
    startWidth / startHeight,
    0.1,
    1000
  );
  camera.position.set(0, 0, 6.0);
  let fittedSize: THREE.Vector3 | null = null;
  const frameGuide = () => {
    if (!fittedSize) return;
    const tangent = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    camera.position.z =
      Math.max(
        fittedSize.y / (2 * tangent),
        fittedSize.x / (2 * tangent * camera.aspect)
      ) *
        1.2 +
      fittedSize.z / 2;
    camera.lookAt(0, 0, 0);
  };

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(startWidth, startHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.5;

  container.innerHTML = "";
  container.appendChild(renderer.domElement);

  // إضاءة متوازنة ومشرقة للشخصية
  const ambientLight = new THREE.AmbientLight(0xffffff, 2.5);
  scene.add(ambientLight);

  const sunLight = new THREE.DirectionalLight(0xfff5ea, 3.0);
  sunLight.position.set(4, 6, 4);
  scene.add(sunLight);

  const ecoLight = new THREE.PointLight(0x00ff88, 2.0, 10);
  ecoLight.position.set(-3, -1, 3);
  scene.add(ecoLight);

  const loader = new GLTFLoader();
  loader.load(
    "/character.glb",
    gltf => {
      if (!alive) {
        release(gltf.scene);
        return;
      }
      characterModel = gltf.scene;

      // Centre the existing model without changing its geometry or artwork.
      characterModel.scale.set(1.0, 1.0, 1.0);
      const bounds = new THREE.Box3().setFromObject(characterModel);
      const center = bounds.getCenter(new THREE.Vector3());
      fittedSize = bounds.getSize(new THREE.Vector3());
      characterModel.position.sub(center);
      frameGuide();

      if (gltf.animations && gltf.animations.length > 0) {
        mixer = new THREE.AnimationMixer(characterModel);
        mixer.clipAction(gltf.animations[0]).play();
      }

      scene.add(characterModel);
    },
    undefined,
    error => {
      if (alive) {
        console.error("Error loading character GLB model:", error);
        onUnavailable?.();
      }
    }
  );

  let rafId = 0;
  let idleTime = 0;
  const animate = () => {
    rafId = requestAnimationFrame(animate);

    // مهم: لا نكتب على characterModel.position هنا إطلاقاً،
    // لأن GSAP يحرّك الموضع في مرحلة القصة، وأي كتابة لحظية تُلغي حركته.
    const dt = Math.min(0.05, clock.getDelta());
    if (mixer) {
      mixer.update(reduced.matches || document.hidden ? 0 : dt);
    } else if (characterModel && !reduced.matches && !document.hidden) {
      idleTime += dt;
      // A companion stays facing the reader; never spin through a full turn.
      characterModel.rotation.y = Math.sin(idleTime * 0.65) * 0.07;
      characterModel.rotation.z = Math.sin(idleTime * 0.8) * 0.012;
    }

    if (!document.hidden) renderer.render(scene, camera);
  };
  animate();

  const handleResize = () => {
    const width = container.clientWidth || startWidth;
    const height = container.clientHeight || startHeight;
    camera.aspect = width / height;
    frameGuide();
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  };
  window.addEventListener("resize", handleResize);

  return () => {
    alive = false;
    cancelAnimationFrame(rafId);
    mixer?.stopAllAction();
    release(scene);
    window.removeEventListener("resize", handleResize);
    renderer.dispose();
    renderer.forceContextLoss();
    container.innerHTML = "";
    characterModel = null;
    mixer = null;
  };
}
