type Bucket = {
  timestamps: number[]
}

const store = new Map<string, Bucket>()

export function rateLimit(key: string, limit: number, windowMs: number): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  const bucket = store.get(key) || { timestamps: [] }
  // prune old
  bucket.timestamps = bucket.timestamps.filter(ts => now - ts < windowMs)
  if (bucket.timestamps.length >= limit) {
    const retryAfter = windowMs - (now - bucket.timestamps[0])
    store.set(key, bucket)
    return { allowed: false, retryAfter }
  }
  bucket.timestamps.push(now)
  store.set(key, bucket)
  return { allowed: true }
}


