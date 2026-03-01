// client/services/navigationApi.js

export const GOOGLE_MAPS_API_KEY = "AIzaSyBRgBszbOKxCoTLBRCJ64EGVvi4LdoCLIM";

/**
 * Fetch a route from backend ORS API
 * @param {Object} start {lat,lng}
 * @param {Object} end {lat,lng}
 * @param {boolean} safeMode
 * @returns {Promise<{route: Array}>}
 */
export async function getRoute(start, end, safeMode = true) {
  try {
    const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
    const response = await fetch(`${baseUrl}/api/route`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ start, end, safeMode })
    });

    if (!response.ok) {
      throw new Error(`Error fetching route: ${response.status}`);
    }

    const data = await response.json();
    return data; // { route: [...] }
  } catch (err) {
    console.error("Failed to fetch route:", err);
    return { route: [] };
  }
}

/**
 * Convert typed address to coordinates using Google Geocoding API
 * @param {string} address
 * @returns {Promise<{lat:number,lng:number}|null>}
 */
export async function geocodeDestination(address) {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}`
    );

    const data = await response.json();
    console.log("Geocoding data:", data);
    if (data.status === "OK" && data.results.length > 0) {
      return data.results[0].geometry.location; // { lat, lng }
    }
    return null;
  } catch (err) {
    console.error("Geocoding error:", err);
    return null;
  }
}