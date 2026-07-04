// app/page.tsx - Homepage
// Displays a Figma-inspired landing view for non-logged users while preserving the existing case browsing and auth flow.

'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import 'leaflet/dist/leaflet.css';
import api, { API_BASE_URL } from '../lib/api';
import { PLACEHOLDER_CASE_IMAGE } from '../lib/placeholder-image';
import AppLogo from '../components/app-logo';
import SaveCollectionModal from '../components/save-collection-modal';
import CaseDetailsModal from '../components/case-details-modal';
import EditCaseModal from '../components/edit-case-modal';
import UploadCaseModal from '../components/upload-case-modal';

type CaseLocation = string | { display_name: string } | undefined;

interface Case {
  id: number;
  type: string;
  name: string;
  description: string;
  image_path?: string;
  link?: string;
  location?: CaseLocation;
  user_id?: number;
  keywords: { name: string }[];
  agents: { name: string }[];
  organizations: { name: string }[];
}

interface Collection {
  id: number;
  name: string;
  cases: Pick<Case, 'id'>[];
}

const figmaImages = [
  'http://localhost:3845/assets/14738f84b6f9feb87119b05b4afc56c1a916fe7c.png',
  'http://localhost:3845/assets/24a141d3ef12ce662be7707979627c2146a2cc53.png',
  'http://localhost:3845/assets/f3b6e28aa7093b99b5383ade9ff560dc093928e4.png',
  'http://localhost:3845/assets/cbc76e8632c982cc85cd88dae14bad18af12851c.png',
  'http://localhost:3845/assets/73a244f717f19f5286639777686fedc42ff9ea26.png',
  'http://localhost:3845/assets/8e6f12baef5bbbdbc536cfdf51faa634abded83d.png',
  'http://localhost:3845/assets/105a69deff81c41e610fb74a0da1e530f2d7b0eb.png',
  'http://localhost:3845/assets/cef4921f4d824528a0ee6a19d97bd9524d39aa2a.png',
  'http://localhost:3845/assets/ec72aa69db82baec4d6e85439e284d2b5861686f.png',
];

const STADIA_MAPS_API_KEY = '516dfcdc-5917-4e49-a7b2-b840e0c51e19';

function SearchIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <circle cx="11" cy="11" r="5.5" />
      <path d="m15 15 4 4" />
    </svg>
  );
}

function UserIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 19a7 7 0 0 1 14 0" />
    </svg>
  );
}

function StarIcon({ className = '', filled = false }: { className?: string; filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path d="m12 3 2.6 5.3 5.8.8-4.4 4.3 1.1 5.7L12 16.8 6.9 19.1l1.1-5.7-4.4-4.3 5.8-.8L12 3Z" />
    </svg>
  );
}

