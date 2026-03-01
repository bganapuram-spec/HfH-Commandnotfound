// client/services/navigationApi.js

export const GOOGLE_MAPS_API_KEY = "AIzaSyBRgBszbOKxCoTLBRCJ64EGVvi4LdoCLIM";

/**
 * Fetch a route from backend ORS API
 * @param {Object} start {lat, lng}
 * @param {Object} end {lat, lng}
 * @param {boolean} safeMode
 * @returns {Promise<{route: Array}>}
 */
export async function getRoute(start, end, safeMode = true) {
  try {
    const response = await fetch("http://localhost:8000/api/route", {
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