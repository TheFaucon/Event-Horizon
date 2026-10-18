/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useRef } from 'react';
import { CameraPreset, DEFAULT_CONFIG, SimulationConfig } from './types/simulation';
import { SimulationEvent } from './utils/physics';
import { CelestialBodyDefinition, CELESTIAL_PRESETS } from './types/celestial';
import { ThreeCanvas } from './components/ThreeCanvas';
import { HUDOverlay } from './components/HUDOverlay';
import { CelestialCreatorModal } from './components/CelestialCreatorModal';
import { spaceAudio } from './audio/spaceAudio';

export default function App() {
  const [config, setConfig] = useState<SimulationConfig>(DEFAULT_CONFIG);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset | null>(null);
  const [launchProbeTrigger, setLaunchProbeTrigger] = useState<number>(0);
  const [respawnBeltTrigger, setRespawnBeltTrigger] = useState<number>(0);
  const [spawnPlanetoidTrigger, setSpawnPlanetoidTrigger] = useState<number>(0);
  const [consumedCount, setConsumedCount] = useState<number>(0);
  const [fps, setFps] = useState<number>(60);
  const [activeParticles, setActiveParticles] = useState<number>(DEFAULT_CONFIG.particleCount);
  const [activeBodies, setActiveBodies] = useState<number>(DEFAULT_CONFIG.asteroidCount);
  const [totalCollisions, setTotalCollisions] = useState<number>(0);

  // Celestial Bodies in Orbit
  const [celestialBodies, setCelestialBodies] = useState<CelestialBodyDefinition[]>([
    {
      ...CELESTIAL_PRESETS[1], // Chronos-9 ringed gas giant with 2 moons
      id: 'init-chronos-1',
      orbitalAngle: 1.18,
    },
    {
      ...CELESTIAL_PRESETS[0], // Gaia Prime with Selene moon
      id: 'init-gaia-2',
      orbitalAngle: 1.92,
    },
  ]);
  const [isCelestialModalOpen, setIsCelestialModalOpen] = useState<boolean>(false);
  const [trackedBodyId, setTrackedBodyId] = useState<string | null>(null);

  // Real-time Event Log state
  const [events, setEvents] = useState<SimulationEvent[]>([
    {
      id: 'init-1',
      timestamp: new Date().toLocaleTimeString([], { hour12: false }),
      type: 'belt_respawn',
      title: 'Système Initialisé',
      details: 'Ceinture d\'astéroïdes et planètes insérées en orbite képlérienne stable à 1.00G.',
      distanceAU: DEFAULT_CONFIG.asteroidBeltRadius,
    },
    {
      id: 'init-2',
      timestamp: new Date().toLocaleTimeString([], { hour12: false }),
      type: 'celestial_spawned',
      title: 'Planète en Orbite',
      details: 'Chronos-9 (Géante aux Anneaux & 2 Lunes) en orbite à 54.0 AU.',
      distanceAU: 54.0,
    },
  ]);

  const lastLoggedGravityRef = useRef<number>(DEFAULT_CONFIG.gravityPull);
  const lastCollisionLogTimeRef = useRef<number>(0);
  const lastFragmentLogTimeRef = useRef<number>(0);

  const addEvent = useCallback((event: Omit<SimulationEvent, 'id' | 'timestamp'>) => {
    const newEntry: SimulationEvent = {
      ...event,
      id: Math.random().toString(36).slice(2, 9),
      timestamp: new Date().toLocaleTimeString([], { hour12: false }),
    };

    setEvents((prev) => [newEntry, ...prev.slice(0, 59)]); // Keep last 60 events
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
          title: 'Gravité Modifiée',
          details: `Paramètre gravitationnel newtonien ajusté à ${next.gravityPull.toFixed(2)}G.${
            next.gravityPull > 1.25 ? ' Déclin orbital vers le trou noir amorcé.' : ''
          }`,
        });
      }

      return next;
    });
  }, [addEvent]);

  const handleSelectCameraPreset = useCallback((preset: CameraPreset) => {
    setTrackedBodyId(null);
    setCameraPreset(preset);
  }, []);

  const handleCameraPresetHandled = useCallback(() => {
    setCameraPreset(null);
  }, []);

  const handleLaunchProbe = useCallback(() => {
    setLaunchProbeTrigger((prev) => prev + 1);
    addEvent({
      type: 'probe_consumed',
      title: 'Sonde Déployée',
      details: 'Sonde de matière lancée sur trajectoire de capture avec physique corps-rigide.',
      distanceAU: 28.0,
    });
  }, [addEvent]);

  const handleRespawnBelt = useCallback(() => {
    setRespawnBeltTrigger((prev) => prev + 1);
    addEvent({
      type: 'belt_respawn',
      title: 'Ceinture Réinitialisée',
      details: `Ceinture d'astéroïdes recréée à ${config.asteroidBeltRadius} AU avec ${config.asteroidCount} corps solides.`,
      distanceAU: config.asteroidBeltRadius,
    });
  }, [config.asteroidBeltRadius, config.asteroidCount, addEvent]);

  const handleSpawnPlanetoid = useCallback(() => {
    setSpawnPlanetoidTrigger((prev) => prev + 1);
    addEvent({
      type: 'planetoid_spawned',
      title: 'Planétoïde Errant En Approche',
      details: 'Un planétoïde massif de 320 MT fonce à travers la ceinture vers le trou noir !',
      distanceAU: 64.0,
    });
  }, [addEvent]);

  // Celestial Bodies Management
  const handleSpawnCelestialBody = useCallback((definition: CelestialBodyDefinition) => {
    setCelestialBodies((prev) => [...prev, definition]);
    spaceAudio.playCelestialSpawn();
    addEvent({
      type: 'celestial_spawned',
      title: 'Corps Céleste en Orbite',
      details: `${definition.name} (${definition.type}) placé en orbite à ${definition.orbitalRadius} AU avec ${definition.moons.length} lune(s)${definition.hasRings ? ' et anneaux' : ''}.`,
      distanceAU: definition.orbitalRadius,
    });
  }, [addEvent]);

  const handleQuickSpawnCelestial = useCallback((presetId: string) => {
    const preset = CELESTIAL_PRESETS.find((p) => p.id === presetId) || CELESTIAL_PRESETS[0];
    const newBody: CelestialBodyDefinition = {
      ...preset,
      id: `celestial-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      orbitalAngle: Math.random() * Math.PI * 2,
    };
    handleSpawnCelestialBody(newBody);
  }, [handleSpawnCelestialBody]);

  const handleRemoveCelestialBody = useCallback((id: string) => {
    setCelestialBodies((prev) => prev.filter((b) => b.id !== id));
    if (trackedBodyId === id) {
      setTrackedBodyId(null);
    }
  }, [trackedBodyId]);

  const handleTrackCelestialBody = useCallback((id: string | null) => {
    setTrackedBodyId(id);
    if (id) {
      const target = celestialBodies.find((b) => b.id === id);
      if (target) {
        addEvent({
          type: 'celestial_spawned',
          title: 'Caméra en Suivi Orbital',
          details: `Verrouillage de la caméra sur ${target.name} en orbite à ${target.orbitalRadius} AU.`,
          distanceAU: target.orbitalRadius,
        });
      }
    }
  }, [celestialBodies, addEvent]);

  const handleCelestialConsumed = useCallback((id: string, name: string) => {
    setConsumedCount((prev) => prev + 1);
    setCelestialBodies((prev) => prev.filter((b) => b.id !== id));
    if (trackedBodyId === id) {
      setTrackedBodyId(null);
    }
    addEvent({
      type: 'celestial_consumed',
      title: 'Planète Dévorée',
      details: `${name} a franchi l'horizon des événements et a été aspiré par la singularité !`,
      distanceAU: 3.2,
    });
  }, [trackedBodyId, addEvent]);

  const handleAsteroidConsumed = useCallback((id: number, distanceAU: number) => {
    setConsumedCount((prev) => prev + 1);
    addEvent({
      type: 'asteroid_consumed',
      title: 'Astéroïde Consommé',
      details: `Astéroïde #${id} a franchi l'horizon suite à la spaghettification gravitationnelle.`,
      distanceAU,
    });
  }, [addEvent]);

  const handleProbeConsumed = useCallback((id: number, distanceAU: number) => {
    setConsumedCount((prev) => prev + 1);
    addEvent({
      type: 'probe_consumed',
      title: 'Sonde Aspirée',
      details: `La sonde #${id} a plongé au-delà de l'ISCO dans le trou noir.`,
      distanceAU,
    });
  }, [addEvent]);

  const handlePlanetoidConsumed = useCallback(() => {
    setConsumedCount((prev) => prev + 1);
    addEvent({
      type: 'planetoid_spawned',
      title: 'Planétoïde Englouti',
      details: 'Le planétoïde errant a été déchiré par les forces de marée et dévoré !',
      distanceAU: 3.2,
    });
  }, [addEvent]);

  const handleCollisionEvent = useCallback((impactEnergy: number, bodyTypeA: string, bodyTypeB: string) => {
    const now = Date.now();
    if (impactEnergy >= 16.0 && now - lastCollisionLogTimeRef.current > 900) {
      lastCollisionLogTimeRef.current = now;
      addEvent({
        type: 'collision',
        title: 'Collision Corps-Rigides',
        details: `${bodyTypeA.toUpperCase()} a heurté ${bodyTypeB.toUpperCase()} (${impactEnergy.toFixed(1)} J). Transfert d'impulsion.`,
      });
    }
  }, [addEvent]);

  const handleFragmentationEvent = useCallback((chunkCount: number, distanceAU: number) => {
    const now = Date.now();
    if (now - lastFragmentLogTimeRef.current > 1200) {
      lastFragmentLogTimeRef.current = now;
      addEvent({
        type: 'fragmentation',
        title: 'Impact Catastrophique',
        details: `L'énergie d'impact a pulvérisé le corps en ${chunkCount} débris physiques orbitaux.`,
        distanceAU,
      });
    }
  }, [addEvent]);

  const handleClearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  const handleTelemetryUpdate = useCallback((newFps: number, particleCount: number, bodiesCount: number, collisionsCount: number) => {
    setFps(newFps);
    setActiveParticles(particleCount);
    setActiveBodies(bodiesCount);
    setTotalCollisions(collisionsCount);
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
        onPlanetoidConsumed={handlePlanetoidConsumed}
        onCollisionEvent={handleCollisionEvent}
        onFragmentationEvent={handleFragmentationEvent}
        launchProbeTrigger={launchProbeTrigger}
        respawnBeltTrigger={respawnBeltTrigger}
        spawnPlanetoidTrigger={spawnPlanetoidTrigger}
        celestialBodies={celestialBodies}
        trackedBodyId={trackedBodyId}
        onCelestialConsumed={handleCelestialConsumed}
        onTelemetryUpdate={handleTelemetryUpdate}
      />

      {/* Floating UI HUD Dock, Event Log & Overlays */}
      <HUDOverlay
        config={config}
        onChangeConfig={handleConfigChange}
        onSelectCameraPreset={handleSelectCameraPreset}
        onLaunchProbe={handleLaunchProbe}
        onRespawnBelt={handleRespawnBelt}
        onSpawnPlanetoid={handleSpawnPlanetoid}
        onOpenCelestialModal={() => setIsCelestialModalOpen(true)}
        celestialBodiesCount={celestialBodies.length}
        onQuickSpawnCelestial={handleQuickSpawnCelestial}
        events={events}
        onClearEvents={handleClearEvents}
        probesDevouredCount={consumedCount}
        fps={fps}
        activeParticles={activeParticles}
        activeBodies={activeBodies}
        totalCollisions={totalCollisions}
      />

      {/* Interactive Celestial Body Creator Modal */}
      <CelestialCreatorModal
        isOpen={isCelestialModalOpen}
        onClose={() => setIsCelestialModalOpen(false)}
        onSpawnCelestialBody={handleSpawnCelestialBody}
        activeBodies={celestialBodies}
        onRemoveCelestialBody={handleRemoveCelestialBody}
        onTrackCelestialBody={handleTrackCelestialBody}
        trackedBodyId={trackedBodyId}
      />
    </main>
  );
}
