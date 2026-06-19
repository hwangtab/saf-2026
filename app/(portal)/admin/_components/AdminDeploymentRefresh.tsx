'use client';

import { useCallback, useEffect, useRef } from 'react';

export const ADMIN_DEPLOYMENT_VERSION_ENDPOINT = '/api/admin/deployment-version';
const DEFAULT_CHECK_INTERVAL_MS = 60_000;

type AdminDeploymentRefreshProps = {
  deploymentId: string;
  checkIntervalMs?: number;
};

type DeploymentVersionResponse = {
  deploymentId?: unknown;
};

export function shouldReloadForDeploymentChange(
  currentDeploymentId: string,
  latestDeploymentId: unknown
) {
  return (
    typeof latestDeploymentId === 'string' &&
    latestDeploymentId.length > 0 &&
    currentDeploymentId.length > 0 &&
    latestDeploymentId !== currentDeploymentId
  );
}

export default function AdminDeploymentRefresh({
  deploymentId,
  checkIntervalMs = DEFAULT_CHECK_INTERVAL_MS,
}: AdminDeploymentRefreshProps) {
  const currentDeploymentIdRef = useRef(deploymentId);
  const isReloadingRef = useRef(false);

  const checkDeploymentVersion = useCallback(async () => {
    if (isReloadingRef.current) return;

    try {
      const response = await fetch(ADMIN_DEPLOYMENT_VERSION_ENDPOINT, {
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) return;

      const payload = (await response.json()) as DeploymentVersionResponse;

      if (
        shouldReloadForDeploymentChange(
          currentDeploymentIdRef.current,
          payload.deploymentId
        )
      ) {
        isReloadingRef.current = true;
        window.location.reload();
      }
    } catch {
      // Admin work should not be interrupted by a transient version-check failure.
    }
  }, []);

  useEffect(() => {
    void checkDeploymentVersion();

    const intervalId = window.setInterval(() => {
      void checkDeploymentVersion();
    }, checkIntervalMs);

    const handleFocus = () => {
      void checkDeploymentVersion();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void checkDeploymentVersion();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkDeploymentVersion, checkIntervalMs]);

  return null;
}
