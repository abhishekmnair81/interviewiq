import Link from 'next/link';

export default function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/dashboard" className={`flex items-center gap-3 group ${className}`}>
      <div className="w-10 h-10 rounded-full bg-[#111115] border-2 border-[#3b3559] flex items-center justify-center shadow-[0_0_15px_rgba(59,53,89,0.5)] transition-transform group-hover:scale-105">
        <span className="text-lg font-black tracking-tighter">
          <span className="text-[#a890e6]">I</span>
          <span className="text-[#f6bc45]">Q</span>
        </span>
      </div>
      <span className="text-2xl font-black tracking-tight text-white">
        Interview
        <span className="text-[#a890e6]">I</span>
        <span className="text-[#f6bc45]">Q</span>
      </span>
    </Link>
  );
}
