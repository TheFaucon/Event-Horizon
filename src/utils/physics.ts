/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Color palette configuration for the accretion disk, photon ring, and polar jets.
 */
export interface ColorPalette {
  id: string;
  name: string;
  description: string;
  // Core colors
  innerCore: string;      // Hot inner ISCO boundary (highest temperature)
  midDisk: string;        // Dense accretion flow
  outerWisps: string;     // Cooler outer diffuse gases
  photonRing: string;     // Gravitational photon sphere glow
  jetColor: string;       // Relativistic bipolar jets
  ambientTint: string;    // Ambient space light reflection
}

export const COLOR_PALETTES: Record<string, ColorPalette> = {
  gargantua: {
    id: 'gargantua',
    name: 'Gargantua Gold',
    description: 'Cinematic supermassive black hole with intense golden-amber thermal radiation',
    innerCore: '#ffffff',
    midDisk: '#ff9d00',
    outerWisps: '#b83b00',
    photonRing: '#ffc864',
    jetColor: '#ffe5a3',
    ambientTint: '#2b1404',
  },
  cygnus: {
    id: 'cygnus',
    name: 'Cygnus Blue',
    description: 'Ultra-hot high-energy X-ray binary with ionized blue plasma',
    innerCore: '#e6ffff',
    midDisk: '#00bfff',
    outerWisps: '#0033aa',
    photonRing: '#80e5ff',
    jetColor: '#38bdf8',
    ambientTint: '#03142e',
  },
  quasar: {
    id: 'quasar',
    name: 'Quasar Violet',
    description: 'Distant active galactic nucleus with exotic ultraviolet synchrotron emissions',
    innerCore: '#fdf4ff',
    midDisk: '#c084fc',
    outerWisps: '#6b21a8',
    photonRing: '#e879f9',
    jetColor: '#f472b6',
    ambientTint: '#1c0529',
  },
  emerald: {
    id: 'emerald',
    name: 'Supernova Jade',
    description: 'Post-collapse stellar remnant enriched in ionized oxygen and heavy elements',
    innerCore: '#f0fdf4',
    midDisk: '#22c55e',
    outerWisps: '#064e3b',
    photonRing: '#86efac',
    jetColor: '#4ade80',
    ambientTint: '#021f15',
  },
  inferno: {
    id: 'inferno',
    name: 'Solar Flare Red',
    description: 'Violent accretion event devouring a red giant companion star',
    innerCore: '#fff7ed',
    midDisk: '#ef4444',
    outerWisps: '#7f1d1d',
    photonRing: '#f87171',
    jetColor: '#fb923c',
    ambientTint: '#250505',
  },
  monochrome: {
    id: 'monochrome',
    name: 'Singularity White',
    description: 'Pure high-contrast relativistic luminance in pristine monochrome',
    innerCore: '#ffffff',
    midDisk: '#cccccc',
    outerWisps: '#444444',
    photonRing: '#ffffff',
    jetColor: '#ffffff',
    ambientTint: '#111111',
  },
};

/**
 * Calculates Keplerian orbital speed for a particle at radius r from central mass M.
 * v = sqrt(G * M / r) -> angular velocity omega = v / r = sqrt(G * M / r^3)
 */
export function calculateKeplerianAngularVelocity(radius: number, mass: number = 100, gConstant: number = 1): number {
  if (radius <= 0) return 0;
  return Math.sqrt((gConstant * mass) / (radius * radius * radius));
}

/**
 * Computes inward gravitational drift step.
 * Inward velocity increases as particle approaches event horizon.
 */
export function computeInwardDrift(
  radius: number,
  eventHorizonRadius: number,
  gravityPull: number,
  deltaTime: number
): number {
  if (radius <= eventHorizonRadius) return 0;
  // Drift velocity scales inversely with distance to singularity (gravitational acceleration)
  const proximityFactor = Math.pow(eventHorizonRadius / radius, 1.4);
  const driftSpeed = gravityPull * (0.8 + proximityFactor * 3.5);
  return driftSpeed * deltaTime;
}

