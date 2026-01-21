import { useState } from 'react';
import { FileUpload } from '../components/FileUpload';
import { ConfigForm } from '../components/ConfigForm';
import { Results } from '../components/Results';
import { MapResults } from '../components/MapResults';
import type { ProcessingParams, TCC, Team } from '../types';
import { parseExcel } from '../utils/excel';
import { runClustering } from '../utils/clustering';
import { LayoutDashboard, Zap, Database, AlertCircle, Map, List } from 'lucide-react';
import { saveHistory } from '../utils/historyStorage';

export const Dashboard = () => {
  const [params, setParams] = useState<ProcessingParams>({
    numberOfTeams: 5,
    tolerancePercent: 10
  });
  const [file, setFile] = useState<File | null>(null);
  const [tccs, setTCCs] = useState<TCC[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'table' | 'map'>('table');

  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);
    setTeams([]); // Reset results on new file
    setTCCs([]); // Clear old data immediately
    try {
      const parsedTCCs = await parseExcel(selectedFile);
      setTCCs(parsedTCCs);
    } catch (err: any) {
      setError(err.message || "Failed to read Excel file.");
      setFile(null);
      setTCCs([]);
    }
  };

  const handleParamChange = (key: keyof ProcessingParams, value: number) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  const handleProcess = () => {
    if (tccs.length === 0) {
      setError("Vui lòng tải lên file Excel hợp lệ trước.");
      return;
    }
    
    setIsProcessing(true);
    // Simulating async 
    setTimeout(() => {
       try {
         const resultTeams = runClustering(tccs, params);
         setTeams(resultTeams);
         setError(null);
         
         // Auto-save to history
         saveHistory({
             fileName: file?.name || `Phân bổ ${new Date().toLocaleString('vi-VN')}`,
             numberOfTeams: params.numberOfTeams,
             totalCustomers: tccs.reduce((acc, t) => acc + t.SL_VITRI, 0), // Calculate total from TCCs or teams
             teams: resultTeams
         });
         
       } catch (e: any) {
         setError("Lỗi trong quá trình phân nhóm: " + e.message);
       }
       setIsProcessing(false);
    }, 300);
  };

  return (
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-5 h-[calc(100vh-8rem)]">
         <div className="flex flex-col gap-4 h-full overflow-y-auto custom-scrollbar pr-1">
            
            {/* Project Setup Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-none">
                <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                   <h3 className="font-bold text-slate-800 flex items-center gap-2">
                     <LayoutDashboard className="w-5 h-5 text-[#20398B]" /> Thiết lập dự án
                   </h3>
                   {tccs.length > 0 && (
                      <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-1 rounded-full flex items-center gap-1">
                        <Zap className="w-3 h-3 fill-current" /> {tccs.length}
                      </span>
                   )}
                </div>
                
                <div className="p-4">
                   <p className="text-slate-500 text-sm mb-4">
                     Cấu hình tham số phân bổ đội nhóm và tải lên bản dữ liệu.
                   </p>
                   <FileUpload onFileSelect={handleFileSelect} selectedFileName={file?.name} />
                </div>
            </div>

            <ConfigForm 
              params={params} 
              onChange={handleParamChange} 
              onSubmit={handleProcess}
              disabled={isProcessing || tccs.length === 0}
            />
            
            {error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm animate-fade-in flex items-start gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
         </div>

         <div className="flex flex-col h-full overflow-hidden">
            {teams.length > 0 ? (
               <div className="h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                   <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                      <Results teams={teams} />
                   </div>
               </div>
            ) : tccs.length > 0 ? (
               <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in h-full flex flex-col">
                  {/* Title Header */}
                  <div className="px-6 py-4 flex items-center justify-between bg-slate-50 relative z-30 border-b border-slate-200">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2 text-base">
                        <Database className="w-5 h-5 text-[#20398B]" /> Xem trước dữ liệu ({tccs.length} dòng)
                      </h3>
                      <div className="flex items-center gap-3">
                         <div className="flex p-1 bg-white rounded-lg border border-slate-200 shadow-sm">
                            <button 
                              onClick={() => setPreviewMode('table')}
                              className={`p-1.5 rounded-md transition-all ${previewMode === 'table' ? 'bg-slate-100 text-[#20398B] font-bold' : 'text-slate-400 hover:text-slate-600'}`}
                              title="Xem dạng bảng"
                            >
                                <List className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => setPreviewMode('map')}
                              className={`p-1.5 rounded-md transition-all ${previewMode === 'map' ? 'bg-slate-100 text-[#20398B] font-bold' : 'text-slate-400 hover:text-slate-600'}`}
                              title="Xem bản đồ"
                            >
                                <Map className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="h-4 w-px bg-slate-300 mx-1"></div>
                        <button className="text-xs font-semibold text-[#20398B] hover:underline" onClick={() => setTCCs([])}>
                           Xóa dữ liệu
                        </button>
                      </div>
                  </div>
                  
                  {previewMode === 'map' ? (
                     <div className="flex-1 p-0 overflow-hidden relative z-10">
                        <MapResults teams={[{
                           id: 'input-preview',
                           name: 'Dữ liệu đầu vào',
                           tccs: tccs,
                           totalCustomers: tccs.reduce((acc, t) => acc + t.SL_VITRI, 0),
                           estimatedDistanceKm: 0
                        }]} />
                     </div>
                  ) : (
                     <>
                        {/* Fixed Table Header */}
                        <div className="bg-slate-50 border-b border-slate-200">
                           <table className="w-full text-sm text-left border-collapse table-fixed">
                              <thead className="text-xs text-slate-900 uppercase bg-slate-50">
                                    <tr>
                                       <th className="w-[10%] px-6 py-3 font-extrabold border-r border-slate-100 last:border-0">STT</th>
                                       <th className="w-[20%] px-6 py-3 font-extrabold border-r border-slate-100 last:border-0">Mã Trạm</th>
                                       <th className="w-[20%] px-6 py-3 font-extrabold border-r border-slate-100 last:border-0 text-right">Khách Hàng (SL)</th>
                                       <th className="w-[25%] px-6 py-3 font-extrabold border-r border-slate-100 last:border-0 text-right">Vĩ độ (Lat)</th>
                                       <th className="w-[25%] px-6 py-3 font-extrabold last:border-0 text-right pr-8">Kinh độ (Lng)</th> {/* Extra padding for scrollbar alignment */}
                                    </tr>
                              </thead>
                           </table>
                        </div>

                        {/* Scrollable Table Body */}
                        <div className="flex-1 overflow-auto custom-scrollbar bg-slate-50 relative z-10">
                           <table className="w-full text-sm text-left border-collapse table-fixed">
                              <tbody className="divide-y divide-slate-100 bg-white">
                                    {tccs.slice(0, 100).map((row, idx) => (
                                       <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                                          <td className="w-[10%] px-6 py-3 text-slate-500 font-mono border-r border-slate-50">{idx + 1}</td>
                                          <td className="w-[20%] px-6 py-3 font-medium text-slate-900 border-r border-slate-50">{row.MA_TRAM}</td>
                                          <td className="w-[20%] px-6 py-3 text-right text-slate-700 font-mono bg-slate-50/50 border-r border-slate-50">{row.SL_VITRI}</td>
                                          <td className="w-[25%] px-6 py-3 text-right text-slate-500 font-mono border-r border-slate-50">{row.LATITUDE}</td>
                                          <td className="w-[25%] px-6 py-3 text-right text-slate-500 font-mono">{row.LONGITUDE}</td>
                                       </tr>
                                    ))}
                              </tbody>
                           </table>
                           {tccs.length > 100 && (
                                 <div className="p-3 text-center text-xs text-slate-500 bg-slate-50/50 border-t border-slate-100">
                                    ... và {tccs.length - 100} dòng khác
                                 </div>
                           )}
                        </div>
                     </>
                  )}
               </div>
            ) : (
               <div className="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/30 w-full animate-fade-in min-h-[500px]">
                  <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-6">
                      <LayoutDashboard className="w-8 h-8 text-slate-300" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-600">Không gian làm việc trống</h3>
                  <p className="text-sm mt-2 text-slate-500 max-w-xs text-center leading-relaxed">
                    Vui lòng tải lên file Excel dữ liệu ở cột bên trái để xem trước và thực hiện phân bổ.
                  </p>
               </div>
            )}
         </div>
      </div>
  );
}
