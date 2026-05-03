// app/account/page.tsx - User account page
// Shows user's collections and allows creating new ones.
// Allows adding cases to collections.

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../lib/api';

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
      await api.post('/collections', { name: newCollectionName });
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
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">My Account</h1>
            <div>
              <button onClick={handleLogout} className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 mr-4">
                Logout
              </button>
              <button onClick={() => router.push('/')} className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700">
                Home
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New Collection</h2>
          <form onSubmit={handleCreateCollection} className="flex gap-4">
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
          <div className="flex gap-4 mb-4">
            <select value={selectedCollection || ''} onChange={(e) => setSelectedCollection(Number(e.target.value))} className="px-3 py-2 border border-gray-300 rounded-md">
              <option value="">Select Collection</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <select value={selectedCase || ''} onChange={(e) => setSelectedCase(Number(e.target.value))} className="px-3 py-2 border border-gray-300 rounded-md">
              <option value="">Select Case</option>
              {allCases.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button onClick={handleAddToCollection} className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700">
              Add
            </button>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">My Collections</h2>
          {collections.map((collection) => (
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