// src/app/AppProviders.tsx

import React, {PropsWithChildren} from 'react';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {AuthProvider} from './AuthContext';

export function AppProviders({children}: PropsWithChildren) {
  return (
    <SafeAreaProvider>
      <AuthProvider>{children}</AuthProvider>
    </SafeAreaProvider>
  );
}