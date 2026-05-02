import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, Alert, Modal, Dimensions } from 'react-native';
import { RepairEntry } from '@/types/maintenance';
import { useLanguage } from '@/context/LanguageContext';

const MONTH_NAMES_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const MONTH_NAMES_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface RepairHistoryProps {
  repairs: RepairEntry[];
  onEdit?: (entry: RepairEntry) => void;
  onDelete?: (id: string) => void;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function extractReceipts(notes: string): { cleanNotes: string; receipts: string[] } {
  const match = notes.match(/\[receipts:(.*?)\]/);
  if (match) {
    return {
      cleanNotes: notes.replace(/\n?\[receipts:.*?\]/, '').trim(),
      receipts: match[1].split(',').filter(Boolean),
    };
  }
  return { cleanNotes: notes, receipts: [] };
}

export default function RepairHistory({ repairs, onEdit, onDelete }: RepairHistoryProps) {
  const { t, lang } = useLanguage();
  const isId = lang === 'id';
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedCalDate, setSelectedCalDate] = useState<string | null>(null);
  const [fullPhoto, setFullPhoto] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    Alert.alert(t('confirmDelete'), t('confirmDeleteMsg'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('delete'), style: 'destructive', onPress: () => onDelete?.(id) },
    ]);
  };

  const sorted = [...repairs].sort((a, b) => b.date.getTime() - a.date.getTime());

  // Calendar
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthNames = isId ? MONTH_NAMES_ID : MONTH_NAMES_EN;
  const repairDatesInMonth = new Set(repairs.filter(r => r.date.getMonth() === month && r.date.getFullYear() === year).map(r => r.date.getDate()));

  const selectedDateRepairs = selectedCalDate ? repairs.filter(r => {
    const [y, m, d] = selectedCalDate.split('-').map(Number);
    return r.date.getFullYear() === y && r.date.getMonth() === m - 1 && r.date.getDate() === d;
  }) : [];

  return (
    <View style={{ gap: 10 }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 }}>
        <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '700' }}>{t('repairHistory')}</Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <TouchableOpacity onPress={() => setViewMode('list')} style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: viewMode === 'list' ? 'rgba(245,166,35,0.2)' : 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: viewMode === 'list' ? '#F5A623' : 'rgba(255,255,255,0.08)' }}>
            <Text style={{ color: viewMode === 'list' ? '#F5A623' : 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '600' }}>≡ {isId ? 'Daftar' : 'List'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setViewMode('calendar')} style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: viewMode === 'calendar' ? 'rgba(245,166,35,0.2)' : 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: viewMode === 'calendar' ? '#F5A623' : 'rgba(255,255,255,0.08)' }}>
            <Text style={{ color: viewMode === 'calendar' ? '#F5A623' : 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '600' }}>📅 {isId ? 'Kalender' : 'Calendar'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <View style={{ paddingHorizontal: 20, gap: 12 }}>
          <View style={{ backgroundColor: '#1A2B3C', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <TouchableOpacity onPress={() => setCalendarDate(new Date(year, month - 1, 1))} style={{ padding: 8 }}>
                <Text style={{ color: '#F5A623', fontSize: 20 }}>‹</Text>
              </TouchableOpacity>
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>{monthNames[month]} {year}</Text>
              <TouchableOpacity onPress={() => setCalendarDate(new Date(year, month + 1, 1))} style={{ padding: 8 }}>
                <Text style={{ color: '#F5A623', fontSize: 20 }}>›</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row' }}>
              {(isId ? ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']).map(d => (
                <View key={d} style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '600' }}>{d}</Text>
                </View>
              ))}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {Array.from({ length: firstDay }).map((_, i) => <View key={`e-${i}`} style={{ width: `${100 / 7}%`, height: 40 }} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const hasRepair = repairDatesInMonth.has(day);
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isSelected = selectedCalDate === dateStr;
                const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;
                return (
                  <TouchableOpacity key={day} onPress={() => setSelectedCalDate(isSelected ? null : dateStr)} style={{ width: `${100 / 7}%`, height: 40, alignItems: 'center', justifyContent: 'center' }} activeOpacity={0.7}>
                    <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: isSelected ? '#F5A623' : 'transparent', borderWidth: isToday ? 1.5 : 0, borderColor: '#4ECDC4', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: isSelected ? '#0D1B2A' : isToday ? '#4ECDC4' : hasRepair ? '#F5A623' : 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: hasRepair || isToday ? '700' : '400' }}>{day}</Text>
                    </View>
                    {hasRepair && !isSelected && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#F5A623', marginTop: 1 }} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          {selectedCalDate && (
            <View style={{ gap: 8 }}>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, letterSpacing: 1 }}>{isId ? 'SERVIS PADA' : 'SERVICES ON'} {selectedCalDate}</Text>
              {selectedDateRepairs.length === 0 ? (
                <View style={{ backgroundColor: '#1A2B3C', borderRadius: 12, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }}>
                  <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>{isId ? 'Tidak ada servis pada tanggal ini' : 'No services on this date'}</Text>
                </View>
              ) : selectedDateRepairs.map(r => {
                const { cleanNotes, receipts } = extractReceipts(r.notes || '');
                return (
                  <View key={r.id} style={{ backgroundColor: '#1A2B3C', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(245,166,35,0.2)', gap: 8 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>{r.serviceType}</Text>
                      <Text style={{ color: '#F5A623', fontSize: 13, fontWeight: '700' }}>{formatCurrency(r.cost)}</Text>
                    </View>
                    <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{r.workshop} · {r.odometer.toLocaleString()} km</Text>
                    {cleanNotes ? <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>{cleanNotes}</Text> : null}
                    {receipts.length > 0 && (
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        {receipts.map((uri, idx) => (
                          <TouchableOpacity key={idx} onPress={() => setFullPhoto(uri)} activeOpacity={0.85}>
                            <Image source={{ uri }} style={{ width: 60, height: 60, borderRadius: 8 }} resizeMode="cover" />
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <>
          {sorted.length === 0 && (
            <View style={{ alignItems: 'center', paddingVertical: 40, gap: 8 }}>
              <Text style={{ fontSize: 32 }}>🔧</Text>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>{t('noRepairs')}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>{t('tapPlusToAdd')}</Text>
            </View>
          )}
          <View style={{ gap: 8, paddingHorizontal: 20 }}>
            {sorted.map((repair) => {
              const isExpanded = expandedId === repair.id;
              const dateStr = repair.date.toLocaleDateString(isId ? 'id-ID' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' });
              const { cleanNotes, receipts } = extractReceipts(repair.notes || '');
              return (
                <TouchableOpacity key={repair.id} onPress={() => setExpandedId(isExpanded ? null : repair.id)} activeOpacity={0.85} style={{ backgroundColor: '#1A2B3C', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 }}>
                    <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(245,166,35,0.1)', borderWidth: 1, borderColor: 'rgba(245,166,35,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 18 }}>{repair.tireInfo ? '🛞' : '🔧'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>{repair.serviceType}</Text>
                      <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 }}>{dateStr} · {repair.odometer.toLocaleString()} {t('km')}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Text style={{ color: '#F5A623', fontSize: 14, fontWeight: '700' }}>{formatCurrency(repair.cost)}</Text>
                      <View style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 4, paddingVertical: 2, paddingHorizontal: 6 }}>
                        <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>{isExpanded ? '▲' : '▼'}</Text>
                      </View>
                    </View>
                  </View>

                  {isExpanded && (
                    <View style={{ borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', padding: 16, gap: 12 }}>
                      <View style={{ flexDirection: 'row', gap: 12 }}>
                        <View style={{ flex: 1, backgroundColor: 'rgba(13,27,42,0.6)', borderRadius: 10, padding: 12, gap: 4 }}>
                          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, letterSpacing: 1 }}>{t('workshop').toUpperCase()}</Text>
                          <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '500' }}>{repair.workshop}</Text>
                        </View>
                        {repair.nextIntervalKm && (
                          <View style={{ flex: 1, backgroundColor: 'rgba(13,27,42,0.6)', borderRadius: 10, padding: 12, gap: 4 }}>
                            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, letterSpacing: 1 }}>NEXT INTERVAL</Text>
                            <Text style={{ color: '#4ECDC4', fontSize: 13, fontWeight: '600', fontFamily: 'SpaceMono' }}>+{repair.nextIntervalKm.toLocaleString()} {t('km')}</Text>
                          </View>
                        )}
                      </View>

                      {repair.tireInfo && (
                        <View style={{ backgroundColor: 'rgba(78,205,196,0.05)', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: 'rgba(78,205,196,0.15)', gap: 6 }}>
                          <Text style={{ color: '#4ECDC4', fontSize: 11, fontWeight: '700', letterSpacing: 1 }}>🛞 {isId ? 'INFO BAN' : 'TIRE INFO'}</Text>
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                            <Text style={{ color: '#FFFFFF', fontSize: 12 }}>{repair.tireInfo.position === 'front' ? (isId ? 'Depan' : 'Front') : (isId ? 'Belakang' : 'Rear')}</Text>
                            {repair.tireInfo.brand ? <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>· {repair.tireInfo.brand}</Text> : null}
                            {repair.tireInfo.size ? <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{repair.tireInfo.size}</Text> : null}
                            {repair.tireInfo.productionCode ? <Text style={{ color: '#4ECDC4', fontSize: 12, fontFamily: 'SpaceMono' }}>DOT {repair.tireInfo.productionCode}</Text> : null}
                          </View>
                        </View>
                      )}

                      {cleanNotes ? (
                        <View style={{ backgroundColor: 'rgba(13,27,42,0.6)', borderRadius: 10, padding: 12, gap: 4 }}>
                          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, letterSpacing: 1 }}>{t('notes')}</Text>
                          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 20 }}>{cleanNotes}</Text>
                        </View>
                      ) : null}

                      {receipts.length > 0 && (
                        <View style={{ backgroundColor: 'rgba(13,27,42,0.6)', borderRadius: 10, padding: 12, gap: 8 }}>
                          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, letterSpacing: 1 }}>{t('uploadReceipt').toUpperCase()}</Text>
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                            {receipts.map((uri, idx) => (
                              <TouchableOpacity key={idx} onPress={() => setFullPhoto(uri)} activeOpacity={0.85}>
                                <Image source={{ uri }} style={{ width: 80, height: 80, borderRadius: 8 }} resizeMode="cover" />
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                      )}

                      {(onEdit || onDelete) && (
                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                          {onEdit && (
                            <TouchableOpacity onPress={() => { setExpandedId(null); onEdit(repair); }} activeOpacity={0.8}
                              style={{ flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: 'rgba(245,166,35,0.15)', borderWidth: 1, borderColor: 'rgba(245,166,35,0.3)', alignItems: 'center' }}>
                              <Text style={{ color: '#F5A623', fontSize: 13, fontWeight: '600' }}>✏️ {t('editRepair')}</Text>
                            </TouchableOpacity>
                          )}
                          {onDelete && (
                            <TouchableOpacity onPress={() => handleDelete(repair.id)} activeOpacity={0.8}
                              style={{ flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: 'rgba(255,107,107,0.15)', borderWidth: 1, borderColor: 'rgba(255,107,107,0.3)', alignItems: 'center' }}>
                              <Text style={{ color: '#FF6B6B', fontSize: 13, fontWeight: '600' }}>🗑️ {t('deleteRepair')}</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}

      {/* Full Photo Modal */}
      <Modal visible={!!fullPhoto} transparent animationType="fade" onRequestClose={() => setFullPhoto(null)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' }} onPress={() => setFullPhoto(null)} activeOpacity={1}>
          {fullPhoto && <Image source={{ uri: fullPhoto }} style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.8 }} resizeMode="contain" />}
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 16 }}>{isId ? 'Ketuk untuk menutup' : 'Tap to close'}</Text>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
