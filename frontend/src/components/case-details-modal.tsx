'use client';

import { useEffect, useState } from 'react';
import api, { API_BASE_URL } from '../lib/api';
import { PLACEHOLDER_CASE_IMAGE } from '../lib/placeholder-image';
import { useLockBodyScroll } from '../lib/use-lock-body-scroll';

type CaseLocation = string | { display_name: string } | undefined;

interface Case {
  id: number;
  type: string;
  name: string;
  description: string;
  image_path?: string;
  link?: string;
  location?: CaseLocation;
  user_id: number;
  is_unibz_course?: boolean;
  keywords: { name: string }[];
  agents: { name: string }[];
  organizations: { name: string }[];
}

interface CaseDetailsModalProps {
  isOpen: boolean;
  caseId: number | null;
  onClose: () => void;
  currentUserId?: number;
  onEditClick?: (caseId: number) => void;
  onManageSavedCase?: (caseId: number) => void;
  isSaved?: boolean;
  onLabelClick: (value: string) => void;
  onProjectClick: (caseId: number) => void;
  onOrganizationClick: (organizationName: string) => void;
}

export default function CaseDetailsModal({
  isOpen,
  caseId,
  onClose,
  currentUserId = 0,
  onEditClick,
  onManageSavedCase,
  isSaved = false,
  onLabelClick,
  onProjectClick,
  onOrganizationClick,
}: CaseDetailsModalProps) {
  const [caseItem, setCaseItem] = useState<Case | null>(null);
  const [relatedProjects, setRelatedProjects] = useState<Case[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useLockBodyScroll(isOpen);

  useEffect(() => {
    if (!isOpen || !caseId) return;

    setLoading(true);
    setError('');

    const fetchCase = async () => {
      try {
        const response = await api.get(`/cases/${caseId}`);
        const data: Case = response.data;
        setCaseItem(data);

        if (data.type === 'organization') {
          const casesResponse = await api.get('/cases');
          const related = casesResponse.data.filter((other: Case) =>
            other.id !== data.id &&
            other.type === 'project' &&
            other.organizations.some((org) => org.name === data.name)
          );
          setRelatedProjects(related);
        } else {
          setRelatedProjects([]);
        }
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Unable to load case');
      } finally {
        setLoading(false);
      }
    };

    fetchCase();
  }, [isOpen, caseId]);

  if (!isOpen) return null;

  const heroImage = caseItem?.image_path ? `${API_BASE_URL}/uploads/${encodeURIComponent(caseItem.image_path)}` : 'http://localhost:3845/assets/14738f84b6f9feb87119b05b4afc56c1a916fe7c.png';
  const organizationName = caseItem?.organizations?.[0]?.name;
  const hasOrganization = Boolean(organizationName && organizationName !== '/');
  const realAgents = caseItem?.agents.filter((ag) => ag.name && ag.name !== '/') || [];
  const locationLabel = caseItem?.location ? (typeof caseItem.location === 'string' ? caseItem.location : caseItem.location?.display_name) : 'Location';
  const linkLabel = caseItem?.link || 'www.linktotheproject.com';

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/35 p-3 backdrop-blur-sm sm:p-6"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-[32px] border border-[rgba(179,179,179,0.48)] bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {loading && (
          <div className="flex min-h-[420px] items-center justify-center py-12">
            <p className="text-lg text-gray-700">Loading...</p>
          </div>
        )}

        {error && (
          <div className="px-8 py-14 text-center">
            <h1 className="mb-4 text-2xl font-bold text-gray-900">Error</h1>
            <p className="mb-6 text-gray-600">{error}</p>
            <button
              onClick={onClose}
              aria-label="Close"
              className="flex h-12 w-12 items-center justify-center rounded-full bg-[#ffb885] text-2xl font-light text-black hover:bg-[#f2a15e]"
            >
              ×
            </button>
          </div>
        )}

        {caseItem && !loading && (
          <>
            <div className="sticky top-[-180px] z-20 h-[280px] overflow-hidden rounded-t-[32px] sm:top-[-240px] sm:h-[360px]">
              <img
                src={heroImage}
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
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />

              <div className={`absolute left-6 bottom-6 rounded-full px-5 py-2 text-[16px] font-semibold uppercase tracking-[0.2em] text-black sm:left-8 sm:bottom-8 sm:text-[18px] ${caseItem.type === 'organization' ? 'bg-[#2cffb2]' : 'bg-[#adbdff]'}`}>
                {caseItem.type.toUpperCase()}
              </div>

              <button
                type="button"
                onClick={onClose}
                className="absolute right-4 bottom-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-2xl font-light text-black shadow-lg transition hover:bg-white sm:right-6 sm:bottom-6"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="relative z-10 bg-white px-6 py-7 sm:px-10 sm:py-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-3xl">
                  <h1 className="text-[28px] font-semibold text-black sm:text-[36px]">{caseItem.name}</h1>
                  {caseItem.type === 'project' && hasOrganization && (
                    <button
                      type="button"
                      onClick={() => onOrganizationClick(organizationName!)}
                      className="mt-2 text-[18px] text-gray-700 transition hover:text-black hover:underline sm:text-[22px]"
                    >
                      {organizationName}
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-3">
                  {currentUserId > 0 && (
                    <button
                      type="button"
                      onClick={() => onManageSavedCase?.(caseItem.id)}
                      className={`flex items-center gap-2 rounded-full border border-[#ffb885] px-4 py-2 text-[16px] font-medium transition ${isSaved ? 'bg-[#ffb885] text-white hover:bg-[#f2a15e]' : 'bg-white text-[#ff8c3b] hover:bg-[#fff3e6]'}`}
                    >
                      <span className="text-[18px]">{isSaved ? '★' : '☆'}</span>
                      <span>{isSaved ? 'Saved' : 'Save'}</span>
                    </button>
                  )}
                  {currentUserId > 0 && caseItem.user_id === currentUserId && (
                    <button
                      type="button"
                      onClick={() => onEditClick?.(caseItem.id)}
                      className="rounded-full bg-[#ffb885] px-4 py-2 text-[16px] font-medium text-black transition hover:bg-[#f2a15e]"
                    >
                      Edit
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                {caseItem.keywords.length > 0 ? (
                  caseItem.keywords.slice(0, 8).map((kw) => (
                    <button
                      key={kw.name}
                      type="button"
                      onClick={() => onLabelClick(kw.name)}
                      className="rounded-full bg-[#e5e5e5] px-3 py-1 text-[13px] font-medium text-black transition hover:bg-[#d9d9d9]"
                    >
                      {kw.name}
                    </button>
                  ))
                ) : (
                  <span className="rounded-full bg-[#e5e5e5] px-3 py-1 text-[13px] text-black">No keywords</span>
                )}
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const locationText = typeof caseItem.location === 'string' ? caseItem.location : caseItem.location?.display_name ?? '';
                    onLabelClick(locationText);
                  }}
                  className="flex items-center gap-2 rounded-full border border-black px-4 py-2 text-[15px] text-black transition hover:bg-gray-100"
                >
                  <span className="text-[16px]">📍</span>
                  <span>{locationLabel}</span>
                </button>

                {caseItem.link && (
                  <a
                    href={caseItem.link}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 rounded-full border border-black px-4 py-2 text-[15px] text-black transition hover:bg-gray-100"
                  >
                    <span className="text-[16px]">🔗</span>
                    <span className="truncate">{linkLabel}</span>
                  </a>
                )}

                {caseItem.is_unibz_course && (
                  <span className="flex items-center gap-2 rounded-full border border-black px-4 py-2 text-[15px] text-black">
                    <span className="text-[16px]">🎓</span>
                    <span>UNIBZ course project</span>
                  </span>
                )}
              </div>

              <div className="mt-8">
                {realAgents.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-[13px] font-semibold uppercase tracking-[0.2em] text-gray-500">Agents</h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {realAgents.map((ag) => (
                        <span key={ag.name} className="rounded-full bg-white px-3 py-2 text-[14px] font-medium text-gray-700 ring-1 ring-gray-200">
                          {ag.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h2 className="text-[20px] font-semibold text-black">Description</h2>
                  <p className="mt-3 whitespace-pre-line text-[16px] leading-7 text-gray-700">{caseItem.description}</p>
                </div>
              </div>

              {relatedProjects.length > 0 && (
                <div className="mt-10">
                  <div className="mb-4">
                    <h2 className="text-[20px] font-semibold text-black">Related projects</h2>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {relatedProjects.map((project) => (
                      <button
                        key={project.id}
                        type="button"
                        onClick={() => onProjectClick(project.id)}
                        className="overflow-hidden rounded-[20px] border border-[#e5e5e5] bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                      >
                        <div className="relative h-[160px]">
                          <img
                            src={project.image_path ? `${API_BASE_URL}/uploads/${encodeURIComponent(project.image_path)}` : PLACEHOLDER_CASE_IMAGE}
                            alt={project.name}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              const target = e.currentTarget;
                              if (target.src !== PLACEHOLDER_CASE_IMAGE) {
                                target.onerror = null;
                                target.src = PLACEHOLDER_CASE_IMAGE;
                              }
                            }}
                          />
                          <span className="absolute bottom-3 right-3 rounded-full bg-[#adbdff] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-black">
                            Project
                          </span>
                        </div>
                        <div className="px-4 py-3">
                          <h3 className="text-[16px] font-semibold text-black">{project.name}</h3>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
