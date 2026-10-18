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
  computeNBodyPerturbations,
  computeSpaghettificationScale,
  computeStableOrbitalVelocity,
  getParticleColorByRadius,
  integrateRigidBodyVerlet,
  resolveRigidBodyCollision,
  shatterRigidBody,
  RigidBody,
  SpatialHashGrid3D,
  COLOR_PALETTES,
} from '../utils/physics';
import { CelestialBodyDefinition, MoonConfig } from '../types/celestial';
import {
  calculateCelestialOrbitalPosition,
  calculateCelestialOrbitalVelocity,
  calculateMoonPosition,
  generateOrbitPathPoints,
} from '../utils/celestialPhysics';
import {
  createAsteroidGeometry,
  createAsteroidTextures,
  createCelestialTexture,
  createMoonTexture,
  createNebulaTexture,
  createParticleTexture,
  createPlanetoidTextures,
  createRingTexture,
} from '../utils/textures';
import { spaceAudio } from '../audio/spaceAudio';

interface ThreeCanvasProps {
  config: SimulationConfig;
  cameraPreset: CameraPreset | null;
  onCameraPresetHandled: () => void;
  onAsteroidConsumed?: (id: number, distanceAU: number) => void;
  onProbeConsumed?: (id: number, distanceAU: number) => void;
  onPlanetoidConsumed?: () => void;
  onCollisionEvent?: (impactEnergy: number, bodyTypeA: string, bodyTypeB: string) => void;
  onFragmentationEvent?: (chunkCount: number, distanceAU: number) => void;
  launchProbeTrigger: number;
  respawnBeltTrigger: number;
  spawnPlanetoidTrigger: number;
  celestialBodies: CelestialBodyDefinition[];
  trackedBodyId: string | null;
  onCelestialConsumed?: (id: string, name: string) => void;
  onTelemetryUpdate: (fps: number, activeParticles: number, activeBodies: number, totalCollisions: number) => void;
}

// Scratchpad math objects (Zero-GC inside 60 FPS tick)
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
const MAX_RIGID_BODIES = 1200;
const MAX_SPARKS = 450;
const EVENT_HORIZON_RADIUS = 3.2;
const ISCO_RADIUS = 4.2;
const DISK_OUTER_RADIUS = 28.0;

