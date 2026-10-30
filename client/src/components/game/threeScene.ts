// src/threeScene.ts
// نسخة مطابقة لملف threeScene.js في المشروع المحلي (نفس الكاميرا والإضاءة والموضع)
// مع تعديل واحد فقط: استقبال عنصر الحاوية مباشرة + إرجاع دالة تنظيف لبيئة React.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export let characterModel: THREE.Group | null = null;

let mixer: THREE.AnimationMixer | null = null;


export function init3DPod(container: HTMLDivElement): () => void {
  let alive = true;
  const clock = new THREE.Clock();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const release = (root: THREE.Object3D) => root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    mesh.geometry?.dispose();
    const materials = mesh.material ? (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) : [];
    materials.forEach(material => {
      Object.values(material).forEach(value => { if (value instanceof THREE.Texture) value.dispose(); });
      material.dispose();
    });
  });
  const startWidth = container.clientWidth || 600;
  const startHeight = container.clientHeight || 600;

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(45, startWidth / startHeight, 0.1, 1000);
  camera.position.set(0, 0, 6.0);

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(startWidth, startHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.5;

  container.innerHTML = '';
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
    '/character.glb',
    (gltf) => {
      if (!alive) { release(gltf.scene); return; }
      characterModel = gltf.scene;

      // الموضع المبدئي: خلف كلمة UAE تماماً في أعلى يمين النص
      characterModel.scale.set(1.0, 1.0, 1.0);
      characterModel.position.set(0.75, 0.75, 0);

      if (gltf.animations && gltf.animations.length > 0) {
        mixer = new THREE.AnimationMixer(characterModel);
        mixer.clipAction(gltf.animations[0]).play();
      }

      scene.add(characterModel);
    },
    undefined,
    (error) => { if (alive) console.error('Error loading character GLB model:', error); }
  );

  let rafId = 0;
  let idleTime = 0;
  const animate = () => {
    rafId = requestAnimationFrame(animate);

    // مهم: لا نكتب على characterModel.position هنا إطلاقاً،
    // لأن GSAP يحرّك الموضع في مرحلة القصة، وأي كتابة لحظية تُلغي حركته.
    const dt = Math.min(.05, clock.getDelta());
    if (mixer) {
      mixer.update(reduced.matches || document.hidden ? 0 : dt);
    } else if (characterModel && !reduced.matches && !document.hidden) {
      idleTime += dt;
      // A companion stays facing the reader; never spin through a full turn.
      characterModel.rotation.y = Math.sin(idleTime * .65) * .07;
      characterModel.rotation.z = Math.sin(idleTime * .8) * .012;
    }

    if (!document.hidden) renderer.render(scene, camera);
  };
  animate();

  const handleResize = () => {
    const width = container.clientWidth || startWidth;
    const height = container.clientHeight || startHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  };
  window.addEventListener('resize', handleResize);

  return () => {
    alive = false;
    cancelAnimationFrame(rafId);
    mixer?.stopAllAction();
    release(scene);
    window.removeEventListener('resize', handleResize);
    renderer.dispose();
    renderer.forceContextLoss();
    container.innerHTML = '';
    characterModel = null;
    mixer = null;
  };
}
