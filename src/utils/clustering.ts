import type { TCC, Team, ProcessingParams } from '../types';
import { haversineDistance, estimateTeamTravelDistance } from './math';

function runClusteringMode1(allTCCs: TCC[], params: ProcessingParams): Team[] {
  const { numberOfTeams, tolerancePercent } = params;

  if (!allTCCs.length || numberOfTeams <= 0) return [];

  const totalSL = allTCCs.reduce((s, t) => s + t.SL_VITRI, 0);
  const targetSL = totalSL / numberOfTeams;
  const minSL = targetSL * (1 - tolerancePercent / 100);
  const maxSL = targetSL * (1 + tolerancePercent / 100);

  const getKey = (x: TCC) => String((x as any).MA_TRAM ?? (x as any).id ?? '');

  const sumDistToTeam = (teamTccs: TCC[], c: TCC) => {
    let d = 0;
    for (const m of teamTccs) {
      d += haversineDistance(m.LATITUDE, m.LONGITUDE, c.LATITUDE, c.LONGITUDE);
    }
    return d;
  };

  const centroid = (tccs: TCC[]) => {
    if (!tccs.length) return { lat: 0, lng: 0 };
    let lat = 0, lng = 0;
    for (const p of tccs) { lat += p.LATITUDE; lng += p.LONGITUDE; }
    return { lat: lat / tccs.length, lng: lng / tccs.length };
  };

  const teamSpread = (tccs: TCC[]) => {
    if (tccs.length <= 1) return 0;
    const c = centroid(tccs);
    let s = 0;
    for (const p of tccs) {
      const d = haversineDistance(p.LATITUDE, p.LONGITUDE, c.lat, c.lng);
      // Sử dụng bình phương khoảng cách để tăng cường độ gom cụm (compactness), 
      // phạt nặng các điểm nằm xa trung tâm nhóm
      s += d * d;
    }
    return s;
  };

  const violation = (sl: number) => {
    if (sl < minSL) return (minSL - sl) / targetSL;
    if (sl > maxSL) return (sl - maxSL) / targetSL;
    return 0;
  };

  const teams = Array.from({ length: numberOfTeams }, (_, i) => ({
    id: i,
    tccs: [] as TCC[],
    totalSL: 0
  }));

  const remaining = [...allTCCs];
  remaining.sort((a, b) => (b.SL_VITRI - a.SL_VITRI) || getKey(a).localeCompare(getKey(b)));

  const firstSeed = remaining.shift()!;
  teams[0].tccs.push(firstSeed);
  teams[0].totalSL = firstSeed.SL_VITRI;

  for (let i = 1; i < numberOfTeams && remaining.length; i++) {
    let bestIdx = 0;
    let bestDist = -Infinity;

    for (let j = 0; j < remaining.length; j++) {
      const c = remaining[j];
      let minD = Infinity;

      for (let k = 0; k < i; k++) {
        const s = teams[k].tccs[0];
        const d = haversineDistance(s.LATITUDE, s.LONGITUDE, c.LATITUDE, c.LONGITUDE);
        if (d < minD) minD = d;
      }

      if (minD > bestDist) {
        bestDist = minD;
        bestIdx = j;
      }
    }

    const seed = remaining.splice(bestIdx, 1)[0];
    teams[i].tccs.push(seed);
    teams[i].totalSL = seed.SL_VITRI;
  }

  remaining.sort((a, b) => (b.SL_VITRI - a.SL_VITRI) || getKey(a).localeCompare(getKey(b)));

  let pool = remaining;
  while (pool.length) {
    let placed = 0;
    const next: TCC[] = [];

    for (const c of pool) {
      let bestTeam = -1;
      let bestScore = Infinity;

      for (let i = 0; i < teams.length; i++) {
        const t = teams[i];
        const nextSL = t.totalSL + c.SL_VITRI;
        if (nextSL > maxSL) continue;

        const distSum = sumDistToTeam(t.tccs, c);
        const loadRatio = t.totalSL / targetSL;
        const fairness = Math.max(0.3, 1 - loadRatio);
        const score = distSum / fairness;

        if (score < bestScore) {
          bestScore = score;
          bestTeam = i;
        }
      }

      if (bestTeam === -1) {
        next.push(c);
        continue;
      }

      teams[bestTeam].tccs.push(c);
      teams[bestTeam].totalSL += c.SL_VITRI;
      placed++;
    }

    if (placed === 0) {
      for (const c of next) {
        let bestTeam = 0;
        let bestPenalty = Infinity;

        for (let i = 0; i < teams.length; i++) {
          const t = teams[i];
          const nextSL = t.totalSL + c.SL_VITRI;

          const over = Math.max(0, nextSL - maxSL);
          const under = Math.max(0, minSL - nextSL);
          const rangePenalty = (over + under) * 1e6;
          const distPenalty = sumDistToTeam(t.tccs, c);

          const penalty = rangePenalty + distPenalty;

          if (penalty < bestPenalty) {
            bestPenalty = penalty;
            bestTeam = i;
          }
        }

        teams[bestTeam].tccs.push(c);
        teams[bestTeam].totalSL += c.SL_VITRI;
      }
      break;
    }

    pool = next.sort((a, b) => (b.SL_VITRI - a.SL_VITRI) || getKey(a).localeCompare(getKey(b)));
  }

  const baselineSpread =
    Math.max(1e-6, teams.reduce((s, t) => s + teamSpread(t.tccs), 0) / Math.max(1, teams.length));

  const teamScore = (tccs: TCC[], total: number) => {
    const v = violation(total);
    const hard = v * 1e6;
    const loadPenalty = Math.abs(total - targetSL) / targetSL;
    const distPenalty = teamSpread(tccs) / baselineSpread;
    return hard + loadPenalty * 0.6 + distPenalty * 0.4;
  };

  const pickCandidates = (tccs: TCC[], limit: number) => {
    if (tccs.length <= limit) return tccs;
    const c = centroid(tccs);
    const scored = tccs
      .map(p => ({
        p,
        d: haversineDistance(p.LATITUDE, p.LONGITUDE, c.lat, c.lng)
      }))
      .sort((a, b) => b.d - a.d);
    const half = Math.floor(limit / 2);
    const outliers = scored.slice(0, half).map(x => x.p);
    const inliers = scored.slice(-half).map(x => x.p);
    const set = new Map<string, TCC>();
    for (const p of [...outliers, ...inliers]) set.set(getKey(p), p);
    return Array.from(set.values());
  };

  let improved = true;
  let loops = 0;
  const MAX_LOOPS = 60;
  const CAND_LIMIT = 20;

  while (improved && loops++ < MAX_LOOPS) {
    improved = false;

    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        const A = teams[i];
        const B = teams[j];

        const before = teamScore(A.tccs, A.totalSL) + teamScore(B.tccs, B.totalSL);

        const candA = pickCandidates(A.tccs, CAND_LIMIT);
        const candB = pickCandidates(B.tccs, CAND_LIMIT);

        let bestOp: { 
           newATccs: TCC[], newBTccs: TCC[], 
           newASL: number, newBSL: number, 
           after: number 
        } | null = null;

        // 1. Dò Swap (Tráo đổi 1-1)
        for (const a of candA) {
          for (const b of candB) {
            const newASL = A.totalSL - a.SL_VITRI + b.SL_VITRI;
            const newBSL = B.totalSL - b.SL_VITRI + a.SL_VITRI;

            const newATccs = A.tccs.filter(x => x !== a).concat(b);
            const newBTccs = B.tccs.filter(x => x !== b).concat(a);

            const after = teamScore(newATccs, newASL) + teamScore(newBTccs, newBSL);

            if (after < before) {
              if (!bestOp || after < bestOp.after) {
                bestOp = { newATccs, newBTccs, newASL, newBSL, after };
              }
            }
          }
        }

        // 2. Dò Move A -> B
        for (const a of candA) {
            const newASL = A.totalSL - a.SL_VITRI;
            const newBSL = B.totalSL + a.SL_VITRI;
            
            const newATccs = A.tccs.filter(x => x !== a);
            const newBTccs = [...B.tccs, a];

            const after = teamScore(newATccs, newASL) + teamScore(newBTccs, newBSL);

            if (after < before) {
              if (!bestOp || after < bestOp.after) {
                bestOp = { newATccs, newBTccs, newASL, newBSL, after };
              }
            }
        }

        // 3. Dò Move B -> A
        for (const b of candB) {
            const newASL = A.totalSL + b.SL_VITRI;
            const newBSL = B.totalSL - b.SL_VITRI;
            
            const newATccs = [...A.tccs, b];
            const newBTccs = B.tccs.filter(x => x !== b);

            const after = teamScore(newATccs, newASL) + teamScore(newBTccs, newBSL);

            if (after < before) {
              if (!bestOp || after < bestOp.after) {
                bestOp = { newATccs, newBTccs, newASL, newBSL, after };
              }
            }
        }

        if (bestOp) {
          A.tccs = bestOp.newATccs;
          B.tccs = bestOp.newBTccs;
          A.totalSL = bestOp.newASL;
          B.totalSL = bestOp.newBSL;
          improved = true;
          break;
        }
      }
      if (improved) break;
    }
  }

  const result: Team[] = teams.map((t, i) => ({
    id: `team_${i + 1}`,
    name: `Nhóm ${i + 1}`,
    tccs: t.tccs,
    totalCustomers: t.totalSL,
    estimatedDistanceKm: 0
  }));

  result.forEach(team => {
    const pts = team.tccs.map(p => ({ lat: p.LATITUDE, lng: p.LONGITUDE }));
    team.estimatedDistanceKm = estimateTeamTravelDistance(pts);
  });

  return result;
}

