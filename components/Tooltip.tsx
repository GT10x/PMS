'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';

interface TooltipProps {
  children: ReactNode;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

export default function Tooltip({
  children,
  content,
  position = 'top',
  delay = 200
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showTooltip = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    if (isVisible && triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();

      let top = 0;
      let left = 0;

      switch (position) {
        case 'top':
          top = triggerRect.top - tooltipRect.height - 8;
          left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
          break;
        case 'bottom':
          top = triggerRect.bottom + 8;
          left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
          break;
        case 'left':
          top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
          left = triggerRect.left - tooltipRect.width - 8;
          break;
        case 'right':
          top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
          left = triggerRect.right + 8;
          break;
      }

      // Keep tooltip within viewport
      const padding = 10;
      if (left < padding) left = padding;
      if (left + tooltipRect.width > window.innerWidth - padding) {
        left = window.innerWidth - tooltipRect.width - padding;
      }
      if (top < padding) top = padding;
      if (top + tooltipRect.height > window.innerHeight - padding) {
        top = window.innerHeight - tooltipRect.height - padding;
      }

      setCoords({ top, left });
    }
  }, [isVisible, position]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const arrowClasses = {
    top: 'bottom-[-4px] left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent',
    bottom: 'top-[-4px] left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent',
    left: 'right-[-4px] top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent',
    right: 'left-[-4px] top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent',
  };

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        className="inline-flex"
      >
        {children}
      </div>
      {isVisible && (
        <div
          ref={tooltipRef}
          className="fixed z-[9999] px-3 py-2 text-xs font-medium text-white bg-gray-900 dark:bg-gray-700 rounded-lg shadow-lg max-w-xs whitespace-normal"
          style={{ top: coords.top, left: coords.left }}
        >
          {content}
          <div
            className={`absolute w-0 h-0 border-4 border-gray-900 dark:border-gray-700 ${arrowClasses[position]}`}
          />
        </div>
      )}
    </>
  );
}

// IconButton with built-in tooltip
export function IconButton({
  icon,
  tooltip,
  onClick,
  variant = 'default',
  size = 'md',
  disabled = false,
  className = ''
}: {
  icon: string;
  tooltip: string;
  onClick?: () => void;
  variant?: 'default' | 'primary' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
}) {
  const variantClasses = {
    default: 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700',
    primary: 'text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/30',
    danger: 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30',
    success: 'text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/30',
  };

  const sizeClasses = {
    sm: 'p-1.5 text-sm',
    md: 'p-2',
    lg: 'p-3 text-lg',
  };

  return (
    <Tooltip content={tooltip}>
      <button
        onClick={onClick}
        disabled={disabled}
        className={`
          rounded-lg transition-colors
          ${variantClasses[variant]}
          ${sizeClasses[size]}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${className}
        `}
      >
        <i className={icon}></i>
      </button>
    </Tooltip>
  );
}
