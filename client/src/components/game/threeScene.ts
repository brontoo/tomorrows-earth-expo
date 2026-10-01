// src/threeScene.ts
// نسخة مطابقة لملف threeScene.js في المشروع المحلي (نفس الكاميرا والإضاءة والموضع)
// مع تعديل واحد فقط: استقبال عنصر الحاوية مباشرة + إرجاع دالة تنظيف لبيئة React.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export let characterModel: THREE.Group | null = null;

let mixer: THREE.AnimationMixer | null = null;
const clock = new THREE.Clock();

export function init3DPod(container: HTMLDivElement): () => void {
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
    (error) => console.error('Error loading character GLB model:', error)
  );

  let rafId = 0;
  const animate = () => {
    rafId = requestAnimationFrame(animate);

    // مهم: لا نكتب على characterModel.position هنا إطلاقاً،
    // لأن GSAP يحرّك الموضع في مرحلة القصة، وأي كتابة لحظية تُلغي حركته.
    if (mixer) {
      mixer.update(clock.getDelta());
    } else if (characterModel) {
      characterModel.rotation.y += 0.005;
    }

    renderer.render(scene, camera);
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
    cancelAnimationFrame(rafId);
    window.removeEventListener('resize', handleResize);
    renderer.dispose();
    container.innerHTML = '';
    characterModel = null;
    mixer = null;
  };
}
