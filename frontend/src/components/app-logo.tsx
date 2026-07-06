'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AppLogoMark from './app-logo-mark';

export default function AppLogo({ className = '', hideNameOnMobile = false }: { className?: string; hideNameOnMobile?: boolean }) {
  const pathname = usePathname();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (pathname === '/') {
      e.preventDefault();
      window.location.href = '/';
    }
  };

  return (
    <Link href="/" onClick={handleClick} className={`flex shrink-0 items-center gap-1.5 ${className}`}>
      <AppLogoMark className="h-[68px] w-[68px]" />
      <span className={`text-[28px] font-semibold text-white ${hideNameOnMobile ? 'hidden sm:inline' : ''}`}>Terrarium</span>
    </Link>
  );
}
