import React, {useCallback, useEffect, useState} from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import {Screen} from '../../../components/Screen';
import {SectionHeader} from '../../../components/ui/SectionHeader';
import {AppCard} from '../../../components/ui/AppCard';
import {MetricCard} from '../../../components/ui/MetricCard';
import {useAuth} from '../../../app/AuthContext';
import {useLanguage} from '../../../app/LanguageContext';
import {supabase} from '../../../lib/supabase';
import {colors} from '../../../theme/colors';
import {spacing} from '../../../theme/spacing';

type Data = {total:number; average:number|null; highest:number|null; lowest:number|null};

export function AnalyticsScreenFixed() {
  const {user} = useAuth();
  const {t} = useLanguage();
  const [loading,setLoading] = useState(true);
  const [data,setData] = useState<Data>({total:0,average:null,highest:null,lowest:null});
  const load = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }
    try {
      const [countRes, resultsRes] = await Promise.all([
        supabase.from('scan_sessions').select('id',{count:'exact',head:true}).eq('user_id',user.id),
        supabase.from('hemoglobin_results').select('hb_value').eq('user_id',user.id).order('result_at',{ascending:false}),
      ]);
      const values=(resultsRes.data??[]).map(r=>Number(r.hb_value)).filter(Number.isFinite);
      setData({total:countRes.count??0,average:values.length?values.reduce((a,b)=>a+b,0)/values.length:null,highest:values.length?Math.max(...values):null,lowest:values.length?Math.min(...values):null});
    } catch (e) { console.error('Analytics load error',e); }
    finally { setLoading(false); }
  },[user?.id]);
  useEffect(()=>{load();},[load]);
  if (loading) return <Screen><View style={styles.center}><ActivityIndicator size="large" color={colors.primary}/></View></Screen>;
  const fmt=(v:number|null)=>v===null?'—':v.toFixed(1);
  return (
    <Screen scrollable>
      <SectionHeader title={t('analytics','title')} subtitle={t('analytics','history')} />
      <View style={styles.row}>
        <MetricCard label={t('analytics','totalScans')} value={String(data.total)} helper={t('analytics','history')} accentColor={colors.primary}/>
        <MetricCard label={t('analytics','average')} value={fmt(data.average)} helper={t('result','unit')} accentColor="#22C55E"/>
      </View>
      <AppCard style={styles.card}>
        <Text style={styles.title}>{t('analytics','history')}</Text>
        <Text style={styles.line}>{t('analytics','average')}: {fmt(data.average)} {t('result','unit')}</Text>
        <Text style={styles.line}>{t('result','status')}: {fmt(data.lowest)} — {fmt(data.highest)} {t('result','unit')}</Text>
      </AppCard>
    </Screen>
  );
}
const styles=StyleSheet.create({center:{flex:1,alignItems:'center',justifyContent:'center'},row:{flexDirection:'row',gap:spacing.md},card:{marginTop:spacing.lg,gap:spacing.md},title:{fontSize:18,fontWeight:'800',color:colors.textPrimary},line:{fontSize:15,color:colors.textSecondary}});
