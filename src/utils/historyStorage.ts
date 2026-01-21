export interface HistoryRecord {
  id: string;
  timestamp: number;
  fileName: string;
  numberOfTeams: number;
  totalCustomers: number;
  teams: any[]; // Storing full team structure
}

const STORAGE_KEY = 'evn_allocation_history';

// Mock initial data to simulate "loading from JSON"
const MOCK_HISTORY: HistoryRecord[] = [
  {
    id: 'mock-1',
    timestamp: Date.now() - 86400000 * 2, // 2 days ago
    fileName: 'dulieu_thang12_2025.xlsx',
    numberOfTeams: 4,
    totalCustomers: 450,
    teams: [] // Empty for mock to save space
  },
  {
    id: 'mock-2',
    timestamp: Date.now() - 86400000 * 5, // 5 days ago
    fileName: 'dulieu_thang11_2025.xlsx',
    numberOfTeams: 6,
    totalCustomers: 620,
    teams: []
  }
];

export const getHistory = (): HistoryRecord[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    // If empty, initialize with mock data/file json
    localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_HISTORY));
    return MOCK_HISTORY;
  }
  return JSON.parse(data);
};

export const saveHistory = (record: Omit<HistoryRecord, 'id' | 'timestamp'>) => {
  const history = getHistory();
  const newRecord: HistoryRecord = {
    ...record,
    id: crypto.randomUUID(),
    timestamp: Date.now()
  };
  
  const updatedHistory = [newRecord, ...history];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
};

export const deleteHistory = (id: string) => {
    const history = getHistory();
    const updated = history.filter(h => h.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}
