import type { Team } from '../types';

export interface HistoryRecord {
  id: string;
  timestamp: number;
  fileName: string;
  numberOfTeams: number;
  totalCustomers: number;
  teams: Team[]; // Storing full team structure
  totalDistance?: number;
}

const DB_NAME = 'EvnAllocatorDB';
const DB_VERSION = 1;
const STORE_NAME = 'history';

const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error("IndexedDB error:", event);
            reject("Failed to open database");
        };

        request.onsuccess = (event) => {
            resolve((event.target as IDBOpenDBRequest).result);
        };

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                store.createIndex('timestamp', 'timestamp', { unique: false });
            }
        };
    });
};

export const getHistory = async (): Promise<HistoryRecord[]> => {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const index = store.index('timestamp');
            const request = index.getAll();

            request.onsuccess = () => {
                // Return sorted newest first
                const records = (request.result as HistoryRecord[]).sort((a, b) => b.timestamp - a.timestamp);
                resolve(records);
            };

            request.onerror = () => {
                reject("Failed to fetch history");
            };
        });
    } catch (e) {
        console.error("Error getting history:", e);
        return [];
    }
};

export const saveHistory = async (record: Omit<HistoryRecord, 'id' | 'timestamp'>) => {
    const newRecord: HistoryRecord = {
        ...record,
        id: crypto.randomUUID(),
        timestamp: Date.now()
    };
    
    try {
        const db = await openDB();
        return new Promise<void>((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.add(newRecord);

            request.onsuccess = () => {
                resolve();
            };

            request.onerror = (e) => {
                console.error("Error saving history:", e);
                reject("Failed to save history");
            };
        });
    } catch (e) {
        console.error("Failed to save history record", e);
    }
};

export const deleteHistory = async (id: string) => {
    try {
        const db = await openDB();
        return new Promise<void>((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(id);

            request.onsuccess = () => {
                resolve();
            };

            request.onerror = (e) => {
                console.error("Error deleting history:", e);
                reject("Failed to delete history");
            };
        });
    } catch (e) {
        console.error("Failed to delete history record", e);
    }
}
