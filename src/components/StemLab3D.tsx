import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { ChevronDown, ChevronUp, GripHorizontal, LocateFixed, RotateCcw } from 'lucide-react';

type ModelPresetId = 'microgrid' | 'arduino' | 'atom';
type CameraPresetId = 'hero' | 'top' | 'detail';

interface ExplodablePart {
  obj: THREE.Object3D;
  basePos: THREE.Vector3;
  explodeOffset: THREE.Vector3;
}

function createFloorGridTexture(renderer: THREE.WebGLRenderer): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#0e1628';
  ctx.fillRect(0, 0, 512, 512);

  ctx.strokeStyle = 'rgba(110, 168, 254, 0.16)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 512; i += 32) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, 512, 512);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(12, 12);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

function createSolarCellTexture(renderer: THREE.WebGLRenderer): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#0c234b';
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = '#60a5fa';
  ctx.lineWidth = 2;
  for (let x = 0; x <= 256; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 256);
    ctx.stroke();
  }
  for (let y = 0; y <= 256; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(128, 128, 12, 128, 128, 124);
  grad.addColorStop(0, 'rgba(0,0,0,0.55)');
  grad.addColorStop(0.55, 'rgba(0,0,0,0.22)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildMicrogridGroup(
  renderer: THREE.WebGLRenderer,
  explodable: ExplodablePart[]
): { group: THREE.Group; rotor: THREE.Group } {
  const group = new THREE.Group();
  const reg = (obj: THREE.Object3D, offset: THREE.Vector3) => {
    explodable.push({ obj, basePos: obj.position.clone(), explodeOffset: offset });
  };

  const brushedMetal = new THREE.MeshStandardMaterial({
    color: 0xdbe4f0,
    metalness: 0.85,
    roughness: 0.22,
  });
  const darkSlate = new THREE.MeshStandardMaterial({
    color: 0x1f2937,
    metalness: 0.25,
    roughness: 0.72,
  });
  const copperMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    metalness: 0.9,
    roughness: 0.2,
  });
  const solarMat = new THREE.MeshStandardMaterial({
    map: createSolarCellTexture(renderer),
    metalness: 0.15,
    roughness: 0.12,
  });
  const bladeMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    metalness: 0.1,
    roughness: 0.35,
  });

  // 1. Ground Base Plinth (bottom-center flush at y=0)
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.8, 0.22, 48), darkSlate);
  plinth.position.y = 0.11;
  plinth.receiveShadow = true;
  plinth.castShadow = true;
  group.add(plinth);
  reg(plinth, new THREE.Vector3(0, -0.35, 0));

  // 2. Wind Turbine Tapered Mast (LatheGeometry)
  const mastPts = [
    new THREE.Vector2(0.2, 0),
    new THREE.Vector2(0.16, 1.4),
    new THREE.Vector2(0.11, 2.8),
    new THREE.Vector2(0.09, 3.2),
  ];
  const mast = new THREE.Mesh(new THREE.LatheGeometry(mastPts, 28), brushedMetal);
  mast.position.set(-0.85, 0.22, -0.35);
  mast.castShadow = true;
  group.add(mast);
  reg(mast, new THREE.Vector3(-0.6, 0.4, -0.2));

  // 3. Nacelle Housing
  const nacelle = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.34, 0.76), bladeMat);
  nacelle.position.set(-0.85, 3.45, -0.25);
  nacelle.castShadow = true;
  group.add(nacelle);
  reg(nacelle, new THREE.Vector3(-0.6, 0.9, -0.2));

  // 4. Rotor Hub + 3 Extruded Aerofoil Blades
  const rotor = new THREE.Group();
  rotor.position.set(-0.85, 3.45, 0.18);

  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.36, 24), copperMat);
  nose.rotation.x = Math.PI / 2;
  nose.position.z = 0.12;
  rotor.add(nose);

  const bladeShape = new THREE.Shape();
  bladeShape.moveTo(0, 0);
  bladeShape.lineTo(0.1, 0.35);
  bladeShape.lineTo(0.05, 1.35);
  bladeShape.lineTo(-0.02, 1.35);
  bladeShape.lineTo(-0.07, 0.35);
  bladeShape.closePath();

  const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, {
    depth: 0.03,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.015,
    bevelSegments: 2,
  });

  for (let i = 0; i < 3; i++) {
    const bladeHolder = new THREE.Group();
    bladeHolder.rotation.z = (i * Math.PI * 2) / 3;
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.rotation.y = 0.22;
    blade.castShadow = true;
    bladeHolder.add(blade);
    rotor.add(bladeHolder);
  }
  group.add(rotor);
  reg(rotor, new THREE.Vector3(-0.6, 0.9, 0.7));

  // 5. Solar Array Frame & Tilted PV Panel
  const pvGroup = new THREE.Group();
  pvGroup.position.set(0.95, 0.22, 0.35);

  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.75, 16), brushedMetal);
  post.position.y = 0.375;
  post.castShadow = true;
  pvGroup.add(post);

  const panelFrame = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.08, 1.15), brushedMetal);
  panelFrame.position.y = 0.8;
  panelFrame.rotation.x = 0.42;
  panelFrame.castShadow = true;
  pvGroup.add(panelFrame);

  const panelCells = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.03, 1.02), solarMat);
  panelCells.position.set(0, 0.835, 0.015);
  panelCells.rotation.x = 0.42;
  pvGroup.add(panelCells);

  group.add(pvGroup);
  reg(pvGroup, new THREE.Vector3(0.75, 0.45, 0.35));

  // 6. Battery Inverter Cabinet & Copper Busbar Conduit
  const battery = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.85, 0.55), darkSlate);
  battery.position.set(0.15, 0.645, -0.75);
  battery.castShadow = true;
  group.add(battery);
  reg(battery, new THREE.Vector3(0.15, 0.65, -0.55));

  const conduitCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.85, 0.3, -0.35),
    new THREE.Vector3(-0.35, 0.28, -0.65),
    new THREE.Vector3(0.15, 0.35, -0.75),
    new THREE.Vector3(0.95, 0.3, 0.25),
  ]);
  const conduit = new THREE.Mesh(new THREE.TubeGeometry(conduitCurve, 32, 0.045, 12, false), copperMat);
  conduit.castShadow = true;
  group.add(conduit);
  reg(conduit, new THREE.Vector3(0, 0.25, 0));

  return { group, rotor };
}

