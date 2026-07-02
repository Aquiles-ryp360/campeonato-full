import "server-only";

import type { IdentityLookupResult } from "@/lib/identity/identity-lookup";

export interface IdentityLookupCache {
  get(key: string): Promise<IdentityLookupResult | null>;
  set(key: string, value: IdentityLookupResult, ttlMs: number): Promise<void>;
}

export class MemoryIdentityLookupCache implements IdentityLookupCache {
  private readonly store = new Map<string, { value: IdentityLookupResult; expiresAt: number }>();

  async get(key: string) {
    const current = this.store.get(key);
    if (!current) return null;

    if (current.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }

    return current.value;
  }

  async set(key: string, value: IdentityLookupResult, ttlMs: number) {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs
    });
  }
}

export const identityLookupCache = new MemoryIdentityLookupCache();
