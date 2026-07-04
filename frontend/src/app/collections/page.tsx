'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '../../lib/api';
import CollectionCard from '../../components/collection-card';
import AppLogo from '../../components/app-logo';

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

interface Case {
  id: number;
  name: string;
  image_path?: string;
}

interface Collection {
  id: number;
  name: string;
  cases: Case[];
}

export default function CollectionsPage() {
  const router = useRouter();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPreferencesMenu, setShowPreferencesMenu] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [passwordCurrent, setPasswordCurrent] = useState('');
  const [passwordNew, setPasswordNew] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [modalError, setModalError] = useState('');
  const [newCollectionName, setNewCollectionName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);

    if (!token) {
      setIsLoading(false);
      return;
    }

    fetchCollections();
  }, []);

  const fetchCollections = async () => {
    try {
      const response = await api.get<Collection[]>('/collections');
      setCollections(response.data);
    } catch (error) {
      console.error('Error fetching collections:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCollections = useMemo(
    () => collections.filter((collection) =>
      collection.name.toLowerCase().includes(searchQuery.toLowerCase().trim()),
    ),
    [collections, searchQuery],
  );

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollectionName.trim()) {
      setError('Collection name cannot be empty');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      const response = await api.post('/collections', null, {
        params: { name: newCollectionName },
      });
      setCollections([...collections, response.data]);
      setNewCollectionName('');
      setShowCreateModal(false);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create collection');
    } finally {
      setIsCreating(false);
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

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-white font-mono text-black">
        <header className="bg-black px-4 py-4 sm:px-8">
          <AppLogo />
        </header>
        <main className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-8">
          <p className="mb-4 text-gray-600">Please sign in to view your collections</p>
          <Link href="/signin" className="inline-block rounded-full bg-[#ffb885] px-5 py-2 font-medium text-black transition hover:bg-[#f2a15e]">
            Sign In
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-mono text-black">
      <header className="sticky top-0 z-20 bg-black px-4 py-4 sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <AppLogo />

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowPreferencesMenu((prev) => !prev)}
              className="rounded-full bg-white px-5 py-2 text-[15px] font-medium text-black transition hover:bg-gray-100"
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

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              aria-label="Back to Home"
              className="flex h-[45px] w-[45px] shrink-0 items-center justify-center rounded-full border border-black text-black transition hover:bg-gray-100"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-[32px] font-bold text-black">My collections</h1>
              <p className="mt-2 text-gray-600">Organise and access your saved case study collections</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/my-uploaded-case-study"
              className="flex items-center rounded-full bg-[#adbdff] px-5 py-2 font-medium text-black transition hover:opacity-90"
            >
              Uploaded case studies
            </Link>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="rounded-full bg-[#2cffb2] px-5 py-2 font-medium text-black transition hover:opacity-90"
            >
              + New collection
            </button>
          </div>
        </div>

        <div className="mb-8 max-w-xl">
          <label htmlFor="collection-search" className="sr-only">
            Search collections
          </label>
          <div className="flex min-h-[45px] items-center justify-between rounded-full border border-black px-4 py-2">
            <input
              id="collection-search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="search"
              className="min-w-0 flex-1 bg-transparent text-[16px] text-black placeholder:text-gray-400 focus:outline-none"
            />
            <SearchIcon className="ml-3 h-6 w-6 shrink-0 text-black" />
          </div>
        </div>

        {isLoading ? (
          <div className="py-12 text-center">
            <p className="text-gray-600">Loading collections...</p>
          </div>
        ) : collections.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-gray-600">No collections yet</p>
            <p className="mt-2 text-sm text-gray-500">Create your first collection to organize case studies</p>
          </div>
        ) : filteredCollections.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-gray-600">No collections match your search.</p>
            <p className="mt-2 text-sm text-gray-500">Try a different keyword or clear the search field.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            {filteredCollections.map((collection) => (
              <CollectionCard
                key={collection.id}
                id={collection.id}
                name={collection.name}
                cases={collection.cases}
                onEditCollection={async (collectionId, newName) => {
                  try {
                    const response = await api.put(`/collections/${collectionId}`, { name: newName });
                    setCollections((prev) => prev.map((item) => item.id === collectionId ? response.data : item));
                  } catch (err) {
                    console.error('Error updating collection:', err);
                    throw err;
                  }
                }}
                onDeleteCollection={async (collectionId) => {
                  if (!window.confirm('Delete this collection? This cannot be undone.')) return;
                  try {
                    await api.delete(`/collections/${collectionId}`);
                    setCollections((prev) => prev.filter((item) => item.id !== collectionId));
                  } catch (err) {
                    console.error('Error deleting collection:', err);
                    throw err;
                  }
                }}
              />
            ))}
          </div>
        )}
      </main>

      {/* Create Collection Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="w-full max-w-md rounded-[24px] bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-[22px] font-bold text-black">Create new collection</h2>

            {error && (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateCollection}>
              <input
                type="text"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                placeholder="Collection name"
                className="mb-4 w-full rounded-full border border-gray-300 px-4 py-2 focus:border-black focus:outline-none"
                disabled={isCreating}
                autoFocus
              />
              <div className="flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={isCreating}
                  className="rounded-full border border-black bg-white px-6 py-2 font-medium text-black transition hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="rounded-full bg-[#2cffb2] px-6 py-2 font-medium text-black transition hover:opacity-90 disabled:opacity-50"
                >
                  {isCreating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                className="rounded-full bg-red-600 px-6 py-2 font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
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
