'use client';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  itemsPerPage?: number;
  showInfo?: boolean;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage = 10,
  showInfo = true
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages + 2) {
      // Show all pages if not too many
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage > 3) {
        pages.push('...');
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('...');
      }

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  };

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems || 0);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
      {showInfo && totalItems !== undefined && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Showing <span className="font-medium text-gray-700 dark:text-gray-300">{startItem}</span> to{' '}
          <span className="font-medium text-gray-700 dark:text-gray-300">{endItem}</span> of{' '}
          <span className="font-medium text-gray-700 dark:text-gray-300">{totalItems}</span> results
        </p>
      )}

      <nav className="flex items-center gap-1">
        {/* Previous button */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <i className="fas fa-chevron-left mr-1"></i>
          Prev
        </button>

        {/* Page numbers */}
        <div className="hidden sm:flex items-center gap-1">
          {getPageNumbers().map((page, index) => (
            <button
              key={index}
              onClick={() => typeof page === 'number' && onPageChange(page)}
              disabled={page === '...'}
              className={`
                min-w-[40px] px-3 py-2 text-sm font-medium rounded-lg transition-colors
                ${page === currentPage
                  ? 'bg-indigo-600 text-white'
                  : page === '...'
                    ? 'text-gray-400 cursor-default'
                    : 'text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }
              `}
            >
              {page}
            </button>
          ))}
        </div>

        {/* Mobile page indicator */}
        <span className="sm:hidden px-3 py-2 text-sm text-gray-600 dark:text-gray-400">
          Page {currentPage} of {totalPages}
        </span>

        {/* Next button */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Next
          <i className="fas fa-chevron-right ml-1"></i>
        </button>
      </nav>
    </div>
  );
}

// Items per page selector
export function ItemsPerPageSelector({
  value,
  onChange,
  options = [10, 25, 50, 100]
}: {
  value: number;
  onChange: (value: number) => void;
  options?: number[];
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-gray-500 dark:text-gray-400">Show</label>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <span className="text-sm text-gray-500 dark:text-gray-400">per page</span>
    </div>
  );
}
