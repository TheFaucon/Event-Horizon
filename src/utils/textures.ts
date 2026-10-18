/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { PlanetStyle } from '../types/celestial';

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

/**
 * Creates molten magma & crust textures for the Massive Rogue Planetoid.
 */
export function createPlanetoidTextures(): {
  map: THREE.CanvasTexture;
  emissiveMap: THREE.CanvasTexture;
} {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const emissiveCanvas = document.createElement('canvas');
  emissiveCanvas.width = size;
  emissiveCanvas.height = size;
  const eCtx = emissiveCanvas.getContext('2d')!;

  // Base dark basalt crust
  ctx.fillStyle = '#1c1917';
  ctx.fillRect(0, 0, size, size);

  eCtx.fillStyle = '#000000';
  eCtx.fillRect(0, 0, size, size);

  // Draw glowing molten volcanic fissures and tectonic cracks
  const drawFissure = (startX: number, startY: number, segments: number) => {
    let x = startX;
    let y = startY;

    ctx.strokeStyle = '#ea580c';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x, y);

    eCtx.strokeStyle = '#ff781f';
    eCtx.lineWidth = 4;
    eCtx.beginPath();
    eCtx.moveTo(x, y);

    for (let i = 0; i < segments; i++) {
      x += (Math.random() - 0.48) * 36;
      y += (Math.random() - 0.48) * 36;
      ctx.lineTo(x, y);
      eCtx.lineTo(x, y);
    }
    ctx.stroke();
    eCtx.stroke();

    // Hot inner core of fissure
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    eCtx.strokeStyle = '#ffffff';
    eCtx.lineWidth = 1.5;
    eCtx.stroke();
  };

  for (let i = 0; i < 24; i++) {
    drawFissure(Math.random() * size, Math.random() * size, 12);
  }

  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;

  const emissiveMap = new THREE.CanvasTexture(emissiveCanvas);
  emissiveMap.colorSpace = THREE.SRGBColorSpace;

  return { map, emissiveMap };
}

/**
 * Creates high-fidelity procedural planetary surface textures for diverse celestial archetypes.
 */
