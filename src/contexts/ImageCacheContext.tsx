import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface ImageCacheContextType {
  preloadImage: (url: string) => Promise<void>;
  isImageCached: (url: string) => boolean;
  preloadImages: (urls: string[]) => Promise<void>;
}

const ImageCacheContext = createContext<ImageCacheContextType | undefined>(undefined);

// In-memory cache to track loaded images
const loadedImages = new Set<string>();

export const ImageCacheProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const preloadImage = useCallback(async (url: string): Promise<void> => {
    if (!url || loadedImages.has(url)) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        loadedImages.add(url);
        resolve();
      };
      
      img.onerror = () => {
        // Don't reject - just resolve silently so broken images don't break the app
        console.warn(`Failed to preload image: ${url}`);
        resolve();
      };
      
      img.src = url;
    });
  }, []);

  const preloadImages = useCallback(async (urls: string[]): Promise<void> => {
    const validUrls = urls.filter(url => url && !loadedImages.has(url));
    
    // Load images in batches of 5 to avoid overwhelming the browser
    const batchSize = 5;
    for (let i = 0; i < validUrls.length; i += batchSize) {
      const batch = validUrls.slice(i, i + batchSize);
      await Promise.allSettled(batch.map(url => preloadImage(url)));
    }
  }, [preloadImage]);

  const isImageCached = useCallback((url: string): boolean => {
    return loadedImages.has(url);
  }, []);

  return (
    <ImageCacheContext.Provider value={{ preloadImage, isImageCached, preloadImages }}>
      {children}
    </ImageCacheContext.Provider>
  );
};

export const useImageCache = () => {
  const context = useContext(ImageCacheContext);
  if (!context) {
    throw new Error('useImageCache must be used within ImageCacheProvider');
  }
  return context;
};

