import React, { useEffect, useRef, useState } from 'react';
import { MapPin, ExternalLink, Navigation, ChevronRight } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface MapItem {
  id: string;
  name: string;
  entityType?: 'agent' | 'space' | 'event' | 'opportunity' | 'project' | 'user_location';
  type?: string;
  description: string;
  address: {
    text: string;
    lat: number;
    lng: number;
    mapUrl?: string;
  };
  contactInfo?: {
    phone?: string;
    email?: string;
    website?: string;
  };
}

interface AgentMapProps {
  agents: any[]; // Accept any map items (cast elements internally to allow polymorphism)
  onAgentClick: (agent: any) => void;
  selectedAgentId: string | null | undefined;
  onViewProfile?: (agent: any) => void;
}

// Generate deterministic coordinates for items without explicit lat/lng to scatter them around Breves
const getDeterministicCoords = (id: string, index: number) => {
  let hash = 0;
  const str = id || String(index);
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const latOffset = ((Math.abs(hash) % 100) / 100) * 0.016 - 0.008; // scale offset to map over Breves
  const lngOffset = (((Math.abs(hash) >> 8) % 100) / 100) * 0.016 - 0.008;
  return {
    lat: -1.6811 + latOffset,
    lng: -50.4795 + lngOffset
  };
};

const getMarkerColor = (item: any) => {
  switch (item.entityType) {
    case 'space': return '#9B51E0'; // Purple
    case 'event': return '#E30613'; // Red
    case 'opportunity': return '#F2994A'; // Orange
    case 'project': return '#2D9CDB'; // Light Blue
    case 'agent': return '#0070BA'; // Blue
    case 'user_location': return '#10B981'; // Green
    default: return '#E16238'; // Default Orange
  }
};

const getMarkerSvgString = (item: any) => {
  switch (item.entityType) {
    case 'space':
      return `<svg viewBox="0 0 24 24" style="width: 14px; height: 14px; fill: none; stroke: white; stroke-width: 2.5;" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 21h19.5m-18-10.5h16.5M2.25 9h19.5M4.5 19.5V6.25c0-.69.56-1.25 1.25-1.25H18.25c.69 0 1.25.56 1.25 1.25v13.5M9 19.5v-3.5c0-.69.56-1.25 1.25-1.25h3.5c.69 0 1.25.56 1.25 1.25v3.5" /></svg>`;
    case 'event':
      return `<svg viewBox="0 0 24 24" style="width: 14px; height: 14px; fill: none; stroke: white; stroke-width: 2.5;" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg>`;
    case 'opportunity':
      return `<svg viewBox="0 0 24 24" style="width: 14px; height: 14px; fill: none; stroke: white; stroke-width: 2.5;" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 18a3.75 3.75 0 0 0 .495-7.467 5.99 5.99 0 0 0-1.925 3.546 5.974 5.974 0 0 1-2.133-1a3.75 3.75 0 0 0 12 18Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M12 2.25V4.5m0 15v2.25m6.75-13.5h-2.25m-9 0H5.25m11.83 11.83-1.59-1.59m-11.83 0 1.59 1.59m11.83-11.83-1.59 1.59m-11.83 0 1.59-1.59" /></svg>`;
    case 'project':
      return `<svg viewBox="0 0 24 24" style="width: 14px; height: 14px; fill: none; stroke: white; stroke-width: 2.5;" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 0 1 2.008 1.24l.885 1.77a2.25 2.25 0 0 0 2.007 1.24h1.98a2.25 2.25 0 0 0 2.007-1.24l.885-1.77a2.25 2.25 0 0 1 2.007-1.24h3.86m-18 0h18" /></svg>`;
    case 'agent':
    default:
      return `<svg viewBox="0 0 24 24" style="width: 14px; height: 14px; fill: white;" aria-hidden="true"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>`;
  }
};

const createCustomMarker = (item: any) => {
  const color = getMarkerColor(item);
  const iconHtml = `
    <div style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; transform: translate(-8px, -8px);">
      <div style="background-color: ${color}; width: 34px; height: 34px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.25); transition: transform 0.2s;">
        ${getMarkerSvgString(item)}
      </div>
      <div style="width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 6px solid white; margin-top: -1px;"></div>
    </div>
  `;
  return L.divIcon({
    html: iconHtml,
    className: 'custom-leaflet-marker',
    iconSize: [34, 40],
    iconAnchor: [17, 40]
  });
};