/**
 * Computes relativistic Doppler beaming intensity factor.
 * Light emitted from gas moving towards the observer is boosted, while receding gas is dimmed.
 * @param orbitalAngle Current orbital azimuth angle
 * @param cameraAngle Camera azimuth angle around black hole
 * @param beta v/c relativistic velocity ratio (0.0 - 0.7)
 */
export function computeDopplerBeamingFactor(orbitalAngle: number, cameraAngle: number, beta: number = 0.35): number {
  // Line of sight angle between orbital velocity vector and camera direction
  const relativeAngle = orbitalAngle - cameraAngle;
  // Velocity is perpendicular to radius: cos(relativeAngle + PI/2) = -sin(relativeAngle)
  const cosTheta = -Math.sin(relativeAngle);
  
  // Clamped beta for visual aesthetics
  const b = Math.min(Math.max(beta, 0.0), 0.75);
  // Relativistic Doppler factor D = 1 / (gamma * (1 - beta * cosTheta))
  const gamma = 1 / Math.sqrt(Math.max(0.01, 1 - b * b));
  const doppler = 1 / (gamma * (1 - b * cosTheta));
  
  // Intensity scales roughly with D^3, clamped for visual stability
  return Math.min(Math.max(Math.pow(doppler, 2.5), 0.3), 2.8);
}

/**
 * Converts a hex color string to normalized RGB tuple [r, g, b] (0-1 range).
 */
export function hexToRgb(hex: string): [number, number, number] {
  const cleanHex = hex.replace('#', '');
  const bigint = parseInt(cleanHex, 16);
  const r = ((bigint >> 16) & 255) / 255;
  const g = ((bigint >> 8) & 255) / 255;
  const b = (bigint & 255) / 255;
  return [r, g, b];
}

/**
 * Interpolates between two RGB colors.
 */
export function lerpRgb(
  colorA: [number, number, number],
  colorB: [number, number, number],
  t: number
): [number, number, number] {
  const clampedT = Math.min(Math.max(t, 0), 1);
  return [
    colorA[0] + (colorB[0] - colorA[0]) * clampedT,
    colorA[1] + (colorB[1] - colorA[1]) * clampedT,
    colorA[2] + (colorB[2] - colorA[2]) * clampedT,
  ];
}

/**
 * Computes particle color based on radial distance from black hole within accretion disk.
 * Inner particles (close to ISCO) are white-hot, mid disk is vibrant, outer is darker red/wisps.
 */
export function getParticleColorByRadius(
  radius: number,
  innerRadius: number,
  outerRadius: number,
  palette: ColorPalette
): [number, number, number] {
  const normalizedDist = Math.min(Math.max((radius - innerRadius) / (outerRadius - innerRadius), 0), 1);
  
  const coreRgb = hexToRgb(palette.innerCore);
  const midRgb = hexToRgb(palette.midDisk);
  const outerRgb = hexToRgb(palette.outerWisps);

  if (normalizedDist < 0.28) {
    // Transition from white-hot core to dense mid disk
    const t = normalizedDist / 0.28;
    return lerpRgb(coreRgb, midRgb, t);
  } else {
    // Transition from mid disk to cooler outer wisps
    const t = (normalizedDist - 0.28) / 0.72;
    return lerpRgb(midRgb, outerRgb, t);
  }
}

/**
 * Computes spaghettification tidal stretching for matter entering gravitational field.
 * As distance decreases toward event horizon, radial stretch increases while tangential width compresses.
 */
export function computeSpaghettificationScale(radius: number, eventHorizonRadius: number): {
  stretchZ: number;
  squashXY: number;
} {
  const ratio = Math.max(radius / eventHorizonRadius, 1.0);
  // Tidal acceleration ~ 1 / r^3
  const tidalForce = 1 / Math.pow(ratio, 2.2);
  const stretchZ = 1.0 + tidalForce * 4.5;
  const squashXY = Math.max(0.2, 1.0 - tidalForce * 0.75);
  return { stretchZ, squashXY };
}

