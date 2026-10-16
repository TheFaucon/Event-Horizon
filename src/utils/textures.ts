/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';

/**
 * Creates a circular glowing particle texture using HTML5 Canvas.
 * Generates an ethereal, anti-aliased aura without any external image files.
 */
export function createParticleTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  const center = 64;
  const gradient = ctx.createRadialGradient(center, center, 0, center, center, center);
  gradient.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
  gradient.addColorStop(0.2, 'rgba(255, 240, 220, 0.85)');
  gradient.addColorStop(0.5, 'rgba(255, 180, 80, 0.35)');
  gradient.addColorStop(0.8, 'rgba(255, 120, 30, 0.08)');
  gradient.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Creates a procedural rock bump & roughness texture for realistic asteroid shading.
 */
export function createAsteroidTextures(): {
  bumpMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
} {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Generate fractal noise-based rocky surface
  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;

  // Simple pseudo-random hash generator for deterministic procedural noise
  const pseudoNoise = (x: number, y: number, seed: number = 42) => {
    const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
    return n - Math.floor(n);
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      
      // Multi-octave pseudo-noise
      const n1 = pseudoNoise(x * 0.05, y * 0.05, 1);
      const n2 = pseudoNoise(x * 0.1, y * 0.1, 2) * 0.5;
      const n3 = pseudoNoise(x * 0.25, y * 0.25, 3) * 0.25;
      const combined = (n1 + n2 + n3) / 1.75;
      
      // Cratering effect
      const craterNoise = Math.sin(x * 0.08) * Math.cos(y * 0.08);
      const value = Math.floor(Math.min(Math.max((combined * 0.75 + craterNoise * 0.25) * 255, 0), 255));

      data[idx] = value;     // R
      data[idx + 1] = value; // G
      data[idx + 2] = value; // B
      data[idx + 3] = 255;   // A
    }
  }

  ctx.putImageData(imgData, 0, 0);

  const bumpMap = new THREE.CanvasTexture(canvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;

  const roughnessMap = new THREE.CanvasTexture(canvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;

  return { bumpMap, roughnessMap };
}

/**
 * Creates soft ethereal nebula clouds for the deep space background.
 */
export function createNebulaTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createRadialGradient(128, 128, 10, 128, 128, 128);
  gradient.addColorStop(0.0, 'rgba(255, 255, 255, 0.45)');
  gradient.addColorStop(0.35, 'rgba(180, 140, 255, 0.22)');
  gradient.addColorStop(0.7, 'rgba(70, 90, 200, 0.08)');
  gradient.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Creates an irregular asteroid geometry by perturbing an icosahedron geometry.
 * Displaces vertices based on spherical harmonics to generate authentic rocky facets and craters.
 */
export function createAsteroidGeometry(radius: number = 1.0, detail: number = 1): THREE.BufferGeometry {
  const geometry = new THREE.IcosahedronGeometry(radius, detail);
  const posAttr = geometry.attributes.position;
  const vertex = new THREE.Vector3();

  for (let i = 0; i < posAttr.count; i++) {
    vertex.fromBufferAttribute(posAttr, i);

    // Apply irregular non-spherical distortion
    const len = vertex.length();
    const noise = 
      Math.sin(vertex.x * 2.8) * 0.18 +
      Math.cos(vertex.y * 3.4) * 0.16 +
      Math.sin(vertex.z * 2.1) * 0.14;

    const flattened = 1.0 + (noise - 0.05);
    vertex.multiplyScalar(flattened);

    posAttr.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }

  geometry.computeVertexNormals();
  return geometry;
}
