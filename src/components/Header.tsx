import React from 'react';
import { MapPin, Navigation } from 'lucide-react';

interface HeaderProps {
  onLocateMe: () => void;
  onOpenFallback: () => void;
  isLocating?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onLocateMe,
  onOpenFallback,
  isLocating = false,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="/"
          className="text-lg font-bold tracking-tight text-slate-900 hover:text-emerald-800 transition-colors shrink-0"
        >
          Clinic Finder SG
        </a>

        {/* Zone 2: Navigation links */}
        <nav className="hidden sm:flex items-center gap-6 text-xs font-medium text-slate-600">
          <button
            type="button"
            onClick={onLocateMe}
            className="hover:text-slate-900 transition-colors cursor-pointer"
          >
            Nearby
          </button>
          <button
            type="button"
            onClick={onOpenFallback}
            className="hover:text-slate-900 transition-colors cursor-pointer"
          >
            Areas
          </button>
          <a
            href="https://data.gov.sg/datasets/d_548c33ea2d99e29ec63a7cc9edcccedc/view"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-slate-900 transition-colors"
          >
            data.gov.sg
          </a>
        </nav>

        {/* Zone 3: 1-2 primary actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenFallback}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <MapPin className="h-3.5 w-3.5 text-slate-500" />
            <span>Search Area</span>
          </button>

          <button
            type="button"
            onClick={onLocateMe}
            disabled={isLocating}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors whitespace-nowrap shadow-xs"
          >
            <Navigation className={`h-3.5 w-3.5 ${isLocating ? 'animate-spin' : ''}`} />
            <span>{isLocating ? 'Locating...' : 'Locate Me'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
