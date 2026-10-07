import React, {useEffect, useState} from 'react';
import {Alert, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

export function ProfileScreenFixed() {
  const {user, logout} = useAuth();
  const {language, setLanguage, t} = useLanguage();
  const [name, setName] = useState('');
  const [email, setEmail] = useState(user?.email ?? '');
  const [dob, setDob] = useState('');
  const [sex, setSex] = useState<'male'|'female'|null>(null);
  const [pregnancyStatus, setPregnancyStatus] = useState<'pregnant'|'not_pregnant'|'unknown'|null>(null);
  const [patientMode, setPatientMode] = useState<'adult'|'child'>('adult');
  const [childName, setChildName] = useState('');

  useEffect(() => {
    if (!user?.id) return;
    Promise.all([
      supabase.from('profiles').select('full_name,email').eq('id', user.id).maybeSingle(),
      supabase.from('patient_medical_profiles').select('date_of_birth,sex,pregnancy_status').eq('user_id', user.id).maybeSingle(),
      AsyncStorage.multiGet(['@hbmonitor_patient_mode','@hbmonitor_child_name']),
    ]).then(([profileRes, medicalRes, stored]) => {
      setName(profileRes.data?.full_name ?? '');
      setEmail(profileRes.data?.email ?? user.email ?? '');
      setDob(medicalRes.data?.date_of_birth ?? '');
      setSex(medicalRes.data?.sex ?? null);
      setPregnancyStatus(medicalRes.data?.pregnancy_status ?? null);
      const mode = stored[0][1];
      const child = stored[1][1];
      if (mode === 'adult' || mode === 'child') setPatientMode(mode);
      if (child) setChildName(child);
    }).catch(err => console.error('Profile load error', err));
  }, [user?.id, user?.email]);

  const saveMedical = async (
    nextSex: 'male'|'female'|null = sex,
    nextDob = dob,
    nextPregnancyStatus: 'pregnant'|'not_pregnant'|'unknown'|null = pregnancyStatus,
  ) => {
    if (!user?.id) return;
    const {error} = await supabase.from('patient_medical_profiles').upsert({
      user_id: user.id,
      date_of_birth: nextDob || null,
      sex: nextSex,
      pregnancy_status:
        nextSex === 'female'
          ? (nextPregnancyStatus ?? 'unknown')
          : 'not_pregnant',
      updated_at: new Date().toISOString(),
    }, {onConflict: 'user_id'});
    if (error) Alert.alert(t('common','error'), error.message);
  };

  const changeLanguage = async (next: 'ar'|'en') => {
    if (next !== language) await setLanguage(next);
  };

  return (
    <Screen scrollable>
      <SectionHeader title={t('profile','title')} subtitle={t('profile','medicalProfile')} />
      <AppCard style={styles.card}>
        <Text style={styles.title}>{name || t('profile','title')}</Text>
        <Text style={styles.muted}>{email}</Text>
      </AppCard>
      <AppCard style={styles.card}>
        <Text style={styles.section}>{t('profile','dateOfBirth')}</Text>
        <TextInput value={dob} onChangeText={setDob} onBlur={() => saveMedical(sex, dob)} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textSecondary} style={styles.input}/>
        <Text style={styles.section}>{t('profile','sex')}</Text>
        <View style={styles.row}>
          {(['male','female'] as const).map(value => (
            <TouchableOpacity key={value} onPress={() => {setSex(value); saveMedical(value, dob);}} style={[styles.option, sex === value && styles.active]}>
              <Text style={[styles.optionText, sex === value && styles.activeText]}>{t('profile', value)}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {sex === 'female' && patientMode === 'adult' ? (
          <>
            <Text style={styles.section}>{t('profile','pregnancy')}</Text>
            <View style={styles.row}>
              {(['not_pregnant','pregnant'] as const).map(value => (
                <TouchableOpacity
                  key={value}
                  onPress={() => {
                    setPregnancyStatus(value);
                    saveMedical(sex, dob, value);
                  }}
                  style={[styles.option, pregnancyStatus === value && styles.active]}>
                  <Text style={[styles.optionText, pregnancyStatus === value && styles.activeText]}>
                    {t('profile', value === 'pregnant' ? 'pregnant' : 'notPregnant')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : null}
      </AppCard>
      <AppCard style={styles.card}>
        <Text style={styles.section}>{t('child','currentPatient')}</Text>
        <View style={styles.row}>
          {(['adult','child'] as const).map(mode => (
            <TouchableOpacity key={mode} onPress={() => {setPatientMode(mode); AsyncStorage.setItem('@hbmonitor_patient_mode', mode);}} style={[styles.option, patientMode === mode && styles.active]}>
              <Text style={[styles.optionText, patientMode === mode && styles.activeText]}>{t('profile', mode)}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {patientMode === 'child' && <TextInput value={childName} onChangeText={v => {setChildName(v); AsyncStorage.setItem('@hbmonitor_child_name',v);}} placeholder={t('child','childName')} placeholderTextColor={colors.textSecondary} style={styles.input}/>} 
      </AppCard>
      <AppCard style={styles.card}>
        <Text style={styles.section}>{t('settings','language')}</Text>
        <View style={styles.row}>
          <TouchableOpacity onPress={() => changeLanguage('ar')} style={[styles.option, language === 'ar' && styles.active]}><Text style={[styles.optionText, language === 'ar' && styles.activeText]}>{t('settings','arabic')}</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => changeLanguage('en')} style={[styles.option, language === 'en' && styles.active]}><Text style={[styles.optionText, language === 'en' && styles.activeText]}>{t('settings','english')}</Text></TouchableOpacity>
        </View>
      </AppCard>
      <PrimaryButton title={t('auth','logout')} onPress={logout} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card:{marginBottom:spacing.lg,gap:spacing.md}, title:{...typography.h2,color:colors.textPrimary,textAlign:'center'}, muted:{...typography.bodySM,color:colors.textSecondary,textAlign:'center'}, section:{...typography.bodyMD,color:colors.textPrimary,fontWeight:'700'}, row:{flexDirection:'row',gap:spacing.sm}, input:{flex:1,borderWidth:1,borderColor:colors.border,borderRadius:12,paddingHorizontal:spacing.md,height:46,color:colors.textPrimary,backgroundColor:colors.surface}, option:{flex:1,borderWidth:1,borderColor:colors.border,borderRadius:12,paddingVertical:spacing.md,alignItems:'center'}, active:{backgroundColor:colors.primary,borderColor:colors.primary}, optionText:{color:colors.textSecondary,fontWeight:'700'}, activeText:{color:'#fff'}
});