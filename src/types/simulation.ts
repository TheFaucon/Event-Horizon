/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SimulationConfig {
  // Accretion Disk & Physics
  rotationSpeed: number;        // Global rotation multiplier (0.1 - 3.0)
  gravityPull: number;          // Inward accretion drift speed (0.0 - 2.5)
  particleCount: number;        // Number of active accretion particles (5,000 - 30,000)
  colorPaletteId: string;       // Active palette ID
  dopplerBeaming: boolean;      // Relativistic Doppler beaming effect
  relativisticJets: boolean;    // Toggle polar relativistic plasma jets
  
  // Asteroid Belt
  asteroidCount: number;        // Number of instanced asteroids (100 - 1,200)
  asteroidBeltRadius: number;   // Center orbital radius of asteroid belt (35 - 70)
  asteroidBeltWidth: number;    // Width/spread of belt (4 - 20)
  asteroidSpeed: number;        // Orbital speed multiplier (0.1 - 2.5)
  
  // Post-processing & Atmosphere
  bloomEnabled: boolean;        // UnrealBloom postprocessing toggle
  bloomStrength: number;        // Glow intensity (0.1 - 3.0)
  bloomThreshold: number;       // Brightness threshold for bloom (0.0 - 1.0)
  
  // Camera & System
  autoRotateCamera: boolean;    // Cinematic slow camera orbit
  isPaused: boolean;            // Pause physics time
  audioEnabled: boolean;        // Ambient space synthesizer toggle
}

export const DEFAULT_CONFIG: SimulationConfig = {
  rotationSpeed: 1.0,
  gravityPull: 1.0,
  particleCount: 18000,
  colorPaletteId: 'gargantua',
  dopplerBeaming: true,
  relativisticJets: true,
  
  asteroidCount: 650,
  asteroidBeltRadius: 46,
  asteroidBeltWidth: 12,
  asteroidSpeed: 0.7,
  
  bloomEnabled: true,
  bloomStrength: 1.35,
  bloomThreshold: 0.22,
  
  autoRotateCamera: false,
  isPaused: false,
  audioEnabled: false,
};

export type CameraPreset = 
  | 'orbital'          // 45 degree cinematic wide view
  | 'equatorial'       // Edge-on view with gravitational lensing distortion
  | 'close_horizon'    // Close to ISCO and photon sphere
  | 'polar'            // Direct top-down view aligned with relativistic jet
  | 'asteroid_belt';   // POV right inside the tumbling asteroid belt
