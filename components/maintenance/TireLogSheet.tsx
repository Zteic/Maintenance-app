import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, Modal, TextInput,
  ScrollView, KeyboardAvoidingView, Platform, TouchableWithoutFeedback,
} from 'react-native';
import { TireLog } from '@/types/maintenance';
import { useLanguage } from '@/context/LanguageContext';

interface TireLogSheetProps {
  visible: boolean;
  vehicleId: string;
  vehicleType?: 'car' | 'motorcycle';
  currentOdometer: number;
  onClose: () => void;
  onSave: (log: Omit<TireLog, 'id'>) => void;
}

type TirePosition = TireLog['position'];

function parseTireAge(code: string): { years: number; months: number; isOld: boolean } | null {
  if (code.length !== 4) return null;
  const week = parseInt(code.substring(0, 2), 10);
  const yearSuffix = parseInt(code.substring(2, 4), 10);
  if (isNaN(week) || isNaN(yearSuffix) || week < 1 || week > 53) return null;
  const fullYear = yearSuffix >= 0 && yearSuffix <= 30 ? 2000 + yearSuffix : 1900 + yearSuffix;
  const prodDate = new Date(fullYear, 0, 1 + (week - 1) * 7);
  const now = new Date();
  const diffMs = now.getTime() - prodDate.getTime();
  const totalMonths = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.4));
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  const isOld = years >= 3;
  return { years, months, isOld };
}

