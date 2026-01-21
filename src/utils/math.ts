export const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculates the Great Circle distance between two points in km using the Haversine formula.
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

/**
 * Calculates the total distance of a path visiting all points in the order they appear.
 * Note: For a team, "total distance" is usually a Minimum Spanning Tree (MST) or TSP tour estimate.
 * The prompt asks for "Khoảng cách di chuyển giữa các TCC trong cùng nhóm là ngắn nhất"
 * and "Tổng khoảng cách ước tính (đường chim bay)".
 *
 * If the team has N locations, strict specific routing isn't used (Google Maps),
 * but we need a metric.
 *
 * A simple estimation for a set of points is the MST weight.
 * Or if it's a sequence (route), it's the sum of segments.
 *
 * Given the requirement is just grouping and showing "estimated distance",
 * and real routing is forbidden, MST is a good "cloud" distance metric.
 * However, teams usually travel in a sequence.
 *
 * Let's implement a simple greedy TSP (Nearest Neighbor) to estimate the tour length,
 * starting from the first point in the list (or minimizing start).
 * OR, since the output example shows "estimated_distance_km", for just 1 point it's 0.
 * For 2 points, it's the distance between them.
 * For N points, it's implied some path.
 *
 * I will use a simple Nearest Neighbor TSP heuristic to estimate the travel distance for the cluster.
 */
export function estimateTeamTravelDistance(points: { lat: number; lng: number }[]): number {
  if (points.length <= 1) return 0;

  // Clone points to not mutate original
  const unvisited = [...points];
  let current = unvisited.shift()!; // Start with arbitrary first point (or could be "seed")
  let totalDist = 0;

  while (unvisited.length > 0) {
    let nearestIdx = -1;
    let minDist = Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const dist = haversineDistance(current.lat, current.lng, unvisited[i].lat, unvisited[i].lng);
      if (dist < minDist) {
        minDist = dist;
        nearestIdx = i;
      }
    }

    if (nearestIdx !== -1) {
      totalDist += minDist;
      current = unvisited[nearestIdx];
      unvisited.splice(nearestIdx, 1);
    }
  }

  return Number(totalDist.toFixed(2));
}

export function calculateCenter(points: { lat: number; lng: number }[]): { lat: number; lng: number } {
    if (points.length === 0) return { lat: 0, lng: 0 };
    let sumLat = 0;
    let sumLng = 0;
    points.forEach(p => {
        sumLat += p.lat;
        sumLng += p.lng;
    });
    return { lat: sumLat / points.length, lng: sumLng / points.length };
}
