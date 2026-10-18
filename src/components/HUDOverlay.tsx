/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Disc,
  Camera,
  Play,
  Pause,
  Volume2,
  VolumeX,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Orbit,
  Flame,
  Info,
  Zap,
  Activity,
  Globe2,
} from 'lucide-react';
import { CameraPreset, SimulationConfig } from '../types/simulation';
import { COLOR_PALETTES, SimulationEvent } from '../utils/physics';
import { EventLog } from './EventLog';

interface HUDOverlayProps {
  config: SimulationConfig;
  onChangeConfig: (updater: (prev: SimulationConfig) => SimulationConfig) => void;
  onSelectCameraPreset: (preset: CameraPreset) => void;
  onLaunchProbe: () => void;
  onRespawnBelt: () => void;
  onSpawnPlanetoid: () => void;
  onOpenCelestialModal: () => void;
  celestialBodiesCount: number;
  onQuickSpawnCelestial: (presetId: string) => void;
  events: SimulationEvent[];
  onClearEvents: () => void;
  probesDevouredCount: number;
  fps: number;
  activeParticles: number;
  activeBodies: number;
  totalCollisions: number;
}

type TabType = 'accretion' | 'rigid_physics' | 'celestial_fleet' | 'palette_bloom' | 'camera_system';

export const HUDOverlay: React.FC<HUDOverlayProps> = ({
  config,
  onChangeConfig,
  onSelectCameraPreset,
  onLaunchProbe,
  onRespawnBelt,
  onSpawnPlanetoid,
  onOpenCelestialModal,
  celestialBodiesCount,
  onQuickSpawnCelestial,
  events,
  onClearEvents,
  probesDevouredCount,
  fps,
  activeParticles,
  activeBodies,
  totalCollisions,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('accretion');
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [showInfoModal, setShowInfoModal] = useState<boolean>(false);

  // Keyboard shortcut: 'H' toggles dock, 'Space' launches probe, 'R' respawns belt, 'P' spawns planetoid
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'h' || e.key === 'H') {
        setIsCollapsed((prev) => !prev);
      } else if (e.code === 'Space') {
        e.preventDefault();
        onLaunchProbe();
      } else if (e.key === 'r' || e.key === 'R') {
        onRespawnBelt();
      } else if (e.key === 'p' || e.key === 'P') {
        onSpawnPlanetoid();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onLaunchProbe, onRespawnBelt, onSpawnPlanetoid]);

  const activePalette = COLOR_PALETTES[config.colorPaletteId] || COLOR_PALETTES.gargantua;
  const latestEvent = events.length > 0 ? events[0] : null;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 sm:p-4 z-10 font-sans">
      {/* Top Header Bar: Telemetry, Event Log & Actions */}
      <header className="flex flex-wrap sm:flex-nowrap items-center justify-between w-full pointer-events-auto gap-2">
        <div className="flex items-center space-x-2.5 bg-neutral-950/90 border border-neutral-800 rounded-lg px-3 py-1.5 sm:px-3.5 sm:py-2 text-white shadow-xl">
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-amber-500 shrink-0" />
          <div>
            <h1 className="text-xs sm:text-sm font-semibold tracking-wider uppercase text-neutral-200">
              Event Horizon 3D
            </h1>
            <p className="hidden sm:block text-xs text-neutral-400 font-mono">
              3D Rigid-Body Physics • M = 4.3×10^6 M_sun
            </p>
          </div>
        </div>

        {/* Real-Time Telemetry Badges */}
        <div className="hidden lg:flex items-center space-x-2">
          <div className="bg-neutral-950/90 border border-neutral-800 px-3 py-1.5 rounded-lg text-xs font-mono text-neutral-300">
            <span className="text-neutral-500 mr-1.5">FPS</span>
            <span className={fps < 30 ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>{fps}</span>
          </div>

          <div className="bg-neutral-950/90 border border-neutral-800 px-3 py-1.5 rounded-lg text-xs font-mono text-neutral-300">
            <span className="text-neutral-500 mr-1.5">Bodies</span>
            <span className="text-cyan-400 font-bold">{activeBodies}</span>
          </div>

          <div className="bg-neutral-950/90 border border-neutral-800 px-3 py-1.5 rounded-lg text-xs font-mono text-neutral-300">
            <span className="text-neutral-500 mr-1.5">Planets</span>
            <span className="text-indigo-400 font-bold">{celestialBodiesCount}</span>
          </div>

          <div className="bg-neutral-950/90 border border-neutral-800 px-3 py-1.5 rounded-lg text-xs font-mono text-neutral-300">
            <span className="text-neutral-500 mr-1.5">Collisions</span>
            <span className="text-rose-400 font-bold">{totalCollisions}</span>
          </div>

          <div className="bg-neutral-950/90 border border-neutral-800 px-3 py-1.5 rounded-lg text-xs font-mono text-neutral-300">
            <span className="text-neutral-500 mr-1.5">Consumed</span>
            <span className="text-amber-400 font-bold">{probesDevouredCount}</span>
          </div>

          <button
            type="button"
            onClick={() => setShowInfoModal(true)}
            aria-label="Astrophysics & Physics information"
            className="bg-neutral-950/90 hover:bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white p-2 rounded-lg transition-colors cursor-pointer"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>

        {/* Top Right Actions: Event Log, Spawn Planetoid & Probe Launcher */}
        <div className="flex flex-wrap items-center gap-1.5 sm:space-x-2">
          <EventLog events={events} onClearEvents={onClearEvents} />

          {/* Celestial Bodies Creator Button */}
          <button
            type="button"
            onClick={onOpenCelestialModal}
            title="Ajouter des corps célestes en orbite (Planètes, Anneaux, Lunes, Comètes)"
            className="flex items-center space-x-1.5 bg-gradient-to-r from-blue-700 via-indigo-600 to-violet-600 hover:from-blue-600 hover:to-violet-500 text-white text-xs font-medium uppercase tracking-wide px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg shadow-lg cursor-pointer transition-all active:scale-95 border border-indigo-400/40"
          >
            <Orbit className="w-3.5 h-3.5 text-indigo-200" />
            <span className="hidden sm:inline">+ Corps Célestes</span>
            <span className="sm:hidden">+ Planète</span>
            {celestialBodiesCount > 0 && (
              <span className="bg-indigo-300/30 text-indigo-100 text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-0.5">
                {celestialBodiesCount}
              </span>
            )}
          </button>

          {/* Rogue Planetoid Spawn Button */}
          <button
            type="button"
            onClick={onSpawnPlanetoid}
            title="Spawn Massive Rogue Planetoid (P)"
            className="flex items-center space-x-1.5 bg-gradient-to-r from-rose-700 to-red-600 hover:from-rose-600 hover:to-red-500 text-white text-xs font-medium uppercase tracking-wide px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg shadow-lg cursor-pointer transition-all active:scale-95 border border-red-400/30"
          >
            <Globe2 className="w-3.5 h-3.5 text-rose-200" />
            <span className="hidden sm:inline">Rogue Planetoid <span className="opacity-60 text-[10px] lowercase">(p)</span></span>
            <span className="sm:hidden">Planetoid</span>
          </button>

          {/* Quick Matter Launcher Button */}
          <button
            type="button"
            onClick={onLaunchProbe}
            className="flex items-center space-x-1.5 sm:space-x-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-medium uppercase tracking-wide px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg shadow-lg cursor-pointer transition-all active:scale-95 border border-amber-400/30"
          >
            <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-200" />
            <span className="hidden sm:inline">Launch Probe <span className="opacity-60 text-[10px] lowercase">(space)</span></span>
            <span className="sm:hidden">Probe</span>
          </button>
        </div>
      </header>

      {/* Floating Alert Ticker */}
      {latestEvent && (
        <div className="pointer-events-none self-center transition-all duration-300 my-2">
          <div className="bg-neutral-950/85 border border-amber-500/30 rounded-full px-4 py-1 text-[11px] font-mono text-neutral-200 flex items-center space-x-2 shadow-2xl">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-amber-300 uppercase font-semibold">{latestEvent.title}:</span>
            <span className="text-neutral-300">{latestEvent.details}</span>
          </div>
        </div>
      )}

      {/* Unified Bottom Control Dock */}
      <footer className="w-full flex flex-col items-center pointer-events-auto">
        <button
          type="button"
          onClick={() => setIsCollapsed((prev) => !prev)}
          className="flex items-center space-x-1.5 bg-neutral-900/95 hover:bg-neutral-800 border border-neutral-700/80 text-neutral-300 text-xs px-3.5 py-1 rounded-t-lg shadow-xl cursor-pointer transition-colors -mb-px"
          aria-label={isCollapsed ? 'Expand Control Dock' : 'Collapse Control Dock'}
        >
          {isCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5 text-amber-400" />
              <span>Show Controls <kbd className="text-[10px] text-neutral-400 ml-1">H</kbd></span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
              <span>Hide Controls <kbd className="text-[10px] text-neutral-400 ml-1">H</kbd></span>
            </>
          )}
        </button>

        <div
          className={`w-full max-w-4xl bg-neutral-950/95 border border-neutral-800 rounded-2xl p-3 sm:p-4 shadow-2xl transition-all duration-300 ${
            isCollapsed ? 'translate-y-full opacity-0 pointer-events-none h-0 p-0 overflow-hidden border-0' : 'translate-y-0 opacity-100'
          }`}
        >
          {/* Navigation Tabs */}
          <div className="flex items-center justify-between border-b border-neutral-800/80 pb-2.5 mb-3 gap-2">
            <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto py-0.5 max-w-[calc(100%-80px)]">
              <button
                type="button"
                onClick={() => setActiveTab('accretion')}
                className={`flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === 'accretion'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
                }`}
              >
                <Disc className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Accretion & Gravity</span>
                <span className="sm:hidden">Accretion</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('rigid_physics')}
                className={`flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === 'rigid_physics'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">3D Rigid Physics</span>
                <span className="sm:hidden">Physics</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('celestial_fleet')}
                className={`flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === 'celestial_fleet'
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
                }`}
              >
                <Globe2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Corps Célestes</span>
                <span className="sm:hidden">Planètes</span>
                {celestialBodiesCount > 0 && (
                  <span className="bg-indigo-500/30 text-indigo-200 text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-1">
                    {celestialBodiesCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('palette_bloom')}
                className={`flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === 'palette_bloom'
                    ? 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Palette & Glow</span>
                <span className="sm:hidden">Palette</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('camera_system')}
                className={`flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === 'camera_system'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Camera & Audio</span>
                <span className="sm:hidden">Camera</span>
              </button>
            </div>

            {/* Play/Pause & Audio */}
            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                onClick={() => onChangeConfig((c) => ({ ...c, isPaused: !c.isPaused }))}
                aria-label={config.isPaused ? 'Resume Simulation' : 'Pause Simulation'}
                className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700/60 transition-colors cursor-pointer"
              >
                {config.isPaused ? <Play className="w-3.5 h-3.5 text-amber-400" /> : <Pause className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={() => onChangeConfig((c) => ({ ...c, audioEnabled: !c.audioEnabled }))}
                aria-label={config.audioEnabled ? 'Mute Deep Space Audio' : 'Unmute Deep Space Audio'}
                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                  config.audioEnabled
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                    : 'bg-neutral-900 hover:bg-neutral-800 border-neutral-700/60 text-neutral-400'
                }`}
              >
                {config.audioEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* TAB 1: ACCRETION DISK & GRAVITY */}
          {activeTab === 'accretion' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-neutral-300">
              <div className="flex flex-col space-y-1.5 bg-neutral-900/60 p-2.5 rounded-xl border border-neutral-800/80">
                <div className="flex justify-between items-center">
                  <label htmlFor="gravity-pull" className="font-medium text-neutral-200">
                    Gravity Pull (Newtonian G)
                  </label>
                  <span className={`font-mono font-bold ${config.gravityPull > 1.4 ? 'text-rose-400' : config.gravityPull === 1.0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {config.gravityPull.toFixed(2)}G
                  </span>
                </div>
                <input
                  id="gravity-pull"
                  type="range"
                  min="0.2"
                  max="3.5"
                  step="0.05"
                  value={config.gravityPull}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    onChangeConfig((c) => ({ ...c, gravityPull: val }));
                  }}
                  className="w-full accent-amber-500 cursor-pointer h-1.5 bg-neutral-700 rounded-lg"
                />
                <p className="text-[11px] text-neutral-400">
                  {config.gravityPull === 1.0
                    ? '1.00G: Balanced orbital velocity (stable Keplerian circular orbits).'
                    : config.gravityPull > 1.2
                    ? 'Gravity surge! Gravitational pull > centrifugal force: orbits decay into inward spirals.'
                    : 'Low gravity: orbits expand outward into eccentric ellipses.'}
                </p>
              </div>

              <div className="flex flex-col space-y-1.5 bg-neutral-900/60 p-2.5 rounded-xl border border-neutral-800/80">
                <div className="flex justify-between items-center">
                  <label htmlFor="rotation-speed" className="font-medium text-neutral-200">
                    Accretion Disk Rotation
                  </label>
                  <span className="font-mono text-cyan-400">{config.rotationSpeed.toFixed(1)}x</span>
                </div>
                <input
                  id="rotation-speed"
                  type="range"
                  min="0.1"
                  max="3.0"
                  step="0.1"
                  value={config.rotationSpeed}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    onChangeConfig((c) => ({ ...c, rotationSpeed: val }));
                  }}
                  className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-neutral-700 rounded-lg"
                />
                <p className="text-[11px] text-neutral-400">
                  Differential orbital speed governed by Kerr metric angular velocity.
                </p>
              </div>

              <div className="flex flex-col space-y-1.5 bg-neutral-900/60 p-2.5 rounded-xl border border-neutral-800/80">
                <div className="flex justify-between items-center">
                  <label htmlFor="particle-density" className="font-medium text-neutral-200">
                    Accretion Particles
                  </label>
                  <span className="font-mono text-orange-400">{config.particleCount.toLocaleString()}</span>
                </div>
                <input
                  id="particle-density"
                  type="range"
                  min="5000"
                  max="30000"
                  step="1000"
                  value={config.particleCount}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    onChangeConfig((c) => ({ ...c, particleCount: val }));
                  }}
                  className="w-full accent-orange-500 cursor-pointer h-1.5 bg-neutral-700 rounded-lg"
                />
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center space-x-1.5 cursor-pointer text-[11px] text-neutral-300">
                    <input
                      type="checkbox"
                      checked={config.dopplerBeaming}
                      onChange={(e) => onChangeConfig((c) => ({ ...c, dopplerBeaming: e.target.checked }))}
                      className="rounded accent-amber-500"
                    />
                    <span>Doppler Beaming</span>
                  </label>

                  <label className="flex items-center space-x-1.5 cursor-pointer text-[11px] text-neutral-300">
                    <input
                      type="checkbox"
                      checked={config.relativisticJets}
                      onChange={(e) => onChangeConfig((c) => ({ ...c, relativisticJets: e.target.checked }))}
                      className="rounded accent-amber-500"
                    />
                    <span>Polar Jets</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TRUE 3D RIGID PHYSICS & COLLISIONS */}
          {activeTab === 'rigid_physics' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-neutral-300">
              {/* Physics Properties: Restitution & Fragmentation */}
              <div className="flex flex-col space-y-2 bg-neutral-900/60 p-2.5 rounded-xl border border-neutral-800/80">
                <div className="flex justify-between items-center">
                  <label htmlFor="restitution" className="font-medium text-neutral-200">
                    Restitution (Bounciness)
                  </label>
                  <span className="font-mono text-cyan-400">e = {config.restitution.toFixed(2)}</span>
                </div>
                <input
                  id="restitution"
                  type="range"
                  min="0.0"
                  max="0.95"
                  step="0.05"
                  value={config.restitution}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    onChangeConfig((c) => ({ ...c, restitution: val }));
                  }}
                  className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-neutral-700 rounded-lg"
                />

                <div className="flex justify-between items-center pt-1">
                  <label htmlFor="fragmentation-threshold" className="font-medium text-neutral-200">
                    Destruction / Shatter Threshold
                  </label>
                  <span className="font-mono text-rose-400">{config.fragmentationThreshold.toFixed(0)} J</span>
                </div>
                <input
                  id="fragmentation-threshold"
                  type="range"
                  min="8.0"
                  max="90.0"
                  step="2.0"
                  value={config.fragmentationThreshold}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    onChangeConfig((c) => ({ ...c, fragmentationThreshold: val }));
                  }}
                  className="w-full accent-rose-500 cursor-pointer h-1.5 bg-neutral-700 rounded-lg"
                />
                <p className="text-[11px] text-neutral-400">
                  Collisions exceeding threshold shatter bodies into 3–5 physical debris chunks.
                </p>
              </div>

              {/* Integrator Time Scale & N-Body Gravity */}
              <div className="flex flex-col space-y-2 bg-neutral-900/60 p-2.5 rounded-xl border border-neutral-800/80">
                <div className="flex justify-between items-center">
                  <label htmlFor="time-scale" className="font-medium text-neutral-200">
                    Simulation Time Scale
                  </label>
                  <span className="font-mono text-amber-400">{config.timeScale.toFixed(2)}x</span>
                </div>
                <input
                  id="time-scale"
                  type="range"
                  min="0.1"
                  max="2.5"
                  step="0.05"
                  value={config.timeScale}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    onChangeConfig((c) => ({ ...c, timeScale: val }));
                  }}
                  className="w-full accent-amber-500 cursor-pointer h-1.5 bg-neutral-700 rounded-lg"
                />

                <div className="pt-1">
                  <label className="flex items-center space-x-1.5 cursor-pointer text-neutral-200 text-xs">
                    <input
                      type="checkbox"
                      checked={config.gravitationalPerturbations}
                      onChange={(e) => onChangeConfig((c) => ({ ...c, gravitationalPerturbations: e.target.checked }))}
                      className="rounded accent-cyan-500"
                    />
                    <span>N-Body Gravitational Perturbations</span>
                  </label>
                  <p className="text-[11px] text-neutral-400 pt-0.5">
                    Massive bodies (such as the Rogue Planetoid) exert mutual gravity on surrounding asteroids.
                  </p>
                </div>
              </div>

              {/* Action Triggers: Rogue Planetoid & Respawn Belt */}
              <div className="flex flex-col space-y-2 bg-neutral-900/60 p-2.5 rounded-xl border border-neutral-800/80">
                <span className="font-medium text-neutral-200">Orbital Chaos Tests</span>
                <button
                  type="button"
                  onClick={onSpawnPlanetoid}
                  className="flex items-center justify-center space-x-2 bg-gradient-to-r from-rose-900 to-red-700 hover:from-rose-800 hover:to-red-600 border border-red-500/40 text-white py-1.5 px-3 rounded-lg font-medium transition-all cursor-pointer shadow-md active:scale-95 text-xs"
                >
                  <Globe2 className="w-3.5 h-3.5 text-rose-300" />
                  <span>Spawn Rogue Planetoid (P)</span>
                </button>

                <button
                  type="button"
                  onClick={onRespawnBelt}
                  className="flex items-center justify-center space-x-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 py-1.5 px-3 rounded-lg font-medium transition-colors cursor-pointer text-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Reset / Respawn Belt (R)</span>
                </button>

                <div className="flex justify-between items-center text-[10px] text-neutral-400 pt-0.5">
                  <span>3D Spatial Hash Grid O(N)</span>
                  <span>Verlet Symplectic</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB: CELESTIAL FLEET / CORPS CÉLESTES */}
          {activeTab === 'celestial_fleet' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-neutral-300">
              {/* Quick Spawn Buttons */}
              <div className="flex flex-col space-y-2 bg-neutral-900/60 p-2.5 rounded-xl border border-neutral-800/80">
                <span className="font-medium text-neutral-200">Préréglages d&apos;insertion orbitale</span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => onQuickSpawnCelestial('preset-gaia')}
                    className="flex items-center space-x-1.5 p-2 rounded-lg bg-neutral-800/90 hover:bg-blue-950/70 border border-neutral-700/60 hover:border-blue-500/50 text-left transition-all cursor-pointer text-[11px]"
                  >
                    <span className="text-base">🌍</span>
                    <div>
                      <div className="font-semibold text-white">Gaia Prime</div>
                      <div className="text-[9px] text-neutral-400">Terre + 1 Lune</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onQuickSpawnCelestial('preset-chronos')}
                    className="flex items-center space-x-1.5 p-2 rounded-lg bg-neutral-800/90 hover:bg-amber-950/70 border border-neutral-700/60 hover:border-amber-500/50 text-left transition-all cursor-pointer text-[11px]"
                  >
                    <span className="text-base">🪐</span>
                    <div>
                      <div className="font-semibold text-white">Chronos-9</div>
                      <div className="text-[9px] text-neutral-400">Anneaux + 2 Lunes</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onQuickSpawnCelestial('preset-infernus')}
                    className="flex items-center space-x-1.5 p-2 rounded-lg bg-neutral-800/90 hover:bg-rose-950/70 border border-neutral-700/60 hover:border-rose-500/50 text-left transition-all cursor-pointer text-[11px]"
                  >
                    <span className="text-base">🌋</span>
                    <div>
                      <div className="font-semibold text-white">Infernus</div>
                      <div className="text-[9px] text-neutral-400">Super-Terre Lave</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onQuickSpawnCelestial('preset-thalassa')}
                    className="flex items-center space-x-1.5 p-2 rounded-lg bg-neutral-800/90 hover:bg-sky-950/70 border border-neutral-700/60 hover:border-sky-500/50 text-left transition-all cursor-pointer text-[11px]"
                  >
                    <span className="text-base">🌊</span>
                    <div>
                      <div className="font-semibold text-white">Thalassa</div>
                      <div className="text-[9px] text-neutral-400">Océan + 1 Lune</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onQuickSpawnCelestial('preset-borealis')}
                    className="flex items-center space-x-1.5 p-2 rounded-lg bg-neutral-800/90 hover:bg-cyan-950/70 border border-neutral-700/60 hover:border-cyan-500/50 text-left transition-all cursor-pointer text-[11px]"
                  >
                    <span className="text-base">🌕</span>
                    <div>
                      <div className="font-semibold text-white">Boréalis</div>
                      <div className="text-[9px] text-neutral-400">Planète Naine Glacée</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onQuickSpawnCelestial('preset-neowise')}
                    className="flex items-center space-x-1.5 p-2 rounded-lg bg-neutral-800/90 hover:bg-indigo-950/70 border border-neutral-700/60 hover:border-indigo-500/50 text-left transition-all cursor-pointer text-[11px]"
                  >
                    <span className="text-base">☄️</span>
                    <div>
                      <div className="font-semibold text-white">Néowise-X</div>
                      <div className="text-[9px] text-neutral-400">Comète Excentrique</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Creator & Modal Launcher */}
              <div className="flex flex-col justify-between space-y-2 bg-neutral-900/60 p-2.5 rounded-xl border border-neutral-800/80">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium text-neutral-200">Créateur de Corps Personnalisé</span>
                    <span className="text-[10px] text-indigo-400 font-mono">Sur-Mesure</span>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-relaxed">
                    Créez un objet céleste unique : configurez son rayon, sa masse, ses anneaux, ses lunes en orbite (jusqu&apos;à 4 lunes), et son inclinaison.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={onOpenCelestialModal}
                  className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-lg bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-medium shadow-md transition-all cursor-pointer active:scale-98"
                >
                  <Orbit className="w-3.5 h-3.5" />
                  <span>Ouvrir l&apos;Atelier Céleste</span>
                </button>
              </div>

              {/* Orbit Status & Physics Info */}
              <div className="flex flex-col justify-between space-y-2 bg-neutral-900/60 p-2.5 rounded-xl border border-neutral-800/80">
                <div>
                  <span className="font-medium text-neutral-200">Dynamique Gravitationnelle</span>
                  <div className="text-[11px] text-neutral-400 space-y-1 pt-1">
                    <div className="flex justify-between">
                      <span>Corps actifs:</span>
                      <span className="font-mono text-indigo-400 font-bold">{celestialBodiesCount} en orbite</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Lois physiques:</span>
                      <span className="font-mono text-neutral-300">Kepler & Newton</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Effet de marée:</span>
                      <span className="font-mono text-amber-400">Spaghettification</span>
                    </div>
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-neutral-950/80 border border-neutral-800 text-[10px] text-neutral-400">
                  Augmentez le curseur <b>Gravity Pull</b> dans l&apos;onglet Accrétion pour déclencher le déclin orbital des planètes vers le trou noir !
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: COLOR PALETTE & BLOOM GLOW */}
          {activeTab === 'palette_bloom' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-neutral-300">
              <div className="md:col-span-2 flex flex-col space-y-2 bg-neutral-900/60 p-2.5 rounded-xl border border-neutral-800/80">
                <span className="font-medium text-neutral-200">Accretion Color Palette</span>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {Object.values(COLOR_PALETTES).map((pal) => {
                    const isSelected = pal.id === config.colorPaletteId;
                    return (
                      <button
                        key={pal.id}
                        type="button"
                        onClick={() => onChangeConfig((c) => ({ ...c, colorPaletteId: pal.id }))}
                        className={`flex flex-col items-center p-1.5 rounded-lg border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-neutral-800 border-amber-400 shadow-md ring-1 ring-amber-400/50'
                            : 'bg-neutral-950/80 border-neutral-800 hover:border-neutral-700'
                        }`}
                      >
                        <div className="flex items-center space-x-1 mb-1">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: pal.midDisk }} />
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: pal.outerWisps }} />
                        </div>
                        <span className="text-[10px] font-medium text-neutral-200 text-center truncate w-full">
                          {pal.name.split(' ')[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-neutral-400 truncate">
                  {activePalette.description}
                </p>
              </div>

              <div className="flex flex-col space-y-1.5 bg-neutral-900/60 p-2.5 rounded-xl border border-neutral-800/80">
                <div className="flex justify-between items-center">
                  <label htmlFor="bloom-strength" className="font-medium text-neutral-200">
                    Bloom Glow Intensity
                  </label>
                  <span className="font-mono text-fuchsia-400">{config.bloomStrength.toFixed(2)}</span>
                </div>
                <input
                  id="bloom-strength"
                  type="range"
                  min="0.1"
                  max="2.5"
                  step="0.05"
                  disabled={!config.bloomEnabled}
                  value={config.bloomStrength}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    onChangeConfig((c) => ({ ...c, bloomStrength: val }));
                  }}
                  className="w-full accent-fuchsia-500 cursor-pointer h-1.5 bg-neutral-700 rounded-lg disabled:opacity-40"
                />
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center space-x-1.5 cursor-pointer text-[11px] text-neutral-300">
                    <input
                      type="checkbox"
                      checked={config.bloomEnabled}
                      onChange={(e) => onChangeConfig((c) => ({ ...c, bloomEnabled: e.target.checked }))}
                      className="rounded accent-fuchsia-500"
                    />
                    <span>Post-process Bloom</span>
                  </label>
                  <span className="text-[10px] text-neutral-500">UnrealPass</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CAMERA PRESETS & AUDIO SYSTEM */}
          {activeTab === 'camera_system' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-neutral-300">
              <div className="md:col-span-2 flex flex-col space-y-2 bg-neutral-900/60 p-2.5 rounded-xl border border-neutral-800/80">
                <span className="font-medium text-neutral-200">Camera Viewpoints</span>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectCameraPreset('orbital')}
                    className="px-2.5 py-1.5 rounded-lg bg-neutral-950/80 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 text-center font-medium transition-colors cursor-pointer text-[11px]"
                  >
                    Orbital 45°
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectCameraPreset('equatorial')}
                    className="px-2.5 py-1.5 rounded-lg bg-neutral-950/80 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 text-center font-medium transition-colors cursor-pointer text-[11px]"
                  >
                    Interstellar Rim
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectCameraPreset('close_horizon')}
                    className="px-2.5 py-1.5 rounded-lg bg-neutral-950/80 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 text-center font-medium transition-colors cursor-pointer text-[11px]"
                  >
                    Event Horizon
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectCameraPreset('polar')}
                    className="px-2.5 py-1.5 rounded-lg bg-neutral-950/80 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 text-center font-medium transition-colors cursor-pointer text-[11px]"
                  >
                    Polar Jet
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectCameraPreset('asteroid_belt')}
                    className="px-2.5 py-1.5 rounded-lg bg-neutral-950/80 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 text-center font-medium transition-colors cursor-pointer text-[11px]"
                  >
                    Asteroid Belt
                  </button>
                </div>
                <div className="flex items-center space-x-3 text-[11px] text-neutral-400 pt-0.5">
                  <label className="flex items-center space-x-1.5 cursor-pointer text-neutral-300">
                    <input
                      type="checkbox"
                      checked={config.autoRotateCamera}
                      onChange={(e) => onChangeConfig((c) => ({ ...c, autoRotateCamera: e.target.checked }))}
                      className="rounded accent-emerald-500"
                    />
                    <span>Auto-orbit rotation</span>
                  </label>
                  <span>• Drag to rotate, Right click to pan, Scroll to zoom</span>
                </div>
              </div>

              <div className="flex flex-col space-y-1.5 bg-neutral-900/60 p-2.5 rounded-xl border border-neutral-800/80">
                <span className="font-medium text-neutral-200">Space Soundscape</span>
                <button
                  type="button"
                  onClick={() => onChangeConfig((c) => ({ ...c, audioEnabled: !c.audioEnabled }))}
                  className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-lg border font-medium text-xs transition-colors cursor-pointer ${
                    config.audioEnabled
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-neutral-950 hover:bg-neutral-800 text-neutral-400 border-neutral-800'
                  }`}
                >
                  {config.audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  <span>{config.audioEnabled ? 'Cosmic Audio Active' : 'Enable Space Drone'}</span>
                </button>
                <p className="text-[11px] text-neutral-400">
                  Synthesizes sub-bass singularity resonance and plasma noise using Web Audio API.
                </p>
              </div>
            </div>
          )}
        </div>
      </footer>

      {/* Educational Astrophysics & Physics Modal */}
      {showInfoModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 pointer-events-auto"
        >
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl max-w-xl w-full p-6 text-neutral-200 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-4">
              <h2 className="text-base font-semibold text-white flex items-center space-x-2">
                <Disc className="w-4 h-4 text-amber-400" />
                <span>3D Rigid-Body Physics & Astrophysics Engine</span>
              </h2>
              <button
                type="button"
                onClick={() => setShowInfoModal(false)}
                className="text-neutral-400 hover:text-white text-lg font-bold p-1 cursor-pointer"
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-neutral-300 max-h-[60vh] overflow-y-auto pr-2">
              <div>
                <strong className="text-cyan-400 block text-sm mb-0.5">1. 3D Spatial Hash Grid & Impulse Solver</strong>
                Bodies are hashed into spatial volumetric cells for O(N) neighbor queries. When collisions occur, linear momentum is conserved, restitution scales normal velocity, and tangential friction imparts physical 3D angular torque/spin.
              </div>
              <div>
                <strong className="text-rose-400 block text-sm mb-0.5">2. High-Energy Kinetic Fragmentation</strong>
                If the impact kinetic energy exceeds the shatter threshold, parent asteroids fracture into 3 to 5 physical debris chunks that inherit parent momentum, conserve mass, and scatter radially.
              </div>
              <div>
                <strong className="text-amber-400 block text-sm mb-0.5">3. N-Body Massive Gravitational Perturbations</strong>
                In addition to the central black hole inverse-square gravitational field, massive rogue planetoids and heavy bodies exert mutual Newtonian gravitational attraction on nearby asteroids.
              </div>
              <div>
                <strong className="text-orange-400 block text-sm mb-0.5">4. Relativistic Spaghettification & Horizon Ingestion</strong>
                As any solid body nears the Schwarzschild radius (Rs = 3.20 AU), extreme differential tidal acceleration stretches the geometry along the radial singularity axis before swallowing it into the event horizon.
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-neutral-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowInfoModal(false)}
                className="bg-neutral-800 hover:bg-neutral-700 text-white text-xs px-4 py-2 rounded-lg cursor-pointer"
              >
                Return to Simulation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
