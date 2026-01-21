import type { TCC, Team, ProcessingParams } from '../types';
import { haversineDistance, estimateTeamTravelDistance, calculateCenter } from './math';

export function runClustering(
  allTCCs: TCC[],
  params: ProcessingParams
): Team[] {
  const { numberOfTeams, tolerancePercent } = params;
  
  // 0. Basic Validation
  if (allTCCs.length === 0) return [];
  if (numberOfTeams <= 0) return [];

  // Deep copy to track unassigned
  let unassigned = [...allTCCs];
  
  // 1. Calculate Targets
  const totalSL = allTCCs.reduce((sum, t) => sum + t.SL_VITRI, 0);
  const targetSL = totalSL / numberOfTeams;
  const maxSL = targetSL * (1 + tolerancePercent / 100);

  // 2. Select Seeds (Farthest Point Initialization / K-Means++)
  // First seed: TCC with max SL? Or just random? 
  // "Xa nhau nhất" implies geometry. Let's pick the one with min Lat/Lng (corner) first to be deterministic, 
  // or the one farthest from the center.
  
  const center = calculateCenter(allTCCs.map(t => ({ lat: t.LATITUDE, lng: t.LONGITUDE })));
  // Find point farthest from center as first seed
  let firstSeedIdx = -1;
  let maxDistCenter = -1;
  
  unassigned.forEach((t, idx) => {
      const d = haversineDistance(t.LATITUDE, t.LONGITUDE, center.lat, center.lng);
      if (d > maxDistCenter) {
          maxDistCenter = d;
          firstSeedIdx = idx;
      }
  });

  const seeds: TCC[] = [];
  if (firstSeedIdx !== -1) {
      seeds.push(unassigned[firstSeedIdx]);
  } else {
      seeds.push(unassigned[0]); // Fallback
  }

  // Pick remaining seeds
  while (seeds.length < numberOfTeams && seeds.length < unassigned.length) {
      let nextSeedIdx = -1;
      let maxDistToSeeds = -1;

      // Find TCC in unassigned (that is NOT already a seed - wait, seeds are just copies, we need to pick from unassigned pool concept)
      // Actually, let's keep seeds separate from unassigned list management for a second.
      // We are just *identifying* seeds indices in the original array or current array.
      
      for (let i = 0; i < unassigned.length; i++) {
            const candidate = unassigned[i];
            if (seeds.includes(candidate)) continue; // Already picked as seed

            // Distance to nearest existing seed
            let minDistToAnySeed = Infinity;
            for (const seed of seeds) {
                const d = haversineDistance(candidate.LATITUDE, candidate.LONGITUDE, seed.LATITUDE, seed.LONGITUDE);
                if (d < minDistToAnySeed) minDistToAnySeed = d;
            }

            if (minDistToAnySeed > maxDistToSeeds) {
                maxDistToSeeds = minDistToAnySeed;
                nextSeedIdx = i;
            }
      }

      if (nextSeedIdx !== -1) {
          seeds.push(unassigned[nextSeedIdx]);
      } else {
          break; // Should not happen unless fewer points than teams
      }
  }

  // Initialize Teams with Seeds
  const teams: Team[] = seeds.map((seed, idx) => ({
      id: `team_${idx + 1}`,
      name: `Nhóm ${idx + 1}`,
      tccs: [seed], // Assign seed immediately
      totalCustomers: seed.SL_VITRI,
      estimatedDistanceKm: 0
  }));

  // Remove seeds from unassigned
  unassigned = unassigned.filter(t => !seeds.includes(t));

  // 3. Assignment Loop
  // "Với mỗi nhóm: Bắt đầu từ seed. Lặp: Tìm TCC chưa gán gần nhóm nhất..."
  
  // The user prompt is slightly ambiguous on "With each group".
  // Interpretation A: Fill Team 1 completely, then Team 2... (Likely causes imbalance/fragmentation for last teams)
  // Interpretation B: Round-robin. (Better for balance)
  // However, "Greedy Capacitated Geographical Clustering" often implies growing clusters.
  // Given "Mỗi nhóm có capacity mềm... Thêm vào... Lặp", it reads like filling one by one.
  // BUT, to handle the "Seed furthest apart" logic correctly, usually you grow them in parallel or using Voronoi-like regions.
  // If I fill Team 1 until full, Team 1 might eat Team 2's neighbors if they are somewhat close.
  // "BẮT BUỘC TUÂN THEO PSEUDO LOGIC":
  // "Với mỗi nhóm (For each team)... Loop... Add".
  // This syntax strongly suggests an outer loop over teams.
  // I will follow STRICTLY: Sequential filling.
  // (Note: This is risky for quality, but safe for compliance. If the user complains, I can explain I followed the pseudo).
  
  // Wait, if I fill Team 1, it might take points that are actually closer to Seed 2. 
  // But strict adherence is requested.
  // Let's verify strict text: "Với mỗi nhóm... Bắt đầu từ seed... Lặp... Tìm gần nhất... Thêm"
  // Yes, sequential.
  
  // Wait, if I do sequential, the "Seeds furthest apart" step loses value if Team 1 expands across the map.
  // Perhaps the inner loop condition "Tìm TCC chưa gán gần nhóm nhất" prevents crossing map?
  // "Gần nhóm nhất" means close to the current cluster members.
  // If seeds are far, Team 1 will grow locally around Seed 1. It shouldn't jump to Seed 2's area unless Seed 2 is close (which it isn't).
  // So Sequential is actually okay-ish if seeds are well-separated.

  for (const team of teams) {
      if (unassigned.length === 0) break;

      let addedSomething = true;
      while (addedSomething && unassigned.length > 0) {
          addedSomething = false;
          
          // Find nearest unassigned TCC to ANY node in the current team (Single Linkage) 
          // OR to the Centroid of the team?
          // "Gần nhóm nhất" usually means min distance to any member or to centroid.
          // Single Linkage (nearest to any member) allows snake-like shapes.
          // Centroid allows compact shapes.
          // Request simple says "Gần nhóm nhất". 
          // Given "Trạm Công Tác", compact shapes (Centroid-ish) are usually better for travel stats.
          // But strict "Starting from seed" usually implies growing from the frontier.
          // I will use Centroid for stability, or Min-Distance-To-Last-Added (Chain).
          // Let's use "Distance to Centroid of Team".
          
          const teamCentroid = calculateCenter(team.tccs.map(t => ({ lat: t.LATITUDE, lng: t.LONGITUDE })));
          
          // Find candidate
          let bestIdx = -1;
          let minDist = Infinity;

          for (let i = 0; i < unassigned.length; i++) {
              const u = unassigned[i];
              const dist = haversineDistance(u.LATITUDE, u.LONGITUDE, teamCentroid.lat, teamCentroid.lng);
              
              if (dist < minDist) {
                  minDist = dist;
                  bestIdx = i;
              }
          }

          if (bestIdx !== -1) {
              const candidate = unassigned[bestIdx];
              // Check Capacity
              if (team.totalCustomers + candidate.SL_VITRI <= maxSL) {
                  // Add
                  team.tccs.push(candidate);
                  team.totalCustomers += candidate.SL_VITRI;
                  // Remove from unassigned
                  unassigned.splice(bestIdx, 1);
                  addedSomething = true;
              } else {
                  // If the *nearest* doesn't fit, do we try the next nearest?
                  // "Thêm vào nhóm nếu...". Pseudo doesn't say "Break". 
                  // It implies just skipping this one.
                  // BUT, if we skip the nearest, we might search the whole list for a tiny one?
                  // Let's standard greedy: if nearest fits, take it. If not, try next nearest.
                  // If we loop through ALL and none fit, then we stop growing this team.
                  
                  // Optimized approach: Sort unassigned by distance, iterate once.
                   // Retrying with correct logic:
                   // We need to actually iterate the sorted neighbors to find one that fits.
                   // Since we need to remove from array, let's just find the best FIT.
                   
                   // Current logic above just took the ABSOLUTE best and checked. If failed, it stopped (addedSomething=false).
                   // I should try to find the "Nearest that FITS".
                   
                   // Let's re-scan unassigned for nearest *fitting* candidate.
                   let bestFitIdx = -1;
                   let minFitDist = Infinity;
                    
                   for (let i = 0; i < unassigned.length; i++) {
                        const u = unassigned[i];
                        if (team.totalCustomers + u.SL_VITRI <= maxSL) {
                            const dist = haversineDistance(u.LATITUDE, u.LONGITUDE, teamCentroid.lat, teamCentroid.lng);
                            if (dist < minFitDist) {
                                minFitDist = dist;
                                bestFitIdx = i;
                            }
                        }
                   }

                   if (bestFitIdx !== -1) {
                       const candidate = unassigned[bestFitIdx];
                       team.tccs.push(candidate);
                       team.totalCustomers += candidate.SL_VITRI;
                       unassigned.splice(bestFitIdx, 1);
                       addedSomething = true;
                   } else {
                       // None fit within limit. Step out of while loop for this team.
                       addedSomething = false;
                   }
              }
          }
      }
  }

  // 4. Handle leftovers (if any)
  // Because capacity is "Soft" (approx TARGET_SL), maybe strictly limiting caused leftovers?
  // "TARGET_SL * (1 + tolerance)". If tolerance is tight, we might have leftovers.
  // Pseudo says: "Mỗi TCC chỉ thuộc 1 nhóm". 
  // It doesn't explicitly say what to do with leftovers after the greedy pass.
  // Usually we force-assign them to the nearest team, ignoring soft capacity, or the team with lowest load.
  // I will assign remaining TCCs to the team with lowest Total Customers effectively balancing up.
  
  if (unassigned.length > 0) {
      unassigned.forEach(u => {
          // Find team with lowest load (or nearest?)
          // Priority: Balance SL first as per "Mục tiêu chính: cân bằng SL_VITRI"
          
          let bestTeam = teams[0];
          let minLoad = Infinity;
          
          teams.forEach(t => {
              if (t.totalCustomers < minLoad) {
                  minLoad = t.totalCustomers;
                  bestTeam = t;
              }
          });
          
          bestTeam.tccs.push(u);
          bestTeam.totalCustomers += u.SL_VITRI;
      });
  }

  // 5. Final Distance Calculation
  teams.forEach(t => {
      // Calculate optimized path distance
      // We map tccs to {lat, lng}
      const points = t.tccs.map(p => ({ lat: p.LATITUDE, lng: p.LONGITUDE }));
      t.estimatedDistanceKm = estimateTeamTravelDistance(points);
  });

  return teams;
}
