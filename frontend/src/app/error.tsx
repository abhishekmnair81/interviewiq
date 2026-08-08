'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled app error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center text-3xl mb-4 border border-rose-500/30">
        ⚠️
      </div>
      <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
      <p className="text-sm text-slate-400 max-w-md mb-6">
        {error?.message || 'An unexpected error occurred during execution.'}
      </p>
      <div className="flex gap-4">
        <button
          onClick={() => reset()}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 font-bold rounded-2xl text-xs transition"
        >
          Try Again
        </button>
        <Link
          href="/dashboard"
          className="px-6 py-3 bg-slate-800 hover:bg-slate-700 font-bold rounded-2xl text-xs border border-slate-700 text-slate-300 transition"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
