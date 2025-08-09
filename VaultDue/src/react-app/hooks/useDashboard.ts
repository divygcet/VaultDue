import { useState, useCallback } from 'react';

interface DashboardStats {
  totalDocuments: number;
  criticalDocuments: number;
  expiringSoon: number;
  expired: number;
}

export function useDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalDocuments: 0,
    criticalDocuments: 0,
    expiringSoon: 0,
    expired: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/dashboard');
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard stats');
      }
      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    stats,
    loading,
    error,
    fetchDashboardStats,
  };
}
