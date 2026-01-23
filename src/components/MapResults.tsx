import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { TCC, Team } from '../types';

import { renderToStaticMarkup } from 'react-dom/server';
import { ChevronDown, ChevronUp, ArrowRightLeft, Lock, Unlock } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

interface MapResultsProps {
  teams: Team[];
  showTeamColor?: boolean;
  onMoveTcc?: (tcc: TCC, fromTeamId: string, toTeamId: string) => void;
  onToggleLock?: (teamId: string) => void;
}

const TEAM_COLORS = [
  '#ef4444', // red-500
  '#3b82f6', // blue-500
  '#22c55e', // green-500
  '#f97316', // orange-500
  '#a855f7', // purple-500
  '#06b6d4', // cyan-500
  '#e11d48', // rose-600
  '#8b5cf6', // violet-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
];

const createCustomIcon = (color: string, showBadge: boolean = true) => {
  const iconHtml = renderToStaticMarkup(
    <div style={{
      width: '34px',
      height: '34px',
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <img 
        src="/tram.svg" 
        alt="tram" 
        style={{ 
          width: '34px', 
          height: '34px', 
          objectFit: 'contain',
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
        }} 
      />
      {showBadge && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '12px',
          height: '12px',
          backgroundColor: color,
          borderRadius: '50%',
          border: '1.5px solid white',
          boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
          zIndex: 10
        }} />
      )}
    </div>
  );

  return L.divIcon({
    html: iconHtml,
    className: 'custom-marker',
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -34]
  });
};

