export interface HistoryRecord {
  id: string;
  timestamp: number;
  fileName: string;
  numberOfTeams: number;
  totalCustomers: number;
  teams: any[]; // Storing full team structure
}



// Note: We are now using async APIs to talk to the server
// The synchronous functions are deprecated but kept for compatibility until refactoring is complete

export const getHistory = async (): Promise<HistoryRecord[]> => {
  try {
      const res = await fetch('/api/history-records');
      if (res.ok) {
          return await res.json();
      }
      return [];
  } catch (e) {
      console.error("Failed to fetch history records", e);
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
      await fetch('/api/save-history-json', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newRecord)
      });
  } catch (e) {
      console.error("Failed to save history record", e);
  }
};

export const deleteHistory = async (id: string) => {
    try {
        await fetch(`/api/history-records/${id}`, { method: 'DELETE' });
    } catch (e) {
        console.error("Failed to delete history record", e);
    }
}
