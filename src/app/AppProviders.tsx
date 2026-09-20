// src/app/AppProviders.tsx

import React, {PropsWithChildren} from 'react';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {AuthProvider} from './AuthContext';
import {LanguageProvider} from './LanguageContext';

export function AppProviders({children}: PropsWithChildren) {
  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <AuthProvider>{children}</AuthProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
