import { create, type StoreApi, type UseBoundStore } from "zustand";

export interface DomainListState<T extends { id: number | string }> {
  byId: Record<string, T>;
  ids: Array<string>;
  loading: boolean;
  error: string | null;
  filters: Record<string, unknown>;
  page: number;
  pageSize: number;
  total: number | null;
  optimisticIds: Set<string>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setFilters: (filters: Record<string, unknown>) => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  replaceAll: (items: T[], total?: number | null) => void;
  upsert: (item: T) => void;
  upsertMany: (items: T[]) => void;
  remove: (id: number | string) => void;
  getById: (id: number | string) => T | undefined;
  optimisticUpsert: (item: T) => void;
  rollback: (id: number | string, previous?: T | null) => void;
  reset: () => void;
}

function keyOf(id: number | string): string {
  return String(id);
}

export function createDomainStore<T extends { id: number | string }>(
  name: string,
): UseBoundStore<StoreApi<DomainListState<T>>> {
  const initial = {
    byId: {} as Record<string, T>,
    ids: [] as string[],
    loading: false,
    error: null as string | null,
    filters: {} as Record<string, unknown>,
    page: 1,
    pageSize: 25,
    total: null as number | null,
    optimisticIds: new Set<string>(),
  };

  return create<DomainListState<T>>((set, get) => ({
    ...initial,
    optimisticIds: new Set(),
    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error }),
    setFilters: (filters) => set({ filters, page: 1 }),
    setPage: (page) => set({ page }),
    setPageSize: (pageSize) => set({ pageSize, page: 1 }),
    replaceAll: (items, total = null) => {
      const byId: Record<string, T> = {};
      const ids: string[] = [];
      for (const item of items) {
        const k = keyOf(item.id);
        byId[k] = item;
        ids.push(k);
      }
      set({ byId, ids, total, loading: false, error: null });
    },
    upsert: (item) => {
      const k = keyOf(item.id);
      const { byId, ids, optimisticIds } = get();
      const nextOptimistic = new Set(optimisticIds);
      nextOptimistic.delete(k);
      set({
        byId: { ...byId, [k]: item },
        ids: ids.includes(k) ? ids : [k, ...ids],
        optimisticIds: nextOptimistic,
        error: null,
      });
    },
    upsertMany: (items) => {
      for (const item of items) get().upsert(item);
    },
    remove: (id) => {
      const k = keyOf(id);
      const { byId, ids, optimisticIds } = get();
      const nextById = { ...byId };
      delete nextById[k];
      const nextOptimistic = new Set(optimisticIds);
      nextOptimistic.delete(k);
      set({
        byId: nextById,
        ids: ids.filter((x) => x !== k),
        optimisticIds: nextOptimistic,
      });
    },
    getById: (id) => get().byId[keyOf(id)],
    optimisticUpsert: (item) => {
      const k = keyOf(item.id);
      const { byId, ids, optimisticIds } = get();
      const nextOptimistic = new Set(optimisticIds);
      nextOptimistic.add(k);
      set({
        byId: { ...byId, [k]: item },
        ids: ids.includes(k) ? ids : [k, ...ids],
        optimisticIds: nextOptimistic,
      });
    },
    rollback: (id, previous) => {
      const k = keyOf(id);
      const { byId, ids, optimisticIds } = get();
      const nextOptimistic = new Set(optimisticIds);
      nextOptimistic.delete(k);
      if (previous) {
        set({
          byId: { ...byId, [k]: previous },
          ids: ids.includes(k) ? ids : [k, ...ids],
          optimisticIds: nextOptimistic,
          error: `${name}: optimistic update rolled back`,
        });
        return;
      }
      const nextById = { ...byId };
      delete nextById[k];
      set({
        byId: nextById,
        ids: ids.filter((x) => x !== k),
        optimisticIds: nextOptimistic,
        error: `${name}: optimistic update rolled back`,
      });
    },
    reset: () =>
      set({
        byId: {},
        ids: [],
        loading: false,
        error: null,
        filters: {},
        page: 1,
        pageSize: 25,
        total: null,
        optimisticIds: new Set(),
      }),
  }));
}
