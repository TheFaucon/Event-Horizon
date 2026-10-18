/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCelestialOrbitalPosition,
  calculateCelestialOrbitalVelocity,
  calculateMoonPosition,
  generateOrbitPathPoints,
} from './celestialPhysics.ts';

test('calculateCelestialOrbitalPosition returns exact radius on circular equatorial orbit', () => {
  const [x, y, z] = calculateCelestialOrbitalPosition(40, 0, 0, 0);
  assert.equal(Math.round(x), 40);
  assert.equal(Math.round(y), 0);
  assert.equal(Math.round(z), 0);
});

test('calculateCelestialOrbitalPosition applies orbital inclination in 3D Y axis', () => {
  const [x, y, z] = calculateCelestialOrbitalPosition(50, Math.PI / 2, 0, 30);
  assert.ok(Math.abs(x) < 0.001);
  assert.ok(Math.abs(y - 25) < 0.01, `Expected Y ~ 25 for 30 deg inclination at R=50, got ${y}`);
  assert.ok(z > 40);
});

test('calculateCelestialOrbitalVelocity produces perpendicular tangential velocity vector', () => {
  const [vx, vy, vz] = calculateCelestialOrbitalVelocity(36, 0, 360, 1.0, 0, 0);
  assert.ok(Math.abs(vx) < 0.001);
  assert.equal(vy, 0);
  assert.ok(Math.abs(vz - Math.sqrt(10)) < 0.01);
});

test('calculateMoonPosition computes relative satellite offset around parent planet', () => {
  const [mx, my, mz] = calculateMoonPosition(10, 2, -5, 4, 0, 0);
  assert.equal(mx, 14);
  assert.equal(my, 2);
  assert.equal(mz, -5);
});

test('generateOrbitPathPoints generates requested number of 3D points', () => {
  const pts = generateOrbitPathPoints(45, 0.1, 12, 64);
  assert.equal(pts.length, 64);
  for (const p of pts) {
    assert.equal(p.length, 3);
    assert.ok(Number.isFinite(p[0]) && Number.isFinite(p[1]) && Number.isFinite(p[2]));
  }
});
