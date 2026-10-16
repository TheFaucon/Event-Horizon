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
  type: 'asteroid_consumed' | 'probe_consumed' | 'belt_respawn' | 'gravity_change';
  title: string;
  details: string;
  distanceAU?: number;
}

