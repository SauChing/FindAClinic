import React, { useState } from 'react';
import { SINGAPORE_MRT_STATIONS, SINGAPORE_NEIGHBOURHOODS, resolvePostalCode } from '../data/singapore_locations';
import { UserCoordinates } from '../types';
import { Search, Train, Building, MapPin, X, AlertCircle } from 'lucide-react';

interface LocationFallbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLocation: (coords: UserCoordinates) => void;
  initialError?: string | null;
}

export const LocationFallbackModal: React.FC<LocationFallbackModalProps> = ({
  isOpen,
  onClose,
  onSelectLocation,
  initialError,
}) => {
  const [activeTab, setActiveTab] = useState<'postal' | 'mrt' | 'neighbourhood'>('postal');
  
  // Postal code state
  const [postalInput, setPostalInput] = useState('');
  const [postalError, setPostalError] = useState<string | null>(null);
  const [isPostalLoading, setIsPostalLoading] = useState(false);

  // MRT state
  const [mrtSearch, setMrtSearch] = useState('');

  // Neighbourhood state
  const [areaSearch, setAreaSearch] = useState('');

  if (!isOpen) return null;

  // Handle Postal Code lookup
  const handlePostalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPostalError(null);
    const clean = postalInput.replace(/\D/g, '').trim();

    if (clean.length !== 6) {
      setPostalError('Please enter a valid 6-digit Singapore postal code');
      return;
    }

    setIsPostalLoading(true);

    try {
      // 1. Try server geocode
      const res = await fetch(`/api/geocode?postal=${clean}`);
      if (res.ok) {
        const json = await res.json();
        if (json.lat && json.lng) {
          onSelectLocation({
            lat: json.lat,
            lng: json.lng,
            label: `Postal Code ${clean} (${json.address || 'Singapore'})`,
          });
          onClose();
          return;
        }
      }
    } catch {
      // Ignore network error and proceed to local fallback
    } finally {
      setIsPostalLoading(false);
    }

    // 2. Check sector map fallback
    const sectorCoord = resolvePostalCode(clean);
    if (sectorCoord) {
      onSelectLocation({
        lat: sectorCoord.lat,
        lng: sectorCoord.lng,
        label: `Postal ${clean} · ${sectorCoord.area}`,
      });
      onClose();
    } else {
      setPostalError('Postal code not found. Please try another code or select an MRT / neighbourhood.');
    }
  };

  // Filtered MRT stations
  const filteredMrt = SINGAPORE_MRT_STATIONS.filter((s) =>
    s.name.toLowerCase().includes(mrtSearch.toLowerCase()) ||
    s.line.toLowerCase().includes(mrtSearch.toLowerCase())
  );

  // Filtered Neighbourhoods
  const filteredAreas = SINGAPORE_NEIGHBOURHOODS.filter((a) =>
    a.name.toLowerCase().includes(areaSearch.toLowerCase()) ||
    a.region.toLowerCase().includes(areaSearch.toLowerCase())
  );

  // Popular MRT presets
  const popularMrts = ['Orchard', 'Jurong East', 'Tampines', 'Bishan', 'Woodlands', 'Bugis'];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-start justify-between">
          <div>
            <h2 id="modal-title" className="text-lg font-bold text-slate-900">Choose a Location</h2>
            <p className="text-xs text-slate-500 mt-1">
              Select your area to find the closest Singapore clinics
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Permission Denied Notice if applicable */}
        {initialError && (
          <div className="mx-5 mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200/80 flex items-start gap-2.5 text-amber-900 text-xs">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">We couldn't access your location.</p>
              <p className="text-amber-800 mt-0.5">Search by postal code, MRT station, or neighbourhood instead.</p>
            </div>
          </div>
        )}

        {/* Tab Selection */}
        <div className="px-5 pt-4">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl" role="tablist">
            <button
              role="tab"
              aria-selected={activeTab === 'postal'}
              onClick={() => setActiveTab('postal')}
              className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === 'postal'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MapPin className="h-3.5 w-3.5" />
              <span>Postal Code</span>
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'mrt'}
              onClick={() => setActiveTab('mrt')}
              className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === 'mrt'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Train className="h-3.5 w-3.5" />
              <span>MRT Station</span>
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'neighbourhood'}
              onClick={() => setActiveTab('neighbourhood')}
              className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === 'neighbourhood'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building className="h-3.5 w-3.5" />
              <span>Neighbourhood</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-5 overflow-y-auto flex-1">
          {/* TAB 1: Postal Code */}
          {activeTab === 'postal' && (
            <div className="space-y-4">
              <form onSubmit={handlePostalSubmit} className="space-y-3">
                <div>
                  <label htmlFor="postal-input" className="block text-xs font-medium text-slate-700 mb-1.5">
                    Singapore 6-Digit Postal Code
                  </label>
                  <div className="relative">
                    <input
                      id="postal-input"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      placeholder="e.g. 529510, 629117, 238858"
                      value={postalInput}
                      onChange={(e) => setPostalInput(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-mono placeholder:font-sans placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                      autoFocus
                    />
                  </div>
                </div>

                {postalError && (
                  <p className="text-xs text-red-600 leading-normal">{postalError}</p>
                )}

                <button
                  type="submit"
                  disabled={isPostalLoading || postalInput.length < 2}
                  className="w-full h-11 rounded-xl bg-emerald-600 text-white font-medium text-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {isPostalLoading ? (
                    <span>Looking up postal code...</span>
                  ) : (
                    <>
                      <Search className="h-4 w-4" />
                      <span>Find Clinics Near Postal Code</span>
                    </>
                  )}
                </button>
              </form>

              {/* Postal quick samples */}
              <div className="pt-3 border-t border-slate-100">
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-2">
                  Sample Singapore Postal Codes
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { code: '629117', label: 'Joo Koon / FairPrice' },
                    { code: '550253', label: 'Serangoon Central' },
                    { code: '238858', label: 'Orchard / Somerset' },
                    { code: '529510', label: 'Tampines' },
                    { code: '730900', label: 'Woodlands Civic' },
                  ].map((p) => (
                    <button
                      key={p.code}
                      type="button"
                      onClick={() => setPostalInput(p.code)}
                      className="px-2.5 py-1 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      {p.code} <span className="text-slate-400 font-sans">({p.label})</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MRT Station */}
          {activeTab === 'mrt' && (
            <div className="space-y-4">
              <div>
                <div className="relative">
                  <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search MRT station (e.g. Jurong East, Orchard)..."
                    value={mrtSearch}
                    onChange={(e) => setMrtSearch(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 pl-10 pr-3.5 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                  />
                </div>
              </div>

              {/* Popular quick picks */}
              {!mrtSearch && (
                <div>
                  <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-2">
                    Popular Stations
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {popularMrts.map((mrtName) => {
                      const station = SINGAPORE_MRT_STATIONS.find((s) => s.name === mrtName);
                      if (!station) return null;
                      return (
                        <button
                          key={mrtName}
                          onClick={() => {
                            onSelectLocation({
                              lat: station.lat,
                              lng: station.lng,
                              label: `${station.name} MRT`,
                            });
                            onClose();
                          }}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white hover:border-emerald-500 hover:bg-emerald-50/50 hover:text-emerald-900 transition-colors"
                        >
                          {station.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Full Station List */}
              <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
                {filteredMrt.map((st) => (
                  <button
                    key={st.name}
                    onClick={() => {
                      onSelectLocation({
                        lat: st.lat,
                        lng: st.lng,
                        label: `${st.name} MRT`,
                      });
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-lg text-left hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200"
                  >
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{st.name}</div>
                      <div className="text-xs text-slate-500">{st.line}</div>
                    </div>
                    <span className="text-xs text-emerald-600 font-medium">Select</span>
                  </button>
                ))}
                {filteredMrt.length === 0 && (
                  <div className="text-center py-6 text-xs text-slate-500">
                    No MRT station matching "{mrtSearch}"
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Neighbourhood */}
          {activeTab === 'neighbourhood' && (
            <div className="space-y-4">
              <div>
                <div className="relative">
                  <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search neighbourhood (e.g. Bedok, Tampines, Yishun)..."
                    value={areaSearch}
                    onChange={(e) => setAreaSearch(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 pl-10 pr-3.5 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                  />
                </div>
              </div>

              {/* Area List */}
              <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
                {filteredAreas.map((area) => (
                  <button
                    key={area.name}
                    onClick={() => {
                      onSelectLocation({
                        lat: area.lat,
                        lng: area.lng,
                        label: area.name,
                      });
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-lg text-left hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200"
                  >
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{area.name}</div>
                      <div className="text-xs text-slate-500">{area.region}</div>
                    </div>
                    <span className="text-xs text-emerald-600 font-medium">Select</span>
                  </button>
                ))}
                {filteredAreas.length === 0 && (
                  <div className="text-center py-6 text-xs text-slate-500">
                    No neighbourhood matching "{areaSearch}"
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