export default function TireLogSheet({
  visible, vehicleId, vehicleType, currentOdometer, onClose, onSave,
}: TireLogSheetProps) {
  const { t, lang } = useLanguage();
  const isMoto = vehicleType === 'motorcycle';

  const motoPositions: TirePosition[] = ['front', 'rear'];
  const carPositions: TirePosition[] = ['front_left', 'front_right', 'rear_left', 'rear_right'];
  const positions = isMoto ? motoPositions : carPositions;

  const positionLabel = (p: TirePosition) => {
    const map: Record<TirePosition, string> = {
      front: t('tireFront'),
      rear: t('tireRear'),
      front_left: t('tireFrontLeft'),
      front_right: t('tireFrontRight'),
      rear_left: t('tireRearLeft'),
      rear_right: t('tireRearRight'),
    };
    return map[p];
  };

  const [position, setPosition] = useState<TirePosition>(positions[0]);
  const [brand, setBrand] = useState('');
  const [size, setSize] = useState('');
  const [productionCode, setProductionCode] = useState('');
  const [installedDate, setInstalledDate] = useState(new Date().toISOString().split('T')[0]);
  const [installedOdometer, setInstalledOdometer] = useState(currentOdometer.toString());
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (visible) {
      setPosition(positions[0]);
      setBrand('');
      setSize('');
      setProductionCode('');
      setInstalledDate(new Date().toISOString().split('T')[0]);
      setInstalledOdometer(currentOdometer.toString());
      setNotes('');
    }
  }, [visible]);

  const tireAge = parseTireAge(productionCode);

  const handleSave = () => {
    if (!brand.trim()) return;
    onSave({
      vehicleId,
      position,
      brand: brand.trim(),
      size: size.trim(),
      productionCode: productionCode.trim(),
      installedDate,
      installedOdometer: parseInt(installedOdometer, 10) || currentOdometer,
      notes: notes.trim(),
    });
    onClose();
  };

  const inputStyle = {
    backgroundColor: '#0D1B2A' as const,
    borderRadius: 12,
    padding: 14,
    color: '#FFFFFF' as const,
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)' as const,
  };

  const labelStyle = {
    color: 'rgba(255,255,255,0.5)' as const,
    fontSize: 11,
    letterSpacing: 1 as const,
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <View style={{
                backgroundColor: '#1A2B3C',
                borderTopLeftRadius: 28,
                borderTopRightRadius: 28,
                maxHeight: '92%',
                borderWidth: 1,
                borderBottomWidth: 0,
                borderColor: 'rgba(255,255,255,0.1)',
              }}>
                <View style={{ alignItems: 'center', paddingTop: 14, paddingBottom: 4 }}>
                  <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)' }} />
                </View>

                <View style={{
                  flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                  paddingHorizontal: 24, paddingVertical: 16,
                  borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
                }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '800' }}>
                    🛞 {t('addTireLog')}
                  </Text>
                  <TouchableOpacity onPress={onClose} style={{
                    width: 32, height: 32, borderRadius: 16,
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16 }}>✕</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={{ padding: 24, gap: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
                  {/* Position */}
                  <View style={{ gap: 8 }}>
                    <Text style={labelStyle}>{t('tirePosition')}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {positions.map((p) => (
                        <TouchableOpacity
                          key={p}
                          onPress={() => setPosition(p)}
                          style={{
                            paddingVertical: 10, paddingHorizontal: 16,
                            borderRadius: 10, borderWidth: 1,
                            backgroundColor: position === p ? 'rgba(245,166,35,0.15)' : '#0D1B2A',
                            borderColor: position === p ? '#F5A623' : 'rgba(255,255,255,0.08)',
                          }}
                          activeOpacity={0.8}
                        >
                          <Text style={{ color: position === p ? '#F5A623' : 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '600' }}>
                            {positionLabel(p)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Brand & Size row */}
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{ flex: 1, gap: 8 }}>
                      <Text style={labelStyle}>{t('tireBrand')}</Text>
                      <TextInput value={brand} onChangeText={setBrand} placeholder="e.g. Michelin" placeholderTextColor="rgba(255,255,255,0.3)" style={inputStyle} />
                    </View>
                    <View style={{ flex: 1, gap: 8 }}>
                      <Text style={labelStyle}>{t('tireSize')}</Text>
                      <TextInput value={size} onChangeText={setSize} placeholder="e.g. 185/65R15" placeholderTextColor="rgba(255,255,255,0.3)" style={inputStyle} />
                    </View>
                  </View>

                  {/* Production Code */}
                  <View style={{ gap: 8 }}>
                    <Text style={labelStyle}>{t('tireProductionCode')}</Text>
                    <TextInput
                      value={productionCode}
                      onChangeText={(v) => setProductionCode(v.replace(/\D/g, '').slice(0, 4))}
                      keyboardType="numeric"
                      placeholder="e.g. 2423"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      maxLength={4}
                      style={{ ...inputStyle, fontFamily: 'SpaceMono', color: '#4ECDC4' }}
                    />
                    <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>{t('tireProductionCodeHint')}</Text>
                    {tireAge && (
                      <View style={{
                        flexDirection: 'row', alignItems: 'center', gap: 8,
                        backgroundColor: tireAge.isOld ? 'rgba(255,107,107,0.1)' : 'rgba(78,205,196,0.1)',
                        borderRadius: 10, padding: 12, borderWidth: 1,
                        borderColor: tireAge.isOld ? 'rgba(255,107,107,0.3)' : 'rgba(78,205,196,0.3)',
                      }}>
                        <Text style={{ fontSize: 16 }}>{tireAge.isOld ? '⚠️' : '✅'}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: tireAge.isOld ? '#FF6B6B' : '#4ECDC4', fontSize: 13, fontWeight: '600' }}>
                            {t('tireAge')}: {tireAge.years} {t('years')} {tireAge.months} {t('months')}
                          </Text>
                          {tireAge.isOld && (
                            <Text style={{ color: '#FF6B6B', fontSize: 11, marginTop: 2 }}>{t('tireAgeWarning')}</Text>
                          )}
                        </View>
                      </View>
                    )}
                  </View>

                  {/* Date & Odometer */}
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{ flex: 1, gap: 8 }}>
                      <Text style={labelStyle}>{t('tireInstalledDate')}</Text>
                      <TextInput value={installedDate} onChangeText={setInstalledDate} placeholder="YYYY-MM-DD" placeholderTextColor="rgba(255,255,255,0.3)" style={{ ...inputStyle, fontFamily: 'SpaceMono' }} />
                    </View>
                    <View style={{ flex: 1, gap: 8 }}>
                      <Text style={labelStyle}>{t('tireInstalledOdometer')}</Text>
                      <TextInput value={installedOdometer} onChangeText={setInstalledOdometer} keyboardType="numeric" placeholder="0" placeholderTextColor="rgba(255,255,255,0.3)" style={{ ...inputStyle, fontFamily: 'SpaceMono' }} />
                    </View>
                  </View>

                  {/* Notes */}
                  <View style={{ gap: 8 }}>
                    <Text style={labelStyle}>{t('notes')}</Text>
                    <TextInput
                      value={notes} onChangeText={setNotes}
                      placeholder={t('notesPlaceholder')}
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      multiline numberOfLines={3} textAlignVertical="top"
                      style={{ ...inputStyle, minHeight: 72, lineHeight: 22 }}
                    />
                  </View>

                  {/* Save */}
                  <TouchableOpacity onPress={handleSave} activeOpacity={0.85} style={{
                    backgroundColor: '#F5A623', borderRadius: 14, padding: 18, alignItems: 'center', marginTop: 8,
                    shadowColor: '#F5A623', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
                  }}>
                    <Text style={{ color: '#0D1B2A', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 }}>
                      {t('saveTireLog')}
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
