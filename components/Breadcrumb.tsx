'use client';

import Link from 'next/link';

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
      <Link
        href="/dashboard"
        className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
      >
        <i className="fas fa-home"></i>
      </Link>
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <i className="fas fa-chevron-right text-xs text-gray-400"></i>
          {item.href ? (
            <Link
              href={item.href}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-1"
            >
              {item.icon && <i className={`${item.icon} text-xs`}></i>}
              {item.label}
            </Link>
          ) : (
            <span className="text-gray-700 dark:text-gray-300 font-medium flex items-center gap-1">
              {item.icon && <i className={`${item.icon} text-xs`}></i>}
              {item.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  );
}