/**
 * Standard gravitational parameter for the central supermassive black hole.
 * Calibrated such that at r = 46 AU (default belt center), stable circular orbital speed is ~ 3.5 units/s.
 */
export const BASE_BLACK_HOLE_GM = 560.0;

/**
 * Computes the 3D gravitational acceleration vector towards the black hole at origin (0, 0, 0)
 * using Newton's inverse-square law: a = - (G * M * scale / r^3) * r_vec
 */
export function computeGravitationalAcceleration(
  x: number,
  y: number,
  z: number,
  gm: number = BASE_BLACK_HOLE_GM,
  softening: number = 0.5
): [number, number, number] {
  const rSq = x * x + y * y + z * z + softening * softening;
  const r = Math.sqrt(rSq);
  if (r <= 0.0001) return [0, 0, 0];

  // Inverse-square law: magnitude = GM / r^2, direction = -r_vec / r -> -GM / r^3 * r_vec
  const factor = -gm / (r * rSq);
  return [factor * x, factor * y, factor * z];
}

/**
 * Computes a stable initial circular orbital velocity vector for a body at position (x, y, z).
 * Tangential direction in the orbital plane with speed v = sqrt(GM / r).
 */
export function computeStableOrbitalVelocity(
  x: number,
  y: number,
  z: number,
  gm: number = BASE_BLACK_HOLE_GM,
  eccentricityJitter: number = 0.0
): [number, number, number] {
  const r = Math.sqrt(x * x + y * y + z * z);
  const rXZ = Math.sqrt(x * x + z * z);
  if (r <= 0.001 || rXZ <= 0.001) return [0, 0, 0];

  // Stable circular speed v = sqrt(GM / r)
  const speed = Math.sqrt(gm / r) * (1.0 + eccentricityJitter);

  // Tangential unit vector in horizontal XZ plane: (-z / rXZ, 0, x / rXZ)
  const tx = -z / rXZ;
  const tz = x / rXZ;

  // Counterbalance slight vertical tilt if any
  const ty = (y !== 0) ? -y * 0.08 : 0;

  return [tx * speed, ty * speed, tz * speed];
}

/**
 * Single numerical integration step for a Newtonian orbiting body.
 */
export function stepNewtonianBody(
  x: number,
  y: number,
  z: number,
  vx: number,
  vy: number,
  vz: number,
  gm: number,
  dt: number
): {
  pos: [number, number, number];
  vel: [number, number, number];
  radius: number;
} {
  const [ax, ay, az] = computeGravitationalAcceleration(x, y, z, gm);
  
  // Symplectic Euler / leapfrog integration for long-term orbital energy conservation
  const nvx = vx + ax * dt;
  const nvy = vy + ay * dt;
  const nvz = vz + az * dt;

  const nx = x + nvx * dt;
  const ny = y + nvy * dt;
  const nz = z + nvz * dt;

  const radius = Math.sqrt(nx * nx + ny * ny + nz * nz);

  return {
    pos: [nx, ny, nz],
    vel: [nvx, nvy, nvz],
    radius,
  };
}

export interface SimulationEvent {
  id: string;
  timestamp: string;
  type:
    | 'asteroid_consumed'
    | 'probe_consumed'
    | 'belt_respawn'
    | 'gravity_change'
    | 'collision'
    | 'fragmentation'
    | 'planetoid_spawned'
    | 'celestial_spawned'
    | 'celestial_consumed';
  title: string;
  details: string;
  distanceAU?: number;
}

/**
 * 3D Rigid-Body representation for asteroids, probes, debris chunks, and rogue planetoids.
 */
