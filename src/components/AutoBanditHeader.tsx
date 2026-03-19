import React from 'react';
import { Search, User, LogIn } from 'lucide-react';
import { Link } from 'react-router-dom';

export const AutoBanditHeader = () => {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-[100]">
      <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="flex flex-col items-start">
            <span className="text-3xl font-display font-bold italic tracking-tighter text-[#002C5F] leading-none">
              AUTO BANDIT
            </span>
            <div className="w-full h-1 bg-gradient-to-r from-[#002C5F] to-transparent mt-1" />
          </div>
        </Link>

        {/* Navigation */}
        <nav className="hidden lg:flex items-center gap-8">
          <Link to="/deals" className="text-[11px] font-bold uppercase tracking-widest text-gray-500 hover:text-[#002C5F] transition-colors">
            Deals
          </Link>
          <Link to="/about" className="text-[11px] font-bold uppercase tracking-widest text-gray-500 hover:text-[#002C5F] transition-colors">
            About Us
          </Link>
          <Link to="/recently-viewed" className="text-[11px] font-bold uppercase tracking-widest text-gray-500 hover:text-[#002C5F] transition-colors">
            Recently Viewed
          </Link>
          <Link to="/blog" className="text-[11px] font-bold uppercase tracking-widest text-gray-500 hover:text-[#002C5F] transition-colors">
            Blog
          </Link>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <button className="hidden md:block px-6 py-2.5 border border-gray-200 rounded-full text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:bg-gray-50 transition-colors">
            FOR DEALERS
          </button>
          <button className="hidden md:block px-6 py-2.5 border border-gray-200 rounded-full text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:bg-gray-50 transition-colors">
            LOG IN
          </button>
          <button className="bg-[#002C5F] text-white px-8 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-[#001F44] transition-colors shadow-lg shadow-blue-100">
            SIGN UP
          </button>
        </div>
      </div>
    </header>
  );
};
