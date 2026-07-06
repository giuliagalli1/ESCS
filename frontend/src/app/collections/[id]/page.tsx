'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import api, { API_BASE_URL } from '../../../lib/api';
import { PLACEHOLDER_CASE_IMAGE } from '../../../lib/placeholder-image';
import CaseDetailsModal from '../../../components/case-details-modal';
import SaveCollectionModal from '../../../components/save-collection-modal';
import EditCaseModal from '../../../components/edit-case-modal';
import AppLogo from '../../../components/app-logo';
import ConfirmDialog from '../../../components/confirm-dialog';
import { useLockBodyScroll } from '../../../lib/use-lock-body-scroll';

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

function StarIcon({ className = '', filled = false }: { className?: string; filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path d="m12 3 2.6 5.3 5.8.8-4.4 4.3 1.1 5.7L12 16.8 6.9 19.1l1.1-5.7-4.4-4.3 5.8-.8L12 3Z" />
    </svg>
  );
}

function getTypeBadgeClasses(type: string) {
  return type === 'organization' ? 'bg-[#2cffb2] text-black' : 'bg-[#adbdff] text-black';
}

interface Case {
  id: number;
  type: string;
  name: string;
  description: string;
  image_path?: string;
  link?: string;
  location?: any;
  user_id?: number;
  is_unibz_course?: boolean;
  keywords: { name: string }[];
  agents: { name: string }[];
  organizations: { name: string }[];
}

interface Collection {
  id: number;
  name: string;
  cases: Case[];
}