export const ThreeCanvas: React.FC<ThreeCanvasProps> = ({
  config,
  cameraPreset,
  onCameraPresetHandled,
  onAsteroidConsumed,
  onProbeConsumed,
  onPlanetoidConsumed,
  onCollisionEvent,
  onFragmentationEvent,
  launchProbeTrigger,
  respawnBeltTrigger,
  spawnPlanetoidTrigger,
  celestialBodies,
  trackedBodyId,
  onCelestialConsumed,
  onTelemetryUpdate,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const configRef = useRef(config);
  configRef.current = config;

  // Scene references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const isTransitioningCameraRef = useRef(false);

  // Rigid-body physics references
  const rigidBodiesRef = useRef<RigidBody[]>([]);
  const spatialGridRef = useRef<SpatialHashGrid3D>(new SpatialHashGrid3D(7.5));
  const asteroidMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const roguePlanetoidMeshRef = useRef<THREE.Mesh | null>(null);
  const probeMeshesRef = useRef<Map<number, THREE.Mesh>>(new Map());
  const bodyIdCounterRef = useRef<number>(1);
  const totalCollisionsCounterRef = useRef<number>(0);

  // Orbiting Celestial Bodies reference
  interface CelestialRenderData {
    definition: CelestialBodyDefinition;
    group: THREE.Group;
    planetMesh: THREE.Mesh;
    atmosphereMesh?: THREE.Mesh;
    ringMesh?: THREE.Mesh;
    orbitLine?: THREE.LineLoop;
    moons: {
      config: MoonConfig;
      mesh: THREE.Mesh;
      currentAngle: number;
    }[];
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    isAlive: boolean;
  }
  const celestialMeshesRef = useRef<Map<string, CelestialRenderData>>(new Map());
  const trackedBodyIdRef = useRef(trackedBodyId);
  trackedBodyIdRef.current = trackedBodyId;

  // Sparks particle references
  const sparksPosRef = useRef<Float32Array>(new Float32Array(MAX_SPARKS * 3));
  const sparksVelRef = useRef<Float32Array>(new Float32Array(MAX_SPARKS * 3));
  const sparksLifeRef = useRef<Float32Array>(new Float32Array(MAX_SPARKS)); // 0 = dead, 1 = brand new
  const nextSparkIdxRef = useRef<number>(0);
  const sparksPointsRef = useRef<THREE.Points | null>(null);

  // Emit collision sparks
  const emitSparks = (cx: number, cy: number, cz: number, nx: number, ny: number, nz: number, count: number = 10) => {
    const pos = sparksPosRef.current;
    const vel = sparksVelRef.current;
    const life = sparksLifeRef.current;
    let idx = nextSparkIdxRef.current;

    for (let i = 0; i < count; i++) {
      const s = idx % MAX_SPARKS;
      pos[s * 3] = cx + (Math.random() - 0.5) * 0.4;
      pos[s * 3 + 1] = cy + (Math.random() - 0.5) * 0.4;
      pos[s * 3 + 2] = cz + (Math.random() - 0.5) * 0.4;

      // Cone scatter away from collision surface
      const speed = 3.5 + Math.random() * 7.5;
      vel[s * 3] = (nx * 0.6 + (Math.random() - 0.5) * 0.8) * speed;
      vel[s * 3 + 1] = (ny * 0.6 + (Math.random() - 0.5) * 0.8) * speed;
      vel[s * 3 + 2] = (nz * 0.6 + (Math.random() - 0.5) * 0.8) * speed;

      life[s] = 1.0;
      idx++;
    }
    nextSparkIdxRef.current = idx;
  };

  // Launch Newtonian probe with rigid-body physics
  useEffect(() => {
    if (launchProbeTrigger === 0 || !sceneRef.current) return;

    const spawnAngle = Math.random() * Math.PI * 2;
    const spawnRadius = DISK_OUTER_RADIUS + (Math.random() * 4 - 1);
    const spawnHeight = (Math.random() - 0.5) * 1.5;

    const x = Math.cos(spawnAngle) * spawnRadius;
    const y = spawnHeight;
    const z = Math.sin(spawnAngle) * spawnRadius;

    // Stable circular velocity + 15% inward tangential perturbation for decaying orbit
    const [baseVx, baseVy, baseVz] = computeStableOrbitalVelocity(x, y, z, BASE_BLACK_HOLE_GM);
    const vx = baseVx * 0.84;
    const vy = baseVy;
    const vz = baseVz * 0.84;

    const probeId = bodyIdCounterRef.current++;
    const probeRadius = 0.55;
    const probeMass = 3.5;

    const probeGeo = new THREE.SphereGeometry(probeRadius, 16, 16);
    const probeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const probeMesh = new THREE.Mesh(probeGeo, probeMat);

    const auraGeo = new THREE.SphereGeometry(probeRadius * 1.8, 16, 16);
    const auraMat = new THREE.MeshBasicMaterial({
      color: 0x60a5fa,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });
    probeMesh.add(new THREE.Mesh(auraGeo, auraMat));
    probeMesh.position.set(x, y, z);

    sceneRef.current.add(probeMesh);
    probeMeshesRef.current.set(probeId, probeMesh);

    rigidBodiesRef.current.push({
      id: probeId,
      type: 'probe',
      x,
      y,
      z,
      vx,
      vy,
      vz,
      ax: 0,
      ay: 0,
      az: 0,
      mass: probeMass,
      radius: probeRadius,
      restitution: configRef.current.restitution,
      inertia: 0.4 * probeMass * probeRadius * probeRadius,
      rotX: 0,
      rotY: 0,
      rotZ: 0,
      angVx: (Math.random() - 0.5) * 2.0,
      angVy: (Math.random() - 0.5) * 2.0,
      angVz: (Math.random() - 0.5) * 2.0,
      isAlive: true,
      spaghettifying: false,
      generation: 0,
    });

    spaceAudio.playProbeLaunch();
  }, [launchProbeTrigger]);

  // Spawn Massive Rogue Planetoid
  useEffect(() => {
    if (spawnPlanetoidTrigger === 0 || !sceneRef.current) return;

    // Spawn rogue planetoid at outer perimeter with high momentum barreling through belt
    const spawnAngle = (Math.PI * 0.7) + (Math.random() - 0.5) * 0.5;
    const spawnRadius = 64.0;
    const x = Math.cos(spawnAngle) * spawnRadius;
    const y = 8.5;
    const z = Math.sin(spawnAngle) * spawnRadius;

    // Aimed directly through the middle of the asteroid belt towards the black hole
    const targetX = 0;
    const targetY = 0;
    const targetZ = 0;
    const toTarget = new THREE.Vector3(targetX - x, targetY - y, targetZ - z).normalize();
    const speed = 14.5;

    const planetoidId = bodyIdCounterRef.current++;
    const planetoidRadius = 3.2;
    const planetoidMass = 320.0; // 100x mass of typical asteroid

    if (roguePlanetoidMeshRef.current) {
      sceneRef.current.remove(roguePlanetoidMeshRef.current);
    }

    const { map, emissiveMap } = createPlanetoidTextures();
    const planetoidGeo = new THREE.SphereGeometry(planetoidRadius, 48, 48);
    const planetoidMat = new THREE.MeshStandardMaterial({
      map,
      emissiveMap,
      emissive: new THREE.Color(0xff4500),
      emissiveIntensity: 2.2,
      roughness: 0.78,
      metalness: 0.22,
    });
    const planetoidMesh = new THREE.Mesh(planetoidGeo, planetoidMat);
    planetoidMesh.position.set(x, y, z);

    // Glowing atmospheric rim
    const atmGeo = new THREE.SphereGeometry(planetoidRadius * 1.15, 32, 32);
    const atmMat = new THREE.MeshBasicMaterial({
      color: 0xf97316,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
    });
    planetoidMesh.add(new THREE.Mesh(atmGeo, atmMat));

    sceneRef.current.add(planetoidMesh);
    roguePlanetoidMeshRef.current = planetoidMesh;

    // Remove any previous rogue planetoid body from rigidBodiesRef
    rigidBodiesRef.current = rigidBodiesRef.current.filter((b) => b.type !== 'planetoid');

    rigidBodiesRef.current.push({
      id: planetoidId,
      type: 'planetoid',
      x,
      y,
      z,
      vx: toTarget.x * speed,
      vy: toTarget.y * speed,
      vz: toTarget.z * speed,
      ax: 0,
      ay: 0,
      az: 0,
      mass: planetoidMass,
      radius: planetoidRadius,
      restitution: 0.45,
      inertia: 0.4 * planetoidMass * planetoidRadius * planetoidRadius,
      rotX: 0,
      rotY: 0,
      rotZ: 0,
      angVx: (Math.random() - 0.5) * 1.2,
      angVy: (Math.random() - 0.5) * 1.2,
      angVz: (Math.random() - 0.5) * 1.2,
      isAlive: true,
      spaghettifying: false,
      generation: 0,
    });

    spaceAudio.playPlanetoidRoar();
  }, [spawnPlanetoidTrigger]);

  // Respawn Asteroid Belt trigger
  useEffect(() => {
    if (respawnBeltTrigger === 0 || !asteroidMeshRef.current) return;

    const mesh = asteroidMeshRef.current;
    const beltRadius = configRef.current.asteroidBeltRadius;
    const beltWidth = configRef.current.asteroidBeltWidth;
    const count = configRef.current.asteroidCount;

    // Remove old asteroids and debris, keeping active probes and planetoids
    const nonAsteroids = rigidBodiesRef.current.filter((b) => b.type === 'probe' || b.type === 'planetoid');
    const newAsteroids: RigidBody[] = [];

    for (let i = 0; i < count; i++) {
      const r = (beltRadius - beltWidth / 2) + Math.random() * beltWidth;
      const angle = Math.random() * Math.PI * 2;
      const x = Math.cos(angle) * r;
      const y = (Math.random() - 0.5) * (beltWidth * 0.12);
      const z = Math.sin(angle) * r;

      const [vx, vy, vz] = computeStableOrbitalVelocity(x, y, z, BASE_BLACK_HOLE_GM, (Math.random() - 0.5) * 0.05);
      const scale = 0.35 + Math.random() * 0.85;
      const radius = scale * 0.95;
      const mass = Math.pow(scale, 3) * 2.5;

      const body: RigidBody = {
        id: bodyIdCounterRef.current++,
        type: 'asteroid',
        x,
        y,
        z,
        vx,
        vy,
        vz,
        ax: 0,
        ay: 0,
        az: 0,
        mass,
        radius,
        restitution: configRef.current.restitution,
        inertia: 0.4 * mass * radius * radius,
        rotX: Math.random() * Math.PI,
        rotY: Math.random() * Math.PI,
        rotZ: Math.random() * Math.PI,
        angVx: (Math.random() - 0.5) * 1.5,
        angVy: (Math.random() - 0.5) * 1.5,
        angVz: (Math.random() - 0.5) * 1.5,
        isAlive: true,
        spaghettifying: false,
        generation: 0,
      };
      newAsteroids.push(body);

      _scratchPos.set(x, y, z);
      _scratchEuler.set(body.rotX, body.rotY, body.rotZ);
      _scratchQuat.setFromEuler(_scratchEuler);
      _scratchVec3.set(scale, scale, scale);
      _scratchMatrix.compose(_scratchPos, _scratchQuat, _scratchVec3);
      mesh.setMatrixAt(i, _scratchMatrix);
    }

    // Hide remaining instances
    for (let i = count; i < MAX_RIGID_BODIES; i++) {
      _scratchPos.set(0, -99999, 0);
      _scratchMatrix.makeTranslation(0, -99999, 0);
      mesh.setMatrixAt(i, _scratchMatrix);
    }

    mesh.count = count;
    mesh.instanceMatrix.needsUpdate = true;
    rigidBodiesRef.current = [...newAsteroids, ...nonAsteroids];
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

  // Synchronize Celestial Bodies with 3D Scene
  const syncCelestialBodies = (scene: THREE.Scene, bodiesList: CelestialBodyDefinition[]) => {
    const currentMap = celestialMeshesRef.current;
    const incomingIds = new Set(bodiesList.map((b) => b.id));

    // Remove obsolete bodies
    currentMap.forEach((cData, id) => {
      if (!incomingIds.has(id)) {
        scene.remove(cData.group);
        if (cData.orbitLine) scene.remove(cData.orbitLine);
        cData.planetMesh.geometry.dispose();
        if (Array.isArray(cData.planetMesh.material)) {
          cData.planetMesh.material.forEach((m) => m.dispose());
        } else {
          cData.planetMesh.material.dispose();
        }
        if (cData.ringMesh) {
          cData.ringMesh.geometry.dispose();
          (cData.ringMesh.material as THREE.Material).dispose();
        }
        if (cData.atmosphereMesh) {
          cData.atmosphereMesh.geometry.dispose();
          (cData.atmosphereMesh.material as THREE.Material).dispose();
        }
        cData.moons.forEach((m) => {
          m.mesh.geometry.dispose();
          (m.mesh.material as THREE.Material).dispose();
        });
        currentMap.delete(id);
      }
    });

    // Add newly configured bodies
    bodiesList.forEach((body) => {
      if (currentMap.has(body.id)) return;

      const group = new THREE.Group();
      const initialAngle = body.orbitalAngle ?? (Math.random() * Math.PI * 2);
      const [initX, initY, initZ] = calculateCelestialOrbitalPosition(
        body.orbitalRadius,
        initialAngle,
        body.eccentricity,
        body.orbitalInclination
      );

      const [initVx, initVy, initVz] = calculateCelestialOrbitalVelocity(
        body.orbitalRadius,
        initialAngle,
        BASE_BLACK_HOLE_GM,
        body.orbitalSpeedMultiplier,
        body.eccentricity,
        body.orbitalInclination
      );

      // Planet Mesh
      const planetGeo = body.style === 'rocky_asteroid'
        ? createAsteroidGeometry(body.radius, 2)
        : new THREE.SphereGeometry(body.radius, 40, 40);

      const planetTexture = createCelestialTexture(body.style, body.color);
      const planetMat = new THREE.MeshStandardMaterial({
        map: planetTexture,
        roughness: 0.75,
        metalness: 0.16,
      });

      if (body.style === 'lava') {
        planetMat.emissive = new THREE.Color(0xff4500);
        planetMat.emissiveIntensity = 1.6;
      }

      const planetMesh = new THREE.Mesh(planetGeo, planetMat);
      group.add(planetMesh);

      // Atmosphere
      let atmosphereMesh: THREE.Mesh | undefined;
      if (body.hasAtmosphere) {
        const atmGeo = new THREE.SphereGeometry(body.radius * 1.14, 32, 32);
        const atmMat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(body.atmosphereColor || '#60a5fa'),
          transparent: true,
          opacity: 0.38,
          blending: THREE.AdditiveBlending,
          side: THREE.BackSide,
        });
        atmosphereMesh = new THREE.Mesh(atmGeo, atmMat);
        group.add(atmosphereMesh);
      }

      // Rings
      let ringMesh: THREE.Mesh | undefined;
      if (body.hasRings) {
        const inner = body.radius * (body.ringInnerRadius || 1.35);
        const outer = body.radius * (body.ringOuterRadius || 2.7);
        const ringGeo = new THREE.RingGeometry(inner, outer, 64);
        ringGeo.rotateX(Math.PI / 2);
        const ringTexture = createRingTexture(body.ringColor || '#fbbf24');
        const ringMat = new THREE.MeshStandardMaterial({
          map: ringTexture,
          transparent: true,
          opacity: 0.92,
          side: THREE.DoubleSide,
          roughness: 0.65,
        });
        ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.z = ((body.ringTilt || 22) * Math.PI) / 180;
        group.add(ringMesh);
      }

      // Moons
      const moonsData: { config: MoonConfig; mesh: THREE.Mesh; currentAngle: number }[] = [];
      body.moons.forEach((mConf, idx) => {
        const mGeo = new THREE.SphereGeometry(mConf.radius, 20, 20);
        const mTex = createMoonTexture(mConf.color || '#cbd5e1');
        const mMat = new THREE.MeshStandardMaterial({ map: mTex, roughness: 0.82 });
        const mMesh = new THREE.Mesh(mGeo, mMat);
        const initialMoonAngle = (idx / Math.max(1, body.moons.length)) * Math.PI * 2;
        const [mx, my, mz] = calculateMoonPosition(0, 0, 0, mConf.orbitalDistance, initialMoonAngle, mConf.orbitalInclination);
        mMesh.position.set(mx, my, mz);
        group.add(mMesh);

        moonsData.push({
          config: mConf,
          mesh: mMesh,
          currentAngle: initialMoonAngle,
        });
      });

      // Orbit path guide
      const pathPoints = generateOrbitPathPoints(body.orbitalRadius, body.eccentricity, body.orbitalInclination, 96);
      const orbitGeo = new THREE.BufferGeometry().setFromPoints(pathPoints.map(p => new THREE.Vector3(p[0], p[1], p[2])));
      const orbitMat = new THREE.LineBasicMaterial({
        color: new THREE.Color(body.color).lerp(new THREE.Color(0xffffff), 0.35),
        transparent: true,
        opacity: 0.25,
        blending: THREE.AdditiveBlending,
      });
      const orbitLine = new THREE.LineLoop(orbitGeo, orbitMat);
      scene.add(orbitLine);

      group.position.set(initX, initY, initZ);
      scene.add(group);

      currentMap.set(body.id, {
        definition: body,
        group,
        planetMesh,
        atmosphereMesh,
        ringMesh,
        orbitLine,
        moons: moonsData,
        x: initX,
        y: initY,
        z: initZ,
        vx: initVx,
        vy: initVy,
        vz: initVz,
        isAlive: true,
      });
    });
  };

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    syncCelestialBodies(scene, celestialBodies);
  }, [celestialBodies]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isHeadless = navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent);

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.fog = new THREE.FogExp2(0x020308, 0.0015);
    syncCelestialBodies(scene, celestialBodies);

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

    // 4. Black Hole Visual Assembly
    const blackHoleGroup = new THREE.Group();
    scene.add(blackHoleGroup);

    const eventHorizonGeo = new THREE.SphereGeometry(EVENT_HORIZON_RADIUS, 64, 64);
    const eventHorizonMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      depthWrite: true,
    });
    const eventHorizonMesh = new THREE.Mesh(eventHorizonGeo, eventHorizonMat);
    eventHorizonMesh.renderOrder = 10;
    blackHoleGroup.add(eventHorizonMesh);

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

    // 5. Accretion Disk Particles
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

      particlePositions[i * 3] = Math.cos(theta) * r;
      particlePositions[i * 3 + 1] = Math.sin(vertPhase) * (vertAmp * 0.4);
      particlePositions[i * 3 + 2] = Math.sin(theta) * r;

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

    // 6. Rigid Body Instanced Mesh (Asteroids & Debris)
    const { bumpMap, roughnessMap } = createAsteroidTextures();
    const asteroidGeo = createAsteroidGeometry(1.0, 1);
    const asteroidMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.85,
      metalness: 0.12,
      bumpMap,
      bumpScale: 0.08,
      roughnessMap,
      flatShading: true,
    });

    const asteroidMesh = new THREE.InstancedMesh(asteroidGeo, asteroidMat, MAX_RIGID_BODIES);
    asteroidMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(asteroidMesh);
    asteroidMeshRef.current = asteroidMesh;

    // Seed Initial Asteroid Rigid Bodies
    const initialBeltRadius = configRef.current.asteroidBeltRadius;
    const initialBeltWidth = configRef.current.asteroidBeltWidth;
    const asteroidCount = configRef.current.asteroidCount;
    const initialBodies: RigidBody[] = [];

    for (let i = 0; i < asteroidCount; i++) {
      const r = (initialBeltRadius - initialBeltWidth / 2) + Math.random() * initialBeltWidth;
      const angle = Math.random() * Math.PI * 2;
      const x = Math.cos(angle) * r;
      const y = (Math.random() - 0.5) * (initialBeltWidth * 0.12);
      const z = Math.sin(angle) * r;

      const [vx, vy, vz] = computeStableOrbitalVelocity(x, y, z, BASE_BLACK_HOLE_GM, (Math.random() - 0.5) * 0.05);
      const scale = 0.35 + Math.random() * 0.85;
      const radius = scale * 0.95;
      const mass = Math.pow(scale, 3) * 2.5;

      initialBodies.push({
        id: bodyIdCounterRef.current++,
        type: 'asteroid',
        x,
        y,
        z,
        vx,
        vy,
        vz,
        ax: 0,
        ay: 0,
        az: 0,
        mass,
        radius,
        restitution: configRef.current.restitution,
        inertia: 0.4 * mass * radius * radius,
        rotX: Math.random() * Math.PI,
        rotY: Math.random() * Math.PI,
        rotZ: Math.random() * Math.PI,
        angVx: (Math.random() - 0.5) * 1.5,
        angVy: (Math.random() - 0.5) * 1.5,
        angVz: (Math.random() - 0.5) * 1.5,
        isAlive: true,
        spaghettifying: false,
        generation: 0,
      });

      _scratchPos.set(x, y, z);
      _scratchEuler.set(initialBodies[i].rotX, initialBodies[i].rotY, initialBodies[i].rotZ);
      _scratchQuat.setFromEuler(_scratchEuler);
      _scratchVec3.set(scale, scale, scale);
      _scratchMatrix.compose(_scratchPos, _scratchQuat, _scratchVec3);
      asteroidMesh.setMatrixAt(i, _scratchMatrix);

      const tintShade = 0.7 + Math.random() * 0.5;
      const rust = Math.random() > 0.6 ? 0.15 : 0;
      _scratchColor.setRGB(tintShade * (0.8 + rust), tintShade * 0.8, tintShade * 0.75);
      asteroidMesh.setColorAt(i, _scratchColor);
    }

    for (let i = asteroidCount; i < MAX_RIGID_BODIES; i++) {
      _scratchPos.set(0, -99999, 0);
      _scratchMatrix.makeTranslation(0, -99999, 0);
      asteroidMesh.setMatrixAt(i, _scratchMatrix);
    }

    asteroidMesh.instanceMatrix.needsUpdate = true;
    if (asteroidMesh.instanceColor) asteroidMesh.instanceColor.needsUpdate = true;
    asteroidMesh.count = asteroidCount;
    rigidBodiesRef.current = initialBodies;

    // 7. Visual Impact Sparks System (THREE.Points)
    const sparkGeo = new THREE.BufferGeometry();
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparksPosRef.current, 3));
    const sparkColors = new Float32Array(MAX_SPARKS * 3);
    for (let i = 0; i < MAX_SPARKS; i++) {
      sparkColors[i * 3] = 1.0;
      sparkColors[i * 3 + 1] = 0.85;
      sparkColors[i * 3 + 2] = 0.3;
    }
    sparkGeo.setAttribute('color', new THREE.BufferAttribute(sparkColors, 3));

    const sparkMat = new THREE.PointsMaterial({
      size: 1.4,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const sparksPoints = new THREE.Points(sparkGeo, sparkMat);
    scene.add(sparksPoints);
    sparksPointsRef.current = sparksPoints;

    // 8. Starfield Background
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

      starPos[i * 3] = dist * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = dist * Math.sin(phi) * Math.sin(theta);
      starPos[i * 3 + 2] = dist * Math.cos(phi);

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
    scene.add(new THREE.Points(starGeo, starMat));

    // Nebulae
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

    // 9. Post-Processing Pipeline
    let composer: EffectComposer | null = null;
    let bloomPass: UnrealBloomPass | null = null;
    let fxaaPass: ShaderPass | null = null;

    if (!isHeadless) {
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));

      bloomPass = new UnrealBloomPass(
        new THREE.Vector2(width, height),
        configRef.current.bloomStrength,
        0.55,
        configRef.current.bloomThreshold
      );
      composer.addPass(bloomPass);

      fxaaPass = new ShaderPass(FXAAShader);
      const pr = renderer.getPixelRatio();
      fxaaPass.material.uniforms['resolution'].value.set(1 / (width * pr), 1 / (height * pr));
      composer.addPass(fxaaPass);
    }

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;

      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer?.setSize(w, h);
      bloomPass?.resolution.set(w, h);
      if (fxaaPass) {
        const pr = renderer.getPixelRatio();
        fxaaPass.material.uniforms['resolution'].value.set(1 / (w * pr), 1 / (h * pr));
      }
    };
    window.addEventListener('resize', handleResize);

    renderer.compile(scene, camera);

    // 10. True 3D Rigid-Body Physics & Render Loop
    let animationFrameId: number;
    let lastTime = performance.now();
    let frameCount = 0;
    let lastFpsUpdate = performance.now();

    const animate = (currentTime: number) => {
      animationFrameId = requestAnimationFrame(animate);

      const deltaMs = currentTime - lastTime;
      lastTime = currentTime;
      const rawDt = Math.min(deltaMs / 1000, 0.08);

      const cfg = configRef.current;
      const timeScale = cfg.isPaused ? 0 : cfg.timeScale;
      const dt = rawDt * timeScale;

      // FPS Telemetry
      frameCount++;
      if (currentTime - lastFpsUpdate >= 250) {
        const calculatedFps = Math.round((frameCount * 1000) / (currentTime - lastFpsUpdate));
        const aliveBodies = rigidBodiesRef.current.filter((b) => b.isAlive).length;
        onTelemetryUpdate(calculatedFps, cfg.particleCount, aliveBodies, totalCollisionsCounterRef.current);
        frameCount = 0;
        lastFpsUpdate = currentTime;
      }

      // Audio engine update
      if (cfg.audioEnabled) {
        spaceAudio.updateParameters(cfg.rotationSpeed);
      }

      // Camera Damping
      if (isTransitioningCameraRef.current) {
        camera.position.x = THREE.MathUtils.damp(camera.position.x, _camPosTarget.x, 3.5, rawDt);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, _camPosTarget.y, 3.5, rawDt);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, _camPosTarget.z, 3.5, rawDt);

        controls.target.x = THREE.MathUtils.damp(controls.target.x, _camLookTarget.x, 3.5, rawDt);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, _camLookTarget.y, 3.5, rawDt);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, _camLookTarget.z, 3.5, rawDt);

        if (camera.position.distanceTo(_camPosTarget) < 0.25) {
          isTransitioningCameraRef.current = false;
        }
      }

      if (cfg.autoRotateCamera && !isTransitioningCameraRef.current && !trackedBodyIdRef.current) {
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.75 * cfg.rotationSpeed;
      } else {
        controls.autoRotate = false;
      }

      // Smooth Camera Tracking for Celestial Bodies
      if (trackedBodyIdRef.current && celestialMeshesRef.current.has(trackedBodyIdRef.current)) {
        const tracked = celestialMeshesRef.current.get(trackedBodyIdRef.current)!;
        if (tracked.isAlive) {
          controls.target.x = THREE.MathUtils.damp(controls.target.x, tracked.x, 5.0, rawDt);
          controls.target.y = THREE.MathUtils.damp(controls.target.y, tracked.y, 5.0, rawDt);
          controls.target.z = THREE.MathUtils.damp(controls.target.z, tracked.z, 5.0, rawDt);

          const followDist = Math.max(9.0, tracked.definition.radius * 4.5);
          camera.position.x = THREE.MathUtils.damp(camera.position.x, tracked.x + followDist * 0.8, 3.2, rawDt);
          camera.position.y = THREE.MathUtils.damp(camera.position.y, tracked.y + followDist * 0.45, 3.2, rawDt);
          camera.position.z = THREE.MathUtils.damp(camera.position.z, tracked.z + followDist, 3.2, rawDt);
        }
      }

      controls.update();

      // Camera direction for Doppler beaming
      _scratchVec3.copy(camera.position).sub(controls.target);
      const cameraAzimuth = Math.atan2(_scratchVec3.z, _scratchVec3.x);
      haloMesh.lookAt(camera.position);

      // Color Palette updates
      const currentPalette = COLOR_PALETTES[cfg.colorPaletteId] || COLOR_PALETTES.gargantua;
      photonRingMat.color.set(currentPalette.photonRing);
      haloMat.color.set(currentPalette.photonRing);
      centerPointLight.color.set(currentPalette.midDisk);
      jetConeMat.color.set(currentPalette.jetColor);
      fluidDiskMat.color.set(currentPalette.midDisk);

      jetGroup.visible = cfg.relativisticJets;
      if (cfg.relativisticJets && timeScale > 0) {
        upperJet.rotation.y += dt * 1.5 * cfg.rotationSpeed;
        lowerJet.rotation.y += dt * 1.5 * cfg.rotationSpeed;
      }

      if (timeScale > 0) {
        fluidDiskMesh.rotation.z += dt * 0.15 * cfg.rotationSpeed;
      }

      // Accretion Disk Particles Update
      const activeCount = Math.min(cfg.particleCount, MAX_PARTICLES);
      for (let i = 0; i < activeCount; i++) {
        if (timeScale > 0) {
          angles[i] += speeds[i] * cfg.rotationSpeed * dt;
          if (cfg.gravityPull > 0) {
            radii[i] -= computeInwardDrift(radii[i], EVENT_HORIZON_RADIUS, cfg.gravityPull, dt);
            if (radii[i] <= EVENT_HORIZON_RADIUS + 0.1) {
              radii[i] = DISK_OUTER_RADIUS - Math.random() * 2.5;
              speeds[i] = calculateKeplerianAngularVelocity(radii[i]);
            } else {
              speeds[i] = calculateKeplerianAngularVelocity(radii[i]);
            }
          }
        }

        const r = radii[i];
        const theta = angles[i];
        const vertY = Math.sin(verticalPhases[i] + currentTime * 0.0018) * (verticalAmps[i] * 0.5);

        particlePositions[i * 3] = Math.cos(theta) * r;
        particlePositions[i * 3 + 1] = vertY;
        particlePositions[i * 3 + 2] = Math.sin(theta) * r;

        const [cr, cg, cb] = getParticleColorByRadius(r, ISCO_RADIUS, DISK_OUTER_RADIUS, currentPalette);
        const dopplerFactor = cfg.dopplerBeaming ? computeDopplerBeamingFactor(theta, cameraAzimuth, 0.42) : 1.0;

        particleColors[i * 3] = Math.min(cr * dopplerFactor, 1.0);
        particleColors[i * 3 + 1] = Math.min(cg * dopplerFactor, 1.0);
        particleColors[i * 3 + 2] = Math.min(cb * dopplerFactor, 1.0);
        particleSizes[i] = baseSizes[i] * (0.8 + dopplerFactor * 0.35);
      }

      particleGeo.setDrawRange(0, activeCount);
      particleGeo.attributes.position.needsUpdate = true;
      particleGeo.attributes.color.needsUpdate = true;
      particleGeo.attributes.size.needsUpdate = true;

      // 11. TRUE 3D RIGID-BODY PHYSICS INTEGRATION
      const bodies = rigidBodiesRef.current;
      const effectiveGM = BASE_BLACK_HOLE_GM * cfg.gravityPull;
      const massiveBodies = bodies.filter((b) => b.isAlive && (b.type === 'planetoid' || b.mass > 40.0));

      if (timeScale > 0 && dt > 0) {
        // (A) Calculate Gravitational Accelerations (Black Hole + N-Body Massive Perturbations)
        for (let i = 0; i < bodies.length; i++) {
          const body = bodies[i];
          if (!body.isAlive) continue;

          // Black hole central gravity
          const [axBh, ayBh, azBh] = computeGravitationalAcceleration(body.x, body.y, body.z, effectiveGM);
          body.ax = axBh;
          body.ay = ayBh;
          body.az = azBh;

          // Local N-body gravitational perturbations from massive planetoids
          if (cfg.gravitationalPerturbations && massiveBodies.length > 0 && body.type !== 'planetoid') {
            const [pax, pay, paz] = computeNBodyPerturbations(body, massiveBodies, 3.2);
            body.ax += pax;
            body.ay += pay;
            body.az += paz;
          }

          // Velocity Verlet integration step
          integrateRigidBodyVerlet(body, dt);
        }

        // (B) 3D Spatial Hash Broadphase & Rigid-Body Impulse Collisions
        const grid = spatialGridRef.current;
        grid.clear();
        for (let i = 0; i < bodies.length; i++) {
          const b = bodies[i];
          if (b.isAlive) {
            grid.insert(i, b.x, b.y, b.z);
          }
        }

        const newDebrisChunks: RigidBody[] = [];

        for (let i = 0; i < bodies.length; i++) {
          const bodyA = bodies[i];
          if (!bodyA.isAlive) continue;

          const candidates = grid.queryCandidates(bodyA.x, bodyA.y, bodyA.z, bodyA.radius + 3.5);
          for (let c = 0; c < candidates.length; c++) {
            const j = candidates[c];
            if (j <= i) continue; // Unique pairs

            const bodyB = bodies[j];
            if (!bodyB.isAlive) continue;

            const res = resolveRigidBodyCollision(bodyA, bodyB, cfg.restitution, cfg.fragmentationThreshold);
            if (res.collided) {
              totalCollisionsCounterRef.current++;

              if (res.impactEnergy > 0.5) {
                // Emit impact sparks
                emitSparks(res.contactX, res.contactY, res.contactZ, res.normalX, res.normalY, res.normalZ, Math.min(18, 6 + Math.floor(res.impactEnergy * 0.4)));
                spaceAudio.playImpactCrunch(res.impactEnergy);

                if (onCollisionEvent) {
                  onCollisionEvent(res.impactEnergy, bodyA.type, bodyB.type);
                }
              }

              // High-Energy Fragmentation
              if (res.shouldShatterA && bodies.length + newDebrisChunks.length < MAX_RIGID_BODIES) {
                const chunks = shatterRigidBody(bodyA, [res.normalX, res.normalY, res.normalZ], () => bodyIdCounterRef.current++, 4);
                newDebrisChunks.push(...chunks);
                if (onFragmentationEvent) {
                  const dist = Math.sqrt(bodyA.x * bodyA.x + bodyA.y * bodyA.y + bodyA.z * bodyA.z);
                  onFragmentationEvent(chunks.length, dist);
                }
              }

              if (res.shouldShatterB && bodies.length + newDebrisChunks.length < MAX_RIGID_BODIES) {
                const chunks = shatterRigidBody(bodyB, [-res.normalX, -res.normalY, -res.normalZ], () => bodyIdCounterRef.current++, 4);
                newDebrisChunks.push(...chunks);
                if (onFragmentationEvent) {
                  const dist = Math.sqrt(bodyB.x * bodyB.x + bodyB.y * bodyB.y + bodyB.z * bodyB.z);
                  onFragmentationEvent(chunks.length, dist);
                }
              }
            }
          }
        }

        if (newDebrisChunks.length > 0) {
          rigidBodiesRef.current.push(...newDebrisChunks);
        }

        // (C) Event Horizon Consumption & Tidal Spaghettification Check
        for (let i = 0; i < bodies.length; i++) {
          const body = bodies[i];
          if (!body.isAlive) continue;

          const dist = Math.sqrt(body.x * body.x + body.y * body.y + body.z * body.z);
          if (dist <= EVENT_HORIZON_RADIUS) {
            body.isAlive = false;

            if (body.type === 'asteroid' || body.type === 'debris') {
              onAsteroidConsumed?.(body.id, dist);
            } else if (body.type === 'probe') {
              onProbeConsumed?.(body.id, dist);
              const mesh = probeMeshesRef.current.get(body.id);
              if (mesh) {
                scene.remove(mesh);
                mesh.geometry.dispose();
                probeMeshesRef.current.delete(body.id);
              }
            } else if (body.type === 'planetoid') {
              onPlanetoidConsumed?.();
              if (roguePlanetoidMeshRef.current) {
                scene.remove(roguePlanetoidMeshRef.current);
                roguePlanetoidMeshRef.current = null;
              }
            }
          } else {
            body.spaghettifying = dist <= (EVENT_HORIZON_RADIUS * 2.1);
          }
        }
      }

      // (D) Update Visual Meshes from Rigid-Body Positions
      let asteroidInstanceIdx = 0;
      for (let i = 0; i < bodies.length; i++) {
        const body = bodies[i];

        if (body.type === 'asteroid' || body.type === 'debris') {
          if (asteroidInstanceIdx < MAX_RIGID_BODIES) {
            if (body.isAlive) {
              const dist = Math.sqrt(body.x * body.x + body.y * body.y + body.z * body.z);
              let sx = body.radius;
              let sy = body.radius;
              let sz = body.radius;

              if (body.spaghettifying) {
                const { stretchZ, squashXY } = computeSpaghettificationScale(dist, EVENT_HORIZON_RADIUS);
                sx = body.radius * squashXY;
                sy = body.radius * squashXY;
                sz = body.radius * stretchZ;
              }

              _scratchPos.set(body.x, body.y, body.z);
              _scratchVec3.set(sx, sy, sz);

              if (body.spaghettifying) {
                _scratchTarget.set(0, 0, 0);
                _scratchMatrix.lookAt(_scratchPos, _scratchTarget, THREE.Object3D.DEFAULT_UP);
                _scratchMatrix.scale(_scratchVec3);
                _scratchMatrix.setPosition(_scratchPos);
              } else {
                _scratchEuler.set(body.rotX, body.rotY, body.rotZ);
                _scratchQuat.setFromEuler(_scratchEuler);
                _scratchMatrix.compose(_scratchPos, _scratchQuat, _scratchVec3);
              }

              asteroidMesh.setMatrixAt(asteroidInstanceIdx, _scratchMatrix);

              if (body.type === 'debris') {
                _scratchColor.setRGB(0.95, 0.55, 0.25); // Glowing hot shattered debris facet
                asteroidMesh.setColorAt(asteroidInstanceIdx, _scratchColor);
              }
            } else {
              _scratchPos.set(0, -99999, 0);
              _scratchMatrix.makeTranslation(0, -99999, 0);
              asteroidMesh.setMatrixAt(asteroidInstanceIdx, _scratchMatrix);
            }
            asteroidInstanceIdx++;
          }
        } else if (body.type === 'probe') {
          const mesh = probeMeshesRef.current.get(body.id);
          if (mesh) {
            if (body.isAlive) {
              const dist = Math.sqrt(body.x * body.x + body.y * body.y + body.z * body.z);
              const { stretchZ, squashXY } = computeSpaghettificationScale(dist, EVENT_HORIZON_RADIUS);
              mesh.position.set(body.x, body.y, body.z);
              mesh.scale.set(squashXY, squashXY, stretchZ);
              mesh.lookAt(0, 0, 0);
            } else {
              scene.remove(mesh);
              mesh.geometry.dispose();
              probeMeshesRef.current.delete(body.id);
            }
          }
        } else if (body.type === 'planetoid') {
          if (roguePlanetoidMeshRef.current) {
            if (body.isAlive) {
              roguePlanetoidMeshRef.current.position.set(body.x, body.y, body.z);
              roguePlanetoidMeshRef.current.rotation.set(body.rotX, body.rotY, body.rotZ);
            } else {
              scene.remove(roguePlanetoidMeshRef.current);
              roguePlanetoidMeshRef.current = null;
            }
          }
        }
      }

      // Hide unused instances
      while (asteroidInstanceIdx < MAX_RIGID_BODIES) {
        _scratchPos.set(0, -99999, 0);
        _scratchMatrix.makeTranslation(0, -99999, 0);
        asteroidMesh.setMatrixAt(asteroidInstanceIdx, _scratchMatrix);
        asteroidInstanceIdx++;
      }
      asteroidMesh.count = Math.min(asteroidInstanceIdx, MAX_RIGID_BODIES);
      asteroidMesh.instanceMatrix.needsUpdate = true;
      if (asteroidMesh.instanceColor) asteroidMesh.instanceColor.needsUpdate = true;

      // 11.B Update Orbiting Celestial Bodies (Planets, Rings, Moons)
      celestialMeshesRef.current.forEach((cData) => {
        if (!cData.isAlive) return;

        if (timeScale > 0 && dt > 0) {
          // Central black hole Newtonian gravity
          const [axBh, ayBh, azBh] = computeGravitationalAcceleration(cData.x, cData.y, cData.z, effectiveGM);
          cData.vx += axBh * dt;
          cData.vy += ayBh * dt;
          cData.vz += azBh * dt;

          cData.x += cData.vx * dt;
          cData.y += cData.vy * dt;
          cData.z += cData.vz * dt;

          const dist = Math.sqrt(cData.x * cData.x + cData.y * cData.y + cData.z * cData.z);
          if (dist <= EVENT_HORIZON_RADIUS) {
            cData.isAlive = false;
            scene.remove(cData.group);
            if (cData.orbitLine) scene.remove(cData.orbitLine);
            emitSparks(cData.x, cData.y, cData.z, 0, 1, 0, 24);
            spaceAudio.playPlanetoidRoar();
            onCelestialConsumed?.(cData.definition.id, cData.definition.name);
            return;
          }

          // Spaghettification near event horizon
          if (dist <= EVENT_HORIZON_RADIUS * 2.1) {
            const { stretchZ, squashXY } = computeSpaghettificationScale(dist, EVENT_HORIZON_RADIUS);
            cData.planetMesh.scale.set(squashXY, squashXY, stretchZ);
            cData.planetMesh.lookAt(0, 0, 0);
          } else {
            cData.planetMesh.scale.set(1, 1, 1);
          }
        }

        // Update group position
        cData.group.position.set(cData.x, cData.y, cData.z);
        if (timeScale > 0) {
          cData.planetMesh.rotation.y += dt * (cData.definition.axialRotationSpeed || 1.0);
        }

        // Update orbiting natural satellites (Moons)
        cData.moons.forEach((m) => {
          if (timeScale > 0) {
            m.currentAngle += dt * m.config.orbitalSpeed;
          }
          const [mx, my, mz] = calculateMoonPosition(0, 0, 0, m.config.orbitalDistance, m.currentAngle, m.config.orbitalInclination);
          m.mesh.position.set(mx, my, mz);
          if (timeScale > 0) {
            m.mesh.rotation.y += dt * 0.8;
          }
        });
      });

      // 12. Update Impact Sparks
      const sparkPos = sparksPosRef.current;
      const sparkVel = sparksVelRef.current;
      const sparkLife = sparksLifeRef.current;

      for (let s = 0; s < MAX_SPARKS; s++) {
        if (sparkLife[s] > 0) {
          sparkLife[s] -= rawDt * 2.8;
          if (sparkLife[s] <= 0) {
            sparkLife[s] = 0;
            sparkPos[s * 3 + 1] = -99999;
          } else {
            sparkPos[s * 3] += sparkVel[s * 3] * rawDt;
            sparkPos[s * 3 + 1] += sparkVel[s * 3 + 1] * rawDt;
            sparkPos[s * 3 + 2] += sparkVel[s * 3 + 2] * rawDt;
          }
        }
      }
      sparkGeo.attributes.position.needsUpdate = true;

      // 13. Bloom & Render
      if (bloomPass) {
        bloomPass.enabled = cfg.bloomEnabled;
        bloomPass.strength = cfg.bloomStrength;
        bloomPass.threshold = cfg.bloomThreshold;
      }

      if (composer && cfg.bloomEnabled && !isHeadless) {
        composer.render();
      } else {
        renderer.render(scene, camera);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);

      celestialMeshesRef.current.forEach((cData) => {
        scene.remove(cData.group);
        if (cData.orbitLine) scene.remove(cData.orbitLine);
      });
      celestialMeshesRef.current.clear();

      probeMeshesRef.current.forEach((m) => {
        scene.remove(m);
        m.geometry.dispose();
      });
      probeMeshesRef.current.clear();

      if (roguePlanetoidMeshRef.current) {
        scene.remove(roguePlanetoidMeshRef.current);
        roguePlanetoidMeshRef.current = null;
      }

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

      sparkGeo.dispose();
      sparkMat.dispose();
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
