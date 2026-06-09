// Simple, robust Redis client fallback utilizing in-memory maps for tracking IP deduplication and clicks
// This guarantees that the system runs smoothly even if a live Redis instance is not configured locally.

class MemoryRedis {
  private store = new Map<string, { value: string; expiry: number }>()

  async get(key: string): Promise<string | null> {
    const item = this.store.get(key)
    if (!item) return null
    if (Date.now() > item.expiry) {
      this.store.delete(key)
      return null
    }
    return item.value
  }

  async set(key: string, value: string, mode?: 'EX', ttlSeconds?: number): Promise<'OK'> {
    const expiry = mode === 'EX' && ttlSeconds ? Date.now() + ttlSeconds * 1000 : Infinity
    this.store.set(key, { value, expiry })
    return 'OK'
  }

  async exists(key: string): Promise<number> {
    const value = await this.get(key)
    return value !== null ? 1 : 0
  }

  async del(key: string): Promise<number> {
    const existed = this.store.has(key)
    this.store.delete(key)
    return existed ? 1 : 0
  }

  async incr(key: string): Promise<number> {
    const valStr = await this.get(key)
    const val = valStr ? parseInt(valStr, 10) : 0
    const newVal = val + 1
    await this.set(key, newVal.toString())
    return newVal
  }
}

export const redis = new MemoryRedis()
export default redis
