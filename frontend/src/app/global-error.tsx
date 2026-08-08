'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body className="bg-slate-950 text-white flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center text-3xl mb-4 border border-rose-500/30">
          ⚠️
        </div>
        <h2 className="text-2xl font-bold mb-2">System Error</h2>
        <p className="text-sm text-slate-400 max-w-md mb-6">{error.message || 'An unexpected application error occurred.'}</p>
        <button
          onClick={() => reset()}
          className="px-6 py-3 bg-indigo-600 font-bold rounded-2xl text-xs"
        >
          Reload Application
        </button>
      </body>
    </html>
  );
}
