'use client';

import Link from 'next/link';
import AppLogoMark from './app-logo-mark';

export default function AppLogo({ className = '' }: { className?: string }) {
  return (
    <Link href="/" className={`flex shrink-0 items-center gap-1.5 ${className}`}>
      <AppLogoMark className="h-[52px] w-[52px]" />
      <span className="text-[28px] font-semibold text-white">Terrarium</span>
    </Link>
  );
}
