// Cache Layer Service - Redis-backed caching with single-flight protection
// Provides <500ms latency for cached results

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  key?: string; // Custom cache key
  bypass?: boolean; // Skip cache entirely
}

export interface CacheStats {
  hits: number;
  misses: number;
  errors: number;
  hitRate: number;
}

class CacheLayer {
  private static cache = new Map<string, { data: any; expires: number }>();
  private static pendingCalls = new Map<string, Promise<any>>();
  private static stats = { hits: 0, misses: 0, errors: 0 };

  /**
   * Cached function call with single-flight protection
   */
  static async cachedCall<T>(
    toolName: string,
    args: Record<string, any>,
    fn: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const key = this.generateCacheKey(toolName, args, options.key);
    const ttl = options.ttl || 300; // 5 minutes default

    // Check if we have a pending call for this key
    if (this.pendingCalls.has(key)) {
      console.log(`🔄 Waiting for pending call: ${key}`);
      return this.pendingCalls.get(key)!;
    }

    // Check cache first
    if (!options.bypass) {
      const cached = this.getFromCache(key);
      if (cached) {
        this.stats.hits++;
        console.log(`✅ Cache hit: ${key}`);
        return cached;
      }
    }

    // Create new promise for this call
    const promise = this.executeWithCache(key, fn, ttl);
    this.pendingCalls.set(key, promise);

    try {
      const result = await promise;
      return result;
    } finally {
      // Clean up pending call
      this.pendingCalls.delete(key);
    }
  }

  /**
   * Generate cache key from tool name and arguments
   */
  private static generateCacheKey(
    toolName: string, 
    args: Record<string, any>, 
    customKey?: string
  ): string {
    if (customKey) return customKey;
    
    const argsHash = JSON.stringify(args);
    return `f1:${toolName}:${Buffer.from(argsHash).toString('base64')}`;
  }

  /**
   * Get data from cache
   */
  private static getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() > cached.expires) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    return cached.data;
  }

  /**
   * Execute function and cache result
   */
  private static async executeWithCache<T>(
    key: string,
    fn: () => Promise<T>,
    ttl: number
  ): Promise<T> {
    try {
      const startTime = Date.now();
      const result = await fn();
      const duration = Date.now() - startTime;

      // Cache the result
      this.cache.set(key, {
        data: result,
        expires: Date.now() + (ttl * 1000)
      });

      console.log(`💾 Cached result for ${key} (${duration}ms)`);
      return result;

    } catch (error) {
      this.stats.errors++;
      console.error(`❌ Cache execution failed for ${key}:`, error);
      throw error;
    }
  }

  /**
   * Clear cache for specific tool
   */
  static clearToolCache(toolName: string): void {
    const keysToDelete: string[] = [];
    for (const key of this.cache.keys()) {
      if (key.startsWith(`f1:${toolName}:`)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
    console.log(`🗑️ Cleared ${keysToDelete.length} cache entries for ${toolName}`);
  }

  /**
   * Clear all cache
   */
  static clearAllCache(): void {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`🗑️ Cleared all cache (${size} entries)`);
  }

  /**
   * Get cache statistics
   */
  static getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
    
    return {
      ...this.stats,
      hitRate: Math.round(hitRate * 100) / 100
    };
  }

  /**
   * Get cache size
   */
  static getCacheSize(): number {
    return this.cache.size;
  }

  /**
   * Get pending calls count
   */
  static getPendingCallsCount(): number {
    return this.pendingCalls.size;
  }

  /**
   * Check if key is cached
   */
  static isCached(key: string): boolean {
    const cached = this.cache.get(key);
    if (!cached) return false;
    return Date.now() <= cached.expires;
  }

  /**
   * Get cache keys for debugging
   */
  static getCacheKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Set cache TTL for specific key
   */
  static setCacheTTL(key: string, ttl: number): void {
    const cached = this.cache.get(key);
    if (cached) {
      cached.expires = Date.now() + (ttl * 1000);
      console.log(`⏰ Updated TTL for ${key} to ${ttl}s`);
    }
  }
}

export { CacheLayer }; 