function buildArduinoGroup(explodable: ExplodablePart[]): THREE.Group {
  const group = new THREE.Group();
  const reg = (obj: THREE.Object3D, offset: THREE.Vector3) => {
    explodable.push({ obj, basePos: obj.position.clone(), explodeOffset: offset });
  };

  const pcbMat = new THREE.MeshStandardMaterial({ color: 0x0f766e, metalness: 0.15, roughness: 0.58 });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.2 });
  const icMat = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.1, roughness: 0.8 });
  const lcdBezelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.25, roughness: 0.65 });
  const lcdScreenMat = new THREE.MeshStandardMaterial({
    color: 0x84cc16,
    emissive: 0x3f6212,
    emissiveIntensity: 0.65,
    roughness: 0.2,
  });

  // 1. Breadboard Tray Base
  const tray = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.18, 2.9), lcdBezelMat);
  tray.position.y = 0.09;
  tray.castShadow = true;
  tray.receiveShadow = true;
  group.add(tray);
  reg(tray, new THREE.Vector3(0, -0.35, 0));

  // 2. Arduino Uno PCB (beveled ExtrudeGeometry)
  const pcbShape = new THREE.Shape();
  pcbShape.moveTo(-0.95, -0.68);
  pcbShape.lineTo(0.95, -0.68);
  pcbShape.lineTo(0.95, 0.68);
  pcbShape.lineTo(-0.95, 0.68);
  pcbShape.closePath();

  const pcbGeo = new THREE.ExtrudeGeometry(pcbShape, {
    depth: 0.08,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
  });
  const pcb = new THREE.Mesh(pcbGeo, pcbMat);
  pcb.rotation.x = -Math.PI / 2;
  pcb.position.set(-1.0, 0.2, 0.2);
  pcb.castShadow = true;
  group.add(pcb);
  reg(pcb, new THREE.Vector3(-0.6, 0.45, 0.2));

  // 3. USB-B Metallic Port & ATmega328P Chip
  const usbPort = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.34, 0.42), steelMat);
  usbPort.position.set(-1.75, 0.41, 0.2);
  usbPort.castShadow = true;
  group.add(usbPort);
  reg(usbPort, new THREE.Vector3(-0.85, 0.85, 0.2));

  const mcu = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.12, 0.28), icMat);
  mcu.position.set(-0.85, 0.35, 0.38);
  mcu.castShadow = true;
  group.add(mcu);
  reg(mcu, new THREE.Vector3(-0.6, 0.95, 0.38));

  // 4. 4 Tactile Arcade Buzzer Buttons (Red, Blue, Green, Yellow)
  const btnColors = [0xdc2626, 0x2563eb, 0x16a34a, 0xd97706];
  btnColors.forEach((col, i) => {
    const btnGroup = new THREE.Group();
    btnGroup.position.set(-0.7 + i * 0.72, 0.2, -0.78);

    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.29, 0.16, 24), icMat);
    collar.position.y = 0.08;
    collar.castShadow = true;
    btnGroup.add(collar);

    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(0.21, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: col, metalness: 0.15, roughness: 0.25 })
    );
    dome.position.y = 0.16;
    dome.castShadow = true;
    btnGroup.add(dome);

    group.add(btnGroup);
    reg(btnGroup, new THREE.Vector3((i - 1.5) * 0.25, 0.75, -0.5));
  });

  // 5. 16x2 I2C LCD Module
  const lcdGroup = new THREE.Group();
  lcdGroup.position.set(1.05, 0.26, 0.35);

  const bezel = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.16, 0.92), lcdBezelMat);
  bezel.castShadow = true;
  lcdGroup.add(bezel);

  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.04, 0.54), lcdScreenMat);
  glass.position.y = 0.08;
  lcdGroup.add(glass);

  group.add(lcdGroup);
  reg(lcdGroup, new THREE.Vector3(0.7, 0.75, 0.35));

  return group;
}

