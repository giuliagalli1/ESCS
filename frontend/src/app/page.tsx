// app/page.tsx - Homepage
// Displays a list of case studies and sign-in button.
// If user is signed in, shows user account button instead.

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '../lib/api';

interface Case {
  id: number;
  type: string;
  name: string;
  description: string;
  image_path?: string;
  link?: string;
  location?: string;
  keywords: { name: string }[];
  agents: { name: string }[];
  organizations: { name: string }[];
}

export default function Home() {
  const [cases, setCases] = useState<Case[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);

    // Fetch cases
    api.get('/cases').then(response => {
      setCases(response.data);
    }).catch(error => {
      console.error('Error fetching cases:', error);
    });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">ESCS - Ecosocial Design Case Studies</h1>
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
          {isLoggedIn && (
            <Link href="/upload" className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700">
              Upload a Case
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cases.map((caseItem) => (
            <div key={caseItem.id} className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{caseItem.name}</h3>
              <p className="text-sm text-gray-600 mb-2">{caseItem.type}</p>
              <p className="text-gray-700 mb-4">{caseItem.description}</p>
              {caseItem.image_path && (
                <img src={`http://localhost:8000/uploads/${caseItem.image_path}`} alt={caseItem.name} className="w-full h-32 object-cover mb-4 rounded" />
              )}
              <div className="mb-2">
                <strong>Keywords:</strong> {caseItem.keywords.map(k => k.name).join(', ')}
              </div>
              <div className="mb-2">
                <strong>Agents:</strong> {caseItem.agents.map(a => a.name).join(', ')}
              </div>
              <div className="mb-2">
                <strong>Organizations:</strong> {caseItem.organizations.map(o => o.name).join(', ')}
              </div>
              {caseItem.location && <div><strong>Location:</strong> {caseItem.location}</div>}
              {caseItem.link && <a href={caseItem.link} className="text-blue-600 hover:underline">Link</a>}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
