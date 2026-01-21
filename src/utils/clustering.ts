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


  // 2. Algorithm: Greedy Seed-Based with Sum-Distance Minimization (User Provided Logic)
  
  const totalSL = allTCCs.reduce((sum, t) => sum + t.SL_VITRI, 0);
  const target = totalSL / numberOfTeams;
  const minSL = target * (1 - tolerancePercent / 100);
  const maxSL = target * (1 + tolerancePercent / 100);

  let unassigned = [...allTCCs];
  const resultTeams: Team[] = [];

  // Helper to calculate sum of distances from a candidate to all members of a group
  const calcDistSum = (candidate: TCC, groupMembers: TCC[]) => {
      let sum = 0;
      for(const m of groupMembers) {
          sum += haversineDistance(candidate.LATITUDE, candidate.LONGITUDE, m.LATITUDE, m.LONGITUDE);
      }
      return sum;
  };

  for (let i = 0; i < numberOfTeams; i++) {
      if (unassigned.length === 0) break;

      // Seed: TCC with largest SL
      unassigned.sort((a, b) => b.SL_VITRI - a.SL_VITRI);
      const seed = unassigned.shift();
      
      if (!seed) break;

      const currentTeam: Team = {
          id: `team_${i + 1}`,
          name: `Nhóm ${i + 1}`,
          tccs: [seed],
          totalCustomers: seed.SL_VITRI,
          estimatedDistanceKm: 0
      };

      // Grow phase 1: Reach minSL
      while (currentTeam.totalCustomers < minSL && unassigned.length > 0) {
          let bestIdx = -1;
          let bestScore = Infinity;

          for (let j = 0; j < unassigned.length; j++) {
               const candidate = unassigned[j];
               
               // Check Max Constraint
               if (currentTeam.totalCustomers + candidate.SL_VITRI > maxSL) continue;

               // Metric: Sum of distances to all existing members
               const score = calcDistSum(candidate, currentTeam.tccs);
               
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
              break; // Cannot add more without violating maxSL
          }
      }
      
      resultTeams.push(currentTeam);
  }

  // 3. Handle Leftovers (Assign to best fitting group based on same metric)
  // The user's snippet stops at minSL. We must assign the rest.
  while (unassigned.length > 0) {
      // For each remaining item, find the group where adding it adds the LEAST total distance
      // AND fits maxSL (if possible).
      
      // Optimization: Pick the largest unassigned item first? 
      // Or just iterate. Let's pick largest to clear big rocks first.
      unassigned.sort((a, b) => b.SL_VITRI - a.SL_VITRI);
      const candidate = unassigned.shift();
      if (!candidate) break;

      let bestTeamIdx = -1;
      let minAddedDist = Infinity;

      for(let i=0; i < resultTeams.length; i++) {
          const team = resultTeams[i];
          // Try to respect maxSL first
          // If we want strict balance, skipping maxSL is bad.
          // But valid assignment is mandatory.
          // Let's assume soft constraint: prefer fitting maxSL, if none fit, pick "emptiest" or force best fit.
          // Re-reading user requirement: "cho phép sai số theo % cấu hình". Implies strictness.
          
          if (team.totalCustomers + candidate.SL_VITRI <= maxSL) {
               const distIncrease = calcDistSum(candidate, team.tccs);
               // Normalize by team size? No, user snippet uses absolute sum.
               // Absolute sum favors smaller teams naturally (fewer points to measure dist to).
               // Wait! Sum of distances to 5 points < Sum of distances to 50 points.
               // This metric naturally directs points to SMALLER teams or VERY compact teams.
               // This is good for balance.
               
               if (distIncrease < minAddedDist) {
                   minAddedDist = distIncrease;
                   bestTeamIdx = i;
               }
          }
      }

      // If found a fit within MaxSL
      if (bestTeamIdx !== -1) {
           resultTeams[bestTeamIdx].tccs.push(candidate);
           resultTeams[bestTeamIdx].totalCustomers += candidate.SL_VITRI;
      } else {
           // Fallback: If NO team fits into MaxSL (e.g. all are full or item is huge),
           // Assign to the team with lowest current Load to minimize imbalance.
           let minLoadTeamIdx = 0;
           let minLoad = Infinity;
           
           for(let i=0; i<resultTeams.length; i++) {
               if (resultTeams[i].totalCustomers < minLoad) {
                   minLoad = resultTeams[i].totalCustomers;
                   minLoadTeamIdx = i;
               }
           }
           resultTeams[minLoadTeamIdx].tccs.push(candidate);
           resultTeams[minLoadTeamIdx].totalCustomers += candidate.SL_VITRI;
      }
  }

  // 4. Calculate Final Metrics
  resultTeams.forEach(t => {
      const points = t.tccs.map(p => ({ lat: p.LATITUDE, lng: p.LONGITUDE }));
      t.estimatedDistanceKm = estimateTeamTravelDistance(points);
  });

  return resultTeams;
}
