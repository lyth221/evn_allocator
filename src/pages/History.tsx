import { useEffect, useState } from 'react';
import { Clock, FileSpreadsheet, Eye, X, Loader2, Trash2, Download, AlertTriangle } from 'lucide-react';
import { Results } from '../components/Results';
import * as XLSX from 'xlsx';
import type { Team, TCC } from '../types';

export const History = () => {
  const [savedFiles, setSavedFiles] = useState<{name: string, size: number, mtime: string}[]>([]);
  const [viewingFile, setViewingFile] = useState<{fileName: string, teams: Team[]} | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchSavedFiles();
  }, []);

  const fetchSavedFiles = async () => {
    try {
        const res = await fetch('/api/history-files');
        if (res.ok) {
            const data = await res.json();
            setSavedFiles(data);
        }
    } catch (e) {
        console.error("Failed to fetch saved files", e);
    }
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    
    try {
        const res = await fetch(`/api/history-files/${encodeURIComponent(itemToDelete)}`, {
            method: 'DELETE'
        });
        
        if (res.ok) {
            await fetchSavedFiles();
            if (viewingFile?.fileName === itemToDelete) {
                setViewingFile(null);
            }
        } else {
            console.error("Failed to delete file");
        }
    } catch (e) {
        console.error("Failed to delete file", e);
    } finally {
        setItemToDelete(null);
    }
  };

  const startDelete = (fileName: string) => {
    setItemToDelete(fileName);
  };

  const handleViewFile = async (fileName: string) => {
    // ... (existing logic) ...
    setIsLoading(true);
    try {
        const response = await fetch(`/history/${fileName}`);
        const arrayBuffer = await response.arrayBuffer();
        const wb = XLSX.read(arrayBuffer);
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data: any[] = XLSX.utils.sheet_to_json(ws);

        // Reconstruct Teams from flat Excel data
        const teamsMap = new Map<string, Team>();

        data.forEach((row: any) => {
            // Updated to match exportToExcel keys in Results.tsx
            const teamName = row['Team_Name'] || 'Chưa phân bổ';
            
            if (!teamsMap.has(teamName)) {
                teamsMap.set(teamName, {
                    id: row['Team_ID'] || `team_${Math.random()}`,
                    name: teamName,
                    tccs: [],
                    totalCustomers: 0,
                    estimatedDistanceKm: 0 // Will recalculate or use row['Team_Distance_KM'] if we want per-row but it's per team
                });
            }

            const team = teamsMap.get(teamName)!;
            
            // Use explicit LAT/LNG columns if available
            let lat = 0, lng = 0;
            if (row['LAT'] !== undefined && row['LNG'] !== undefined) {
                lat = parseFloat(row['LAT']);
                lng = parseFloat(row['LNG']);
            } else if (row['Tọa độ']) {
                // Fallback for older format if exists
                const parts = row['Tọa độ'].split(',').map((s: string) => s.trim());
                if (parts.length === 2) {
                    lat = parseFloat(parts[0]);
                    lng = parseFloat(parts[1]);
                }
            }

            const tcc: TCC = {
                MA_TRAM: row['MA_TRAM'] || row['Mã Trạm'] || 'UNKNOWN',
                TEN_TRAM: row['TEN_TRAM'] || '',
                LONGITUDE: lng,
                LATITUDE: lat,
                SL_VITRI: parseInt(row['SL_VITRI'] || '1', 10),
            };
            
            team.tccs.push(tcc);
            
            // If row has Team stats, we could use them, but better to recalc or take last non-empty
            if (row['Team_Distance_KM']) {
                team.estimatedDistanceKm = parseFloat(row['Team_Distance_KM']);
            }
        });

        // Recalculate totals
        const teams = Array.from(teamsMap.values()).map(t => ({
            ...t,
            totalCustomers: t.tccs.length // Approximate since we might imply 1 TCC = 1 customer if data missing
        }));

        setViewingFile({ fileName, teams });
    } catch (e) {
        console.error("Failed to parse file", e);
        alert("Không thể đọc file này. Định dạng có thể không hợp lệ.");
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col relative">
      {/* Delete Confirmation Modal */}
      {itemToDelete && (
          <div className="absolute inset-0 z-[60] bg-slate-900/20 backdrop-blur-sm flex items-center justify-center animate-fade-in p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 p-6">
                 <div className="flex items-center gap-4 text-red-600 mb-4">
                    <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center flex-none">
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-slate-800">Xác nhận xóa</h3>
                        <p className="text-sm text-slate-500">Hành động này không thể hoàn tác.</p>
                    </div>
                 </div>
                 
                 <p className="text-slate-600 mb-6 text-sm">
                    Bạn có chắc chắn muốn xóa file <span className="font-bold text-slate-800">{itemToDelete}</span> khỏi hệ thống không?
                 </p>

                 <div className="flex items-center justify-end gap-3">
                     <button 
                        onClick={() => setItemToDelete(null)}
                        className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                     >
                        Hủy bỏ
                     </button>
                     <button 
                        onClick={confirmDelete}
                        className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors shadow-sm flex items-center gap-2"
                     >
                        <Trash2 className="w-4 h-4" />
                        Xóa Vĩnh Viễn
                     </button>
                 </div>
              </div>
          </div>
      )}

      {/* Viewer Overlay */}
      {viewingFile && (
          <div className="absolute inset-0 z-50 bg-white rounded-xl shadow-2xl flex flex-col animate-fade-in overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
                  <h3 className="font-bold text-lg text-[#20398B] flex items-center gap-2">
                      <FileSpreadsheet className="w-5 h-5" /> 
                      Xem chi tiết: {viewingFile.fileName}
                  </h3>
                  <button 
                    onClick={() => setViewingFile(null)}
                    className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500 hover:text-red-500"
                  >
                      <X className="w-6 h-6" />
                  </button>
              </div>
              <div className="flex-1 overflow-hidden p-6 bg-slate-50">
                   <div className="bg-white rounded-xl border border-slate-200 h-full shadow-sm flex flex-col overflow-hidden">
                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                            <Results teams={viewingFile.teams} />
                        </div>
                   </div>
              </div>
          </div>
      )}

      <div className="flex items-center justify-between mb-6 flex-none">
         {/* ... Header ... */}
         <div>
            <h1 className="text-2xl font-bold text-[#20398B] flex items-center gap-3">
              <Clock className="w-8 h-8" /> Lịch sử phân bổ
            </h1>
            <p className="text-slate-500 mt-1">Danh sách các file kết quả đã được lưu trữ.</p>
         </div>
         
         <div className="bg-slate-100 p-1 rounded-lg border border-slate-200 flex gap-1">
             <button 
                onClick={fetchSavedFiles}
                className="px-4 py-2 text-sm font-medium rounded-md transition-all bg-white text-[#20398B] shadow-sm hover:bg-slate-50"
             >
                 Làm mới danh sách
             </button>
         </div>
      </div>
      
      {/* Table */}
      {/* ... */}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 h-full overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-green-600" /> 
                    Danh sách các file kết quả đã lưu
                </h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-0 custom-scrollbar">
                {savedFiles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-slate-400">
                        <FileSpreadsheet className="w-16 h-16 mb-4 opacity-20" />
                        <p>Chưa có file nào được lưu trong hệ thống.</p>
                    </div>
                ) : (
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-3 font-semibold w-[10%]">STT</th>
                                <th className="px-6 py-3 font-semibold w-[40%]">Tên File</th>
                                <th className="px-6 py-3 font-semibold w-[20%]">Thời gian lưu</th>
                                <th className="px-6 py-3 font-semibold w-[15%] text-right">Kích thước</th>
                                <th className="px-6 py-3 font-semibold w-[15%] text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {savedFiles.map((file, idx) => (
                                <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-6 py-4 text-slate-500">{idx + 1}</td>
                                    <td className="px-6 py-4 font-medium text-slate-900">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded bg-green-100 flex items-center justify-center text-green-600 flex-none">
                                                <FileSpreadsheet className="w-4 h-4" />
                                            </div>
                                            <span className="truncate" title={file.name}>{file.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">
                                        <div className="flex flex-col text-xs">
                                            <span className="font-medium">{new Date(file.mtime).toLocaleDateString('vi-VN')}</span>
                                            <span className="text-slate-400">{new Date(file.mtime).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right text-slate-600 font-mono text-xs">
                                        {(file.size / 1024).toFixed(1)} KB
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button 
                                                onClick={() => handleViewFile(file.name)}
                                                disabled={isLoading}
                                                className="p-2 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-all shadow-sm border border-blue-200"
                                                title="Xem chi tiết"
                                            >
                                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                            <a 
                                                href={`/history/${file.name}`} 
                                                download
                                                className="p-2 bg-white text-slate-600 rounded-md hover:bg-slate-50 hover:text-[#20398B] hover:border-[#20398B] transition-all shadow-sm border border-slate-300"
                                                title="Tải xuống"
                                            >
                                                <Download className="w-4 h-4" />
                                            </a>
                                            <button 
                                                onClick={() => startDelete(file.name)}
                                                className="p-2 bg-white text-slate-400 rounded-md hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all shadow-sm border border-slate-300"
                                                title="Xóa file"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    </div>
  );
};
