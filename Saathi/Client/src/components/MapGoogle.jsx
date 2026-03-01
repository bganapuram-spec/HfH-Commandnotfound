// client/components/MapGoogle.jsx
import React, { useState, useEffect } from "react";
import { GoogleMap, useLoadScript, DirectionsRenderer, MarkerF } from "@react-google-maps/api";
import { GOOGLE_MAPS_API_KEY } from "../Services/navigationApi";

const mapContainerStyle = {
  width: "100%",
  height: "450px",
  borderRadius: "12px"
};

function MapGoogle({ route, currentLocation }) {
  const [directions, setDirections] = useState(null);
  const [error, setError] = useState(null);

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY
  });

  useEffect(() => {
    if (isLoaded && currentLocation && route && route.length > 0) {
      const directionsService = new window.google.maps.DirectionsService();
      const destination = route[route.length - 1];

      directionsService.route(
        {
          origin: currentLocation,
          destination: destination,
          waypoints: route.map(point => ({
            location: new window.google.maps.LatLng(point.lat, point.lng),
            stopover: false
          })),
          travelMode: window.google.maps.TravelMode.WALKING
        },
        (result, status) => {
          if (status === window.google.maps.DirectionsStatus.OK) {
            setDirections(result);
            setError(null);
          } else {
            setError("Could not find a walking route to that destination.");
            console.error("Directions Request failed:", status);
          }
        }
      );
    }
  }, [isLoaded, currentLocation, route]);

  if (!isLoaded) return <div>Loading Google Maps...</div>;

  return (
    <div className="navigation-section">
      <GoogleMap mapContainerStyle={mapContainerStyle} zoom={17} center={currentLocation}>
        {directions && <DirectionsRenderer directions={directions} />}
        {currentLocation && <MarkerF position={currentLocation} />}
      </GoogleMap>

      {directions && (
        <div
          className="instructions-panel"
          style={{ marginTop: "20px", padding: "15px", backgroundColor: "#f9f9f9", borderRadius: "8px", border: "1px solid #ddd" }}
        >
          <h3 style={{ color: "#1a73e8" }}>Directions</h3>
          <div className="steps-list" style={{ maxHeight: "200px", overflowY: "auto", color: "black"}}>
            {directions.routes[0].legs[0].steps.map((step, index) => (
              <div key={index} style={{ marginBottom: "12px", borderBottom: "1px solid #eee", paddingBottom: "8px" }}>
                <p dangerouslySetInnerHTML={{ __html: step.instructions }} style={{ margin: 0, fontSize: "1.1rem" }} />
                <small style={{ color: "#666" }}>Distance: {step.distance.text}</small>
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