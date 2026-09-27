/**
 * The sign-in sculpture: four stacked slabs, one per stage of work (to do → in progress →
 * in review → approved), the last cast in bronze. It follows the pointer, can be turned by
 * dragging, and reports which stage is pointed at so the page can name it (the names are
 * HTML next to the canvas, so they stay readable and accessible).
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { applyStudioEnvironment, disposeObject, fitCameraDistance, prefersReducedMotion, readTheme, type SceneTheme } from './sceneUtils';

export const STAGES = [
  { key: 'todo', label: '01 Plan', note: 'Criteria written before work starts' },
  { key: 'progress', label: '02 Make', note: 'A checklist the maker ticks off' },
  { key: 'review', label: '03 Prove', note: 'Evidence submitted for review' },
  { key: 'done', label: '04 Approve', note: 'Every criterion met, cast in bronze' },
] as const;

export class FlowSculpture {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  private readonly controls: OrbitControls;
  private readonly group = new THREE.Group();
  private readonly slabs: THREE.Mesh<RoundedBoxGeometry, THREE.MeshStandardMaterial>[] = [];
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2(0, 0);
  private readonly tilt = new THREE.Vector2(0, 0);
  private readonly resizeObserver: ResizeObserver;
  private readonly reduced = prefersReducedMotion();
  private theme: SceneTheme;
  private hovered = -1;
  private frame = 0;
  private start = performance.now();
  private disposed = false;
  private disposeEnvironment: () => void = () => {};

  constructor(
    private readonly container: HTMLElement,
    private readonly onHover: (stage: number) => void = () => {},
  ) {
    this.theme = readTheme();
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    const el = this.renderer.domElement;
    el.style.display = 'block';
    el.style.width = '100%';
    el.style.height = '100%';
    el.style.touchAction = 'pan-y';
    el.setAttribute('aria-hidden', 'true');
    container.appendChild(el);

    this.camera.position.set(6.2, 4.6, 7.4);
    this.controls = new OrbitControls(this.camera, el);
    this.controls.enableZoom = false;
    this.controls.enablePan = false;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minPolarAngle = Math.PI * 0.18;
    this.controls.maxPolarAngle = Math.PI * 0.46;
    this.controls.autoRotate = !this.reduced;
    this.controls.autoRotateSpeed = 0.6;
    // These live inside scrolling pages: leave touch gestures to the page. (OrbitControls sets
    // touch-action to "none" when it connects, so this has to come after it.)
    this.controls.touches = { ONE: null, TWO: null };
    el.style.touchAction = 'pan-y';
    this.controls.target.set(0, 1.7, 0);

    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    // From the front-left, so the shadow falls to the right where the camera can see it.
    key.position.set(-6, 8, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -5;
    key.shadow.camera.right = 5;
    key.shadow.camera.top = 5;
    key.shadow.camera.bottom = -5;
    key.shadow.bias = -0.0005;
    key.shadow.radius = 6; // soft edges (PCF)
    const rim = new THREE.DirectionalLight(0xffe6c4, 0.6);
    rim.position.set(-6, 3, -4);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x8a7a66, 0.45), key, rim, this.group);
    this.disposeEnvironment = applyStudioEnvironment(this.renderer, this.scene, 0.4);

    this.build();

    el.addEventListener('pointermove', this.onPointerMove);
    el.addEventListener('pointerleave', this.onPointerLeave);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
    this.frame = requestAnimationFrame(this.loop);
  }

  private colors(): string[] {
    const t = this.theme;
    return [t.todo, t.progress, t.review, t.done];
  }

  private build(): void {
    this.group.clear();
    this.slabs.length = 0;
    const t = this.theme;
    // A shadow-catching floor that is otherwise invisible.
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.ShadowMaterial({ opacity: t.dark ? 0.45 : 0.12 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.group.add(floor);

    const sizes: [number, number, number][] = [
      [3.2, 0.55, 2.2],
      [2.5, 0.75, 1.8],
      [1.9, 0.95, 1.4],
      [1.25, 1.25, 1.25],
    ];
    const colors = this.colors();
    let y = 0;
    sizes.forEach(([w, h, d], i) => {
      const done = i === 3;
      const slab = new THREE.Mesh(
        new RoundedBoxGeometry(w, h, d, 3, 0.06),
        new THREE.MeshStandardMaterial({ color: colors[i], roughness: done ? 0.3 : 0.75, metalness: done ? 0.45 : 0 }),
      );
      slab.castShadow = true;
      slab.receiveShadow = true;
      slab.position.set(i * 0.18 - 0.25, y + h / 2, -i * 0.12);
      slab.rotation.y = (i - 1.5) * 0.14;
      slab.userData.stage = i;
      y += h;
      this.group.add(slab);
      this.slabs.push(slab);
    });
  }

  refreshTheme(): void {
    this.theme = readTheme();
    disposeObject(this.group);
    this.build();
  }

  private resize(): void {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    // Keep the whole sculpture (with room to turn) in frame at any panel shape.
    const box = new THREE.Box3(new THREE.Vector3(-2.2, 0, -2.2), new THREE.Vector3(2.2, 3.9, 2.2));
    const target = new THREE.Vector3(0, 1.7, 0);
    const direction = this.camera.position.clone().sub(this.controls.target).normalize();
    this.controls.target.copy(target);
    this.camera.position.copy(target).addScaledVector(direction, fitCameraDistance(this.camera, box, target, direction, 0.8, 0.8));
  }

  private onPointerMove = (e: PointerEvent): void => {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = this.raycaster.intersectObjects(this.slabs, false)[0];
    const stage = hit ? (hit.object.userData.stage as number) : -1;
    if (stage !== this.hovered) {
      this.hovered = stage;
      this.onHover(stage);
    }
    this.renderer.domElement.style.cursor = stage >= 0 ? 'pointer' : 'grab';
  };

  private onPointerLeave = (): void => {
    this.pointer.set(0, 0);
    if (this.hovered !== -1) {
      this.hovered = -1;
      this.onHover(-1);
    }
  };

  /** Highlight a stage from outside (e.g. keyboard focus on the stage list). */
  highlight(stage: number): void {
    this.hovered = stage;
  }

  private loop = (): void => {
    if (this.disposed) return;
    this.frame = requestAnimationFrame(this.loop);
    const t = (performance.now() - this.start) / 1000;
    // Gentle parallax towards the pointer, and a slow breath (both off with reduced motion).
    if (!this.reduced) {
      this.tilt.lerp(this.pointer, 0.05);
      this.group.rotation.x = -this.tilt.y * 0.06;
      this.group.rotation.z = this.tilt.x * 0.04;
    }
    this.slabs.forEach((slab, i) => {
      const lift = this.hovered === i ? 0.18 : 0;
      const breath = this.reduced ? 0 : Math.sin(t * 0.9 + i * 0.7) * 0.02;
      const base = this.baseY(i);
      slab.position.y += (base + lift + breath - slab.position.y) * 0.12;
      slab.material.emissive.set(this.hovered === i ? this.theme.accent : '#000000');
      slab.material.emissiveIntensity = this.hovered === i ? 0.12 : 0;
    });
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  private baseY(i: number): number {
    const heights = [0.55, 0.75, 0.95, 1.25];
    let y = 0;
    for (let k = 0; k < i; k++) y += heights[k];
    return y + heights[i] / 2;
  }

  /** For screenshots/tests. */
  renderNow(): void {
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.resizeObserver.disconnect();
    const el = this.renderer.domElement;
    el.removeEventListener('pointermove', this.onPointerMove);
    el.removeEventListener('pointerleave', this.onPointerLeave);
    this.controls.dispose();
    disposeObject(this.scene);
    this.disposeEnvironment();
    this.renderer.dispose();
    el.remove();
  }
}
