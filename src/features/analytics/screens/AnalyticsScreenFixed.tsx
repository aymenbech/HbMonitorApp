import React, {useCallback, useEffect, useState} from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';

import {Screen} from '../../../components/Screen';
import {SectionHeader} from '../../../components/ui/SectionHeader';
import {AppCard} from '../../../components/ui/AppCard';
import {MetricCard} from '../../../components/ui/MetricCard';
import {useAuth} from '../../../app/AuthContext';
import {useLanguage} from '../../../app/LanguageContext';
import {loadLocalScanHistory, type LocalScanRecord} from '../../scan/services/localScanHistory';
import {colors} from '../../../theme/colors';
import {spacing} from '../../../theme/spacing';

type Data = {
  total: number;
  average: number | null;
  highest: number | null;
  lowest: number | null;
};

export function AnalyticsScreenFixed() {
  const {user} = useAuth();
  const {t} = useLanguage();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Data>({
    total: 0,
    average: null,
    highest: null,
    lowest: null,
  });

  const load = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const history: LocalScanRecord[] = await loadLocalScanHistory(user.id);
      const values = history.map(item => Number(item.hbValue)).filter(Number.isFinite);
      const sum = values.reduce((total, value) => total + value, 0);

      setData({
        total: history.length,
        average: values.length ? sum / values.length : null,
        highest: values.length ? Math.max(...values) : null,
        lowest: values.length ? Math.min(...values) : null,
      });
    } catch (error) {
      console.error('Analytics load error:', error);
      setData({total: 0, average: null, highest: null, lowest: null});
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </Screen>
    );
  }

  const fmt = (value: number | null) =>
    value === null ? '—' : value.toFixed(1);

  return (
    <Screen scrollable>
      <SectionHeader title={t('analytics', 'title')} subtitle={t('analytics', 'history')} />

      <View style={styles.row}>
        <MetricCard
          label={t('analytics', 'totalScans')}
          value={String(data.total)}
          helper={t('analytics', 'history')}
          accentColor={colors.primary}
        />
        <MetricCard
          label={t('analytics', 'average')}
          value={fmt(data.average)}
          helper={t('result', 'unit')}
          accentColor="#22C55E"
        />
      </View>

      <AppCard style={styles.card}>
        <Text style={styles.title}>{t('analytics', 'history')}</Text>
        <Text style={styles.line}>
          {t('analytics', 'average')}: {fmt(data.average)} {t('result', 'unit')}
        </Text>
        <Text style={styles.line}>
          {t('result', 'status')}: {fmt(data.lowest)} — {fmt(data.highest)} {t('result', 'unit')}
        </Text>
      </AppCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  row: {flexDirection: 'row', gap: spacing.md},
  card: {marginTop: spacing.lg, gap: spacing.md},
  title: {fontSize: 18, fontWeight: '800', color: colors.textPrimary},
  line: {fontSize: 15, color: colors.textSecondary},
});