function buildBohrAtomGroup(explodable: ExplodablePart[]): { group: THREE.Group; orbitals: THREE.Group } {
  const group = new THREE.Group();
  const reg = (obj: THREE.Object3D, offset: THREE.Vector3) => {
    explodable.push({ obj, basePos: obj.position.clone(), explodeOffset: offset });
  };

  const baseMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.75, roughness: 0.25 });
  const protonMat = new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.2, roughness: 0.3 });
  const neutronMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.65, roughness: 0.35 });
  const ringMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.75, roughness: 0.2 });
  const electronMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0xca8a04,
    emissiveIntensity: 0.55,
    metalness: 0.5,
    roughness: 0.15,
  });

  // 1. Pedestal & Stem
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.35, 0.22, 36), baseMat);
  pedestal.position.y = 0.11;
  pedestal.castShadow = true;
  pedestal.receiveShadow = true;
  group.add(pedestal);
  reg(pedestal, new THREE.Vector3(0, -0.3, 0));

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 1.65, 20), baseMat);
  stem.position.y = 1.05;
  stem.castShadow = true;
  group.add(stem);
  reg(stem, new THREE.Vector3(0, -0.1, 0));

  // 2. Nucleus Cluster (6 Protons + 6 Neutrons)
  const nucleus = new THREE.Group();
  nucleus.position.y = 2.25;
  const nucleonGeo = new THREE.SphereGeometry(0.16, 20, 20);
  for (let i = 0; i < 12; i++) {
    const phi = Math.acos(1 - (2 * (i + 0.5)) / 12);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    const r = 0.22;
    const m = new THREE.Mesh(nucleonGeo, i % 2 === 0 ? protonMat : neutronMat);
    m.position.set(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi)
    );
    m.castShadow = true;
    nucleus.add(m);
  }
  group.add(nucleus);
  reg(nucleus, new THREE.Vector3(0, 0.35, 0));

  // 3. Orbital Shells & Electrons
  const orbitals = new THREE.Group();
  orbitals.position.y = 2.25;

  const shells = [
    { radius: 0.95, count: 2, tiltX: 0.38, tiltZ: 0.2 },
    { radius: 1.65, count: 4, tiltX: -0.42, tiltZ: -0.35 },
  ];

  const electronGeo = new THREE.SphereGeometry(0.11, 16, 16);
  shells.forEach((sh, sIdx) => {
    const shellGroup = new THREE.Group();
    shellGroup.rotation.set(sh.tiltX, 0, sh.tiltZ);

    const ring = new THREE.Mesh(new THREE.TorusGeometry(sh.radius, 0.025, 16, 72), ringMat);
    shellGroup.add(ring);

    for (let e = 0; e < sh.count; e++) {
      const ang = (e * Math.PI * 2) / sh.count;
      const elec = new THREE.Mesh(electronGeo, electronMat);
      elec.position.set(Math.cos(ang) * sh.radius, Math.sin(ang) * sh.radius, 0);
      elec.castShadow = true;
      shellGroup.add(elec);
    }

    orbitals.add(shellGroup);
    reg(shellGroup, new THREE.Vector3(sIdx === 0 ? -0.6 : 0.6, 0.45 * (sIdx + 1), 0));
  });

  group.add(orbitals);
  return { group, orbitals };
}