export interface RigidBody {
  id: number;
  type: 'asteroid' | 'probe' | 'debris' | 'planetoid';
  // 3D position
  x: number;
  y: number;
  z: number;
  // 3D linear velocity
  vx: number;
  vy: number;
  vz: number;
  // 3D acceleration scratchpad
  ax: number;
  ay: number;
  az: number;
  // Physical properties
  mass: number;         // Mass proportional to volume: density * (4/3)*pi*r^3
  radius: number;       // Sphere collider radius
  restitution: number;  // Bounciness coefficient
  inertia: number;      // Moment of inertia for solid sphere: 0.4 * mass * radius^2
  // 3D orientation & angular spin
  rotX: number;
  rotY: number;
  rotZ: number;
  angVx: number;
  angVy: number;
  angVz: number;
  // State
  isAlive: boolean;
  spaghettifying: boolean;
  generation: number;   // 0 = primary, 1 = fragment, 2 = fine fragment
}

/**
 * Fast 3D Spatial Hash Grid for O(N) broadphase collision culling.
 */
export class SpatialHashGrid3D {
  public cellSize: number;
  public cells: Map<number, number[]>;

  constructor(cellSize: number = 7.0) {
    this.cellSize = cellSize;
    this.cells = new Map();
  }

  public clear(): void {
    this.cells.clear();
  }

  private hash(cx: number, cy: number, cz: number): number {
    return ((cx * 73856093) ^ (cy * 19349663) ^ (cz * 83492791)) | 0;
  }

  public insert(bodyIndex: number, x: number, y: number, z: number): void {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    const cz = Math.floor(z / this.cellSize);
    const key = this.hash(cx, cy, cz);
    let cell = this.cells.get(key);
    if (!cell) {
      cell = [];
      this.cells.set(key, cell);
    }
    cell.push(bodyIndex);
  }

  public queryCandidates(x: number, y: number, z: number, radius: number): number[] {
    const minCx = Math.floor((x - radius) / this.cellSize);
    const maxCx = Math.floor((x + radius) / this.cellSize);
    const minCy = Math.floor((y - radius) / this.cellSize);
    const maxCy = Math.floor((y + radius) / this.cellSize);
    const minCz = Math.floor((z - radius) / this.cellSize);
    const maxCz = Math.floor((z + radius) / this.cellSize);

    const candidates: number[] = [];
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        for (let cz = minCz; cz <= maxCz; cz++) {
          const key = this.hash(cx, cy, cz);
          const cell = this.cells.get(key);
          if (cell) {
            for (let i = 0; i < cell.length; i++) {
              candidates.push(cell[i]);
            }
          }
        }
      }
    }
    return candidates;
  }
}

export interface CollisionEventData {
  collided: boolean;
  impactEnergy: number;
  normalImpulse: number;
  contactX: number;
  contactY: number;
  contactZ: number;
  normalX: number;
  normalY: number;
  normalZ: number;
  shouldShatterA: boolean;
  shouldShatterB: boolean;
}

/**
 * Resolves 3D impulse collision between two rigid bodies with momentum conservation,
 * kinetic energy transfer, positional penetration separation, and off-center angular torque.
 */
