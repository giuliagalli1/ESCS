// app/page.tsx - Homepage
// Displays a list of case studies and sign-in button.
// If user is signed in, shows user account button instead.

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import api, { API_BASE_URL } from '../lib/api';

type CaseLocation = string | { display_name: string } | undefined;

interface Case {
  id: number;
  type: string;
  name: string;
  description: string;
  image_path?: string;
  link?: string;
  location?: CaseLocation;
  user_id?: number;
  keywords: { name: string }[];
  agents: { name: string }[];
  organizations: { name: string }[];
}

interface Collection {
  id: number;
  name: string;
  cases: Pick<Case, 'id'>[];
}

export default function Home() {
  const [cases, setCases] = useState<Case[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [savedCollectionId, setSavedCollectionId] = useState<number | null>(null);
  const [savedCaseIds, setSavedCaseIds] = useState<number[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number>(0);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);

    api.get('/cases').then(response => {
      setCases(response.data);
    }).catch(error => {
      console.error('Error fetching cases:', error);
    });

    const uid = Number(localStorage.getItem('user_id') || '0');
    setCurrentUserId(uid);

    if (token) {
      fetchCollections();
    }
  }, []);

  const fetchCollections = async () => {
    try {
      const response = await api.get<Collection[]>('/collections');
      setCollections(response.data);
      const saved = response.data.find((collection) => collection.name.toLowerCase() === 'saved');
      if (saved) {
        setSavedCollectionId(saved.id);
        setSavedCaseIds(saved.cases.map(c => c.id));
      }
    } catch (err) {
      console.error('Error fetching collections:', err);
    }
  };

  const handleSaveCase = async (caseId: number) => {
    try {
      let collectionId = savedCollectionId;
      if (!collectionId) {
        const createResponse = await api.post('/collections', null, { params: { name: 'Saved' } });
        collectionId = createResponse.data.id;
        setSavedCollectionId(collectionId);
        setCollections(prev => [...prev, createResponse.data]);
      }

      await api.post(`/collections/${collectionId}/cases/${caseId}`);
      setSavedCaseIds(prev => prev.includes(caseId) ? prev : [...prev, caseId]);
    } catch (err) {
      console.error('Error saving case:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-gray-900">ESCS</h1>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, keyword, organization, agent, location"
                className="px-3 py-2 border border-gray-300 rounded-md w-80"
              />
            </div>
            <div>
              {isLoggedIn ? (
                <Link href="/account" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                  User Account
                </Link>
              ) : (
                <Link href="/signin" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Case Studies</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cases
            .filter((caseItem) => {
              const q = search.trim().toLowerCase();
              if (!q) return true;
              const inName = caseItem.name?.toLowerCase().includes(q);
              const inKeywords = caseItem.keywords?.some(k => k.name.toLowerCase().includes(q));
              const inOrgs = caseItem.organizations?.some(o => o.name.toLowerCase().includes(q));
              const inAgents = caseItem.agents?.some(a => a.name.toLowerCase().includes(q));
              const loc = caseItem.location;
              let inLocation = false;
              if (loc) {
                if (typeof loc === 'string') inLocation = loc.toLowerCase().includes(q);
                else if ((loc as any).display_name) inLocation = (loc as any).display_name.toLowerCase().includes(q);
              }
              return Boolean(inName || inKeywords || inOrgs || inAgents || inLocation);
            })
            .map((caseItem) => (
            <div key={caseItem.id} className="relative bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition">
              <div className="flex items-center justify-between mb-3">
                <Link href={`/cases/${caseItem.id}`} className="text-lg font-semibold text-gray-900 hover:underline">
                  {caseItem.name}
                </Link>
                <div className="flex items-center gap-2">
                  <span className="text-sm px-2 py-1 rounded bg-gray-100 text-gray-700">{caseItem.type}</span>
                  {currentUserId && caseItem.user_id === currentUserId && (
                    <Link href={`/edit/${caseItem.id}`} className="text-xs bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600">
                      Edit
                    </Link>
                  )}
                </div>
              </div>
              {caseItem.image_path ? (
                <img src={`${API_BASE_URL}/uploads/${caseItem.image_path}`} alt={caseItem.name} className="w-full h-36 object-cover mb-3 rounded" />
              ) : (
                <div className="w-full h-36 bg-gray-100 mb-3 rounded flex items-center justify-center text-gray-400">No image</div>
              )}

              <div className="text-sm text-gray-700 mb-2">
                <strong>Keywords:</strong>{' '}{caseItem.keywords.map(k => k.name).join(', ')}
              </div>

              <div className="text-sm text-gray-700 pb-12">
                <strong>Organizations:</strong>{' '}{caseItem.organizations.map(o => o.name).join(', ')}
              </div>

              {isLoggedIn && (
                <button
                  type="button"
                  onClick={() => handleSaveCase(caseItem.id)}
                  className={`absolute bottom-4 right-4 inline-flex h-11 w-11 items-center justify-center rounded-full text-lg shadow-lg transition ${savedCaseIds.includes(caseItem.id) ? 'bg-gray-300 text-gray-800' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                  aria-label={savedCaseIds.includes(caseItem.id) ? 'Saved' : 'Save to Gallery'}
                >
                  {savedCaseIds.includes(caseItem.id) ? '★' : '☆'}
                </button>
              )}
            </div>
          ))}
        </div>
      </main>

      {isLoggedIn && (
        <Link
          href="/upload"
          className="fixed bottom-6 left-1/2 z-20 -translate-x-1/2 rounded-full bg-green-600 p-4 text-white shadow-lg shadow-green-600/30 transition hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          aria-label="Upload a Case"
        >
          <span className="text-3xl leading-none">+</span>
          <span className="sr-only">Upload a Case</span>
        </Link>
      )}
    </div>
  );
}
