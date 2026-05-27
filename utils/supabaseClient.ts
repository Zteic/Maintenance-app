import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// 🚀 TRICK ANTI-SSR: Buat storage tiruan jika aplikasi dirender di lingkungan Node.js/Web Server
const customLocalStorage = {
  getItem: async (key: string) => {
    if (Platform.OS === 'web' && typeof window === 'undefined') return null;
    return await AsyncStorage.getItem(key);
  },
  setItem: async (key: string, value: string) => {
    if (Platform.OS === 'web' && typeof window === 'undefined') return;
    await AsyncStorage.setItem(key, value);
  },
  removeItem: async (key: string) => {
    if (Platform.OS === 'web' && typeof window === 'undefined') return;
    await AsyncStorage.removeItem(key);
  },
};

// 🚀 CLASS DUMMY WEBSOCKET (Tetap kita pertahankan agar Node 20 tidak protes)
if (typeof global.WebSocket === 'undefined') {
  class DummyWebSocket {
    static CONNECTING = 0; static OPEN = 1; static CLOSING = 2; static CLOSED = 3;
    constructor() {}
    send() {} close() {}
  }
  (global as any).WebSocket = DummyWebSocket;
}

const SUPABASE_URL = 'https://knljwkplnkzccsyuettp.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtubGp3a3Bsbmt6Y2NzeXVldHRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4ODg0MjEsImV4cCI6MjA5NTQ2NDQyMX0.SnGi1eWd5sTCEmrgwxxnKrp1PriIuiglQOc8ErR-Ddw';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: customLocalStorage, // 👈 Pakai storage adaptif yang baru kita buat
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});