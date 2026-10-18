/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type CelestialBodyType =
  | 'planet'
  | 'ringed_planet'
  | 'gas_giant'
  | 'dwarf_planet'
  | 'moon'
  | 'asteroid'
  | 'comet';

export type PlanetStyle =
  | 'terrestrial'
  | 'gas_giant'
  | 'ringed_saturn'
  | 'oceanic'
  | 'lava'
  | 'ice_dwarf'
  | 'desert'
  | 'toxic'
  | 'rocky_asteroid';

export interface MoonConfig {
  id: string;
  name: string;
  radius: number;
  orbitalDistance: number;
  orbitalSpeed: number;
  orbitalInclination: number;
  color: string;
}

export interface CelestialBodyDefinition {
  id: string;
  name: string;
  type: CelestialBodyType;
  style: PlanetStyle;
  radius: number;
  mass: number;
  color: string;
  hasAtmosphere: boolean;
  atmosphereColor: string;
  hasRings: boolean;
  ringInnerRadius: number;
  ringOuterRadius: number;
  ringColor: string;
  ringTilt: number;
  orbitalRadius: number;
  orbitalSpeedMultiplier: number;
  orbitalInclination: number;
  eccentricity: number;
  orbitalAngle?: number;
  axialRotationSpeed: number;
  moons: MoonConfig[];
}

export const CELESTIAL_PRESETS: CelestialBodyDefinition[] = [
  {
    id: 'preset-gaia',
    name: 'Gaia Prime',
    type: 'planet',
    style: 'terrestrial',
    radius: 1.85,
    mass: 48.0,
    color: '#2563eb',
    hasAtmosphere: true,
    atmosphereColor: '#60a5fa',
    hasRings: false,
    ringInnerRadius: 1.4,
    ringOuterRadius: 2.5,
    ringColor: '#fcd34d',
    ringTilt: 18,
    orbitalRadius: 21.5,
    orbitalSpeedMultiplier: 1.0,
    orbitalInclination: 6,
    eccentricity: 0.03,
    axialRotationSpeed: 0.9,
    moons: [
      {
        id: 'moon-selene',
        name: 'Sélène',
        radius: 0.55,
        orbitalDistance: 3.8,
        orbitalSpeed: 1.8,
        orbitalInclination: 8,
        color: '#cbd5e1',
      },
    ],
  },
  {
    id: 'preset-chronos',
    name: 'Chronos-9',
    type: 'ringed_planet',
    style: 'ringed_saturn',
    radius: 2.8,
    mass: 115.0,
    color: '#eab308',
    hasAtmosphere: true,
    atmosphereColor: '#fde047',
    hasRings: true,
    ringInnerRadius: 1.35,
    ringOuterRadius: 2.85,
    ringColor: '#fbbf24',
    ringTilt: 24,
    orbitalRadius: 26.5,
    orbitalSpeedMultiplier: 1.0,
    orbitalInclination: -9,
    eccentricity: 0.05,
    axialRotationSpeed: 1.35,
    moons: [
      {
        id: 'moon-titan',
        name: 'Titanis',
        radius: 0.58,
        orbitalDistance: 8.2,
        orbitalSpeed: 1.25,
        orbitalInclination: 5,
        color: '#fb923c',
      },
      {
        id: 'moon-enceladus',
        name: 'Encelade',
        radius: 0.35,
        orbitalDistance: 5.8,
        orbitalSpeed: 2.1,
        orbitalInclination: -12,
        color: '#e0f2fe',
      },
    ],
  },
  {
    id: 'preset-infernus',
    name: 'Infernus IV',
    type: 'planet',
    style: 'lava',
    radius: 1.65,
    mass: 62.0,
    color: '#ef4444',
    hasAtmosphere: true,
    atmosphereColor: '#f97316',
    hasRings: false,
    ringInnerRadius: 1.4,
    ringOuterRadius: 2.4,
    ringColor: '#ef4444',
    ringTilt: 12,
    orbitalRadius: 26.5,
    orbitalSpeedMultiplier: 1.04,
    orbitalInclination: 11,
    eccentricity: 0.12,
    axialRotationSpeed: 0.65,
    moons: [],
  },
  {
    id: 'preset-thalassa',
    name: 'Thalassa',
    type: 'planet',
    style: 'oceanic',
    radius: 2.05,
    mass: 58.0,
    color: '#0284c7',
    hasAtmosphere: true,
    atmosphereColor: '#38bdf8',
    hasRings: true,
    ringInnerRadius: 1.45,
    ringOuterRadius: 2.2,
    ringColor: '#7dd3fc',
    ringTilt: 15,
    orbitalRadius: 48.5,
    orbitalSpeedMultiplier: 1.0,
    orbitalInclination: 4,
    eccentricity: 0.02,
    axialRotationSpeed: 1.1,
    moons: [
      {
        id: 'moon-nereid',
        name: 'Néréide',
        radius: 0.42,
        orbitalDistance: 5.2,
        orbitalSpeed: 1.6,
        orbitalInclination: 14,
        color: '#bae6fd',
      },
    ],
  },
  {
    id: 'preset-borealis',
    name: 'Boréalis (Planète Naine)',
    type: 'dwarf_planet',
    style: 'ice_dwarf',
    radius: 1.15,
    mass: 18.0,
    color: '#bae6fd',
    hasAtmosphere: false,
    atmosphereColor: '#e0f2fe',
    hasRings: false,
    ringInnerRadius: 1.4,
    ringOuterRadius: 2.2,
    ringColor: '#bae6fd',
    ringTilt: 20,
    orbitalRadius: 62.0,
    orbitalSpeedMultiplier: 0.98,
    orbitalInclination: 19,
    eccentricity: 0.18,
    axialRotationSpeed: 0.5,
    moons: [
      {
        id: 'moon-charon',
        name: 'Charon-B',
        radius: 0.52,
        orbitalDistance: 2.8,
        orbitalSpeed: 1.4,
        orbitalInclination: 4,
        color: '#94a3b8',
      },
    ],
  },
  {
    id: 'preset-neowise',
    name: 'Comète Néowise-X',
    type: 'comet',
    style: 'ice_dwarf',
    radius: 0.9,
    mass: 12.0,
    color: '#38bdf8',
    hasAtmosphere: true,
    atmosphereColor: '#7dd3fc',
    hasRings: false,
    ringInnerRadius: 1.3,
    ringOuterRadius: 2.0,
    ringColor: '#38bdf8',
    ringTilt: 0,
    orbitalRadius: 50.0,
    orbitalSpeedMultiplier: 0.88,
    orbitalInclination: 28,
    eccentricity: 0.38,
    axialRotationSpeed: 1.8,
    moons: [],
  },
  {
    id: 'preset-pallas',
    name: 'Astéroïde Géant Pallas',
    type: 'asteroid',
    style: 'rocky_asteroid',
    radius: 1.35,
    mass: 32.0,
    color: '#a8a29e',
    hasAtmosphere: false,
    atmosphereColor: '#a8a29e',
    hasRings: true,
    ringInnerRadius: 1.5,
    ringOuterRadius: 2.1,
    ringColor: '#d6d3d1',
    ringTilt: 32,
    orbitalRadius: 36.5,
    orbitalSpeedMultiplier: 1.0,
    orbitalInclination: -14,
    eccentricity: 0.09,
    axialRotationSpeed: 1.4,
    moons: [],
  },
];
