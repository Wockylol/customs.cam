import { useEffect } from 'react';
import { useImageCache } from '../contexts/ImageCacheContext';

/**
 * Custom hook to preload images in the background
 * Uses requestIdleCallback for non-blocking preloading
 */
export const useImagePreloader = (imageUrls: (string | null | undefined)[]) => {
  const { preloadImages } = useImageCache();

  useEffect(() => {
    const validUrls = imageUrls.filter((url): url is string => !!url);
    
    if (validUrls.length === 0) return;

    // Use requestIdleCallback to preload during idle time
    if ('requestIdleCallback' in window) {
      const idleCallback = requestIdleCallback(() => {
        preloadImages(validUrls);
      }, { timeout: 2000 }); // Timeout after 2 seconds to ensure it runs

      return () => cancelIdleCallback(idleCallback);
    } else {
      // Fallback for browsers without requestIdleCallback
      const timeout = setTimeout(() => {
        preloadImages(validUrls);
      }, 100);

      return () => clearTimeout(timeout);
    }
  }, [imageUrls.join(','), preloadImages]);
};

