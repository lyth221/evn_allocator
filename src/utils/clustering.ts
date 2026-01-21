import type { TCC, Team, ProcessingParams } from '../types';
import { haversineDistance, estimateTeamTravelDistance } from './math';

export function runClustering(allTCCs: TCC[], params: ProcessingParams): Team[] {
  const { numberOfTeams, tolerancePercent } = params;

  if (!allTCCs.length || numberOfTeams <= 0) return [];

  // ===============================
  // GLOBAL PARAMS
  // ===============================
  const totalSL = allTCCs.reduce((s, t) => s + t.SL_VITRI, 0);
  const targetSL = totalSL / numberOfTeams;
  const minSL = targetSL * (1 - tolerancePercent / 100);
  const maxSL = targetSL * (1 + tolerancePercent / 100);

  const getKey = (x: TCC) => String((x as any).MA_TRAM ?? (x as any).id ?? '');

  // ===============================
  // HELPERS
  // ===============================
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

  // "spread" nhẹ hơn pairwise, chạy web tốt hơn nhiều
  const teamSpread = (tccs: TCC[]) => {
    if (tccs.length <= 1) return 0;
    const c = centroid(tccs);
    let s = 0;
    for (const p of tccs) {
      s += haversineDistance(p.LATITUDE, p.LONGITUDE, c.lat, c.lng);
    }
    return s;
  };

  const violation = (sl: number) => {
    if (sl < minSL) return (minSL - sl) / targetSL;
    if (sl > maxSL) return (sl - maxSL) / targetSL;
    return 0;
  };

  // ===============================
  // INIT TEAMS
  // ===============================
  const teams = Array.from({ length: numberOfTeams }, (_, i) => ({
    id: i,
    tccs: [] as TCC[],
    totalSL: 0
  }));

  // ===============================
  // STEP 1: SPACE-AWARE SEED (REAL)
  // - seed1: SL lớn nhất
  // - seed2..K: xa nhất so với các seed đã chọn
  // ===============================
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

  // ===============================
  // STEP 2: GLOBAL GREEDY ASSIGN (FIXED)
  // - Process high SL first (bin-packing style)
  // - If no team can fit without vượt maxSL => defer rồi thử lại vòng sau
  // ===============================
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
        next.push(c); // hoãn lại
        continue;
      }

      teams[bestTeam].tccs.push(c);
      teams[bestTeam].totalSL += c.SL_VITRI;
      placed++;
    }

    if (placed === 0) {
      // không gán được nữa trong biên maxSL => force-place theo penalty nhỏ nhất
      for (const c of next) {
        let bestTeam = 0;
        let bestPenalty = Infinity;

        for (let i = 0; i < teams.length; i++) {
          const t = teams[i];
          const nextSL = t.totalSL + c.SL_VITRI;

          const over = Math.max(0, nextSL - maxSL);
          const under = Math.max(0, minSL - nextSL);
          const rangePenalty = (over + under) * 1e6; // cực lớn để ưu tiên range
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

  // ===============================
  // STEP 3: GLOBAL REBALANCE (HARD RANGE FIRST)
  // - Score có hard penalty nếu vượt/thiếu tolerance => ưu tiên fix range
  // - Sau khi range ok, tiếp tục giảm spread
  // ===============================
  const baselineSpread =
    Math.max(1e-6, teams.reduce((s, t) => s + teamSpread(t.tccs), 0) / Math.max(1, teams.length));

  const teamScore = (tccs: TCC[], total: number) => {
    const v = violation(total);
    const hard = v * 1e6; // nếu vượt/thiếu range -> phạt cực nặng
    const loadPenalty = Math.abs(total - targetSL) / targetSL; // 0..~1
    const distPenalty = teamSpread(tccs) / baselineSpread; // normalize
    // hard dominates, then workload, then distance
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
  const CAND_LIMIT = 20; // giữ browser không lag với 800 TCC

  while (improved && loops++ < MAX_LOOPS) {
    improved = false;

    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        const A = teams[i];
        const B = teams[j];

        const before = teamScore(A.tccs, A.totalSL) + teamScore(B.tccs, B.totalSL);

        const candA = pickCandidates(A.tccs, CAND_LIMIT);
        const candB = pickCandidates(B.tccs, CAND_LIMIT);

        let bestSwap: { a: TCC; b: TCC; newAT: TCC[]; newBT: TCC[]; newASL: number; newBSL: number; after: number } | null = null;

        for (const a of candA) {
          for (const b of candB) {
            const newASL = A.totalSL - a.SL_VITRI + b.SL_VITRI;
            const newBSL = B.totalSL - b.SL_VITRI + a.SL_VITRI;

            const newAT = A.tccs.filter(x => x !== a).concat(b);
            const newBT = B.tccs.filter(x => x !== b).concat(a);

            const after = teamScore(newAT, newASL) + teamScore(newBT, newBSL);

            if (after < before) {
              if (!bestSwap || after < bestSwap.after) {
                bestSwap = { a, b, newAT, newBT, newASL, newBSL, after };
              }
            }
          }
        }

        if (bestSwap) {
          A.tccs = bestSwap.newAT;
          B.tccs = bestSwap.newBT;
          A.totalSL = bestSwap.newASL;
          B.totalSL = bestSwap.newBSL;
          improved = true;
          break;
        }
      }
      if (improved) break;
    }
  }

  // ===============================
  // FINAL FORMAT
  // ===============================
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
