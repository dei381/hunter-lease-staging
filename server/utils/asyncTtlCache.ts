type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

export function createAsyncTtlCache<T>(args: {
  ttlMs: number;
  now?: () => number;
}) {
  const { ttlMs, now = () => Date.now() } = args;
  const values = new Map<string, CacheEntry<T>>();
  const inFlight = new Map<string, Promise<T>>();

  return {
    async getOrLoad(key: string, loader: () => Promise<T>): Promise<T> {
      const currentTime = now();
      const cached = values.get(key);

      if (cached && cached.expiresAt > currentTime) {
        return cached.value;
      }

      const existingPromise = inFlight.get(key);
      if (existingPromise) {
        return existingPromise;
      }

      const pending = loader()
        .then(value => {
          values.set(key, {
            value,
            expiresAt: now() + ttlMs,
          });
          inFlight.delete(key);
          return value;
        })
        .catch(error => {
          inFlight.delete(key);
          throw error;
        });

      inFlight.set(key, pending);
      return pending;
    },

    clear() {
      values.clear();
      inFlight.clear();
    },
  };
}