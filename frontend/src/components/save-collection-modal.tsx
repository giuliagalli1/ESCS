'use client';

import { useMemo, useState } from 'react';
import api from '../lib/api';

interface Collection {
  id: number;
  name: string;
  cases: Pick<{ id: number }, 'id'>[];
}

interface SaveCollectionModalProps {
  isOpen: boolean;
  caseId: number;
  collections: Collection[];
  onClose: () => void;
  onAddToCollection: (collectionId: number) => Promise<void>;
  onRemoveFromCollection: (collectionId: number) => Promise<void>;
  onCollectionsChange: (collections: Collection[]) => void;
}

export default function SaveCollectionModal({
  isOpen,
  caseId,
  collections,
  onClose,
  onAddToCollection,
  onRemoveFromCollection,
  onCollectionsChange,
}: SaveCollectionModalProps) {
  const [view, setView] = useState<'list' | 'create'>('list');
  const [search, setSearch] = useState('');
  const [newCollectionName, setNewCollectionName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const collectionsWithCase = useMemo(
    () => collections.filter((c) => c.cases.some((caseItem) => caseItem.id === caseId)),
    [collections, caseId],
  );

  const filteredCollections = useMemo(
    () => collections.filter((c) => c.name.toLowerCase().includes(search.trim().toLowerCase())),
    [collections, search],
  );

  if (!isOpen) return null;

  const handleClose = () => {
    setView('list');
    setSearch('');
    setNewCollectionName('');
    setError('');
    onClose();
  };

  const handleToggleCollection = async (collectionId: number, isSelected: boolean) => {
    setIsLoading(true);
    setError('');

    try {
      if (isSelected) {
        await onRemoveFromCollection(collectionId);
      } else {
        await onAddToCollection(collectionId);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update collection');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollectionName.trim()) {
      setError('Collection name cannot be empty');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await api.post('/collections', null, { params: { name: newCollectionName } });
      const newCollection: Collection = response.data;
      onCollectionsChange([newCollection, ...collections]);

      await onAddToCollection(newCollection.id);

      setNewCollectionName('');
      setView('list');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create collection');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-md rounded-[32px] bg-white p-8 font-mono shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {view === 'list' ? (
          <>
            <h2 className="text-center text-[24px] font-bold text-black">Save to collection</h2>

            {error && (
              <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
            )}

            <div className="mt-6 rounded-[24px] bg-black p-3">
              <div className="flex items-center justify-between rounded-full border border-white/40 px-4 py-2">
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="search collection"
                  className="w-full bg-transparent text-[14px] text-white placeholder:text-white/50 focus:outline-none [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none"
                />
                {search ? (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    aria-label="Clear search"
                    className="ml-2 flex h-4 w-4 shrink-0 items-center justify-center text-white"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="h-full w-full">
                      <path d="m6 6 12 12" />
                      <path d="m18 6-12 12" />
                    </svg>
                  </button>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="ml-2 h-4 w-4 shrink-0 text-white">
                    <circle cx="11" cy="11" r="6" />
                    <path d="m16 16 4.5 4.5" />
                  </svg>
                )}
              </div>

              <div className="mt-2 max-h-64 space-y-2 overflow-y-auto pr-1">
                {filteredCollections.length === 0 ? (
                  <p className="px-2 py-4 text-center text-[13px] text-white/60">No collections found</p>
                ) : (
                  filteredCollections.map((collection) => {
                    const isSelected = collection.cases.some((c) => c.id === caseId);
                    return (
                      <button
                        key={collection.id}
                        type="button"
                        disabled={isLoading}
                        onClick={() => handleToggleCollection(collection.id, isSelected)}
                        className={`w-full rounded-[16px] px-4 py-3 text-left transition disabled:opacity-50 ${
                          isSelected ? 'bg-[#ffb885]' : 'bg-white hover:bg-gray-100'
                        }`}
                      >
                        <p className="text-[15px] font-semibold text-black">{collection.name}</p>
                        <p className={`text-[12px] ${isSelected ? 'text-black/70' : 'text-gray-500'}`}>
                          {collection.cases.length} case {collection.cases.length === 1 ? 'study' : 'studies'}
                        </p>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-full border border-black bg-white px-6 py-2 text-[15px] font-medium text-black transition hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setView('create')}
                className="rounded-full bg-[#2cffb2] px-6 py-2 text-[15px] font-medium text-black transition hover:opacity-90"
              >
                + New collection
              </button>
              {collectionsWithCase.length > 0 && (
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-full bg-[#ffb885] px-6 py-2 text-[15px] font-medium text-black transition hover:bg-[#f2a15e]"
                >
                  Save
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            <h2 className="text-center text-[24px] font-bold text-black">Create new collection</h2>

            {error && (
              <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
            )}

            <form onSubmit={handleCreateCollection}>
              <div className="mt-6 rounded-[24px] bg-black p-6">
                <label className="text-[11px] font-medium uppercase tracking-[0.15em] text-white/70">
                  Name the new collection
                </label>
                <input
                  type="text"
                  value={newCollectionName}
                  onChange={(e) => {
                    setNewCollectionName(e.target.value);
                    setError('');
                  }}
                  autoFocus
                  className="mt-3 w-full rounded-full border border-white/40 bg-transparent px-4 py-2 text-[14px] text-white placeholder:text-white/40 focus:border-white focus:outline-none"
                />
              </div>

              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setView('list');
                    setNewCollectionName('');
                    setError('');
                  }}
                  disabled={isLoading}
                  className="rounded-full border border-black bg-white px-6 py-2 text-[15px] font-medium text-black transition hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="rounded-full bg-[#adbdff] px-6 py-2 text-[15px] font-medium text-black transition hover:opacity-90 disabled:opacity-50"
                >
                  {isLoading ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
