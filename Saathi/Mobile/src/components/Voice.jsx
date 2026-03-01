import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { chatWithLLM } from '../Services/llmApi';

export default function Voice({ safeMode, setRoute, currentLocation, detectedObjects }) {
  const [query, setQuery] = useState('');
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAsk = async () => {
    const q = (query || 'What do you see around me? Describe obstacles and people and their direction.').trim();
    if (!q) return;
    setLoading(true);
    setReply('');
    try {
      const context = {
        currentLocation,
        safeMode,
        detectedObjects: (detectedObjects || []).map((o) => ({
          class: o.class,
          score: o.score,
          direction: o.direction ?? 'ahead',
        })),
      };
      const messages = [{ role: 'user', content: q }];
      const text = await chatWithLLM(messages, context);
      setReply(text);
    } catch (e) {
      setReply('Sorry, I couldn\'t get an answer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Voice / Assistant</Text>
      <Text style={styles.safeMode}>Safe Mode: {safeMode ? 'On' : 'Off'}</Text>
      <TextInput
        style={styles.input}
        placeholder="Ask about your surroundings..."
        value={query}
        onChangeText={setQuery}
        editable={!loading}
      />
      <TouchableOpacity style={styles.button} onPress={handleAsk} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Ask</Text>}
      </TouchableOpacity>
      {reply ? <Text style={styles.reply}>{reply}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
  },
  title: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  safeMode: { color: '#666', marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    marginBottom: 8,
  },
  button: {
    backgroundColor: '#1a73e8',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16 },
  reply: { marginTop: 12, fontSize: 14, color: '#333' },
});
