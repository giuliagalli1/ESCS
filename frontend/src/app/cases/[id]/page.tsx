'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '../../../lib/api';

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

export default function CaseDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const caseId = params?.id;
  const [caseItem, setCaseItem] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!caseId) {
      setError('Invalid case ID');
      setLoading(false);
      return;
    }

    const fetchCase = async () => {
      try {
        const response = await api.get(`/cases/${caseId}`);
        setCaseItem(response.data);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Unable to load case');
      } finally {
        setLoading(false);
      }
    };

    fetchCase();
  }, [caseId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-700">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
          <h1 className="text-2xl font-bold mb-4">Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button onClick={() => router.push('/')} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (!caseItem) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-wide">{caseItem.type}</p>
            <h1 className="text-3xl font-bold text-gray-900">{caseItem.name}</h1>
          </div>
          <Link href="/" className="text-blue-600 hover:underline">Back to Home</Link>
        </div>

        {caseItem.image_path && (
          <img
            src={`http://localhost:8000/uploads/${caseItem.image_path}`}
            alt={caseItem.name}
            className="w-full h-80 object-cover rounded-lg shadow-md mb-8"
          />
        )}

        <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Description</h2>
            <p className="text-gray-700 whitespace-pre-line">{caseItem.description}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Keywords</h3>
              <p className="text-gray-700 mt-1">{caseItem.keywords.map((kw) => kw.name).join(', ') || 'None'}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Agents</h3>
              <p className="text-gray-700 mt-1">{caseItem.agents.map((ag) => ag.name).join(', ') || 'None'}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Organizations</h3>
              <p className="text-gray-700 mt-1">{caseItem.organizations.map((org) => org.name).join(', ') || 'None'}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Location</h3>
              <p className="text-gray-700 mt-1">
                {caseItem.location
                  ? typeof caseItem.location === 'string'
                    ? caseItem.location
                    : caseItem.location.display_name
                  : 'None'}
              </p>
            </div>
          </div>

          {caseItem.link && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Link</h3>
              <a href={caseItem.link} className="text-blue-600 hover:underline" target="_blank" rel="noreferrer">
                {caseItem.link}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
