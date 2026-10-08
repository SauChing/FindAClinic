import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Clinic, UserCoordinates } from '../types';
import { getDirectionsUrl } from '../utils/distance';
import { Navigation, MapPin } from 'lucide-react';

interface ClinicMapProps {
  userLocation: UserCoordinates | null;
  clinics: Clinic[];
  selectedClinic: Clinic | null;
  onSelectClinic: (clinic: Clinic) => void;
  className?: string;
}

export const ClinicMap: React.FC<ClinicMapProps> = ({
  userLocation,
  clinics,
  selectedClinic,
  onSelectClinic,
  className = '',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Default center Singapore (lat: 1.3521, lng: 103.8198)
    const initialLat = userLocation?.lat ?? 1.3521;
    const initialLng = userLocation?.lng ?? 103.8198;
    const initialZoom = userLocation ? 14 : 12;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: initialZoom,
      zoomControl: false,
    });

    // Add clean OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    // Zoom control at bottom-right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const markersGroup = L.layerGroup().addTo(map);
    markersGroupRef.current = markersGroup;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update User Location Marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }

    if (userLocation) {
      const userIcon = L.divIcon({
        className: 'custom-user-marker',
        html: `
          <div class="relative flex items-center justify-center w-8 h-8">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-5 w-5 bg-blue-600 border-2 border-white shadow-md flex items-center justify-center">
              <span class="w-1.5 h-1.5 rounded-full bg-white"></span>
            </span>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([userLocation.lat, userLocation.lng], {
        icon: userIcon,
        zIndexOffset: 1000,
      }).addTo(map);

      marker.bindPopup(
        `<div class="p-1 text-slate-800">
          <div class="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-0.5">Your Location</div>
          <div class="text-sm font-medium">${userLocation.label || 'Current GPS Location'}</div>
        </div>`
      );

      userMarkerRef.current = marker;
    }
  }, [userLocation]);

  // Update Clinic Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersGroupRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();

    // Limit visible pins on map to top 40 for optimal performance and clarity
    const displayClinics = clinics.slice(0, 40);

    displayClinics.forEach((clinic, index) => {
      const isSelected = selectedClinic?.id === clinic.id;
      const rank = index + 1;

      const clinicIcon = L.divIcon({
        className: 'custom-clinic-marker',
        html: `
          <div class="cursor-pointer transition-transform duration-150 ${
            isSelected ? 'scale-125 z-50' : 'hover:scale-110'
          }">
            <div class="flex items-center justify-center w-7 h-7 rounded-full shadow-md border-2 ${
              isSelected
                ? 'bg-emerald-600 border-white text-white ring-4 ring-emerald-300'
                : 'bg-white border-emerald-600 text-emerald-700 font-bold'
            }">
              <span class="text-xs font-semibold tabular-nums leading-none">${rank}</span>
            </div>
            <div class="w-1.5 h-1.5 bg-emerald-700 mx-auto rotate-45 -mt-1"></div>
          </div>
        `,
        iconSize: [28, 34],
        iconAnchor: [14, 30],
        popupAnchor: [0, -28],
      });

      const marker = L.marker([clinic.lat, clinic.lng], { icon: clinicIcon }).addTo(markersGroup);

      const directionsUrl = getDirectionsUrl(clinic.lat, clinic.lng, clinic.address);

      const popupContent = `
        <div class="min-w-[200px] p-1 font-sans text-slate-800">
          <div class="text-xs font-medium text-emerald-600 mb-0.5">Clinic #${rank}</div>
          <h4 class="text-sm font-bold leading-tight mb-1">${clinic.name}</h4>
          <p class="text-xs text-slate-600 leading-normal mb-2">${clinic.address}</p>
          ${
            clinic.distanceFormatted
              ? `<div class="text-xs font-semibold text-slate-700 mb-2 font-mono tabular-nums">📏 ${clinic.distanceFormatted} away</div>`
              : ''
          }
          <div class="flex items-center gap-2 pt-1 border-t border-slate-100">
            <a href="${directionsUrl}" target="_blank" rel="noopener noreferrer" 
               class="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-medium no-underline transition-colors">
              <span>Directions</span>
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
            </a>
            ${
              clinic.phone
                ? `<a href="tel:${clinic.phone}" class="px-2 py-1 text-xs text-slate-600 hover:text-slate-900 font-mono underline">Tel: ${clinic.phone}</a>`
                : ''
            }
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);

      marker.on('click', () => {
        onSelectClinic(clinic);
      });

      if (isSelected) {
        marker.openPopup();
      }
    });

    // Fit bounds to include user and nearest clinics if available
    if (userLocation && displayClinics.length > 0) {
      const topBatch = displayClinics.slice(0, 5);
      const points: L.LatLngTuple[] = [
        [userLocation.lat, userLocation.lng],
        ...topBatch.map((c) => [c.lat, c.lng] as L.LatLngTuple),
      ];
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [clinics, userLocation, selectedClinic]);

  // Center on Selected Clinic
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedClinic) return;

    map.flyTo([selectedClinic.lat, selectedClinic.lng], 16, {
      duration: 0.8,
    });
  }, [selectedClinic]);

  const handleCenterOnUser = () => {
    const map = mapInstanceRef.current;
    if (!map || !userLocation) return;
    map.flyTo([userLocation.lat, userLocation.lng], 15, { duration: 0.8 });
  };

  return (
    <div className={`relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50 ${className}`}>
      <div ref={mapContainerRef} className="h-full w-full min-h-[300px]" />

      {/* Recenter Button */}
      {userLocation && (
        <button
          onClick={handleCenterOnUser}
          className="absolute top-3 right-3 z-[400] flex items-center gap-1.5 rounded-lg bg-white/95 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-md backdrop-blur border border-slate-200 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          title="Center on my location"
        >
          <Navigation className="h-3.5 w-3.5 text-blue-600" />
          <span>My Location</span>
        </button>
      )}

      {/* Legend Badge */}
      <div className="absolute bottom-3 left-3 z-[400] flex items-center gap-3 rounded-lg bg-white/90 px-3 py-1.5 text-[11px] text-slate-600 shadow-sm backdrop-blur border border-slate-200/80">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-600 border border-white shadow-xs"></span>
          <span>You</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-600 border border-white shadow-xs"></span>
          <span>CHAS Clinic</span>
        </div>
      </div>
    </div>
  );
};
