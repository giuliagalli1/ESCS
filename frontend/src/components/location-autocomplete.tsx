'use client';

import { useEffect, useRef, useState } from 'react';

export interface LocationResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address: Record<string, string>;
}

interface LocationAutocompleteProps {
  value: string;
  selectedLocation: LocationResult | null;
  onValueChange: (value: string) => void;
  onSelectLocation: (location: LocationResult | null) => void;
  label?: string;
  placeholder?: string;
}

export default function LocationAutocomplete({
  value,
  selectedLocation,
  onValueChange,
  onSelectLocation,
  label = 'Location (optional)',
  placeholder = 'Start typing an address…',
}: LocationAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<LocationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (!value.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const delay = window.setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(
            value
          )}`
        );
        const results = (await response.json()) as LocationResult[];
        setSuggestions(results);
        setShowSuggestions(true);
      } catch (err) {
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => window.clearTimeout(delay);
  }, [value]);

  const handleSelect = (suggestion: LocationResult) => {
    onValueChange(suggestion.display_name);
    onSelectLocation(suggestion);
    setShowSuggestions(false);
  };

  const handleInputChange = (input: string) => {
    onValueChange(input);
    if (selectedLocation && input !== selectedLocation.display_name) {
      onSelectLocation(null);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-gray-700 mb-2">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => value.trim() && setShowSuggestions(true)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-md"
      />
      {showSuggestions && (suggestions.length > 0 || isLoading) && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
          {isLoading ? (
            <div className="p-3 text-gray-500">Searching addresses…</div>
          ) : (
            suggestions.map((suggestion) => (
              <button
                key={suggestion.place_id}
                type="button"
                onMouseDown={() => handleSelect(suggestion)}
                className="w-full text-left px-3 py-3 hover:bg-gray-100"
              >
                <div className="text-sm font-medium text-gray-900">{suggestion.display_name}</div>
                <div className="text-xs text-gray-500">{suggestion.address.city || suggestion.address.town || suggestion.address.village || suggestion.address.state || suggestion.address.country}</div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
