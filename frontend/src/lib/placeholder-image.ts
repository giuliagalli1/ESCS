// Local, dependency-free fallback shown when a case study's uploaded image
// is missing or fails to load, so the UI never shows a broken image icon.
export const PLACEHOLDER_CASE_IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">'
  + '<rect width="400" height="300" fill="#f0f0f0"/>'
  + '<g fill="none" stroke="#ffb885" stroke-width="8" stroke-linecap="round" stroke-linejoin="round">'
  + '<rect x="60" y="70" width="280" height="180" rx="14"/>'
  + '<circle cx="150" cy="140" r="22"/>'
  + '<path d="M60 222 L155 148 L212 198 L262 158 L340 220"/>'
  + '</g>'
  + '</svg>',
)}`;
