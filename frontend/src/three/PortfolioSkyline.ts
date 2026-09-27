/**
 * The portfolio as a skyline: one tower per project, built from its tasks. Approved work is the
 * bronze base, then in review, in progress and not started on top; a red band marks overdue
 * work. Height is the number of tasks, so a tall tower is a big project, not a good one.
 *
 * Overdue work is shown as a translucent red sleeve around the top of the open part of the tower,
 * as tall as the overdue tasks would be, so "how much is late" reads at a glance.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { applyStudioEnvironment, disposeObject, fitCameraDistance, makeLabel, prefersReducedMotion, readTheme, type SceneTheme } from './sceneUtils';

export interface SkylineProject {
  id: number;
  key: string;
  name: string;
  todo: number;
  inProgress: number;
  inReview: number;
  done: number;
  overdue: number;
}

const UNIT = 0.2; // height per task
const TOWER = 1.1; // footprint
const GAP = 0.9;

export class PortfolioSkyline {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
  private readonly controls: OrbitControls;
  private readonly group = new THREE.Group();
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly resizeObserver: ResizeObserver;
  private readonly reduced = prefersReducedMotion();
  private towers: { id: number; parts: THREE.Mesh[]; outline: THREE.LineSegments }[] = [];
  private projects: SkylineProject[] = [];
  private theme: SceneTheme;
  private hovered: number | null = null;
  private frame = 0;
  private disposed = false;
  private disposeEnvironment: () => void = () => {};
  private frameBox = new THREE.Box3(new THREE.Vector3(-4, 0, -2), new THREE.Vector3(4, 3, 2));
  private downAt: { x: number; y: number } | null = null;
  private readonly container: HTMLElement;
  private readonly onHover: (id: number | null, x: number, y: number) => void;
  private readonly onOpen: (id: number) => void;

  constructor(container: HTMLElement, onHover: (id: number | null, x: number, y: number) => void, onOpen: (id: number) => void) {
    this.container = container;
    this.onHover = onHover;
    this.onOpen = onOpen;
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
    container.appendChild(el);

    this.controls = new OrbitControls(this.camera, el);
    this.controls.enableZoom = false;
    this.controls.enablePan = false;
    this.controls.enableDamping = true;
    this.controls.minPolarAngle = Math.PI * 0.2;
    this.controls.maxPolarAngle = Math.PI * 0.45;
    this.controls.autoRotate = !this.reduced;
    this.controls.autoRotateSpeed = 0.35;
    // These live inside scrolling pages: leave touch gestures to the page. (OrbitControls sets
    // touch-action to "none" when it connects, so this has to come after it.)
    this.controls.touches = { ONE: null, TWO: null };
    el.style.touchAction = 'pan-y';

    const key = new THREE.DirectionalLight(0xffffff, 1.5);
    key.position.set(5, 12, 7);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    const s = key.shadow.camera;
    s.left = -12;
    s.right = 12;
    s.top = 12;
    s.bottom = -12;
    key.shadow.bias = -0.0005;
    key.shadow.radius = 6; // soft edges (PCF)
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x8a7a66, 0.5), key, this.group);
    this.disposeEnvironment = applyStudioEnvironment(this.renderer, this.scene, 0.4);

    el.addEventListener('pointermove', this.onPointerMove);
    el.addEventListener('pointerleave', this.onPointerLeave);
    el.addEventListener('pointerdown', this.onPointerDown);
    el.addEventListener('pointerup', this.onPointerUp);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
    this.frame = requestAnimationFrame(this.loop);
  }

  setProjects(projects: SkylineProject[]): void {
    this.projects = projects;
    this.build();
  }

  refreshTheme(): void {
    this.theme = readTheme();
    this.build();
  }

  highlight(id: number | null): void {
    this.hovered = id;
    this.updateHighlight();
  }

  private build(): void {
    disposeObject(this.group);
    this.group.clear();
    this.towers = [];
    const t = this.theme;
    const n = this.projects.length;
    const width = n * TOWER + Math.max(0, n - 1) * GAP;

    const plinth = new THREE.Mesh(
      new THREE.BoxGeometry(width + 2.2, 0.18, TOWER + 2.4),
      new THREE.MeshStandardMaterial({ color: t.ground, roughness: 0.95 }),
    );
    plinth.position.set(0, -0.09, 0);
    plinth.receiveShadow = true;
    this.group.add(plinth);

    const unit = new THREE.BoxGeometry(1, 1, 1);
    const edges = new THREE.EdgesGeometry(unit);
    const layerEdge = new THREE.LineBasicMaterial({ color: t.dark ? '#000000' : t.ink, transparent: true, opacity: t.dark ? 0.5 : 0.18 });
    this.projects.forEach((p, i) => {
      const x = -width / 2 + TOWER / 2 + i * (TOWER + GAP);
      const layers: [number, string, number, number][] = [
        [p.done, t.done, 0.4, 0.3],
        [p.inReview, t.review, 0.65, 0],
        [p.inProgress, t.progress, 0.65, 0],
        [p.todo, t.todo, 0.8, 0],
      ];
      let y = 0;
      const parts: THREE.Mesh[] = [];
      for (const [count, color, roughness, metalness] of layers) {
        if (count <= 0) continue;
        const h = count * UNIT;
        // Real geometry per layer (not a scaled unit cube) so the bevel stays round at any height.
        const mesh = new THREE.Mesh(new RoundedBoxGeometry(TOWER, h, TOWER, 2, Math.min(0.035, h / 2.2)), new THREE.MeshStandardMaterial({ color, roughness, metalness }));
        mesh.position.set(x, y + h / 2, 0);
        const seam = new THREE.LineSegments(edges, layerEdge);
        seam.scale.set(TOWER + 0.002, h, TOWER + 0.002);
        seam.raycast = () => {};
        mesh.add(seam);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData.projectId = p.id;
        y += h;
        this.group.add(mesh);
        parts.push(mesh);
      }
      if (p.overdue > 0) {
        // A red sleeve around the top of the open work, as tall as the overdue tasks.
        const open = (p.todo + p.inProgress + p.inReview) * UNIT;
        const h = Math.max(0.06, Math.min(open || y, p.overdue * UNIT));
        // An open square tube (a 4-sided cylinder turned 45°), so it reads as a sleeve, not a lid.
        const tube = new THREE.CylinderGeometry(1, 1, 1, 4, 1, true);
        tube.rotateY(Math.PI / 4);
        const sleeve = new THREE.Mesh(tube, new THREE.MeshBasicMaterial({ color: t.danger, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide }));
        const r = (TOWER + 0.14) / Math.SQRT2;
        sleeve.scale.set(r, h, r);
        sleeve.position.set(x, y - h / 2, 0);
        sleeve.renderOrder = 2;
        sleeve.userData.projectId = p.id;
        const rim = new THREE.LineSegments(new THREE.EdgesGeometry(tube), new THREE.LineBasicMaterial({ color: t.danger }));
        rim.raycast = () => {};
        sleeve.add(rim);
        this.group.add(sleeve);
        parts.push(sleeve);
      }
      if (parts.length === 0) {
        const empty = new THREE.Mesh(unit, new THREE.MeshStandardMaterial({ color: t.todo, transparent: true, opacity: 0.4 }));
        empty.scale.set(TOWER, 0.04, TOWER);
        empty.position.set(x, 0.02, 0);
        empty.userData.projectId = p.id;
        this.group.add(empty);
        parts.push(empty);
        y = 0.04;
      }
      const outline = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: t.accent }));
      outline.scale.set(TOWER + 0.08, y + 0.08, TOWER + 0.08);
      outline.position.set(x, y / 2, 0);
      outline.visible = false;
      this.group.add(outline);

      const label = makeLabel(p.key, { color: t.ink, size: 0.3, weight: 700 });
      label.position.set(x, 0.05, TOWER / 2 + 0.75);
      this.group.add(label);
      this.towers.push({ id: p.id, parts, outline });
    });

    // Frame the skyline; a sphere-ish box so auto-rotation never cuts a tower off.
    const tallest = Math.max(1.5, ...this.projects.map((p) => (p.todo + p.inProgress + p.inReview + p.done) * UNIT));
    // Room for the towers to turn: the footprint's diagonal, not the whole plinth.
    const half = width / 2 + TOWER * 0.6;
    this.frameBox = new THREE.Box3(new THREE.Vector3(-half, 0, -half * 0.45), new THREE.Vector3(half, tallest + 0.2, half * 0.45));
    this.frame3d();
    this.updateHighlight();
  }

  private frame3d(): void {
    const target = this.frameBox.getCenter(new THREE.Vector3());
    target.y *= 0.8;
    const direction = new THREE.Vector3(0.32, 0.42, 1);
    this.controls.target.copy(target);
    this.camera.position.copy(target).addScaledVector(direction.normalize(), fitCameraDistance(this.camera, this.frameBox, target, direction, 0.96, 0.92));
    this.controls.update();
  }

  private updateHighlight(): void {
    for (const tower of this.towers) tower.outline.visible = tower.id === this.hovered;
  }

  private resize(): void {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.frame3d();
  }

  private pick(clientX: number, clientY: number): number | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const meshes = this.towers.flatMap((t) => t.parts);
    const id = this.raycaster.intersectObjects(meshes, false)[0]?.object.userData.projectId;
    return typeof id === 'number' ? id : null;
  }

  private onPointerMove = (e: PointerEvent): void => {
    if (e.buttons !== 0) return;
    const id = this.pick(e.clientX, e.clientY);
    if (id !== this.hovered) {
      this.hovered = id;
      this.updateHighlight();
    }
    this.controls.autoRotate = !this.reduced && id === null;
    this.renderer.domElement.style.cursor = id === null ? 'grab' : 'pointer';
    this.onHover(id, e.clientX, e.clientY);
  };

  private onPointerLeave = (): void => {
    this.hovered = null;
    this.updateHighlight();
    this.controls.autoRotate = !this.reduced;
    this.onHover(null, 0, 0);
  };

  private onPointerDown = (e: PointerEvent): void => {
    this.downAt = { x: e.clientX, y: e.clientY };
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (!this.downAt) return;
    const moved = Math.hypot(e.clientX - this.downAt.x, e.clientY - this.downAt.y);
    this.downAt = null;
    if (moved > 5) return;
    const id = this.pick(e.clientX, e.clientY);
    if (id !== null) this.onOpen(id);
  };

  private loop = (): void => {
    if (this.disposed) return;
    this.frame = requestAnimationFrame(this.loop);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  renderNow(): void {
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.resizeObserver.disconnect();
    const el = this.renderer.domElement;
    el.removeEventListener('pointermove', this.onPointerMove);
    el.removeEventListener('pointerleave', this.onPointerLeave);
    el.removeEventListener('pointerdown', this.onPointerDown);
    el.removeEventListener('pointerup', this.onPointerUp);
    this.controls.dispose();
    disposeObject(this.scene);
    this.disposeEnvironment();
    this.renderer.dispose();
    el.remove();
  }
}
