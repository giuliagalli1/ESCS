'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '../../../lib/api';
import LocationAutocomplete, { LocationResult } from '../../../components/location-autocomplete';
import ConfirmDialog from '../../../components/confirm-dialog';

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
  keywords: { name: string }[];
  agents: { name: string }[];
  organizations: { name: string }[];
}

export default function EditCasePage() {
  const params = useParams();
  const router = useRouter();
  const caseId = params?.id;
  const [type, setType] = useState('project');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [link, setLink] = useState('');
  const [locationInput, setLocationInput] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<LocationResult | null>(null);
  const [keywords, setKeywords] = useState('');
  const [agents, setAgents] = useState('');
  const [organizations, setOrganizations] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [unauthorized, setUnauthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/signin');
      return;
    }

    if (!caseId) {
      setError('Invalid case ID');
      setLoading(false);
      return;
    }

    const fetchCase = async () => {
      try {
        const response = await api.get(`/cases/${caseId}`);
        const caseData: Case = response.data;
        const currentUserId = Number(localStorage.getItem('user_id') || '0');

        if (caseData.user_id !== currentUserId) {
          setUnauthorized(true);
          setLoading(false);
          return;
        }

        setType(caseData.type);
        setName(caseData.name);
        setDescription(caseData.description);
        setLink(caseData.link || '');
        if (caseData.location && typeof caseData.location === 'object') {
          setLocationInput(caseData.location.display_name || '');
          // normalize to LocationResult shape with safe defaults
          setSelectedLocation({
            place_id: Number((caseData.location as any).place_id) || 0,
            display_name: caseData.location.display_name || '',
            lat: (caseData.location as any).lat || '',
            lon: (caseData.location as any).lon || '',
            address: (caseData.location as any).address || {},
          });
        } else {
          setLocationInput(caseData.location || '');
          setSelectedLocation(null);
        }
        setKeywords(caseData.keywords.map((kw) => kw.name).join(', '));
        setAgents(caseData.agents.map((ag) => ag.name).join(', '));
        setOrganizations(caseData.organizations.map((org) => org.name).join(', '));
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Unable to load case');
      } finally {
        setLoading(false);
      }
    };

    fetchCase();
  }, [caseId, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseId) {
      setError('Invalid case ID');
      return;
    }

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
    if (image) formData.append('image', image);

    try {
      setSaving(true);
      setError('');
      setSuccessMessage('');
      await api.put(`/cases/${caseId}`, formData);
      setSuccessMessage('Changes saved successfully.');
    } catch (err: any) {
      console.error('Update case error:', err);
      setError(err.response?.data?.detail || err.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!caseId) {
      setError('Invalid case ID');
      return;
    }

    try {
      setDeleting(true);
      setError('');
      await api.delete(`/cases/${caseId}`);
      router.push('/');
    } catch (err: any) {
      console.error('Delete case error:', err);
      setError(err.response?.data?.detail || err.message || 'Delete failed');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-700">Loading...</p>
      </div>
    );
  }

  if (unauthorized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
          <h1 className="text-2xl font-bold mb-4">Not authorized</h1>
          <p className="text-gray-600 mb-6">Only the user who created this project can modify it.</p>
          <Link href="/" className="inline-block bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Edit Project</h1>
          <Link href="/" className="text-sm bg-gray-200 text-gray-800 px-3 py-1 rounded hover:bg-gray-300">Back to Home</Link>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 mb-4 md:grid-cols-2">
            <div>
              <label className="block text-gray-700 mb-2">Type</label>
              <select value={type} onChange={(e) => setType(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" required>
                <option value="project">Project</option>
                <option value="organization">Organization</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-700 mb-2">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          <div className="grid gap-4 mb-4 md:grid-cols-2">
            <div>
              <label className="block text-gray-700 mb-2">Link (optional)</label>
              <input
                type="url"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
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

          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Keywords (comma-separated)</label>
            <input
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Agents (comma-separated)</label>
            <input
              type="text"
              value={agents}
              onChange={(e) => setAgents(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Organizations (comma-separated)</label>
            <input
              type="text"
              value={organizations}
              onChange={(e) => setOrganizations(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Image (optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImage(e.target.files?.[0] || null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          {error && <p className="text-red-600 mb-4">{error}</p>}
          {successMessage && <p className="text-green-600 mb-4">{successMessage}</p>}

          <div className="flex flex-col gap-4 md:flex-row">
            <button
              type="submit"
              disabled={saving || deleting}
              className="flex-1 bg-[#2cffb2] text-black py-2 rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={saving || deleting}
              className="flex-1 bg-[#ffb885] text-black py-2 rounded-md hover:bg-[#f2a15e] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleting ? 'Deleting...' : 'Delete Case'}
            </button>
            <Link href="/" className="flex-1 text-center bg-gray-600 text-white py-2 rounded-md hover:bg-gray-700">
              Cancel
            </Link>
          </div>
        </form>
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
    </div>
  );
}
