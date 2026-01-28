'use client';

import { useEffect, useState } from 'react';

interface AccessResult {
  hasAccess: boolean;
  reason: 'admin' | 'no_restrictions' | 'permitted' | 'restricted' | 'loading' | 'error';
  loading: boolean;
}

export function useModuleAccess(projectId: string, moduleName: string): AccessResult {
  const [result, setResult] = useState<AccessResult>({
    hasAccess: true, // Default to true while loading to prevent flash
    reason: 'loading',
    loading: true
  });

  useEffect(() => {
    if (!projectId || !moduleName) {
      setResult({ hasAccess: true, reason: 'loading', loading: true });
      return;
    }

    const checkAccess = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/permissions/check?module=${moduleName}`);
        if (response.ok) {
          const data = await response.json();
          setResult({
            hasAccess: data.hasAccess,
            reason: data.reason,
            loading: false
          });
        } else {
          // If API fails, default to allowing access
          setResult({
            hasAccess: true,
            reason: 'error',
            loading: false
          });
        }
      } catch (error) {
        console.error('Error checking module access:', error);
        setResult({
          hasAccess: true,
          reason: 'error',
          loading: false
        });
      }
    };

    checkAccess();
  }, [projectId, moduleName]);

  return result;
}
