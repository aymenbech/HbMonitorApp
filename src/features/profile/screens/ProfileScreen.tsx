// src/features/profile/screens/ProfileScreen.tsx

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {Screen} from '../../../components/Screen';
import {SectionHeader} from '../../../components/ui/SectionHeader';
import {AppCard} from '../../../components/ui/AppCard';
import {PrimaryButton} from '../../../components/ui/PrimaryButton';

import {useAuth} from '../../../app/AuthContext';
import {useLanguage} from '../../../app/LanguageContext';
import {supabase} from '../../../lib/supabase';
import {colors} from '../../../theme/colors';
import {spacing} from '../../../theme/spacing';
import {typography} from '../../../theme/typography';

import {
  calculateAgeInfo,
  resolveDemographicGroup,
  getDemographicLabel,
  type UserMedicalProfile,
} from '../../../analysis/interpretation/demographicResolver';

type SexType = 'male' | 'female';
type PregnancyStatus = 'not_pregnant' | 'pregnant' | 'unknown';

type ProfileData = {
  fullName: string;
  email: string;
};

type MedicalData = {
  dateOfBirth: string;
  sex: SexType | null;
  pregnancyStatus: PregnancyStatus;
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function calculateAgeLabel(dob: string | null): string {
  const ageInfo = calculateAgeInfo(dob);
  if (!ageInfo) return '—';

  if (ageInfo.years < 2) {
    return `${ageInfo.monthsTotal} months`;
  }

  return `${ageInfo.years} years old`;
}

function formatSex(value: SexType | null, t: any): string {
  if (!value) return '—';
  return value === 'male' ? t('profile', 'male') : t('profile', 'female');
}

function formatPregnancyStatus(value: PregnancyStatus, t: any): string {
  switch (value) {
    case 'pregnant':
      return t('profile', 'pregnant');
    case 'unknown':
      return t('profile', 'unknown');
    default:
      return t('profile', 'notPregnant');
  }
}

function InfoRow({label, value}: {label: string; value: string}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '—'}</Text>
    </View>
  );
}

function SectionDivider() {
  return <View style={styles.divider} />;
}

