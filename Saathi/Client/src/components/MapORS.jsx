// client/components/MapORS.jsx
import React, { useEffect, useState } from "react";
import { getRoute } from "../Services/navigationApi";

function MapORS({ currentLocation, safeMode, setRoute }) {
  const [localRoute, setLocalRoute] = useState([]);

  useEffect(() => {
    if (!currentLocation) return;

    async function fetchRoute() {
      try {
        // For testing, example destination slightly offset
        const destination = {
          lat: currentLocation.lat + 0.002,
          lng: currentLocation.lng + 0.002
        };

        const routeData = await getRoute(currentLocation, destination, safeMode);

        setLocalRoute(routeData.route);
        setRoute(routeData.route);
      } catch (err) {
        console.error("Failed to fetch ORS route:", err);
      }
    }

    fetchRoute();
  }, [currentLocation, safeMode, setRoute]);

  useEffect(() => {
    console.log("MapORS mounted");
    console.log("Current location:", currentLocation);
    console.log("Route data:", localRoute);
  }, [currentLocation, localRoute]);

  return (
    <div
      style={{
        width: "100%",
        height: "400px",
        backgroundColor: "#cfe8fc",
        border: "1px solid #333",
        marginBottom: "1rem",
        padding: "1rem",
        overflowY: "auto"
      }}
    >
      <h3>ORS Map</h3>
      {localRoute.length === 0 ? (
        <p>Loading route...</p>
      ) : (
        <ul>
          {localRoute.map((point, index) => (
            <li key={index}>
              Lat: {point.lat}, Lng: {point.lng}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default MapORS;