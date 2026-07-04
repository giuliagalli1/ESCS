// app/account/page.tsx - User account page
// Shows user's collections and allows creating new ones.
// Allows adding cases to collections.

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../lib/api';
import AppLogo from '../../components/app-logo';

interface Collection {
  id: number;
  name: string;
  cases: Case[];
}

interface Case {
  id: number;
  name: string;
  description: string;
}

export default function Account() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [allCases, setAllCases] = useState<Case[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<number | null>(null);
  const [selectedCase, setSelectedCase] = useState<number | null>(null);
  const [error, setError] = useState('');
  const router = useRouter();

  const savedCollection = collections.find((collection) => collection.name.toLowerCase() === 'saved');
  const otherCollections = collections.filter((collection) => collection.name.toLowerCase() !== 'saved');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/signin');
      return;
    }

    fetchCollections();
    fetchCases();
  }, []);

  const fetchCollections = async () => {
    try {
      const response = await api.get('/collections');
      setCollections(response.data);
    } catch (err) {
      setError('Error fetching collections');
    }
  };

  const fetchCases = async () => {
    try {
      const response = await api.get('/cases');
      setAllCases(response.data);
    } catch (err) {
      setError('Error fetching cases');
    }
  };

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/collections', null, { params: { name: newCollectionName } });
      setNewCollectionName('');
      fetchCollections();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error creating collection');
    }
  };

  const handleAddToCollection = async () => {
    if (!selectedCollection || !selectedCase) return;
    try {
      await api.post(`/collections/${selectedCollection}/cases/${selectedCase}`);
      fetchCollections();
      setSelectedCollection(null);
      setSelectedCase(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error adding to collection');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_email');
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-20 bg-black px-4 py-4 sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <AppLogo />
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => router.push('/')}
              className="rounded-full border border-white/70 px-5 py-2 text-[15px] font-medium text-white transition hover:bg-white/10"
            >
              Home
            </button>
            <button
              onClick={handleLogout}
              className="rounded-full bg-[#ffb885] px-5 py-2 text-[15px] font-medium text-black transition hover:bg-[#f2a15e]"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New Collection</h2>
          <form onSubmit={handleCreateCollection} className="flex flex-col gap-4 sm:flex-row">
            <input
              type="text"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              placeholder="Collection name"
              className="px-3 py-2 border border-gray-300 rounded-md flex-1"
              required
            />
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
              Create
            </button>
          </form>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Add Case to Collection</h2>
          <div className="flex flex-col gap-4 lg:flex-row mb-4">
            <select value={selectedCollection || ''} onChange={(e) => setSelectedCollection(Number(e.target.value))} className="px-3 py-2 border border-gray-300 rounded-md w-full lg:w-auto">
              <option value="">Select Collection</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <select value={selectedCase || ''} onChange={(e) => setSelectedCase(Number(e.target.value))} className="px-3 py-2 border border-gray-300 rounded-md w-full lg:w-auto">
              <option value="">Select Case</option>
              {allCases.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button onClick={handleAddToCollection} className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 w-full lg:w-auto">
              Add
            </button>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Saved Projects</h2>
          {savedCollection ? (
            <div className="bg-white rounded-lg shadow-md p-6 mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{savedCollection.name}</h3>
              {savedCollection.cases.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {savedCollection.cases.map((caseItem) => (
                    <div key={caseItem.id} className="border rounded p-4">
                      <h4 className="font-semibold">{caseItem.name}</h4>
                      <p className="text-sm text-gray-600">{caseItem.description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-600">You haven't saved any projects yet.</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-600">Saved projects will appear here once you save them from the homepage.</p>
          )}
        </div>

        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">My Collections</h2>
          {otherCollections.map((collection) => (
            <div key={collection.id} className="bg-white rounded-lg shadow-md p-6 mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{collection.name}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {collection.cases.map((caseItem) => (
                  <div key={caseItem.id} className="border rounded p-4">
                    <h4 className="font-semibold">{caseItem.name}</h4>
                    <p className="text-sm text-gray-600">{caseItem.description}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {error && <p className="text-red-600 mt-4">{error}</p>}
      </main>
    </div>
  );
}