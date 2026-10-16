/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useRef } from 'react';
import { CameraPreset, DEFAULT_CONFIG, SimulationConfig } from './types/simulation';
import { SimulationEvent } from './utils/physics';
import { ThreeCanvas } from './components/ThreeCanvas';
import { HUDOverlay } from './components/HUDOverlay';
import { spaceAudio } from './audio/spaceAudio';

export default function App() {
  const [config, setConfig] = useState<SimulationConfig>(DEFAULT_CONFIG);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset | null>(null);
  const [launchProbeTrigger, setLaunchProbeTrigger] = useState<number>(0);
  const [respawnBeltTrigger, setRespawnBeltTrigger] = useState<number>(0);
  const [consumedCount, setConsumedCount] = useState<number>(0);
  const [fps, setFps] = useState<number>(60);
  const [activeParticles, setActiveParticles] = useState<number>(DEFAULT_CONFIG.particleCount);

  // Real-time Event Log state
  const [events, setEvents] = useState<SimulationEvent[]>([
    {
      id: 'init-1',
      timestamp: new Date().toLocaleTimeString([], { hour12: false }),
      type: 'belt_respawn',
      title: 'Stable Resonance',
      details: 'Asteroid belt initialized with Newtonian orbits in stable 1.00G equilibrium.',
      distanceAU: DEFAULT_CONFIG.asteroidBeltRadius,
    },
  ]);

  const lastLoggedGravityRef = useRef<number>(DEFAULT_CONFIG.gravityPull);

  const addEvent = useCallback((event: Omit<SimulationEvent, 'id' | 'timestamp'>) => {
    const newEntry: SimulationEvent = {
      ...event,
      id: Math.random().toString(36).slice(2, 9),
      timestamp: new Date().toLocaleTimeString([], { hour12: false }),
    };

    setEvents((prev) => [newEntry, ...prev.slice(0, 49)]); // Keep last 50 events
  }, []);

  const handleConfigChange = useCallback((updater: (prev: SimulationConfig) => SimulationConfig) => {
    setConfig((prev) => {
      const next = updater(prev);
      
      // Audio engine toggle sync
      if (next.audioEnabled !== prev.audioEnabled) {
        if (next.audioEnabled) {
          spaceAudio.start();
        } else {
          spaceAudio.stop();
        }
      }

      // Track significant gravity changes for Event Log
      if (Math.abs(next.gravityPull - lastLoggedGravityRef.current) >= 0.25) {
        lastLoggedGravityRef.current = next.gravityPull;
        addEvent({
          type: 'gravity_change',
          title: 'Gravity Scaled',
          details: `Newtonian gravitational parameter shifted to ${next.gravityPull.toFixed(2)}G.${
            next.gravityPull > 1.25 ? ' Inward orbital decay initiated.' : ''
          }`,
        });
      }

      return next;
    });
  }, [addEvent]);

  const handleSelectCameraPreset = useCallback((preset: CameraPreset) => {
    setCameraPreset(preset);
  }, []);

  const handleCameraPresetHandled = useCallback(() => {
    setCameraPreset(null);
  }, []);

  const handleLaunchProbe = useCallback(() => {
    setLaunchProbeTrigger((prev) => prev + 1);
    addEvent({
      type: 'probe_consumed',
      title: 'Probe Deployed',
      details: 'Matter probe launched into outer accretion disk trajectory.',
      distanceAU: 28.0,
    });
  }, [addEvent]);

  const handleRespawnBelt = useCallback(() => {
    setRespawnBeltTrigger((prev) => prev + 1);
    addEvent({
      type: 'belt_respawn',
      title: 'Belt Respawned',
      details: `Asteroid belt re-seeded at ${config.asteroidBeltRadius} AU with stable 1.0G circular velocities.`,
      distanceAU: config.asteroidBeltRadius,
    });
  }, [config.asteroidBeltRadius, addEvent]);

  const handleAsteroidConsumed = useCallback((id: number, distanceAU: number) => {
    setConsumedCount((prev) => prev + 1);
    addEvent({
      type: 'asteroid_consumed',
      title: 'Asteroid Consumed',
      details: `Asteroid #${id} crossed the event horizon following relativistic spaghettification.`,
      distanceAU,
    });
  }, [addEvent]);

  const handleProbeConsumed = useCallback((id: number, distanceAU: number) => {
    setConsumedCount((prev) => prev + 1);
    addEvent({
      type: 'probe_consumed',
      title: 'Probe Devoured',
      details: `Scientific probe #${id} plunged past ISCO into the black hole singularity.`,
      distanceAU,
    });
  }, [addEvent]);

  const handleClearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  const handleTelemetryUpdate = useCallback((newFps: number, particleCount: number) => {
    setFps(newFps);
    setActiveParticles(particleCount);
  }, []);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-black select-none">
      {/* 3D WebGL Canvas Viewport */}
      <ThreeCanvas
        config={config}
        cameraPreset={cameraPreset}
        onCameraPresetHandled={handleCameraPresetHandled}
        onAsteroidConsumed={handleAsteroidConsumed}
        onProbeConsumed={handleProbeConsumed}
        launchProbeTrigger={launchProbeTrigger}
        respawnBeltTrigger={respawnBeltTrigger}
        onTelemetryUpdate={handleTelemetryUpdate}
      />

      {/* Floating UI HUD Dock, Event Log & Overlays */}
      <HUDOverlay
        config={config}
        onChangeConfig={handleConfigChange}
        onSelectCameraPreset={handleSelectCameraPreset}
        onLaunchProbe={handleLaunchProbe}
        onRespawnBelt={handleRespawnBelt}
        events={events}
        onClearEvents={handleClearEvents}
        probesDevouredCount={consumedCount}
        fps={fps}
        activeParticles={activeParticles}
      />
    </main>
  );
}