export function createCelestialTexture(
  style: PlanetStyle,
  baseColorHex: string = '#3b82f6'
): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const pseudoNoise = (x: number, y: number, seed: number = 17) => {
    const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
    return n - Math.floor(n);
  };

  if (style === 'terrestrial') {
    // 1. Deep Ocean Base
    ctx.fillStyle = '#1d4ed8';
    ctx.fillRect(0, 0, size, size);

    // 2. Continents
    const imgData = ctx.getImageData(0, 0, size, size);
    const data = imgData.data;

    for (let y = 0; y < size; y++) {
      const latNorm = Math.abs(y - size / 2) / (size / 2); // 0 at equator, 1 at poles
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;

        // Polar ice caps
        if (latNorm > 0.82) {
          data[idx] = 240;
          data[idx + 1] = 248;
          data[idx + 2] = 255;
          continue;
        }

        // Continental fractal noise
        const n1 = pseudoNoise(x * 0.015, y * 0.015, 11);
        const n2 = pseudoNoise(x * 0.04, y * 0.04, 23) * 0.5;
        const n3 = pseudoNoise(x * 0.08, y * 0.08, 37) * 0.25;
        const continentNoise = (n1 + n2 + n3) / 1.75;

        if (continentNoise > 0.52) {
          // Landmass
          const elev = (continentNoise - 0.52) / 0.48;
          if (elev > 0.6) {
            // Mountain peak
            data[idx] = 161;
            data[idx + 1] = 120;
            data[idx + 2] = 86;
          } else if (elev > 0.2) {
            // Forest / Vegetation
            data[idx] = 34;
            data[idx + 1] = 139;
            data[idx + 2] = 34;
          } else {
            // Shore / Lowland
            data[idx] = 210;
            data[idx + 1] = 180;
            data[idx + 2] = 140;
          }
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);

    // 3. Cloud wisps
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    for (let i = 0; i < 35; i++) {
      const cx = Math.random() * size;
      const cy = 40 + Math.random() * (size - 80);
      const radX = 30 + Math.random() * 80;
      const radY = 6 + Math.random() * 18;
      ctx.beginPath();
      ctx.ellipse(cx, cy, radX, radY, (Math.random() - 0.5) * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (style === 'gas_giant' || style === 'ringed_saturn') {
    // Latitudinal banded gas giants (Jupiter/Saturn style)
    const isSaturn = style === 'ringed_saturn';
    const basePalette = isSaturn
      ? ['#fef08a', '#eab308', '#ca8a04', '#fed7aa', '#fde047', '#a16207']
      : ['#ea580c', '#c2410c', '#fed7aa', '#9a3412', '#fdba74', '#7c2d12'];

    for (let y = 0; y < size; y++) {
      const bandIndex = Math.floor((y / size) * basePalette.length);
      const nextIndex = (bandIndex + 1) % basePalette.length;
      const t = ((y / size) * basePalette.length) % 1;

      // Add turbulence wobble
      const wobble = Math.sin(y * 0.08) * 12 + Math.cos(y * 0.03) * 16;
      ctx.fillStyle = basePalette[(bandIndex + Math.floor(Math.sin(y * 0.05) * 0.6)) % basePalette.length];
      ctx.fillRect(0, y, size, 1);
    }

    // Great atmospheric storm vortex (Great Red Spot / Storm Eye)
    const spotX = size * 0.62;
    const spotY = size * 0.58;
    const spotGrad = ctx.createRadialGradient(spotX, spotY, 4, spotX, spotY, 45);
    spotGrad.addColorStop(0, '#f97316');
    spotGrad.addColorStop(0.6, '#ea580c');
    spotGrad.addColorStop(1, 'rgba(194, 65, 12, 0)');
    ctx.fillStyle = spotGrad;
    ctx.beginPath();
    ctx.ellipse(spotX, spotY, 42, 22, -0.15, 0, Math.PI * 2);
    ctx.fill();
  } else if (style === 'oceanic') {
    // Pure deep sapphire oceanic world
    ctx.fillStyle = '#0369a1';
    ctx.fillRect(0, 0, size, size);

    // Deep ocean currents
    for (let i = 0; i < 28; i++) {
      ctx.fillStyle = 'rgba(56, 189, 248, 0.18)';
      ctx.beginPath();
      ctx.ellipse(
        Math.random() * size,
        Math.random() * size,
        50 + Math.random() * 90,
        15 + Math.random() * 25,
        Math.random() * Math.PI,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
    // Atmospheric swirl
    ctx.fillStyle = 'rgba(255, 255, 255, 0.38)';
    for (let i = 0; i < 22; i++) {
      ctx.beginPath();
      ctx.ellipse(
        Math.random() * size,
        Math.random() * size,
        40 + Math.random() * 60,
        8 + Math.random() * 14,
        (Math.random() - 0.5) * 0.4,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
  } else if (style === 'lava') {
    // Molten lava world
    ctx.fillStyle = '#18181b';
    ctx.fillRect(0, 0, size, size);

    // Fiery fissures
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    for (let i = 0; i < 20; i++) {
      let px = Math.random() * size;
      let py = Math.random() * size;
      ctx.beginPath();
      ctx.moveTo(px, py);
      for (let s = 0; s < 10; s++) {
        px += (Math.random() - 0.5) * 40;
        py += (Math.random() - 0.5) * 40;
        ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    // Hot magma pools
    for (let i = 0; i < 15; i++) {
      const grad = ctx.createRadialGradient(
        Math.random() * size,
        Math.random() * size,
        0,
        Math.random() * size,
        Math.random() * size,
        25
      );
      grad.addColorStop(0, '#fef08a');
      grad.addColorStop(0.4, '#f97316');
      grad.addColorStop(1, 'rgba(239, 68, 68, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(Math.random() * size, Math.random() * size, 20, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (style === 'ice_dwarf') {
    // Pale ice world (Pluto / Europa)
    ctx.fillStyle = '#e0f2fe';
    ctx.fillRect(0, 0, size, size);

    // Darker methane / tholin deposits
    ctx.fillStyle = '#bae6fd';
    for (let i = 0; i < 20; i++) {
      ctx.beginPath();
      ctx.ellipse(
        Math.random() * size,
        Math.random() * size,
        30 + Math.random() * 50,
        15 + Math.random() * 30,
        Math.random() * Math.PI,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    // Icy tectonic fractures
    ctx.strokeStyle = '#7dd3fc';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 25; i++) {
      let px = Math.random() * size;
      let py = Math.random() * size;
      ctx.beginPath();
      ctx.moveTo(px, py);
      for (let s = 0; s < 8; s++) {
        px += (Math.random() - 0.5) * 50;
        py += (Math.random() - 0.5) * 50;
        ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
  } else if (style === 'desert') {
    // Mars / desert dunes
    ctx.fillStyle = '#b91c1c';
    ctx.fillRect(0, 0, size, size);

    // Rusty sand dunes
    for (let y = 0; y < size; y += 4) {
      ctx.fillStyle = y % 8 === 0 ? '#991b1b' : '#dc2626';
      ctx.fillRect(0, y, size, 2);
    }
    // Canyons & crater spots
    ctx.fillStyle = '#450a0a';
    for (let i = 0; i < 18; i++) {
      ctx.beginPath();
      ctx.arc(Math.random() * size, Math.random() * size, 4 + Math.random() * 12, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (style === 'toxic') {
    // Venus / toxic atmosphere
    ctx.fillStyle = '#65a30d';
    ctx.fillRect(0, 0, size, size);

    for (let y = 0; y < size; y++) {
      const g = Math.sin(y * 0.04) * 0.5 + 0.5;
      ctx.fillStyle = g > 0.5 ? '#84cc16' : '#4d7c0f';
      ctx.fillRect(0, y, size, 1);
    }
  } else {
    // Rocky default with tint
    ctx.fillStyle = baseColorHex;
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.beginPath();
      ctx.arc(Math.random() * size, Math.random() * size, 3 + Math.random() * 8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Creates a concentric radial banded texture for planetary ring systems (e.g. Saturn).
 * Maps across UV V-coordinate (radial distance from inner to outer edge) with Cassini division gaps.
 */
export function createRingTexture(ringColorHex: string = '#fbbf24'): THREE.CanvasTexture {
  const width = 512;
  const height = 64;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createLinearGradient(0, 0, width, 0);

  // Soft inner edge feathering
  gradient.addColorStop(0.0, 'rgba(0, 0, 0, 0.0)');
  gradient.addColorStop(0.08, 'rgba(251, 191, 36, 0.45)');
  gradient.addColorStop(0.25, 'rgba(254, 240, 138, 0.85)');
  gradient.addColorStop(0.48, 'rgba(245, 158, 11, 0.7)');

  // Cassini division (gap in rings)
  gradient.addColorStop(0.55, 'rgba(0, 0, 0, 0.0)');
  gradient.addColorStop(0.59, 'rgba(0, 0, 0, 0.0)');

  // Outer ring band A
  gradient.addColorStop(0.64, 'rgba(251, 191, 36, 0.65)');
  gradient.addColorStop(0.85, 'rgba(217, 119, 6, 0.5)');
  gradient.addColorStop(0.96, 'rgba(180, 83, 9, 0.2)');
  gradient.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Add micro-fine ring dust lines
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  for (let x = 40; x < width - 40; x += 6) {
    if (x > width * 0.53 && x < width * 0.61) continue; // skip Cassini gap
    ctx.fillRect(x, 0, 1.5, height);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Creates a cratered lunar texture for orbiting natural satellites.
 */
export function createMoonTexture(colorHex: string = '#cbd5e1'): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = colorHex;
  ctx.fillRect(0, 0, size, size);

  // Lunar Maria (darker basaltic plains)
  ctx.fillStyle = 'rgba(71, 85, 105, 0.35)';
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    ctx.arc(
      Math.random() * size,
      Math.random() * size,
      25 + Math.random() * 45,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  // Impact craters
  for (let i = 0; i < 28; i++) {
    const cx = Math.random() * size;
    const cy = Math.random() * size;
    const r = 3 + Math.random() * 12;

    // Crater depression
    ctx.fillStyle = 'rgba(30, 41, 59, 0.5)';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // Crater rim highlight
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(cx - 0.5, cy - 0.5, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