function runClusteringMode2(allTCCs: TCC[], params: ProcessingParams): Team[] {
  const tolerancePercent = params.tolerancePercent ?? 15;
  const { numberOfTeams } = params;

  if (!allTCCs.length || numberOfTeams <= 0) return [];

  const totalSL = allTCCs.reduce((s, t) => s + t.SL_VITRI, 0);
  const targetSL = totalSL / numberOfTeams;
  const minSL = targetSL * (1 - tolerancePercent / 100);
  const maxSL = targetSL * (1 + tolerancePercent / 100);

  const getKey = (x: TCC) => String((x as any).MA_TRAM ?? (x as any).id ?? '');

  const sumDistToTeam = (teamTccs: TCC[], c: TCC) => {
    let d = 0;
    for (const m of teamTccs) {
      d += haversineDistance(m.LATITUDE, m.LONGITUDE, c.LATITUDE, c.LONGITUDE);
    }
    return d;
  };

  const centroid = (tccs: TCC[]) => {
    if (!tccs.length) return { lat: 0, lng: 0 };
    let lat = 0, lng = 0;
    for (const p of tccs) { lat += p.LATITUDE; lng += p.LONGITUDE; }
    return { lat: lat / tccs.length, lng: lng / tccs.length };
  };

  const teamSpread = (tccs: TCC[]) => {
    if (tccs.length <= 1) return 0;
    const c = centroid(tccs);
    let s = 0;
    for (const p of tccs) {
      const d = haversineDistance(p.LATITUDE, p.LONGITUDE, c.lat, c.lng);
      // Sử dụng bình phương khoảng cách để phạt cực nặng các điểm nằm xa trung tâm (tạo ranh giới nhóm rõ nét)
      s += d * d; 
    }
    return s;
  };

  const violation = (sl: number) => {
    if (sl < minSL) return (minSL - sl) / targetSL;
    if (sl > maxSL) return (sl - maxSL) / targetSL;
    return 0;
  };

  const getTeamScore = (total: number, spr: number, avgSpr: number) => {
    const v = violation(total);
    const hardPenalty = v * 1000000;

    const loadDev = Math.abs(total - targetSL) / targetSL; 
    
    // Tối giản tối đa bán kính/độ rộng của riêng từng nhóm
    // Điều này tương đương với giải thuật K-Means, tạo ra các ranh giới Voronoi
    // Đảm bảo tuyệt đối không có sự chồng lấn (overlap) giữa các nhóm
    const spreadEfficiency = spr / (avgSpr || 1); 

    // Ưu tiên cao nhất là tạo cụm (Efficiency: 0.8) để các trạm tạo thành 1 vùng độc lập hoàn toàn
    // Càng nhỏ gọn càng tốt, không còn cố gắng "kéo dài đều nhau" nữa
    return hardPenalty + (spreadEfficiency * 0.8) + (loadDev * 0.2);
  };

  const teams = Array.from({ length: numberOfTeams }, (_, i) => ({
    id: i,
    tccs: [] as TCC[],
    totalSL: 0
  }));

  const remaining = [...allTCCs];
  remaining.sort((a, b) => (b.SL_VITRI - a.SL_VITRI) || getKey(a).localeCompare(getKey(b)));

  const firstSeed = remaining.shift()!;
  teams[0].tccs.push(firstSeed);
  teams[0].totalSL = firstSeed.SL_VITRI;

  for (let i = 1; i < numberOfTeams && remaining.length; i++) {
    let bestIdx = 0;
    let bestDist = -Infinity;

    for (let j = 0; j < remaining.length; j++) {
      const c = remaining[j];
      let minD = Infinity;
      for (let k = 0; k < i; k++) {
        const s = teams[k].tccs[0];
        const d = haversineDistance(s.LATITUDE, s.LONGITUDE, c.LATITUDE, c.LONGITUDE);
        if (d < minD) minD = d;
      }
      if (minD > bestDist) {
        bestDist = minD;
        bestIdx = j;
      }
    }
    const seed = remaining.splice(bestIdx, 1)[0];
    teams[i].tccs.push(seed);
    teams[i].totalSL = seed.SL_VITRI;
  }

  remaining.sort((a, b) => (b.SL_VITRI - a.SL_VITRI) || getKey(a).localeCompare(getKey(b)));
  let pool = remaining;
  while (pool.length) {
    let placed = 0;
    const next: TCC[] = [];

    for (const c of pool) {
      let bestTeam = -1;
      let bestScore = Infinity;

      for (let i = 0; i < teams.length; i++) {
        const t = teams[i];
        const nextSL = t.totalSL + c.SL_VITRI;
        if (nextSL > maxSL) continue;

        const distSum = sumDistToTeam(t.tccs, c);
        const loadRatio = t.totalSL / targetSL;
        const fairness = Math.max(0.3, 1 - loadRatio);
        const score = distSum / fairness;

        if (score < bestScore) {
          bestScore = score;
          bestTeam = i;
        }
      }

      if (bestTeam === -1) {
        next.push(c);
        continue;
      }

      teams[bestTeam].tccs.push(c);
      teams[bestTeam].totalSL += c.SL_VITRI;
      placed++;
    }

    if (placed === 0) {
      for (const c of next) {
        let bestTeam = 0;
        let bestPenalty = Infinity;
        for (let i = 0; i < teams.length; i++) {
          const t = teams[i];
          const penalty = (Math.max(0, t.totalSL + c.SL_VITRI - maxSL)) * 1000 + sumDistToTeam(t.tccs, c);
          if (penalty < bestPenalty) {
            bestPenalty = penalty;
            bestTeam = i;
          }
        }
        teams[bestTeam].tccs.push(c);
        teams[bestTeam].totalSL += c.SL_VITRI;
      }
      break;
    }
    pool = next.sort((a, b) => (b.SL_VITRI - a.SL_VITRI) || getKey(a).localeCompare(getKey(b)));
  }

  const pickCandidates = (tccs: TCC[]) => {
    if (tccs.length <= 20) return tccs;
    const c = centroid(tccs);
    const scored = tccs.map(p => ({
      p,
      d: haversineDistance(p.LATITUDE, p.LONGITUDE, c.lat, c.lng)
    })).sort((a, b) => b.d - a.d);
    return [...scored.slice(0, 10).map(x => x.p), ...scored.slice(-10).map(x => x.p)];
  };

  let improved = true;
  let loops = 0;
  const MAX_LOOPS = 80;

  while (improved && loops++ < MAX_LOOPS) {
    improved = false;
    
    const totalSpread = teams.reduce((s, t) => s + teamSpread(t.tccs), 0);
    const avgSpr = totalSpread / teams.length;

    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        const A = teams[i];
        const B = teams[j];

        const before = getTeamScore(A.totalSL, teamSpread(A.tccs), avgSpr) + 
                       getTeamScore(B.totalSL, teamSpread(B.tccs), avgSpr);

        const candA = pickCandidates(A.tccs);
        const candB = pickCandidates(B.tccs);

        let bestOp: { 
           newATccs: TCC[], newBTccs: TCC[], 
           newASL: number, newBSL: number, 
           after: number 
        } | null = null;

        // 1. Dò Swap (Tráo đổi 1-1)
        for (const a of candA) {
          for (const b of candB) {
            const newASL = A.totalSL - a.SL_VITRI + b.SL_VITRI;
            const newBSL = B.totalSL - b.SL_VITRI + a.SL_VITRI;
            
            const newATccs = A.tccs.map(x => (x === a ? b : x));
            const newBTccs = B.tccs.map(x => (x === b ? a : x));

            const after = getTeamScore(newASL, teamSpread(newATccs), avgSpr) + 
                          getTeamScore(newBSL, teamSpread(newBTccs), avgSpr);

            if (after < before) {
              if (!bestOp || after < bestOp.after) {
                bestOp = { newATccs, newBTccs, newASL, newBSL, after };
              }
            }
          }
        }

        // 2. Dò Move A -> B (Chuyển hẳn 1 điểm, không cần đổi lại)
        for (const a of candA) {
            const newASL = A.totalSL - a.SL_VITRI;
            const newBSL = B.totalSL + a.SL_VITRI;
            
            const newATccs = A.tccs.filter(x => x !== a);
            const newBTccs = [...B.tccs, a];

            const after = getTeamScore(newASL, teamSpread(newATccs), avgSpr) + 
                          getTeamScore(newBSL, teamSpread(newBTccs), avgSpr);

            if (after < before) {
              if (!bestOp || after < bestOp.after) {
                bestOp = { newATccs, newBTccs, newASL, newBSL, after };
              }
            }
        }

        // 3. Dò Move B -> A (Chuyển hẳn 1 điểm, không cần đổi lại)
        for (const b of candB) {
            const newASL = A.totalSL + b.SL_VITRI;
            const newBSL = B.totalSL - b.SL_VITRI;
            
            const newATccs = [...A.tccs, b];
            const newBTccs = B.tccs.filter(x => x !== b);

            const after = getTeamScore(newASL, teamSpread(newATccs), avgSpr) + 
                          getTeamScore(newBSL, teamSpread(newBTccs), avgSpr);

            if (after < before) {
              if (!bestOp || after < bestOp.after) {
                bestOp = { newATccs, newBTccs, newASL, newBSL, after };
              }
            }
        }

        if (bestOp) {
          A.tccs = bestOp.newATccs;
          B.tccs = bestOp.newBTccs;
          A.totalSL = bestOp.newASL;
          B.totalSL = bestOp.newBSL;
          improved = true;
          break;
        }
      }
      if (improved) break;
    }
  }

  return teams.map((t, i) => {
    const pts = t.tccs.map(p => ({ lat: p.LATITUDE, lng: p.LONGITUDE }));
    return {
      id: `team_${i + 1}`,
      name: `Nhóm ${i + 1}`,
      tccs: t.tccs,
      totalCustomers: t.totalSL,
      estimatedDistanceKm: estimateTeamTravelDistance(pts)
    };
  });
}

export function runClustering(allTCCs: TCC[], params: ProcessingParams): Team[] {
  if (params.algorithmMode === 'mode2') {
    return runClusteringMode2(allTCCs, params);
  }
  return runClusteringMode1(allTCCs, params);
}
