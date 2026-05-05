import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { RepairEntry, FuelEntry } from '@/types/maintenance';

interface MaintenanceCalendarProps {
  repairs: RepairEntry[];
  fuelEntries: FuelEntry[];
  onDayPress?: (day: { dateString: string }) => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function MaintenanceCalendar({ repairs, fuelEntries = [], onDayPress }: MaintenanceCalendarProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // 1. GABUNGKAN DATA KE DALAM MAP UNTUK TAMPILAN BAWAH
  const combinedMap = new Map<string, any[]>();

  // Masukkan Perbaikan
  repairs.forEach((repair) => {
    const d = new Date(repair.date);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!combinedMap.has(key)) combinedMap.set(key, []);
    combinedMap.get(key)!.push({ ...repair, category: 'repair' });
  });

  // Masukkan Bensin
  fuelEntries.forEach((fuel) => {
    const d = new Date(fuel.date);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!combinedMap.has(key)) combinedMap.set(key, []);
    combinedMap.get(key)!.push({ ...fuel, category: 'fuel' });
  });

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  const getKey = (day: number) => `${viewYear}-${viewMonth}-${day}`;
  
  // Ambil data gabungan berdasarkan tanggal yang dipilih
  const selectedRecords = selectedDate ? (combinedMap.get(selectedDate) || []) : [];

  return (
    <View style={{ marginHorizontal: 20, backgroundColor: '#1A2B3C', borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }}>
      
      {/* Month Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' }}>
        <TouchableOpacity onPress={prevMonth}><Text style={{ color: '#F5A623', fontSize: 18, fontWeight: '700' }}>‹</Text></TouchableOpacity>
        <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
        <TouchableOpacity onPress={nextMonth}><Text style={{ color: '#F5A623', fontSize: 18, fontWeight: '700' }}>›</Text></TouchableOpacity>
      </View>

      {/* Day Names */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10 }}>
        {DAY_NAMES.map((day) => (
          <View key={day} style={{ flex: 1, alignItems: 'center' }}><Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>{day}</Text></View>
        ))}
      </View>

      {/* Calendar Grid */}
      <View style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
        {Array.from({ length: cells.length / 7 }).map((_, rowIdx) => (
          <View key={rowIdx} style={{ flexDirection: 'row', marginBottom: 4 }}>
            {cells.slice(rowIdx * 7, rowIdx * 7 + 7).map((day, colIdx) => {
              const key = day ? getKey(day) : '';
              const hasActivity = day ? combinedMap.has(key) : false;
              const isToday = day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
              const isSelected = key === selectedDate;

              return (
                <TouchableOpacity
                  key={colIdx}
                  onPress={() => {
                    if (day) {
                      const newKey = getKey(day);
                      setSelectedDate(isSelected ? null : newKey);
                      // Kirim data ke parent (index.tsx) jika fungsi tersedia
                      onDayPress?.({ dateString: `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` });
                    }
                  }}
                  disabled={!day}
                  style={{
                    flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 10,
                    backgroundColor: isSelected ? '#F5A623' : isToday ? 'rgba(245,166,35,0.15)' : 'transparent',
                  }}
                >
                  {day && (
                    <>
                      <Text style={{ color: isSelected ? '#0D1B2A' : isToday ? '#F5A623' : '#FFFFFF', fontSize: 13 }}>{day}</Text>
                      {hasActivity && (
                        <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: isSelected ? '#0D1B2A' : '#4ECDC4', marginTop: 2 }} />
                      )}
                    </>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
        </View>

      {selectedDate && selectedRecords.length > 0 && (
        <View 
          style={{ 
            borderTopWidth: 1, 
            borderTopColor: 'rgba(255,255,255,0.06)', 
            paddingTop: 10,
            height: 280, // Memberikan tinggi tetap agar area ScrollView jelas
          }}
        >
          {/* Header kecil untuk informasi tanggal yang dipilih */}
          <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
            <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '700' }}>
              LOGS TANGGAL: {selectedDate}
            </Text>
          </View>

          <ScrollView 
            nestedScrollEnabled={true} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20, gap: 8 }}
          >
            {selectedRecords.map((item, index) => (
              <View 
                key={index} 
                style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  gap: 12, 
                  backgroundColor: 'rgba(13,27,42,0.5)', 
                  borderRadius: 12, 
                  padding: 12,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.02)'
                }}
              >
                <View style={{ 
                  width: 36, 
                  height: 36, 
                  borderRadius: 10, 
                  backgroundColor: item.category === 'fuel' ? 'rgba(78,205,196,0.1)' : 'rgba(245,166,35,0.1)',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}>
                  <Text style={{ fontSize: 18 }}>
                    {item.category === 'fuel' ? '⛽' : '🔧'}
                  </Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }} numberOfLines={1}>
                    {item.category === 'fuel' ? `${item.liters}L ${item.fuelType}` : item.serviceType}
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginTop: 2 }}>
                    {item.category === 'fuel' ? `Rp ${item.pricePerLiter.toLocaleString()}/L` : item.workshop}
                  </Text>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: item.category === 'fuel' ? '#4ECDC4' : '#F5A623', fontSize: 13, fontWeight: '800' }}>
                    {new Intl.NumberFormat('id-ID', { 
                      style: 'currency', 
                      currency: 'IDR', 
                      maximumFractionDigits: 0 
                    }).format(item.totalCost || item.cost)}
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.2)', fontSize: 9 }}>
                    {item.odometer?.toLocaleString()} km
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}