// src/features/auth/screens/LoginScreen.tsx

import React, {useState} from 'react';
import {Alert, StyleSheet, Text, TextInput, View} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';

import {Screen} from '../../../components/Screen';
import {SectionHeader} from '../../../components/ui/SectionHeader';
import {AppCard} from '../../../components/ui/AppCard';
import {PrimaryButton} from '../../../components/ui/PrimaryButton';

import {colors} from '../../../theme/colors';
import {spacing} from '../../../theme/spacing';
import {typography} from '../../../theme/typography';

import {useAuth} from '../../../app/AuthContext';
import type {AuthStackParamList} from '../../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({navigation}: Props) {
  const {login} = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing details', 'Please enter your email and password.');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }

    // Validate password length
    if (password.trim().length < 6) {
      Alert.alert('Invalid password', 'Password must be at least 6 characters.');
      return;
    }

    try {
      setIsSubmitting(true);
      await login(email, password);
    } catch (error: any) {
      let message = 'Unable to sign in.';
      
      if (error?.message?.includes('Invalid login credentials')) {
        message = 'Incorrect email or password.';
      } else if (error?.message?.includes('Email not confirmed')) {
        message = 'Please verify your email address.';
      }
      
      Alert.alert('Login failed', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Screen scrollable>
      <SectionHeader
        title="Welcome back"
        subtitle="Sign in to continue monitoring your hemoglobin scans"
      />

      <AppCard style={styles.card}>
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            style={styles.input}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            placeholderTextColor={colors.textSecondary}
            secureTextEntry
            style={styles.input}
          />
        </View>

        <PrimaryButton
          title={isSubmitting ? 'Signing in...' : 'Sign In'}
          onPress={handleLogin}
          disabled={isSubmitting}
        />

        <Text style={styles.footerText}>
          Don&apos;t have an account?{' '}
          <Text style={styles.link} onPress={() => navigation.navigate('Register')}>
            Create one
          </Text>
        </Text>
      </AppCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.lg,
  },
  fieldGroup: {
    gap: spacing.sm,
  },
  label: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    color: colors.textPrimary,
    ...typography.bodyMD,
  },
  footerText: {
    color: colors.textSecondary,
    textAlign: 'center',
    ...typography.bodySM,
  },
  link: {
    color: colors.primary,
    fontWeight: '700',
  },
});