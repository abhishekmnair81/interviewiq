import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-3xl mb-4 border border-indigo-500/30">
        🔍
      </div>
      <h2 className="text-2xl font-bold mb-2">Page Not Found</h2>
      <p className="text-sm text-slate-400 max-w-md mb-6">
        The requested interview session or page could not be found.
      </p>
      <Link
        href="/dashboard"
        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 font-bold rounded-2xl text-xs transition font-semibold"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
