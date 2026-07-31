import { lazy, type ComponentType, type LazyExoticComponent } from "react";

export type PreloadableComponent<T extends ComponentType<unknown>> =
  LazyExoticComponent<T> & {
    preload: () => Promise<{ default: T }>;
  };

/**
 * React.lazy wrapper that exposes `.preload()` so we can warm route chunks
 * on hover / idle before navigation.
 */
export function lazyRoute<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
): PreloadableComponent<T> {
  let pending: Promise<{ default: T }> | null = null;

  const load = () => {
    if (!pending) pending = factory();
    return pending;
  };

  const Component = lazy(load) as PreloadableComponent<T>;
  Component.preload = load;
  return Component;
}
