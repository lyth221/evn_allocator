import * as XLSX from 'xlsx';
import type { TCC } from '../types';

export const parseExcel = (file: File): Promise<TCC[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0]; // Assume first sheet
        const sheet = workbook.Sheets[sheetName];
        
        // Use sheet_to_json to get array of objects
        // We'll trust the header row is row 1
        const jsonData = XLSX.utils.sheet_to_json(sheet);

        // Map and validate
        // Handles common variations in column names just in case, but strict to REQUIREMENTS
        const tccs: TCC[] = jsonData.map((row: any) => {
          // Normalize keys if needed or just straight access
          // Requirement says: MA_TRAM, LATITUDE, LONGITUDE, SL_VITRI
          return {
            MA_TRAM: String(row['MA_TRAM'] || ''),
            LATITUDE: Number(row['LATITUDE'] || 0),
            LONGITUDE: Number(row['LONGITUDE'] || 0),
            SL_VITRI: Number(row['SL_VITRI'] || 0),
          };
        }).filter(t => 
            t.MA_TRAM && 
            !isNaN(t.LATITUDE) && t.LATITUDE !== 0 && 
            !isNaN(t.LONGITUDE) && t.LONGITUDE !== 0
            // We keep SL_VITRI even if 0, though unlikely useful
        );

        if (tccs.length === 0) {
            reject(new Error("No valid data found in Excel. Check column headers: MA_TRAM, LATITUDE, LONGITUDE, SL_VITRI"));
        } else {
            resolve(tccs);
        }
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsBinaryString(file);
  });
};
