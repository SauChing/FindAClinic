import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Header } from './components/Header';
import { ClinicCard } from './components/ClinicCard';
import { ClinicMap } from './components/ClinicMap';
import { LocationFallbackModal } from './components/LocationFallbackModal';
import { Clinic, UserCoordinates } from './types';
import { calculateHaversineDistance, formatDistance } from './utils/distance';
import {
  MapPin,
  Search,
  AlertCircle,
  Loader2,
  Navigation,
  Map as MapIcon,
  List as ListIcon,
  CheckCircle2,
  RefreshCw,
  X,
} from 'lucide-react';

export default function App() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [isLoadingClinics, setIsLoadingClinics] = useState(true);
  const [isLocating, setIsLocating] = useState(false);
  const [userLocation, setUserLocation] = useState<UserCoordinates | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isFallbackModalOpen, setIsFallbackModalOpen] = useState(false);
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [distanceFilter, setDistanceFilter] = useState<'all' | '1km' | '3km' | '5km'>('all');
  const [mobileTab, setMobileTab] = useState<'list' | 'map'>('list');

  const listContainerRef = useRef<HTMLDivElement>(null);

  // Load clinic data from server on startup
  useEffect(() => {
    async function loadClinics() {
      setIsLoadingClinics(true);
      try {
        const res = await fetch('/api/clinics');
        if (!res.ok) throw new Error('API request failed');
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
          setClinics(json.data);
        }
      } catch (err) {
        console.error('Failed to load clinics from API:', err);
      } finally {
        setIsLoadingClinics(false);
      }
    }
    loadClinics();
  }, []);

  // Request browser location
  const handleFindClinicsNearMe = () => {
    setIsLocating(true);
    setLocationError(null);

    if (!('geolocation' in navigator)) {
      setIsLocating(false);
      const msg = "We couldn't access your location. Search by postal code instead.";
      setLocationError(msg);
      setIsFallbackModalOpen(true);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const { latitude, longitude, accuracy } = position.coords;
        setUserLocation({
          lat: latitude,
          lng: longitude,
          accuracy,
          label: 'Your Current GPS Location',
        });
        setLocationError(null);
      },
      (error) => {
        setIsLocating(false);
        let errorMsg = "We couldn't access your location. Search by postal code instead.";
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = "We couldn't access your location. Search by postal code instead.";
        }
        setLocationError(errorMsg);
        setIsFallbackModalOpen(true);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  // Process and sort clinics with distances
  const processedClinics = useMemo(() => {
    if (!clinics || clinics.length === 0) return [];

    let list = [...clinics];

    // If user location is known, calculate distances and sort
    if (userLocation) {
      list = list.map((c) => {
        const dist = calculateHaversineDistance(userLocation.lat, userLocation.lng, c.lat, c.lng);
        return {
          ...c,
          distanceMeters: dist,
          distanceFormatted: formatDistance(dist),
        };
      });
      list.sort((a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0));
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.address.toLowerCase().includes(q) ||
          c.postalCode.includes(q) ||
          c.programmes.some((p) => p.toLowerCase().includes(q))
      );
    }

    // Filter by distance cap
    if (userLocation && distanceFilter !== 'all') {
      const maxMeters =
        distanceFilter === '1km' ? 1000 : distanceFilter === '3km' ? 3000 : 5000;
      list = list.filter((c) => (c.distanceMeters ?? 0) <= maxMeters);
    }

    return list;
  }, [clinics, userLocation, searchQuery, distanceFilter]);

  // Handle clicking "View Map" from a clinic card
  const handleViewOnMap = (clinic: Clinic) => {
    setSelectedClinic(clinic);
    setMobileTab('map');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Bar Navigation */}
      <Header
        onLocateMe={handleFindClinicsNearMe}
        onOpenFallback={() => setIsFallbackModalOpen(true)}
        isLocating={isLocating}
      />

      {/* Main Container */}
      <main className="flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 py-6 md:py-8">
        {/* Header Hero Area */}
        <section className="text-center max-w-2xl mx-auto mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-950 text-balance">
            Clinic Finder SG
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-600">
            Find a clinic near you
          </p>

          {/* Primary Action Button */}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleFindClinicsNearMe}
              disabled={isLocating}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 text-base font-semibold text-white shadow-sm hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer min-h-[48px]"
            >
              <Navigation className={`h-4 w-4 ${isLocating ? 'animate-spin' : ''}`} />
              <span>{isLocating ? 'Finding clinics near you...' : '📍 Find Clinics Near Me'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsFallbackModalOpen(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-medium text-slate-700 hover:bg-slate-50 active:scale-[0.98] transition-all cursor-pointer min-h-[48px]"
            >
              <MapPin className="h-4 w-4 text-slate-500" />
              <span>Search by Postal Code / MRT</span>
            </button>
          </div>

          {/* Loading Indicator State */}
          {isLocating && (
            <div className="mt-4 flex items-center justify-center gap-2 text-xs font-medium text-emerald-800 animate-pulse">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Finding clinics near you...</span>
            </div>
          )}

          {/* Location Error State Banner */}
          {locationError && !isFallbackModalOpen && (
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-left flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-900">
                  We couldn't access your location. Search by postal code instead.
                </p>
                <div className="mt-2 flex items-center gap-3">
                  <button
                    onClick={() => setIsFallbackModalOpen(true)}
                    className="text-xs font-semibold text-amber-950 underline hover:no-underline cursor-pointer"
                  >
                    Enter Postal Code or Select MRT →
                  </button>
                </div>
              </div>
              <button
                onClick={() => setLocationError(null)}
                className="text-amber-500 hover:text-amber-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Active Location Indicator */}
          {userLocation && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1 text-xs text-emerald-900">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span className="font-medium">{userLocation.label || 'GPS Location active'}</span>
              <button
                type="button"
                onClick={() => setIsFallbackModalOpen(true)}
                className="ml-1 text-[11px] underline text-emerald-700 hover:text-emerald-950 cursor-pointer"
              >
                Change
              </button>
            </div>
          )}
        </section>

        {/* Content Section: Filter Bar & Layout */}
        <section className="space-y-4">
          {/* Controls Bar: Search & Interactive Filter Tabs */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search clinic name, street, or 6-digit postal code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-200 pl-10 pr-9 py-2 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Interactive Distance Filter Tabs (functional buttons) */}
            {userLocation && (
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0">
                {(
                  [
                    { key: 'all', label: 'All' },
                    { key: '1km', label: '≤ 1 km' },
                    { key: '3km', label: '≤ 3 km' },
                    { key: '5km', label: '≤ 5 km' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setDistanceFilter(tab.key)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                      distanceFilter === tab.key
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}

            {/* Mobile View Switcher (List vs Map) */}
            <div className="flex lg:hidden items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0">
              <button
                type="button"
                onClick={() => setMobileTab('list')}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  mobileTab === 'list'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ListIcon className="h-3.5 w-3.5" />
                <span>List ({processedClinics.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setMobileTab('map')}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  mobileTab === 'map'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <MapIcon className="h-3.5 w-3.5" />
                <span>Map</span>
              </button>
            </div>
          </div>

          {/* Section Heading & Result Count */}
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <h2 className="text-base font-bold text-slate-900">
              {userLocation ? 'Clinics Near You' : 'Registered Singapore Clinics'}
            </h2>
            <div className="flex items-center gap-2">
              <span className="font-mono tabular-nums">{processedClinics.length}</span>
              <span>clinics found</span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span className="text-slate-400">data.gov.sg</span>
            </div>
          </div>

          {/* Dual Column Layout: Left List, Right Map */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Clinic Cards List */}
            <div
              ref={listContainerRef}
              className={`lg:col-span-6 xl:col-span-6 space-y-3 ${
                mobileTab === 'map' ? 'hidden lg:block' : 'block'
              }`}
            >
              {isLoadingClinics && (
                <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-slate-200 bg-white">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mb-3" />
                  <p className="text-sm font-medium text-slate-700">Loading Singapore clinics from data.gov.sg...</p>
                  <p className="text-xs text-slate-400 mt-1">Fetching official MOH registry dataset</p>
                </div>
              )}

              {!isLoadingClinics && processedClinics.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-xl border border-slate-200 bg-white">
                  <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                    <Search className="h-5 w-5" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900">No clinics found</h3>
                  <p className="text-xs text-slate-500 max-w-sm mt-1">
                    Try adjusting your search terms or expanding your distance filter.
                  </p>
                  {(searchQuery || distanceFilter !== 'all') && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setDistanceFilter('all');
                      }}
                      className="mt-4 px-3.5 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
                    >
                      Reset filters
                    </button>
                  )}
                </div>
              )}

              {/* Render sorted clinic cards */}
              {!isLoadingClinics &&
                processedClinics.map((clinic, index) => (
                  <ClinicCard
                    key={clinic.id || `${clinic.name}-${index}`}
                    clinic={clinic}
                    rank={index + 1}
                    isSelected={selectedClinic?.id === clinic.id}
                    onViewOnMap={handleViewOnMap}
                  />
                ))}
            </div>

            {/* Right: Sticky Leaflet Map */}
            <div
              className={`lg:col-span-6 xl:col-span-6 lg:sticky lg:top-20 ${
                mobileTab === 'list' ? 'hidden lg:block' : 'block'
              }`}
            >
              <ClinicMap
                userLocation={userLocation}
                clinics={processedClinics}
                selectedClinic={selectedClinic}
                onSelectClinic={(clinic) => setSelectedClinic(clinic)}
                className="h-[600px] w-full shadow-xs"
              />
            </div>
          </div>
        </section>
      </main>

      {/* Location Fallback Modal */}
      <LocationFallbackModal
        isOpen={isFallbackModalOpen}
        onClose={() => setIsFallbackModalOpen(false)}
        initialError={locationError}
        onSelectLocation={(coords) => {
          setUserLocation(coords);
          setLocationError(null);
        }}
      />

      {/* Quiet Footer */}
      <footer className="mt-16 border-t border-slate-200 bg-white py-6">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            <span>Clinic Finder SG</span>
            <span aria-hidden="true" className="mx-2">·</span>
            <span>Open Government Data provided by Ministry of Health via data.gov.sg</span>
          </div>
          <div>
            <span>No location data is permanently stored</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
