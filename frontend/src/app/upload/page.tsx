// app/upload/page.tsx - Upload case page
// Step-by-step form for uploading a new case study.
// Checks for duplicates and guides user through the process.

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon } from 'lucide-react';
import api from '../../lib/api';
import LocationAutocomplete, { LocationResult } from '../../components/location-autocomplete';

interface Case {
  id: number;
  name: string;
  keywords: { name: string }[];
  agents: { name: string }[];
  organizations: { name: string }[];
}

export default function Upload() {
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
  const router = useRouter();

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

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const formData = new FormData();
      formData.append('type', type);
      formData.append('name', name.trim());
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
        const orgName = selectedExistingOrg?.trim() || name.trim();
        formData.append('organizations', orgName);
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
      router.push('/');
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const typedError = err as { response?: { data?: { detail?: string } } };
        setError(typedError.response?.data?.detail || 'Upload failed');
      } else {
        setError('Upload failed');
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl bg-white p-8 rounded-3xl shadow-lg">
        <div className="mb-8 flex items-center gap-4">
          <Link
            href="/collections"
            aria-label="Back to Collections"
            className="flex h-[45px] w-[45px] shrink-0 items-center justify-center rounded-full border border-black text-black transition hover:bg-gray-100"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-[32px] font-bold text-black">Upload a Case</h1>
            <p className="mt-1 text-gray-600">Follow the steps to add a new case study to the platform.</p>
          </div>
        </div>

        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-3xl">
          {step === 1 && (
            <form onSubmit={handleTypeSubmit}>
              <div className="mb-4">
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
            <form onSubmit={handleNameSubmit}>
              <div className="mb-4">
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
              <button type="submit" className="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700">
                Upload {type}
              </button>
            </form>
          )}

          <p className="text-center mt-4">
            <button onClick={() => router.push('/')} className="text-gray-600 hover:underline">Back to Home</button>
          </p>
        </div>
      </div>
    </div>
  );
}
