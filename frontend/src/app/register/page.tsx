// app/register/page.tsx - Registration page
// Allows new users to create an account with UNIBZ email.

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '../../lib/api';
import AppLogo from '../../components/app-logo';

function CloseIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </svg>
  );
}

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/register', { email, password });
      router.push('/signin');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed');
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      <div aria-hidden className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(173,189,255,0.25),_transparent_40%),linear-gradient(135deg,_#0f172a,_#111827)]" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between bg-black px-4 py-4 sm:px-8">
          <AppLogo />
          <Link href="/" aria-label="Close" className="flex h-[50px] w-[50px] items-center justify-center rounded-full border border-white/70">
            <CloseIcon className="h-8 w-8 text-white" />
          </Link>
        </header>

        <div className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <div className="w-full max-w-[795px] rounded-[40px] border border-[#a8a8a8] bg-white/95 px-6 py-8 shadow-2xl sm:px-10 sm:py-10 lg:px-[60px] lg:py-[50px]">
            <h1 className="text-center text-[34px] font-semibold text-black sm:text-[50px]">Register</h1>

            <form onSubmit={handleSubmit} className="mx-auto mt-8 flex max-w-[712px] flex-col gap-6">
              <div className="space-y-2">
                <label className="block text-[20px] font-normal text-black sm:text-[25px]">UNIBZ EMAIL</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-[62px] w-full rounded-full border border-black bg-white px-6 text-[18px] text-black outline-none transition focus:border-2 focus:border-black"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[20px] font-normal text-black sm:text-[25px]">PASSWORD</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-[62px] w-full rounded-full border border-black bg-white px-6 text-[18px] text-black outline-none transition focus:border-2 focus:border-black"
                  required
                />
              </div>

              {error && <p className="text-center text-[16px] text-red-600">{error}</p>}

              <button
                type="submit"
                className="h-[62px] w-full rounded-full bg-[#ffb885] text-[24px] font-normal text-black transition hover:brightness-95 sm:text-[30px]"
              >
                Register
              </button>

              <Link
                href="/signin"
                className="flex h-[62px] w-full items-center justify-center rounded-full border-2 border-[#adbdff] text-[24px] font-normal text-[#adbdff] transition hover:bg-[#adbdff]/10 sm:text-[30px]"
              >
                Sign In
              </Link>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
