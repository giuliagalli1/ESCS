import type { NextConfig } from "next";

// Origins allowed to reach the dev server's internal endpoints (/_next/*).
// Configurable via FRONTEND_URL (set by start.sh); localhost is always allowed.
// Next.js expects bare hostnames here, so strip the scheme/port from the URL.
const hostnameOf = (url?: string): string | null => {
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
};

const allowedDevOrigins = [
  "localhost",
  "127.0.0.1",
  hostnameOf(process.env.FRONTEND_URL),
].filter((h): h is string => Boolean(h));

const nextConfig: NextConfig = {
  allowedDevOrigins,
};

export default nextConfig;