export function StemLab3D() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const collapsedBtnRef = useRef<HTMLButtonElement>(null);
  const [modelPreset, setModelPreset] = useState<ModelPresetId>('microgrid');
  const [explodeAmount, setExplodeAmount] = useState(0);
  const [autoRotate, setAutoRotate] = useState(true);
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [contextLost, setContextLost] = useState(false);
  const [panelOffset, setPanelOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const dragSessionRef = useRef<{
    pointerId: number;
    startClientX: number;
    startClientY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);
  const rafDragRef = useRef<number | null>(null);
  const pendingOffsetRef = useRef<{ x: number; y: number } | null>(null);

  const clampPanelOffset = useCallback(
    (rawX: number, rawY: number) => {
      const viewport = viewportRef.current;
      const targetEl = dockCollapsed ? collapsedBtnRef.current : panelRef.current;
      if (!viewport || !targetEl) return { x: rawX, y: rawY };

      const margin = 12;
      const vw = viewport.clientWidth;
      const vh = viewport.clientHeight;
      const pw = targetEl.offsetWidth;
      const ph = targetEl.offsetHeight;

      const maxX = Math.max(0, (vw - pw) / 2 - margin);
      const maxY = Math.max(0, (vh - ph) / 2 - margin);

      return {
        x: Math.max(-maxX, Math.min(maxX, rawX)),
        y: Math.max(-maxY, Math.min(maxY, rawY)),
      };
    },
    [dockCollapsed]
  );

  useEffect(() => {
    const reClamp = () => {
      setPanelOffset((prev) => clampPanelOffset(prev.x, prev.y));
    };
    reClamp();
    window.addEventListener('resize', reClamp);
    return () => window.removeEventListener('resize', reClamp);
  }, [clampPanelOffset]);

  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (e: PointerEvent) => {
      const session = dragSessionRef.current;
      if (!session || e.pointerId !== session.pointerId) return;
      const dx = e.clientX - session.startClientX;
      const dy = e.clientY - session.startClientY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        session.moved = true;
      }
      pendingOffsetRef.current = clampPanelOffset(session.originX + dx, session.originY + dy);
      if (rafDragRef.current === null) {
        rafDragRef.current = requestAnimationFrame(() => {
          rafDragRef.current = null;
          if (pendingOffsetRef.current) {
            setPanelOffset(pendingOffsetRef.current);
          }
        });
      }
    };

    const stopDragging = (e: PointerEvent) => {
      const session = dragSessionRef.current;
      if (!session || e.pointerId !== session.pointerId) return;
      if (rafDragRef.current !== null) {
        cancelAnimationFrame(rafDragRef.current);
        rafDragRef.current = null;
      }
      if (pendingOffsetRef.current) {
        setPanelOffset(pendingOffsetRef.current);
        pendingOffsetRef.current = null;
      }
      setIsDragging(false);
      window.setTimeout(() => {
        if (dragSessionRef.current === session) {
          dragSessionRef.current = null;
        }
      }, 0);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerup', stopDragging);
    window.addEventListener('pointercancel', stopDragging);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopDragging);
      window.removeEventListener('pointercancel', stopDragging);
      if (rafDragRef.current !== null) {
        cancelAnimationFrame(rafDragRef.current);
        rafDragRef.current = null;
      }
    };
  }, [isDragging, clampPanelOffset]);

  const startPanelDrag = (e: ReactPointerEvent<HTMLElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    dragSessionRef.current = {
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      originX: panelOffset.x,
      originY: panelOffset.y,
      moved: false,
    };
    setIsDragging(true);
  };

  const stateRef = useRef({
    modelPreset: 'microgrid' as ModelPresetId,
    explodeTarget: 0,
    explodeCurrent: 0,
    autoRotate: true,
    cameraTargetPos: null as THREE.Vector3 | null,
    cameraTargetLook: null as THREE.Vector3 | null,
  });

  useEffect(() => {
    stateRef.current.modelPreset = modelPreset;
  }, [modelPreset]);

  useEffect(() => {
    stateRef.current.explodeTarget = explodeAmount;
  }, [explodeAmount]);

  useEffect(() => {
    stateRef.current.autoRotate = autoRotate;
  }, [autoRotate]);

  const setCameraPreset = (preset: CameraPresetId) => {
    if (preset === 'hero') {
      stateRef.current.cameraTargetPos = new THREE.Vector3(5.2, 3.6, 6.2);
      stateRef.current.cameraTargetLook = new THREE.Vector3(0, 1.3, 0);
    } else if (preset === 'top') {
      stateRef.current.cameraTargetPos = new THREE.Vector3(0.2, 8.0, 2.2);
      stateRef.current.cameraTargetLook = new THREE.Vector3(0, 0.8, 0);
    } else {
      stateRef.current.cameraTargetPos = new THREE.Vector3(2.8, 2.0, 3.2);
      stateRef.current.cameraTargetLook = new THREE.Vector3(0, 1.3, 0);
    }
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      const probe = document.createElement('canvas').getContext('webgl2');
      if (!probe) return true;
      const ext = probe.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
      const gpu = String(probe.getParameter(param));
      probe.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight - 64;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const handleLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const handleRestored = () => setContextLost(false);
    renderer.domElement.addEventListener('webglcontextlost', handleLost);
    renderer.domElement.addEventListener('webglcontextrestored', handleRestored);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x091020);
    scene.fog = new THREE.FogExp2(0x091020, 0.032);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(5.2, 3.6, 6.2);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.3, 0);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.minDistance = 2.6;
    controls.maxDistance = 16;
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
    controls.addEventListener('start', () => {
      stateRef.current.cameraTargetPos = null;
      stateRef.current.cameraTargetLook = null;
    });

    // 3-Point Studio Lighting Rig
    const hemi = new THREE.HemisphereLight(0x93c5fd, 0x0f172a, 0.75);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff1dc, 2.2);
    keyLight.position.set(5, 8, 5);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.left = -5;
    keyLight.shadow.camera.right = 5;
    keyLight.shadow.camera.top = 5;
    keyLight.shadow.camera.bottom = -5;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.9);
    rimLight.position.set(-5, 4, -5);
    scene.add(rimLight);

    // Studio Floor & Radial Contact Shadow
    const floorTex = createFloorGridTexture(renderer);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.88, metalness: 0.1 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const shadowTex = createContactShadowTexture();
    const contactShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(6.5, 6.5),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.6 })
    );
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = 0.015;
    scene.add(contactShadow);

    // Build all 3 Composite Models
    const explodableParts: Record<ModelPresetId, ExplodablePart[]> = {
      microgrid: [],
      arduino: [],
      atom: [],
    };

    const microgrid = buildMicrogridGroup(renderer, explodableParts.microgrid);
    const arduinoGroup = buildArduinoGroup(explodableParts.arduino);
    const bohr = buildBohrAtomGroup(explodableParts.atom);

    scene.add(microgrid.group);
    scene.add(arduinoGroup);
    scene.add(bohr.group);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const _scratchVec = new THREE.Vector3();
    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const st = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (st === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (disposed) return;
      const dt = Math.min(0.05, clock.getDelta());
      const activeId = stateRef.current.modelPreset;

      microgrid.group.visible = activeId === 'microgrid';
      arduinoGroup.visible = activeId === 'arduino';
      bohr.group.visible = activeId === 'atom';

      // Animate sub-mechanisms
      microgrid.rotor.rotation.z -= dt * 1.8;
      bohr.orbitals.children.forEach((shell, idx) => {
        shell.rotation.z += dt * (idx === 0 ? 1.4 : -0.9);
      });

      // Smooth Exploded-View Damping
      stateRef.current.explodeCurrent = THREE.MathUtils.damp(
        stateRef.current.explodeCurrent,
        stateRef.current.explodeTarget,
        6,
        dt
      );
      const ex = stateRef.current.explodeCurrent;
      for (const part of explodableParts[activeId]) {
        _scratchVec.copy(part.explodeOffset).multiplyScalar(ex);
        part.obj.position.copy(part.basePos).add(_scratchVec);
      }

      // Smooth Camera Preset Transitions
      if (stateRef.current.cameraTargetPos && stateRef.current.cameraTargetLook) {
        const alpha = 1 - Math.exp(-5 * dt);
        camera.position.lerp(stateRef.current.cameraTargetPos, alpha);
        controls.target.lerp(stateRef.current.cameraTargetLook, alpha);
        if (camera.position.distanceTo(stateRef.current.cameraTargetPos) < 0.04) {
          stateRef.current.cameraTargetPos = null;
          stateRef.current.cameraTargetLook = null;
        }
      }

      controls.autoRotate = stateRef.current.autoRotate && !isSoftwareGl;
      controls.autoRotateSpeed = 0.85;
      controls.update();

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight - 64;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('webglcontextlost', handleLost);
      renderer.domElement.removeEventListener('webglcontextrestored', handleRestored);
      controls.dispose();
      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          mesh.geometry.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else {
            mesh.material.dispose();
          }
        }
      });
      envTarget.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  const MODEL_LABELS: Record<ModelPresetId, { title: string; subtitle: string }> = {
    microgrid: {
      title: 'Solar & Wind Microgrid Array',
      subtitle: 'UN SDG 4 · Clean Energy Classroom Twin',
    },
    arduino: {
      title: 'Arduino Uno & 4-Squad Buzzer Rig',
      subtitle: 'Hardware CAD Twin · Pins D2–D5 + I2C LCD',
    },
    atom: {
      title: 'Bohr Carbon-12 Atomic Orbital',
      subtitle: '6 Protons · 6 Neutrons · 2 Electron Shells',
    },
  };

  const isPanelMoved = Math.abs(panelOffset.x) > 1 || Math.abs(panelOffset.y) > 1;

  return (
    <div ref={viewportRef} className="relative w-full h-[calc(100vh-4rem)] overflow-hidden bg-[#091020]">
      {/* Isolated WebGL Mount Container */}
      <div ref={mountRef} className="w-full h-full" />

      {contextLost && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#091020] text-white p-6 text-center">
          <div>
            <p className="font-display text-xl font-bold">WebGL Context Paused</p>
            <p className="text-xs text-slate-300 mt-1">Restoring 3D STEM Lab viewport...</p>
          </div>
        </div>
      )}

      {/* Minimal Top-Left Spec Readout (Solid rgba, no backdrop-filter over WebGL) */}
      <div
        className="absolute top-4 left-4 z-10 px-4 py-2.5 rounded-xl border border-white/10 text-white pointer-events-none"
        style={{ backgroundColor: 'rgba(9, 16, 32, 0.86)' }}
      >
        <p className="text-[11px] font-semibold text-sky-300">
          3D Interactive STEM Lab · Drag to Orbit · Scroll to Zoom
        </p>
        <h1 className="font-display text-base sm:text-lg font-bold leading-tight mt-0.5">
          {MODEL_LABELS[modelPreset].title}
        </h1>
        <p className="text-[11px] text-slate-300">{MODEL_LABELS[modelPreset].subtitle}</p>
      </div>

      {/* Centered, Freely Draggable Compact Glassmorphism Control Panel */}
      <div className="absolute inset-0 z-20 flex items-center justify-center p-3 sm:p-4 pointer-events-none">
        {dockCollapsed ? (
          <button
            ref={collapsedBtnRef}
            type="button"
            aria-expanded={false}
            onPointerDown={startPanelDrag}
            onClick={() => {
              if (dragSessionRef.current?.moved) return;
              setDockCollapsed(false);
            }}
            className={`pointer-events-auto inline-flex items-center gap-2 min-h-[44px] sm:min-h-[38px] px-4 py-2 rounded-full text-xs font-semibold text-white border border-white/25 backdrop-blur-xl hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 whitespace-nowrap select-none touch-none ${
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
            style={{
              backgroundColor: 'rgba(11, 18, 36, 0.42)',
              boxShadow: '0 10px 32px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.18)',
              transform: `translate3d(${panelOffset.x}px, ${panelOffset.y}px, 0)`,
              transition: isDragging
                ? 'none'
                : 'transform 260ms cubic-bezier(0.16, 1, 0.3, 1), background-color 180ms ease',
            }}
          >
            <GripHorizontal className="w-3.5 h-3.5 text-slate-300/80" />
            <ChevronUp className="w-4 h-4 text-sky-300" />
            <span>Show Controls</span>
          </button>
        ) : (
          <div
            ref={panelRef}
            role="region"
            aria-label="3D model controls"
            className="pointer-events-auto w-full max-w-[390px] sm:max-w-[430px] rounded-2xl p-3.5 sm:p-4 text-white border border-white/20 backdrop-blur-xl space-y-2.5"
            style={{
              backgroundColor: 'rgba(11, 18, 36, 0.38)',
              boxShadow: isDragging
                ? '0 22px 56px rgba(0, 0, 0, 0.52), inset 0 1px 0 rgba(255, 255, 255, 0.24)'
                : '0 16px 48px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.18)',
              transform: `translate3d(${panelOffset.x}px, ${panelOffset.y}px, 0)`,
              transition: isDragging
                ? 'none'
                : 'transform 260ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 200ms ease',
              willChange: isDragging ? 'transform' : 'auto',
            }}
          >
            {/* Draggable Panel Header */}
            <div
              onPointerDown={startPanelDrag}
              className={`flex items-center justify-between gap-2 pb-1 select-none touch-none ${
                isDragging ? 'cursor-grabbing' : 'cursor-grab'
              }`}
              title="Click and hold to drag panel"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <GripHorizontal className="w-4 h-4 text-sky-300/85 shrink-0" />
                <span className="text-xs font-semibold tracking-wide text-slate-100 whitespace-nowrap truncate">
                  Model Controls
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => setPanelOffset({ x: 0, y: 0 })}
                  className={`inline-flex items-center justify-center min-h-[36px] min-w-[36px] sm:min-h-[28px] sm:min-w-[28px] px-2 py-1 rounded-lg text-[11px] font-semibold border border-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                    isPanelMoved
                      ? 'bg-sky-500/20 text-sky-200 hover:bg-sky-500/30'
                      : 'bg-white/10 text-slate-300/75 hover:bg-white/20 hover:text-white'
                  }`}
                  title="Reset panel position"
                  aria-label="Reset panel position"
                >
                  <LocateFixed className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  aria-expanded={true}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => setDockCollapsed(true)}
                  className="inline-flex items-center gap-1 min-h-[36px] sm:min-h-[28px] px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-200 bg-white/10 hover:bg-white/20 border border-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 whitespace-nowrap shrink-0"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span>Hide</span>
                </button>
              </div>
            </div>

            {/* Model Switcher */}
            <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-white/10 border border-white/10">
              {(
                [
                  { id: 'microgrid', label: 'Microgrid' },
                  { id: 'arduino', label: 'Arduino Rig' },
                  { id: 'atom', label: 'Carbon Atom' },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setModelPreset(item.id)}
                  className="min-h-[44px] sm:min-h-[36px] px-2 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                  style={{
                    backgroundColor: modelPreset === item.id ? 'rgba(57, 123, 255, 0.88)' : 'transparent',
                    color: modelPreset === item.id ? '#ffffff' : '#e2e8f0',
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Exploded View Slider */}
            <label className="flex items-center gap-3 min-h-[44px] sm:min-h-[38px] px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold">
              <span className="whitespace-nowrap text-slate-200">Explode</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={explodeAmount}
                onChange={(e) => setExplodeAmount(Number(e.target.value))}
                className="flex-1 min-w-0 accent-sky-400 cursor-pointer"
              />
              <span className="font-mono text-[11px] tabular-nums w-9 text-right text-sky-300">
                {Math.round(explodeAmount * 100)}%
              </span>
            </label>

            {/* Camera & Orbit Controls */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCameraPreset('hero')}
                className="flex-1 min-h-[44px] sm:min-h-[36px] px-2.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold bg-white/10 hover:bg-white/20 border border-white/10 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
              >
                Hero
              </button>
              <button
                type="button"
                onClick={() => setCameraPreset('top')}
                className="flex-1 min-h-[44px] sm:min-h-[36px] px-2.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold bg-white/10 hover:bg-white/20 border border-white/10 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
              >
                Top
              </button>
              <button
                type="button"
                onClick={() => setCameraPreset('detail')}
                className="flex-1 min-h-[44px] sm:min-h-[36px] px-2.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold bg-white/10 hover:bg-white/20 border border-white/10 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => setAutoRotate((a) => !a)}
                className="flex-1 min-h-[44px] sm:min-h-[36px] px-2.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold border border-white/10 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                style={{
                  backgroundColor: autoRotate ? 'rgba(57, 123, 255, 0.88)' : 'rgba(255, 255, 255, 0.1)',
                }}
              >
                {autoRotate ? 'Spin On' : 'Spin Off'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setExplodeAmount(0);
                  setCameraPreset('hero');
                }}
                className="min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] inline-flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                title="Reset view"
                aria-label="Reset view"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
