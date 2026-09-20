// src/navigation/AppNavigator.tsx

import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {AppStackParamList} from './types';
import {MainTabs} from './MainTabs';
import {ResultScreen} from '../features/results/screens/ResultScreen';
import {colors} from '../theme/colors';

const Stack = createNativeStackNavigator<AppStackParamList>();

export function AppNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: {backgroundColor: colors.background},
      }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="Result" component={ResultScreen} />
    </Stack.Navigator>
  );
}