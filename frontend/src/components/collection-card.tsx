'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '../lib/api';
import { PLACEHOLDER_CASE_IMAGE } from '../lib/placeholder-image';

interface Case {
  id: number;
  name: string;
  image_path?: string;
}

interface CollectionCardProps {
  id: number;
  name: string;
  cases: Case[];
  onEditCollection: (collectionId: number, newName: string) => Promise<void>;
  onDeleteCollection: (collectionId: number) => Promise<void>;
}

export default function CollectionCard({ id, name, cases, onEditCollection, onDeleteCollection }: CollectionCardProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(name);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    setEditName(name);
  }, [name]);

  const images = cases
    .filter(caseItem => caseItem.image_path)
    .slice(0, 4)
    .map(caseItem => caseItem.image_path!);

  return (
    <div
      className="relative h-full cursor-pointer overflow-hidden rounded-[20px] border border-[rgba(179,179,179,0.48)] bg-white font-mono shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg"
      onClick={() => {
        if (!isEditing) {
          router.push(`/collections/${id}`);
        }
      }}
    >
      {!isEditing && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
          className="absolute left-4 top-4 z-10 rounded-full bg-[#ffb885] px-3 py-1 text-[12px] font-medium text-black transition hover:bg-[#f2a15e]"
        >
          edit collection
        </button>
      )}
        {/* Image Grid */}
        <div className="grid grid-cols-2 gap-0 bg-gray-100 aspect-square">
          {images.length > 0 ? (
            images.slice(0, 4).map((imagePath, idx) => {
              let spanClass = 'col-span-1 row-span-1';

              if (images.length === 1) {
                spanClass = 'col-span-2 row-span-2';
              } else if (images.length === 2) {
                spanClass = 'col-span-2';
              } else if (images.length === 3) {
                spanClass = idx === 0 ? 'col-span-2' : 'col-span-1';
              }

              return (
                <div key={idx} className={`${spanClass} relative overflow-hidden bg-gray-200`}>
                  <img
                    src={`${API_BASE_URL}/uploads/${encodeURIComponent(imagePath)}`}
                    alt={`${name} case ${idx + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (target.src !== PLACEHOLDER_CASE_IMAGE) {
                        target.onerror = null;
                        target.src = PLACEHOLDER_CASE_IMAGE;
                      }
                    }}
                  />
                </div>
              );
            })
          ) : (
            // No images - show orange placeholder
            <div className="col-span-2 flex items-center justify-center bg-[#ffb885]">
              <svg
                className="w-16 h-16 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
              </svg>
            </div>
          )}
        </div>

        {/* Collection Info */}
        <div className="p-[22px]">
          {isEditing ? (
            <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full rounded-full border border-gray-300 px-4 py-2 focus:border-black focus:outline-none"
                placeholder="Collection name"
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!editName.trim()) {
                        setError('Name cannot be empty');
                        return;
                      }
                      setIsProcessing(true);
                      setError('');
                      try {
                        await onEditCollection(id, editName.trim());
                        setIsEditing(false);
                      } catch (err: any) {
                        setError(err?.message || 'Failed to update collection');
                      } finally {
                        setIsProcessing(false);
                      }
                    }}
                    disabled={isProcessing}
                    className="flex-1 rounded-full bg-[#2cffb2] px-3 py-2 font-medium text-black transition hover:bg-[#61ffcb] disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditName(name);
                      setError('');
                      setIsEditing(false);
                    }}
                    disabled={isProcessing}
                    className="flex h-[42px] w-[42px] items-center justify-center rounded-full border border-black bg-white px-3 py-2 font-medium text-black transition hover:bg-gray-50 disabled:opacity-50"
                    aria-label="Close edit collection"
                  >
                    <span aria-hidden="true" className="text-[18px] font-bold">
                      ×
                    </span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Delete this collection? This cannot be undone.')) {
                      onDeleteCollection(id);
                    }
                  }}
                  disabled={isProcessing}
                  className="w-full rounded-full bg-[#ffb885] px-3 py-2 font-medium text-black transition hover:bg-[#f2a15e] disabled:opacity-50"
                >
                  Delete Collection
                </button>
              </div>
            </div>
          ) : (
            <div>
              <h3 className="truncate text-[18px] font-semibold text-black">{name}</h3>
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="text-[13px] text-gray-600">
                  {cases.length} {cases.length === 1 ? 'case study' : 'case studies'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
