import React, { useEffect, useState } from 'react';
import { getHistory, deleteHistory, type HistoryRecord } from '../utils/historyStorage';
import { Clock, FileSpreadsheet, Trash2, Users, Calendar, ArrowRight } from 'lucide-react';
import { Results } from '../components/Results';

export const History = () => {
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<HistoryRecord | null>(null);

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Bạn có chắc chắn muốn xóa bản ghi này?')) {
        deleteHistory(id);
        setHistory(getHistory());
        if (selectedRecord?.id === id) {
            setSelectedRecord(null);
        }
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex items-center justify-between mb-6 flex-none">
         <div>
            <h1 className="text-2xl font-bold text-[#20398B] flex items-center gap-3">
              <Clock className="w-8 h-8" /> Lịch sử phân bổ
            </h1>
            <p className="text-slate-500 mt-1">Xem lại các phiên làm việc và kết quả phân bổ trước đây.</p>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full overflow-hidden">
          {/* History List */}
          <div className="lg:col-span-4 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 font-semibold text-slate-700">
                  Danh sách phiên
              </div>
              <div className="overflow-y-auto flex-1 custom-scrollbar">
                  {history.length === 0 ? (
                      <div className="p-8 text-center text-slate-400">
                          <Clock className="w-12 h-12 mx-auto mb-3 opacity-20" />
                          <p>Chưa có lịch sử nào.</p>
                      </div>
                  ) : (
                      <div className="divide-y divide-slate-100">
                          {history.map(record => (
                              <div 
                                key={record.id}
                                onClick={() => setSelectedRecord(record)}
                                className={`p-4 hover:bg-slate-50 cursor-pointer transition-colors group ${selectedRecord?.id === record.id ? 'bg-[#20398B]/5 border-l-4 border-[#20398B]' : 'border-l-4 border-transparent'}`}
                              >
                                  <div className="flex items-start justify-between mb-2">
                                      <h4 className="font-bold text-slate-800 line-clamp-1" title={record.fileName}>
                                          {record.fileName}
                                      </h4>
                                      <button 
                                        onClick={(e) => handleDelete(record.id, e)}
                                        className="text-slate-400 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                          <Trash2 className="w-4 h-4" />
                                      </button>
                                  </div>
                                  
                                  <div className="flex items-center gap-4 text-xs text-slate-500 mb-2">
                                      <span className="flex items-center gap-1">
                                          <Calendar className="w-3 h-3" />
                                          {new Date(record.timestamp).toLocaleDateString('vi-VN')}
                                      </span>
                                      <span className="flex items-center gap-1">
                                          <Clock className="w-3 h-3" />
                                          {new Date(record.timestamp).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}
                                      </span>
                                  </div>

                                  <div className="flex items-center gap-2 mt-3">
                                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                                          <Users className="w-3 h-3" /> {record.numberOfTeams} Teams
                                      </span>
                                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded text-xs font-medium">
                                          <FileSpreadsheet className="w-3 h-3" /> {record.totalCustomers} KH
                                      </span>
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}
              </div>
          </div>

          {/* Record Details */}
          <div className="lg:col-span-8 flex flex-col h-full overflow-hidden">
              {selectedRecord ? (
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 h-full flex flex-col overflow-hidden">
                      <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between flex-none">
                          <div>
                              <h3 className="font-bold text-lg text-slate-800">Chi tiết phân bổ</h3>
                              <p className="text-sm text-slate-500">
                                  {selectedRecord.fileName} • {new Date(selectedRecord.timestamp).toLocaleString('vi-VN')}
                              </p>
                          </div>
                      </div>
                      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                          {selectedRecord.teams.length > 0 ? (
                              <Results teams={selectedRecord.teams} />
                          ) : (
                              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                   <p>Dữ liệu kết quả không khả dụng cho bản ghi mẫu.</p>
                              </div>
                          )}
                      </div>
                  </div>
              ) : (
                  <div className="bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-xl h-full flex flex-col items-center justify-center text-slate-400">
                      <ArrowRight className="w-16 h-16 mb-4 opacity-20" />
                      <p className="text-lg font-medium">Chọn một phiên làm việc để xem chi tiết</p>
                  </div>
              )}
          </div>
      </div>
    </div>
  );
};
