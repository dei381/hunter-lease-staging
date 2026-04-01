import { useState, useEffect } from 'react';
import { fetchWithCache } from '../utils/fetchWithCache';

export const useCarData = <T,>(url: string | null) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!url) {
      setData(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    fetchWithCache<T>(url)
      .then((json) => {
        if (isMounted) {
          setData(json);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [url]);

  return { data, loading, error };
};
