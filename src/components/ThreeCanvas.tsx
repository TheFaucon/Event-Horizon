/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';

import { CameraPreset, SimulationConfig } from '../types/simulation';
import {
  BASE_BLACK_HOLE_GM,
  calculateKeplerianAngularVelocity,
  computeDopplerBeamingFactor,
  computeGravitationalAcceleration,
  computeInwardDrift,
  computeSpaghettificationScale,
  computeStableOrbitalVelocity,
  getParticleColorByRadius,
  COLOR_PALETTES,
} from '../utils/physics';
import {
  createAsteroidGeometry,
  createAsteroidTextures,
  createNebulaTexture,
  createParticleTexture,
} from '../utils/textures';
import { spaceAudio } from '../audio/spaceAudio';

interface NewtonianProbe {
  id: number;
  mesh: THREE.Mesh;
  glowMesh: THREE.Mesh;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  active: boolean;
  birthTime: number;
}

interface AsteroidBody {
  id: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  scale: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  spinSpeedX: number;
  spinSpeedY: number;
  consumed: boolean;
}

interface ThreeCanvasProps {
  config: SimulationConfig;
  cameraPreset: CameraPreset | null;
  onCameraPresetHandled: () => void;
  onAsteroidConsumed?: (id: number, distanceAU: number) => void;
  onProbeConsumed?: (id: number, distanceAU: number) => void;
  launchProbeTrigger: number;
  respawnBeltTrigger: number;
  onTelemetryUpdate: (fps: number, activeParticles: number) => void;
}

// Pre-allocated math scratchpads (Zero-GC in render loop)
const _scratchVec3 = new THREE.Vector3();
const _scratchPos = new THREE.Vector3();
const _scratchMatrix = new THREE.Matrix4();
const _scratchEuler = new THREE.Euler();
const _scratchQuat = new THREE.Quaternion();
const _scratchColor = new THREE.Color();
const _camPosTarget = new THREE.Vector3();
const _camLookTarget = new THREE.Vector3();
const _scratchTarget = new THREE.Vector3();

const MAX_PARTICLES = 30000;
const MAX_ASTEROIDS = 1200;
const EVENT_HORIZON_RADIUS = 3.2;
const ISCO_RADIUS = 4.2;
const DISK_OUTER_RADIUS = 28.0;