export function resolveRigidBodyCollision(
  a: RigidBody,
  b: RigidBody,
  defaultRestitution: number = 0.65,
  fragmentationThreshold: number = 38.0
): CollisionEventData {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  const distSq = dx * dx + dy * dy + dz * dz;
  const minDist = a.radius + b.radius;

  if (distSq >= minDist * minDist || distSq <= 0.000001) {
    return {
      collided: false,
      impactEnergy: 0,
      normalImpulse: 0,
      contactX: 0,
      contactY: 0,
      contactZ: 0,
      normalX: 0,
      normalY: 0,
      normalZ: 0,
      shouldShatterA: false,
      shouldShatterB: false,
    };
  }

  const dist = Math.sqrt(distSq);
  const nx = dx / dist;
  const ny = dy / dist;
  const nz = dz / dist;

  // 1. Positional Separation (Baumgarte stabilization)
  const overlap = minDist - dist;
  const invMassA = 1.0 / a.mass;
  const invMassB = 1.0 / b.mass;
  const totalInvMass = invMassA + invMassB;

  if (totalInvMass > 0) {
    const separationFactor = 0.8;
    const moveA = (invMassA / totalInvMass) * overlap * separationFactor;
    const moveB = (invMassB / totalInvMass) * overlap * separationFactor;

    a.x -= nx * moveA;
    a.y -= ny * moveA;
    a.z -= nz * moveA;

    b.x += nx * moveB;
    b.y += ny * moveB;
    b.z += nz * moveB;
  }

  // 2. Relative Velocity at Contact Point
  const rAx = nx * a.radius;
  const rAy = ny * a.radius;
  const rAz = nz * a.radius;

  const rBx = -nx * b.radius;
  const rBy = -ny * b.radius;
  const rBz = -nz * b.radius;

  // Velocity due to angular spin: v_rot = omega x r
  const vRotAx = a.angVy * rAz - a.angVz * rAy;
  const vRotAy = a.angVz * rAx - a.angVx * rAz;
  const vRotAz = a.angVx * rAy - a.angVy * rAx;

  const vRotBx = b.angVy * rBz - b.angVz * rBy;
  const vRotBy = b.angVz * rBx - b.angVx * rBz;
  const vRotBz = b.angVx * rBy - b.angVy * rBx;

  const totalVxA = a.vx + vRotAx;
  const totalVyA = a.vy + vRotAy;
  const totalVzA = a.vz + vRotAz;

  const totalVxB = b.vx + vRotBx;
  const totalVyB = b.vy + vRotBy;
  const totalVzB = b.vz + vRotBz;

  const relVx = totalVxB - totalVxA;
  const relVy = totalVyB - totalVyA;
  const relVz = totalVzB - totalVzA;

  // Velocity along collision normal
  const vn = relVx * nx + relVy * ny + relVz * nz;

  // Do not resolve impulse if objects are already separating
  if (vn > 0) {
    return {
      collided: true,
      impactEnergy: 0,
      normalImpulse: 0,
      contactX: (a.x + b.x) * 0.5,
      contactY: (a.y + b.y) * 0.5,
      contactZ: (a.z + b.z) * 0.5,
      normalX: nx,
      normalY: ny,
      normalZ: nz,
      shouldShatterA: false,
      shouldShatterB: false,
    };
  }

  // 3. Normal Impulse Resolution
  const e = Math.min(Math.min(a.restitution, b.restitution), defaultRestitution);
  
  // Rotational inertia terms along collision normal
  const rACrossN_x = rAy * nz - rAz * ny;
  const rACrossN_y = rAz * nx - rAx * nz;
  const rACrossN_z = rAx * ny - rAy * nx;
  const rotInertiaA = (rACrossN_x * rACrossN_x + rACrossN_y * rACrossN_y + rACrossN_z * rACrossN_z) / a.inertia;

  const rBCrossN_x = rBy * nz - rBz * ny;
  const rBCrossN_y = rBz * nx - rBx * nz;
  const rBCrossN_z = rBx * ny - rBy * nx;
  const rotInertiaB = (rBCrossN_x * rBCrossN_x + rBCrossN_y * rBCrossN_y + rBCrossN_z * rBCrossN_z) / b.inertia;

  const normalDenominator = totalInvMass + rotInertiaA + rotInertiaB;
  const jn = -(1.0 + e) * vn / Math.max(normalDenominator, 0.0001);

  // Apply Normal Linear Impulse
  a.vx -= jn * invMassA * nx;
  a.vy -= jn * invMassA * ny;
  a.vz -= jn * invMassA * nz;

  b.vx += jn * invMassB * nx;
  b.vy += jn * invMassB * ny;
  b.vz += jn * invMassB * nz;

  // 4. Tangential Friction Impulse & Angular Spin / Torque
  const vtX = relVx - vn * nx;
  const vtY = relVy - vn * ny;
  const vtZ = relVz - vn * nz;
  const vtMag = Math.sqrt(vtX * vtX + vtY * vtY + vtZ * vtZ);

  if (vtMag > 0.001) {
    const tx = vtX / vtMag;
    const ty = vtY / vtMag;
    const tz = vtZ / vtMag;

    const frictionCoeff = 0.28;
    const jtMax = frictionCoeff * jn;
    const jt = Math.min(jtMax, (vtMag / Math.max(totalInvMass, 0.0001)) * 0.45);

    // Linear friction damping
    a.vx += jt * invMassA * tx;
    a.vy += jt * invMassA * ty;
    a.vz += jt * invMassA * tz;

    b.vx -= jt * invMassB * tx;
    b.vy -= jt * invMassB * ty;
    b.vz -= jt * invMassB * tz;

    // Torque on body A: tau = rA x (-J_tangent)
    const tauAx = rAy * tz - rAz * ty;
    const tauAy = rAz * tx - rAx * tz;
    const tauAz = rAx * ty - rAy * tx;
    a.angVx -= (tauAx * jt) / a.inertia;
    a.angVy -= (tauAy * jt) / a.inertia;
    a.angVz -= (tauAz * jt) / a.inertia;

    // Torque on body B: tau = rB x (J_tangent)
    const tauBx = rBy * tz - rBz * ty;
    const tauBy = rBz * tx - rBx * tz;
    const tauBz = rBx * ty - rBy * tx;
    b.angVx += (tauBx * jt) / b.inertia;
    b.angVy += (tauBy * jt) / b.inertia;
    b.angVz += (tauBz * jt) / b.inertia;
  }

  // 5. Impact Kinetic Energy & Fragmentation Calculation
  const reducedMass = (a.mass * b.mass) / (a.mass + b.mass);
  const impactSpeedSq = vn * vn + 0.3 * (vtMag * vtMag);
  const impactEnergy = 0.5 * reducedMass * impactSpeedSq;

  let shouldShatterA = false;
  let shouldShatterB = false;

  if (impactEnergy >= fragmentationThreshold) {
    // Cannot shatter planetoids or bodies that have already fragmented to generation 2
    if (a.type !== 'planetoid' && a.radius >= 0.5 && a.generation < 2) {
      shouldShatterA = true;
    }
    if (b.type !== 'planetoid' && b.radius >= 0.5 && b.generation < 2) {
      shouldShatterB = true;
    }
  }

  return {
    collided: true,
    impactEnergy,
    normalImpulse: jn,
    contactX: (a.x + b.x) * 0.5,
    contactY: (a.y + b.y) * 0.5,
    contactZ: (a.z + b.z) * 0.5,
    normalX: nx,
    normalY: ny,
    normalZ: nz,
    shouldShatterA,
    shouldShatterB,
  };
}

