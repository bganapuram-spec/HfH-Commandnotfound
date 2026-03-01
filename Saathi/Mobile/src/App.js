import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Platform,
} from 'react-native';
import * as Location from 'expo-location';
import Voice from './components/Voice';
import Camera from './components/Camera';
import MapORS from './components/MapORS';
import MapNative from './components/MapNative';
import { geocodeDestination } from './Services/navigationApi';

export default function App() {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [safeMode, setSafeMode] = useState(true);
  const [route, setRoute] = useState([]);
  const [detectedObjects, setDetectedObjects] = useState([]);
  const [destinationInput, setDestinationInput] = useState('');
  const [destinationCoords, setDestinationCoords] = useState(null);
  const [destinationError, setDestinationError] = useState(null);
  const [locationError, setLocationError] = useState(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Location permission denied. Please allow in settings.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setCurrentLocation({
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
      });
    })();
  }, []);

  useEffect(() => {
    if (!currentLocation) return;
    const sub = Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 5000,
        distanceInterval: 5,
      },
      (loc) => {
        setCurrentLocation({
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
        });
      }
    );
    return () => {
      sub.then((subscription) => subscription.remove());
    };
  }, [!!currentLocation]);

  const handleGoClick = async () => {
    console.log('handleGoClick', destinationInput);
    if (!destinationInput.trim()) return;
    setDestinationError(null);
    try {
      const coords = await geocodeDestination(destinationInput);
      if (!coords) {
        setDestinationError('Could not find destination. Try another name.');
        setDestinationCoords(null);
        return;
      }
      setDestinationCoords(coords);
    } catch (err) {
      console.error(err);
      setDestinationError('Error finding destination. Try again.');
      setDestinationCoords(null);
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.header}>Saathi – Live Navigation for Accessibility</Text>

      <View style={styles.safeModeRow}>
        <Text style={styles.safeModeLabel}>Safe Mode</Text>
        <Switch value={safeMode} onValueChange={setSafeMode} />
      </View>

      <View style={styles.destinationRow}>
        <TextInput
          style={styles.destinationInput}
          placeholder="Type destination address..."
          value={destinationInput}
          onChangeText={(t) => {
            setDestinationInput(t);
            setDestinationError(null);
          }}
        />
        <TouchableOpacity style={styles.goButton} onPress={handleGoClick}>
          <Text style={styles.goButtonText}>Go</Text>
        </TouchableOpacity>
      </View>
      {destinationError ? (
        <Text style={styles.destinationError}>{destinationError}</Text>
      ) : null}

      {locationError ? (
        <Text style={styles.locationError}>{locationError}</Text>
      ) : !currentLocation ? (
        <Text style={styles.loadingLocation}>Getting current location… Please allow location access.</Text>
      ) : (
        <>
          <MapORS
            currentLocation={currentLocation}
            safeMode={safeMode}
            setRoute={setRoute}
            destination={destinationCoords}
          />
          <MapNative
            route={route}
            currentLocation={currentLocation}
            error={null}
          />
        </>
      )}

      <Camera
        setDetectedObjects={setDetectedObjects}
        detectedObjects={detectedObjects}
      />

      <Voice
        safeMode={safeMode}
        setRoute={setRoute}
        currentLocation={currentLocation}
        detectedObjects={detectedObjects}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  container: { padding: 16, paddingBottom: 40 },
  header: { fontSize: 20, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  safeModeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  safeModeLabel: { fontSize: 16, marginRight: 8 },
  destinationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  destinationInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    marginRight: 8,
  },
  goButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#1a73e8',
    borderRadius: 8,
    justifyContent: 'center',
  },
  goButtonText: { color: '#fff', fontSize: 16 },
  destinationError: { color: 'red', marginBottom: 8 },
  locationError: { color: 'red', marginBottom: 12 },
  loadingLocation: { color: '#666', marginBottom: 12 },
});
