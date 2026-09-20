// src/lib/supabase.ts

import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {createClient} from '@supabase/supabase-js';

const supabaseUrl = 'https://ihdbizcodhucnnamlnde.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloZGJpemNvZGh1Y25uYW1sbmRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3Njg2NTQsImV4cCI6MjA5NjM0NDY1NH0.TF-ZMb_0TmjeGKoo5hzBuCrG_lttTX0cLnWsF_tPs2w';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'X-Client-Info': 'hb-monitor-app',
    },
  },
});