function AddCaseStudyButton() {
  return (
    <div className="relative h-[99px] w-[98px] rounded-full bg-[#ffb885]">
      <div className="absolute left-1/2 top-[calc(50%+4.5px)] h-0 w-[68px] -translate-x-1/2 -translate-y-1/2">
        <div className="absolute inset-[-8px_0_0_0]">
          <div className="block h-full w-full max-w-none bg-current" />
        </div>
      </div>
      <div className="absolute left-[calc(50%-4px)] top-[calc(50%+0.5px)] flex h-[68px] w-0 -translate-x-1/2 -translate-y-1/2 items-center justify-center">
        <div className="flex-none rotate-90">
          <div className="relative h-0 w-[68px]">
            <div className="absolute inset-[-8px_0_0_0]">
              <div className="block h-full w-full max-w-none bg-current" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [cases, setCases] = useState<Case[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [savedCollectionId, setSavedCollectionId] = useState<number | null>(null);
  const [savedCaseIds, setSavedCaseIds] = useState<number[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('username');
  const [currentUserId, setCurrentUserId] = useState<number>(0);
  const [search, setSearch] = useState('');
  const [showSaveCollectionModal, setShowSaveCollectionModal] = useState(false);
  const [showCaseDetailsModal, setShowCaseDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);

  const fetchCases = async () => {
    try {
      const response = await api.get('/cases');
      setCases(response.data);
    } catch (error) {
      console.error('Error fetching cases:', error);
    }
  };

  const handleUploadComplete = async () => {
    await fetchCases();
    const token = localStorage.getItem('token');
    if (token) {
      await fetchCollections();
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const loggedIn = !!token;
    const storedEmail = localStorage.getItem('user_email') || '';
    setIsLoggedIn(loggedIn);
    setUsername(storedEmail ? storedEmail.split('@')[0] : 'username');

    fetchCases();

    const uid = Number(localStorage.getItem('user_id') || '0');
    setCurrentUserId(uid);

    if (loggedIn) {
      fetchCollections();
    }
  }, []);

  const fetchCollections = async () => {
    try {
      const response = await api.get<Collection[]>('/collections');
      setCollections(response.data);

      const allSavedCaseIds = new Set<number>();
      response.data.forEach((collection) => {
        collection.cases.forEach((caseItem) => {
          allSavedCaseIds.add(caseItem.id);
        });
      });
      setSavedCaseIds(Array.from(allSavedCaseIds));

      const saved = response.data.find((collection) => collection.name.toLowerCase() === 'saved');
      if (saved) {
        setSavedCollectionId(saved.id);
      }
    } catch (err) {
      console.error('Error fetching collections:', err);
    }
  };

  const handleSaveCase = async (caseId: number) => {
    setSelectedCaseId(caseId);
    setShowSaveCollectionModal(true);
  };

  const handleLabelClick = (value: string) => {
    setSearch(value);
  };

  const handleRemoveFromCollection = async (collectionId: number) => {
    if (!selectedCaseId) return;

    try {
      await api.delete(`/collections/${collectionId}/cases/${selectedCaseId}`);
      let stillSaved = true;
      setCollections((prev) => {
        const updated = prev.map((c) => ({
          ...c,
          cases: c.id === collectionId ? c.cases.filter((caseItem) => caseItem.id !== selectedCaseId) : c.cases,
        }));
        stillSaved = updated.some((c) => c.cases.some((caseItem) => caseItem.id === selectedCaseId));
        return updated;
      });

      if (!stillSaved) {
        setSavedCaseIds((prev) => prev.filter((id) => id !== selectedCaseId));
      }
    } catch (err) {
      console.error('Error removing case from collection:', err);
    }
  };

  const handleAddToCollection = async (collectionId: number) => {
    if (!selectedCaseId) return;

    try {
      await api.post(`/collections/${collectionId}/cases/${selectedCaseId}`);
      setCollections((prev) =>
        prev.map((c) =>
          c.id === collectionId ? { ...c, cases: [...c.cases, { id: selectedCaseId }] } : c,
        ),
      );
      setSavedCaseIds((prev) => (prev.includes(selectedCaseId) ? prev : [...prev, selectedCaseId]));
    } catch (err) {
      console.error('Error adding case to collection:', err);
    }
  };

  const filteredCases = cases.filter((caseItem) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const inName = caseItem.name?.toLowerCase().includes(q);
    const inKeywords = caseItem.keywords?.some((k) => k.name.toLowerCase().includes(q));
    const inOrgs = caseItem.organizations?.some((o) => o.name.toLowerCase().includes(q));
    const inAgents = caseItem.agents?.some((a) => a.name.toLowerCase().includes(q));
    const loc = caseItem.location;
    let inLocation = false;
    if (loc) {
      if (typeof loc === 'string') inLocation = loc.toLowerCase().includes(q);
      else if ((loc as any).display_name) inLocation = (loc as any).display_name.toLowerCase().includes(q);
    }
    return Boolean(inName || inKeywords || inOrgs || inAgents || inLocation);
  });

  const getCaseImage = (caseItem: Case, index: number) => {
    if (caseItem.image_path) {
      return `${API_BASE_URL}/uploads/${encodeURIComponent(caseItem.image_path)}`;
    }
    return figmaImages[index % figmaImages.length];
  };

  const getTypeBadgeClasses = (type: string) => {
    if (type === 'organization') {
      return 'bg-[#2cffb2] text-black';
    }
    return 'bg-[#adbdff] text-black';
  };

  const extractCaseCoordinates = (location: CaseLocation) => {
    if (!location || typeof location !== 'object') return null;

    const maybeLat = (location as any).lat;
    const maybeLon = (location as any).lon;
    const lat = typeof maybeLat === 'string' ? Number(maybeLat) : maybeLat;
    const lon = typeof maybeLon === 'string' ? Number(maybeLon) : maybeLon;

    if (typeof lat !== 'number' || typeof lon !== 'number' || Number.isNaN(lat) || Number.isNaN(lon)) {
      return null;
    }

    return { lat, lon };
  };

  useEffect(() => {
    if (!showMapModal) {
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
      return;
    }

    if (!mapContainerRef.current) return;

    let isMounted = true;

    const initializeMap = async () => {
      const L = (await import('leaflet')).default;
      if (!isMounted || !mapContainerRef.current) return;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }

      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        scrollWheelZoom: true,
      }).setView([46.5, 11.3], 3);

      L.tileLayer(`https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png?api_key=${STADIA_MAPS_API_KEY}`, {
        maxZoom: 20,
        attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      const pins = cases
        .map((caseItem) => ({
          caseItem,
          ...extractCaseCoordinates(caseItem.location),
        }))
        .filter((item): item is { caseItem: Case; lat: number; lon: number } => Boolean(item && typeof item.lat === 'number' && typeof item.lon === 'number'));

      const groupedPins = pins.reduce<Record<string, { lat: number; lon: number; cases: Case[] }>>((acc, pin) => {
        const key = `${pin.lat.toFixed(6)}:${pin.lon.toFixed(6)}`;
        if (!acc[key]) {
          acc[key] = { lat: pin.lat, lon: pin.lon, cases: [] };
        }
        acc[key].cases.push(pin.caseItem);
        return acc;
      }, {});

      const groupedPinEntries = Object.values(groupedPins);

      if (groupedPinEntries.length > 0) {
        const bounds = L.latLngBounds(groupedPinEntries.map((pin) => [pin.lat, pin.lon] as [number, number]));
        map.fitBounds(bounds.pad(0.2));

        groupedPinEntries.forEach((pinGroup) => {
          const marker = L.marker([pinGroup.lat, pinGroup.lon], {
            icon: L.divIcon({
              html: '<div style="width:14px;height:14px;border-radius:9999px;background:#ffb885;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.25);"></div>',
              className: 'bg-transparent border-none',
              iconSize: [14, 14],
              iconAnchor: [7, 7],
            }),
          }).addTo(map);

          const popupHtml = `
            <div style="min-width:220px;max-width:260px;font-family:inherit;">
              <div style="font-weight:700;margin-bottom:8px;color:#111;">${pinGroup.cases.length > 1 ? 'Study cases at this location' : 'Study case at this location'}</div>
              <div style="display:flex;flex-direction:column;gap:6px;">
                ${pinGroup.cases
                  .map(
                    (caseItem) => `
                      <button
                        type="button"
                        data-case-id="${caseItem.id}"
                        style="text-align:left;padding:8px 10px;border:1px solid #e5e7eb;border-radius:10px;background:#fff;cursor:pointer;color:#111;"
                      >
                        <div style="font-size:13px;font-weight:600;">${caseItem.name}</div>
                        <div style="font-size:11px;color:#6b7280;">${caseItem.type}</div>
                      </button>
                    `,
                  )
                  .join('')}
              </div>
            </div>
          `;

          marker.bindPopup(popupHtml, {
            autoPan: false,
            closeButton: false,
          });

          marker.on('mouseover', () => {
            marker.openPopup();
          });

          marker.on('mouseout', () => {
            window.setTimeout(() => {
              if (!marker.getPopup()?.isOpen()) {
                return;
              }
              const popupElement = marker.getPopup()?.getElement();
              if (popupElement?.matches(':hover')) {
                return;
              }
              marker.closePopup();
            }, 180);
          });

          marker.on('click', () => {
            if (pinGroup.cases.length === 1) {
              setSelectedCaseId(pinGroup.cases[0].id);
              setShowCaseDetailsModal(true);
              return;
            }
            marker.openPopup();
          });

          marker.on('popupopen', () => {
            const popupElement = marker.getPopup()?.getElement();
            if (!popupElement) return;

            popupElement.addEventListener('mouseenter', () => {
              popupElement.dataset.hovering = 'true';
            });
            popupElement.addEventListener('mouseleave', () => {
              popupElement.dataset.hovering = 'false';
              marker.closePopup();
            });

            const buttons = popupElement.querySelectorAll<HTMLButtonElement>('[data-case-id]');
            buttons.forEach((button) => {
              button.addEventListener('click', () => {
                const caseId = Number(button.getAttribute('data-case-id'));
                if (Number.isNaN(caseId)) return;
                setSelectedCaseId(caseId);
                setShowCaseDetailsModal(true);
                marker.closePopup();
              });
            });
          });
        });
      }

      mapInstanceRef.current = map;
    };

    initializeMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [showMapModal, cases]);

  return (
    <div className="min-h-screen bg-white text-black">
      <header className="sticky top-0 z-20 bg-black px-4 py-4 sm:px-8 lg:px-20">
        <div className="mx-auto flex max-w-7xl flex-row items-center gap-2 sm:gap-4 lg:gap-6">
          <AppLogo />

          <label className="flex min-h-[45px] min-w-0 flex-1 items-center justify-between rounded-full border border-white/70 px-3 py-2 sm:px-4 lg:mx-auto lg:max-w-[660px]">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="search"
              className="w-full min-w-0 bg-transparent text-[18px] text-white placeholder:text-white/50 focus:outline-none"
            />
            <SearchIcon className="ml-2 h-6 w-6 shrink-0 text-white sm:ml-3 sm:h-8 sm:w-8" />
          </label>

          <div className="flex shrink-0 flex-row items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setShowMapModal(true)}
              className="flex items-center justify-center rounded-full border border-white/70 px-3 py-2 text-[14px] font-medium text-white transition hover:bg-white/10 sm:px-4 sm:text-[16px]"
            >
              Map
            </button>

            {isLoggedIn ? (
              <Link
                href="/collections"
                aria-label="My profile"
                className="flex items-center justify-center rounded-full border border-white/70 px-3 py-2 sm:px-4"
              >
                <span className="text-[16px] font-light text-white sm:text-[18px]">{username}</span>
              </Link>
            ) : (
              <Link
                href="/signin"
                aria-label="My profile"
                className="flex h-[45px] w-[45px] shrink-0 items-center justify-center rounded-full border border-white/70 sm:h-[54px] sm:w-[54px]"
              >
                <UserIcon className="h-6 w-6 text-white sm:h-8 sm:w-8" />
              </Link>
            )}
          </div>
        </div>
      </header>

      {showMapModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 px-4 py-6"
          onClick={() => setShowMapModal(false)}
        >
          <div
            className="w-full max-w-5xl rounded-[24px] bg-white p-4 shadow-2xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-[20px] font-semibold text-black">Case-study locations</h3>
                <p className="text-sm text-gray-600">Pins show the places linked to the available case studies.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowMapModal(false)}
                className="rounded-full border border-gray-300 px-3 py-1 text-sm text-gray-700 transition hover:bg-gray-100"
              >
                Close
              </button>
            </div>
            <div ref={mapContainerRef} className="h-[420px] w-full overflow-hidden rounded-[16px] border border-gray-200" />
          </div>
        </div>
      )}

      <main className="mx-auto flex max-w-[1600px] flex-col px-4 py-8 sm:px-6 lg:px-10">
        <div className="mb-8 text-center">
          <h2 className="text-[22px] font-semibold text-black sm:text-[25px]">
            A living archive of eco-social design
          </h2>
        </div>

        {search && (
          <div className="mb-6 flex flex-wrap items-center gap-2 text-sm text-gray-700">
            <span>Filtering by:</span>
            <span className="inline-flex items-center rounded-full bg-[#e5e5e5] px-3 py-1 text-black">
              {search}
            </span>
            <button onClick={() => setSearch('')} className="text-black underline-offset-2 hover:underline">
              Clear
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {filteredCases.map((caseItem, index) => (
            <div key={caseItem.id} className="relative overflow-hidden rounded-[20px] border border-[rgba(179,179,179,0.48)] bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg">
              <div
                className="cursor-pointer"
                onClick={() => {
                  setSelectedCaseId(caseItem.id);
                  setShowCaseDetailsModal(true);
                }}
              >
                <div className="relative h-[196px]">
                  <img
                    src={getCaseImage(caseItem, index)}
                    alt={caseItem.name}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (target.src !== PLACEHOLDER_CASE_IMAGE) {
                        target.onerror = null;
                        target.src = PLACEHOLDER_CASE_IMAGE;
                      }
                    }}
                  />
                  <span className={`absolute right-4 top-[196px] z-10 -translate-y-1/2 rounded-full px-3 py-1 text-[12px] font-medium ${getTypeBadgeClasses(caseItem.type)}`}>
                    {caseItem.type.toUpperCase()}
                  </span>
                </div>

                <div className="flex flex-col gap-3 px-[22px] py-[20px]">
                  <h3 className="text-[18px] font-semibold text-black">{caseItem.name}</h3>

                  <div className="flex flex-wrap gap-2">
                    {caseItem.keywords.slice(0, 4).map((keyword) => (
                      <button
                        key={keyword.name}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLabelClick(keyword.name);
                        }}
                        className="rounded-full bg-[#e5e5e5] px-3 py-1 text-[12px] text-black transition hover:bg-[#d9d9d9]"
                      >
                        {keyword.name}
                      </button>
                    ))}
                  </div>

                  {caseItem.type !== 'organization' && (
                    <p className="text-[12px] text-black/80">
                      {caseItem.organizations?.[0]?.name || 'Name of the organisation'}
                    </p>
                  )}
                </div>
              </div>

              {isLoggedIn && (
                <>
                  {currentUserId > 0 && caseItem.user_id === currentUserId && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCaseId(caseItem.id);
                        setShowEditModal(true);
                      }}
                      className="absolute left-4 top-4 z-10 rounded-full bg-[#ffb885] px-3 py-1 text-[12px] font-medium text-black shadow-sm transition hover:bg-[#f2a15e]"
                    >
                      edit
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSaveCase(caseItem.id);
                    }}
                    className={`absolute bottom-4 right-4 flex h-[26px] w-[26px] items-center justify-center rounded-[13px] border border-[#ffb885] transition ${savedCaseIds.includes(caseItem.id) ? 'bg-[#ffb885] text-white' : 'bg-white text-[#ffb885] hover:bg-[#fff3e6]'}`}
                    aria-label={savedCaseIds.includes(caseItem.id) ? 'Saved' : 'Save to Gallery'}
                  >
                    <StarIcon className="h-[12px] w-[12px]" filled={savedCaseIds.includes(caseItem.id)} />
                  </button>
                </>
              )}
            </div>
          ))}

        </div>
      </main>

      {isLoggedIn && (
        <button
          type="button"
          onClick={() => setShowUploadModal(true)}
          className="fixed bottom-6 right-6 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-[#ffb885] text-black shadow-lg shadow-orange-200/70 transition hover:bg-[#f2a15e] focus:outline-none focus:ring-2 focus:ring-[#ffb885]"
          aria-label="Upload a Case"
        >
          <span className="text-3xl leading-none text-white">+</span>
          <span className="sr-only">Upload a Case</span>
        </button>
      )}

      <UploadCaseModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUploaded={handleUploadComplete}
      />

      <SaveCollectionModal
        isOpen={showSaveCollectionModal}
        caseId={selectedCaseId || 0}
        collections={collections}
        onClose={() => setShowSaveCollectionModal(false)}
        onAddToCollection={handleAddToCollection}
        onRemoveFromCollection={handleRemoveFromCollection}
        onCollectionsChange={setCollections}
      />

      <CaseDetailsModal
        isOpen={showCaseDetailsModal}
        caseId={selectedCaseId}
        onClose={() => setShowCaseDetailsModal(false)}
        currentUserId={currentUserId}
        onEditClick={(caseId) => {
          setShowCaseDetailsModal(false);
          setSelectedCaseId(caseId);
          setShowEditModal(true);
        }}
        onManageSavedCase={(caseId) => {
          setSelectedCaseId(caseId);
          setShowSaveCollectionModal(true);
        }}
        isSaved={selectedCaseId !== null && savedCaseIds.includes(selectedCaseId)}
        onLabelClick={(value) => {
          setSearch(value);
          setShowCaseDetailsModal(false);
        }}
        onProjectClick={(caseId) => {
          setSelectedCaseId(caseId);
          setShowCaseDetailsModal(true);
        }}
        onOrganizationClick={(organizationName) => {
          const organizationCase = cases.find(
            (caseItem) =>
              caseItem.type === 'organization' &&
              caseItem.name.trim().toLowerCase() === organizationName.trim().toLowerCase(),
          );

          if (organizationCase) {
            setSelectedCaseId(organizationCase.id);
            setShowCaseDetailsModal(true);
          } else {
            setSearch(organizationName);
            setShowCaseDetailsModal(false);
          }
        }}
      />

      <EditCaseModal
        isOpen={showEditModal}
        caseId={selectedCaseId}
        onClose={() => setShowEditModal(false)}
      />
    </div>
  );
}
