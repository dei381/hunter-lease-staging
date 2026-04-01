const cache = new Map<string, any>();
const pendingRequests = new Map<string, Promise<any>>();

export const fetchWithCache = async <T,>(url: string, options?: RequestInit): Promise<T> => {
  const cacheKey = `${url}-${JSON.stringify(options || {})}`;
  
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey);
  }

  const requestPromise = fetch(url, options).then(async (response) => {
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}`);
    }
    const data = await response.json();
    cache.set(cacheKey, data);
    pendingRequests.delete(cacheKey);
    return data;
  }).catch(err => {
    pendingRequests.delete(cacheKey);
    throw err;
  });

  pendingRequests.set(cacheKey, requestPromise);
  return requestPromise;
};

export const clearClientCache = () => {
  cache.clear();
  pendingRequests.clear();
};
