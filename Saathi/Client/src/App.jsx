import { useState, useEffect } from "react";
import Voice from "./components/Voice";
import Camera from "./components/Camera";
import MapORS from "./components/MapORS";
import MapGoogle from "./components/MapGoogle";
import { geocodeDestination } from "./Services/navigationApi";
import "./App.css";

function App() {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [safeMode, setSafeMode] = useState(true);
  const [route, setRoute] = useState([]);
  const [detectedObjects, setDetectedObjects] = useState([]);

  const [destinationInput, setDestinationInput] = useState("");
  const [destinationCoords, setDestinationCoords] = useState(null);
  const [destinationError, setDestinationError] = useState(null);

  // Get GPS location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCurrentLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => {
          console.error(err);
          alert("Could not get your location. Please allow location access.");
        },
        { enableHighAccuracy: true }
      );
    } else alert("Geolocation not supported by this browser.");
  }, []);

  const handleGoClick = async () => {
    console.log("Geocoding destination:", destinationInput);
    if (!destinationInput.trim()) return;
    setDestinationError(null);

    try {
      const coords = await geocodeDestination(destinationInput);
      console.log(coords);
      if (!coords) {
        setDestinationError("Could not find destination. Try another name.");
        setDestinationCoords(null);
        return;
      }
      setDestinationCoords(coords);
    } catch (err) {
      console.error(err);
      setDestinationError("Error finding destination. Try again.");
      setDestinationCoords(null);
    }
  };

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

      {/* Destination input */}
      <div className="destination-input" style={{ margin: "10px 0" }}>
        <input
          type="text"
          placeholder="Type destination address..."
          value={destinationInput}
          onChange={(e) => setDestinationInput(e.target.value)}
          style={{ width: "70%", padding: "8px", fontSize: "1rem" }}
        />
        <button
          onClick={handleGoClick}
          style={{ padding: "8px 12px", marginLeft: "10px", fontSize: "1rem" }}
        >
          Go
        </button>
        {destinationError && <p style={{ color: "red", marginTop: "5px" }}>{destinationError}</p>}
      </div>

      {/* Maps */}
      <div className="maps-container" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {currentLocation ? (
          <>
            <MapORS
              currentLocation={currentLocation}
              safeMode={safeMode}
              setRoute={setRoute}
              destination={destinationCoords} // Pass typed destination coords
            />
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