export default function AgentMap({ agents, onAgentClick, selectedAgentId, onViewProfile }: AgentMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  
  // Find currently selected agent using selectedAgentId
  const selectedAgent = selectedAgentId 
    ? (agents.find(a => a.id === selectedAgentId) || null) 
    : null;

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapRef.current) {
      // Create raw Leaflet Map
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView([-1.6811, -50.4795], 14);

      // Add elegant ultra-clean light map tiles
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd'
      }).addTo(map);

      // Add Zoom control at bottom left
      L.control.zoom({
        position: 'bottomleft'
      }).addTo(map);

      mapRef.current = map;
      markersLayerRef.current = L.layerGroup().addTo(map);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersLayerRef.current = null;
      }
    };
  }, []);

  // Synchronize Markers
  useEffect(() => {
    const map = mapRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    // Remove existing markers
    markersLayer.clearLayers();

    const bounds: L.LatLngExpression[] = [];

    // Loop and plot every agent on the Map simultaneously
    agents.forEach((item, i) => {
      let lat = item.address?.lat;
      let lng = item.address?.lng;

      // Safe coordinate fallback scattering
      if (!lat || !lng) {
        const coords = getDeterministicCoords(item.id, i);
        lat = coords.lat;
        lng = coords.lng;
        // Inject into object so they align with card popups
        item.address = {
          ...item.address,
          lat,
          lng
        };
      }

      bounds.push([lat, lng]);

      const marker = L.marker([lat, lng], {
        icon: createCustomMarker(item)
      });

      // Handle user interactions on markers
      marker.on('click', () => {
        onAgentClick(item);
      });

      // Bind elegant responsive hovering tooltip
      marker.bindTooltip(item.name, {
        direction: 'top',
        offset: [0, -38],
        className: 'custom-map-tooltip'
      });

      markersLayer.addLayer(marker);
    });

    // Auto fit map bounds to comfortably fit all plotted items
    if (bounds.length > 0) {
      map.fitBounds(L.latLngBounds(bounds), {
        padding: [60, 60],
        maxZoom: 16
      });
    } else {
      map.setView([-1.6811, -50.4795], 14);
    }
  }, [agents]);

  // Synchronize dynamic camera pans
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedAgent) return;

    const lat = selectedAgent.address?.lat;
    const lng = selectedAgent.address?.lng;
    if (lat && lng) {
      map.flyTo([lat, lng], Math.max(map.getZoom(), 15), {
        animate: true,
        duration: 1.0
      });
    }
  }, [selectedAgentId, selectedAgent]);

  // Robust layout invalidation to fix initial gray display layout issues caused by animations or dynamic tab mounts
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Standard invalidateSize immediately
    map.invalidateSize();

    // Cascading timeouts to guarantee correct layout adjustment after animations complete
    const t1 = setTimeout(() => map.invalidateSize(), 100);
    const t2 = setTimeout(() => map.invalidateSize(), 300);
    const t3 = setTimeout(() => map.invalidateSize(), 650);
    const t4 = setTimeout(() => map.invalidateSize(), 1200);

    // Dynamic resize handler
    const handleResize = () => {
      map.invalidateSize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      window.removeEventListener('resize', handleResize);
    };
  }, [agents, selectedAgentId]);

  const markerColor = selectedAgent ? getMarkerColor(selectedAgent) : '#E16238';

  return (
    <div id="unified-mapping-container" className="w-full h-full flex flex-col gap-4 overflow-hidden relative">
      <style>{`
        .custom-map-tooltip {
          background-color: rgb(24 24 27 / 0.95) !important;
          border: 1px solid rgb(63 63 70 / 0.4) !important;
          color: #ffffff !important;
          font-weight: 800 !important;
          font-size: 10px !important;
          text-transform: uppercase !important;
          letter-spacing: 0.05em !important;
          border-radius: 12px !important;
          padding: 6px 12px !important;
          box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.3) !important;
        }
        .custom-map-tooltip::before {
          border-top-color: rgb(24 24 27 / 0.95) !important;
        }
        .custom-leaflet-marker {
          background: none !important;
          border: none !important;
        }
        .leaflet-grab {
          cursor: grab;
        }
        .leaflet-dragging .leaflet-grab {
          cursor: grabbing;
        }
      `}</style>

      <div className="flex-1 rounded-[2.5rem] overflow-hidden shadow-2xl border border-stone-200 bg-stone-100 relative min-h-[400px]">
        {/* Real Leaflet Map Container */}
        <div ref={mapContainerRef} className="w-full h-full z-0 relative" />

        {/* Leaflet attribution watermark */}
        <div className="absolute bottom-1 right-1 bg-white/95 backdrop-blur px-2.5 py-1 text-[9px] font-black text-stone-500 uppercase tracking-tighter select-none border border-stone-200 rounded z-[1000] pointer-events-none">
          Layout Leaflet &copy; OpenStreetMap
        </div>
        
        {/* Custom White Popover Info Overlay */}
        {selectedAgent && (
          <div className="absolute bottom-6 left-6 right-6 md:right-auto md:max-w-sm bg-white/95 backdrop-blur-xl p-6 rounded-[2rem] shadow-2xl border border-stone-200/80 z-[1000] pointer-events-auto flex flex-col gap-4">
            <div className="flex justify-between items-start gap-4">
              <div className="w-14 h-14 rounded-full overflow-hidden bg-stone-100 border border-stone-200 shrink-0 shadow-sm">
                {selectedAgent.images?.profile ? (
                  <img src={selectedAgent.images.profile} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : selectedAgent.image ? (
                  <img src={selectedAgent.image} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-stone-400 bg-stone-50">
                    <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current" style={{ color: markerColor }}>
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                  </div>
                )}
              </div>
              
              <button 
                onClick={() => {
                  onAgentClick(null);
                }}
                className="w-8 h-8 rounded-full bg-stone-50 hover:bg-stone-100 flex items-center justify-center text-stone-400 hover:text-stone-900 transition-colors shrink-0"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div>
              <h3 className="text-lg font-black text-stone-900 tracking-tight leading-none uppercase mb-2">
                {selectedAgent.name}
              </h3>
              
              <div className="space-y-1.5 text-xs text-stone-600 font-medium">
                <p className="leading-tight">
                  <span className="text-[10px] font-extrabold uppercase text-stone-400 mr-1.5">TIPO:</span>
                  <span className="font-bold text-stone-850">
                    {selectedAgent.type === 'individual' ? 'Individual' : selectedAgent.type === 'collective' ? 'Coletivo' : (selectedAgent.type || 'Mapeamento')}
                  </span>
                </p>
                <p className="leading-tight">
                  <span className="text-[10px] font-extrabold uppercase text-stone-400 mr-1.5">ONDE:</span>
                  <span className="font-semibold text-stone-850">
                    {selectedAgent.address?.text || 'Sem Endereço'}
                  </span>
                </p>
                
                {selectedAgent.areasOfActivity && selectedAgent.areasOfActivity.length > 0 ? (
                  <p className="leading-snug">
                    <span className="text-[10px] font-extrabold uppercase text-stone-400 mr-1.5">ÁREAS DE ATUAÇÃO:</span>
                    <span className="font-semibold text-stone-850">
                      ({selectedAgent.areasOfActivity.length}): {selectedAgent.areasOfActivity.join(', ')}
                    </span>
                  </p>
                ) : selectedAgent.areas && selectedAgent.areas.length > 0 ? (
                  <p className="leading-snug">
                    <span className="text-[10px] font-extrabold uppercase text-stone-400 mr-1.5">ÁREAS DE ATUAÇÃO:</span>
                    <span className="font-semibold text-stone-855">
                      ({selectedAgent.areas.length}): {Array.isArray(selectedAgent.areas) ? selectedAgent.areas.join(', ') : selectedAgent.areas}
                    </span>
                  </p>
                ) : null}
              </div>

              {selectedAgent.id !== 'user_location' && (
                <div className="flex justify-end mt-4">
                  <button 
                    onClick={() => {
                      if (onViewProfile) {
                        onViewProfile(selectedAgent);
                      } else {
                        onAgentClick(selectedAgent);
                      }
                    }}
                    className="text-[11px] font-black text-[#0070BA] uppercase flex items-center gap-1 hover:text-[#E30613] transition-all cursor-pointer"
                  >
                    Acessar
                    <ChevronRight size={14} className="text-[#E30613]" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
