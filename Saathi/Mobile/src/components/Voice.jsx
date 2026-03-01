import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Audio } from 'expo-av';
import { transcribeAudio } from '../Services/speechApi';

// Web: browser SpeechRecognition. Native: record with expo-av → upload to backend (Google Speech-to-Text).

function VoiceWeb({ onTranscript }) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');

  const getSpeechRecognition = useCallback(() => {
    if (typeof window === 'undefined') return null;
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }, []);

  const handlePress = useCallback(() => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      setError('Speech recognition not supported in this browser.');
      return;
    }

    if (listening) {
      setListening(false);
      return;
    }

    setTranscript('');
    setError('');
    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onresult = (e) => {
      const t = e.results?.[e.results.length - 1]?.[0]?.transcript ?? '';
      setTranscript(t);
      if (onTranscript && t) onTranscript(t);
    };
    rec.onerror = (e) => setError(e.error || 'Speech recognition error');

    rec.start();
    setListening(true);
  }, [listening, getSpeechRecognition, onTranscript]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Voice – Speech to Text (web)</Text>
      <Text style={styles.hint}>Tap mic, speak, then tap again to stop.</Text>
      <TouchableOpacity
        style={[styles.button, listening && styles.buttonActive]}
        onPress={handlePress}
      >
        <Text style={styles.buttonText}>
          {listening ? 'Listening… tap to stop' : 'Tap to speak'}
        </Text>
      </TouchableOpacity>
      <View style={styles.transcriptBox}>
        <Text style={styles.transcriptLabel}>What you said:</Text>
        <Text style={styles.transcript} selectable>
          {transcript || '…'}
        </Text>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function VoiceNativeRecord({ onTranscript }) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [starting, setStarting] = useState(false);
  const recordingRef = useRef(null);

  const startRecording = useCallback(async () => {
    setError('');
    setTranscript('');
    setStarting(true);
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        setError('Microphone permission denied.');
        setStarting(false);
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        interruptionModeIOS: 1, // DoNotMix – required for reliable recording on iOS
        interruptionModeAndroid: 2, // DuckOthers
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      // Brief delay so iOS audio session is active before starting (avoids NSOSStatusErrorDomain)
      await new Promise((r) => setTimeout(r, 400));
      let rec;
      try {
        const result = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        rec = result.recording;
      } catch (highQualityErr) {
        // Fallback: some devices fail with HIGH_QUALITY (e.g. NSOSStatusErrorDomain)
        const result = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.LOW_QUALITY
        );
        rec = result.recording;
      }
      recordingRef.current = rec;
      setIsRecording(true);
    } catch (e) {
      const msg = e.message || '';
      if (msg.includes('NSOSStatusErrorDomain') || msg.includes('errordomain') || msg.includes('561145')) {
        setError('iOS audio error. Try again (keep app in foreground), or restart the app.');
      } else {
        setError(msg || 'Could not start recording.');
      }
    } finally {
      setStarting(false);
    }
  }, []);

  const stopAndSend = useCallback(async () => {
    const rec = recordingRef.current;
    if (!rec) return;
    recordingRef.current = null;
    setIsRecording(false);
    setProcessing(true);
    setError('');
    try {
      await rec.stopAndUnloadAsync();
      const uri = rec.getURI();
      if (!uri) {
        setError('No recording file.');
        setProcessing(false);
        return;
      }
      const text = await transcribeAudio(uri);
      setTranscript(text);
      if (onTranscript && text) onTranscript(text);
    } catch (e) {
      setError(e.message || 'Transcription failed.');
    } finally {
      setProcessing(false);
    }
  }, [onTranscript]);

  const handlePress = useCallback(() => {
    if (processing || starting) return;
    if (isRecording) {
      stopAndSend();
      return;
    }
    startRecording();
  }, [isRecording, processing, starting, startRecording, stopAndSend]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Voice – Speech to Text</Text>
      <Text style={styles.hint}>
        Tap to start recording, speak, then tap again to stop. Your speech is sent to the server and converted to text (Google API).
      </Text>
      <TouchableOpacity
        style={[
          styles.button,
          (isRecording || starting) && styles.buttonActive,
          (processing || starting) && styles.buttonDisabled,
        ]}
        onPress={handlePress}
        disabled={processing || starting}
      >
        {processing ? (
          <ActivityIndicator color="#fff" />
        ) : starting ? (
          <Text style={styles.buttonText}>Starting…</Text>
        ) : (
          <Text style={styles.buttonText}>
            {isRecording
              ? 'Recording… tap to stop'
              : 'Tap to speak'}
          </Text>
        )}
      </TouchableOpacity>
      <View style={styles.transcriptBox}>
        <Text style={styles.transcriptLabel}>What you said:</Text>
        <Text style={styles.transcript} selectable>
          {transcript || '…'}
        </Text>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

export default function Voice(props) {
  if (Platform.OS === 'web') {
    return <VoiceWeb {...props} />;
  }
  return <VoiceNativeRecord {...props} />;
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
  },
  title: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  hint: { color: '#666', fontSize: 12, marginBottom: 12 },
  button: {
    backgroundColor: '#1a73e8',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  buttonActive: { backgroundColor: '#0d47a1' },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16 },
  transcriptBox: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    minHeight: 56,
  },
  transcriptLabel: { fontSize: 12, color: '#666', marginBottom: 6 },
  transcript: { fontSize: 18, color: '#111', lineHeight: 26 },
  error: { marginTop: 8, fontSize: 14, color: '#c62828' },
});
