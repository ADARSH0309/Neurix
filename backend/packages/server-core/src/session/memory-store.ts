/**
 * In-memory Redis replacement for when Redis is unavailable.
 * Supports the subset of ioredis API used by the application.
 * Sessions/tokens are lost on restart but the app remains functional.
 */

import { EventEmitter } from 'events';

interface StoredEntry {
  value: string;
  expiresAt?: number;
}

export class MemoryStore extends EventEmitter {
  private store = new Map<string, StoredEntry>();
  private timers = new Map<string, NodeJS.Timeout>();
  public status: string = 'ready';

  constructor() {
    super();
    // Emit ready on next tick so listeners can attach first
    process.nextTick(() => {
      this.emit('connect');
      this.emit('ready');
    });

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'warn',
      message: 'Using in-memory store (no Redis). Sessions will not persist across restarts.',
    }));
  }

  private isExpired(entry: StoredEntry): boolean {
    return entry.expiresAt !== undefined && Date.now() > entry.expiresAt;
  }

  private cleanup(key: string): void {
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
  }

  private setExpiry(key: string, seconds: number): void {
    this.cleanup(key);
    const timer = setTimeout(() => {
      this.store.delete(key);
      this.timers.delete(key);
    }, seconds * 1000);
    timer.unref(); // Don't block process exit
    this.timers.set(key, timer);
  }

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (this.isExpired(entry)) {
      this.store.delete(key);
      this.cleanup(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string): Promise<'OK'> {
    this.store.set(key, { value });
    return 'OK';
  }

  async setex(key: string, seconds: number, value: string): Promise<'OK'> {
    this.store.set(key, { value, expiresAt: Date.now() + seconds * 1000 });
    this.setExpiry(key, seconds);
    return 'OK';
  }

  async del(...keys: string[]): Promise<number> {
    let count = 0;
    for (const key of keys) {
      if (this.store.delete(key)) count++;
      this.cleanup(key);
    }
    return count;
  }

  async incr(key: string): Promise<number> {
    const entry = this.store.get(key);
    const current = entry && !this.isExpired(entry) ? parseInt(entry.value, 10) || 0 : 0;
    const next = current + 1;
    if (entry) {
      entry.value = String(next);
    } else {
      this.store.set(key, { value: String(next) });
    }
    return next;
  }

  async decr(key: string): Promise<number> {
    const entry = this.store.get(key);
    const current = entry && !this.isExpired(entry) ? parseInt(entry.value, 10) || 0 : 0;
    const next = current - 1;
    if (entry) {
      entry.value = String(next);
    } else {
      this.store.set(key, { value: String(next) });
    }
    return next;
  }

  async ttl(key: string): Promise<number> {
    const entry = this.store.get(key);
    if (!entry || !entry.expiresAt) return -1;
    if (this.isExpired(entry)) return -2;
    return Math.ceil((entry.expiresAt - Date.now()) / 1000);
  }

  async watch(): Promise<'OK'> { return 'OK'; }
  async unwatch(): Promise<'OK'> { return 'OK'; }

  multi(): any {
    const commands: Array<{ method: string; args: any[] }> = [];
    const self = this;
    const chain = {
      setex(key: string, seconds: number, value: string) {
        commands.push({ method: 'setex', args: [key, seconds, value] });
        return chain;
      },
      del(...keys: string[]) {
        commands.push({ method: 'del', args: keys });
        return chain;
      },
      async exec() {
        const results: Array<[Error | null, any]> = [];
        for (const cmd of commands) {
          try {
            const result = await (self as any)[cmd.method](...cmd.args);
            results.push([null, result]);
          } catch (e) {
            results.push([e as Error, null]);
          }
        }
        return results;
      },
    };
    return chain;
  }

  pipeline(): any {
    return this.multi();
  }

  async eval(script: string, numKeys: number, ...args: any[]): Promise<any> {
    // Simplified eval for the rate limiter Lua script
    const key = args[0] as string;
    const windowSeconds = parseInt(args[1] as string, 10);
    const hits = await this.incr(key);
    if (hits === 1) {
      const entry = this.store.get(key);
      if (entry) {
        entry.expiresAt = Date.now() + windowSeconds * 1000;
        this.setExpiry(key, windowSeconds);
      }
    }
    const ttl = await this.ttl(key);
    return [hits, ttl];
  }

  scanStream(options?: { match?: string; count?: number }): any {
    const pattern = options?.match || '*';
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    const matchingKeys = Array.from(this.store.keys()).filter(k => regex.test(k));

    const emitter = new EventEmitter();
    process.nextTick(() => {
      emitter.emit('data', matchingKeys);
      emitter.emit('end');
    });
    return emitter;
  }

  async connect(): Promise<void> { /* no-op */ }
  async quit(): Promise<'OK'> {
    this.store.clear();
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
    return 'OK';
  }
}
