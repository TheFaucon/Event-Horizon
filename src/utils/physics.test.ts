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
  SpatialHashGrid3D,
  resolveRigidBodyCollision,
  shatterRigidBody,
  computeNBodyPerturbations,
  integrateRigidBodyVerlet,
  COLOR_PALETTES,
} from './physics.ts';
import type { RigidBody } from './physics.ts';

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

test('SpatialHashGrid3D inserts and indexes bodies for fast 3D neighbor lookup', () => {
  const grid = new SpatialHashGrid3D(10.0);
  grid.insert(0, 5, 5, 5);
  grid.insert(1, 8, 5, 5); // Nearby
  grid.insert(2, 50, 50, 50); // Far away

  const candidatesNear = grid.queryCandidates(5, 5, 5, 4.0);
  assert.ok(candidatesNear.includes(0), 'Should find body 0');
  assert.ok(candidatesNear.includes(1), 'Should find body 1');
  assert.ok(!candidatesNear.includes(2), 'Should not find distant body 2');
});

test('resolveRigidBodyCollision conserves total linear momentum during 3D impact', () => {
  const bodyA: RigidBody = {
    id: 1,
    type: 'asteroid',
    x: 0,
    y: 0,
    z: 0,
    vx: 10,
    vy: 0,
    vz: 0,
    ax: 0,
    ay: 0,
    az: 0,
    mass: 2.0,
    radius: 1.0,
    restitution: 0.8,
    rotX: 0,
    rotY: 0,
    rotZ: 0,
    angVx: 0,
    angVy: 0,
    angVz: 0,
    inertia: 0.4 * 2.0 * 1.0,
    isAlive: true,
    spaghettifying: false,
    generation: 0,
  };

  const bodyB: RigidBody = {
    id: 2,
    type: 'asteroid',
    x: 1.5, // Overlapping by 0.5 units
    y: 0,
    z: 0,
    vx: -5,
    vy: 0,
    vz: 0,
    ax: 0,
    ay: 0,
    az: 0,
    mass: 3.0,
    radius: 1.0,
    restitution: 0.8,
    rotX: 0,
    rotY: 0,
    rotZ: 0,
    angVx: 0,
    angVy: 0,
    angVz: 0,
    inertia: 0.4 * 3.0 * 1.0,
    isAlive: true,
    spaghettifying: false,
    generation: 0,
  };

  const initialMomentumX = bodyA.mass * bodyA.vx + bodyB.mass * bodyB.vx; // 2 * 10 + 3 * (-5) = 5.0
  const result = resolveRigidBodyCollision(bodyA, bodyB, 0.8, 100.0);

  assert.ok(result.collided, 'Collision should be detected');
  assert.ok(result.normalImpulse > 0, 'Normal impulse must be positive');

  // Verify total momentum conservation
  const finalMomentumX = bodyA.mass * bodyA.vx + bodyB.mass * bodyB.vx;
  assert.ok(Math.abs(finalMomentumX - initialMomentumX) < 0.001, `Momentum conserved: before=${initialMomentumX}, after=${finalMomentumX}`);

  // Verify separation
  const postDist = Math.sqrt((bodyB.x - bodyA.x) ** 2 + (bodyB.y - bodyA.y) ** 2 + (bodyB.z - bodyA.z) ** 2);
  assert.ok(postDist > 1.5, 'Positional penetration must be resolved');
});

test('shatterRigidBody conserves total mass and produces debris chunks', () => {
  const parent: RigidBody = {
    id: 99,
    type: 'asteroid',
    x: 10,
    y: 0,
    z: 0,
    vx: 5,
    vy: 1,
    vz: -2,
    ax: 0,
    ay: 0,
    az: 0,
    mass: 12.0,
    radius: 1.5,
    restitution: 0.5,
    rotX: 0,
    rotY: 0,
    rotZ: 0,
    angVx: 0,
    angVy: 0,
    angVz: 0,
    inertia: 0.4 * 12 * 1.5 * 1.5,
    isAlive: true,
    spaghettifying: false,
    generation: 0,
  };

  let idCounter = 1000;
  const chunks = shatterRigidBody(parent, [1, 0, 0], () => idCounter++, 4);

  assert.equal(parent.isAlive, false, 'Parent must be deactivated');
  assert.equal(chunks.length, 4, 'Must create 4 debris chunks');

  // Total mass conservation
  const sumMass = chunks.reduce((acc, c) => acc + c.mass, 0);
  assert.ok(Math.abs(sumMass - parent.mass) < 0.001, 'Sum of chunk masses must equal parent mass');

  // Generations must be incremented
  assert.equal(chunks[0].generation, 1);
  assert.equal(chunks[0].type, 'debris');
});

test('computeNBodyPerturbations accelerates test body towards massive planetoid', () => {
  const target: RigidBody = {
    id: 1,
    type: 'asteroid',
    x: 10,
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    ax: 0,
    ay: 0,
    az: 0,
    mass: 1.0,
    radius: 0.5,
    restitution: 0.5,
    rotX: 0,
    rotY: 0,
    rotZ: 0,
    angVx: 0,
    angVy: 0,
    angVz: 0,
    inertia: 0.1,
    isAlive: true,
    spaghettifying: false,
    generation: 0,
  };

  const planetoid: RigidBody = {
    id: 999,
    type: 'planetoid',
    x: 20, // To the right (+X)
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    ax: 0,
    ay: 0,
    az: 0,
    mass: 200.0, // Massive!
    radius: 3.0,
    restitution: 0.5,
    rotX: 0,
    rotY: 0,
    rotZ: 0,
    angVx: 0,
    angVy: 0,
    angVz: 0,
    inertia: 50.0,
    isAlive: true,
    spaghettifying: false,
    generation: 0,
  };

  const [pax, pay, paz] = computeNBodyPerturbations(target, [planetoid], 1.0);
  assert.ok(pax > 0, 'Planetoid at +X must pull target towards +X');
  assert.ok(Math.abs(pay) < 1e-9);
  assert.ok(Math.abs(paz) < 1e-9);
});

test('integrateRigidBodyVerlet updates position and angular orientation', () => {
  const body: RigidBody = {
    id: 1,
    type: 'asteroid',
    x: 0,
    y: 0,
    z: 0,
    vx: 2,
    vy: 0,
    vz: 0,
    ax: 1,
    ay: 0,
    az: 0,
    mass: 1.0,
    radius: 1.0,
    restitution: 0.5,
    rotX: 0,
    rotY: 0,
    rotZ: 0,
    angVx: 0.5,
    angVy: 0,
    angVz: 0,
    inertia: 0.4,
    isAlive: true,
    spaghettifying: false,
    generation: 0,
  };

  integrateRigidBodyVerlet(body, 0.1);
  assert.ok(body.vx > 2.0, 'Velocity must increase with acceleration');
  assert.ok(body.x > 0.2, 'Position must advance with velocity');
  assert.ok(body.rotX > 0, 'Orientation must advance with angular spin');
});
