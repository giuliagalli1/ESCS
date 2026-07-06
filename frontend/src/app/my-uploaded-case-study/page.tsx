'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api, { API_BASE_URL } from '../../lib/api';
import { PLACEHOLDER_CASE_IMAGE } from '../../lib/placeholder-image';
import Link from 'next/link';
import AppLogo from '../../components/app-logo';
import EditCaseModal from '../../components/edit-case-modal';
import CaseDetailsModal from '../../components/case-details-modal';
import SaveCollectionModal from '../../components/save-collection-modal';
import { useLockBodyScroll } from '../../lib/use-lock-body-scroll';

function SearchIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <circle cx="11" cy="11" r="5.5" />
      <path d="m15 15 4 4" />
    </svg>
  );
}

function ArrowLeftIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
      <path d="M19 12H5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m11 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface CaseLocation {
  display_name?: string;
}

interface Case {
  id: number;
  type: string;
  name: string;
  description: string;
  image_path?: string;
  link?: string;
  location?: string | CaseLocation;
  user_id?: number;
  is_unibz_course?: boolean;
  keywords: { name: string }[];
  agents: { name: string }[];
  organizations: { name: string }[];
}

function getTypeBadgeClasses(type: string) {
  return type === 'organization' ? 'bg-[#2cffb2] text-black' : 'bg-[#adbdff] text-black';
}

function StarIcon({ className = '', filled = false }: { className?: string; filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path d="m12 3 2.6 5.3 5.8.8-4.4 4.3 1.1 5.7L12 16.8 6.9 19.1l1.1-5.7-4.4-4.3 5.8-.8L12 3Z" />
    </svg>
  );
}

interface Collection {
  id: number;
  name: string;
  cases: Pick<Case, 'id'>[];
}

