import type { TCC, Team, ProcessingParams } from '../types';
import { haversineDistance, estimateTeamTravelDistance } from './math';

export function runClustering(
  allTCCs: TCC[],
  params: ProcessingParams
): Team[] {
  const { numberOfTeams, tolerancePercent } = params;
  
  // 0. Basic Validation
  if (allTCCs.length === 0) return [];
  if (numberOfTeams <= 0) return [];


  // 2. Algorithm: Greedy Seed-Based with Fairness Factor (User Provided Logic)
  
  const totalSL = allTCCs.reduce((sum, t) => sum + t.SL_VITRI, 0);
  const target = totalSL / numberOfTeams;
  const minSL = target * (1 - tolerancePercent / 100);
  const maxSL = target * (1 + tolerancePercent / 100);

  let unassigned = [...allTCCs];
  const resultTeams: Team[] = [];

  for (let i = 0; i < numberOfTeams; i++) {
      if (unassigned.length === 0) break;

      // Seed: TCC with largest SL remaining
      unassigned.sort((a, b) => b.SL_VITRI - a.SL_VITRI);
      const seed = unassigned.shift();
      
      if (!seed) break;

      const currentTeam: Team = {
          id: `team_${i + 1}`,
          name: `Nhóm ${i + 1}`,
          tccs: [seed], // Assign seed
          totalCustomers: seed.SL_VITRI,
          estimatedDistanceKm: 0
      };

      // Grow group until minSL
      while (currentTeam.totalCustomers < minSL && unassigned.length > 0) {
          let bestIdx = -1;
          let bestScore = Infinity; // Minimize score

          for (let j = 0; j < unassigned.length; j++) {
               const c = unassigned[j];
               
               if (currentTeam.totalCustomers + c.SL_VITRI > maxSL) continue;

               let distSum = 0;
               for (const t of currentTeam.tccs) {
                    distSum += haversineDistance(t.LATITUDE, t.LONGITUDE, c.LATITUDE, c.LONGITUDE);
               }

               // ===== RULE CÔNG BẰNG (Fairness Rule) =====
               // The less SL a group has, the more it tolerates distance.
               const loadRatio = currentTeam.totalCustomers / target; 
               const fairnessFactor = Math.max(0.3, 1 - loadRatio);
               const score = distSum / fairnessFactor;
               // ==========================================
               
               if (score < bestScore) {
                   bestScore = score;
                   bestIdx = j;
               }
          }

          if (bestIdx !== -1) {
              const picked = unassigned.splice(bestIdx, 1)[0];
              currentTeam.tccs.push(picked);
              currentTeam.totalCustomers += picked.SL_VITRI;
          } else {
              break; 
          }
      }
      
      resultTeams.push(currentTeam);
  }

  // 3. Handle Leftovers (Assign to best fitting group)
  while (unassigned.length > 0) {
      unassigned.sort((a, b) => b.SL_VITRI - a.SL_VITRI);
      const c = unassigned.shift();
      if (!c) break;

      let bestTeamIdx = -1;
      let minAddedDist = Infinity;

      for(let i = 0; i < resultTeams.length; i++) {
          const t = resultTeams[i];
          if (t.totalCustomers + c.SL_VITRI <= maxSL) {
              let d = 0;
              for(const m of t.tccs) d += haversineDistance(m.LATITUDE, m.LONGITUDE, c.LATITUDE, c.LONGITUDE);
              if (d < minAddedDist) {
                  minAddedDist = d;
                  bestTeamIdx = i;
              }
          }
      }
      
      if (bestTeamIdx !== -1) {
          resultTeams[bestTeamIdx].tccs.push(c);
          resultTeams[bestTeamIdx].totalCustomers += c.SL_VITRI;
      } else {
          // Fallback to min load team if none fit maxSL
          let minLoadIdx = 0; 
          let minLoad = Infinity;
          for(let i=0; i<resultTeams.length; i++) {
              if(resultTeams[i].totalCustomers < minLoad) {
                  minLoad = resultTeams[i].totalCustomers;
                  minLoadIdx = i;
              }
          }
          resultTeams[minLoadIdx].tccs.push(c);
          resultTeams[minLoadIdx].totalCustomers += c.SL_VITRI;
      }
  }

  // 4. Calculate Final Metrics
  resultTeams.forEach(t => {
      const points = t.tccs.map(p => ({ lat: p.LATITUDE, lng: p.LONGITUDE }));
      t.estimatedDistanceKm = estimateTeamTravelDistance(points);
  });

  return resultTeams;
}
