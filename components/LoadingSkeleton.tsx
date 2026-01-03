'use client';

// Base skeleton element with pulse animation
function SkeletonElement({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`} />
  );
}

// Card skeleton
export function CardSkeleton() {
  return (
    <div className="card p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <SkeletonElement className="h-6 w-3/4 mb-3" />
          <SkeletonElement className="h-4 w-full mb-2" />
          <SkeletonElement className="h-4 w-2/3 mb-4" />
          <div className="flex gap-4">
            <SkeletonElement className="h-4 w-20" />
            <SkeletonElement className="h-4 w-24" />
            <SkeletonElement className="h-4 w-16" />
          </div>
        </div>
        <SkeletonElement className="h-10 w-20 rounded-lg" />
      </div>
    </div>
  );
}

// Table row skeleton
export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <SkeletonElement className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

// Stats card skeleton
export function StatsCardSkeleton() {
  return (
    <div className="card p-6">
      <div className="flex items-center gap-4">
        <SkeletonElement className="w-12 h-12 rounded-xl" />
        <div className="flex-1">
          <SkeletonElement className="h-4 w-20 mb-2" />
          <SkeletonElement className="h-8 w-16" />
        </div>
      </div>
    </div>
  );
}

// Project card skeleton
export function ProjectCardSkeleton() {
  return (
    <div className="card p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <SkeletonElement className="w-12 h-12 rounded-xl" />
          <div>
            <SkeletonElement className="h-5 w-32 mb-2" />
            <SkeletonElement className="h-4 w-20" />
          </div>
        </div>
        <SkeletonElement className="h-6 w-16 rounded-full" />
      </div>
      <SkeletonElement className="h-4 w-full mb-2" />
      <SkeletonElement className="h-4 w-3/4 mb-4" />
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <SkeletonElement className="w-8 h-8 rounded-full" />
          <SkeletonElement className="w-8 h-8 rounded-full" />
          <SkeletonElement className="w-8 h-8 rounded-full" />
        </div>
        <SkeletonElement className="h-4 w-24" />
      </div>
    </div>
  );
}

// Report card skeleton
export function ReportCardSkeleton() {
  return (
    <div className="card p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <SkeletonElement className="w-8 h-8 rounded" />
            <SkeletonElement className="h-6 w-1/2" />
            <SkeletonElement className="h-6 w-16 rounded-full" />
          </div>
          <SkeletonElement className="h-4 w-full mb-2" />
          <SkeletonElement className="h-4 w-3/4 mb-4" />
          <div className="flex gap-4">
            <SkeletonElement className="h-4 w-20" />
            <SkeletonElement className="h-4 w-32" />
            <SkeletonElement className="h-4 w-24" />
          </div>
        </div>
        <SkeletonElement className="h-10 w-20 rounded-lg" />
      </div>
    </div>
  );
}

// Chat message skeleton
export function ChatMessageSkeleton({ isOwn = false }: { isOwn?: boolean }) {
  return (
    <div className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}>
      <SkeletonElement className="w-10 h-10 rounded-full flex-shrink-0" />
      <div className={`max-w-md ${isOwn ? 'items-end' : 'items-start'}`}>
        <SkeletonElement className="h-4 w-24 mb-2" />
        <SkeletonElement className={`h-20 w-64 rounded-2xl ${isOwn ? 'rounded-br-sm' : 'rounded-bl-sm'}`} />
        <SkeletonElement className="h-3 w-16 mt-1" />
      </div>
    </div>
  );
}

// Full page skeleton loader
export function PageSkeleton({ type = 'cards' }: { type?: 'cards' | 'table' | 'chat' }) {
  if (type === 'table') {
    return (
      <div className="card overflow-hidden">
        <div className="p-4 border-b dark:border-gray-700">
          <SkeletonElement className="h-6 w-48" />
        </div>
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800">
              {Array.from({ length: 5 }).map((_, i) => (
                <th key={i} className="px-6 py-3">
                  <SkeletonElement className="h-4 w-20" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRowSkeleton key={i} columns={5} />
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (type === 'chat') {
    return (
      <div className="space-y-4">
        <ChatMessageSkeleton />
        <ChatMessageSkeleton isOwn />
        <ChatMessageSkeleton />
        <ChatMessageSkeleton isOwn />
        <ChatMessageSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

// Default export for simple skeleton
export default function LoadingSkeleton({
  type = 'card',
  count = 1
}: {
  type?: 'card' | 'table-row' | 'stats' | 'project' | 'report' | 'chat';
  count?: number;
}) {
  const SkeletonComponent = {
    card: CardSkeleton,
    'table-row': TableRowSkeleton,
    stats: StatsCardSkeleton,
    project: ProjectCardSkeleton,
    report: ReportCardSkeleton,
    chat: ChatMessageSkeleton,
  }[type];

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonComponent key={i} />
      ))}
    </>
  );
}
