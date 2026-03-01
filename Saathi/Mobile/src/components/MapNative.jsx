import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

export default function MapNative({ route, currentLocation, directionsSteps, error }) {
  const mapRef = useRef(null);
  const [region, setRegion] = useState(
    currentLocation
      ? {
          latitude: currentLocation.lat,
          longitude: currentLocation.lng,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }
      : null
  );

  useEffect(() => {
    if (!currentLocation) return;
    const newRegion = {
      latitude: currentLocation.lat,
      longitude: currentLocation.lng,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    };
    setRegion(newRegion);
    if (mapRef.current) {
      mapRef.current.animateToRegion(newRegion, 500);
    }
  }, [currentLocation?.lat, currentLocation?.lng]);

  if (!currentLocation) return null;

  const routeCoords =
    route?.length > 0
      ? route.map((p) => ({ latitude: p.lat, longitude: p.lng }))
      : [];

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={region}
        region={region}
        showsUserLocation
        showsMyLocationButton
      >
        {routeCoords.length > 0 && (
          <Polyline
            coordinates={routeCoords}
            strokeColor="#1a73e8"
            strokeWidth={5}
          />
        )}
        {routeCoords.length > 0 && (
          <Marker
            coordinate={routeCoords[routeCoords.length - 1]}
            title="Destination"
          />
        )}
      </MapView>
      {directionsSteps && directionsSteps.length > 0 && (
        <View style={styles.instructions}>
          <Text style={styles.instructionsTitle}>Directions</Text>
          {directionsSteps.slice(0, 5).map((step, index) => (
            <Text key={index} style={styles.step}>
              {step}
            </Text>
          ))}
        </View>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { height: 280, marginBottom: 12, overflow: 'hidden', borderRadius: 12 },
  map: { flex: 1, width: '100%' },
  instructions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 12,
    maxHeight: 120,
  },
  instructionsTitle: { color: '#1a73e8', fontWeight: '600', marginBottom: 4 },
  step: { color: '#fff', fontSize: 12, marginBottom: 2 },
  error: { color: 'red', padding: 8 },
});
