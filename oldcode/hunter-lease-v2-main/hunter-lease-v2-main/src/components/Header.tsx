import React from 'react';
import { Search, User, Menu } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="text-2xl font-black tracking-tighter text-slate-900 italic flex items-center">
              AUTO<span className="text-blue-600">BANDIT</span>
              <div className="ml-1 w-8 h-4 border-b-2 border-r-2 border-blue-600 rounded-br-full transform -skew-x-12"></div>
            </div>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">Deals</a>
            <a href="#" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">About Us</a>
            <a href="#" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">Recently Viewed</a>
            <a href="#" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">Blog</a>
          </nav>

          {/* Actions */}
          <div className="flex items-center space-x-4">
            <button className="hidden sm:flex items-center px-4 py-2 border border-gray-300 rounded-full text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
              FOR DEALERS
            </button>
            <button className="flex items-center px-4 py-2 border border-gray-300 rounded-full text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
              LOG IN
            </button>
            <button className="md:hidden p-2 text-gray-600">
              <Menu size={24} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