export default function CollectionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const collectionId = parseInt(params.id as string);

  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number>(0);
  const [showCaseDetailsModal, setShowCaseDetailsModal] = useState(false);
  const [showSaveCollectionModal, setShowSaveCollectionModal] = useState(false);
  const [showEditCollectionModal, setShowEditCollectionModal] = useState(false);
  const [editCollectionName, setEditCollectionName] = useState('');
  const [isEditingCollection, setIsEditingCollection] = useState(false);
  const [editCollectionError, setEditCollectionError] = useState('');
  const [isDeletingCollection, setIsDeletingCollection] = useState(false);
  const [showDeleteCollectionConfirm, setShowDeleteCollectionConfirm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [showPreferencesMenu, setShowPreferencesMenu] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);

  useLockBodyScroll(showEditCollectionModal || showChangePasswordModal || showDeleteAccountModal);
  const [passwordCurrent, setPasswordCurrent] = useState('');
  const [passwordNew, setPasswordNew] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [modalError, setModalError] = useState('');

  const collection = useMemo(() => collections.find((c) => c.id === collectionId) || null, [collections, collectionId]);
  const savedCaseIds = useMemo(() => {
    const ids = new Set<number>();
    collections.forEach((c) => c.cases.forEach((caseItem) => ids.add(caseItem.id)));
    return Array.from(ids);
  }, [collections]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);

    const uid = Number(localStorage.getItem('user_id') || '0');
    setCurrentUserId(uid);

    if (!token) {
      setIsLoading(false);
      return;
    }

    fetchCollections();
  }, [collectionId]);

  const fetchCollections = async () => {
    try {
      const response = await api.get<Collection[]>('/collections');
      const found = response.data.find((c) => c.id === collectionId);
      if (found) {
        setCollections(response.data);
      } else {
        router.push('/collections');
      }
    } catch (error) {
      console.error('Error fetching collection:', error);
      router.push('/collections');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToCollection = async (targetCollectionId: number) => {
    if (!selectedCaseId) return;
    try {
      await api.post(`/collections/${targetCollectionId}/cases/${selectedCaseId}`);
      setCollections((prev) =>
        prev.map((c) =>
          c.id === targetCollectionId ? { ...c, cases: [...c.cases, { id: selectedCaseId } as Case] } : c,
        ),
      );
    } catch (err) {
      console.error('Error adding case to collection:', err);
    }
  };

  const handleRemoveFromCollection = async (targetCollectionId: number) => {
    if (!selectedCaseId) return;
    try {
      await api.delete(`/collections/${targetCollectionId}/cases/${selectedCaseId}`);
      setCollections((prev) =>
        prev.map((c) => ({
          ...c,
          cases: c.id === targetCollectionId ? c.cases.filter((caseItem) => caseItem.id !== selectedCaseId) : c.cases,
        })),
      );
    } catch (err) {
      console.error('Error removing case from collection:', err);
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
      await api.delete('/user');
      localStorage.removeItem('token');
      localStorage.removeItem('user_id');
      localStorage.removeItem('user_email');
      router.push('/');
    } catch (err: any) {
      setModalError(err.response?.data?.detail || 'Failed to delete account');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handleLabelClick = (value: string) => {
    setSearch(value);
  };

  const handleOpenEditCollection = () => {
    if (collection) {
      setEditCollectionName(collection.name);
    }
    setEditCollectionError('');
    setShowEditCollectionModal(true);
  };

  const handleEditCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCollectionName.trim()) {
      setEditCollectionError('Collection name cannot be empty');
      return;
    }

    setIsEditingCollection(true);
    setEditCollectionError('');

    try {
      const response = await api.put(`/collections/${collectionId}`, { name: editCollectionName.trim() });
      setCollections((prev) => prev.map((item) => (item.id === collectionId ? response.data : item)));
      setShowEditCollectionModal(false);
    } catch (err: any) {
      setEditCollectionError(err.response?.data?.detail || 'Failed to update collection');
    } finally {
      setIsEditingCollection(false);
    }
  };

  const handleDeleteCollection = async () => {
    if (!collection) return;

    setIsDeletingCollection(true);
    setEditCollectionError('');

    try {
      await api.delete(`/collections/${collectionId}`);
      router.push('/collections');
    } catch (err: any) {
      setEditCollectionError(err.response?.data?.detail || 'Failed to delete collection');
    } finally {
      setIsDeletingCollection(false);
      setShowDeleteCollectionConfirm(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-white font-mono text-black">
        <header className="sticky top-0 z-20 bg-black px-[36px] py-4 sm:px-[52px]">
          <AppLogo hideNameOnMobile />
        </header>
        <main className="mx-auto max-w-7xl px-[36px] py-16 text-center sm:px-[52px]">
          <p className="mb-4 text-gray-600">Please sign in to view collections</p>
          <Link href="/signin" className="inline-block rounded-full bg-[#ffb885] px-5 py-2 font-medium text-black transition hover:bg-[#f2a15e]">
            Sign In
          </Link>
        </main>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white font-mono text-black">
        <header className="sticky top-0 z-20 bg-black px-[36px] py-4 sm:px-[52px]">
          <AppLogo hideNameOnMobile />
        </header>
        <main className="mx-auto max-w-7xl px-[36px] py-16 sm:px-[52px]">
          <p className="text-center text-gray-600">Loading...</p>
        </main>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="min-h-screen bg-white font-mono text-black">
        <header className="sticky top-0 z-20 bg-black px-[36px] py-4 sm:px-[52px]">
          <AppLogo hideNameOnMobile />
        </header>
        <main className="mx-auto max-w-7xl px-[36px] py-16 sm:px-[52px]">
          <p className="text-center text-gray-600">Collection not found</p>
        </main>
      </div>
    );
  }

  const filteredCases = collection.cases.filter((caseItem) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const inName = caseItem.name?.toLowerCase().includes(q);
    const inKeywords = caseItem.keywords?.some(k => k.name.toLowerCase().includes(q));
    const inOrgs = caseItem.organizations?.some(o => o.name.toLowerCase().includes(q));
    const inAgents = caseItem.agents?.some(a => a.name.toLowerCase().includes(q));
    const loc = caseItem.location;
    let inLocation = false;
    if (loc) {
      if (typeof loc === 'string') inLocation = loc.toLowerCase().includes(q);
      else if ((loc as any).display_name) inLocation = (loc as any).display_name.toLowerCase().includes(q);
    }
    return Boolean(inName || inKeywords || inOrgs || inAgents || inLocation);
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
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="order-1 flex flex-col items-center gap-3 lg:flex-row lg:justify-start lg:gap-8">
            <Link
              href="/collections"
              aria-label="Back to Collections"
              className="flex h-[45px] w-[45px] shrink-0 items-center justify-center self-start rounded-full border border-black text-black transition hover:bg-gray-100 lg:self-auto"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </Link>
            <div className="text-center lg:text-left">
              <h1 className="text-[32px] font-bold text-black">{collection.name}</h1>
              <p className="mt-1 text-gray-600">
                {filteredCases.length} {filteredCases.length === 1 ? 'case study' : 'case studies'}
              </p>
            </div>
          </div>

          <div className="order-3 flex justify-center lg:order-2">
            <button
              type="button"
              onClick={handleOpenEditCollection}
              className="shrink-0 whitespace-nowrap rounded-full bg-[#ffb885] px-4 py-2 text-sm font-medium text-black transition hover:bg-[#f2a15e]"
            >
              Edit collection
            </button>
          </div>

          <div className="order-2 w-full lg:order-3 lg:w-auto lg:min-w-[320px]">
            <div className="flex min-h-[45px] w-full items-center justify-between rounded-full border border-black px-4 py-2">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="search"
                className="w-full bg-transparent text-[16px] text-black placeholder:text-gray-400 focus:outline-none [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none"
              />
              {search ? (
                <button
                  type="button"
                  onClick={() => setSearch('')}
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

        {filteredCases.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-gray-600">No case studies found</p>
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
                    <img
                      src={caseItem.image_path ? `${API_BASE_URL}/uploads/${encodeURIComponent(caseItem.image_path)}` : PLACEHOLDER_CASE_IMAGE}
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
                              handleLabelClick(k.name);
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

                {currentUserId > 0 && caseItem.user_id === currentUserId && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCaseId(caseItem.id);
                      setShowEditModal(true);
                    }}
                    className="absolute left-4 top-4 rounded-full bg-[#ffb885] px-3 py-1 text-[12px] font-medium text-black shadow-sm transition hover:bg-[#f2a15e]"
                  >
                    edit
                  </button>
                )}

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCaseId(caseItem.id);
                    setShowSaveCollectionModal(true);
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

      <SaveCollectionModal
        isOpen={showSaveCollectionModal}
        caseId={selectedCaseId || 0}
        collections={collections}
        onClose={() => setShowSaveCollectionModal(false)}
        onAddToCollection={handleAddToCollection}
        onRemoveFromCollection={handleRemoveFromCollection}
        onCollectionsChange={(updated) => {
          setCollections((prev) => {
            const prevById = new Map(prev.map((c) => [c.id, c]));
            return updated.map((u) => prevById.get(u.id) || { id: u.id, name: u.name, cases: [] });
          });
        }}
      />

      {showEditCollectionModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
          onClick={() => setShowEditCollectionModal(false)}
        >
          <div
            className="w-full max-w-md rounded-[24px] bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-[22px] font-bold text-black">Edit collection</h2>

            {editCollectionError && (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {editCollectionError}
              </div>
            )}

            <form onSubmit={handleEditCollection} className="space-y-4">
              <input
                type="text"
                value={editCollectionName}
                onChange={(e) => setEditCollectionName(e.target.value)}
                placeholder="Collection name"
                className="w-full rounded-full border border-gray-300 px-4 py-2 focus:border-black focus:outline-none"
                disabled={isEditingCollection}
                autoFocus
              />
              <div className="flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditCollectionModal(false)}
                  disabled={isEditingCollection || isDeletingCollection}
                  className="flex h-[42px] w-[42px] items-center justify-center rounded-full border border-black bg-white px-6 py-2 font-medium text-black transition hover:bg-gray-50 disabled:opacity-50"
                  aria-label="Close edit modal"
                >
                  <span aria-hidden="true" className="text-[18px] font-bold">
                    ×
                  </span>
                </button>
                <button
                  type="submit"
                  disabled={isEditingCollection || isDeletingCollection}
                  className="rounded-full bg-[#2cffb2] px-6 py-2 font-medium text-black transition hover:opacity-90 disabled:opacity-50"
                >
                  {isEditingCollection ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteCollectionConfirm(true)}
                  disabled={isDeletingCollection || isEditingCollection}
                  className="rounded-full bg-[#ffb885] px-6 py-2 font-medium text-black transition hover:bg-[#f2a15e] disabled:opacity-50"
                >
                  {isDeletingCollection ? 'Deleting...' : 'Delete Collection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={showDeleteCollectionConfirm}
        title="Delete collection"
        message="Delete this collection? This cannot be undone."
        confirmLabel="Delete Collection"
        confirmButtonClassName="bg-[#ffb885] text-black hover:bg-[#f2a15e]"
        isConfirming={isDeletingCollection}
        onConfirm={handleDeleteCollection}
        onCancel={() => setShowDeleteCollectionConfirm(false)}
      />

      {showCaseDetailsModal && selectedCaseId && (
        <CaseDetailsModal
          caseId={selectedCaseId}
          isOpen={showCaseDetailsModal}
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
          onLabelClick={handleLabelClick}
          onProjectClick={(caseId) => {
            setSelectedCaseId(caseId);
            setShowCaseDetailsModal(true);
          }}
          onOrganizationClick={(organizationName) => {
            setSearch(organizationName);
            setShowCaseDetailsModal(false);
          }}
        />
      )}

      <EditCaseModal
        isOpen={showEditModal}
        caseId={selectedCaseId}
        onClose={() => setShowEditModal(false)}
        onDeleted={() => fetchCollections()}
      />

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
    </div>
  );
}
