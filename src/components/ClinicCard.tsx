import React from 'react';
import { Clinic } from '../types';
import { getDirectionsUrl } from '../utils/distance';
import { MapPin, Navigation, Phone, ExternalLink } from 'lucide-react';

interface ClinicCardProps {
  clinic: Clinic;
  rank: number;
  isSelected?: boolean;
  onViewOnMap: (clinic: Clinic) => void;
}

export const ClinicCard: React.FC<ClinicCardProps> = ({
  clinic,
  rank,
  isSelected = false,
  onViewOnMap,
}) => {
  const directionsUrl = getDirectionsUrl(clinic.lat, clinic.lng, `${clinic.name}, ${clinic.address}`);

  return (
    <article
      className={`group relative rounded-xl border p-4 transition-all duration-200 ${
        isSelected
          ? 'border-emerald-600 bg-emerald-50/40 shadow-sm ring-1 ring-emerald-500/20'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Title & Rank */}
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-slate-900 leading-snug">
            <span className="text-slate-500 font-mono mr-1.5 tabular-nums">{rank}.</span>
            {clinic.name}
          </h3>

          {/* Address */}
          <div className="mt-1.5 flex items-start gap-1.5 text-xs text-slate-600 leading-relaxed">
            <span className="text-slate-400 shrink-0 mt-0.5" aria-hidden="true">📍</span>
            <span className="break-words">{clinic.address}</span>
          </div>

          {/* Distance */}
          {clinic.distanceFormatted && (
            <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-emerald-800">
              <span aria-hidden="true">📏</span>
              <span className="font-mono tabular-nums tracking-tight">
                {clinic.distanceFormatted} away
              </span>
            </div>
          )}

          {/* Unboxed Metadata (Zero-Pill discipline) */}
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
            {clinic.programmes && clinic.programmes.length > 0 && (
              <>
                <span>{clinic.programmes.join(' / ')}</span>
                <span aria-hidden="true" className="text-slate-300">·</span>
              </>
            )}
            {clinic.phone && (
              <a
                href={`tel:${clinic.phone}`}
                className="inline-flex items-center gap-1 text-slate-600 hover:text-emerald-700 transition-colors font-mono"
              >
                <Phone className="h-3 w-3" />
                <span>{clinic.phone}</span>
              </a>
            )}
            {clinic.postalCode && (
              <>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <span className="font-mono text-slate-500">S({clinic.postalCode})</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
        <button
          type="button"
          onClick={() => onViewOnMap(clinic)}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-emerald-600 transition-colors min-h-[40px]"
        >
          <MapPin className="h-3.5 w-3.5 text-emerald-600" />
          <span>View Map</span>
        </button>

        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-emerald-600 shadow-xs transition-colors min-h-[40px]"
        >
          <Navigation className="h-3.5 w-3.5" />
          <span>Directions</span>
          <ExternalLink className="h-3 w-3 opacity-70" />
        </a>
      </div>
    </article>
  );
};
