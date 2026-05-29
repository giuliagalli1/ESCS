// app/upload/page.tsx - Upload case page
// Step-by-step form for uploading a new case study.
// Checks for duplicates and guides user through the process.

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
  const [organizationMatchConfirmed, setOrganizationMatchConfirmed] = useState<boolean | null>(null);
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
    if (type) setStep(2);
  };

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await api.get('/cases');
      const allCases: Case[] = response.data;

      if (type === 'organization') {
        const matches = allCases.filter((c) =>
          c.organizations.some((org) => {
            const on = org.name.toLowerCase();
            const q = name.toLowerCase().trim();
            return on.includes(q) || q.includes(on);
          })
        );
        setOrganizationMatches(matches);
      } else {
        const cases = allCases.filter((c) => c.name.toLowerCase().includes(name.toLowerCase()));
        setExistingCases(cases);
      }

      setStep(3);
    } catch (err) {
      setError('Error checking existing cases');
    }
  };

  const handleDuplicateChoice = (choice: string) => {
    if (choice === 'new') {
      setSelectedCase(null);
      setOrganizationMatchConfirmed(false);
      setStep(4);
    } else if (choice === 'modify' && selectedCase) {
      setStep(4);
    }
  };

  const handleOrganizationMatchChoice = (confirmed: boolean) => {
    setOrganizationMatchConfirmed(confirmed);
    setStep(4);
  };

  const saveUploadedCaseToSavedCollection = async (caseId: number) => {
    try {
      const collectionsResponse = await api.get('/collections');
      const savedCollection = collectionsResponse.data.find((collection: any) => collection.name.toLowerCase() === 'saved');
      let collectionId = savedCollection?.id;

      if (!collectionId) {
        const createResponse = await api.post('/collections', null, { params: { name: 'Saved' } });
        collectionId = createResponse.data.id;
      }

      await api.post(`/collections/${collectionId}/cases/${caseId}`);
    } catch (err) {
      console.error('Error saving uploaded case to Saved collection:', err);
    }
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      let organizationList: string[] = [];
      if (organizationMatchConfirmed && selectedExistingOrg) {
        organizationList = [selectedExistingOrg];
      } else {
        organizationList = [];
      }
      formData.append('organizations', organizationList.join(','));
    } else {
      formData.append('organizations', organizations);
    }
    if (image) formData.append('image', image);

    try {
      const response = await api.post('/cases', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await saveUploadedCaseToSavedCollection(response.data.id);
      router.push('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Upload failed');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6">Upload a Case</h1>

        {step === 1 && (
          <form onSubmit={handleTypeSubmit}>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">What do you want to upload?</label>
              <select value={type} onChange={(e) => setType(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" required>
                <option value="">Select type</option>
                <option value="project">Project</option>
                <option value="organization">Organization</option>
              </select>
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700">Next</button>
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
            <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700">Check</button>
          </form>
        )}

        {step === 3 && (
          <div>
            {type === 'organization' ? (
              organizationMatches.length > 0 ? (
                <div>
                  <p className="mb-4">This organization appears in the following case studies. Which canonical organization should we connect to?</p>
                  {/* derive distinct organization names from matches */}
                  {Array.from(new Set(organizationMatches.flatMap(c => c.organizations.map(o => o.name)))).map((orgName) => (
                    <div key={orgName} className="mb-2 p-2 border rounded flex items-center justify-between">
                      <div>
                        <p className="font-medium">{orgName}</p>
                        <p className="text-sm text-gray-600">Appears in: {organizationMatches.filter(c => c.organizations.some(o => o.name === orgName)).map(c => c.name).join(', ')}</p>
                      </div>
                      <div>
                        <button onClick={() => { setSelectedExistingOrg(orgName); setOrganizationMatchConfirmed(true); setStep(4); }} className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700">Connect this</button>
                      </div>
                    </div>
                  ))}
                  <div className="mt-4">
                    <button onClick={() => { setSelectedExistingOrg(null); setOrganizationMatchConfirmed(false); setStep(4); }} className="w-full bg-gray-600 text-white py-2 rounded-md hover:bg-gray-700">No, create separate organization</button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="mb-4">No existing organization matches found. Continue to upload.</p>
                  <button onClick={() => { setSelectedExistingOrg(null); setOrganizationMatchConfirmed(false); setStep(4); }} className="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700">Continue</button>
                </div>
              )
            ) : (
              existingCases.length > 0 ? (
                <div>
                  <p className="mb-4">Similar {type}s found:</p>
                  {existingCases.map((c) => (
                    <div key={c.id} className="mb-2 p-2 border rounded">
                      <p><strong>{c.name}</strong></p>
                      <p>Keywords: {c.keywords.map(k => k.name).join(', ')}</p>
                      <button onClick={() => { setSelectedCase(c); handleDuplicateChoice('modify'); }} className="mr-2 bg-yellow-600 text-white px-2 py-1 rounded">Modify this</button>
                    </div>
                  ))}
                  <button onClick={() => handleDuplicateChoice('new')} className="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700 mt-4">Create New</button>
                </div>
              ) : (
                <div>
                  <p className="mb-4">No similar {type}s found. Proceed to create new.</p>
                  <button onClick={() => handleDuplicateChoice('new')} className="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700">Continue</button>
                </div>
              )
            )}
          </div>
        )}

        {step === 4 && (
          <form onSubmit={handleFinalSubmit}>
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
            <button type="submit" className="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700">Upload {type}</button>
          </form>
        )}

        <p className="text-center mt-4">
          <button onClick={() => router.push('/')} className="text-gray-600 hover:underline">Back to Home</button>
        </p>
      </div>
    </div>
  );
}