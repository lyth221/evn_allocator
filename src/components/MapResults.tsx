import React, { useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import mapboxgl from 'mapbox-gl';
import { ArrowRightLeft, ChevronDown, ChevronUp, Lock, Unlock } from 'lucide-react';
import type { TCC, Team } from '../types';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapResultsProps {
  teams: Team[];
  showTeamColor?: boolean;
  onMoveTcc?: (tcc: TCC, fromTeamId: string, toTeamId: string) => void;
  onToggleLock?: (teamId: string) => void;
}

interface TccPopupProps extends MapResultsProps {
  tcc: TCC;
  team: Team;
  color: string;
}

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN?.trim();

const MAP_STYLES = [
  { id: 'navigation-day-v1', name: 'Rõ tuyến đường' },
  { id: 'streets-v12', name: 'Đường phố' },
  { id: 'satellite-streets-v12', name: 'Vệ tinh + đường' },
] as const;

type MapStyleId = typeof MAP_STYLES[number]['id'];

const TEAM_COLORS = [
  '#ef4444', '#3b82f6', '#22c55e', '#f97316', '#a855f7',
  '#06b6d4', '#f59e0b', '#10b981', '#e11d48', '#6366f1',
  '#84cc16', '#ec4899', '#14b8a6', '#f43f5e', '#0ea5e9',
];

const createMarkerElement = (color: string, showBadge: boolean) => {
  const element = document.createElement('div');
  Object.assign(element.style, {
    width: '34px',
    height: '34px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  });

  const image = document.createElement('img');
  image.src = '/tram.svg';
  image.alt = 'Trạm';
  Object.assign(image.style, {
    width: '34px',
    height: '34px',
    objectFit: 'contain',
    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
  });
  element.appendChild(image);

  if (showBadge) {
    const badge = document.createElement('div');
    Object.assign(badge.style, {
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
    });
    element.appendChild(badge);
  }

  return element;
};

const TccPopupContent: React.FC<TccPopupProps> = ({
  tcc,
  team,
  teams,
  color,
  showTeamColor = true,
  onMoveTcc,
  onToggleLock,
}) => (
  <div className="p-1 min-w-[220px] text-slate-700">
    <div className="font-bold text-slate-800 mb-1 flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: color }} />
        <span className={team.isLocked ? 'text-amber-700' : ''}>{team.name}</span>
        {team.isLocked && <Lock className="w-3 h-3 text-amber-500" />}
      </div>
      {onToggleLock && showTeamColor && (
        <button
          onClick={() => onToggleLock(team.id)}
          className={`p-1 rounded hover:bg-slate-100 transition-colors ${team.isLocked ? 'text-amber-600 bg-amber-50' : 'text-slate-400'}`}
          title={team.isLocked ? 'Mở khóa nhóm' : 'Chốt nhóm'}
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
          <span className="font-bold text-right ml-2 text-xs truncate max-w-[130px]" title={tcc.TEN_TRAM}>{tcc.TEN_TRAM}</span>
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
            {teams.filter((targetTeam) => targetTeam.id !== team.id && !targetTeam.isLocked).map((targetTeam) => {
              const targetIndex = teams.findIndex((item) => item.id === targetTeam.id);
              const targetColor = TEAM_COLORS[targetIndex % TEAM_COLORS.length];
              return (
                <button
                  key={targetTeam.id}
                  onClick={() => onMoveTcc(tcc, team.id, targetTeam.id)}
                  className="flex items-center justify-center p-1 rounded border hover:shadow-sm transition-all text-[10px] font-semibold text-slate-600 gap-1 bg-white hover:bg-slate-50"
                  style={{ borderColor: targetColor }}
                  title={`Chuyển sang ${targetTeam.name}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: targetColor }} />
                  {targetTeam.name.replace('Nhóm ', '#')}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  </div>
);

export const MapResults: React.FC<MapResultsProps> = ({
  teams,
  showTeamColor = true,
  onMoveTcc,
  onToggleLock,
}) => {
  const mapContainerRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<mapboxgl.Map | null>(null);
  const [isMapReady, setIsMapReady] = React.useState(false);
  const [isLegendOpen, setIsLegendOpen] = React.useState(true);
  const [hiddenTeamIds, setHiddenTeamIds] = React.useState<Set<string>>(new Set());
  const [mapStyleId, setMapStyleId] = React.useState<MapStyleId>('navigation-day-v1');

  useEffect(() => {
    if (!MAPBOX_TOKEN || !mapContainerRef.current) return;

    const container = mapContainerRef.current;
    mapboxgl.accessToken = MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container,
      style: 'mapbox://styles/mapbox/navigation-day-v1',
      center: [106.6297, 10.8231],
      zoom: 13,
      attributionControl: true,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right');
    const handleLoad = () => {
      map.resize();
      setIsMapReady(true);
    };
    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(container);
    const resizeFrame = window.requestAnimationFrame(() => map.resize());
    map.on('load', handleLoad);
    mapRef.current = map;

    return () => {
      window.cancelAnimationFrame(resizeFrame);
      resizeObserver.disconnect();
      map.off('load', handleLoad);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) return;

    map.resize();
    const markers: mapboxgl.Marker[] = [];
    const popupRoots: Root[] = [];
    const bounds = new mapboxgl.LngLatBounds();

    teams.forEach((team, teamIndex) => {
      if (hiddenTeamIds.has(team.id)) return;
      const color = TEAM_COLORS[teamIndex % TEAM_COLORS.length];

      team.tccs.forEach((tcc) => {
        const popupContainer = document.createElement('div');
        const popupRoot = createRoot(popupContainer);
        popupRoot.render(
          <TccPopupContent
            tcc={tcc}
            team={team}
            teams={teams}
            color={color}
            showTeamColor={showTeamColor}
            onMoveTcc={onMoveTcc}
            onToggleLock={onToggleLock}
          />,
        );

        const popup = new mapboxgl.Popup({ offset: 28, maxWidth: '300px' }).setDOMContent(popupContainer);
        const marker = new mapboxgl.Marker({
          element: createMarkerElement(color, showTeamColor),
          anchor: 'bottom',
        })
          .setLngLat([tcc.LONGITUDE, tcc.LATITUDE])
          .setPopup(popup)
          .addTo(map);

        markers.push(marker);
        popupRoots.push(popupRoot);
        bounds.extend([tcc.LONGITUDE, tcc.LATITUDE]);
      });
    });

    if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 50, maxZoom: 16, duration: 500 });

    return () => {
      markers.forEach((marker) => marker.remove());
      popupRoots.forEach((root) => root.unmount());
    };
  }, [teams, hiddenTeamIds, showTeamColor, onMoveTcc, onToggleLock, isMapReady]);

  const toggleTeamVisibility = (teamId: string) => {
    setHiddenTeamIds((current) => {
      const next = new Set(current);
      if (next.has(teamId)) next.delete(teamId);
      else next.add(teamId);
      return next;
    });
  };

  const changeMapStyle = (styleId: MapStyleId) => {
    if (styleId === mapStyleId) return;
    mapRef.current?.setStyle(`mapbox://styles/mapbox/${styleId}`);
    setMapStyleId(styleId);
  };

  return (
    <div className="h-[80vh] w-full rounded-xl overflow-hidden border border-slate-200 shadow-sm relative z-0 bg-slate-100">
      <div ref={mapContainerRef} className="w-full h-full" />

      {MAPBOX_TOKEN && (
        <div className="absolute top-2 left-2 z-20 w-[160px] overflow-hidden rounded-md border border-slate-200 bg-white/95 shadow-sm backdrop-blur-md">
          <div className="border-b border-slate-100 bg-slate-50/80 px-2.5 py-1.5 text-[11px] font-bold text-slate-700">
            Giao diện bản đồ
          </div>
          <div className="flex flex-col gap-1 p-1.5">
            {MAP_STYLES.map((style) => (
              <button
                key={style.id}
                type="button"
                onClick={() => changeMapStyle(style.id)}
                aria-pressed={mapStyleId === style.id}
                className={`rounded px-2 py-1.5 text-left text-[11px] font-medium transition-colors ${
                  mapStyleId === style.id
                    ? 'bg-[#20398B] text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {style.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {!MAPBOX_TOKEN && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-100 text-center p-6">
          <div>
            <p className="font-bold text-slate-700">Chưa cấu hình Mapbox</p>
            <p className="text-sm text-slate-500 mt-1">Thêm biến môi trường VITE_MAPBOX_TOKEN để hiển thị bản đồ.</p>
          </div>
        </div>
      )}

      {showTeamColor && teams.length > 0 && (
        <div className={`absolute top-2 right-2 z-20 bg-white/95 backdrop-blur-md rounded-md shadow-sm border border-slate-200 transition-all duration-300 overflow-hidden flex flex-col ${isLegendOpen ? 'w-auto min-w-[200px] max-w-[300px] max-h-[calc(100%-1rem)]' : 'w-auto h-auto'}`}>
          <button
            onClick={() => setIsLegendOpen(!isLegendOpen)}
            className={`flex items-center justify-between w-full px-2.5 py-1.5 bg-slate-50/80 hover:bg-slate-100 transition-colors border-b ${isLegendOpen ? 'border-slate-100' : 'border-transparent'}`}
            title={isLegendOpen ? 'Thu gọn' : 'Mở rộng'}
          >
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-700 text-[11px]">Chú thích</span>
              {isLegendOpen && <span className="text-[10px] font-normal text-slate-400">{teams.length} đội</span>}
            </div>
            {isLegendOpen ? <ChevronUp size={12} className="text-slate-400" /> : <ChevronDown size={12} className="text-slate-400" />}
          </button>

          {isLegendOpen && (
            <div className="p-1.5 space-y-0.5 overflow-y-auto custom-scrollbar">
              {teams.map((team, teamIndex) => {
                const color = TEAM_COLORS[teamIndex % TEAM_COLORS.length];
                const isVisible = !hiddenTeamIds.has(team.id);
                const totalCustomers = team.tccs.reduce((sum, tcc) => sum + tcc.SL_VITRI, 0);
                return (
                  <div key={team.id} className={`flex items-center p-1 rounded transition-colors select-none gap-2 group ${team.isLocked ? 'bg-amber-50/50' : 'hover:bg-slate-50'}`}>
                    <input
                      type="checkbox"
                      checked={isVisible}
                      onChange={() => toggleTeamVisibility(team.id)}
                      className="w-3 h-3 rounded border-slate-300 text-[#20398B] focus:ring-0 focus:ring-offset-0 cursor-pointer flex-shrink-0"
                    />
                    <button
                      className={`w-2 h-2 rounded-full shadow-sm ring-1 ring-black/5 flex-shrink-0 transition-opacity ${isVisible ? 'opacity-100' : 'opacity-30'}`}
                      style={{ backgroundColor: color }}
                      onClick={() => toggleTeamVisibility(team.id)}
                      aria-label={`Ẩn hiện ${team.name}`}
                    />
                    <button
                      className={`font-medium text-[11px] whitespace-nowrap transition-colors flex-1 text-left ${isVisible ? (team.isLocked ? 'text-amber-700' : 'text-slate-700') : 'text-slate-400'}`}
                      onClick={() => toggleTeamVisibility(team.id)}
                    >
                      {team.name} <span className="text-slate-300 mx-0.5">|</span> KH: {totalCustomers.toLocaleString()}
                    </button>
                    {onToggleLock && (
                      <button
                        onClick={() => onToggleLock(team.id)}
                        className={`p-1 rounded transition-all ${team.isLocked ? 'text-amber-600 bg-amber-100 hover:bg-amber-200' : 'text-slate-300 hover:text-indigo-600 hover:bg-indigo-50'}`}
                        title={team.isLocked ? 'Mở khóa' : 'Chốt nhóm'}
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
