import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

type LazyModule<T extends ComponentType<any>> = Promise<{ default: T }>;

export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => LazyModule<T>,
  cacheKey: string,
): LazyExoticComponent<T> {
  return lazy(async () => {
    const storageKey = `lazy-retry:${cacheKey}`;

    try {
      const loadedModule = await factory();

      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem(storageKey);
      }

      return loadedModule;
    } catch (error) {
      if (typeof window !== 'undefined') {
        const alreadyReloaded = window.sessionStorage.getItem(storageKey) === 'true';

        if (!alreadyReloaded) {
          window.sessionStorage.setItem(storageKey, 'true');
          window.location.reload();
          return new Promise<never>(() => {});
        }

        window.sessionStorage.removeItem(storageKey);
      }

      throw error;
    }
  });
}