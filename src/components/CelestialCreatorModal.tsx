/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  Globe2,
  Disc,
  Sparkles,
  Orbit,
  Plus,
  Trash2,
  Camera,
  Eye,
  Check,
} from 'lucide-react';
import {
  CelestialBodyDefinition,
  CelestialBodyType,
  CELESTIAL_PRESETS,
  MoonConfig,
  PlanetStyle,
} from '../types/celestial';

interface CelestialCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSpawnCelestialBody: (definition: CelestialBodyDefinition) => void;
  activeBodies: CelestialBodyDefinition[];
  onRemoveCelestialBody: (id: string) => void;
  onTrackCelestialBody: (id: string | null) => void;
  trackedBodyId: string | null;
}

type ModalTab = 'presets' | 'custom' | 'fleet';

const PLANET_STYLE_OPTIONS: { id: PlanetStyle; label: string; badge: string; defaultColor: string }[] = [
  { id: 'terrestrial', label: 'Tellurique (Terre / Continents)', badge: '🌍', defaultColor: '#2563eb' },
  { id: 'ringed_saturn', label: 'Géante Dorée (Saturne)', badge: '🪐', defaultColor: '#eab308' },
  { id: 'gas_giant', label: 'Géante Gazeuse (Jupiter)', badge: '🟠', defaultColor: '#ea580c' },
  { id: 'oceanic', label: 'Monde Océanique', badge: '🌊', defaultColor: '#0284c7' },
  { id: 'lava', label: 'Monde Volcanique (Lave)', badge: '🌋', defaultColor: '#ef4444' },
  { id: 'ice_dwarf', label: 'Planète Naine Glacée', badge: '❄️', defaultColor: '#bae6fd' },
  { id: 'desert', label: 'Désertique (Mars / Dunes)', badge: '🔴', defaultColor: '#dc2626' },
  { id: 'toxic', label: 'Atmosphère Acide (Vénus)', badge: '🟢', defaultColor: '#84cc16' },
  { id: 'rocky_asteroid', label: 'Astéroïde Rocheux Irrégulier', badge: '🪨', defaultColor: '#a8a29e' },
];

const BODY_TYPE_OPTIONS: { id: CelestialBodyType; label: string }[] = [
  { id: 'planet', label: 'Planète' },
  { id: 'ringed_planet', label: 'Planète à Anneaux' },
  { id: 'gas_giant', label: 'Géante Gazeuse' },
  { id: 'dwarf_planet', label: 'Planète Naine' },
  { id: 'asteroid', label: 'Astéroïde Géant' },
  { id: 'comet', label: 'Comète' },
];

