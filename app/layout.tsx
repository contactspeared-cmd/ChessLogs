import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import SJSFIBrand from '@/components/SJSFIBrand';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'ChessLogs | SJSFI Chess Coaching & Analysis Platform',
  description:
    'Dedicated Coach-to-Student chess monitoring, Chess.com games database, interactive move-by-move and video courses, and built-in analysis engine for Saint Joseph School Foundation Inc., Zamboanga City.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex flex-col min-h-screen bg-[#fbfdfc] antialiased text-gray-900 selection:bg-sjsfi-100 selection:text-sjsfi-900">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
        <footer className="border-t border-gray-200/80 bg-white/80 backdrop-blur-xs py-8 mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-3">
              <SJSFIBrand size="sm" showSubtitle={false} />
              <span className="text-gray-300">|</span>
              <span>Official Varsity & Student Coaching Portal</span>
            </div>
            <div className="text-center md:text-right">
              <p className="font-semibold text-gray-700">
                Saint Joseph School Foundation, Inc. (SJSFI)
              </p>
              <p className="text-[11px] text-gray-400">
                Gov. Camins Ave, Zamboanga City, Philippines • Administered by Head Coach
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
