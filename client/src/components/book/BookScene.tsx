import { useEffect, useRef } from "react";
import * as THREE from "three";
import gsap from "gsap";
import { chapters, type BookPhase } from "./chapters";

interface Props {
  phase: BookPhase;
  serial: number;
  chapter: number;
  reduced: boolean;
  onSettled: () => void;
  onFallback: () => void;
}
import { bendPage } from "./pageGeometry";

class BookRenderer {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  book = new THREE.Group();
  cover = new THREE.Group();
  popups = new THREE.Group();
  leftPages: THREE.Mesh;
  page: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
  state = { opening: 0, turn: 0, rise: 0 };
  timeline?: gsap.core.Timeline;
  observer: ResizeObserver;
  disposed = false;
  textures: THREE.Texture[] = [];
  paper: THREE.MeshStandardMaterial;
  lastPhase?: BookPhase;
  constructor(private container: HTMLDivElement) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "low-power",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(0xf3eee5, 0);
    container.appendChild(this.renderer.domElement);
    this.camera.position.set(1.4, 7.8, 10.5);
    this.camera.lookAt(0, 0, 0);
    this.scene.add(new THREE.HemisphereLight(0xfffcf3, 0x8e806a, 2.8));
    const key = new THREE.DirectionalLight(0xfff5df, 3);
    key.position.set(-4, 8, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -8;
    key.shadow.camera.right = 8;
    key.shadow.camera.top = 6;
    key.shadow.camera.bottom = -6;
    key.shadow.normalBias = 0.04;
    key.shadow.bias = -0.0003;
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xdbe5e4, 1.2);
    fill.position.set(6, 4, -3);
    this.scene.add(fill);
    const desk = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 80),
      new THREE.ShadowMaterial({ opacity: 0.16 })
    );
    desk.rotation.x = -Math.PI / 2;
    desk.position.y = -0.14;
    desk.receiveShadow = true;
    this.scene.add(desk);
    this.scene.add(this.book);
    this.book.rotation.y = -0.09;
    const green = new THREE.MeshStandardMaterial({
      color: 0x254c3e,
      roughness: 0.94,
    });
    const edge = new THREE.MeshStandardMaterial({
      color: 0xc2a16d,
      roughness: 0.87,
    });
    this.paper = new THREE.MeshStandardMaterial({
      color: 0xf1e5ca,
      roughness: 1,
      side: THREE.DoubleSide,
    });
    this.box(
      5.45,
      0.15,
      3.98,
      [green, green, green, green, green, green],
      2.64,
      -0.02,
      0,
      this.book
    );
    this.leftPages = this.box(
      5.22,
      0.28,
      3.76,
      this.paper,
      -2.6,
      0.14,
      0,
      this.book
    );
    this.leftPages.visible = false;
    this.box(5.2, 0.28, 3.76, this.paper, 2.6, 0.14, 0, this.book);
    // Visible fore-edge leaves, with physical thickness and a bound spine.
    for (let n = 0; n < 9; n++)
      this.box(5.22, 0.009, 3.79, edge, 2.6, 0.01 + n * 0.032, 0, this.book);
    this.box(0.12, 0.43, 3.96, green, -0.025, 0.14, 0, this.book);
    this.book.add(this.cover);
    this.cover.position.y = 0.42;
    const coverTexture = this.makeCover();
    this.textures.push(coverTexture);
    const printed = new THREE.MeshStandardMaterial({
      map: coverTexture,
      roughness: 0.97,
    });
    this.box(
      5.43,
      0.12,
      3.98,
      [green, green, printed, green, green, green],
      2.65,
      0,
      0,
      this.cover
    );
    for (let i = 0; i < 7; i++) {
      const tab = new THREE.Mesh(
        new THREE.BoxGeometry(0.32, 0.025, 0.35),
        new THREE.MeshStandardMaterial({
          color: chapters[i].accent,
          roughness: 1,
        })
      );
      tab.position.set(5.42, 0.14 + i * 0.018, -1.45 + i * 0.47);
      this.book.add(tab);
    }
    this.page = new THREE.Mesh(
      new THREE.PlaneGeometry(5.2, 3.7, 32, 12),
      this.paper.clone()
    );
    this.page.castShadow = true;
    this.page.receiveShadow = true;
    this.page.visible = false;
    this.book.add(this.page);
    this.book.add(this.popups);
    this.popups.position.y = 0.35;
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(container);
    this.resize();
  }
  private box(
    w: number,
    h: number,
    d: number,
    material: THREE.Material | THREE.Material[],
    x: number,
    y: number,
    z: number,
    parent: THREE.Group
  ) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  private makeCover() {
    const canvas = document.createElement("canvas");
    canvas.width = 1536;
    canvas.height = 1100;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#254c3e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Woven paper grain, deterministic and inexpensive.
    for (let y = 0; y < 1100; y += 3) {
      ctx.fillStyle = y % 2 ? "#ffffff05" : "#00000006";
      ctx.fillRect(0, y, 1536, 1);
    }
    ctx.strokeStyle = "#bba477";
    ctx.lineWidth = 3;
    ctx.strokeRect(52, 52, 1432, 996);
    ctx.lineWidth = 1;
    ctx.strokeRect(69, 69, 1398, 962);
    for (const x of [98, 1438])
      for (const y of [98, 1002]) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.PI / 4);
        ctx.strokeRect(-18, -18, 36, 36);
        ctx.restore();
      }
    ctx.textAlign = "center";
    ctx.fillStyle = "#cfbb8d";
    ctx.font = "22px Georgia";
    ctx.fillText("A JOURNEY TO KEEP", 768, 234);
    ctx.font = "74px Georgia";
    ctx.fillText("THE SEVEN", 768, 440);
    ctx.fillText("EMIRATES", 768, 530);
    ctx.font = "italic 30px Georgia";
    ctx.fillText("An Interactive Pop-Up Travel Book", 768, 608);
    ctx.beginPath();
    ctx.moveTo(540, 674);
    ctx.lineTo(996, 674);
    ctx.stroke();
    ctx.font = "21px Georgia";
    ctx.fillText("7 CHAPTERS   ·   7 CHALLENGES   ·   7 STAMPS", 768, 858);
    // Gold geometric rosette, embossed into the hardcover.
    ctx.save();
    ctx.translate(768, 730);
    for (let i = 0; i < 8; i++) {
      ctx.rotate(Math.PI / 4);
      ctx.strokeRect(-24, -24, 48, 48);
    }
    ctx.restore();
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
  }
  private resize() {
    const width = this.container.clientWidth,
      height = this.container.clientHeight;
    if (!width || !height) return;
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.fov = width < 600 ? 42 : 34;
    this.camera.position.z = this.camera.aspect < 1.25 ? 14.8 : 10.5;
    this.camera.lookAt(0, 0, 0);
    this.camera.updateProjectionMatrix();
    this.render();
  }
  private render = () => {
    if (this.disposed) return;
    this.camera.zoom =
      1 + (this.camera.aspect < 1.25 ? 0.65 : 0.12) * (1 - this.state.opening);
    this.camera.updateProjectionMatrix();
    this.cover.rotation.z = this.state.opening * Math.PI;
    this.book.position.x = -2.6 * (1 - this.state.opening);
    this.book.position.y = Math.sin(this.state.opening * Math.PI) * 0.18;
    this.leftPages.visible = this.state.opening > 0.4;
    bendPage(this.page.geometry, this.state.turn);
    this.popups.children.forEach((hinge, i) => {
      hinge.rotation.x =
        (-Math.PI / 2) *
        (1 -
          THREE.MathUtils.smoothstep(this.state.rise, i * 0.12, 0.6 + i * 0.1));
    });
    this.renderer.render(this.scene, this.camera);
  };
  animate(phase: BookPhase, reduced: boolean, done: () => void) {
    this.timeline?.kill();
    const duration = reduced ? 0.12 : 1.5;
    const tl = gsap.timeline({ onUpdate: this.render });
    this.timeline = tl;
    this.page.visible = phase === "turning";
    this.popups.visible = ["ready", "reveal", "turning"].includes(phase);
    if (phase === "cover") {
      this.state.opening = 0;
      this.state.rise = 0;
      this.render();
    } else if (phase === "opening") {
      tl.to(this.state, { opening: 1, duration, ease: "power2.inOut" }).call(
        done
      );
    } else {
      this.state.opening = 1;
      if (phase === "turning") {
        this.state.turn = 0;
        tl.to(this.state, { rise: 0, duration: reduced ? 0.01 : 0.25 })
          .to(this.state, {
            turn: 1,
            duration: reduced ? 0.12 : 1.05,
            ease: "power2.inOut",
          })
          .call(() => {
            this.page.visible = false;
            this.render();
            done();
          });
      } else if (phase === "reveal" || phase === "ready")
        tl.to(this.state, {
          rise: 1,
          duration: reduced ? 0.01 : 0.9,
          ease: "power2.out",
        });
      this.render();
    }
    this.lastPhase = phase;
  }
  setChapter(chapter: number) {
    while (this.popups.children.length) {
      const child = this.popups.children[0];
      child.traverse(o => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach(m => m.dispose());
        }
      });
      this.popups.remove(child);
    }
    const color = chapters[chapter].accent;
    // Creased cardstock groups hinged to the spread. Supplied films provide the detailed landmarks.
    for (let i = 0; i < 4; i++) {
      const hinge = new THREE.Group();
      hinge.position.set(-2 + i * 1.25, 0, -0.4 + (i % 2) * 0.8);
      const shape = new THREE.Shape();
      const h =
        chapter >= 5 ? 1.6 + i * 0.25 : chapter === 1 ? 1.2 + i * 0.45 : 1.3;
      shape.moveTo(-0.55, 0);
      shape.lineTo(-0.55, h * 0.7);
      shape.lineTo(0, h);
      shape.lineTo(0.55, h * 0.7);
      shape.lineTo(0.55, 0);
      const mesh = new THREE.Mesh(
        new THREE.ExtrudeGeometry(shape, { depth: 0.025, bevelEnabled: false }),
        new THREE.MeshStandardMaterial({
          color,
          roughness: 1,
          side: THREE.DoubleSide,
        })
      );
      mesh.castShadow = true;
      hinge.add(mesh);
      this.popups.add(hinge);
    }
    this.render();
  }
  dispose() {
    this.disposed = true;
    this.timeline?.kill();
    this.observer.disconnect();
    this.scene.traverse(object => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        (Array.isArray(object.material)
          ? object.material
          : [object.material]
        ).forEach(m => m.dispose());
      }
    });
    this.textures.forEach(t => t.dispose());
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}

export default function BookScene({
  phase,
  serial,
  chapter,
  reduced,
  onSettled,
  onFallback,
}: Props) {
  const container = useRef<HTMLDivElement>(null);
  const engine = useRef<BookRenderer | null>(null);
  const callbacks = useRef({ onSettled, onFallback });
  callbacks.current = { onSettled, onFallback };
  useEffect(() => {
    if (!container.current) return;
    let renderer: BookRenderer;
    try {
      renderer = new BookRenderer(container.current);
      engine.current = renderer;
    } catch {
      callbacks.current.onFallback();
      return;
    }
    const lost = (event: Event) => {
      event.preventDefault();
      callbacks.current.onFallback();
    };
    renderer.renderer.domElement.addEventListener("webglcontextlost", lost);
    return () => {
      renderer.renderer.domElement.removeEventListener(
        "webglcontextlost",
        lost
      );
      renderer.dispose();
      engine.current = null;
    };
  }, []);
  useEffect(() => {
    engine.current?.setChapter(chapter);
  }, [chapter]);
  useEffect(() => {
    engine.current?.animate(phase, reduced, () =>
      callbacks.current.onSettled()
    );
  }, [phase, serial, reduced]);
  return <div ref={container} className="book-webgl" aria-hidden="true" />;
}
