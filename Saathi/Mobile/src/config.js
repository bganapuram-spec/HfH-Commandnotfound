import Constants from 'expo-constants';

// On a physical device, localhost = the phone. Use the same host as Metro (your Mac's IP).
const getApiBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const withoutScheme = hostUri.replace(/^[a-z]+:\/\//, '');
    const host = withoutScheme.split(':')[0];
    return `http://${host}:8000`;
  }
  return 'http://localhost:8000';
};

export const API_BASE_URL = getApiBaseUrl();

export const GOOGLE_MAPS_API_KEY = 'AIzaSyBRgBszbOKxCoTLBRCJ64EGVvi4LdoCLIM';
