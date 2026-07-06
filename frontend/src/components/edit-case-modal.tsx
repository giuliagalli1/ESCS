'use client';

import { useEffect, useRef, useState } from 'react';
import api, { API_BASE_URL } from '../lib/api';
import { PLACEHOLDER_CASE_IMAGE } from '../lib/placeholder-image';
import LocationAutocomplete, { LocationResult } from './location-autocomplete';
import ConfirmDialog from './confirm-dialog';
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
  is_unibz_course?: boolean;
  user_id: number;
  keywords: { name: string }[];
  agents: { name: string }[];
  organizations: { name: string }[];
}

interface EditCaseModalProps {
  isOpen: boolean;
  caseId: number | null;
  onClose: () => void;
  onDeleted?: (caseId: number) => void;
}

export default function EditCaseModal({ isOpen, caseId, onClose, onDeleted }: EditCaseModalProps) {
  const [caseItem, setCaseItem] = useState<Case | null>(null);
  const [type, setType] = useState('project');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [link, setLink] = useState('');
  const [locationInput, setLocationInput] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<LocationResult | null>(null);
  const [keywords, setKeywords] = useState('');
  const [agents, setAgents] = useState('');
  const [organizations, setOrganizations] = useState('');
  const [isUnibzCourse, setIsUnibzCourse] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useLockBodyScroll(isOpen);

  useEffect(() => {
    if (!isOpen || !caseId) return;

    setLoading(true);
    setError('');
    setSuccessMessage('');

    const fetchCase = async () => {
      try {
        const response = await api.get(`/cases/${caseId}`);
        const data: Case = response.data;
        setCaseItem(data);
        setImage(null);
        setType(data.type);
        setName(data.name);
        setDescription(data.description);
        setLink(data.link || '');
        setKeywords(data.keywords.map((kw) => kw.name).join(', '));
        setAgents(data.agents.map((ag) => ag.name).join(', '));
        setOrganizations(data.organizations.map((org) => org.name).join(', '));
        setIsUnibzCourse(data.is_unibz_course || false);

        if (data.location && typeof data.location === 'object') {
          setLocationInput(data.location.display_name || '');
          setSelectedLocation({
            place_id: Number((data.location as any).place_id) || 0,
            display_name: data.location.display_name || '',
            lat: (data.location as any).lat || '',
            lon: (data.location as any).lon || '',
            address: (data.location as any).address || {},
          });
        } else {
          setLocationInput(data.location || '');
          setSelectedLocation(null);
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!caseId) return;

    setSaving(true);
    setError('');
    setSuccessMessage('');

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
      formData.append('organizations', organizations);
      formData.append('is_unibz_course', String(isUnibzCourse));

      if (image) {
        formData.append('image', image);
      }

      await api.put(`/cases/${caseId}`, formData);
      onClose();
      return;
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!caseId) return;

    setDeleting(true);
    setError('');

    try {
      await api.delete(`/cases/${caseId}`);
      setShowDeleteConfirm(false);
      onDeleted?.(caseId);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative flex h-full w-full max-w-3xl max-h-[90vh] flex-col overflow-hidden rounded-[32px] border border-[rgba(179,179,179,0.48)] bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 border-b border-black/10 bg-white px-6 py-5 shadow-sm sm:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-[#ff8c3b]">Edit case</p>
              <h1 className="mt-3 text-3xl font-bold text-black sm:text-4xl">{caseItem?.name || 'Edit case'}</h1>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-black/10 bg-white text-black transition hover:bg-gray-100"
              aria-label="Close edit case modal"
            >
              ×
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8 sm:py-8">
          {loading && (
            <div className="flex min-h-[220px] items-center justify-center py-10">
              <p className="text-gray-600">Loading case details…</p>
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-[24px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="mb-4 rounded-[24px] border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {successMessage}
            </div>
          )}

          <form id="edit-case-form" onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-black">Photo</label>
              <div className="flex items-center gap-4">
                <div className="h-20 w-28 shrink-0 overflow-hidden rounded-[16px] bg-gray-100">
                  <img
                    src={
                      image
                        ? URL.createObjectURL(image)
                        : caseItem?.image_path
                        ? `${API_BASE_URL}/uploads/${encodeURIComponent(caseItem.image_path)}`
                        : PLACEHOLDER_CASE_IMAGE
                    }
                    alt={name || 'Case photo'}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (target.src !== PLACEHOLDER_CASE_IMAGE) {
                        target.onerror = null;
                        target.src = PLACEHOLDER_CASE_IMAGE;
                      }
                    }}
                  />
                </div>
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
                  Change photo
                </button>
                {image && <span className="text-sm text-gray-600">{image.name}</span>}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-black">Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full rounded-[24px] border border-black/10 bg-[#fafafa] px-4 py-3 text-black outline-none transition focus:border-black"
                  required
                >
                  <option value="project">Project</option>
                  <option value="organization">Organization</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-black">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-[24px] border border-black/10 bg-[#fafafa] px-4 py-3 text-black outline-none transition focus:border-black"
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-black">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full min-h-[140px] rounded-[24px] border border-black/10 bg-[#fafafa] px-4 py-3 text-black outline-none transition focus:border-black"
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-black">Link (optional)</label>
                <input
                  type="url"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  className="w-full rounded-[24px] border border-black/10 bg-[#fafafa] px-4 py-3 text-black outline-none transition focus:border-black"
                />
              </div>
              <div>
                <LocationAutocomplete
                  value={locationInput}
                  selectedLocation={selectedLocation}
                  onValueChange={setLocationInput}
                  onSelectLocation={setSelectedLocation}
                  label="Location (optional)"
                  placeholder="Search for an address or place"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-black">Keywords (comma-separated)</label>
                <input
                  type="text"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  className="w-full rounded-[24px] border border-black/10 bg-[#fafafa] px-4 py-3 text-black outline-none transition focus:border-black"
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-black">Agents (comma-separated)</label>
                <input
                  type="text"
                  value={agents}
                  onChange={(e) => setAgents(e.target.value)}
                  className="w-full rounded-[24px] border border-black/10 bg-[#fafafa] px-4 py-3 text-black outline-none transition focus:border-black"
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-black">Organizations (comma-separated)</label>
              <input
                type="text"
                value={organizations}
                onChange={(e) => setOrganizations(e.target.value)}
                className="w-full rounded-[24px] border border-black/10 bg-[#fafafa] px-4 py-3 text-black outline-none transition focus:border-black"
                required
              />
            </div>

            {(type === 'project' || type === 'organization') && (
              <div>
                <label className="mb-2 block text-sm font-medium text-black">Is this {type} developed during a UNIBZ course?</label>
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
          </form>
        </div>

        <div className="sticky bottom-0 z-10 border-t border-black/10 bg-white px-6 py-4 shadow-[0_-10px_35px_-24px_rgba(0,0,0,0.2)] sm:px-8">
          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={saving || deleting}
              className="inline-flex justify-center rounded-full bg-[#ffb885] px-6 py-3 text-sm font-semibold text-black transition hover:bg-[#f2a15e] disabled:opacity-50"
            >
              {deleting ? 'Deleting…' : 'Delete case'}
            </button>
            <button
              type="submit"
              form="edit-case-form"
              disabled={saving || deleting}
              className="inline-flex justify-center rounded-full bg-[#2cffb2] px-6 py-3 text-sm font-semibold text-black transition hover:opacity-90 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>
    </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete case study"
        message="Are you sure you want to permanently delete this case study? This cannot be undone."
        confirmLabel="Delete Case"
        confirmButtonClassName="bg-[#ffb885] text-black hover:bg-[#f2a15e]"
        isConfirming={deleting}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  );
}