/**
 * Shatters a parent asteroid into 3 to 5 physical debris chunks that inherit momentum,
 * satisfy mass conservation, and disperse with explosive kinetic energy.
 */
export function shatterRigidBody(
  parent: RigidBody,
  impactNormal: [number, number, number],
  getNextId: () => number,
  chunkCount: number = 4
): RigidBody[] {
  parent.isAlive = false;

  const chunks: RigidBody[] = [];
  const chunkMass = parent.mass / chunkCount;
  // Radius scales with cube root of mass for constant density
  const chunkRadius = parent.radius * Math.pow(1.0 / chunkCount, 1 / 3) * 0.92;
  const chunkInertia = 0.4 * chunkMass * chunkRadius * chunkRadius;

  // Tangent and bitangent directions orthogonal to impact normal
  const nx = impactNormal[0];
  const ny = impactNormal[1];
  const nz = impactNormal[2];

  // Arbitrary perpendicular vector
  let px = 0;
  let py = 1;
  let pz = 0;
  if (Math.abs(ny) > 0.9) {
    px = 1;
    py = 0;
  }

  // Gram-Schmidt orthogonalization
  const dotP = px * nx + py * ny + pz * nz;
  let tx = px - dotP * nx;
  let ty = py - dotP * ny;
  let tz = pz - dotP * nz;
  const tLen = Math.sqrt(tx * tx + ty * ty + tz * tz) || 1;
  tx /= tLen;
  ty /= tLen;
  tz /= tLen;

  // Bitangent = n x t
  const bx = ny * tz - nz * ty;
  const by = nz * tx - nx * tz;
  const bz = nx * ty - ny * tx;

  const scatterSpeed = 2.4 + Math.random() * 2.0;

  for (let i = 0; i < chunkCount; i++) {
    const angle = (i / chunkCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    // Direction outward in collision tangent plane
    const dirX = tx * cosA + bx * sinA;
    const dirY = ty * cosA + by * sinA;
    const dirZ = tz * cosA + bz * sinA;

    // Position offset so debris pieces do not overlap immediately
    const offsetDist = parent.radius * 0.85;
    const posX = parent.x + dirX * offsetDist;
    const posY = parent.y + dirY * offsetDist;
    const posZ = parent.z + dirZ * offsetDist;

    // Linear velocity = parent velocity + radial scatter
    const vx = parent.vx + dirX * scatterSpeed;
    const vy = parent.vy + dirY * scatterSpeed;
    const vz = parent.vz + dirZ * scatterSpeed;

    chunks.push({
      id: getNextId(),
      type: 'debris',
      x: posX,
      y: posY,
      z: posZ,
      vx,
      vy,
      vz,
      ax: 0,
      ay: 0,
      az: 0,
      mass: chunkMass,
      radius: chunkRadius,
      restitution: parent.restitution,
      inertia: chunkInertia,
      rotX: Math.random() * Math.PI,
      rotY: Math.random() * Math.PI,
      rotZ: Math.random() * Math.PI,
      angVx: (Math.random() - 0.5) * 6.0,
      angVy: (Math.random() - 0.5) * 6.0,
      angVz: (Math.random() - 0.5) * 6.0,
      isAlive: true,
      spaghettifying: false,
      generation: parent.generation + 1,
    });
  }

  return chunks;
}

/**
 * Calculates local gravitational perturbations from massive bodies (such as rogue planetoids).
 */
export function computeNBodyPerturbations(
  target: RigidBody,
  massiveBodies: RigidBody[],
  gConstant: number = 4.0
): [number, number, number] {
  let pax = 0;
  let pay = 0;
  let paz = 0;

  for (let i = 0; i < massiveBodies.length; i++) {
    const mb = massiveBodies[i];
    if (mb.id === target.id || !mb.isAlive) continue;

    const dx = mb.x - target.x;
    const dy = mb.y - target.y;
    const dz = mb.z - target.z;
    const distSq = dx * dx + dy * dy + dz * dz + 4.0; // Softening
    const dist = Math.sqrt(distSq);

    const accel = (gConstant * mb.mass) / distSq;
    pax += (dx / dist) * accel;
    pay += (dy / dist) * accel;
    paz += (dz / dist) * accel;
  }

  return [pax, pay, paz];
}

/**
 * Velocity Verlet integration step for rigid body position and orientation.
 */
export function integrateRigidBodyVerlet(body: RigidBody, dt: number): void {
  // Update linear velocity and position
  body.vx += body.ax * dt;
  body.vy += body.ay * dt;
  body.vz += body.az * dt;

  body.x += body.vx * dt;
  body.y += body.vy * dt;
  body.z += body.vz * dt;

  // Update angular orientation
  body.rotX += body.angVx * dt;
  body.rotY += body.angVy * dt;
  body.rotZ += body.angVz * dt;
}


