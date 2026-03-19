import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface BreadcrumbsProps {
  make?: string;
  model?: string;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ make, model }) => {
  return (
    <nav className="flex items-center space-x-2 text-[10px] font-bold text-[var(--mu2)] uppercase tracking-widest py-6">
      <Link to="/" className="hover:text-[var(--lime)] transition-colors">Home</Link>
      <ChevronRight size={12} />
      <Link to="/deals" className="hover:text-[var(--lime)] transition-colors">Deals</Link>
      {make && (
        <>
          <ChevronRight size={12} />
          <span className="text-[var(--w)]">{make} {model}</span>
        </>
      )}
    </nav>
  );
};