export const ThreeCanvas: React.FC<ThreeCanvasProps> = ({
  config,
  cameraPreset,
  onCameraPresetHandled,
  onAsteroidConsumed,
  onProbeConsumed,
  launchProbeTrigger,
  respawnBeltTrigger,
  onTelemetryUpdate,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const configRef = useRef(config);
  configRef.current = config;

  // Refs for scene interaction & physics
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const probesRef = useRef<NewtonianProbe[]>([]);
  const probeIdCounterRef = useRef<number>(1);
  const isTransitioningCameraRef = useRef(false);

  // Asteroid belt data ref
  const asteroidBodiesRef = useRef<AsteroidBody[]>([]);
  const asteroidMeshRef = useRef<THREE.InstancedMesh | null>(null);

  // Trigger launch probe with Newtonian initial trajectory
  useEffect(() => {
    if (launchProbeTrigger === 0 || !sceneRef.current) return;
    
    // Launch a new probe from outer accretion boundary
    const spawnAngle = Math.random() * Math.PI * 2;
    const spawnRadius = DISK_OUTER_RADIUS + (Math.random() * 4 - 1);
    const spawnHeight = (Math.random() - 0.5) * 1.5;

    const x = Math.cos(spawnAngle) * spawnRadius;
    const y = spawnHeight;
    const z = Math.sin(spawnAngle) * spawnRadius;

    // Stable orbital velocity with an inward decay kick
    const [baseVx, baseVy, baseVz] = computeStableOrbitalVelocity(x, y, z, BASE_BLACK_HOLE_GM);
    // 82% tangential velocity initiates an inward spiral trajectory under gravity
    const vx = baseVx * 0.82;
    const vy = baseVy;
    const vz = baseVz * 0.82;

    const probeGeo = new THREE.SphereGeometry(0.35, 16, 16);
    const probeMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
    });
    const probeMesh = new THREE.Mesh(probeGeo, probeMat);

    // Glowing aura
    const auraGeo = new THREE.SphereGeometry(0.75, 16, 16);
    const auraMat = new THREE.MeshBasicMaterial({
      color: 0x60a5fa,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });
    const glowMesh = new THREE.Mesh(auraGeo, auraMat);
    probeMesh.add(glowMesh);

    probeMesh.position.set(x, y, z);
    sceneRef.current.add(probeMesh);

    const probeId = probeIdCounterRef.current++;
    probesRef.current.push({
      id: probeId,
      mesh: probeMesh,
      glowMesh,
      x,
      y,
      z,
      vx,
      vy,
      vz,
      active: true,
      birthTime: performance.now(),
    });

    spaceAudio.playProbeLaunch();
  }, [launchProbeTrigger]);

  // Respawn Asteroid Belt trigger
  useEffect(() => {
    if (respawnBeltTrigger === 0 || !asteroidMeshRef.current) return;

    const mesh = asteroidMeshRef.current;
    const bodies = asteroidBodiesRef.current;
    const beltRadius = configRef.current.asteroidBeltRadius;
    const beltWidth = configRef.current.asteroidBeltWidth;

    for (let i = 0; i < MAX_ASTEROIDS; i++) {
      const r = (beltRadius - beltWidth / 2) + Math.random() * beltWidth;
      const angle = Math.random() * Math.PI * 2;
      const x = Math.cos(angle) * r;
      const y = (Math.random() - 0.5) * (beltWidth * 0.12);
      const z = Math.sin(angle) * r;

      const [vx, vy, vz] = computeStableOrbitalVelocity(x, y, z, BASE_BLACK_HOLE_GM, (Math.random() - 0.5) * 0.05);
      const scale = 0.35 + Math.random() * 0.85;

      bodies[i] = {
        id: i + 1,
        x,
        y,
        z,
        vx,
        vy,
        vz,
        scale,
        rotX: Math.random() * Math.PI,
        rotY: Math.random() * Math.PI,
        rotZ: Math.random() * Math.PI,
        spinSpeedX: (Math.random() - 0.5) * 1.5,
        spinSpeedY: (Math.random() - 0.5) * 1.5,
        consumed: false,
      };

      _scratchPos.set(x, y, z);
      _scratchEuler.set(bodies[i].rotX, bodies[i].rotY, bodies[i].rotZ);
      _scratchQuat.setFromEuler(_scratchEuler);
      _scratchVec3.set(scale, scale, scale);
      _scratchMatrix.compose(_scratchPos, _scratchQuat, _scratchVec3);
      mesh.setMatrixAt(i, _scratchMatrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
  }, [respawnBeltTrigger]);

  // Handle camera presets
  useEffect(() => {
    if (!cameraPreset || !cameraRef.current || !controlsRef.current) return;

    isTransitioningCameraRef.current = true;
    switch (cameraPreset) {
      case 'orbital':
        _camPosTarget.set(28, 22, 38);
        _camLookTarget.set(0, 0, 0);
        break;
      case 'equatorial':
        _camPosTarget.set(34, 1.2, 8);
        _camLookTarget.set(0, 0, 0);
        break;
      case 'close_horizon':
        _camPosTarget.set(7.5, 2.5, 9.5);
        _camLookTarget.set(0, 0, 0);
        break;
      case 'polar':
        _camPosTarget.set(0.1, 48, 0.1);
        _camLookTarget.set(0, 0, 0);
        break;
      case 'asteroid_belt':
        _camPosTarget.set(configRef.current.asteroidBeltRadius + 2, 2.5, 12);
        _camLookTarget.set(0, 0, 0);
        break;
    }

    onCameraPresetHandled();
  }, [cameraPreset, onCameraPresetHandled]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Headless / automation check
    const isHeadless = navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent);

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.fog = new THREE.FogExp2(0x020308, 0.0015);

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const camera = new THREE.PerspectiveCamera(58, width / height, 0.1, 2500);
    camera.position.set(28, 20, 36);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isHeadless,
      powerPreference: 'high-performance',
      stencil: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isHeadless ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);

    // 2. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 4.8;
    controls.maxDistance = 220;
    controls.maxPolarAngle = Math.PI * 0.95;
    controls.target.set(0, 0, 0);

    // 3. Lighting Rig
    const centerPointLight = new THREE.PointLight(0xffa233, 4.5, 140, 1.2);
    centerPointLight.position.set(0, 0, 0);
    scene.add(centerPointLight);

    const hemiLight = new THREE.HemisphereLight(0x1e293b, 0x020617, 0.8);
    scene.add(hemiLight);

    const keyDirectional = new THREE.DirectionalLight(0xffffff, 0.6);
    keyDirectional.position.set(50, 60, 40);
    scene.add(keyDirectional);

    // 4. Hero Subject: Black Hole Assembly
    const blackHoleGroup = new THREE.Group();
    scene.add(blackHoleGroup);

    // (A) Event Horizon Sphere
    const eventHorizonGeo = new THREE.SphereGeometry(EVENT_HORIZON_RADIUS, 64, 64);
    const eventHorizonMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      depthWrite: true,
    });
    const eventHorizonMesh = new THREE.Mesh(eventHorizonGeo, eventHorizonMat);
    eventHorizonMesh.renderOrder = 10;
    blackHoleGroup.add(eventHorizonMesh);

    // (B) Photon Ring Glow Disk
    const photonRingRadius = EVENT_HORIZON_RADIUS * 1.48;
    const photonRingGeo = new THREE.RingGeometry(EVENT_HORIZON_RADIUS * 1.02, photonRingRadius * 1.3, 96);
    const photonRingMat = new THREE.MeshBasicMaterial({
      color: 0xffd27d,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const photonRingMesh = new THREE.Mesh(photonRingGeo, photonRingMat);
    photonRingMesh.rotation.x = Math.PI / 2;
    blackHoleGroup.add(photonRingMesh);

    // (C) Vertical Einstein Ring Halo
    const haloGeo = new THREE.RingGeometry(EVENT_HORIZON_RADIUS * 1.05, photonRingRadius * 1.35, 96);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xffa033,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const haloMesh = new THREE.Mesh(haloGeo, haloMat);
    blackHoleGroup.add(haloMesh);

    // (D) Relativistic Bipolar Jets
    const jetGroup = new THREE.Group();
    blackHoleGroup.add(jetGroup);

    const jetConeGeo = new THREE.CylinderGeometry(2.6, 0.2, 42, 32, 1, true);
    const jetConeMat = new THREE.MeshBasicMaterial({
      color: 0x93c5fd,
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const upperJet = new THREE.Mesh(jetConeGeo, jetConeMat);
    upperJet.position.y = 24.5;
    jetGroup.add(upperJet);

    const lowerJet = new THREE.Mesh(jetConeGeo, jetConeMat);
    lowerJet.position.y = -24.5;
    lowerJet.rotation.x = Math.PI;
    jetGroup.add(lowerJet);

    // (E) Accretion Fluid Gas Disks
    const fluidDiskGeo = new THREE.RingGeometry(ISCO_RADIUS, DISK_OUTER_RADIUS, 96, 12);
    const fluidDiskMat = new THREE.MeshBasicMaterial({
      color: 0xff7700,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const fluidDiskMesh = new THREE.Mesh(fluidDiskGeo, fluidDiskMat);
    fluidDiskMesh.rotation.x = Math.PI / 2;
    blackHoleGroup.add(fluidDiskMesh);

    // 5. Procedural Accretion Disk Particles
    const particleTexture = createParticleTexture();
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(MAX_PARTICLES * 3);
    const particleColors = new Float32Array(MAX_PARTICLES * 3);
    const particleSizes = new Float32Array(MAX_PARTICLES);

    const radii = new Float32Array(MAX_PARTICLES);
    const angles = new Float32Array(MAX_PARTICLES);
    const speeds = new Float32Array(MAX_PARTICLES);
    const verticalAmps = new Float32Array(MAX_PARTICLES);
    const verticalPhases = new Float32Array(MAX_PARTICLES);
    const baseSizes = new Float32Array(MAX_PARTICLES);

    const activePalette = COLOR_PALETTES[configRef.current.colorPaletteId] || COLOR_PALETTES.gargantua;

    for (let i = 0; i < MAX_PARTICLES; i++) {
      const u = Math.random();
      const r = ISCO_RADIUS + Math.pow(u, 1.45) * (DISK_OUTER_RADIUS - ISCO_RADIUS);
      const theta = Math.random() * Math.PI * 2;
      const speed = calculateKeplerianAngularVelocity(r);
      const vertAmp = 0.15 + (r / DISK_OUTER_RADIUS) * 0.9;
      const vertPhase = Math.random() * Math.PI * 2;
      const size = 0.45 + Math.random() * 0.95;

      radii[i] = r;
      angles[i] = theta;
      speeds[i] = speed;
      verticalAmps[i] = vertAmp;
      verticalPhases[i] = vertPhase;
      baseSizes[i] = size;

      const x = Math.cos(theta) * r;
      const y = Math.sin(vertPhase) * (vertAmp * 0.4);
      const z = Math.sin(theta) * r;

      particlePositions[i * 3] = x;
      particlePositions[i * 3 + 1] = y;
      particlePositions[i * 3 + 2] = z;

      const [cr, cg, cb] = getParticleColorByRadius(r, ISCO_RADIUS, DISK_OUTER_RADIUS, activePalette);
      particleColors[i * 3] = cr;
      particleColors[i * 3 + 1] = cg;
      particleColors[i * 3 + 2] = cb;

      particleSizes[i] = size;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
    particleGeo.setAttribute('size', new THREE.BufferAttribute(particleSizes, 1));

    const particleMat = new THREE.PointsMaterial({
      size: 0.85,
      map: particleTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      depthWrite: false,
    });

    const particlePoints = new THREE.Points(particleGeo, particleMat);
    scene.add(particlePoints);

    // 6. Newtonian Orbital Asteroid Belt (InstancedMesh)
    const { bumpMap, roughnessMap } = createAsteroidTextures();
    const asteroidGeo = createAsteroidGeometry(1.0, 1);
    const asteroidMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.85,
      metalness: 0.12,
      bumpMap: bumpMap,
      bumpScale: 0.08,
      roughnessMap: roughnessMap,
      flatShading: true,
    });

    const asteroidMesh = new THREE.InstancedMesh(asteroidGeo, asteroidMat, MAX_ASTEROIDS);
    asteroidMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(asteroidMesh);
    asteroidMeshRef.current = asteroidMesh;

    // Initialize Asteroid Bodies with 3D positions and stable orbital velocity vectors
    const asteroidBodies: AsteroidBody[] = [];
    const initialBeltRadius = configRef.current.asteroidBeltRadius;
    const initialBeltWidth = configRef.current.asteroidBeltWidth;

    for (let i = 0; i < MAX_ASTEROIDS; i++) {
      const r = (initialBeltRadius - initialBeltWidth / 2) + Math.random() * initialBeltWidth;
      const angle = Math.random() * Math.PI * 2;
      const x = Math.cos(angle) * r;
      const y = (Math.random() - 0.5) * (initialBeltWidth * 0.12);
      const z = Math.sin(angle) * r;

      const [vx, vy, vz] = computeStableOrbitalVelocity(x, y, z, BASE_BLACK_HOLE_GM, (Math.random() - 0.5) * 0.05);
      const scale = 0.35 + Math.random() * 0.85;

      asteroidBodies.push({
        id: i + 1,
        x,
        y,
        z,
        vx,
        vy,
        vz,
        scale,
        rotX: Math.random() * Math.PI,
        rotY: Math.random() * Math.PI,
        rotZ: Math.random() * Math.PI,
        spinSpeedX: (Math.random() - 0.5) * 1.5,
        spinSpeedY: (Math.random() - 0.5) * 1.5,
        consumed: false,
      });

      _scratchPos.set(x, y, z);
      _scratchEuler.set(asteroidBodies[i].rotX, asteroidBodies[i].rotY, asteroidBodies[i].rotZ);
      _scratchQuat.setFromEuler(_scratchEuler);
      _scratchVec3.set(scale, scale, scale);

      _scratchMatrix.compose(_scratchPos, _scratchQuat, _scratchVec3);
      asteroidMesh.setMatrixAt(i, _scratchMatrix);

      // Random tint variation (slate grey, iron rust, chondrite dark)
      const tintShade = 0.7 + Math.random() * 0.5;
      const rust = Math.random() > 0.6 ? 0.15 : 0;
      _scratchColor.setRGB(tintShade * (0.8 + rust), tintShade * 0.8, tintShade * 0.75);
      asteroidMesh.setColorAt(i, _scratchColor);
    }
    asteroidMesh.instanceMatrix.needsUpdate = true;
    if (asteroidMesh.instanceColor) asteroidMesh.instanceColor.needsUpdate = true;
    asteroidMesh.count = configRef.current.asteroidCount;
    asteroidBodiesRef.current = asteroidBodies;

    // 7. Dynamic Starfield & Nebula Background
    const starCount = 5500;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const dist = 750 + Math.random() * 850;

      const x = dist * Math.sin(phi) * Math.cos(theta);
      const y = dist * Math.sin(phi) * Math.sin(theta);
      const z = dist * Math.cos(phi);

      starPos[i * 3] = x;
      starPos[i * 3 + 1] = y;
      starPos[i * 3 + 2] = z;

      const starType = Math.random();
      if (starType < 0.25) {
        starColors[i * 3] = 0.75;
        starColors[i * 3 + 1] = 0.85;
        starColors[i * 3 + 2] = 1.0;
      } else if (starType < 0.65) {
        starColors[i * 3] = 0.95;
        starColors[i * 3 + 1] = 0.95;
        starColors[i * 3 + 2] = 0.95;
      } else if (starType < 0.88) {
        starColors[i * 3] = 1.0;
        starColors[i * 3 + 1] = 0.85;
        starColors[i * 3 + 2] = 0.6;
      } else {
        starColors[i * 3] = 1.0;
        starColors[i * 3 + 1] = 0.5;
        starColors[i * 3 + 2] = 0.4;
      }
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    const starMat = new THREE.PointsMaterial({
      size: 1.6,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
    });
    const starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);

    // Deep cosmic dust clouds (Nebula billboards)
    const nebulaTex = createNebulaTexture();
    const nebulaGroup = new THREE.Group();
    scene.add(nebulaGroup);

    for (let i = 0; i < 18; i++) {
      const nebulaGeo = new THREE.PlaneGeometry(350, 350);
      const nebulaMat = new THREE.MeshBasicMaterial({
        map: nebulaTex,
        transparent: true,
        opacity: 0.08 + Math.random() * 0.07,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const nebulaMesh = new THREE.Mesh(nebulaGeo, nebulaMat);
      
      const phi = Math.random() * Math.PI;
      const theta = Math.random() * Math.PI * 2;
      const dist = 650;
      nebulaMesh.position.set(
        dist * Math.sin(phi) * Math.cos(theta),
        dist * Math.sin(phi) * Math.sin(theta),
        dist * Math.cos(phi)
      );
      nebulaMesh.lookAt(0, 0, 0);
      nebulaMesh.rotation.z = Math.random() * Math.PI * 2;
      nebulaGroup.add(nebulaMesh);
    }

    // 8. Post-Processing Pipeline
    let composer: EffectComposer | null = null;
    let bloomPass: UnrealBloomPass | null = null;
    let fxaaPass: ShaderPass | null = null;

    if (!isHeadless) {
      composer = new EffectComposer(renderer);
      const renderPass = new RenderPass(scene, camera);
      composer.addPass(renderPass);

      bloomPass = new UnrealBloomPass(
        new THREE.Vector2(width, height),
        configRef.current.bloomStrength,
        0.55,
        configRef.current.bloomThreshold
      );
      composer.addPass(bloomPass);

      fxaaPass = new ShaderPass(FXAAShader);
      const pixelRatio = renderer.getPixelRatio();
      fxaaPass.material.uniforms['resolution'].value.set(
        1 / (width * pixelRatio),
        1 / (height * pixelRatio)
      );
      composer.addPass(fxaaPass);
    }

    // 9. Window Resize Handling
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;

      camera.aspect = w / h;
      camera.updateProjectionMatrix();

      renderer.setSize(w, h);
      if (composer) {
        composer.setSize(w, h);
      }
      if (bloomPass) {
        bloomPass.resolution.set(w, h);
      }
      if (fxaaPass) {
        const pr = renderer.getPixelRatio();
        fxaaPass.material.uniforms['resolution'].value.set(1 / (w * pr), 1 / (h * pr));
      }
    };
    window.addEventListener('resize', handleResize);

    // Pre-warm shaders
    renderer.compile(scene, camera);

    // 10. Real-time Newtonian Physics & Render Loop
    let animationFrameId: number;
    let lastTime = performance.now();
    let frameCount = 0;
    let lastFpsUpdate = performance.now();

    const animate = (currentTime: number) => {
      animationFrameId = requestAnimationFrame(animate);

      const deltaMs = currentTime - lastTime;
      lastTime = currentTime;
      const dt = Math.min(deltaMs / 1000, 0.08);

      // FPS Telemetry calculation (throttled to 4 Hz)
      frameCount++;
      if (currentTime - lastFpsUpdate >= 250) {
        const calculatedFps = Math.round((frameCount * 1000) / (currentTime - lastFpsUpdate));
        onTelemetryUpdate(calculatedFps, configRef.current.particleCount);
        frameCount = 0;
        lastFpsUpdate = currentTime;
      }

      const cfg = configRef.current;
      const timeScale = cfg.isPaused ? 0 : 1;

      // Update Audio Engine Parameters
      if (cfg.audioEnabled) {
        spaceAudio.updateParameters(cfg.rotationSpeed);
      }

      // Camera Smooth Transition Damping
      if (isTransitioningCameraRef.current) {
        camera.position.x = THREE.MathUtils.damp(camera.position.x, _camPosTarget.x, 3.5, dt);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, _camPosTarget.y, 3.5, dt);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, _camPosTarget.z, 3.5, dt);

        controls.target.x = THREE.MathUtils.damp(controls.target.x, _camLookTarget.x, 3.5, dt);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, _camLookTarget.y, 3.5, dt);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, _camLookTarget.z, 3.5, dt);

        if (camera.position.distanceTo(_camPosTarget) < 0.25) {
          isTransitioningCameraRef.current = false;
        }
      }

      // Auto-rotate camera if enabled
      if (cfg.autoRotateCamera && !isTransitioningCameraRef.current) {
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.75 * cfg.rotationSpeed;
      } else {
        controls.autoRotate = false;
      }

      controls.update();

      // Camera azimuth angle for Doppler beaming
      _scratchVec3.copy(camera.position).sub(controls.target);
      const cameraAzimuth = Math.atan2(_scratchVec3.z, _scratchVec3.x);

      // Rotate Einstein Ring Halo to always face the camera
      haloMesh.lookAt(camera.position);

      // Color Palette updates
      const currentPalette = COLOR_PALETTES[cfg.colorPaletteId] || COLOR_PALETTES.gargantua;
      photonRingMat.color.set(currentPalette.photonRing);
      haloMat.color.set(currentPalette.photonRing);
      centerPointLight.color.set(currentPalette.midDisk);
      jetConeMat.color.set(currentPalette.jetColor);
      fluidDiskMat.color.set(currentPalette.midDisk);

      // Relativistic Jets Visibility
      jetGroup.visible = cfg.relativisticJets;
      if (cfg.relativisticJets) {
        upperJet.rotation.y += dt * 1.5 * cfg.rotationSpeed * timeScale;
        lowerJet.rotation.y += dt * 1.5 * cfg.rotationSpeed * timeScale;
      }

      // Accretion disk fluid mesh rotation
      fluidDiskMesh.rotation.z += dt * 0.15 * cfg.rotationSpeed * timeScale;

      // Update Accretion Particles
      const activeCount = Math.min(cfg.particleCount, MAX_PARTICLES);
      const posArray = particlePositions;
      const colArray = particleColors;
      const sizeArray = particleSizes;

      for (let i = 0; i < activeCount; i++) {
        if (timeScale > 0) {
          const omega = speeds[i] * cfg.rotationSpeed;
          angles[i] += omega * dt;

          if (cfg.gravityPull > 0) {
            const drift = computeInwardDrift(radii[i], EVENT_HORIZON_RADIUS, cfg.gravityPull, dt);
            radii[i] -= drift;

            if (radii[i] <= EVENT_HORIZON_RADIUS + 0.1) {
              radii[i] = DISK_OUTER_RADIUS - (Math.random() * 2.5);
              speeds[i] = calculateKeplerianAngularVelocity(radii[i]);
            } else {
              speeds[i] = calculateKeplerianAngularVelocity(radii[i]);
            }
          }
        }

        const r = radii[i];
        const theta = angles[i];
        const vertY = Math.sin(verticalPhases[i] + currentTime * 0.0018) * (verticalAmps[i] * 0.5);

        posArray[i * 3] = Math.cos(theta) * r;
        posArray[i * 3 + 1] = vertY;
        posArray[i * 3 + 2] = Math.sin(theta) * r;

        const [cr, cg, cb] = getParticleColorByRadius(r, ISCO_RADIUS, DISK_OUTER_RADIUS, currentPalette);

        let dopplerFactor = 1.0;
        if (cfg.dopplerBeaming) {
          dopplerFactor = computeDopplerBeamingFactor(theta, cameraAzimuth, 0.42);
        }

        colArray[i * 3] = Math.min(cr * dopplerFactor, 1.0);
        colArray[i * 3 + 1] = Math.min(cg * dopplerFactor, 1.0);
        colArray[i * 3 + 2] = Math.min(cb * dopplerFactor, 1.0);

        sizeArray[i] = baseSizes[i] * (0.8 + dopplerFactor * 0.35);
      }

      particleGeo.setDrawRange(0, activeCount);
      particleGeo.attributes.position.needsUpdate = true;
      particleGeo.attributes.color.needsUpdate = true;
      particleGeo.attributes.size.needsUpdate = true;

      // 11. Newtonian Orbital Physics for Asteroid Belt
      // Effective gravitational parameter scaled by "Gravity Pull" slider
      const effectiveGM = BASE_BLACK_HOLE_GM * cfg.gravityPull;
      const activeAsteroidCount = Math.min(cfg.asteroidCount, MAX_ASTEROIDS);
      asteroidMesh.count = activeAsteroidCount;
      const bodies = asteroidBodiesRef.current;

      for (let i = 0; i < activeAsteroidCount; i++) {
        const ast = bodies[i];
        if (!ast) continue;

        if (ast.consumed) {
          // Hide consumed asteroid far outside the frustum
          _scratchPos.set(0, -99999, 0);
          _scratchMatrix.makeTranslation(0, -99999, 0);
          asteroidMesh.setMatrixAt(i, _scratchMatrix);
          continue;
        }

        if (timeScale > 0) {
          // Newtonian inverse-square gravitational acceleration: a = - (GM / r^3) * r_vec
          const [ax, ay, az] = computeGravitationalAcceleration(ast.x, ast.y, ast.z, effectiveGM);
          
          ast.vx += ax * dt;
          ast.vy += ay * dt;
          ast.vz += az * dt;

          ast.x += ast.vx * dt;
          ast.y += ast.vy * dt;
          ast.z += ast.vz * dt;

          ast.rotX += ast.spinSpeedX * dt;
          ast.rotY += ast.spinSpeedY * dt;
        }

        const currentDist = Math.sqrt(ast.x * ast.x + ast.y * ast.y + ast.z * ast.z);

        // Check Event Horizon Crossing
        if (currentDist <= EVENT_HORIZON_RADIUS) {
          ast.consumed = true;
          if (onAsteroidConsumed) {
            onAsteroidConsumed(ast.id, currentDist);
          }
          _scratchPos.set(0, -99999, 0);
          _scratchMatrix.makeTranslation(0, -99999, 0);
          asteroidMesh.setMatrixAt(i, _scratchMatrix);
          continue;
        }

        // Tidal spaghettification effect when approaching event horizon (r <= 6.5 AU)
        let sx = ast.scale;
        let sy = ast.scale;
        let sz = ast.scale;

        const isSpaghettifying = currentDist <= (EVENT_HORIZON_RADIUS * 2.1);
        if (isSpaghettifying) {
          const { stretchZ, squashXY } = computeSpaghettificationScale(currentDist, EVENT_HORIZON_RADIUS);
          sx = ast.scale * squashXY;
          sy = ast.scale * squashXY;
          sz = ast.scale * stretchZ;
        }

        _scratchPos.set(ast.x, ast.y, ast.z);
        _scratchVec3.set(sx, sy, sz);

        if (isSpaghettifying) {
          // Align longitudinal stretching along radial vector toward singularity
          _scratchTarget.set(0, 0, 0);
          _scratchMatrix.lookAt(_scratchPos, _scratchTarget, THREE.Object3D.DEFAULT_UP);
          _scratchMatrix.scale(_scratchVec3);
          _scratchMatrix.setPosition(_scratchPos);
        } else {
          _scratchEuler.set(ast.rotX, ast.rotY, ast.rotZ);
          _scratchQuat.setFromEuler(_scratchEuler);
          _scratchMatrix.compose(_scratchPos, _scratchQuat, _scratchVec3);
        }

        asteroidMesh.setMatrixAt(i, _scratchMatrix);
      }
      asteroidMesh.instanceMatrix.needsUpdate = true;

      // 12. Newtonian Orbital Physics for Launched Probes
      const probes = probesRef.current;
      for (let i = probes.length - 1; i >= 0; i--) {
        const probe = probes[i];
        if (!probe.active) continue;

        if (timeScale > 0) {
          // Gravitational acceleration vector toward origin
          const [ax, ay, az] = computeGravitationalAcceleration(probe.x, probe.y, probe.z, effectiveGM);
          
          probe.vx += ax * dt;
          probe.vy += ay * dt;
          probe.vz += az * dt;

          probe.x += probe.vx * dt;
          probe.y += probe.vy * dt;
          probe.z += probe.vz * dt;
        }

        const probeDist = Math.sqrt(probe.x * probe.x + probe.y * probe.y + probe.z * probe.z);

        // Check Event Horizon Crossing
        if (probeDist <= EVENT_HORIZON_RADIUS) {
          probe.active = false;
          scene.remove(probe.mesh);
          probe.mesh.geometry.dispose();
          probes.splice(i, 1);
          if (onProbeConsumed) {
            onProbeConsumed(probe.id, probeDist);
          }
          continue;
        }

        probe.mesh.position.set(probe.x, probe.y, probe.z);

        // Tidal spaghettification stretching
        const { stretchZ, squashXY } = computeSpaghettificationScale(probeDist, EVENT_HORIZON_RADIUS);
        probe.mesh.scale.set(squashXY, squashXY, stretchZ);
        probe.mesh.lookAt(0, 0, 0);
      }

      // Update Bloom pass parameters
      if (bloomPass) {
        bloomPass.enabled = cfg.bloomEnabled;
        bloomPass.strength = cfg.bloomStrength;
        bloomPass.threshold = cfg.bloomThreshold;
      }

      // Render Scene
      if (composer && cfg.bloomEnabled && !isHeadless) {
        composer.render();
      } else {
        renderer.render(scene, camera);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    // Cleanup on unmount
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);

      probesRef.current.forEach((p) => {
        scene.remove(p.mesh);
        p.mesh.geometry.dispose();
      });
      probesRef.current = [];

      eventHorizonGeo.dispose();
      eventHorizonMat.dispose();
      photonRingGeo.dispose();
      photonRingMat.dispose();
      haloGeo.dispose();
      haloMat.dispose();
      jetConeGeo.dispose();
      jetConeMat.dispose();
      fluidDiskGeo.dispose();
      fluidDiskMat.dispose();

      particleGeo.dispose();
      particleMat.dispose();
      particleTexture.dispose();

      asteroidGeo.dispose();
      asteroidMat.dispose();
      bumpMap.dispose();
      roughnessMap.dispose();

      starGeo.dispose();
      starMat.dispose();
      nebulaTex.dispose();

      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 w-full h-full overflow-hidden select-none bg-black"
      data-testid="three-canvas-container"
    />
  );
};
