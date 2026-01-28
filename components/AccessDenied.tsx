'use client';

import Link from 'next/link';

interface AccessDeniedProps {
  moduleName: string;
  projectId: string;
}

export default function AccessDenied({ moduleName, projectId }: AccessDeniedProps) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full mb-6">
          <i className="fas fa-lock text-4xl text-red-500"></i>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Access Restricted
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md">
          You don't have permission to access the <span className="font-semibold capitalize">{moduleName}</span> module.
          Please contact your project manager or administrator to request access.
        </p>
        <Link
          href={`/dashboard/project/${projectId}`}
          className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition"
        >
          <i className="fas fa-arrow-left"></i>
          Back to Project Overview
        </Link>
      </div>
    </div>
  );
}
