import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Team } from '../types';
import { UtilityPole } from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';
import 'leaflet/dist/leaflet.css';

interface MapResultsProps {
  teams: Team[];
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

const createCustomIcon = (color: string) => {
  const iconHtml = renderToStaticMarkup(
    <div style={{
      backgroundColor: color,
      width: '32px',
      height: '32px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '2px solid white',
      boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
      color: 'white'
    }}>
      <UtilityPole size={20} />
    </div>
  );

  return L.divIcon({
    html: iconHtml,
    className: 'custom-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
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

export const MapResults: React.FC<MapResultsProps> = ({ teams }) => {
  // Center default (Vietnam or calc from data)
  const defaultCenter: [number, number] = [10.8231, 106.6297]; // HCM City

  return (
    <div className="h-[600px] w-full rounded-xl overflow-hidden border border-slate-200 shadow-sm relative z-0 bg-slate-100">
       <MapContainer center={defaultCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <FitBounds teams={teams} />
          {teams.map((team, idx) => {
             const color = TEAM_COLORS[idx % TEAM_COLORS.length];
             const icon = createCustomIcon(color);
             
             return team.tccs.map(tcc => (
               <Marker 
                  key={`${team.id}-${tcc.MA_TRAM}`} 
                  position={[tcc.LATITUDE, tcc.LONGITUDE]} 
                  icon={icon}
               >
                 <Popup>
                   <div className="p-1 min-w-[200px]">
                      <h4 className="font-bold text-slate-800 mb-1 flex items-center gap-2 pb-2 border-b border-slate-100">
                         <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: color }}></span>
                         {team.name}
                      </h4>
                      <div className="text-sm text-slate-600 space-y-2 mt-2">
                         <div className="flex items-center justify-between">
                            <span className="text-slate-500 text-xs">Mã Trạm:</span>
                            <span className="font-mono font-bold text-[#20398B]">{tcc.MA_TRAM}</span>
                         </div>
                         <div className="flex items-center justify-between">
                            <span className="text-slate-500 text-xs">Khách hàng:</span>
                            <span className="font-bold">{tcc.SL_VITRI}</span>
                         </div>
                         <div className="pt-2 text-xs text-slate-400 font-mono text-center bg-slate-50 rounded py-1">
                            {tcc.LATITUDE.toFixed(6)}, {tcc.LONGITUDE.toFixed(6)}
                         </div>
                      </div>
                   </div>
                 </Popup>
               </Marker>
             ));
          })}
       </MapContainer>
    </div>
  );
};
