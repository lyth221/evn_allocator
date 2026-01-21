import React from 'react';
import { MapPin, Users, Navigation } from 'lucide-react';
import type { Team } from '../types';

interface TeamCardProps {
  team: Team;
  index: number;
}

export const TeamCard: React.FC<TeamCardProps> = ({ team, index }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow group animate-fade-in" style={{ animationDelay: `${index * 0.05}s` }}>
      {/* Header */}
      <div className="bg-slate-50 border-b border-slate-100 p-4 flex items-center justify-between">
        <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-[#20398B]/10 text-[#20398B] flex items-center justify-center text-sm font-bold border border-[#20398B]/10">
                {index + 1}
            </span>
            {team.name}
        </h3>
        <div className="px-3 py-1 bg-white border border-slate-200 rounded-full text-xs font-semibold text-slate-500 shadow-sm">
            {team.tccs.length} Trạm
        </div>
      </div>

      {/* Info Stats */}
      <div className="grid grid-cols-2 divide-x divide-slate-100 border-b border-slate-100 bg-white">
          <div className="p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Users className="w-4 h-4" />
              </div>
              <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Khách Hàng</p>
                  <p className="text-sm font-bold text-slate-800">{team.totalCustomers.toLocaleString()}</p>
              </div>
          </div>
          <div className="p-3 flex items-center gap-3">
               <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <Navigation className="w-4 h-4" />
              </div>
              <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Khoảng Cách</p>
                  <p className="text-sm font-bold text-slate-800">{team.estimatedDistanceKm} km</p>
              </div>
          </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto max-h-[250px] p-2 bg-slate-50/50">
          {team.tccs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 py-8">
                  <p className="text-sm">Chưa có trạm nào</p>
              </div>
          ) : (
             <div className="space-y-1">
                 {team.tccs.map((tcc) => (
                     <div key={tcc.MA_TRAM} className="group/item bg-white hover:bg-white border border-slate-100 hover:border-indigo-200 p-3 rounded-lg flex items-start gap-3 transition-all hover:shadow-sm">
                         <MapPin className="w-4 h-4 text-slate-400 group-hover/item:text-[#20398B] mt-0.5 flex-shrink-0 transition-colors" />
                         <div className="flex-1 min-w-0">
                             <div className="flex items-center justify-between mb-0.5">
                                <p className="text-sm font-semibold text-slate-800 truncate">{tcc.MA_TRAM}</p>
                                <span className="text-xs font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded flex-shrink-0">
                                    {tcc.SL_VITRI} KH
                                </span>
                             </div>
                             <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1 truncate">
                                <span>{tcc.LATITUDE?.toFixed(4)}</span>,
                                <span>{tcc.LONGITUDE?.toFixed(4)}</span>
                             </p>
                         </div>
                     </div>
                 ))}
             </div>
          )}
      </div>
    </div>
  );
};
