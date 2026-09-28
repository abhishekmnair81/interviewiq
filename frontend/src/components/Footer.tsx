import Link from 'next/link';

import Logo from '@/components/Logo';

export default function Footer() {
  return (
    <footer className="border-t border-surface-border bg-surface-0 mt-20 relative overflow-hidden">
      <div className="absolute inset-0 bg-noise opacity-30 pointer-events-none" />
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <Logo />
          <div className="text-sm text-secondary-color">
            &copy; {new Date().getFullYear()} InterviewIQ. All rights reserved.
          </div>
          <div className="flex gap-4">
            <Link href="/privacy" className="text-sm text-secondary-color hover:text-primary-color transition">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-sm text-secondary-color hover:text-primary-color transition">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