export function ProfileScreen() {
  const {user, logout} = useAuth();

  const [profile, setProfile] = useState<ProfileData>({
    fullName: '',
    email: '',
  });

  const [medical, setMedical] = useState<MedicalData>({
    dateOfBirth: '',
    sex: null,
    pregnancyStatus: 'not_pregnant',
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [isSavingMedical, setIsSavingMedical] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedDob, setEditedDob] = useState('');
  const [totalScans, setTotalScans] = useState(0);

  const ageLabel = useMemo(
    () => calculateAgeLabel(medical.dateOfBirth || null),
    [medical.dateOfBirth],
  );

  const ageInfo = useMemo(
    () => calculateAgeInfo(medical.dateOfBirth || null),
    [medical.dateOfBirth],
  );

  const derivedMedicalProfile = useMemo<UserMedicalProfile>(
    () => ({
      sex: medical.sex,
      pregnancy_status: medical.pregnancyStatus,
      date_of_birth: medical.dateOfBirth || null,
    }),
    [medical.dateOfBirth, medical.sex, medical.pregnancyStatus],
  );

  const demographicGroup = useMemo(
    () => resolveDemographicGroup(derivedMedicalProfile),
    [derivedMedicalProfile],
  );

  const demographicLabel = useMemo(
    () => getDemographicLabel(demographicGroup),
    [demographicGroup],
  );

  const fetchProfile = useCallback(async () => {
    if (!user?.id) return;

    try {
      const [profileRes, medicalRes, scansRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', user.id)
          .single(),
        supabase
          .from('patient_medical_profiles')
          .select('date_of_birth, sex, pregnancy_status')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('scan_sessions')
          .select('id', {count: 'exact', head: true})
          .eq('user_id', user.id),
      ]);

      if (profileRes.data) {
        const nextName = profileRes.data.full_name ?? '';
        setProfile({
          fullName: nextName,
          email: profileRes.data.email ?? user.email ?? '',
        });
        setEditedName(nextName);
      }

      if (medicalRes.data) {
        const nextMedical: MedicalData = {
          dateOfBirth: medicalRes.data.date_of_birth ?? '',
          sex: medicalRes.data.sex ?? null,
          pregnancyStatus:
            medicalRes.data.pregnancy_status ?? 'not_pregnant',
        };
        setMedical(nextMedical);
        setEditedDob(nextMedical.dateOfBirth);
      } else {
        setEditedDob('');
      }

      setTotalScans(scansRes.count ?? 0);
    } catch (err) {
      console.error('ProfileScreen: fetchProfile error', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.id, user?.email]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchProfile();
  }, [fetchProfile]);

  const handleSaveName = async () => {
    if (!user?.id || !editedName.trim()) return;

    setIsSavingName(true);

    const {error} = await supabase
      .from('profiles')
      .update({
        full_name: editedName.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    setIsSavingName(false);

    if (error) {
      Alert.alert('Error', 'Could not update name. Please try again.');
      return;
    }

    setProfile(prev => ({...prev, fullName: editedName.trim()}));
    setIsEditingName(false);
  };

  const saveMedicalProfile = async (patch: Partial<MedicalData>) => {
    if (!user?.id) return;

    const nextMedical: MedicalData = {
      ...medical,
      ...patch,
    };

    if (nextMedical.sex !== 'female') {
      nextMedical.pregnancyStatus = 'not_pregnant';
    }

    setMedical(nextMedical);
    setIsSavingMedical(true);

    const {error} = await supabase.from('patient_medical_profiles').upsert(
      {
        user_id: user.id,
        date_of_birth: nextMedical.dateOfBirth || null,
        sex: nextMedical.sex,
        pregnancy_status:
          nextMedical.sex === 'female'
            ? nextMedical.pregnancyStatus
            : 'not_pregnant',
        updated_at: new Date().toISOString(),
      },
      {onConflict: 'user_id'},
    );

    setIsSavingMedical(false);

    if (error) {
      Alert.alert('Error', 'Could not save medical profile.');
      await fetchProfile();
    }
  };

  const handleSaveDateOfBirth = async () => {
    const trimmed = editedDob.trim();

    if (trimmed.length === 0) {
      await saveMedicalProfile({dateOfBirth: ''});
      return;
    }

    const isValidIsoDate = /^\d{4}-\d{2}-\d{2}$/.test(trimmed);
    if (!isValidIsoDate) {
      Alert.alert('Invalid date', 'Use YYYY-MM-DD format, for example 1998-05-14.');
      return;
    }

    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) {
      Alert.alert('Invalid date', 'Please enter a valid date.');
      return;
    }

    if (parsed > new Date()) {
      Alert.alert('Invalid date', 'Date of birth cannot be in the future.');
      return;
    }

    await saveMedicalProfile({dateOfBirth: trimmed});
  };

  const handleSexSelect = async (sex: SexType) => {
    await saveMedicalProfile({
      sex,
      pregnancyStatus: sex === 'female' ? medical.pregnancyStatus : 'not_pregnant',
    });
  };

  const handlePregnancyStatusSelect = async (
    pregnancyStatus: PregnancyStatus,
  ) => {
    await saveMedicalProfile({pregnancyStatus});
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Sign Out', style: 'destructive', onPress: logout},
    ]);
  };

  if (isLoading) {
    return (
      <Screen>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scrollable refreshing={isRefreshing} onRefresh={onRefresh}>
      <SectionHeader
        title={t('profile', 'title')}
        subtitle={t('profile', 'medicalProfile')}
      />

      <AppCard style={styles.avatarCard}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarInitial}>
            {profile.fullName ? profile.fullName[0].toUpperCase() : '?'}
          </Text>
        </View>

        {isEditingName ? (
          <View style={styles.editNameRow}>
            <TextInput
              value={editedName}
              onChangeText={setEditedName}
              style={styles.nameInput}
              autoFocus
              autoCapitalize="words"
              placeholder={t('profile', 'title')}
              placeholderTextColor={colors.textSecondary}
            />
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSaveName}
              disabled={isSavingName}>
              <Text style={styles.saveBtnText}>
                {isSavingName ? '...' : t('common', 'save')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setIsEditingName(false)}>
              <Text style={styles.cancelBtnText}>{t('common', 'cancel')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={() => setIsEditingName(true)}>
            <Text style={styles.profileName}>
              {profile.fullName || t('profile', 'title')}
            </Text>
            <Text style={styles.editHint}>{t('profile', 'title')}</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.profileEmail}>{profile.email}</Text>
      </AppCard>

      <AppCard style={styles.statsCard}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{totalScans}</Text>
          <Text style={styles.statLabel}>{t('analytics', 'totalScans')}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{ageLabel}</Text>
          <Text style={styles.statLabel}>{t('child', 'age')}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{formatSex(medical.sex, t)}</Text>
          <Text style={styles.statLabel}>{t('profile', 'sex')}</Text>
        </View>
      </AppCard>

      <AppCard style={styles.section}>
        <Text style={styles.sectionTitle}>{t('profile', 'title')}</Text>
        <SectionDivider />
        <InfoRow label={t('profile', 'title')} value={profile.fullName} />
        <InfoRow label={t('auth', 'email')} value={profile.email} />
        <InfoRow
          label={t('profile', 'dateOfBirth')}
          value={formatDate(medical.dateOfBirth || null)}
        />

        <Text style={[styles.fieldLabel, {marginTop: spacing.md}]}>
          Date of Birth
        </Text>
        <View style={styles.inlineInputRow}>
          <TextInput
            value={editedDob}
            onChangeText={setEditedDob}
            style={styles.inlineInput}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSaveDateOfBirth}
            disabled={isSavingMedical}>
            <Text style={styles.saveBtnText}>
              {isSavingMedical ? '...' : t('common', 'save')}
            </Text>
          </TouchableOpacity>
        </View>
      </AppCard>

      <AppCard style={styles.section}>
        <Text style={styles.sectionTitle}>{t('profile', 'medicalProfile')}</Text>
        <SectionDivider />

        <Text style={styles.fieldLabel}>{t('profile', 'sex')}</Text>
        <View style={styles.sexRow}>
          {(['male', 'female'] as SexType[]).map(s => (
            <TouchableOpacity
              key={s}
              style={[
                styles.sexBtn,
                medical.sex === s && styles.sexBtnActive,
              ]}
              onPress={() => handleSexSelect(s)}
              disabled={isSavingMedical}>
              <Text
                style={[
                  styles.sexBtnText,
                  medical.sex === s && styles.sexBtnTextActive,
                ]}>
                {s === 'male' ? t('profile', 'male') : t('profile', 'female')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {medical.sex === 'female' ? (
          <>
            <Text style={[styles.fieldLabel, {marginTop: spacing.md}]}>
              {t('profile', 'pregnancy')}
            </Text>
            <View style={styles.sexRow}>
              {(
                ['not_pregnant', 'pregnant', 'unknown'] as PregnancyStatus[]
              ).map(status => {
                const active = medical.pregnancyStatus === status;
                return (
                  <TouchableOpacity
                    key={status}
                    style={[styles.sexBtn, active && styles.sexBtnActive]}
                    onPress={() => handlePregnancyStatusSelect(status)}
                    disabled={isSavingMedical}>
                    <Text
                      style={[
                        styles.sexBtnText,
                        active && styles.sexBtnTextActive,
                      ]}>
                      {formatPregnancyStatus(status, t)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        ) : null}

        <InfoRow label={t('profile', 'sex')} value={formatSex(medical.sex, t)} />
        <InfoRow
          label={t('profile', 'pregnancy')}
          value={
            medical.sex === 'female'
              ? formatPregnancyStatus(medical.pregnancyStatus, t)
              : t('profile', 'unknown')
          }
        />
      </AppCard>

      <AppCard style={styles.section}>
        <Text style={styles.sectionTitle}>{t('child', 'ageGroup')}</Text>
        <SectionDivider />
        <InfoRow label={t('child', 'ageGroup')} value={demographicLabel} />
        <InfoRow
          label={t('child', 'age')}
          value={
            ageInfo
              ? `${ageInfo.years} years (${ageInfo.monthsTotal} months)`
              : 'Add date of birth'
          }
        />
        <Text style={styles.disclaimerText}>
          This derived group is used to apply age- and status-specific hemoglobin interpretation thresholds.
        </Text>
      </AppCard>

      <AppCard style={styles.section}>
        <Text style={styles.sectionTitle}>{t('result', 'disclaimer')}</Text>
        <SectionDivider />
        <Text style={styles.disclaimerText}>
          This application provides hemoglobin estimates for informational
          purposes only. Results are not a substitute for professional medical
          diagnosis. Always consult a qualified healthcare provider for clinical
          decisions.
        </Text>
      </AppCard>

      <AppCard style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings', 'language')}</Text>
        <SectionDivider />
        <View style={styles.sexRow}>
          <TouchableOpacity
            style={[styles.sexBtn, language === 'ar' && styles.sexBtnActive]}
            onPress={() => handleLanguageChange('ar')}>
            <Text style={[styles.sexBtnText, language === 'ar' && styles.sexBtnTextActive]}>
              {t('settings', 'arabic')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sexBtn, language === 'en' && styles.sexBtnActive]}
            onPress={() => handleLanguageChange('en')}>
            <Text style={[styles.sexBtnText, language === 'en' && styles.sexBtnTextActive]}>
              {t('settings', 'english')}
            </Text>
          </TouchableOpacity>
        </View>
      </AppCard>

      <PrimaryButton title={t('auth', 'logout')} onPress={handleLogout} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCard: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
    marginBottom: spacing.lg,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  avatarInitial: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '800',
  },
  profileName: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  editHint: {
    ...typography.bodySM,
    color: colors.primary,
    textAlign: 'center',
    marginTop: 2,
  },
  profileEmail: {
    ...typography.bodySM,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  editNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  nameInput: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: spacing.md,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    ...typography.bodyMD,
  },
  inlineInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  inlineInput: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    ...typography.bodyMD,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 10,
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  cancelBtnText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  statsCard: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingVertical: spacing.lg,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
    textAlign: 'center',
  },
  statLabel: {
    ...typography.bodySM,
    color: colors.textSecondary,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.border,
  },
  section: {
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs ?? 4,
  },
  infoLabel: {
    ...typography.bodySM,
    color: colors.textSecondary,
  },
  infoValue: {
    ...typography.bodyMD,
    color: colors.textPrimary,
    fontWeight: '600',
    maxWidth: '55%',
    textAlign: 'right',
  },
  fieldLabel: {
    ...typography.bodySM,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  sexRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  sexBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  sexBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  sexBtnText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },
  sexBtnTextActive: {
    color: '#fff',
  },
  disclaimerText: {
    ...typography.bodySM,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});