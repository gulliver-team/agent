export async function mockGeocode(query: string): Promise<{ name: string; location: { lat: number; lng: number }; address: string }> {
  const lower = query.toLowerCase()
  if (lower.includes('javits')) return { name: 'Javits Center', address: '429 11th Ave, New York, NY', location: { lat: 40.757777, lng: -74.00259 } }
  if (lower.includes('times')) return { name: 'Times Square Center', address: 'Times Sq, New York, NY', location: { lat: 40.758, lng: -73.9855 } }
  return { name: query, address: query, location: { lat: 40.7549, lng: -73.984 } }
}

export function haversineDistanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000
  const toRad = (x: number) => (x * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function walkTimeMinutes(meters: number) {
  return Math.round(meters / 80)
}


