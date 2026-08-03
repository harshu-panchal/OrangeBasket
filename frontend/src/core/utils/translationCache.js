const DB_NAME = 'translation_cache';
const DB_VERSION = 1;
const STORE_NAME = 'translations';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

let dbPromise = null;

const getDB = () => {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not supported'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
  return dbPromise;
};

const getCacheKey = (text, sourceLang, targetLang) => {
  const cleanSource = (sourceLang || 'en').toLowerCase();
  const cleanTarget = (targetLang || 'en').toLowerCase();
  // Safe base64 encoding for Unicode characters
  const base64Text = btoa(encodeURIComponent(text).replace(/%([0-9A-F]{2})/g, (match, p1) => {
    return String.fromCharCode(parseInt(p1, 16));
  }));
  return `${cleanSource}_${cleanTarget}_${base64Text}`;
};

export const getCachedTranslation = async (text, sourceLang, targetLang) => {
  if (!text || typeof text !== 'string') return null;
  const key = getCacheKey(text, sourceLang, targetLang);
  
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);
      
      request.onsuccess = (e) => {
        const result = e.target.result;
        if (result) {
          if (result.expiry > Date.now()) {
            resolve(result.value);
          } else {
            deleteCachedTranslation(key);
            resolve(null);
          }
        } else {
          resolve(getLocalStorageFallback(key));
        }
      };
      
      request.onerror = () => {
        resolve(getLocalStorageFallback(key));
      };
    });
  } catch (err) {
    return getLocalStorageFallback(key);
  }
};

const getLocalStorageFallback = (key) => {
  try {
    const localVal = localStorage.getItem(`tx_${key}`);
    if (localVal) {
      const parsed = JSON.parse(localVal);
      if (parsed.expiry > Date.now()) {
        return parsed.value;
      }
      localStorage.removeItem(`tx_${key}`);
    }
  } catch {}
  return null;
};

const deleteCachedTranslation = async (key) => {
  try {
    const db = await getDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.delete(key);
  } catch {}
  try {
    localStorage.removeItem(`tx_${key}`);
  } catch {}
};

export const setCachedTranslation = async (text, sourceLang, targetLang, value) => {
  if (!value || value === text) return;
  const key = getCacheKey(text, sourceLang, targetLang);
  const expiry = Date.now() + CACHE_TTL;
  const entry = { key, value, expiry };

  try {
    const db = await getDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.put(entry);
  } catch (err) {
    // Silent fail for IndexedDB write
  }

  try {
    localStorage.setItem(`tx_${key}`, JSON.stringify(entry));
  } catch {}
};

export const cleanExpiredCache = async () => {
  try {
    const db = await getDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.openCursor();
    request.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) {
        if (cursor.value.expiry < Date.now()) {
          cursor.delete();
        }
        cursor.continue();
      }
    };
  } catch {}

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('tx_')) {
        try {
          const val = localStorage.getItem(key);
          if (val) {
            const parsed = JSON.parse(val);
            if (parsed.expiry < Date.now()) {
              localStorage.removeItem(key);
            }
          }
        } catch {
          localStorage.removeItem(key);
        }
      }
    }
  } catch {}
};

// Auto clean expired items on initialization
try {
  cleanExpiredCache();
} catch {}
