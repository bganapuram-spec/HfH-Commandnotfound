import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { getRoute } from '../Services/navigationApi';

const REFETCH_DISTANCE_M = 25;

function distanceMeters(a, b) {
  if (!a || !b) return Infinity;
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function sameCoords(a, b) {
  if (!a || !b) return a === b;
  return a.lat === b.lat && a.lng === b.lng;
}

export default function MapORS({ currentLocation, safeMode, setRoute, setRouteSteps, destination }) {
  const [localRoute, setLocalRoute] = useState([]);
  const lastFetchOrigin = useRef(null);
  const lastDestination = useRef(null);

  useEffect(() => {
    if (!currentLocation || !destination) return;

    const destinationChanged = !sameCoords(lastDestination.current, destination);
    const distFromLast = lastFetchOrigin.current
      ? distanceMeters(currentLocation, lastFetchOrigin.current)
      : Infinity;
    const skip = !destinationChanged && distFromLast < REFETCH_DISTANCE_M && lastFetchOrigin.current;
    if (skip) return;

    lastDestination.current = { ...destination };
    lastFetchOrigin.current = { ...currentLocation };

    async function fetchRoute() {
      try {
        const routeData = await getRoute(currentLocation, destination, safeMode);
        const coords = routeData.route || [];
        const steps = routeData.steps || [];
        setLocalRoute(coords);
        setRoute(coords);
        setRouteSteps?.(steps);
      } catch (err) {
        console.error('Failed to fetch ORS route:', err);
      }
    }
    fetchRoute();
  }, [currentLocation?.lat, currentLocation?.lng, safeMode, destination?.lat, destination?.lng, setRoute, setRouteSteps]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ORS Route</Text>
      {localRoute.length === 0 ? (
        <Text style={styles.loading}>Loading route...</Text>
      ) : (
        <ScrollView style={styles.list}>
          {localRoute.map((point, index) => (
            <Text key={index} style={styles.item}>
              Lat: {point.lat}, Lng: {point.lng}
            </Text>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxHeight: 200,
    backgroundColor: '#cfe8fc',
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 12,
    padding: 12,
  },
  title: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  loading: { color: '#666' },
  list: { maxHeight: 160 },
  item: { fontSize: 12, marginBottom: 4 },
});
