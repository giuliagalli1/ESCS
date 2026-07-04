'use client';

import { useState } from 'react';
import api from '../lib/api';
import LocationAutocomplete, { LocationResult } from './location-autocomplete';

interface Case {
  id: number;
  name: string;
  keywords: { name: string }[];
  agents: { name: string }[];
  organizations: { name: string }[];
}

interface UploadCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploaded: () => Promise<void> | void;
}

export default function UploadCaseModal({ isOpen, onClose, onUploaded }: UploadCaseModalProps) {
  const [step, setStep] = useState(1);
  const [type, setType] = useState('');
  const [name, setName] = useState('');
  const [existingCases, setExistingCases] = useState<Case[]>([]);
  const [organizationMatches, setOrganizationMatches] = useState<Case[]>([]);
  const [selectedExistingOrg, setSelectedExistingOrg] = useState<string | null>(null);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [description, setDescription] = useState('');
  const [link, setLink] = useState('');
  const [locationInput, setLocationInput] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<LocationResult | null>(null);
  const [keywords, setKeywords] = useState('');
  const [agents, setAgents] = useState('');
  const [organizations, setOrganizations] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const resetState = () => {
    setStep(1);
    setType('');
    setName('');
    setExistingCases([]);
    setOrganizationMatches([]);
    setSelectedExistingOrg(null);
    setSelectedCase(null);
    setDescription('');
    setLink('');
    setLocationInput('');
    setSelectedLocation(null);
    setKeywords('');
    setAgents('');
    setOrganizations('');
    setImage(null);
    setError('');
    setLoading(false);
  };

  const closeModal = () => {
    resetState();
    onClose();
  };

  const saveUploadedCaseToSavedCollection = async (caseId: number) => {
    try {
      const collectionsResponse = await api.get('/collections');
      type CollectionResponse = { id: number; name: string };
      const savedCollection = (collectionsResponse.data as CollectionResponse[]).find((collection) => collection.name.toLowerCase() === 'saved');
      let collectionId = savedCollection?.id;

      if (!collectionId) {
        const createResponse = await api.post('/collections', null, { params: { name: 'Saved' } });
        collectionId = createResponse.data.id;
      }

      if (collectionId) {
        await api.post(`/collections/${collectionId}/cases/${caseId}`);
      }
    } catch (error: unknown) {
      console.error('Error saving uploaded case to Saved collection:', error);
    }
  };

  const handleTypeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (type) {
      setStep(2);
    }
  };

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await api.get('/cases');
      const allCases: Case[] = response.data;

      if (type === 'organization') {
        const query = name.trim().toLowerCase();
        const matches = allCases.filter((c) => {
          const caseName = c.name?.trim().toLowerCase() || '';
          const orgNames = c.organizations?.map((org) => org.name.trim().toLowerCase()) || [];
          return (
            caseName === query ||
            orgNames.some((orgName) => orgName === query || orgName.includes(query) || query.includes(orgName))
          );
        });

        setOrganizationMatches(matches);
        setSelectedExistingOrg(null);
      } else {
        const cases = allCases.filter((c) => c.name.toLowerCase().includes(name.toLowerCase()));
        setExistingCases(cases);
      }

      setStep(3);
    } catch {
      setError('Error checking existing cases');
    }
  };

  const handleDuplicateChoice = (choice: string) => {
    if (choice === 'new') {
      setSelectedCase(null);
      setStep(4);
    } else if (choice === 'modify' && selectedCase) {
      setStep(4);
    }
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

      if (type === 'organization') {
        const organizationName = selectedExistingOrg?.trim() || name.trim();
        formData.append('organizations', organizationName);
      } else {
        formData.append('organizations', organizations);
      }

      if (image) {
        formData.append('image', image);
      }

      const response = await api.post('/cases', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      await saveUploadedCaseToSavedCollection(response.data.id);
      await onUploaded();
      closeModal();
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error) {
        const typedError = error as { response?: { data?: { detail?: string } } };
        setError(typedError.response?.data?.detail || 'Upload failed');
      } else {
        setError('Upload failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className="bg-white/95 rounded-lg shadow-2xl ring-1 ring-slate-900/10 max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-wide">Upload a Case</p>
            <h1 className="text-3xl font-bold text-gray-900">New Case Study</h1>
          </div>
          <button
            onClick={closeModal}
            className="bg-gray-400 text-white px-4 py-2 rounded-md hover:bg-gray-500"
          >
            Close
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        {step === 1 && (
          <form onSubmit={handleTypeSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-700 mb-2">What do you want to upload?</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              >
                <option value="">Select type</option>
                <option value="project">Project</option>
                <option value="organization">Organization</option>
              </select>
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700">
              Next
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleNameSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-700 mb-2">Enter the {type} name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setStep(1)} className="flex-1 border border-gray-300 px-4 py-2 rounded-md hover:bg-gray-50">
                Back
              </button>
              <button type="submit" className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                Check
              </button>
            </div>
          </form>
        )}

        {step === 3 && (
          <div className="space-y-4">
            {type === 'organization' ? (
              organizationMatches.length > 0 ? (
                <div>
                  <p className="mb-4">This organization appears in the following case studies. Which canonical organization should we connect to?</p>
                  {Array.from(new Set(organizationMatches.flatMap((c) => c.organizations.map((o) => o.name)))).map((orgName) => (
                    <div key={orgName} className="mb-2 p-2 border rounded flex items-center justify-between">
                      <div>
                        <p className="font-medium">{orgName}</p>
                        <p className="text-sm text-gray-600">Appears in: {organizationMatches.filter((c) => c.organizations.some((o) => o.name === orgName)).map((c) => c.name).join(', ')}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedExistingOrg(orgName);
                          setStep(4);
                        }}
                        className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700"
                      >
                        Connect this
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedExistingOrg(null);
                      setStep(4);
                    }}
                    className="w-full bg-gray-600 text-white py-2 rounded-md hover:bg-gray-700"
                  >
                    No, create separate organization
                  </button>
                </div>
              ) : (
                <div>
                  <p className="mb-4">No existing organization matches found. Continue to upload.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedExistingOrg(null);
                      setStep(4);
                    }}
                    className="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700"
                  >
                    Continue
                  </button>
                </div>
              )
            ) : existingCases.length > 0 ? (
              <div>
                <p className="mb-4">Similar {type}s found:</p>
                {existingCases.map((c) => (
                  <div key={c.id} className="mb-2 p-2 border rounded">
                    <p><strong>{c.name}</strong></p>
                    <p>Keywords: {c.keywords.map((k) => k.name).join(', ')}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCase(c);
                        handleDuplicateChoice('modify');
                      }}
                      className="mr-2 bg-yellow-600 text-white px-2 py-1 rounded hover:bg-yellow-700"
                    >
                      Modify this
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => handleDuplicateChoice('new')}
                  className="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700"
                >
                  Create New
                </button>
              </div>
            ) : (
              <div>
                <p className="mb-4">No similar {type}s found. Proceed to create new.</p>
                <button
                  type="button"
                  onClick={() => handleDuplicateChoice('new')}
                  className="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700"
                >
                  Continue
                </button>
              </div>
            )}
            <button type="button" onClick={() => setStep(2)} className="text-blue-600 hover:underline">
              Back
            </button>
          </div>
        )}

        {step === 4 && (
          <form onSubmit={handleFinalSubmit} className="space-y-4">
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Link (optional)</label>
              <input
                type="url"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div className="mb-4">
              <LocationAutocomplete
                value={locationInput}
                selectedLocation={selectedLocation}
                onValueChange={setLocationInput}
                onSelectLocation={setSelectedLocation}
                label="Location (optional)"
                placeholder="Search for an address or place"
              />
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

            {type !== 'organization' && (
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
            )}

            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Image (optional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImage(e.target.files?.[0] || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <p className="text-sm text-gray-600 mb-4">This upload will also be saved to your gallery so you can find it later.</p>
            {error && <p className="text-red-600 mb-4">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Uploading...' : `Upload ${type}`}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
