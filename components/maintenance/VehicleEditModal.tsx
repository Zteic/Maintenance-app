import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
} from 'react-native';
import { Vehicle } from '@/types/maintenance';
import { useLanguage } from '@/context/LanguageContext';

const ACCENT_COLORS = ['#F5A623', '#4ECDC4', '#FF6B6B', '#6C63FF', '#2ECC71', '#3498DB', '#E91E63'];

interface VehicleEditModalProps {
  visible: boolean;
  vehicle?: Vehicle | null; // null = add new
  onClose: () => void;
  onSave: (vehicle: Omit<Vehicle, 'id' | 'currentOdometer' | 'lastOdometerUpdate'> & { currentOdometer?: number }) => void;
}

export default function VehicleEditModal({ visible, vehicle, onClose, onSave }: VehicleEditModalProps) {
  const { t } = useLanguage();
  const isEdit = !!vehicle;

  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [initialOdo, setInitialOdo] = useState('0');
  const [color, setColor] = useState('#F5A623');

  useEffect(() => {
    if (vehicle) {
      setName(vehicle.name);
      setBrand(vehicle.brand);
      setModel(vehicle.model);
      setYear(vehicle.year.toString());
      setPlateNumber(vehicle.plateNumber);
      setPhotoUrl(vehicle.photoUrl);
      setColor(vehicle.color);
    } else {
      setName('');
      setBrand('');
      setModel('');
      setYear('');
      setPlateNumber('');
      setPhotoUrl('');
      setInitialOdo('0');
      setColor('#F5A623');
    }
  }, [vehicle, visible]);

  const handleSave = () => {
    if (!name.trim() || !brand.trim() || !model.trim() || !year.trim() || !plateNumber.trim()) return;
    onSave({
      name: name.trim(),
      brand: brand.trim(),
      model: model.trim(),
      year: parseInt(year, 10) || new Date().getFullYear(),
      plateNumber: plateNumber.trim().toUpperCase(),
      photoUrl: photoUrl.trim() || 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&q=80',
      color,
      currentOdometer: isEdit ? undefined : (parseInt(initialOdo, 10) || 0),
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
              <View
                style={{
                  backgroundColor: '#1A2B3C',
                  borderTopLeftRadius: 28,
                  borderTopRightRadius: 28,
                  maxHeight: '92%',
                  borderWidth: 1,
                  borderBottomWidth: 0,
                  borderColor: 'rgba(255,255,255,0.1)',
                }}
              >
                {/* Handle */}
                <View style={{ alignItems: 'center', paddingTop: 14, paddingBottom: 4 }}>
                  <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)' }} />
                </View>

                {/* Header */}
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingHorizontal: 24,
                    paddingVertical: 16,
                    borderBottomWidth: 1,
                    borderBottomColor: 'rgba(255,255,255,0.06)',
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '800' }}>
                    {isEdit ? t('editVehicleTitle') : t('addVehicleTitle')}
                  </Text>
                  <TouchableOpacity
                    onPress={onClose}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: 'rgba(255,255,255,0.08)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16 }}>✕</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView
                  contentContainerStyle={{ padding: 24, gap: 16, paddingBottom: 40 }}
                  showsVerticalScrollIndicator={false}
                >
                  {/* Name */}
                  <View style={{ gap: 8 }}>
                    <Text style={labelStyle}>{t('vehicleName')}</Text>
                    <TextInput
                      value={name}
                      onChangeText={setName}
                      placeholder={t('vehicleNamePlaceholder')}
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      style={inputStyle}
                    />
                  </View>

                  {/* Brand + Model */}
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{ flex: 1, gap: 8 }}>
                      <Text style={labelStyle}>{t('brand')}</Text>
                      <TextInput
                        value={brand}
                        onChangeText={setBrand}
                        placeholder={t('brandPlaceholder')}
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        style={inputStyle}
                      />
                    </View>
                    <View style={{ flex: 1, gap: 8 }}>
                      <Text style={labelStyle}>{t('model')}</Text>
                      <TextInput
                        value={model}
                        onChangeText={setModel}
                        placeholder={t('modelPlaceholder')}
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        style={inputStyle}
                      />
                    </View>
                  </View>

                  {/* Year + Plate */}
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{ flex: 1, gap: 8 }}>
                      <Text style={labelStyle}>{t('year')}</Text>
                      <TextInput
                        value={year}
                        onChangeText={setYear}
                        placeholder={t('yearPlaceholder')}
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        keyboardType="numeric"
                        style={{ ...inputStyle, fontFamily: 'SpaceMono' }}
                      />
                    </View>
                    <View style={{ flex: 1, gap: 8 }}>
                      <Text style={labelStyle}>{t('plateNumber')}</Text>
                      <TextInput
                        value={plateNumber}
                        onChangeText={setPlateNumber}
                        placeholder={t('platePlaceholder')}
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        autoCapitalize="characters"
                        style={{ ...inputStyle, fontFamily: 'SpaceMono' }}
                      />
                    </View>
                  </View>

                  {/* Photo URL */}
                  <View style={{ gap: 8 }}>
                    <Text style={labelStyle}>{t('photoUrl')}</Text>
                    <TextInput
                      value={photoUrl}
                      onChangeText={setPhotoUrl}
                      placeholder={t('photoUrlPlaceholder')}
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      style={inputStyle}
                      autoCapitalize="none"
                    />
                  </View>

                  {/* Initial Odometer (add only) */}
                  {!isEdit && (
                    <View style={{ gap: 8 }}>
                      <Text style={labelStyle}>{t('initialOdometer')}</Text>
                      <TextInput
                        value={initialOdo}
                        onChangeText={setInitialOdo}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        style={{ ...inputStyle, fontFamily: 'SpaceMono', color: '#4ECDC4' }}
                      />
                    </View>
                  )}

                  {/* Accent Color */}
                  <View style={{ gap: 12 }}>
                    <Text style={labelStyle}>{t('accentColor')}</Text>
                    <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                      {ACCENT_COLORS.map((c) => (
                        <TouchableOpacity
                          key={c}
                          onPress={() => setColor(c)}
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 18,
                            backgroundColor: c,
                            borderWidth: color === c ? 3 : 1.5,
                            borderColor: color === c ? '#FFFFFF' : 'rgba(255,255,255,0.2)',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          activeOpacity={0.8}
                        >
                          {color === c && (
                            <Text style={{ color: '#000', fontSize: 14, fontWeight: '700' }}>✓</Text>
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Save Button */}
                  <TouchableOpacity
                    onPress={handleSave}
                    activeOpacity={0.85}
                    style={{
                      backgroundColor: '#F5A623',
                      borderRadius: 14,
                      padding: 18,
                      alignItems: 'center',
                      marginTop: 8,
                      shadowColor: '#F5A623',
                      shadowOpacity: 0.4,
                      shadowRadius: 12,
                      shadowOffset: { width: 0, height: 4 },
                    }}
                  >
                    <Text style={{ color: '#0D1B2A', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 }}>
                      {t('save')}
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