const FitBounds = ({ teams }: { teams: Team[] }) => {
  const map = useMap();
  
  useEffect(() => {
    if (teams.length === 0) return;
    const points: [number, number][] = teams.flatMap(t => t.tccs.map(p => [p.LATITUDE, p.LONGITUDE] as [number, number]));
    if (points.length > 0) {
       const bounds = L.latLngBounds(points);
       map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [teams, map]);

  return null;
}

export const MapResults: React.FC<MapResultsProps> = ({ teams, showTeamColor = true, onMoveTcc, onToggleLock }) => {
  // Center default (Vietnam or calc from data)
  const defaultCenter: [number, number] = [10.8231, 106.6297]; // HCM City
  const [isLegendOpen, setIsLegendOpen] = React.useState(true);
  const [hiddenTeamIds, setHiddenTeamIds] = React.useState<Set<string>>(new Set());

  // Removed useEffect that resets hiddenTeamIds on teams change to preserve user selection
  // especially for locked teams during re-allocation.


  const toggleTeamVisibility = (teamId: string) => {
    const newHidden = new Set(hiddenTeamIds);
    if (newHidden.has(teamId)) {
      newHidden.delete(teamId);
    } else {
      newHidden.add(teamId);
    }
    setHiddenTeamIds(newHidden);
  };

  return (
    <div className="h-[80vh] w-full rounded-xl overflow-hidden border border-slate-200 shadow-sm relative z-0 bg-slate-100">
       <MapContainer center={defaultCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <FitBounds teams={teams} />
          {teams.map((team, idx) => {
             if (hiddenTeamIds.has(team.id)) return null;

             const color = TEAM_COLORS[idx % TEAM_COLORS.length];
             const icon = createCustomIcon(color, showTeamColor);
             
             return team.tccs.map(tcc => (
               <Marker 
                  key={`${team.id}-${tcc.MA_TRAM}`} 
                  position={[tcc.LATITUDE, tcc.LONGITUDE]} 
                  icon={icon}
               >
                 <Popup>
                   <div className="p-1 min-w-[200px]">
                      <div className="font-bold text-slate-800 mb-1 flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                         <div className="flex items-center gap-2">
                             <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: color }}></span>
                             <span className={team.isLocked ? "text-amber-700" : ""}>{team.name}</span>
                             {team.isLocked && <Lock className="w-3 h-3 text-amber-500" />}
                         </div>
                         {onToggleLock && showTeamColor && (
                             <button
                                onClick={() => onToggleLock(team.id)}
                                className={`p-1 rounded hover:bg-slate-100 transition-colors ${team.isLocked ? 'text-amber-600 bg-amber-50' : 'text-slate-400'}`}
                                title={team.isLocked ? "Mở khóa nhóm" : "Chốt nhóm"}
                             >
                                 {team.isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                             </button>
                         )}
                      </div>
                      <div className="text-sm text-slate-600 space-y-2 mt-2">
                         <div className="flex items-center justify-between">
                            <span className="text-slate-500 text-xs">Mã Trạm:</span>
                            <span className="font-mono font-bold text-[#20398B]">{tcc.MA_TRAM}</span>
                         </div>
                         {tcc.TEN_TRAM && (
                           <div className="flex items-center justify-between">
                              <span className="text-slate-500 text-xs">Tên Trạm:</span>
                              <span className="font-bold text-right ml-2 text-xs truncate max-w-[120px]" title={tcc.TEN_TRAM}>{tcc.TEN_TRAM}</span>
                           </div>
                         )}
                         <div className="flex items-center justify-between">
                            <span className="text-slate-500 text-xs">Khách hàng:</span>
                            <span className="font-bold">{tcc.SL_VITRI}</span>
                         </div>
                         <div className="pt-2 text-xs text-slate-400 font-mono text-center bg-slate-50 rounded py-1">
                            {tcc.LATITUDE.toFixed(6)}, {tcc.LONGITUDE.toFixed(6)}
                         </div>

                         {onMoveTcc && showTeamColor && !team.isLocked && (
                           <div className="mt-3 pt-2 border-t border-slate-100">
                             <div className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider flex items-center gap-1">
                               <ArrowRightLeft size={10} /> Chuyển phân công
                             </div>
                             <div className="grid grid-cols-3 gap-1">
                                {teams.filter(t => t.id !== team.id && !t.isLocked).map((targetTeam) => {
                                  // Re-calculate color for target team based on its original index in the full list
                                  // We need the index of targetTeam in the original 'teams' array
                                  const originalIdx = teams.findIndex(t => t.id === targetTeam.id);
                                  const targetColor = TEAM_COLORS[originalIdx % TEAM_COLORS.length];
                                  
                                  return (
                                    <button
                                      key={targetTeam.id}
                                      onClick={() => onMoveTcc(tcc, team.id, targetTeam.id)}
                                      className="flex items-center justify-center p-1 rounded border hover:shadow-sm transition-all text-[10px] font-semibold text-slate-600 gap-1 bg-white hover:bg-slate-50"
                                      style={{ borderColor: targetColor }}
                                      title={`Chuyển sang ${targetTeam.name}`}
                                    >
                                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: targetColor }} />
                                      {targetTeam.name.replace('Nhóm ', '#')}
                                    </button>
                                  );
                                })}
                             </div>
                           </div>
                         )}
                      </div>
                   </div>
                 </Popup>
               </Marker>
             ));
          })}
       </MapContainer>
       
       {showTeamColor && teams.length > 0 && (
          <div className={`absolute top-2 right-2 z-[1000] bg-white/95 backdrop-blur-md rounded-md shadow-sm border border-slate-200 transition-all duration-300 overflow-hidden flex flex-col ${isLegendOpen ? 'w-auto min-w-[200px] max-w-[300px] max-h-[calc(100%-1rem)]' : 'w-auto h-auto'}`}>
              <button 
                onClick={() => setIsLegendOpen(!isLegendOpen)}
                className={`flex items-center justify-between w-full px-2.5 py-1.5 bg-slate-50/80 hover:bg-slate-100 transition-colors border-b ${isLegendOpen ? 'border-slate-100' : 'border-transparent'}`}
                title={isLegendOpen ? "Thu gọn" : "Mở rộng"}
              >
                  <div className="flex items-center gap-1.5">
                     <span className="font-bold text-slate-700 text-[11px]">Chú thích</span>
                     {isLegendOpen && <span className="text-[10px] font-normal text-slate-400">{teams.length} đội</span>}
                  </div>
                  {isLegendOpen ? <ChevronUp size={12} className="text-slate-400" /> : <ChevronDown size={12} className="text-slate-400" />}
              </button>
              
              {isLegendOpen && (
                <div className="p-1.5 space-y-0.5 overflow-y-auto custom-scrollbar">
                    {teams.map((team, idx) => {
                        const color = TEAM_COLORS[idx % TEAM_COLORS.length];
                        const isVisible = !hiddenTeamIds.has(team.id);
                        const totalCustomers = team.tccs.reduce((sum, tcc) => sum + tcc.SL_VITRI, 0);

                        return (
                            <div 
                              key={team.id} 
                              className={`flex items-center p-1 rounded transition-colors select-none gap-2 group ${team.isLocked ? 'bg-amber-50/50' : 'hover:bg-slate-50'}`}
                            >
                                <input 
                                  type="checkbox" 
                                  checked={isVisible} 
                                  onChange={() => toggleTeamVisibility(team.id)} 
                                  className="w-3 h-3 rounded border-slate-300 text-[#20398B] focus:ring-0 focus:ring-offset-0 cursor-pointer flex-shrink-0"
                                />
                                <div 
                                  className={`w-2 h-2 rounded-full shadow-sm ring-1 ring-black/5 flex-shrink-0 transition-opacity cursor-pointer ${isVisible ? 'opacity-100' : 'opacity-30'}`} 
                                  style={{ backgroundColor: color }}
                                  onClick={() => toggleTeamVisibility(team.id)} 
                                ></div>
                                <span 
                                    className={`font-medium text-[11px] whitespace-nowrap transition-colors flex-1 cursor-pointer ${isVisible ? (team.isLocked ? 'text-amber-700' : 'text-slate-700') : 'text-slate-400'}`}
                                    onClick={() => toggleTeamVisibility(team.id)} 
                                >
                                    {team.name} <span className="text-slate-300 mx-0.5">|</span> KH: {totalCustomers.toLocaleString()}
                                </span>
                                
                                {onToggleLock && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onToggleLock(team.id);
                                        }}
                                        className={`p-1 rounded transition-all ${team.isLocked ? 'text-amber-600 bg-amber-100 hover:bg-amber-200' : 'text-slate-300 hover:text-indigo-600 hover:bg-indigo-50'}`}
                                        title={team.isLocked ? "Mở khóa" : "Chốt nhóm"}
                                    >
                                        {team.isLocked ? <Lock size={12} /> : <Unlock size={12} />}
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
              )}
          </div>
       )}
    </div>
  );
};
