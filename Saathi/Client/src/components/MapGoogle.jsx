import React, { useState, useEffect, useRef } from "react";
import { GoogleMap, useLoadScript, DirectionsRenderer, MarkerF } from "@react-google-maps/api";
import { GOOGLE_MAPS_API_KEY } from "../Services/navigationApi";

const mapContainerStyle = {
  width: "100%",
  height: "450px",
  borderRadius: "12px"
};
const getDistance = (p1, p2) => {
  if (!p1 || !p2) return 0;
  const R = 6371000; // Radius of the Earth in meters
  const dLat = (p2.lat - p1.lat) * Math.PI / 180;
  const dLon = (p2.lng - p1.lng) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};
function MapGoogle({ route, currentLocation }) {
  const [directions, setDirections] = useState(null);
  const [error, setError] = useState(null);
  const mapRef = useRef(null);

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY
  });
  const lastRequestLocation = useRef(null);

  // Auto-pan: keep camera centered on blue dot as you move
  useEffect(() => {
    if (mapRef.current && currentLocation) {
      mapRef.current.panTo(currentLocation);
    }
  }, [currentLocation]);

  useEffect(() => {
    // 1. Basic checks
    if (!isLoaded || !currentLocation || !route || route.length === 0) return;

    // 5-meter filter: don't re-request route on tiny movements (blue dot still moves)
    const distanceMoved = getDistance(currentLocation, lastRequestLocation.current);
    if (lastRequestLocation.current && distanceMoved < 5) {
      return;
    }

    // 3. Update the "last known" location for the next check
    lastRequestLocation.current = currentLocation;

    const directionsService = new window.google.maps.DirectionsService();
    const destination = route[route.length - 1];

    // Both behaviors: use all waypoints when route is short (upstream), else sampled (stashed, Google 25 limit)
    const rawWaypoints = route.slice(1, -1);
    const MAX_POINTS = 22;
    const waypoints =
      rawWaypoints.length <= MAX_POINTS
        ? rawWaypoints.map((p) => ({
            location: new window.google.maps.LatLng(p.lat, p.lng),
            stopover: false
          }))
        : rawWaypoints
            .filter((_, i) => i % Math.max(1, Math.ceil(rawWaypoints.length / MAX_POINTS)) === 0)
            .slice(0, MAX_POINTS)
            .map((point) => ({
              location: new window.google.maps.LatLng(point.lat, point.lng),
              stopover: false
            }));

    directionsService.route(
      {
        origin: currentLocation,
        destination: destination,
        waypoints,
        travelMode: window.google.maps.TravelMode.WALKING,
        optimizeWaypoints: false
      },
      (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK) {
          setDirections(result);
          setError(null);
        } else {
          setError(
            status === window.google.maps.DirectionsStatus.ZERO_RESULTS
              ? "Could not find a walking route to that destination."
              : "Route update failed. GPS might be weak."
          );
          console.error("Directions Request failed:", status);
        }
      }
    );
  }, [isLoaded, currentLocation, route]);
  if (!isLoaded) return <div>Loading Google Maps...</div>;
  return (
    <div className="navigation-section">
      <GoogleMap 
        mapContainerStyle={mapContainerStyle} 
        zoom={18} 
        center={currentLocation}
        onLoad={(map) => (mapRef.current = map)} // Capture map instance here
        options={{
          disableDefaultUI: false,
          zoomControl: true,
        }}
      >
        {/* Draw the line */}
        {directions && (
          <DirectionsRenderer 
            directions={directions} 
            options={{
              suppressMarkers: true, // Hides Google's default A/B pins to avoid clutter
              polylineOptions: { strokeColor: "#1a73e8", strokeWeight: 5 }
            }} 
          />
        )}
        
        {/* Your Live Blue Dot */}
        {currentLocation && (
          <MarkerF 
            position={currentLocation} 
            icon={{
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: "#1a73e8",
              fillOpacity: 1,
              strokeWeight: 2,
              strokeColor: "white",
            }}
          />
        )}
      </GoogleMap>

      {/* --- INSTRUCTIONS PANEL (upstream: Directions + distance; stashed: Live Guidance + distance & time) --- */}
      {directions && (
        <div
          className="instructions-panel"
          style={{
            marginTop: "20px",
            padding: "15px",
            backgroundColor: "#222",
            color: "#fff",
            borderRadius: "8px"
          }}
        >
          <h3 style={{ color: "#1a73e8" }}>Directions</h3>
          <h4 style={{ color: "#4285F4", marginTop: 0, fontWeight: "normal" }}>Live Guidance</h4>
          <div className="steps-list" style={{ maxHeight: "200px", overflowY: "auto", color: "black" }}>
            {directions.routes[0].legs[0].steps.map((step, index) => (
              <div key={index} style={{ marginBottom: "12px", borderBottom: "1px solid #eee", paddingBottom: "8px" }}>
                <p
                  dangerouslySetInnerHTML={{ __html: step.instructions }}
                  style={{ margin: 0, fontSize: "1.1rem" }}
                />
                <small style={{ color: "#666" }}>Distance: {step.distance.text}</small>
                <small style={{ color: "#666", marginLeft: "12px" }}>Time: {step.duration.text}</small>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}

export default MapGoogle;


 