export default function MyUploadedCaseStudyPage() {
  const router = useRouter();
  const [cases, setCases] = useState<Case[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<number>(0);
  const [showPreferencesMenu, setShowPreferencesMenu] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);

  useLockBodyScroll(showChangePasswordModal || showDeleteAccountModal);

  const [collections, setCollections] = useState<Collection[]>([]);
  const [savedCaseIds, setSavedCaseIds] = useState<number[]>([]);
  const [showSaveCollectionModal, setShowSaveCollectionModal] = useState(false);
  const [showCaseDetailsModal, setShowCaseDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null);
  const [passwordCurrent, setPasswordCurrent] = useState('');
  const [passwordNew, setPasswordNew] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [modalError, setModalError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const uid = Number(localStorage.getItem('user_id') || '0');
    setCurrentUserId(uid);

    if (!token) {
      router.push('/signin');
      return;
    }

    fetchCases();
    fetchCollections();
  }, [router]);

  const fetchCases = async () => {
    try {
      const response = await api.get<Case[]>('/cases');
      setCases(response.data);
    } catch (error) {
      console.error('Error fetching uploaded cases:', error);
    } finally {
      setIsLoading(false);
    }
  };

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
    } catch (error) {
      console.error('Error fetching collections:', error);
    }
  };

  const handleSaveCase = (caseId: number) => {
    setSelectedCaseId(caseId);
    setShowSaveCollectionModal(true);
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
    } catch (error) {
      console.error('Error adding case to collection:', error);
    }
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
    } catch (error) {
      console.error('Error removing case from collection:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_email');
    router.push('/');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordCurrent || !passwordNew || !passwordConfirm) {
      setModalError('All password fields are required');
      return;
    }

    if (passwordNew !== passwordConfirm) {
      setModalError('New password and confirmation do not match');
      return;
    }

    setIsChangingPassword(true);
    setModalError('');

    try {
      await api.put('/user/change-password', {
        old_password: passwordCurrent,
        new_password: passwordNew,
      });
      setShowChangePasswordModal(false);
      setPasswordCurrent('');
      setPasswordNew('');
      setPasswordConfirm('');
    } catch (err: any) {
      setModalError(err.response?.data?.detail || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    setModalError('');

    try {
      await api.delete('/user/delete-account');
      handleLogout();
    } catch (err: any) {
      setModalError(err.response?.data?.detail || 'Failed to delete account');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const uploadedCases = cases.filter((caseItem) => caseItem.user_id === currentUserId);
  const filteredCases = uploadedCases.filter((caseItem) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;

    const inName = caseItem.name?.toLowerCase().includes(query);
    const inDescription = caseItem.description?.toLowerCase().includes(query);
    const inKeywords = caseItem.keywords?.some((k) => k.name.toLowerCase().includes(query));
    const inOrgs = caseItem.organizations?.some((o) => o.name.toLowerCase().includes(query));
    const inAgents = caseItem.agents?.some((a) => a.name.toLowerCase().includes(query));
    const loc = caseItem.location;
    let inLocation = false;
    if (loc) {
      if (typeof loc === 'string') inLocation = loc.toLowerCase().includes(query);
      else if (loc.display_name) inLocation = loc.display_name.toLowerCase().includes(query);
    }

    return Boolean(inName || inDescription || inKeywords || inOrgs || inAgents || inLocation);
  });

  return (
    <div className="min-h-screen bg-white font-mono text-black">
      <header className="sticky top-0 z-20 bg-black px-[36px] py-4 sm:px-[52px]">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <AppLogo hideNameOnMobile />
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowPreferencesMenu((prev) => !prev)}
              className="flex h-[45px] items-center justify-center rounded-full border border-white/70 px-3 text-[16px] font-medium text-white transition hover:bg-white/10 sm:h-[54px] sm:px-4 sm:text-[18px]"
            >
              preferences
            </button>
            {showPreferencesMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowPreferencesMenu(false)} />
                <div
                  className="absolute right-0 z-20 mt-3 w-[280px] origin-top-right overflow-hidden rounded-[32px] border border-white/10 bg-black p-4 shadow-[0_20px_90px_rgba(0,0,0,0.35)]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowPreferencesMenu(false);
                        handleLogout();
                      }}
                      className="block w-full rounded-full bg-[#6f9bff] px-5 py-3 text-center text-sm font-semibold text-black transition hover:bg-[#7fb0ff]"
                    >
                      Log Out
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowPreferencesMenu(false);
                        setModalError('');
                        setShowChangePasswordModal(true);
                      }}
                      className="block w-full rounded-full bg-[#2cffb2] px-5 py-3 text-center text-sm font-semibold text-black transition hover:bg-[#61ffcb]"
                    >
                      Change password
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowPreferencesMenu(false);
                        setModalError('');
                        setShowDeleteAccountModal(true);
                      }}
                      className="block w-full rounded-full bg-[#ffb885] px-5 py-3 text-center text-sm font-semibold text-black transition hover:bg-[#ffc68a]"
                    >
                      Delete account
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-[36px] py-10 sm:px-[52px]">
        <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col items-center gap-3 lg:flex-row lg:justify-start lg:gap-8">
            <Link
              href="/collections"
              aria-label="Back to Collections"
              className="flex h-[45px] w-[45px] shrink-0 items-center justify-center self-start rounded-full border border-black text-black transition hover:bg-gray-100 lg:self-auto"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </Link>
            <div className="text-center lg:text-left">
              <h1 className="text-[32px] font-bold text-black">My uploaded case studies</h1>
              <p className="mt-1 text-gray-600">Browse all case studies you have added to the platform.</p>
            </div>
          </div>

          <div className="w-full max-w-xl">
            <label htmlFor="uploaded-case-search" className="sr-only">
              Search uploaded case studies
            </label>
            <div className="flex min-h-[45px] items-center justify-between rounded-full border border-black px-4 py-2">
              <input
                id="uploaded-case-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="search"
                className="min-w-0 flex-1 bg-transparent text-[16px] text-black placeholder:text-gray-400 focus:outline-none [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="ml-3 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xl leading-none text-black"
                >
                  ×
                </button>
              ) : (
                <SearchIcon className="ml-3 h-6 w-6 shrink-0 text-black" />
              )}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="py-20 text-center">
            <p className="text-gray-600">Loading your uploaded case studies...</p>
          </div>
        ) : filteredCases.length === 0 ? (
          <div className="py-20 text-center">
            <h2 className="text-[20px] font-semibold text-black">No uploaded case studies found</h2>
            <p className="mt-3 text-gray-600">You can upload new case studies from the homepage.</p>
            <div className="mt-6">
              <Link
                href="/"
                className="inline-flex items-center rounded-full bg-[#ffb885] px-5 py-2 font-medium text-black transition hover:bg-[#f2a15e]"
              >
                Go to Homepage
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredCases.map((caseItem) => (
              <div
                key={caseItem.id}
                className="relative overflow-hidden rounded-[20px] border border-[rgba(179,179,179,0.48)] bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg"
              >
                <div
                  className="cursor-pointer"
                  onClick={() => {
                    setSelectedCaseId(caseItem.id);
                    setShowCaseDetailsModal(true);
                  }}
                >
                  <div className="relative h-[196px]">
                    {caseItem.image_path ? (
                      <img
                        src={`${API_BASE_URL}/uploads/${encodeURIComponent(caseItem.image_path)}`}
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
                    ) : (
                      <img src={PLACEHOLDER_CASE_IMAGE} alt={caseItem.name} className="h-full w-full object-cover" />
                    )}
                    <span className={`absolute right-4 top-[196px] z-10 -translate-y-1/2 rounded-full px-3 py-1 text-[12px] font-medium ${getTypeBadgeClasses(caseItem.type)}`}>
                      {caseItem.type.toUpperCase()}
                    </span>
                    {caseItem.is_unibz_course && (
                      <span className="absolute left-4 top-[196px] z-10 -translate-y-1/2 rounded-full bg-white/90 px-3 py-1 text-[11px] font-medium text-black shadow-sm">
                        🎓 UNIBZ course
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col gap-3 px-[22px] py-[20px]">
                    <h3 className="text-[18px] font-semibold text-black">{caseItem.name}</h3>

                    {caseItem.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {caseItem.keywords.slice(0, 4).map((k) => (
                          <button
                            key={k.name}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSearchQuery(k.name);
                            }}
                            className="rounded-full bg-[#e5e5e5] px-3 py-1 text-[12px] text-black transition hover:bg-[#d9d9d9]"
                          >
                            {k.name}
                          </button>
                        ))}
                      </div>
                    )}

                    {caseItem.type !== 'organization' && caseItem.organizations?.[0]?.name && caseItem.organizations[0].name !== '/' && (
                      <p className="text-[12px] text-black/80">
                        {caseItem.organizations[0].name}
                      </p>
                    )}
                  </div>
                </div>

                {caseItem.user_id === currentUserId && (
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
              </div>
            ))}
          </div>
        )}
      </main>

      {showChangePasswordModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
          onClick={() => setShowChangePasswordModal(false)}
        >
          <div
            className="w-full max-w-md rounded-[24px] bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-[22px] font-bold text-black">Change password</h2>

            {modalError && (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {modalError}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Current password</label>
                <input
                  type="password"
                  value={passwordCurrent}
                  onChange={(e) => setPasswordCurrent(e.target.value)}
                  className="w-full rounded-full border border-gray-300 px-4 py-2 focus:border-black focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">New password</label>
                <input
                  type="password"
                  value={passwordNew}
                  onChange={(e) => setPasswordNew(e.target.value)}
                  className="w-full rounded-full border border-gray-300 px-4 py-2 focus:border-black focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Confirm new password</label>
                <input
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  className="w-full rounded-full border border-gray-300 px-4 py-2 focus:border-black focus:outline-none"
                  required
                />
              </div>
              <div className="flex justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowChangePasswordModal(false)}
                  disabled={isChangingPassword}
                  className="rounded-full border border-black bg-white px-6 py-2 font-medium text-black transition hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="rounded-full bg-[#ffb885] px-6 py-2 font-medium text-black transition hover:bg-[#f2a15e] disabled:opacity-50"
                >
                  {isChangingPassword ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteAccountModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
          onClick={() => setShowDeleteAccountModal(false)}
        >
          <div
            className="w-full max-w-md rounded-[24px] bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-[22px] font-bold text-black">Delete account</h2>
            <p className="mb-4 text-sm text-gray-600">
              Deleting your account will remove your profile and personal collections, but all case studies you uploaded will remain on the platform.
            </p>

            {modalError && (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {modalError}
              </div>
            )}

            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteAccountModal(false)}
                disabled={isDeletingAccount}
                className="rounded-full border border-black bg-white px-6 py-2 font-medium text-black transition hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={isDeletingAccount}
                className="rounded-full bg-[#ffb885] px-6 py-2 font-medium text-black transition hover:bg-[#f2a15e] disabled:opacity-50"
              >
                {isDeletingAccount ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}

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
          setSearchQuery(value);
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
            setSearchQuery(organizationName);
            setShowCaseDetailsModal(false);
          }
        }}
      />

      <EditCaseModal
        isOpen={showEditModal}
        caseId={selectedCaseId}
        onClose={() => {
          setShowEditModal(false);
          fetchCases();
        }}
        onDeleted={() => {
          setShowCaseDetailsModal(false);
          fetchCases();
        }}
      />
    </div>
  );
}
