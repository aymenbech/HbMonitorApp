// src/navigation/MainTabs.tsx

import React from 'react';
import {Text} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {MainTabParamList} from './types';
import {HomeScreen} from '../features/home/screens/HomeScreen';
import {ScanScreen} from '../features/scan/screens/ScanScreen';
import {AnalyticsScreen} from '../features/analytics/screens/AnalyticsScreen';
import {ProfileScreen} from '../features/profile/screens/ProfileScreen';
import {colors} from '../theme/colors';
import {useLanguage} from '../app/LanguageContext';

const Tab = createBottomTabNavigator<MainTabParamList>();

function TabLabel({label, focused}: {label: string; focused: boolean}) {
  return (
    <Text
      style={{
        color: focused ? colors.primary : colors.textSecondary,
        fontSize: 12,
        fontWeight: focused ? '700' : '500',
      }}>
      {label}
    </Text>
  );
}

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 70,
          paddingBottom: 10,
          paddingTop: 8,
        },
      }}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{tabBarLabel: ({focused}) => <TabLabel label={t('navigation', 'home')} focused={focused} />}}
      />
      <Tab.Screen
        name="Scan"
        component={ScanScreen}
        options={{tabBarLabel: ({focused}) => <TabLabel label={t('navigation', 'scan')} focused={focused} />}}
      />
      <Tab.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{tabBarLabel: ({focused}) => <TabLabel label={t('navigation', 'analytics')} focused={focused} />}}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{tabBarLabel: ({focused}) => <TabLabel label={t('navigation', 'profile')} focused={focused} />}}
      />
    </Tab.Navigator>
  );
}