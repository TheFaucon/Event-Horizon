/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ScrollText, ChevronDown, ChevronUp, Trash2, AlertTriangle, Disc, Orbit, Gauge, Zap, Flame, Globe2 } from 'lucide-react';
import { SimulationEvent } from '../utils/physics';

interface EventLogProps {
  events: SimulationEvent[];
  onClearEvents: () => void;
}

export const EventLog: React.FC<EventLogProps> = ({ events, onClearEvents }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [filter, setFilter] = useState<'all' | 'consumed' | 'collisions' | 'system'>('all');

  const filteredEvents = events.filter((e) => {
    if (filter === 'consumed') {
      return e.type === 'asteroid_consumed' || e.type === 'probe_consumed';
    }
    if (filter === 'collisions') {
      return e.type === 'collision' || e.type === 'fragmentation';
    }
    if (filter === 'system') {
      return e.type === 'gravity_change' || e.type === 'belt_respawn' || e.type === 'planetoid_spawned';
    }
    return true;
  });

  const getEventIcon = (type: SimulationEvent['type']) => {
    switch (type) {
      case 'asteroid_consumed':
        return <Orbit className="w-3.5 h-3.5 text-amber-400" />;
      case 'probe_consumed':
        return <Disc className="w-3.5 h-3.5 text-orange-400" />;
      case 'collision':
        return <Zap className="w-3.5 h-3.5 text-amber-300" />;
      case 'fragmentation':
        return <Flame className="w-3.5 h-3.5 text-rose-400" />;
      case 'planetoid_spawned':
        return <Globe2 className="w-3.5 h-3.5 text-red-400" />;
      case 'celestial_spawned':
        return <Globe2 className="w-3.5 h-3.5 text-indigo-400" />;
      case 'celestial_consumed':
        return <Flame className="w-3.5 h-3.5 text-rose-400" />;
      case 'gravity_change':
        return <Gauge className="w-3.5 h-3.5 text-cyan-400" />;
      case 'belt_respawn':
        return <Orbit className="w-3.5 h-3.5 text-emerald-400" />;
      default:
        return <AlertTriangle className="w-3.5 h-3.5 text-neutral-400" />;
    }
  };

  const getBadgeColor = (type: SimulationEvent['type']) => {
    switch (type) {
      case 'asteroid_consumed':
        return 'bg-amber-950/60 text-amber-300 border-amber-800/60';
      case 'probe_consumed':
        return 'bg-orange-950/60 text-orange-300 border-orange-800/60';
      case 'collision':
        return 'bg-yellow-950/60 text-yellow-300 border-yellow-800/60';
      case 'fragmentation':
        return 'bg-rose-950/70 text-rose-300 border-rose-800/70';
      case 'planetoid_spawned':
        return 'bg-red-950/80 text-red-200 border-red-700/80';
      case 'celestial_spawned':
        return 'bg-indigo-950/70 text-indigo-300 border-indigo-800/70';
      case 'celestial_consumed':
        return 'bg-rose-950/80 text-rose-200 border-rose-700/80';
      case 'gravity_change':
        return 'bg-cyan-950/60 text-cyan-300 border-cyan-800/60';
      case 'belt_respawn':
        return 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60';
      default:
        return 'bg-neutral-800 text-neutral-300 border-neutral-700';
    }
  };

  return (
    <div className="relative pointer-events-auto font-sans">
      {/* Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center space-x-2 bg-neutral-950/90 hover:bg-neutral-900 border border-neutral-800 px-3 py-1.5 rounded-lg text-xs font-mono text-neutral-200 shadow-xl cursor-pointer transition-colors"
        aria-label={isOpen ? 'Collapse Event Log' : 'Expand Event Log'}
        aria-expanded={isOpen}
      >
        <ScrollText className="w-3.5 h-3.5 text-amber-400" />
        <span>Event Log</span>
        {events.length > 0 && (
          <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
            {events.length}
          </span>
        )}
        {isOpen ? <ChevronUp className="w-3 h-3 text-neutral-400" /> : <ChevronDown className="w-3 h-3 text-neutral-400" />}
      </button>

      {/* Popover / Drawer Panel */}
      {isOpen && (
        <div
          role="region"
          aria-label="Real-time Event Log Panel"
          className="absolute right-0 top-10 w-80 sm:w-96 max-h-[460px] flex flex-col bg-neutral-950/95 border border-neutral-800 rounded-xl shadow-2xl z-30 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-neutral-800/80 bg-neutral-900/60">
            <div className="flex items-center space-x-2">
              <ScrollText className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-semibold text-neutral-200">Singularity Event Log</span>
            </div>

            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={onClearEvents}
                title="Clear Log"
                className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-rose-400 transition-colors cursor-pointer"
                aria-label="Clear all log entries"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center space-x-1 px-3 py-2 border-b border-neutral-800/60 bg-neutral-950 text-[11px] overflow-x-auto">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-2 py-0.5 rounded cursor-pointer whitespace-nowrap transition-colors ${
                filter === 'all'
                  ? 'bg-neutral-800 text-white font-medium'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              All ({events.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('collisions')}
              className={`px-2 py-0.5 rounded cursor-pointer whitespace-nowrap transition-colors ${
                filter === 'collisions'
                  ? 'bg-yellow-950/80 text-yellow-300 font-medium border border-yellow-800/50'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Collisions & Debris
            </button>
            <button
              type="button"
              onClick={() => setFilter('consumed')}
              className={`px-2 py-0.5 rounded cursor-pointer whitespace-nowrap transition-colors ${
                filter === 'consumed'
                  ? 'bg-amber-950/80 text-amber-300 font-medium border border-amber-800/50'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Horizon Plunges
            </button>
            <button
              type="button"
              onClick={() => setFilter('system')}
              className={`px-2 py-0.5 rounded cursor-pointer whitespace-nowrap transition-colors ${
                filter === 'system'
                  ? 'bg-cyan-950/80 text-cyan-300 font-medium border border-cyan-800/50'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              System & Gravity
            </button>
          </div>

          {/* Events Scroll Area */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-2 max-h-[320px] font-mono text-xs">
            {filteredEvents.length === 0 ? (
              <div className="text-center py-8 text-neutral-500 text-xs">
                No events recorded in this category yet.
              </div>
            ) : (
              filteredEvents.map((event) => (
                <div
                  key={event.id}
                  className="bg-neutral-900/60 hover:bg-neutral-900/90 border border-neutral-800/70 p-2 rounded-lg flex flex-col space-y-1 transition-colors"
                >
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="flex items-center space-x-1.5">
                      {getEventIcon(event.type)}
                      <span className={`px-1.5 py-0.5 rounded border text-[9px] uppercase tracking-wider ${getBadgeColor(event.type)}`}>
                        {event.title}
                      </span>
                    </span>
                    <span className="text-neutral-500">{event.timestamp}</span>
                  </div>

                  <p className="text-[11px] text-neutral-300 font-sans leading-relaxed">
                    {event.details}
                  </p>

                  {event.distanceAU !== undefined && (
                    <div className="text-[10px] text-neutral-400 flex items-center justify-between pt-0.5">
                      <span className="text-neutral-500">Radial Distance:</span>
                      <span className="font-mono text-amber-400">{event.distanceAU.toFixed(2)} AU</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer Info */}
          <div className="px-3 py-1.5 border-t border-neutral-800 bg-neutral-950 text-[10px] text-neutral-500 flex justify-between items-center">
            <span>Event Horizon: 3.20 AU</span>
            <span>3D Rigid-Body Simulation Telemetry</span>
          </div>
        </div>
      )}
    </div>
  );
};
