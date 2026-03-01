import React, { useRef, useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { detectObjects } from '../Services/detection';
import { getDirectionFromBbox } from '../Services/proximityAlerts';

export default function Camera({ setDetectedObjects, detectedObjects = [] }) {
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [active, setActive] = useState(false);
  const [error, setError] = useState(null);
  const detectionIntervalRef = useRef(null);

  const startCamera = useCallback(async () => {
    setError(null);
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        setError('Camera permission denied');
        return;
      }
    }
    setActive(true);
  }, [permission, requestPermission]);

  const stopCamera = useCallback(() => {
    setActive(false);
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    setDetectedObjects?.([]);
  }, [setDetectedObjects]);

  // Capture a frame and run object detection via backend every 2.5s
  const PREVIEW_WIDTH = 400;
  useEffect(() => {
    if (!active || !setDetectedObjects || !cameraRef.current) return;
    const runDetection = async () => {
      try {
        const photo = await cameraRef.current?.takePictureAsync({
          base64: true,
          quality: 0.4,
          skipProcessing: true,
        });
        if (!photo?.base64) return;
        const results = await detectObjects(photo.base64);
        const withDirection = results.map((obj) => ({
          ...obj,
          direction: getDirectionFromBbox(obj.bbox, photo.width || PREVIEW_WIDTH),
        }));
        setDetectedObjects(withDirection);
      } catch (e) {
        // ignore single-frame errors
      }
    };
    const id = setInterval(runDetection, 2500);
    detectionIntervalRef.current = id;
    return () => clearInterval(id);
  }, [active, setDetectedObjects]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Camera</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!permission?.granted && !active ? (
        <TouchableOpacity style={styles.button} onPress={startCamera}>
          <Text style={styles.buttonText}>Allow camera access</Text>
        </TouchableOpacity>
      ) : null}
      {permission?.granted && !active && !error ? (
        <TouchableOpacity style={styles.button} onPress={startCamera}>
          <Text style={styles.buttonText}>Turn on camera</Text>
        </TouchableOpacity>
      ) : null}
      {active && (
        <>
          <View style={styles.preview}>
            <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
          </View>
          <Text style={styles.hint}>
            Object detection runs on the backend every few seconds.
          </Text>
          <View style={styles.list}>
            <Text style={styles.listTitle}>Detected objects:</Text>
            {detectedObjects.length === 0 ? (
              <Text style={styles.listEmpty}>None</Text>
            ) : (
              <ScrollView>
                {detectedObjects.map((obj, i) => (
                  <Text key={`${obj.class}-${i}`} style={styles.listItem}>
                    {obj.class} — {(obj.score * 100).toFixed(0)}% — {obj.direction ?? '—'}
                  </Text>
                ))}
              </ScrollView>
            )}
          </View>
          <TouchableOpacity style={styles.buttonSecondary} onPress={stopCamera}>
            <Text style={styles.buttonText}>Stop camera</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 12, marginBottom: 12 },
  title: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  error: { color: 'red', marginBottom: 8 },
  button: {
    padding: 14,
    backgroundColor: '#1a73e8',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  buttonSecondary: {
    marginTop: 8,
    padding: 10,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  buttonText: { color: '#000', fontSize: 16 },
  preview: { width: '100%', height: 220, backgroundColor: '#000', borderRadius: 8, overflow: 'hidden' },
  hint: { fontSize: 12, color: '#666', marginTop: 8 },
  list: { marginTop: 8 },
  listTitle: { fontWeight: '600', marginBottom: 4 },
  listEmpty: { color: '#888', fontSize: 14 },
  listItem: { fontSize: 14, marginBottom: 2 },
});
