export interface TCC {
  MA_TRAM: string;
  TEN_TRAM?: string;
  LATITUDE: number;
  LONGITUDE: number;
  SL_VITRI: number;
}

export interface Team {
  id: string; // e.g., "team_1"
  name: string;
  tccs: TCC[];
  totalCustomers: number;
  estimatedDistanceKm: number;
  isLocked?: boolean;
}

export interface ProcessingParams {
  numberOfTeams: number;
  tolerancePercent: number; // e.g., 10 for 10%
}
