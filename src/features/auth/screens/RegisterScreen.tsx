// src/features/auth/screens/RegisterScreen.tsx

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

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export function RegisterScreen({navigation}: Props) {
  const {register} = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): string | null => {
    if (!fullName.trim()) return 'Please enter your full name.';
    if (fullName.trim().length < 2) return 'Full name must be at least 2 characters.';
    
    if (!email.trim()) return 'Please enter your email address.';
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) return 'Please enter a valid email address.';
    
    if (!password.trim()) return 'Please create a password.';
    if (password.length < 6) return 'Password must be at least 6 characters.';
    if (password.length > 128) return 'Password must be less than 128 characters.';
    if (password !== confirmPassword) return 'Passwords do not match.';
    
    return null;
  };

  const handleRegister = async () => {
    const validationError = validate();
    if (validationError) {
      Alert.alert('Invalid details', validationError);
      return;
    }

    try {
      setIsSubmitting(true);

      await register({
        email: email.trim().toLowerCase(),
        password,
        fullName: fullName.trim(),
      });

      Alert.alert(
        '✅ Account Created',
        'Your account has been successfully created. Please check your email to verify your account, then sign in.',
        [{text: 'Go to Sign In', onPress: () => navigation.navigate('Login')}],
      );
    } catch (error: any) {
      let message = 'Unable to create account. Please try again.';
      
      if (error?.message?.includes('User already registered')) {
        message = 'An account with this email already exists.';
      } else if (error?.message?.includes('Invalid email')) {
        message = 'Please enter a valid email address.';
      } else if (error?.message?.includes('Weak password')) {
        message = 'Password is too weak. Please use a stronger password.';
      }
      
      Alert.alert('Registration Failed', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Screen scrollable>
      <SectionHeader
        title="Create Account"
        subtitle="Set up your profile to start monitoring hemoglobin scans"
      />

      <AppCard style={styles.card}>
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            value={fullName}
            onChangeText={setFullName}
            placeholder="Enter your full name"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="next"
            style={styles.input}
          />
        </View>

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
            returnKeyType="next"
            style={styles.input}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Create a password (min. 6 characters)"
            placeholderTextColor={colors.textSecondary}
            secureTextEntry
            returnKeyType="next"
            style={styles.input}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Confirm Password</Text>
          <TextInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Re-enter your password"
            placeholderTextColor={colors.textSecondary}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={handleRegister}
            style={styles.input}
          />
        </View>

        <PrimaryButton
          title={isSubmitting ? 'Creating account...' : 'Create Account'}
          onPress={handleRegister}
          disabled={isSubmitting}
        />

        <Text style={styles.footerText}>
          Already have an account?{' '}
          <Text style={styles.link} onPress={() => navigation.navigate('Login')}>
            Sign in
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