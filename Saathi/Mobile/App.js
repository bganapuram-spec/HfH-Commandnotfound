import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import App from './src/App';
export default function Main() {
  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <App />
    </SafeAreaProvider>
  );
}
