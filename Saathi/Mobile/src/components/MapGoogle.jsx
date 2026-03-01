import React, { useEffect, useState, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

function haversineMeters(a, b) {
  if (!a || !b) return 0;
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function getClosestRouteIndex(route, point) {
  if (!route?.length || !point) return 0;
  let best = 0;
  let bestD = Infinity;
  route.forEach((p, i) => {
    const d = haversineMeters(p, point);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  return best;
}

function distanceAlongRoute(route, fromIdx, toIdx) {
  let d = 0;
  for (let i = fromIdx; i < toIdx && i < route.length - 1; i++) {
    d += haversineMeters(route[i], route[i + 1]);
  }
  return Math.round(d);
}

export default function MapGoogle({ route, currentLocation, routeSteps, error }) {
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

  const { currentStepIndex, distanceToNextTurn, stepStrings } = useMemo(() => {
    const steps = routeSteps || [];
    const strings = steps.map((s) => {
      const dist = s.distance != null ? s.distance : 0;
      const instr = (s.instruction || '').trim();
      return dist > 0 ? `In ${dist}m ${instr}` : instr;
    });
    if (!currentLocation || !route?.length || steps.length === 0) {
      return { currentStepIndex: 0, distanceToNextTurn: null, stepStrings: strings };
    }
    const closestIdx = getClosestRouteIndex(route, currentLocation);
    let stepIndex = 0;
    let distToNext = null;
    for (let i = 0; i < steps.length; i++) {
      const wp = steps[i].wayPoints || steps[i].way_points;
      if (!wp || wp.length < 2) continue;
      const [from, to] = wp;
      if (closestIdx >= from && closestIdx <= to) {
        stepIndex = i;
        distToNext = distanceAlongRoute(route, closestIdx, to);
        break;
      }
      if (closestIdx < from) {
        stepIndex = i;
        distToNext = distanceAlongRoute(route, closestIdx, from);
        break;
      }
      stepIndex = i;
    }
    return { currentStepIndex: stepIndex, distanceToNextTurn: distToNext, stepStrings: strings };
  }, [route, currentLocation, routeSteps]);

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
      {stepStrings.length > 0 && (
        <View style={styles.instructions}>
          <Text style={styles.instructionsTitle}>Steps to go (live)</Text>
          {distanceToNextTurn != null && (
            <Text style={styles.nextTurn}>
              Next: In ~{distanceToNextTurn}m — {stepStrings[currentStepIndex]}
            </Text>
          )}
          <ScrollView style={styles.stepsScroll} nestedScrollEnabled>
            {stepStrings.slice(0, 6).map((step, index) => (
              <Text
                key={index}
                style={[styles.step, index === currentStepIndex && styles.stepCurrent]}
              >
                {index + 1}. {step}
              </Text>
            ))}
          </ScrollView>
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
    backgroundColor: 'rgba(0,0,0,0.85)',
    padding: 12,
    maxHeight: 140,
  },
  instructionsTitle: { color: '#1a73e8', fontWeight: '600', marginBottom: 4 },
  nextTurn: { color: '#7fff7f', fontSize: 13, fontWeight: '600', marginBottom: 6 },
  stepsScroll: { maxHeight: 88 },
  step: { color: '#ddd', fontSize: 12, marginBottom: 2 },
  stepCurrent: { color: '#fff', fontWeight: '600' },
  error: { color: 'red', padding: 8 },
});
