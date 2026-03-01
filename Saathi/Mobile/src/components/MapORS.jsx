import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { getRoute } from '../Services/navigationApi';

export default function MapORS({ currentLocation, safeMode, setRoute, destination }) {
  const [localRoute, setLocalRoute] = useState([]);

  useEffect(() => {
    if (!currentLocation || !destination) return;
    console.log('MapORS effect', { currentLocation, destination });
    async function fetchRoute() {
      try {
        const routeData = await getRoute(currentLocation, destination, safeMode);
        setLocalRoute(routeData.route || []);
        setRoute(routeData.route || []);
      } catch (err) {
        console.error('Failed to fetch ORS route:', err);
      }
    }
    fetchRoute();
  }, [currentLocation, safeMode, destination, setRoute]);

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
