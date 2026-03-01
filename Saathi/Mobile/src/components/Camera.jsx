import React, { useRef, useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { detectObjects } from '../Services/detection';
import { getDirectionFromBbox, announceProximityAlerts } from '../Services/proximityAlerts';

const PREVIEW_HEIGHT = 220;

export default function Camera({ setDetectedObjects, detectedObjects = [] }) {
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [active, setActive] = useState(false);
  const [error, setError] = useState(null);
  const [previewWidth, setPreviewWidth] = useState(0);
  const [photoSize, setPhotoSize] = useState({ width: 400, height: 300 });
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

  // Live updates: capture and run object detection every 1 second; announce when something is too near
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
        const w = photo.width || 400;
        const h = photo.height || 300;
        setPhotoSize({ width: w, height: h });
        const withDirection = results.map((obj) => ({
          ...obj,
          direction: getDirectionFromBbox(obj.bbox, w),
        }));
        setDetectedObjects(withDirection);
        announceProximityAlerts(withDirection, w, h);
      } catch (e) {
        // ignore single-frame errors
      }
    };
    const id = setInterval(runDetection, 1000);
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
          <View
            style={styles.preview}
            onLayout={(e) => setPreviewWidth(e.nativeEvent.layout.width)}
          >
            <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
            {previewWidth > 0 &&
              detectedObjects.map((obj, i) => {
                if (!obj.bbox || obj.bbox.length < 4) return null;
                const [x, y, w, h] = obj.bbox;
                const pw = photoSize.width || 1;
                const ph = photoSize.height || 1;
                const scaleX = previewWidth / pw;
                const scaleY = PREVIEW_HEIGHT / ph;
                return (
                  <View
                    key={`box-${obj.class}-${i}`}
                    style={[
                      styles.bbox,
                      {
                        left: x * scaleX,
                        top: y * scaleY,
                        width: w * scaleX,
                        height: h * scaleY,
                      },
                    ]}
                  >
                    <Text style={styles.bboxLabel} numberOfLines={1}>
                      {obj.class} {(obj.score * 100).toFixed(0)}%
                    </Text>
                  </View>
                );
              })}
          </View>
          <Text style={styles.hint}>
            Live detection every 1s. Voice alert when something is too near.
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
  preview: { width: '100%', height: PREVIEW_HEIGHT, backgroundColor: '#000', borderRadius: 8, overflow: 'hidden', position: 'relative' },
  bbox: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#00ff00',
    backgroundColor: 'rgba(0,255,0,0.15)',
  },
  bboxLabel: { color: '#00ff00', fontSize: 10, backgroundColor: 'rgba(0,0,0,0.7)', padding: 2 },
  hint: { fontSize: 12, color: '#666', marginTop: 8 },
  list: { marginTop: 8 },
  listTitle: { fontWeight: '600', marginBottom: 4 },
  listEmpty: { color: '#888', fontSize: 14 },
  listItem: { fontSize: 14, marginBottom: 2 },
});
