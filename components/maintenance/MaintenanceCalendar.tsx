import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { RepairEntry } from '@/types/maintenance';

interface MaintenanceCalendarProps {
  repairs: RepairEntry[];
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function MaintenanceCalendar({ repairs }: MaintenanceCalendarProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const repairMap = new Map<string, RepairEntry[]>();
  repairs.forEach((repair) => {
    const key = `${repair.date.getFullYear()}-${repair.date.getMonth()}-${repair.date.getDate()}`;
    if (!repairMap.has(key)) repairMap.set(key, []);
    repairMap.get(key)!.push(repair);
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
  const selectedRepairs = selectedDate ? (repairMap.get(selectedDate) || []) : [];

  return (
    <View
      style={{
        marginHorizontal: 20,
        backgroundColor: '#1A2B3C',
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
      }}
    >
      {/* Month Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 20,
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(255,255,255,0.06)',
        }}
      >
        <TouchableOpacity onPress={prevMonth} style={{ padding: 8 }} activeOpacity={0.7}>
          <Text style={{ color: '#F5A623', fontSize: 18, fontWeight: '700' }}>‹</Text>
        </TouchableOpacity>
        <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>
          {MONTH_NAMES[viewMonth]} {viewYear}
        </Text>
        <TouchableOpacity onPress={nextMonth} style={{ padding: 8 }} activeOpacity={0.7}>
          <Text style={{ color: '#F5A623', fontSize: 18, fontWeight: '700' }}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Day Names */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10 }}>
        {DAY_NAMES.map((day) => (
          <View key={day} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '600' }}>{day}</Text>
          </View>
        ))}
      </View>

      {/* Calendar Grid */}
      <View style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
        {Array.from({ length: cells.length / 7 }).map((_, rowIdx) => (
          <View key={rowIdx} style={{ flexDirection: 'row', marginBottom: 4 }}>
            {cells.slice(rowIdx * 7, rowIdx * 7 + 7).map((day, colIdx) => {
              const key = day ? getKey(day) : '';
              const hasRepairs = day ? repairMap.has(key) : false;
              const isToday = day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
              const isSelected = key === selectedDate;

              return (
                <TouchableOpacity
                  key={colIdx}
                  onPress={() => day && setSelectedDate(isSelected ? null : key)}
                  disabled={!day}
                  style={{
                    flex: 1,
                    aspectRatio: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 10,
                    backgroundColor: isSelected
                      ? '#F5A623'
                      : isToday
                      ? 'rgba(245,166,35,0.15)'
                      : 'transparent',
                  }}
                  activeOpacity={0.7}
                >
                  {day && (
                    <>
                      <Text
                        style={{
                          color: isSelected ? '#0D1B2A' : isToday ? '#F5A623' : '#FFFFFF',
                          fontSize: 13,
                          fontWeight: isToday || isSelected ? '700' : '400',
                        }}
                      >
                        {day}
                      </Text>
                      {hasRepairs && (
                        <View
                          style={{
                            width: 4,
                            height: 4,
                            borderRadius: 2,
                            backgroundColor: isSelected ? '#0D1B2A' : '#4ECDC4',
                            marginTop: 2,
                          }}
                        />
                      )}
                    </>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      {/* Selected Date Repairs */}
      {selectedDate && selectedRepairs.length > 0 && (
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: 'rgba(255,255,255,0.06)',
            padding: 16,
            gap: 8,
          }}
        >
          {selectedRepairs.map((repair) => (
            <View
              key={repair.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                backgroundColor: 'rgba(13,27,42,0.5)',
                borderRadius: 10,
                padding: 12,
              }}
            >
              <Text style={{ fontSize: 20 }}>🔧</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600' }}>
                  {repair.serviceType}
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 }}>
                  {repair.workshop} · {repair.odometer.toLocaleString()} km
                </Text>
              </View>
              <Text style={{ color: '#F5A623', fontSize: 13, fontWeight: '700' }}>
                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(repair.cost)}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
