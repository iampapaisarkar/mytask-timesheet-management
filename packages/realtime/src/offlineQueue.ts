/**
 * Offline mutation queue for mobile (and optional web).
 * Dedupes by clientMutationId; retries when connectivity returns.
 */

export type OfflineMutationStatus = "pending" | "inflight" | "failed";

export interface OfflineMutation<TPayload = unknown> {
  clientMutationId: string;
  domain: string;
  action: string;
  payload: TPayload;
  createdAt: string;
  attempts: number;
  status: OfflineMutationStatus;
  lastError?: string;
}

export type OfflineExecutor = (
  mutation: OfflineMutation,
) => Promise<void>;

export class OfflineQueue {
  private queue: OfflineMutation[] = [];
  private flushing = false;
  private executor: OfflineExecutor | null = null;
  private persist: ((items: OfflineMutation[]) => void) | null = null;

  configure(options: {
    executor: OfflineExecutor;
    persist?: (items: OfflineMutation[]) => void;
    hydrate?: OfflineMutation[];
  }): void {
    this.executor = options.executor;
    this.persist = options.persist ?? null;
    if (options.hydrate?.length) {
      this.queue = [...options.hydrate];
    }
  }

  list(): OfflineMutation[] {
    return [...this.queue];
  }

  enqueue<T>(input: {
    clientMutationId: string;
    domain: string;
    action: string;
    payload: T;
  }): OfflineMutation<T> {
    const existing = this.queue.find(
      (m) => m.clientMutationId === input.clientMutationId,
    );
    if (existing) {
      return existing as OfflineMutation<T>;
    }
    const mutation: OfflineMutation<T> = {
      ...input,
      createdAt: new Date().toISOString(),
      attempts: 0,
      status: "pending",
    };
    this.queue.push(mutation as OfflineMutation);
    this.persist?.(this.queue);
    return mutation;
  }

  clear(): void {
    this.queue = [];
    this.persist?.(this.queue);
  }

  async flush(): Promise<void> {
    if (this.flushing || !this.executor) return;
    this.flushing = true;
    try {
      const pending = this.queue.filter(
        (m) => m.status === "pending" || m.status === "failed",
      );
      for (const mutation of pending) {
        mutation.status = "inflight";
        mutation.attempts += 1;
        this.persist?.(this.queue);
        try {
          await this.executor(mutation);
          this.queue = this.queue.filter(
            (m) => m.clientMutationId !== mutation.clientMutationId,
          );
          this.persist?.(this.queue);
        } catch (err) {
          mutation.status = "failed";
          mutation.lastError =
            err instanceof Error ? err.message : "Offline flush failed";
          this.persist?.(this.queue);
        }
      }
    } finally {
      this.flushing = false;
    }
  }
}

export const sharedOfflineQueue = new OfflineQueue();
