import * as THREE from "three";
/** A spine-anchored page. Each column follows a delayed arc, never a rigid card. */
export function bendPage(geometry: THREE.PlaneGeometry, progress: number) {
  const positions = geometry.attributes.position;
  const width = 5.2,
    depth = 3.7;
  for (let i = 0; i < positions.count; i++) {
    const column = i % 33,
      row = Math.floor(i / 33);
    const u = column / 32,
      v = row / 12;
    const theta = Math.PI * progress;
    const lag = Math.sin(Math.PI * progress) * 0.52;
    const angle = theta - lag * u + Math.sin(v * Math.PI) * lag * u * 0.16;
    const radius = width * u;
    positions.setXYZ(
      i,
      Math.cos(angle) * radius,
      0.37 +
        Math.sin(angle) * radius * 0.62 +
        Math.sin(Math.PI * u) * lag * 0.4,
      (v - 0.5) * depth + Math.sin(theta) * u * u * (v - 0.5) * 0.18
    );
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
}
