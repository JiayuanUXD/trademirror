// 进程内 TTL 缓存
//
// 用途：行情/指数等"短时间内重复请求的相同上游"
// - 单例 Map，跨请求复用
// - lazy 过期：读时检查 expiresAt
// - Vercel 每个 lambda 一份；TTL ≤ 60s 时冷启动也不会比无缓存更糟

type Entry<T> = { value: T; expiresAt: number };

const STORE_KEY = Symbol.for("trademirror.quotes.cache");

type GlobalWithStore = typeof globalThis & {
  [STORE_KEY]?: Map<string, Entry<unknown>>;
};

function store(): Map<string, Entry<unknown>> {
  const g = globalThis as GlobalWithStore;
  if (!g[STORE_KEY]) g[STORE_KEY] = new Map();
  return g[STORE_KEY];
}

export function getCached<T>(key: string): T | null {
  const e = store().get(key) as Entry<T> | undefined;
  if (!e) return null;
  if (Date.now() > e.expiresAt) {
    store().delete(key);
    return null;
  }
  return e.value;
}

export function setCached<T>(key: string, value: T, ttlMs: number): void {
  store().set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function clearCache(prefix?: string): void {
  if (!prefix) {
    store().clear();
    return;
  }
  for (const k of store().keys()) {
    if (k.startsWith(prefix)) store().delete(k);
  }
}
