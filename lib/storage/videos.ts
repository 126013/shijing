'use client';

/** 影片本地存储：IndexedDB，元数据与 Blob 分两个表，列表查询不拉取视频体。 */

export interface FilmMeta {
  id: string;
  poemId: string;
  poemTitle: string;
  author: string;
  dynasty: string;
  createdAt: number;
  durationMs: number;
  size: number;
  mimeType: string;
  sceneCount: number;
  hasVoice: boolean;
}

const DB_NAME = 'shijing-films';
const DB_VERSION = 1;
const META_STORE = 'meta';
const BLOB_STORE = 'blobs';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(BLOB_STORE)) {
        db.createObjectStore(BLOB_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('无法打开本地影片库'));
  });
}

function tx<T>(db: IDBDatabase, stores: string[], mode: IDBTransactionMode, run: (t: IDBTransaction) => IDBRequest<T> | void): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(stores, mode);
    let request: IDBRequest<T> | void;
    transaction.oncomplete = () => {
      if (request && 'result' in request) resolve(request.result);
      else resolve(undefined);
    };
    transaction.onerror = () => reject(transaction.error ?? new Error('本地存储写入失败'));
    transaction.onabort = () => reject(transaction.error ?? new Error('本地存储事务被中止'));
    try {
      request = run(transaction);
    } catch (cause) {
      reject(cause instanceof Error ? cause : new Error('本地存储操作失败'));
    }
  });
}

export function isStorageSupported(): boolean {
  return typeof window !== 'undefined' && 'indexedDB' in window;
}

export async function saveFilm(meta: FilmMeta, blob: Blob): Promise<void> {
  const db = await openDb();
  try {
    await tx(db, [META_STORE], 'readwrite', (transaction) => {
      transaction.objectStore(META_STORE).put(meta);
    });
    await tx(db, [BLOB_STORE], 'readwrite', (transaction) => {
      transaction.objectStore(BLOB_STORE).put(blob, meta.id);
    });
  } finally {
    db.close();
  }
}

export async function listFilms(): Promise<FilmMeta[]> {
  const db = await openDb();
  try {
    const result = await tx<FilmMeta[]>(db, [META_STORE], 'readonly', (transaction) =>
      transaction.objectStore(META_STORE).getAll() as IDBRequest<FilmMeta[]>,
    );
    return (result ?? []).sort((a, b) => b.createdAt - a.createdAt);
  } finally {
    db.close();
  }
}

export async function loadFilmBlob(id: string): Promise<Blob | null> {
  const db = await openDb();
  try {
    const result = await tx<Blob>(db, [BLOB_STORE], 'readonly', (transaction) =>
      transaction.objectStore(BLOB_STORE).get(id) as IDBRequest<Blob>,
    );
    return result ?? null;
  } finally {
    db.close();
  }
}

export async function deleteFilm(id: string): Promise<void> {
  const db = await openDb();
  try {
    await tx(db, [META_STORE], 'readwrite', (transaction) => {
      transaction.objectStore(META_STORE).delete(id);
    });
    await tx(db, [BLOB_STORE], 'readwrite', (transaction) => {
      transaction.objectStore(BLOB_STORE).delete(id);
    });
  } finally {
    db.close();
  }
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function formatDuration(ms: number): string {
  const total = Math.round(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
