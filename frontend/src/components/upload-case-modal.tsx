'use client';

import { useRef, useState } from 'react';
import api, { API_BASE_URL } from '../lib/api';
import { PLACEHOLDER_CASE_IMAGE } from '../lib/placeholder-image';
import LocationAutocomplete, { LocationResult } from './location-autocomplete';
import { useLockBodyScroll } from '../lib/use-lock-body-scroll';

type CaseLocation = string | { display_name: string } | undefined;

interface Case {
  id: number;
  name: string;
  description?: string;
  link?: string;
  location?: CaseLocation;
  image_path?: string;
  is_unibz_course?: boolean;
  keywords: { name: string }[];
  agents: { name: string }[];
  organizations: { name: string }[];
}

type CaseType = 'organization' | 'project';
type Step = 'type' | 'name' | 'similar' | 'form' | 'preview';

interface UploadCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploaded: () => Promise<void> | void;
}

const THEME: Record<CaseType, { accent: string; label: string }> = {
  organization: { accent: '#2cffb2', label: 'Organisation' },
  project: { accent: '#adbdff', label: 'Project' },
};

export default function UploadCaseModal({ isOpen, onClose, onUploaded }: UploadCaseModalProps) {
  const [step, setStep] = useState<Step>('type');
  const [type, setType] = useState<CaseType | ''>('');
  const [name, setName] = useState('');
  const [matches, setMatches] = useState<Case[]>([]);
  const [description, setDescription] = useState('');
  const [link, setLink] = useState('');
  const [locationInput, setLocationInput] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<LocationResult | null>(null);
  const [keywords, setKeywords] = useState('');
  const [agents, setAgents] = useState('');
  const [organizations, setOrganizations] = useState('');
  const [isUnibzCourse, setIsUnibzCourse] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [existingImagePath, setExistingImagePath] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useLockBodyScroll(isOpen);

  if (!isOpen) return null;

  const resetState = () => {
    setStep('type');
    setType('');
    setName('');
    setMatches([]);
    setDescription('');
    setLink('');
    setLocationInput('');
    setSelectedLocation(null);
    setKeywords('');
    setAgents('');
    setOrganizations('');
    setIsUnibzCourse(false);
    setImage(null);
    setExistingImagePath(null);
    setError('');
    setLoading(false);
  };

  const closeModal = () => {
    resetState();
    onClose();
  };

  const selectType = (chosen: CaseType) => {
    setError('');
    setType(chosen);
    setStep('name');
  };

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) return;

    try {
      const response = await api.get('/cases');
      const allCases: Case[] = response.data;
      const query = name.trim().toLowerCase();
      const found = allCases.filter((c) => {
        const caseName = c.name?.trim().toLowerCase() || '';
        return caseName === query || caseName.includes(query) || query.includes(caseName);
      });

      setMatches(found);
      setStep('similar');
    } catch {
      setError(`Error checking existing ${type}s`);
    }
  };

  const startBlankForm = () => {
    setDescription('');
    setLink('');
    setLocationInput('');
    setSelectedLocation(null);
    setKeywords('');
    setAgents('');
    setOrganizations('');
    setIsUnibzCourse(false);
    setImage(null);
    setExistingImagePath(null);
    setStep('form');
  };

  const prefillFromMatch = (match: Case) => {
    setDescription(match.description || '');
    setLink(match.link || '');
    const loc = match.location;
    setLocationInput(typeof loc === 'string' ? loc : loc?.display_name || '');
    setSelectedLocation(null);
    setKeywords(match.keywords.map((k) => k.name).join(', '));
    setAgents(match.agents.map((a) => a.name).join(', '));
    setOrganizations(match.organizations.map((o) => o.name).join(', '));
    setIsUnibzCourse(match.is_unibz_course || false);
    setImage(null);
    setExistingImagePath(match.image_path || null);
    setStep('form');
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setStep('preview');
  };

  const handleFinalSubmit = async () => {
    setError('');
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('type', type);
      formData.append('name', name);
      formData.append('description', description);
      formData.append('link', link);

      const locationPayload = selectedLocation
        ? JSON.stringify(selectedLocation)
        : locationInput.trim()
        ? JSON.stringify({ display_name: locationInput.trim() })
        : '';

      if (locationPayload) {
        formData.append('location', locationPayload);
      }

      formData.append('keywords', keywords);
      formData.append('agents', agents);
      formData.append('organizations', type === 'organization' ? name.trim() : organizations);
      formData.append('is_unibz_course', String(isUnibzCourse));

      if (image) {
        formData.append('image', image);
      }

      await api.post('/cases', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      await onUploaded();
      closeModal();
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error) {
        const typedError = error as { response?: { data?: { detail?: string } } };
        setError(typedError.response?.data?.detail || 'Upload failed');
      } else {
        setError('Upload failed');
      }
      setStep('form');
    } finally {
      setLoading(false);
    }
  };

  const accent = type ? THEME[type].accent : '#2cffb2';
  const typeLabel = type ? THEME[type].label : '';
  const imagePreviewUrl = image
    ? URL.createObjectURL(image)
    : existingImagePath
    ? `${API_BASE_URL}/uploads/${encodeURIComponent(existingImagePath)}`
    : null;

  const closeButton = (
    <button
      type="button"
      onClick={closeModal}
      aria-label="Close"
      className="flex h-9 w-9 items-center justify-center rounded-full bg-black/10 text-xl text-black transition hover:bg-black/20"
    >
      ×
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm">
      <div
        className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-[24px] bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {step === 'type' && (
          <div className="p-8">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">Upload a Case Study</p>
                <h1 className="text-2xl font-bold text-black">What are you uploading?</h1>
              </div>
              {closeButton}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => selectType('organization')}
                className="rounded-2xl bg-[#2cffb2] p-6 text-left font-semibold text-black transition hover:brightness-95"
              >
                Organisation
              </button>
              <button
                type="button"
                onClick={() => selectType('project')}
                className="rounded-2xl bg-[#adbdff] p-6 text-left font-semibold text-black transition hover:brightness-95"
              >
                Project
              </button>
            </div>
          </div>
        )}

        {step === 'name' && (
          <div className="rounded-[24px] p-8" style={{ backgroundColor: accent }}>
            <div className="mb-8 flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold uppercase tracking-wide text-black">Upload a Case Study</h1>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-black/70">{typeLabel}</p>
              </div>
              {closeButton}
            </div>
            <form onSubmit={handleNameSubmit} className="space-y-6">
              <div>
                <label className="mb-2 block text-black">What is the name of the {typeLabel.toLowerCase()}?</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  className="w-full rounded-md border border-black/20 bg-white px-3 py-2"
                  required
                />
              </div>
              {error && <p className="text-red-800">{error}</p>}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setStep('type')}
                  className="rounded-full border border-black bg-transparent px-5 py-2 font-medium text-black transition hover:bg-black/5"
                >
                  Cancel
                </button>
                <button type="submit" className="rounded-full bg-black px-5 py-2 font-medium text-white transition hover:bg-black/80">
                  Accept
                </button>
              </div>
            </form>
          </div>
        )}

        {step === 'similar' && (
          <div className="rounded-[24px] p-8" style={{ backgroundColor: accent }}>
            <div className="mb-8 flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold uppercase tracking-wide text-black">Upload a Case Study</h1>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-black/70">{typeLabel}</p>
              </div>
              {closeButton}
            </div>

            {matches.length > 0 ? (
              <div className="space-y-6 text-center">
                <p className="text-lg text-black">
                  We found this {typeLabel.toLowerCase()}, is it the same as the one you want to upload?
                </p>
                <div className="mx-auto max-w-xs overflow-hidden rounded-2xl bg-white shadow-md">
                  <div className="relative h-40">
                    <img
                      src={matches[0].image_path ? `${API_BASE_URL}/uploads/${encodeURIComponent(matches[0].image_path)}` : PLACEHOLDER_CASE_IMAGE}
                      alt={matches[0].name}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (target.src !== PLACEHOLDER_CASE_IMAGE) {
                          target.onerror = null;
                          target.src = PLACEHOLDER_CASE_IMAGE;
                        }
                      }}
                    />
                    <span
                      className="absolute bottom-2 right-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-black"
                      style={{ backgroundColor: accent }}
                    >
                      {typeLabel}
                    </span>
                  </div>
                  <div className="px-4 py-3 text-left">
                    <h3 className="font-semibold text-black">{matches[0].name}</h3>
                  </div>
                </div>
                <div className="flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={startBlankForm}
                    className="rounded-full bg-black px-5 py-2 font-medium text-white transition hover:bg-black/80"
                  >
                    No, create a new {typeLabel.toLowerCase()}
                  </button>
                  <button
                    type="button"
                    onClick={() => prefillFromMatch(matches[0])}
                    className="rounded-full bg-white px-5 py-2 font-medium text-black transition hover:bg-gray-100"
                  >
                    Yes
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6 text-center">
                <p className="text-lg text-black">No similar {typeLabel.toLowerCase()}s found</p>
                <button
                  type="button"
                  onClick={startBlankForm}
                  className="rounded-full bg-black px-5 py-3 font-medium text-white transition hover:bg-black/80"
                >
                  Proceed to create a new {typeLabel.toLowerCase()}
                </button>
              </div>
            )}

            <button type="button" onClick={() => setStep('name')} className="mt-8 text-black underline">
              ← Back
            </button>
          </div>
        )}

        {step === 'form' && (
          <div>
            <div className="sticky top-0 z-10 rounded-t-[24px] px-8 py-6" style={{ backgroundColor: accent }}>
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold uppercase tracking-wide text-black">Upload a Case Study</h1>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-black/70">{typeLabel}</p>
                </div>
                {closeButton}
              </div>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-5 px-8 py-6">
              <h2 className="text-xl font-bold text-black">{name}</h2>

              {error && <p className="text-red-600">{error}</p>}

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-700">
                  Photo* <span className="font-normal normal-case text-gray-500">· Add a photo to identify the case study</span>
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setImage(e.target.files?.[0] || null)}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-black/80"
                >
                  Select a photo
                </button>
                {(image || existingImagePath) && (
                  <span className="ml-3 text-sm text-gray-600">{image ? image.name : 'Existing photo kept'}</span>
                )}
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-700">
                  Keywords{type === 'project' && '*'}
                </label>
                <input
                  type="text"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="comma-separated"
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  required={type === 'project'}
                />
              </div>

              {type === 'project' && (
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-700">
                    Organisation* <span className="font-normal normal-case text-gray-500">· Who runs the project?</span>
                  </label>
                  <input
                    type="text"
                    value={organizations}
                    onChange={(e) => setOrganizations(e.target.value)}
                    placeholder="comma-separated"
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                    required
                  />
                </div>
              )}

              {(type === 'project' || type === 'organization') && (
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-700">
                    Is this {type} developed during a UNIBZ course?
                  </label>
                  <div className="inline-flex overflow-hidden rounded-full border border-black">
                    <button
                      type="button"
                      onClick={() => setIsUnibzCourse(true)}
                      aria-pressed={isUnibzCourse}
                      className={`px-6 py-2 text-sm font-semibold transition ${
                        isUnibzCourse ? 'bg-[#2cffb2] text-black' : 'bg-white text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsUnibzCourse(false)}
                      aria-pressed={!isUnibzCourse}
                      className={`border-l border-black px-6 py-2 text-sm font-semibold transition ${
                        !isUnibzCourse ? 'bg-[#ffb885] text-black' : 'bg-white text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      No
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-700">
                  Agents <span className="font-normal normal-case text-gray-500">· People who are part of the organisation</span>
                </label>
                <input
                  type="text"
                  value={agents}
                  onChange={(e) => setAgents(e.target.value)}
                  placeholder="comma-separated"
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-700">
                  Location <span className="font-normal normal-case text-gray-500">· Where does it operate?</span>
                </label>
                <LocationAutocomplete
                  value={locationInput}
                  selectedLocation={selectedLocation}
                  onValueChange={setLocationInput}
                  onSelectLocation={setSelectedLocation}
                  label=""
                  placeholder="optional"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-700">
                  Link <span className="font-normal normal-case text-gray-500">· Where can more information be found?</span>
                </label>
                <input
                  type="url"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="optional"
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-700">
                  Description* <span className="font-normal normal-case text-gray-500">· What&apos;s important to know about?</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  required
                />
              </div>

              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep('similar')}
                  className="flex items-center gap-2 rounded-full border border-black px-5 py-2 font-medium text-black transition hover:bg-gray-100"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-black px-6 py-2 font-medium text-white transition hover:bg-black/80"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        )}

        {step === 'preview' && (
          <div>
            <div className="relative h-56">
              <img
                src={imagePreviewUrl || PLACEHOLDER_CASE_IMAGE}
                alt={name}
                className="h-full w-full rounded-t-[24px] object-cover"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (target.src !== PLACEHOLDER_CASE_IMAGE) {
                    target.onerror = null;
                    target.src = PLACEHOLDER_CASE_IMAGE;
                  }
                }}
              />
              <div className="absolute inset-0 rounded-t-[24px] bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
              <button
                type="button"
                onClick={closeModal}
                aria-label="Close"
                className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-xl text-black shadow transition hover:bg-white"
              >
                ×
              </button>
              <span
                className="absolute bottom-4 right-4 rounded-full px-4 py-1.5 text-[13px] font-semibold uppercase tracking-[0.2em] text-black"
                style={{ backgroundColor: accent }}
              >
                {typeLabel}
              </span>
            </div>

            <div className="px-8 py-6">
              <h1 className="text-2xl font-bold text-black">{name}</h1>
              {type === 'project' && organizations && (
                <p className="mt-1 text-gray-600">{organizations.split(',')[0].trim()}</p>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                {keywords
                  .split(',')
                  .map((k) => k.trim())
                  .filter(Boolean)
                  .map((k, idx) => (
                    <span key={`${k}-${idx}`} className="rounded-full bg-[#e5e5e5] px-3 py-1 text-[13px] font-medium text-black">
                      {k}
                    </span>
                  ))}
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                {(selectedLocation?.display_name || locationInput) && (
                  <span className="flex items-center gap-2 rounded-full border border-black px-4 py-2 text-[14px] text-black">
                    📍 {selectedLocation?.display_name || locationInput}
                  </span>
                )}
                {link && (
                  <span className="flex items-center gap-2 rounded-full border border-black px-4 py-2 text-[14px] text-black">
                    🔗 {link}
                  </span>
                )}
              </div>

              <p className="mt-6 whitespace-pre-line text-gray-700">{description}</p>

              {error && <p className="mt-4 text-red-600">{error}</p>}

              <div className="mt-8 flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep('form')}
                  className="flex items-center gap-2 rounded-full border border-black px-5 py-2 font-medium text-black transition hover:bg-gray-100"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleFinalSubmit}
                  className="rounded-full bg-[#ffb885] px-6 py-2 font-medium text-black transition hover:bg-[#f2a15e] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? 'Uploading...' : `Upload ${typeLabel.toLowerCase()}`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
