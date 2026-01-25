import { useEffect, useState } from 'react';
import { useUser } from '@stackframe/stack';

interface UsageBalance {
  usage: number;
  limit: number;
  allowed: boolean;
}

interface AutumnUsage {
  projects?: UsageBalance;
  isLoading: boolean;
  error?: string;
  refetch: () => Promise<void>;
}

export function useAutumnUsage(): AutumnUsage {
  const user = useUser();
  const [usage, setUsage] = useState<{ projects?: UsageBalance }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();

  const fetchUsage = async () => {
    if (!user) return;

    setIsLoading(true);
    setError(undefined);

    try {
      const response = await fetch('/api/projects/check-limit', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        setUsage({
          projects: {
            usage: data.currentUsage || 0,
            limit: data.limit || 50,
            allowed: data.allowed,
          },
        });
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to fetch usage data');
      console.error('Autumn usage fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsage();
  }, [user?.id]);

  return {
    ...usage,
    isLoading,
    error,
    refetch: fetchUsage,
  };
}
