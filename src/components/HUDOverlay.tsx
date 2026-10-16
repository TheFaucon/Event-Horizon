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
  events: SimulationEvent[];
  onClearEvents: () => void;
  probesDevouredCount: number;
  fps: number;
  activeParticles: number;
}

type TabType = 'accretion' | 'asteroids' | 'palette_bloom' | 'camera_system';

export const HUDOverlay: React.FC<HUDOverlayProps> = ({
  config,
  onChangeConfig,
  onSelectCameraPreset,
  onLaunchProbe,
  onRespawnBelt,
  events,
  onClearEvents,
  probesDevouredCount,
  fps,
  activeParticles,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('accretion');
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [showInfoModal, setShowInfoModal] = useState<boolean>(false);

  // Keyboard shortcut: 'H' toggles dock, 'Space' launches probe, 'R' respawns belt
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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onLaunchProbe, onRespawnBelt]);

  const activePalette = COLOR_PALETTES[config.colorPaletteId] || COLOR_PALETTES.gargantua;

  // Most recent event for instant visual feedback ticker
  const latestEvent = events.length > 0 ? events[0] : null;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 sm:p-4 z-10 font-sans">
      {/* Top Header Bar: Telemetry, Event Log & Actions */}
      <header className="flex items-center justify-between w-full pointer-events-auto gap-2">
        <div className="flex items-center space-x-3 bg-neutral-950/90 border border-neutral-800 rounded-lg px-3.5 py-2 text-white shadow-xl">
          <div className="w-3 h-3 rounded-full bg-amber-500" />
          <div>
            <h1 className="text-sm font-semibold tracking-wider uppercase text-neutral-200">
              Event Horizon 3D
            </h1>
            <p className="text-xs text-neutral-400 font-mono">
              Relativistic Kerr Black Hole • M = 4.3×10^6 M_sun
            </p>
          </div>
        </div>

        {/* Real-Time Telemetry Badges */}
        <div className="hidden md:flex items-center space-x-2">
          <div className="bg-neutral-950/90 border border-neutral-800 px-3 py-1.5 rounded-lg text-xs font-mono text-neutral-300">
            <span className="text-neutral-500 mr-1.5">FPS</span>
            <span className={fps < 30 ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>{fps}</span>
          </div>

          <div className="bg-neutral-950/90 border border-neutral-800 px-3 py-1.5 rounded-lg text-xs font-mono text-neutral-300">
            <span className="text-neutral-500 mr-1.5">Particles</span>
            <span className="text-cyan-400 font-bold">{activeParticles.toLocaleString()}</span>
          </div>

          <div className="bg-neutral-950/90 border border-neutral-800 px-3 py-1.5 rounded-lg text-xs font-mono text-neutral-300">
            <span className="text-neutral-500 mr-1.5">Consumed</span>
            <span className="text-amber-400 font-bold">{probesDevouredCount}</span>
          </div>

          <button
            type="button"
            onClick={() => setShowInfoModal(true)}
            aria-label="Astrophysics information"
            className="bg-neutral-950/90 hover:bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white p-2 rounded-lg transition-colors cursor-pointer"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>

        {/* Top Right: Event Log, Respawn Belt, & Probe Launcher */}
        <div className="flex items-center space-x-2">
          {/* Event Log Component */}
          <EventLog events={events} onClearEvents={onClearEvents} />

          {/* Quick Respawn Belt Button */}
          <button
            type="button"
            onClick={onRespawnBelt}
            title="Reset & Respawn Asteroid Belt (R)"
            className="hidden sm:flex items-center space-x-1.5 bg-neutral-950/90 hover:bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
            <span>Respawn Belt</span>
          </button>

          {/* Quick Matter Launcher Button */}
          <button
            type="button"
            onClick={onLaunchProbe}
            className="flex items-center space-x-1.5 sm:space-x-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-medium uppercase tracking-wide px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg shadow-lg cursor-pointer transition-all active:scale-95 border border-amber-400/30"
          >
            <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-200" />
            <span>Launch Probe <span className="hidden sm:inline opacity-60 text-[10px] lowercase">(space)</span></span>
          </button>
        </div>
      </header>

      {/* Floating Alert Ticker (Shows the latest horizon crossing event) */}
      {latestEvent && (
        <div className="pointer-events-none self-center transition-all duration-300 my-2">
          <div className="bg-neutral-950/85 border border-amber-500/30 rounded-full px-4 py-1 text-[11px] font-mono text-neutral-200 flex items-center space-x-2 shadow-2xl backdrop-blur-none">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-amber-300 uppercase font-semibold">{latestEvent.title}:</span>
            <span className="text-neutral-300">{latestEvent.details}</span>
          </div>
        </div>
      )}

      {/* Central Viewport is completely unobstructed for maximum 3D clarity */}

      {/* Unified Bottom Control Dock */}
      <footer className="w-full flex flex-col items-center pointer-events-auto">
        {/* Toggle Collapse Pill */}
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

        {/* Main Dock Container */}
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
                onClick={() => setActiveTab('asteroids')}
                className={`flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === 'asteroids'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
                }`}
              >
                <Orbit className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Asteroid Belt</span>
                <span className="sm:hidden">Asteroids</span>
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

            {/* Quick Play/Pause and Audio Controls */}
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
              {/* Gravity Inward Pull */}
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

              {/* Rotation Speed */}
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

              {/* Particle Density & Toggles */}
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

          {/* TAB 2: ASTEROID BELT */}
          {activeTab === 'asteroids' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-neutral-300">
              {/* Asteroid Population & Respawn */}
              <div className="flex flex-col space-y-2 bg-neutral-900/60 p-2.5 rounded-xl border border-neutral-800/80">
                <div className="flex justify-between items-center">
                  <label htmlFor="asteroid-count" className="font-medium text-neutral-200">
                    Asteroid Population
                  </label>
                  <span className="font-mono text-cyan-400">{config.asteroidCount} rocks</span>
                </div>
                <input
                  id="asteroid-count"
                  type="range"
                  min="100"
                  max="1200"
                  step="50"
                  value={config.asteroidCount}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    onChangeConfig((c) => ({ ...c, asteroidCount: val }));
                  }}
                  className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-neutral-700 rounded-lg"
                />
                {/* Reset / Respawn Belt Button */}
                <button
                  type="button"
                  onClick={onRespawnBelt}
                  className="flex items-center justify-center space-x-2 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-800/60 text-cyan-200 py-1.5 px-3 rounded-lg font-medium transition-colors cursor-pointer mt-1"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Reset / Respawn Belt (R)</span>
                </button>
              </div>

              {/* Belt Radius */}
              <div className="flex flex-col space-y-1.5 bg-neutral-900/60 p-2.5 rounded-xl border border-neutral-800/80">
                <div className="flex justify-between items-center">
                  <label htmlFor="asteroid-radius" className="font-medium text-neutral-200">
                    Belt Orbital Radius
                  </label>
                  <span className="font-mono text-emerald-400">{config.asteroidBeltRadius} AU</span>
                </div>
                <input
                  id="asteroid-radius"
                  type="range"
                  min="36"
                  max="68"
                  step="2"
                  value={config.asteroidBeltRadius}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    onChangeConfig((c) => ({ ...c, asteroidBeltRadius: val }));
                  }}
                  className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-neutral-700 rounded-lg"
                />
                <p className="text-[11px] text-neutral-400">
                  Initial distance where asteroids are seeded at circular orbital speed v = √(GM/r).
                </p>
              </div>

              {/* Belt Width & Navigation */}
              <div className="flex flex-col space-y-1.5 bg-neutral-900/60 p-2.5 rounded-xl border border-neutral-800/80">
                <div className="flex justify-between items-center">
                  <label htmlFor="asteroid-width" className="font-medium text-neutral-200">
                    Belt Radial Width
                  </label>
                  <span className="font-mono text-blue-400">{config.asteroidBeltWidth} AU</span>
                </div>
                <input
                  id="asteroid-width"
                  type="range"
                  min="4"
                  max="20"
                  step="1"
                  value={config.asteroidBeltWidth}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    onChangeConfig((c) => ({ ...c, asteroidBeltWidth: val }));
                  }}
                  className="w-full accent-blue-500 cursor-pointer h-1.5 bg-neutral-700 rounded-lg"
                />
                <div className="flex justify-between items-center pt-1 text-[11px] text-neutral-400">
                  <span>Newtonian 3D N-body</span>
                  <button
                    type="button"
                    onClick={() => onSelectCameraPreset('asteroid_belt')}
                    className="text-cyan-400 hover:underline cursor-pointer"
                  >
                    Jump to Belt POV →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: COLOR PALETTE & BLOOM GLOW */}
          {activeTab === 'palette_bloom' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-neutral-300">
              {/* Palette Preset Selector */}
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

              {/* UnrealBloom Post-Processing Glow */}
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
              {/* Camera Presets */}
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

              {/* Space Soundscape */}
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

      {/* Educational Astrophysics Modal */}
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
                <span>Anatomy of a Relativistic Black Hole</span>
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
                <strong className="text-amber-400 block text-sm mb-0.5">1. Event Horizon & ISCO</strong>
                The boundary from which not even light can escape (Rs = 2GM/c²). Surrounding it is the Innermost Stable Circular Orbit (ISCO), the inner edge where gas leaves stable orbit and plunges into the singularity.
              </div>
              <div>
                <strong className="text-cyan-400 block text-sm mb-0.5">2. Photon Ring (Einstein Ring)</strong>
                A thin, luminous ring formed by photons deflected by intense gravity through orbits around the black hole before escaping toward your eye.
              </div>
              <div>
                <strong className="text-orange-400 block text-sm mb-0.5">3. Differential Keplerian Accretion Disk</strong>
                Friction and gravitational shear heat orbiting dust and ionized plasma to millions of degrees Kelvin. Inner regions orbit faster than outer regions according to Kepler&apos;s laws (v ∝ 1/√r).
              </div>
              <div>
                <strong className="text-fuchsia-400 block text-sm mb-0.5">4. Relativistic Doppler Beaming</strong>
                Gas moving toward the observer appears substantially boosted in brightness and blueshifted, while gas revolving away appears dimmed.
              </div>
              <div>
                <strong className="text-emerald-400 block text-sm mb-0.5">5. Tidal Spaghettification & Newtonian Orbits</strong>
                Matter falling toward the event horizon experiences extreme differential gravitational gradient forces, stretching along its radial path before crossing the event horizon.
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
