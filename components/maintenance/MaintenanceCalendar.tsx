import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Image, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  const [weekOffset, setWeekOffset] = useState(0);
  const [period, setPeriod] = useState<string>('this_month'); 
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // 🚀 ENGINE 1: PARSING AMAN MULTI-DATA TYPE
  const allActivities = useMemo(() => {
    const list: any[] = [];
    
    repairs.forEach(r => {
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

  // 🚀 ENGINE 2: GENERATE AVAILABLE YEARS SECARA DINAMIS
  const currentYear = today.getFullYear();
  const availableYears = Array.from(new Set(
    allActivities.map(a => new Date(a.actualDate).getFullYear())
  )).filter(y => !isNaN(y) && y < currentYear).sort((a, b) => b - a);

  const periodOptions = ['all', 'this_month', 'this_year', 'custom'];

  const getPeriodLabel = (p: string) => {
    if (p === 'all') return 'Semua Waktu';
    if (p === 'this_month') return 'Bulan Ini';
    if (p === 'this_year') return 'Tahun Ini';
    if (p === 'custom') return 'Custom Date';
    return p;
  };

  // 🚀 ENGINE 3: HORIZONTAL WEEK GENERATOR
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

  // 🚀 ENGINE 4: FILTER DATA AKURAT BERDASARKAN PILIHAN PERIODE
  const filteredActivities = useMemo(() => {
    return allActivities.filter(item => {
      if (!item.actualDate) return false;
      const d = new Date(item.actualDate);
      if (isNaN(d.getTime())) return false;

      if (period === 'day_select') return item.actualDate === selectedDateStr;
      if (period === 'all') return true;
      if (period === 'this_month') return d.getFullYear() === currentYear && d.getMonth() === today.getMonth();
      
      if (period === 'last_3_months') {
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(today.getMonth() - 3);
        return d >= threeMonthsAgo && d <= today;
      }
      
      if (period === 'this_year') return d.getFullYear() === currentYear;
      
      if (period === 'custom') {
        const s = customStart ? new Date(customStart) : new Date('1970-01-01');
        const e = customEnd ? new Date(customEnd) : new Date('2099-12-31');
        e.setHours(23, 59, 59, 999);
        return d >= s && d <= e;
      }
      
      if (/^\d{4}$/.test(period)) {
        return d.getFullYear() === parseInt(period);
      }
      
      return true;
    });
  }, [allActivities, period, customStart, customEnd, selectedDateStr, currentYear, today]);

  // 🚀 ENGINE 5: SUM TOTAL EXPENSE & BREAKDOWN KIRI
  const totalExpense = filteredActivities.reduce((sum, item) => sum + (item.totalCost || item.cost || 0), 0);
  const totalFuelExpense = filteredActivities.filter(i => i.category === 'fuel').reduce((sum, item) => sum + (item.totalCost || item.cost || 0), 0);
  const totalRepairExpense = filteredActivities.filter(i => i.category === 'repair').reduce((sum, item) => sum + (item.totalCost || item.cost || 0), 0);

  const handleDateSelect = (d: Date) => {
    setSelectedDate(d);
    setPeriod('day_select');
    if (onDayPress) {
      const dStr = d.toISOString().split('T')[0];
      onDayPress({ dateString: dStr, day: d.getDate(), month: d.getMonth() + 1, year: d.getFullYear() });
    }
  };

  return (
    <View style={styles.container}>
      
      {/* 1. QUICK FILTERS 1 BARIS RESPONSIVE */}
      <View style={styles.headerBox}>
        <Text style={styles.sectionLabel}>⏱️ PERIODE AKTIVITAS</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 20 }}>
          {periodOptions.map((p) => (
            <TouchableOpacity 
              key={p} 
              activeOpacity={0.9}
              onPress={() => setPeriod(p)} 
              style={[styles.smallPill, period === p && styles.smallPillActive]}
            >
              <Text style={[styles.smallPillTxt, period === p && styles.smallPillTxtActive]}>
                {getPeriodLabel(p)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* INPUT TANGGAL CUSTOM */}
        {period === 'custom' && (
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 15 }}>
            <View style={{ flex: 1 }}>
               <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginBottom: 5 }}>DARI TANGGAL</Text>
               <TextInput 
                 style={styles.dateInput} 
                 placeholder="YYYY-MM-DD" 
                 placeholderTextColor="rgba(255,255,255,0.2)"
                 value={customStart}
                 onChangeText={setCustomStart}
               />
            </View>
            <View style={{ flex: 1 }}>
               <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginBottom: 5 }}>SAMPAI TANGGAL</Text>
               <TextInput 
                 style={styles.dateInput} 
                 placeholder="YYYY-MM-DD" 
                 placeholderTextColor="rgba(255,255,255,0.2)"
                 value={customEnd}
                 onChangeText={setCustomEnd}
               />
            </View>
          </View>
        )}
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
            const isSelected = period === 'day_select' && dStr === selectedDateStr;
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
      <View style={[styles.summaryBox, { flexDirection: 'column' }]}>
        
        {/* Bagian Atas: Total Keseluruhan & Aktivitas */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', paddingBottom: 15, marginBottom: 15 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.summaryLabel}>Total Keseluruhan</Text>
            <Text style={styles.summaryValue}>
              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(totalExpense)}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.summaryLabel}>Aktivitas</Text>
            <Text style={[styles.summaryValue, { color: '#4ECDC4' }]}>{filteredActivities.length} Data</Text>
          </View>
        </View>

        {/* Bagian Bawah: Breakdown Bensin & Perbaikan */}
        <View style={{ flexDirection: 'column', gap: 12 }}>
          
          {/* Info Bensin */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: 'rgba(78,205,196,0.1)', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 14 }}>⛽</Text>
            </View>
            <View>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 }}>Pengeluaran Bensin</Text>
              <Text style={{ color: '#4ECDC4', fontSize: 13, fontWeight: '800', fontFamily: 'SpaceMono' }}>
                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(totalFuelExpense)}
              </Text>
            </View>
          </View>

          {/* Info Perbaikan */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: 'rgba(245,166,35,0.1)', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 14 }}>🔧</Text>
            </View>
            <View>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 }}>Pengeluaran Perbaikan</Text>
              <Text style={{ color: '#F5A623', fontSize: 13, fontWeight: '800', fontFamily: 'SpaceMono' }}>
                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(totalRepairExpense)}
              </Text>
            </View>
          </View>

        </View>
      </View>

      {/* 4. ACTIVITY LIST DENGAN PEMBUNGKUS FLEX:1 */}
      <View style={{ flex: 1, overflow: 'hidden' }}>
        <ScrollView 
          style={styles.listContainer} 
          contentContainerStyle={{ paddingBottom: 100 }} 
          showsVerticalScrollIndicator={false}
        >
          {filteredActivities.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 30, marginBottom: 10 }}>🏜️</Text>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '600' }}>Tidak ada riwayat aktivitas.</Text>
            </View>
          ) : (
            filteredActivities.map((item, index) => (
              <View key={item.id + index} style={styles.activityCard}>
                
                <View style={[styles.iconWrapper, item.category === 'repair' ? { backgroundColor: 'rgba(245,166,35,0.1)' } : { backgroundColor: 'rgba(78,205,196,0.1)' }]}>
                  {getMaintenanceIcon(item.category, item.category === 'fuel' ? (item.provider || item.notes) : item.serviceType) ? (
                    <Image 
                      source={getMaintenanceIcon(item.category, item.category === 'fuel' ? (item.provider || item.notes) : item.serviceType)} 
                      style={{ width: 22, height: 22 }} 
                      resizeMode="contain" 
                    />
                  ) : (
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
        </ScrollView>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  headerBox: { paddingHorizontal: 5, paddingBottom: 15 },
  
  sectionLabel: { color: '#4ECDC4', fontSize: 11, fontWeight: '800', marginBottom: 10, letterSpacing: 1 },
  smallPill: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  smallPillActive: { backgroundColor: 'rgba(245,166,35,0.15)', borderColor: '#F5A623' },
  smallPillTxt: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '700' },
  smallPillTxtActive: { color: '#F5A623', fontWeight: '900' },
  dateInput: { backgroundColor: 'rgba(0,0,0,0.3)', color: '#FFF', padding: 12, borderRadius: 10, fontSize: 12, fontWeight: '600', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  
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
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 30, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  activityCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A2B3C', borderRadius: 16, padding: 15, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  iconWrapper: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
});