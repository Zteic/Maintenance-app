import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, Modal, TextInput,
  ScrollView, KeyboardAvoidingView, Platform, TouchableWithoutFeedback,
} from 'react-native';
import { FuelEntry } from '@/types/maintenance';
import { useLanguage } from '@/context/LanguageContext';

interface FuelSheetProps {
  visible: boolean;
  vehicleId: string;
  currentOdometer: number;
  onClose: () => void;
  onSave: (entry: Omit<FuelEntry, 'id'>) => void;
}

export default function FuelSheet({ visible, vehicleId, currentOdometer, onClose, onSave }: FuelSheetProps) {
  const { lang } = useLanguage();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [liters, setLiters] = useState('');
  const [pricePerLiter, setPricePerLiter] = useState('');
  const [odometer, setOdometer] = useState(currentOdometer.toString());
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (visible) {
      setDate(new Date().toISOString().split('T')[0]);
      setLiters('');
      setPricePerLiter('');
      setOdometer(currentOdometer.toString());
      setNotes('');
    }
  }, [visible]);

  const totalCost = (parseFloat(liters) || 0) * (parseFloat(pricePerLiter) || 0);

  const handleSave = () => {
    const l = parseFloat(liters) || 0;
    const p = parseFloat(pricePerLiter.replace(/\D/g, '')) || 0;
    if (!l || !odometer) return;
    onSave({
      vehicleId,
      date,
      liters: l,
      pricePerLiter: p,
      totalCost: l * p,
      odometer: parseInt(odometer, 10) || currentOdometer,
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

  const label = lang === 'id' ? {
    title: 'Catat Pengisian BBM',
    date: 'TANGGAL',
    liters: 'JUMLAH LITER',
    price: 'HARGA / LITER (IDR)',
    odometer: 'ODOMETER (KM)',
    notes: 'CATATAN',
    notesPlaceholder: 'Catatan opsional...',
    total: 'TOTAL BIAYA',
    save: 'SIMPAN CATATAN BBM',
  } : {
    title: 'Log Fuel Fill-up',
    date: 'DATE',
    liters: 'LITERS',
    price: 'PRICE / LITER (IDR)',
    odometer: 'ODOMETER (KM)',
    notes: 'NOTES',
    notesPlaceholder: 'Optional notes...',
    total: 'TOTAL COST',
    save: 'SAVE FUEL LOG',
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <View style={{
                backgroundColor: '#1A2B3C',
                borderTopLeftRadius: 28, borderTopRightRadius: 28,
                maxHeight: '90%',
                borderWidth: 1, borderBottomWidth: 0, borderColor: 'rgba(255,255,255,0.1)',
              }}>
                <View style={{ alignItems: 'center', paddingTop: 14, paddingBottom: 4 }}>
                  <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)' }} />
                </View>
                <View style={{
                  flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                  paddingHorizontal: 24, paddingVertical: 16,
                  borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
                }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '800' }}>⛽ {label.title}</Text>
                  <TouchableOpacity onPress={onClose} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16 }}>✕</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={{ padding: 24, gap: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
                  {/* Date & Odometer */}
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{ flex: 1, gap: 8 }}>
                      <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, letterSpacing: 1 }}>{label.date}</Text>
                      <TextInput value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" placeholderTextColor="rgba(255,255,255,0.3)" style={{ ...inputStyle, fontFamily: 'SpaceMono' }} />
                    </View>
                    <View style={{ flex: 1, gap: 8 }}>
                      <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, letterSpacing: 1 }}>{label.odometer}</Text>
                      <TextInput value={odometer} onChangeText={setOdometer} keyboardType="numeric" placeholder="0" placeholderTextColor="rgba(255,255,255,0.3)" style={{ ...inputStyle, fontFamily: 'SpaceMono' }} />
                    </View>
                  </View>

                  {/* Liters & Price */}
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{ flex: 1, gap: 8 }}>
                      <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, letterSpacing: 1 }}>{label.liters}</Text>
                      <TextInput value={liters} onChangeText={setLiters} keyboardType="decimal-pad" placeholder="0.0" placeholderTextColor="rgba(255,255,255,0.3)" style={{ ...inputStyle, color: '#4ECDC4', fontFamily: 'SpaceMono' }} />
                    </View>
                    <View style={{ flex: 1, gap: 8 }}>
                      <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, letterSpacing: 1 }}>{label.price}</Text>
                      <TextInput value={pricePerLiter} onChangeText={setPricePerLiter} keyboardType="numeric" placeholder="0" placeholderTextColor="rgba(255,255,255,0.3)" style={{ ...inputStyle, color: '#F5A623', fontFamily: 'SpaceMono' }} />
                    </View>
                  </View>

                  {/* Total Cost Preview */}
                  {totalCost > 0 && (
                    <View style={{ backgroundColor: 'rgba(245,166,35,0.08)', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'rgba(245,166,35,0.2)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, letterSpacing: 1 }}>{label.total}</Text>
                      <Text style={{ color: '#F5A623', fontSize: 18, fontWeight: '800', fontFamily: 'SpaceMono' }}>
                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(totalCost)}
                      </Text>
                    </View>
                  )}

                  {/* Notes */}
                  <View style={{ gap: 8 }}>
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, letterSpacing: 1 }}>{label.notes}</Text>
                    <TextInput value={notes} onChangeText={setNotes} placeholder={label.notesPlaceholder} placeholderTextColor="rgba(255,255,255,0.3)" multiline numberOfLines={2} textAlignVertical="top" style={{ ...inputStyle, minHeight: 64, lineHeight: 22 }} />
                  </View>

                  {/* Save */}
                  <TouchableOpacity onPress={handleSave} activeOpacity={0.85} style={{ backgroundColor: '#4ECDC4', borderRadius: 14, padding: 18, alignItems: 'center', marginTop: 8, shadowColor: '#4ECDC4', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } }}>
                    <Text style={{ color: '#0D1B2A', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 }}>{label.save}</Text>
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
