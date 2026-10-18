/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const DEFAULT_BLACK_HOLE_GM = 360.0;

/**
 * Calculates 3D orbital position from semi-major axis, true anomaly angle, eccentricity, and inclination.
 */
export function calculateCelestialOrbitalPosition(
  semiMajorAxis: number,
  angleRad: number,
  eccentricity: number = 0,
  inclinationDeg: number = 0
): [number, number, number] {
  const e = Math.max(0, Math.min(0.85, eccentricity));
  const r = (semiMajorAxis * (1 - e * e)) / (1 + e * Math.cos(angleRad));
  const incRad = (inclinationDeg * Math.PI) / 180;

  const xOrb = r * Math.cos(angleRad);
  const zOrb = r * Math.sin(angleRad);

  const x = xOrb;
  const y = zOrb * Math.sin(incRad);
  const z = zOrb * Math.cos(incRad);

  return [x, y, z];
}

/**
 * Computes initial 3D orbital velocity vector in Vis-Viva Keplerian orbit around the black hole.
 */
export function calculateCelestialOrbitalVelocity(
  semiMajorAxis: number,
  angleRad: number,
  gm: number = DEFAULT_BLACK_HOLE_GM,
  speedMultiplier: number = 1.0,
  eccentricity: number = 0,
  inclinationDeg: number = 0
): [number, number, number] {
  const [x, y, z] = calculateCelestialOrbitalPosition(semiMajorAxis, angleRad, eccentricity, inclinationDeg);
  const r = Math.sqrt(x * x + y * y + z * z);
  if (r < 0.001) return [0, 0, 0];

  // Vis-viva equation: v^2 = GM * (2/r - 1/a)
  const visVivaTerm = Math.max(0.0001, 2 / r - 1 / Math.max(1, semiMajorAxis));
  const speed = Math.sqrt(gm * visVivaTerm) * speedMultiplier;

  const incRad = (inclinationDeg * Math.PI) / 180;
  // Unit tangent vector along the inclined orbital plane
  const tx = -Math.sin(angleRad);
  const ty = Math.cos(angleRad) * Math.sin(incRad);
  const tz = Math.cos(angleRad) * Math.cos(incRad);

  const tLen = Math.sqrt(tx * tx + ty * ty + tz * tz) || 1;
  return [(tx / tLen) * speed, (ty / tLen) * speed, (tz / tLen) * speed];
}

/**
 * Computes 3D relative position of a moon orbiting its parent planet.
 */
export function calculateMoonPosition(
  parentX: number,
  parentY: number,
  parentZ: number,
  moonOrbitalDistance: number,
  moonAngleRad: number,
  moonInclinationDeg: number = 0
): [number, number, number] {
  const incRad = (moonInclinationDeg * Math.PI) / 180;
  const mx = moonOrbitalDistance * Math.cos(moonAngleRad);
  const mzOrb = moonOrbitalDistance * Math.sin(moonAngleRad);

  const my = mzOrb * Math.sin(incRad);
  const mz = mzOrb * Math.cos(incRad);

  return [parentX + mx, parentY + my, parentZ + mz];
}

/**
 * Generates an array of [x, y, z] coordinates tracing the full closed orbital ellipse.
 */
export function generateOrbitPathPoints(
  semiMajorAxis: number,
  eccentricity: number = 0,
  inclinationDeg: number = 0,
  segments: number = 96
): [number, number, number][] {
  const points: [number, number, number][] = [];
  const count = Math.max(8, segments);
  for (let i = 0; i < count; i++) {
    const theta = (i / count) * Math.PI * 2;
    points.push(calculateCelestialOrbitalPosition(semiMajorAxis, theta, eccentricity, inclinationDeg));
  }
  return points;
}
