import * as THREE from "three";

const standard = (color: number, roughness = 0.82) =>
  new THREE.MeshStandardMaterial({ color, roughness });
const wood = () => standard(0x765142);
const point = (xyz: [number, number, number]) => new THREE.Vector3(...xyz);

export function branch(
  points: [number, number, number][],
  radius: number,
  material: THREE.Material
) {
  return new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(points.map(point)),
      8,
      radius,
      6,
      false
    ),
    material
  );
}

export function mangroveSpecimen() {
  const root = new THREE.Group();
  const lateral = new THREE.Group();
  const tips = new THREE.Group();
  const material = wood();
  const stem = branch(
    [
      [0, -0.6, 0],
      [-0.1, 0.4, 0],
      [0.08, 2.7, 0.1],
    ],
    0.17,
    material
  );
  root.add(stem, lateral, tips);
  for (let arm = 0; arm < 6; arm++) {
    const a = (arm / 6) * Math.PI * 2;
    const endX = Math.cos(a),
      endZ = Math.sin(a);
    lateral.add(
      branch(
        [
          [0, -0.55, 0],
          [endX * 0.8, -0.47, endZ * 0.8],
          [endX * 2.3, -0.4, endZ * 2.3],
        ],
        0.075,
        material
      )
    );
    for (let i = 1; i <= 6; i++) {
      const spacing = 0.28 + i * 0.29;
      const x = endX * spacing,
        z = endZ * spacing;
      const h = 0.24 + (i % 3) * 0.13;
      tips.add(
        branch(
          [
            [x, -0.41, z],
            [x + 0.04, 0.02, z],
            [x, h, z + 0.03],
          ],
          0.037,
          material
        )
      );
    }
  }
  return { root, lateral, tips };
}

export function leafStudy() {
  const root = new THREE.Group(),
    salt = new THREE.Group();
  const outline = new THREE.Shape();
  outline.moveTo(-1.8, 0);
  outline.bezierCurveTo(-1, 0.95, 0.95, 0.83, 1.75, 0);
  outline.bezierCurveTo(1, -0.72, -1.02, -0.9, -1.8, 0);
  const blade = new THREE.Mesh(
    new THREE.ExtrudeGeometry(outline, {
      depth: 0.045,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.045,
      bevelSegments: 2,
      steps: 1,
      curveSegments: 22,
    }),
    standard(0x466c36, 0.55)
  );
  blade.rotateX(-Math.PI / 2);
  root.add(blade, salt);
  const vein = standard(0x99ab6e);
  root.add(
    branch(
      [
        [-1.98, 0.12, 0],
        [0, 0.14, 0],
        [1.64, 0.12, 0],
      ],
      0.028,
      vein
    )
  );
  for (let i = 0; i < 6; i++) {
    const x = -1.1 + i * 0.4;
    for (const side of [-1, 1]) {
      root.add(
        branch(
          [
            [x - 0.19, 0.13, 0],
            [x, 0.13, side * 0.24],
            [x + 0.26, 0.1, side * (0.64 - Math.abs(x) * 0.27)],
          ],
          0.014,
          vein
        )
      );
    }
  }
  const grains = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(0.037, 0),
    standard(0xf7e6bc),
    30
  );
  const cursor = new THREE.Object3D();
  for (let i = 0; i < grains.count; i++) {
    cursor.position.set(
      -1.21 + (i % 10) * 0.25,
      0.16,
      (Math.floor(i / 10) - 1) * 0.25 + Math.sin(i * 3) * 0.08
    );
    cursor.rotation.set(i, i * 3, 0);
    cursor.updateMatrix();
    grains.setMatrixAt(i, cursor.matrix);
  }
  salt.add(grains);
  // A schematic grey mangrove seedling beside the magnified leaf.
  const seedling = new THREE.Group();
  seedling.position.set(2.1, -0.21, 0.25);
  seedling.add(
    branch(
      [
        [0, 0, 0],
        [0, 0.3, 0],
        [0.14, 0.65, 0],
      ],
      0.035,
      vein
    )
  );
  for (const side of [-1, 1]) {
    const cotyledon = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 10, 6),
      standard(0x849d45)
    );
    cotyledon.position.set(side * 0.15, 0.61, 0);
    cotyledon.scale.set(1.45, 0.27, 0.65);
    cotyledon.rotation.z = side * 0.4;
    seedling.add(cotyledon);
  }
  root.add(seedling);
  return { root, salt };
}

export function sedimentStudy() {
  const root = new THREE.Group();
  const layers = [0x635847, 0x9d7854, 0x715344, 0x494337].map(
    (color, index) => {
      const layer = new THREE.Mesh(
        new THREE.BoxGeometry(4.6, 0.33, 2.6),
        standard(color)
      );
      layer.position.y = -index * 0.36;
      root.add(layer);
      return layer;
    }
  );
  const organic = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(0.16, 0),
    standard(0x39291e),
    24
  );
  const cursor = new THREE.Object3D();
  for (let i = 0; i < organic.count; i++) {
    cursor.position.set(
      -2.07 + (i % 12) * 0.37,
      -0.4 - Math.floor(i / 12) * 0.48,
      1.3
    );
    cursor.scale.set(0.62 + (i % 3) * 0.29, 0.28, 0.33);
    cursor.rotation.set(i * 0.3, 0, i * 0.4);
    cursor.updateMatrix();
    organic.setMatrixAt(i, cursor.matrix);
  }
  root.add(organic);
  const pathways = new THREE.Group();
  const glint = new THREE.MeshBasicMaterial({ color: 0xf1c97e });
  const lines: [number, number, number][][] = [
    [
      [-1.24, 0.7, 0.8],
      [-0.96, 1.25, 0.64],
      [-0.38, 1.65, 0.32],
    ],
    [
      [0.67, 1.28, 0.45],
      [1.05, 0.72, 0.88],
      [1.35, 0.22, 1.06],
    ],
    [
      [1.35, 0.22, 1.38],
      [1.52, -0.22, 1.4],
      [1.08, -1.12, 1.39],
    ],
  ];
  const tracerGeometry = new THREE.SphereGeometry(0.077, 8, 6);
  const tracers = lines.map((line, index) => {
    const path = branch(line, 0.03, glint);
    path.name = String(index);
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.095, 0.22, 8), glint);
    arrow.position.copy(point(line[2]));
    arrow.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      point(line[2]).sub(point(line[1])).normalize()
    );
    const route = new THREE.Group();
    const tracer = new THREE.Mesh(tracerGeometry, glint);
    route.add(path, arrow, tracer);
    pathways.add(route);
    return {
      route,
      tracer,
      curve: new THREE.CatmullRomCurve3(line.map(point)),
    };
  });
  root.add(pathways);
  return { root, layers, pathways, tracers };
}
