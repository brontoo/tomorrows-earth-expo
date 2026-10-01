import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export let characterModel: THREE.Group | null = null;

export function init3DPod(container: HTMLDivElement) {
  const scene = new THREE.Scene();
  
  const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
  camera.position.z = 5;

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0x00ff88, 2);
  directionalLight.position.set(2, 2, 2);
  scene.add(directionalLight);

  const loader = new GLTFLoader();
  
  loader.load('/character.glb', (gltf: any) => {
    if (gltf && gltf.scene) {
      characterModel = gltf.scene;
      if (characterModel) {
        characterModel.position.set(0, -0.8, 0); 
        characterModel.scale.set(1.2, 1.2, 1.2);
        scene.add(characterModel);
      }
    }
  });

  const animate = () => {
    requestAnimationFrame(animate);
    if (characterModel) {
      characterModel.position.y = -0.8 + Math.sin(Date.now() * 0.002) * 0.05;
    }
    renderer.render(scene, camera);
  };
  animate();

  window.addEventListener('resize', () => {
    if (!container) return;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  });
}