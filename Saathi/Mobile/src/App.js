import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
} from 'react-native';
import * as Speech from 'expo-speech';
import * as Location from 'expo-location';
import Voice from './components/Voice';
import Camera from './components/Camera';
import MapORS from './components/MapORS';
import MapGoogle from './components/MapGoogle';
import { geocodeDestination } from './Services/navigationApi';
import { extractDestinationFromSpeech } from './Services/destinationApi';

export default function App() {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [safeMode, setSafeMode] = useState(true);
  const [route, setRoute] = useState([]);
  const [routeSteps, setRouteSteps] = useState([]);
  const [detectedObjects, setDetectedObjects] = useState([]);
  const [destinationInput, setDestinationInput] = useState('');
  const [destinationCoords, setDestinationCoords] = useState(null);
  const [destinationError, setDestinationError] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [voiceDestinationLoading, setVoiceDestinationLoading] = useState(false);
  const lastSpokenStepsRef = useRef('');

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
        timeInterval: 2000,
        distanceInterval: 3,
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

  const setDestinationFromAddress = async (address) => {
    if (!address?.trim()) return;
    setDestinationError(null);
    try {
      const coords = await geocodeDestination(address, currentLocation ?? undefined);
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

  const handleGoClick = async () => {
    if (!destinationInput.trim()) return;
    await setDestinationFromAddress(destinationInput);
  };

  const handleVoiceTranscript = async (transcript) => {
    if (!transcript?.trim()) return;
    setVoiceDestinationLoading(true);
    setDestinationError(null);
    try {
      const destination = await extractDestinationFromSpeech(transcript);
      if (!destination) {
        setDestinationError('Could not understand destination. Try saying a place name or address.');
        setVoiceDestinationLoading(false);
        return;
      }
      setDestinationInput(destination);
      await setDestinationFromAddress(destination);
    } catch (e) {
      setDestinationError('Could not get destination from what you said.');
    } finally {
      setVoiceDestinationLoading(false);
    }
  };

  // Speak route instructions when steps are available (voice directions)
  useEffect(() => {
    if (!routeSteps?.length) return;
    const summary = routeSteps
      .map((s, i) => {
        const dist = s.distance != null ? s.distance : 0;
        const instr = (s.instruction || '').trim() || 'Continue';
        return dist > 0 ? `Step ${i + 1}. In ${dist} metres, ${instr}` : `Step ${i + 1}. ${instr}`;
      })
      .join('. ');
    if (summary === lastSpokenStepsRef.current) return;
    lastSpokenStepsRef.current = summary;
    Speech.stop();
    Speech.speak(summary, {
      language: 'en-US',
      pitch: 1,
      rate: 0.9,
      volume: 1,
    });
  }, [routeSteps]);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.header}>Saathi – Live Navigation for Accessibility</Text>

      {/* Voice at top: say where you want to go → LLM extracts destination → maps */}
      <Voice onTranscript={handleVoiceTranscript} />
      {voiceDestinationLoading ? (
        <Text style={styles.loadingText}>Finding your destination…</Text>
      ) : null}

      <View style={styles.safeModeRow}>
        <Text style={styles.safeModeLabel}>Safe Mode</Text>
        <Switch value={safeMode} onValueChange={setSafeMode} />
      </View>

      <View style={styles.destinationRow}>
        <TextInput
          style={styles.destinationInput}
          placeholder="Or type destination address..."
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
            setRouteSteps={setRouteSteps}
            destination={destinationCoords}
          />
          {routeSteps.length > 0 && (
            <View style={styles.stepsCard}>
              <Text style={styles.stepsCardTitle}>Steps to destination (you will hear these)</Text>
              {routeSteps.map((s, i) => {
                const dist = s.distance != null ? s.distance : 0;
                const instr = (s.instruction || '').trim();
                const line = dist > 0 ? `In ${dist}m ${instr}` : instr;
                return (
                  <Text key={i} style={styles.stepsCardItem}>
                    {i + 1}. {line}
                  </Text>
                );
              })}
            </View>
          )}
          <MapGoogle
            route={route}
            currentLocation={currentLocation}
            routeSteps={routeSteps}
            error={null}
          />
        </>
      )}

      <Camera
        setDetectedObjects={setDetectedObjects}
        detectedObjects={detectedObjects}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  container: { padding: 16, paddingBottom: 40 },
  header: { fontSize: 20, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  loadingText: { color: '#1a73e8', marginBottom: 8, fontSize: 14 },
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
  stepsCard: {
    backgroundColor: '#e8f4fc',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1a73e8',
  },
  stepsCardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1a73e8',
    marginBottom: 10,
  },
  stepsCardItem: {
    fontSize: 15,
    color: '#111',
    marginBottom: 6,
    lineHeight: 22,
  },
});
