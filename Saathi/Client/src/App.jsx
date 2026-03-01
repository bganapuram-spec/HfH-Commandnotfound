// client/App.jsx
import { useState, useEffect } from "react";
import Voice from "./components/Voice";
import Camera from "./components/Camera";
import MapORS from "./components/MapORS";
import MapGoogle from "./components/MapGoogle";
import "./App.css";

function App() {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [safeMode, setSafeMode] = useState(true);
  const [route, setRoute] = useState([]);
  const [detectedObjects, setDetectedObjects] = useState([]);

  // Get actual GPS location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error("Error getting location:", error);
          alert("Could not get your location. Please allow location access.");
        },
        { enableHighAccuracy: true }
      );
    } else {
      alert("Geolocation not supported by this browser.");
    }
  }, []);

  return (
    <div className="App">
      <header>
        <h1>Saathi – Live Navigation for Accessibility</h1>
      </header>

      {/* Safe Mode Toggle */}
      <div className="safe-mode-toggle">
        <label>
          <input type="checkbox" checked={safeMode} onChange={(e) => setSafeMode(e.target.checked)} />
          Safe Mode
        </label>
      </div>

      {/* Maps */}
      <div className="maps-container" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {currentLocation ? (
          <>
            <MapORS currentLocation={currentLocation} safeMode={safeMode} setRoute={setRoute} />
            <MapGoogle route={route} currentLocation={currentLocation} />
          </>
        ) : (
          <p>Getting current location… Please allow location access.</p>
        )}
      </div>

      {/* Camera / Object Detection */}
      <Camera setDetectedObjects={setDetectedObjects} detectedObjects={detectedObjects} />

      {/* Voice Control */}
      <Voice
        safeMode={safeMode}
        setRoute={setRoute}
        currentLocation={currentLocation}
        detectedObjects={detectedObjects}
      />
    </div>
  );
}

export default App;