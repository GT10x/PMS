'use client';

import { useEffect, useState } from 'react';

interface ProjectPermissions {
  allowedModules: string[];
  loading: boolean;
  hasAccess: (moduleName: string) => boolean;
}

export function useProjectPermissions(projectId: string): ProjectPermissions {
  const [allowedModules, setAllowedModules] = useState<string[]>([]);
  const [isRestricted, setIsRestricted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;

    const fetchPermissions = async () => {
      try {
        // Check if current user has any restrictions
        const response = await fetch(`/api/projects/${projectId}/permissions/my-access`);
        if (response.ok) {
          const data = await response.json();
          setAllowedModules(data.allowedModules || []);
          setIsRestricted(data.isRestricted || false);
        }
      } catch (error) {
        console.error('Error fetching permissions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [projectId]);

  const hasAccess = (moduleName: string) => {
    if (loading) return true; // Default allow while loading
    if (!isRestricted) return true; // No restrictions = full access
    return allowedModules.includes(moduleName);
  };

  return { allowedModules, loading, hasAccess };
}
