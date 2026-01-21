import React, { useMemo, useState } from 'react';
import type { Team, TCC } from '../types';
import { TeamCard } from './TeamCard';
import { Download, LayoutGrid, List, Map, ArrowRightLeft } from 'lucide-react';
import { MapResults } from './MapResults';
import * as XLSX from 'xlsx';

interface ResultsProps {
  teams: Team[];
  onMoveTcc?: (tcc: TCC, fromTeamId: string, toTeamId: string) => void;
}

export const Results: React.FC<ResultsProps> = ({ teams, onMoveTcc }) => {
  const [viewMode, setViewMode] = useState<'grid' | 'table' | 'map'>('table');
  const [movingRowKey, setMovingRowKey] = useState<string | null>(null);
  
  const exportToExcel = () => {
    // ... (keep existing)
    const rows = teams.flatMap(t => 
      t.tccs.map(tcc => ({
        Team_ID: t.id,
        Team_Name: t.name,
        Team_Total_SL: t.totalCustomers,
        Team_Distance_KM: t.estimatedDistanceKm,
        MA_TRAM: tcc.MA_TRAM,
        TEN_TRAM: tcc.TEN_TRAM || '',
        SL_VITRI: tcc.SL_VITRI,
        LAT: tcc.LATITUDE,
        LNG: tcc.LONGITUDE
      }))
    );

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Allocated Teams");
    XLSX.writeFile(wb, "TCC_Allocation_Result.xlsx");
  };

  const stats = useMemo(() => {
    if (teams.length === 0) return null;
    const totalCustomers = teams.reduce((acc, t) => acc + t.totalCustomers, 0);
    const totalDistance = teams.reduce((acc, t) => acc + t.estimatedDistanceKm, 0);
    const avgCustomers = Math.round(totalCustomers / teams.length);
    
    return { totalCustomers, totalDistance, avgCustomers };
  }, [teams]);

  // Flatten data for table view
  const flatData = useMemo(() => {
    return teams.flatMap(team => 
        team.tccs.map(tcc => ({
            ...tcc,
            teamName: team.name,
            teamId: team.id
        }))
    );
  }, [teams]);

  if (teams.length === 0) return null;

  return (
    <div className="animate-fade-in pb-8">
      <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-3">
        <div>
           <h2 className="text-xl font-bold text-slate-800 mb-1">Kết quả phân bổ</h2>
           <p className="text-slate-500 text-xs text-sm">Đã phân bổ thành công cho {teams.length} nhóm thi công.</p>
        </div>
        <div className="flex items-center gap-2">
            <div className="flex p-1 bg-slate-100 rounded-lg border border-slate-200">
                <button 
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-[#20398B]' : 'text-slate-400 hover:text-slate-600'}`}
                  title="Xem dạng thẻ"
                >
                    <LayoutGrid className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-white shadow-sm text-[#20398B]' : 'text-slate-400 hover:text-slate-600'}`}
                   title="Xem dạng bảng"
                >
                    <List className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setViewMode('map')}
                  className={`p-1.5 rounded-md transition-all ${viewMode === 'map' ? 'bg-white shadow-sm text-[#20398B]' : 'text-slate-400 hover:text-slate-600'}`}
                   title="Xem bản đồ"
                >
                    <Map className="w-4 h-4" />
                </button>
            </div>
            <button 
                onClick={exportToExcel} 
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-sm font-semibold transition-all hover:shadow-md text-sm"
            >
            <Download className="w-4 h-4" /> Xuất Báo Cáo
            </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-2 border-l-2 border-[#20398B]">
              <p className="text-slate-500 text-[10px] font-medium uppercase tracking-wide">Tổng số khách hàng</p>
              <p className="text-base font-bold text-slate-800 mt-0.5">{stats?.totalCustomers.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-2 border-l-2 border-indigo-500">
              <p className="text-slate-500 text-[10px] font-medium uppercase tracking-wide">Trung bình mỗi nhóm</p>
              <p className="text-base font-bold text-slate-800 mt-0.5">{stats?.avgCustomers.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-2 border-l-2 border-emerald-500">
              <p className="text-slate-500 text-[10px] font-medium uppercase tracking-wide">Tổng quãng đường ước tính</p>
              <p className="text-base font-bold text-slate-800 mt-0.5">{stats?.totalDistance.toFixed(1)} km</p>
          </div>
      </div>
      
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {teams.map((team, idx) => (
            <TeamCard 
              key={team.id} 
              team={team} 
              index={idx} 
              allTeams={teams} 
              onMoveTcc={onMoveTcc} 
            />
            ))}
        </div>
      ) : viewMode === 'map' ? (
        <MapResults teams={teams} onMoveTcc={onMoveTcc} />
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in">
             <div className="overflow-x-auto max-h-[600px]">
                <table className="w-full text-sm text-left border-collapse">
                    <thead className="text-xs text-slate-900 uppercase bg-slate-50 sticky top-0 z-20">
                        <tr>
                            <th className="px-6 py-3 font-extrabold border-b border-slate-200">Nhóm (Team)</th>
                            <th className="px-6 py-3 font-extrabold border-b border-slate-200">STT</th>
                            <th className="px-6 py-3 font-extrabold border-b border-slate-200">Mã Trạm</th>
                            <th className="px-6 py-3 font-extrabold border-b border-slate-200">Tên Trạm</th>
                            <th className="px-6 py-3 font-extrabold border-b border-slate-200 text-right">Khách Hàng (SL)</th>
                            <th className="px-6 py-3 font-extrabold border-b border-slate-200 text-right">Vĩ độ (Lat)</th>
                            <th className="px-6 py-3 font-extrabold border-b border-slate-200 text-right">Kinh độ (Lng)</th>
                            <th className="px-6 py-3 font-extrabold border-b border-slate-200 text-center">Tác vụ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {flatData.map((row, idx) => (
                            <tr key={`${row.teamId}-${row.MA_TRAM}`} className="hover:bg-slate-50/80 transition-colors">
                                <td className="px-6 py-3 font-medium text-[#20398B]">{row.teamName}</td>
                                <td className="px-6 py-3 text-slate-500 font-mono">{idx + 1}</td>
                                <td className="px-6 py-3 font-medium text-slate-900">{row.MA_TRAM}</td>
                                <td className="px-6 py-3 text-slate-600 font-mono text-xs">{row.TEN_TRAM}</td>
                                <td className="px-6 py-3 text-right text-slate-700 font-mono bg-slate-50/50">{row.SL_VITRI}</td>
                                <td className="px-6 py-3 text-right text-slate-500 font-mono">{row.LATITUDE}</td>
                                <td className="px-6 py-3 text-right text-slate-500 font-mono">{row.LONGITUDE}</td>
                                <td className="px-6 py-3 text-center">
                                    {onMoveTcc && (
                                        <div className="relative inline-block">
                                            <button
                                                onClick={() => {
                                                    const key = `${row.teamId}-${row.MA_TRAM}`;
                                                    setMovingRowKey(movingRowKey === key ? null : key);
                                                }}
                                                className={`flex items-center gap-1.5 px-2 py-1.5 rounded transition-all text-xs font-medium border ${movingRowKey === `${row.teamId}-${row.MA_TRAM}` ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600'}`}
                                            >
                                                <ArrowRightLeft className="w-3.5 h-3.5" />
                                                <span>Chuyển</span>
                                            </button>

                                            {movingRowKey === `${row.teamId}-${row.MA_TRAM}` && (
                                                <div className="absolute right-0 top-full mt-1 z-[100] w-64 bg-white rounded-lg shadow-xl border border-slate-200 p-3 animate-fade-in-down text-left">
                                                    <div className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wider">
                                                        Chọn nhóm đích:
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-1.5">
                                                        {teams.filter(t => t.id !== row.teamId).map(t => {
                                                            // Calculate color index based on original list index
                                                            const originalIdx = teams.findIndex(team => team.id === t.id);
                                                            const color = ['#ef4444', '#3b82f6', '#22c55e', '#f97316', '#a855f7', '#06b6d4', '#e11d48', '#8b5cf6', '#10b981', '#f59e0b'][originalIdx % 10]; // TEAM_COLORS duplicated here for simplicity or export it

                                                            return (
                                                                <button
                                                                    key={t.id}
                                                                    onClick={() => {
                                                                        const tcc: TCC = {
                                                                            MA_TRAM: row.MA_TRAM,
                                                                            LATITUDE: row.LATITUDE,
                                                                            LONGITUDE: row.LONGITUDE,
                                                                            SL_VITRI: row.SL_VITRI,
                                                                            TEN_TRAM: row.TEN_TRAM
                                                                        };
                                                                        onMoveTcc(tcc, row.teamId, t.id);
                                                                        setMovingRowKey(null);
                                                                    }}
                                                                    className="flex items-center justify-center p-1.5 rounded border hover:shadow-sm transition-all text-[10px] font-semibold text-slate-600 gap-1 bg-slate-50 hover:bg-white"
                                                                    style={{ borderColor: color }}
                                                                    title={`Chuyển sang ${t.name}`}
                                                                >
                                                                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                                                                    {t.name.replace('Nhóm ', '#')}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
             </div>
             <div className="p-3 bg-slate-50 border-t border-slate-200 text-right text-xs text-slate-500">
                Hiển thị {flatData.length} kết quả
             </div>
        </div>
      )}
    </div>
  );
};
