'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api, { API_BASE_URL } from '../../lib/api';
import { PLACEHOLDER_CASE_IMAGE } from '../../lib/placeholder-image';
import Link from 'next/link';
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
  keywords: { name: string }[];
  agents: { name: string }[];
  organizations: { name: string }[];
}

function getTypeBadgeClasses(type: string) {
  return type === 'organization' ? 'bg-[#2cffb2] text-black' : 'bg-[#adbdff] text-black';
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
        <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/collections"
              aria-label="Back to Collections"
              className="flex h-[45px] w-[45px] shrink-0 items-center justify-center rounded-full border border-black text-black transition hover:bg-gray-100"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </Link>
            <div>
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
                className="min-w-0 flex-1 bg-transparent text-[16px] text-black placeholder:text-gray-400 focus:outline-none"
              />
              <SearchIcon className="ml-3 h-6 w-6 shrink-0 text-black" />
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
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredCases.map((caseItem) => (
              <div
                key={caseItem.id}
                className="relative overflow-hidden rounded-[20px] border border-[rgba(179,179,179,0.48)] bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg"
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
                  {caseItem.user_id === currentUserId && (
                    <Link
                      href={`/edit/${caseItem.id}`}
                      className="absolute left-4 top-4 rounded-full bg-[#ffb885] px-3 py-1 text-[12px] font-medium text-black shadow-sm transition hover:bg-[#f2a15e]"
                    >
                      edit
                    </Link>
                  )}
                </div>

                <div className="flex flex-col gap-3 px-[22px] py-[20px]">
                  <h3 className="text-[18px] font-semibold text-black">{caseItem.name}</h3>

                  {caseItem.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {caseItem.keywords.slice(0, 4).map((k) => (
                        <span key={k.name} className="rounded-full bg-[#e5e5e5] px-3 py-1 text-[12px] text-black">
                          {k.name}
                        </span>
                      ))}
                    </div>
                  )}

                  <p className="line-clamp-3 text-[13px] leading-6 text-gray-600">{caseItem.description}</p>

                  {caseItem.location && (
                    <p className="text-[12px] text-black/80">
                      📍 {typeof caseItem.location === 'string' ? caseItem.location : caseItem.location.display_name}
                    </p>
                  )}

                  {caseItem.organizations.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {caseItem.organizations.map((o) => (
                        <span key={o.name} className="rounded-full bg-white px-3 py-1 text-[12px] font-medium text-gray-700 ring-1 ring-gray-200">
                          {o.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
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
