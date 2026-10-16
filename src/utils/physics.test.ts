/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateKeplerianAngularVelocity,
  computeInwardDrift,
  computeDopplerBeamingFactor,
  hexToRgb,
  lerpRgb,
  getParticleColorByRadius,
  computeSpaghettificationScale,
  computeGravitationalAcceleration,
  computeStableOrbitalVelocity,
  stepNewtonianBody,
  COLOR_PALETTES,
} from './physics.ts';

test('calculateKeplerianAngularVelocity decreases with radius (differential rotation)', () => {
  const innerOmega = calculateKeplerianAngularVelocity(4.0, 100);
  const outerOmega = calculateKeplerianAngularVelocity(16.0, 100);
  
  assert.ok(innerOmega > outerOmega, 'Inner particles must rotate faster than outer particles');
  assert.ok(innerOmega > 0, 'Angular velocity should be positive');
  assert.equal(calculateKeplerianAngularVelocity(0, 100), 0, 'Zero radius should return 0');
});

test('computeInwardDrift increases as particle gets closer to event horizon', () => {
  const horizon = 3.2;
  const farDrift = computeInwardDrift(20.0, horizon, 1.0, 0.016);
  const nearDrift = computeInwardDrift(4.0, horizon, 1.0, 0.016);
  
  assert.ok(nearDrift > farDrift, 'Gravitational inward drift must be stronger near event horizon');
  assert.equal(computeInwardDrift(3.0, horizon, 1.0, 0.016), 0, 'Past horizon drift is clamped');
});

test('computeDopplerBeamingFactor boosts approaching particles and dims receding ones', () => {
  const cameraAngle = 0; // Camera looking along positive Z
  // Particle at angle PI/2 is moving towards camera (-sin(PI/2) = -1 or +1 depending on orbit direction)
  const factorApproaching = computeDopplerBeamingFactor(Math.PI * 1.5, cameraAngle, 0.4);
  const factorReceding = computeDopplerBeamingFactor(Math.PI * 0.5, cameraAngle, 0.4);
  
  assert.ok(factorApproaching > factorReceding, 'Approaching side should have higher Doppler factor than receding side');
  assert.ok(factorApproaching > 1.0, 'Approaching side should be boosted above 1.0');
  assert.ok(factorReceding < 1.0, 'Receding side should be dimmed below 1.0');
});

test('hexToRgb and lerpRgb accurately convert and interpolate', () => {
  const white = hexToRgb('#ffffff');
  assert.deepEqual(white, [1, 1, 1]);

  const black = hexToRgb('#000000');
  assert.deepEqual(black, [0, 0, 0]);

  const mid = lerpRgb(black, white, 0.5);
  assert.deepEqual(mid, [0.5, 0.5, 0.5]);
});

test('getParticleColorByRadius smoothly maps inner hot to outer cooler colors', () => {
  const palette = COLOR_PALETTES.gargantua;
  const innerColor = getParticleColorByRadius(4.0, 4.0, 24.0, palette);
  const outerColor = getParticleColorByRadius(24.0, 4.0, 24.0, palette);

  assert.ok(innerColor[0] >= 0.9 && innerColor[1] >= 0.9, 'Inner color should be hot white/gold');
  assert.ok(outerColor[0] > outerColor[2], 'Outer color should be deep amber/red');
});

test('computeSpaghettificationScale stretches object along radial axis', () => {
  const horizon = 3.0;
  const distant = computeSpaghettificationScale(30.0, horizon);
  const plunging = computeSpaghettificationScale(3.5, horizon);

  assert.ok(plunging.stretchZ > distant.stretchZ, 'Tidal stretching should be higher near horizon');
  assert.ok(plunging.squashXY < distant.squashXY, 'Cross-section should squash as it stretches');
});

test('computeGravitationalAcceleration points towards black hole origin and follows inverse square', () => {
  const [axFar, ayFar, azFar] = computeGravitationalAcceleration(40, 0, 0, 500, 0);
  const [axNear] = computeGravitationalAcceleration(20, 0, 0, 500, 0);

  assert.ok(axFar < 0, 'Acceleration should point towards negative x (origin)');
  assert.ok(Math.abs(ayFar) < 1e-9, 'ay should be 0');
  assert.ok(Math.abs(azFar) < 1e-9, 'az should be 0');

  // Since distance is halved from 40 to 20, acceleration magnitude should be ~4x larger
  const ratio = Math.abs(axNear) / Math.abs(axFar);
  assert.ok(Math.abs(ratio - 4.0) < 0.1, `Acceleration should follow inverse square: expected ~4, got ${ratio}`);
});

test('computeStableOrbitalVelocity produces velocity perpendicular to position', () => {
  const x = 30;
  const z = 40; // r = 50
  const [vx, vy, vz] = computeStableOrbitalVelocity(x, 0, z, 500);

  // Dot product of position and velocity should be zero (perpendicular)
  const dot = x * vx + z * vz;
  assert.ok(Math.abs(dot) < 0.0001, 'Velocity must be perpendicular to radial vector');

  // Speed should equal sqrt(GM / r) = sqrt(500 / 50) = sqrt(10) ~ 3.162
  const speed = Math.sqrt(vx * vx + vy * vy + vz * vz);
  assert.ok(Math.abs(speed - Math.sqrt(10)) < 0.01, 'Speed must equal circular velocity');
});

test('stepNewtonianBody maintains stable orbit at 1g and spirals inward under +2g surge', () => {
  const r = 40;
  const [vx, vy, vz] = computeStableOrbitalVelocity(r, 0, 0, 500);

  // 1. One orbit step under balanced gravity
  const step1g = stepNewtonianBody(r, 0, 0, vx, vy, vz, 500, 0.05);
  // Radius should stay very close to 40
  assert.ok(Math.abs(step1g.radius - r) < 0.15, 'Stable orbit should maintain radius');

  // 2. Step under enhanced gravity (+2g = 2x GM)
  const step2g = stepNewtonianBody(r, 0, 0, vx, vy, vz, 1000, 0.05);
  // Under 2x gravity, the inward acceleration is stronger, so velocity vector pulls inward
  assert.ok(step2g.vel[0] < step1g.vel[0], 'Surge gravity should accelerate body inward');
});
