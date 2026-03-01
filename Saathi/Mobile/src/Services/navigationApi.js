import { API_BASE_URL, GOOGLE_MAPS_API_KEY } from '../config';

export { GOOGLE_MAPS_API_KEY };

export async function getRoute(start, end, safeMode = true) {
  const url = `${API_BASE_URL}/api/route`;
  console.log('getRoute', start, end, safeMode, '→', url);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ start, end, safeMode }),
    });
    console.log('response', response.status, response.ok);
    if (!response.ok) throw new Error(`Error fetching route: ${response.status}`);
    const data = await response.json();
    return data;
  } catch (err) {
    // Not CORS — React Native doesn't use browser CORS. This is a connection error.
    console.error('Failed to fetch route:', err.message || err, 'url:', url, 'cause:', err.cause || '');
    return { route: [] };
  }
}

/**
 * Geocode an address/place name to { lat, lng } using Google Geocoding API.
 * @param address - Destination string (from user input or LLM extract).
 * @param biasNear - Optional { lat, lng } to bias results near user (helps "coffee shop", "library").
 */
export async function geocodeDestination(address, biasNear = null) {
  if (!address?.trim()) return null;
  try {
    let url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}`;
    if (biasNear?.lat != null && biasNear?.lng != null) {
      url += `&location=${biasNear.lat},${biasNear.lng}`;
    }
    const response = await fetch(url);
    const data = await response.json();
    if (data.status === 'OK' && data.results?.length > 0) {
      return data.results[0].geometry.location;
    }
    return null;
  } catch (err) {
    console.error('Geocoding error:', err);
    return null;
  }
}
