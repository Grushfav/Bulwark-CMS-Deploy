import { useRef, useCallback } from 'react';

/**
 * Hook to prevent duplicate simultaneous API requests
 * If a request is already in flight, subsequent calls wait for the same result
 */
export const useRequestDeduplication = () => {
  const pendingRequests = useRef(new Map());

  const deduplicate = useCallback(async (key, requestFn) => {
    // Check if this request is already pending
    if (pendingRequests.current.has(key)) {
      console.log(`⏳ Deduplicating request: ${key}`);
      return pendingRequests.current.get(key);
    }

    // Execute the request and store the promise
    const promise = requestFn()
      .finally(() => {
        // Remove from pending once complete
        pendingRequests.current.delete(key);
      });

    pendingRequests.current.set(key, promise);
    return promise;
  }, []);

  const clear = useCallback((key) => {
    if (key) {
      pendingRequests.current.delete(key);
    } else {
      pendingRequests.current.clear();
    }
  }, []);

  return { deduplicate, clear };
};

/**
 * Example usage in a component:
 * 
 * const { deduplicate } = useRequestDeduplication();
 * 
 * const fetchData = async () => {
 *   const data = await deduplicate('goals-fetch', () => goalsAPI.getGoals());
 *   setGoals(data);
 * };
 */