export const CelestialCreatorModal: React.FC<CelestialCreatorModalProps> = ({
  isOpen,
  onClose,
  onSpawnCelestialBody,
  activeBodies,
  onRemoveCelestialBody,
  onTrackCelestialBody,
  trackedBodyId,
}) => {
  const [activeTab, setActiveTab] = useState<ModalTab>('presets');

  // Custom creator form state
  const [name, setName] = useState<string>('Kepler-442b');
  const [bodyType, setBodyType] = useState<CelestialBodyType>('ringed_planet');
  const [style, setStyle] = useState<PlanetStyle>('terrestrial');
  const [color, setColor] = useState<string>('#3b82f6');
  const [radius, setRadius] = useState<number>(2.0);
  const [mass, setMass] = useState<number>(65);
  const [hasAtmosphere, setHasAtmosphere] = useState<boolean>(true);
  const [atmosphereColor, setAtmosphereColor] = useState<string>('#60a5fa');
  const [hasRings, setHasRings] = useState<boolean>(true);
  const [ringColor, setRingColor] = useState<string>('#fbbf24');
  const [ringOuterRadius, setRingOuterRadius] = useState<number>(2.6);
  const [ringTilt, setRingTilt] = useState<number>(22);
  const [orbitalRadius, setOrbitalRadius] = useState<number>(46);
  const [orbitalSpeedMultiplier, setOrbitalSpeedMultiplier] = useState<number>(1.0);
  const [orbitalInclination, setOrbitalInclination] = useState<number>(8);
  const [eccentricity, setEccentricity] = useState<number>(0.05);

  const [moons, setMoons] = useState<MoonConfig[]>([
    {
      id: 'custom-moon-1',
      name: 'Phobos-X',
      radius: 0.45,
      orbitalDistance: 4.5,
      orbitalSpeed: 1.7,
      orbitalInclination: 6,
      color: '#cbd5e1',
    },
  ]);

  if (!isOpen) return null;

  const handleAddMoon = () => {
    if (moons.length >= 4) return;
    const idx = moons.length + 1;
    setMoons((prev) => [
      ...prev,
      {
        id: `moon-${Date.now()}-${idx}`,
        name: `Lune-${idx}`,
        radius: 0.38,
        orbitalDistance: 3.5 + idx * 1.8,
        orbitalSpeed: 1.9 - idx * 0.25,
        orbitalInclination: (idx % 2 === 0 ? 1 : -1) * (5 + idx * 4),
        color: idx % 2 === 0 ? '#fde047' : '#cbd5e1',
      },
    ]);
  };

  const handleRemoveMoon = (id: string) => {
    setMoons((prev) => prev.filter((m) => m.id !== id));
  };

  const handleUpdateMoon = (id: string, patch: Partial<MoonConfig>) => {
    setMoons((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  };

  const handleSpawnPreset = (preset: CelestialBodyDefinition) => {
    const instance: CelestialBodyDefinition = {
      ...preset,
      id: `${preset.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      orbitalAngle: Math.random() * Math.PI * 2,
    };
    onSpawnCelestialBody(instance);
  };

  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim() || 'Objet Céleste';
    const customBody: CelestialBodyDefinition = {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: trimmedName,
      type: bodyType,
      style,
      radius,
      mass,
      color,
      hasAtmosphere,
      atmosphereColor,
      hasRings,
      ringInnerRadius: 1.35,
      ringOuterRadius,
      ringColor,
      ringTilt,
      orbitalRadius,
      orbitalSpeedMultiplier,
      orbitalInclination,
      eccentricity,
      orbitalAngle: Math.random() * Math.PI * 2,
      axialRotationSpeed: 1.0,
      moons,
    };
    onSpawnCelestialBody(customBody);
    setActiveTab('fleet');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-6 pointer-events-auto backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="celestial-modal-title"
    >
      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl max-w-3xl w-full max-h-[88vh] flex flex-col text-neutral-200 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-neutral-900/50">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-300">
              <Orbit className="w-5 h-5" />
            </div>
            <div>
              <h2 id="celestial-modal-title" className="text-base font-bold text-white tracking-wide">
                Atelier de Corps Célestes &amp; Insertion Orbitale
              </h2>
              <p className="text-xs text-neutral-400">
                Ajoutez des planètes, géantes à anneaux, planètes naines, lunes et objets sur-mesure autour du trou noir
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer l'atelier céleste"
            className="text-neutral-400 hover:text-white p-1.5 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center space-x-2 px-5 pt-3 border-b border-neutral-800 bg-neutral-950">
          <button
            type="button"
            onClick={() => setActiveTab('presets')}
            className={`flex items-center space-x-1.5 px-3.5 py-2 text-xs font-medium rounded-t-lg border-b-2 transition-colors cursor-pointer ${
              activeTab === 'presets'
                ? 'border-indigo-400 text-indigo-300 bg-indigo-500/10'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Catalogue Rapide ({CELESTIAL_PRESETS.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('custom')}
            className={`flex items-center space-x-1.5 px-3.5 py-2 text-xs font-medium rounded-t-lg border-b-2 transition-colors cursor-pointer ${
              activeTab === 'custom'
                ? 'border-amber-400 text-amber-300 bg-amber-500/10'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Objet Personnalisé (Sur-Mesure)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('fleet')}
            className={`flex items-center space-x-1.5 px-3.5 py-2 text-xs font-medium rounded-t-lg border-b-2 transition-colors cursor-pointer ${
              activeTab === 'fleet'
                ? 'border-emerald-400 text-emerald-300 bg-emerald-500/10'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Globe2 className="w-3.5 h-3.5" />
            <span>Corps en Orbite ({activeBodies.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* TAB 1: PRESETS CATALOG */}
          {activeTab === 'presets' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CELESTIAL_PRESETS.map((preset) => (
                <div
                  key={preset.id}
                  className="flex flex-col justify-between p-3.5 rounded-xl bg-neutral-900/70 border border-neutral-800 hover:border-indigo-500/50 transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-sm text-white">{preset.name}</span>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {preset.type.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 text-[11px] text-neutral-400 font-mono my-2 bg-neutral-950/70 p-2 rounded-lg">
                      <div>
                        <span className="text-neutral-500 block text-[9px]">DISTANCE</span>
                        <span className="text-neutral-200">{preset.orbitalRadius} AU</span>
                      </div>
                      <div>
                        <span className="text-neutral-500 block text-[9px]">ANNEAUX</span>
                        <span className={preset.hasRings ? 'text-amber-400' : 'text-neutral-500'}>
                          {preset.hasRings ? 'Oui' : 'Non'}
                        </span>
                      </div>
                      <div>
                        <span className="text-neutral-500 block text-[9px]">LUNES</span>
                        <span className="text-cyan-400">{preset.moons.length} satellite(s)</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSpawnPreset(preset)}
                    className="w-full mt-2 flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all cursor-pointer active:scale-98"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Insérer {preset.name} en Orbite</span>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* TAB 2: CUSTOM CELESTIAL CREATOR */}
          {activeTab === 'custom' && (
            <form onSubmit={handleCreateCustom} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-neutral-900/60 p-3.5 rounded-xl border border-neutral-800">
                <div>
                  <label htmlFor="custom-body-name" className="block text-neutral-300 font-medium mb-1">
                    Nom de l&apos;astre
                  </label>
                  <input
                    id="custom-body-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Hypérion-VII"
                    className="w-full px-3 py-1.5 rounded-lg bg-neutral-950 border border-neutral-700 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label htmlFor="custom-body-type" className="block text-neutral-300 font-medium mb-1">
                    Catégorie céleste
                  </label>
                  <select
                    id="custom-body-type"
                    value={bodyType}
                    onChange={(e) => setBodyType(e.target.value as CelestialBodyType)}
                    className="w-full px-3 py-1.5 rounded-lg bg-neutral-950 border border-neutral-700 text-white focus:outline-none focus:border-amber-400"
                  >
                    {BODY_TYPE_OPTIONS.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="custom-body-style" className="block text-neutral-300 font-medium mb-1">
                    Apparence &amp; Surface
                  </label>
                  <select
                    id="custom-body-style"
                    value={style}
                    onChange={(e) => {
                      const nextStyle = e.target.value as PlanetStyle;
                      setStyle(nextStyle);
                      const found = PLANET_STYLE_OPTIONS.find((p) => p.id === nextStyle);
                      if (found) setColor(found.defaultColor);
                    }}
                    className="w-full px-3 py-1.5 rounded-lg bg-neutral-950 border border-neutral-700 text-white focus:outline-none focus:border-amber-400"
                  >
                    {PLANET_STYLE_OPTIONS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.badge} {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Physical Dimensions & Orbital Parameters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-neutral-900/60 p-3.5 rounded-xl border border-neutral-800 space-y-2.5">
                  <div className="font-semibold text-neutral-200 flex items-center space-x-1.5">
                    <Globe2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Propriétés Physiques</span>
                  </div>

                  <div>
                    <div className="flex justify-between">
                      <label htmlFor="custom-radius">Rayon du corps</label>
                      <span className="font-mono text-amber-400">{radius.toFixed(2)} R_Terre</span>
                    </div>
                    <input
                      id="custom-radius"
                      type="range"
                      min="0.6"
                      max="3.6"
                      step="0.1"
                      value={radius}
                      onChange={(e) => setRadius(parseFloat(e.target.value))}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between">
                      <label htmlFor="custom-mass">Masse gravitationnelle</label>
                      <span className="font-mono text-cyan-400">{mass} MT</span>
                    </div>
                    <input
                      id="custom-mass"
                      type="range"
                      min="5"
                      max="250"
                      step="5"
                      value={mass}
                      onChange={(e) => setMass(parseInt(e.target.value, 10))}
                      className="w-full accent-cyan-500 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasAtmosphere}
                        onChange={(e) => setHasAtmosphere(e.target.checked)}
                        className="rounded accent-blue-500"
                      />
                      <span>Halo Atmosphérique</span>
                    </label>
                    <input
                      type="color"
                      aria-label="Couleur de l'atmosphère"
                      value={atmosphereColor}
                      disabled={!hasAtmosphere}
                      onChange={(e) => setAtmosphereColor(e.target.value)}
                      className="w-7 h-6 rounded bg-transparent cursor-pointer disabled:opacity-30"
                    />
                  </div>
                </div>

                {/* Orbital Mechanics */}
                <div className="bg-neutral-900/60 p-3.5 rounded-xl border border-neutral-800 space-y-2.5">
                  <div className="font-semibold text-neutral-200 flex items-center space-x-1.5">
                    <Orbit className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Paramètres Orbitaux (Kepler)</span>
                  </div>

                  <div>
                    <div className="flex justify-between">
                      <label htmlFor="custom-orbit-radius">Distance orbitale (Demi-grand axe)</label>
                      <span className="font-mono text-indigo-400">{orbitalRadius} AU</span>
                    </div>
                    <input
                      id="custom-orbit-radius"
                      type="range"
                      min="18"
                      max="78"
                      step="1"
                      value={orbitalRadius}
                      onChange={(e) => setOrbitalRadius(parseInt(e.target.value, 10))}
                      className="w-full accent-indigo-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between">
                      <label htmlFor="custom-inclination">Inclinaison orbitale 3D</label>
                      <span className="font-mono text-emerald-400">{orbitalInclination}°</span>
                    </div>
                    <input
                      id="custom-inclination"
                      type="range"
                      min="-45"
                      max="45"
                      step="1"
                      value={orbitalInclination}
                      onChange={(e) => setOrbitalInclination(parseInt(e.target.value, 10))}
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between">
                      <label htmlFor="custom-eccentricity">Excentricité (0 = Cercle, 0.5 = Ellipse)</label>
                      <span className="font-mono text-rose-400">e = {eccentricity.toFixed(2)}</span>
                    </div>
                    <input
                      id="custom-eccentricity"
                      type="range"
                      min="0"
                      max="0.55"
                      step="0.02"
                      value={eccentricity}
                      onChange={(e) => setEccentricity(parseFloat(e.target.value))}
                      className="w-full accent-rose-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Rings & Natural Satellites (Moons) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Planetary Rings */}
                <div className="bg-neutral-900/60 p-3.5 rounded-xl border border-neutral-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center space-x-2 font-semibold text-neutral-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasRings}
                        onChange={(e) => setHasRings(e.target.checked)}
                        className="rounded accent-amber-500"
                      />
                      <Disc className="w-3.5 h-3.5 text-amber-400" />
                      <span>Système d&apos;Anneaux Planétaires</span>
                    </label>
                    <input
                      type="color"
                      aria-label="Couleur des anneaux"
                      value={ringColor}
                      disabled={!hasRings}
                      onChange={(e) => setRingColor(e.target.value)}
                      className="w-7 h-6 rounded bg-transparent cursor-pointer disabled:opacity-30"
                    />
                  </div>

                  {hasRings && (
                    <>
                      <div>
                        <div className="flex justify-between">
                          <label htmlFor="ring-outer">Envergure des anneaux</label>
                          <span className="font-mono text-amber-300">{ringOuterRadius.toFixed(1)}x rayon</span>
                        </div>
                        <input
                          id="ring-outer"
                          type="range"
                          min="1.8"
                          max="3.6"
                          step="0.1"
                          value={ringOuterRadius}
                          onChange={(e) => setRingOuterRadius(parseFloat(e.target.value))}
                          className="w-full accent-amber-500 cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between">
                          <label htmlFor="ring-tilt">Inclinaison des anneaux</label>
                          <span className="font-mono text-amber-300">{ringTilt}°</span>
                        </div>
                        <input
                          id="ring-tilt"
                          type="range"
                          min="-45"
                          max="45"
                          step="1"
                          value={ringTilt}
                          onChange={(e) => setRingTilt(parseInt(e.target.value, 10))}
                          className="w-full accent-amber-500 cursor-pointer"
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Moons / Natural Satellites */}
                <div className="bg-neutral-900/60 p-3.5 rounded-xl border border-neutral-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-neutral-200">Lunes en Orbite ({moons.length}/4)</span>
                    <button
                      type="button"
                      onClick={handleAddMoon}
                      disabled={moons.length >= 4}
                      className="flex items-center space-x-1 px-2 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-[11px] cursor-pointer disabled:opacity-40"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Ajouter Lune</span>
                    </button>
                  </div>

                  <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                    {moons.length === 0 ? (
                      <p className="text-[11px] text-neutral-500 italic py-2">Aucune lune configurée pour cet astre.</p>
                    ) : (
                      moons.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center justify-between bg-neutral-950/80 px-2.5 py-1.5 rounded-lg border border-neutral-800"
                        >
                          <input
                            type="text"
                            aria-label="Nom de la lune"
                            value={m.name}
                            onChange={(e) => handleUpdateMoon(m.id, { name: e.target.value })}
                            className="bg-transparent text-white font-medium w-24 focus:outline-none border-b border-transparent focus:border-cyan-400 text-[11px]"
                          />
                          <div className="flex items-center space-x-2 text-[10px] text-neutral-400">
                            <span>Dist: {m.orbitalDistance.toFixed(1)}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveMoon(m.id)}
                              aria-label={`Supprimer ${m.name}`}
                              className="text-neutral-500 hover:text-rose-400 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="submit"
                  className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-neutral-950 font-bold text-xs shadow-lg cursor-pointer transition-all"
                >
                  <Check className="w-4 h-4" />
                  <span>Mettre {name || 'Astre'} en Orbite</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: ACTIVE ORBITING FLEET */}
          {activeTab === 'fleet' && (
            <div className="space-y-2.5">
              {activeBodies.length === 0 ? (
                <div className="text-center py-8 text-neutral-400 text-xs">
                  Aucun corps céleste personnalisé en orbite. Utilisez le Catalogue Rapide ou l&apos;Atelier Sur-Mesure !
                </div>
              ) : (
                activeBodies.map((body) => {
                  const isTracked = trackedBodyId === body.id;
                  return (
                    <div
                      key={body.id}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                        isTracked
                          ? 'bg-indigo-950/40 border-indigo-500/60'
                          : 'bg-neutral-900/70 border-neutral-800'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <span
                          className="w-4 h-4 rounded-full border border-white/30 flex-shrink-0"
                          style={{ backgroundColor: body.color }}
                        />
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-sm text-white">{body.name}</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">
                              {body.orbitalRadius} AU
                            </span>
                            {body.hasRings && (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                                Anneaux
                              </span>
                            )}
                            {body.moons.length > 0 && (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                                {body.moons.length} Lune(s)
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-neutral-400 font-mono">
                            Masse: {body.mass} MT • Inclinaison: {body.orbitalInclination}° • Excentricité: {body.eccentricity}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => onTrackCelestialBody(isTracked ? null : body.id)}
                          className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                            isTracked
                              ? 'bg-indigo-500 text-white'
                              : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
                          }`}
                        >
                          {isTracked ? <Eye className="w-3.5 h-3.5" /> : <Camera className="w-3.5 h-3.5" />}
                          <span>{isTracked ? 'Suivi Actif' : 'Suivre Caméra'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onRemoveCelestialBody(body.id)}
                          aria-label={`Supprimer ${body.name}`}
                          className="p-1.5 rounded-lg bg-neutral-800 hover:bg-rose-900/60 text-neutral-400 hover:text-rose-300 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
