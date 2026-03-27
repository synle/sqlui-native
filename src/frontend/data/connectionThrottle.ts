/** Per-connection request throttle to limit concurrent API calls. */

/** Queued request waiting for a slot. */
type QueueEntry = {
  resolve: () => void;
};

/**
 * Limits the number of concurrent in-flight requests per connection.
 * Requests beyond the limit are queued and released as earlier ones complete.
 */
class ConnectionThrottle {
  /** Maximum concurrent requests per connection. */
  private maxConcurrent: number;

  /** Number of active (in-flight) requests per connectionId. */
  private active = new Map<string, number>();

  /** Pending requests per connectionId, waiting for a slot. */
  private queues = new Map<string, QueueEntry[]>();

  /**
   * @param maxConcurrent - Maximum concurrent requests allowed per connection.
   */
  constructor(maxConcurrent: number) {
    this.maxConcurrent = maxConcurrent;
  }

  /**
   * Acquires a slot for the given connectionId. Resolves immediately if a slot
   * is available, otherwise waits until one is freed.
   * @param connectionId - The connection to throttle on.
   * @returns A release function that MUST be called when the request completes.
   */
  acquire(connectionId: string): Promise<() => void> {
    const current = this.active.get(connectionId) || 0;

    if (current < this.maxConcurrent) {
      this.active.set(connectionId, current + 1);
      return Promise.resolve(() => this.release(connectionId));
    }

    return new Promise<() => void>((resolve) => {
      const queue = this.queues.get(connectionId) || [];
      queue.push({
        resolve: () => {
          this.active.set(connectionId, (this.active.get(connectionId) || 0) + 1);
          resolve(() => this.release(connectionId));
        },
      });
      this.queues.set(connectionId, queue);
    });
  }

  /**
   * Releases a slot for the given connectionId and dequeues the next waiting request.
   * @param connectionId - The connection to release a slot for.
   */
  private release(connectionId: string): void {
    const current = this.active.get(connectionId) || 0;
    this.active.set(connectionId, Math.max(0, current - 1));

    const queue = this.queues.get(connectionId);
    if (queue && queue.length > 0) {
      const next = queue.shift()!;
      next.resolve();
    }

    // Clean up empty maps
    if ((this.active.get(connectionId) || 0) === 0 && (!queue || queue.length === 0)) {
      this.active.delete(connectionId);
      this.queues.delete(connectionId);
    }
  }
}

/** Shared throttle instance for column fetch requests (max 3 concurrent per connection). */
export const columnFetchThrottle = new ConnectionThrottle(3);
