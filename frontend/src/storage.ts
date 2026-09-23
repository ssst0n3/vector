// IndexedDB 存储原语：应用数据（看板 / 任务 / 项目列表）的持久层。
// 打开失败（如 Safari 隐私模式、存储被禁用）时所有操作安全降级：
// 读返回 undefined、写/删返回 false 并告警，绝不抛错。

const OW64_DB_NAME = 'ow64'
const OW64_DB_VERSION = 1

export const OW64_BOARD_STORE = 'boards'
export const OW64_META_STORE = 'meta'

export type Ow64StoreName = typeof OW64_BOARD_STORE | typeof OW64_META_STORE

let dbPromise: Promise<IDBDatabase | null> | null = null

const openOw64Database = (): Promise<IDBDatabase | null> => {
  if (typeof indexedDB === 'undefined') {
    return Promise.resolve(null)
  }

  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      let request: IDBOpenDBRequest
      try {
        request = indexedDB.open(OW64_DB_NAME, OW64_DB_VERSION)
      } catch {
        resolve(null)
        return
      }

      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(OW64_BOARD_STORE)) {
          db.createObjectStore(OW64_BOARD_STORE)
        }
        if (!db.objectStoreNames.contains(OW64_META_STORE)) {
          db.createObjectStore(OW64_META_STORE)
        }
      }
      request.onsuccess = () => {
        request.result.onversionchange = () => request.result.close()
        resolve(request.result)
      }
      request.onerror = () => resolve(null)
      request.onblocked = () => resolve(null)
    })
  }

  return dbPromise
}

type Ow64Result<T> = { ok: true; value: T } | { ok: false }

const runOw64Request = async <T>(
  storeName: Ow64StoreName,
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<Ow64Result<T>> => {
  const db = await openOw64Database()
  if (!db) {
    return { ok: false }
  }

  return new Promise<Ow64Result<T>>((resolve) => {
    try {
      const tx = db.transaction(storeName, mode)
      const request = action(tx.objectStore(storeName))
      request.onsuccess = () => resolve({ ok: true, value: request.result })
      request.onerror = () => resolve({ ok: false })
      tx.onabort = () => resolve({ ok: false })
    } catch {
      resolve({ ok: false })
    }
  })
}

export const readOw64Record = async <T>(storeName: Ow64StoreName, key: string): Promise<T | undefined> => {
  const result = await runOw64Request(storeName, 'readonly', (store) => store.get(key))
  return result.ok ? (result.value as T | undefined) : undefined
}

export const writeOw64Record = async (storeName: Ow64StoreName, key: string, value: unknown): Promise<boolean> => {
  const result = await runOw64Request(storeName, 'readwrite', (store) => store.put(value, key))
  if (!result.ok) {
    console.warn(`[ow64] 写入 IndexedDB 失败（store: ${storeName}, key: ${key}），本次更改不会被持久化。`)
  }
  return result.ok
}

export const deleteOw64Record = async (storeName: Ow64StoreName, key: string): Promise<boolean> => {
  const result = await runOw64Request(storeName, 'readwrite', (store) => store.delete(key))
  return result.ok
}
