import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Image } from 'react-native';

interface MaintenanceCalendarProps {
  repairs?: any[];
  fuelEntries?: any[];
  onDayPress?: (day: any) => void;
}

const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];

// --- HELPER LOGO ---
const BRAND_LOGOS: Record<string, any> = {
  pertamina: require('@/assets/images/Pertamina.png'),
  shell: require('@/assets/images/Shell.png'),
  bp: require('@/assets/images/BP.png'),
  vivo: require('@/assets/images/Vivo.png'),
};

const getMaintenanceIcon = (category: string, identifier: string = '') => {
  if (!identifier) return null;
  if (category === 'fuel') {
    const name = identifier.toLowerCase();
    if (name.includes('pertamina')) return BRAND_LOGOS.pertamina;
    if (name.includes('shell')) return BRAND_LOGOS.shell;
    if (name.includes('bp')) return BRAND_LOGOS.bp;
    if (name.includes('vivo')) return BRAND_LOGOS.vivo;
  }
  return null;
};

export default function MaintenanceCalendar({ repairs = [], fuelEntries = [], onDayPress }: MaintenanceCalendarProps) {
  const today = new Date();
  
  // States
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [filterMode, setFilterMode] = useState<'day' | 'week' | 'month'>('day');
  const [weekOffset, setWeekOffset] = useState(0);

  // 🚀 ENGINE 1: PARSING AMAN MULTI-DATA TYPE (FIX BANNER HARI INI HILANG)
  const allActivities = useMemo(() => {
    const list: any[] = [];
    
    repairs.forEach(r => {
      // Validasi paksa tipe data Date Object vs String agar tidak gagal komparasi
      const dateStr = r.date instanceof Date 
        ? r.date.toISOString().split('T')[0] 
        : (typeof r.date === 'string' ? r.date.split('T')[0] : '');
      list.push({ ...r, category: 'repair', actualDate: dateStr });
    });
    
    fuelEntries.forEach(f => {
      const dateStr = f.date instanceof Date 
        ? f.date.toISOString().split('T')[0] 
        : (typeof f.date === 'string' ? f.date.split('T')[0] : '');
      list.push({ ...f, category: 'fuel', actualDate: dateStr });
    });
    
    return list.sort((a, b) => new Date(b.actualDate).getTime() - new Date(a.actualDate).getTime());
  }, [repairs, fuelEntries]);

  // 🚀 ENGINE 2: HORIZONTAL WEEK GENERATOR
  const currentWeekDays = useMemo(() => {
    const days = [];
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + (weekOffset * 7));
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      days.push(d);
    }
    return days;
  }, [today, weekOffset]);

  const selectedDateStr = selectedDate.toISOString().split('T')[0];

  // 🚀 ENGINE 3: FILTER DATA AKURAT TANPA BUG TIMEZONE SHIFTING
  const filteredActivities = useMemo(() => {
    return allActivities.filter(item => {
      if (!item.actualDate) return false;

      if (filterMode === 'day') {
        return item.actualDate === selectedDateStr;
      } else if (filterMode === 'week') {
        const startStr = currentWeekDays[0].toISOString().split('T')[0];
        const endStr = currentWeekDays[6].toISOString().split('T')[0];
        return item.actualDate >= startStr && item.actualDate <= endStr;
      } else {
        const [y, m] = item.actualDate.split('-');
        const selMonth = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const selYear = String(selectedDate.getFullYear());
        return m === selMonth && y === selYear;
      }
    });
  }, [allActivities, selectedDateStr, filterMode, currentWeekDays, selectedDate]);

  // 🚀 ENGINE 4: SUM TOTAL EXPENSE
  const totalExpense = filteredActivities.reduce((sum, item) => sum + (item.totalCost || item.cost || 0), 0);

  const handleDateSelect = (d: Date) => {
    setSelectedDate(d);
    setFilterMode('day');
    if (onDayPress) {
      const dStr = d.toISOString().split('T')[0];
      onDayPress({ dateString: dStr, day: d.getDate(), month: d.getMonth() + 1, year: d.getFullYear() });
    }
  };

  return (
    <View style={styles.container}>
      
      {/* 1. QUICK FILTERS */}
      <View style={styles.headerBox}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <TouchableOpacity activeOpacity={0.9} onPress={() => { setFilterMode('day'); setSelectedDate(today); setWeekOffset(0); }} style={[styles.chip, filterMode === 'day' && styles.chipActive]}>
            <Text style={[styles.chipTxt, filterMode === 'day' && styles.chipTxtActive]}>Hari Ini</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.9} onPress={() => setFilterMode('week')} style={[styles.chip, filterMode === 'week' && styles.chipActive]}>
            <Text style={[styles.chipTxt, filterMode === 'week' && styles.chipTxtActive]}>Minggu Ini</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.9} onPress={() => setFilterMode('month')} style={[styles.chip, filterMode === 'month' && styles.chipActive]}>
            <Text style={[styles.chipTxt, filterMode === 'month' && styles.chipTxtActive]}>Bulan Ini</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* 2. COMPACT HORIZONTAL CALENDAR */}
      <View style={styles.calendarBox}>
        <View style={styles.monthNavigator}>
          <TouchableOpacity onPress={() => setWeekOffset(w => w - 1)} style={{ padding: 5 }}>
            <Text style={styles.navArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.monthTitle}>
            {MONTH_NAMES[currentWeekDays[0].getMonth()]} {currentWeekDays[0].getFullYear()}
          </Text>
          <TouchableOpacity onPress={() => setWeekOffset(w => w + 1)} style={{ padding: 5 }}>
            <Text style={styles.navArrow}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.weekRow}>
          {currentWeekDays.map((d, i) => {
            const dStr = d.toISOString().split('T')[0];
            const isSelected = filterMode === 'day' && dStr === selectedDateStr;
            const isToday = dStr === today.toISOString().split('T')[0];
            const hasActivity = allActivities.some(a => a.actualDate === dStr);

            return (
              <TouchableOpacity 
                key={i} 
                activeOpacity={0.9}
                onPress={() => handleDateSelect(d)}
                style={[styles.dayCard, isSelected && styles.dayCardActive, isToday && !isSelected && styles.dayCardToday]}
              >
                <Text style={[styles.dayName, isSelected && { color: '#0D1B2A' }]}>{DAY_NAMES[i]}</Text>
                <Text style={[styles.dayNumber, isSelected && { color: '#0D1B2A' }]}>{d.getDate()}</Text>
                <View style={[styles.dot, hasActivity && styles.dotActive, isSelected && hasActivity && { backgroundColor: '#0D1B2A' }]} />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* 3. MINI ANALYTICS SUMMARY */}
      <View style={styles.summaryBox}>
        <View style={{ flex: 1 }}>
          <Text style={styles.summaryLabel}>Total Pengeluaran</Text>
          <Text style={styles.summaryValue}>
            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(totalExpense)}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.summaryLabel}>Aktivitas</Text>
          <Text style={[styles.summaryValue, { color: '#4ECDC4' }]}>{filteredActivities.length} Data</Text>
        </View>
      </View>

      {/* 4. ACTIVITY LIST DENGAN LOGIKA LAYOUT YANG DIPERBAIKI */}
      <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
        {filteredActivities.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 30, marginBottom: 10 }}>🏜️</Text>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '600' }}>Tidak ada riwayat aktivitas.</Text>
          </View>
        ) : (
          filteredActivities.map((item, index) => (
            <View key={item.id + index} style={styles.activityCard}>
              
              <View style={[styles.iconWrapper, item.category === 'repair' ? { backgroundColor: 'rgba(245,166,35,0.1)' } : { backgroundColor: 'rgba(78,205,196,0.1)' }]}>
                {/* Logika pemanggilan Ikon PNG */}
                {getMaintenanceIcon(item.category, item.category === 'fuel' ? (item.provider || item.notes) : item.serviceType) ? (
                  <Image 
                    source={getMaintenanceIcon(item.category, item.category === 'fuel' ? (item.provider || item.notes) : item.serviceType)} 
                    style={{ width: 22, height: 22 }} 
                    resizeMode="contain" 
                  />
                ) : (
                  /* Fallback jika tidak ada ikon yang cocok */
                  <Text style={{ fontSize: 18 }}>
                    {item.category === 'fuel' ? '⛽' : '🔧'}
                  </Text>
                )}
              </View>

              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }} numberOfLines={1}>
                  {item.category === 'fuel' ? `${item.liters}L ${item.fuelType}` : item.serviceType}
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginTop: 2 }}>
                  {item.category === 'fuel' ? `Rp ${(item.pricePerLiter || 0).toLocaleString('id-ID')}/L` : item.workshop}
                </Text>
              </View>

              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: item.category === 'fuel' ? '#4ECDC4' : '#F5A623', fontSize: 13, fontWeight: '800' }}>
                  {new Intl.NumberFormat('id-ID', { 
                    style: 'currency', 
                    currency: 'IDR', 
                    maximumFractionDigits: 0 
                  }).format(item.totalCost || item.cost || 0)}
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.2)', fontSize: 9 }}>
                  {item.odometer?.toLocaleString('id-ID')} km
                </Text>
              </View>

            </View>
          ))
        )}
        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  headerBox: { paddingHorizontal: 5, paddingBottom: 15 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  chipActive: { backgroundColor: 'rgba(78,205,196,0.15)', borderColor: '#4ECDC4' },
  chipTxt: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '700' },
  chipTxtActive: { color: '#4ECDC4', fontWeight: '900' },
  calendarBox: { backgroundColor: '#1A2B3C', borderRadius: 20, padding: 15, marginBottom: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  monthNavigator: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  navArrow: { color: '#F5A623', fontSize: 22, fontWeight: '600', lineHeight: 22 },
  monthTitle: { color: '#FFF', fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCard: { alignItems: 'center', paddingVertical: 10, width: '13%', borderRadius: 14, backgroundColor: 'transparent' },
  dayCardToday: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  dayCardActive: { backgroundColor: '#F5A623', shadowColor: '#F5A623', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8 },
  dayName: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '700', marginBottom: 4 },
  dayNumber: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  dot: { width: 4, height: 4, borderRadius: 2, marginTop: 6, backgroundColor: 'transparent' },
  dotActive: { backgroundColor: '#4ECDC4' },
  summaryBox: { flexDirection: 'row', backgroundColor: 'rgba(245,166,35,0.05)', borderRadius: 16, padding: 15, marginBottom: 15, borderWidth: 1, borderColor: 'rgba(245,166,35,0.2)' },
  summaryLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  summaryValue: { color: '#F5A623', fontSize: 18, fontWeight: '900', fontFamily: 'SpaceMono' },
  listContainer: { flex: 1, minHeight: 200 },
  emptyState: { alignItems: 'center', justifyContext: 'center', paddingVertical: 30, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  activityCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A2B3C', borderRadius: 16, padding: 15, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  iconWrapper: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
});