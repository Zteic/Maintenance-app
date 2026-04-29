import React, { useState } from 'react';
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
import { RepairEntry, ServiceType } from '@/types/maintenance';

const SERVICE_TYPES: ServiceType[] = [
  'Oil Change',
  'Tire Rotation',
  'Brake Inspection',
  'Air Filter',
  'Spark Plugs',
  'Transmission Service',
  'Coolant Flush',
  'Battery Check',
  'AC Service',
  'General Inspection',
  'Other',
];

interface AddRepairSheetProps {
  visible: boolean;
  vehicleId: string;
  currentOdometer: number;
  prefillServiceType?: string;
  onClose: () => void;
  onSave: (entry: Omit<RepairEntry, 'id'>) => void;
}

export default function AddRepairSheet({
  visible,
  vehicleId,
  currentOdometer,
  prefillServiceType,
  onClose,
  onSave,
}: AddRepairSheetProps) {
  const [serviceType, setServiceType] = useState<ServiceType>(
    (prefillServiceType as ServiceType) || 'Oil Change'
  );
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [odometer, setOdometer] = useState(currentOdometer.toString());
  const [cost, setCost] = useState('');
  const [workshop, setWorkshop] = useState('');
  const [notes, setNotes] = useState('');
  const [nextInterval, setNextInterval] = useState('5000');
  const [showServicePicker, setShowServicePicker] = useState(false);

  const handleSave = () => {
    const entry: Omit<RepairEntry, 'id'> = {
      vehicleId,
      serviceType,
      date: new Date(date),
      odometer: parseInt(odometer, 10) || currentOdometer,
      cost: parseInt(cost.replace(/\D/g, ''), 10) || 0,
      workshop: workshop || 'Unknown Workshop',
      notes,
      nextIntervalKm: parseInt(nextInterval, 10) || 5000,
    };
    onSave(entry);
    onClose();
    resetForm();
  };

  const resetForm = () => {
    setServiceType('Oil Change');
    setDate(new Date().toISOString().split('T')[0]);
    setOdometer(currentOdometer.toString());
    setCost('');
    setWorkshop('');
    setNotes('');
    setNextInterval('5000');
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
                  <View
                    style={{
                      width: 36,
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: 'rgba(255,255,255,0.2)',
                    }}
                  />
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
                    Log Repair
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
                  {/* Service Type */}
                  <View style={{ gap: 8 }}>
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, letterSpacing: 1 }}>
                      SERVICE TYPE
                    </Text>
                    <TouchableOpacity
                      onPress={() => setShowServicePicker(!showServicePicker)}
                      style={{
                        backgroundColor: '#0D1B2A',
                        borderRadius: 12,
                        padding: 14,
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.08)',
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '500' }}>
                        {serviceType}
                      </Text>
                      <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
                        {showServicePicker ? '▲' : '▼'}
                      </Text>
                    </TouchableOpacity>

                    {showServicePicker && (
                      <View
                        style={{
                          backgroundColor: '#0D1B2A',
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: 'rgba(255,255,255,0.08)',
                          overflow: 'hidden',
                        }}
                      >
                        {SERVICE_TYPES.map((type, idx) => (
                          <TouchableOpacity
                            key={type}
                            onPress={() => {
                              setServiceType(type);
                              setShowServicePicker(false);
                            }}
                            style={{
                              padding: 14,
                              borderBottomWidth: idx < SERVICE_TYPES.length - 1 ? 1 : 0,
                              borderBottomColor: 'rgba(255,255,255,0.04)',
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                            activeOpacity={0.7}
                          >
                            <Text
                              style={{
                                color: type === serviceType ? '#F5A623' : '#FFFFFF',
                                fontSize: 14,
                                fontWeight: type === serviceType ? '600' : '400',
                              }}
                            >
                              {type}
                            </Text>
                            {type === serviceType && (
                              <Text style={{ color: '#F5A623', fontSize: 14 }}>✓</Text>
                            )}
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>

                  {/* Date & Odometer Row */}
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{ flex: 1, gap: 8 }}>
                      <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, letterSpacing: 1 }}>
                        DATE
                      </Text>
                      <TextInput
                        value={date}
                        onChangeText={setDate}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        style={{
                          backgroundColor: '#0D1B2A',
                          borderRadius: 12,
                          padding: 14,
                          color: '#FFFFFF',
                          fontSize: 14,
                          borderWidth: 1,
                          borderColor: 'rgba(255,255,255,0.08)',
                          fontFamily: 'SpaceMono',
                        }}
                      />
                    </View>
                    <View style={{ flex: 1, gap: 8 }}>
                      <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, letterSpacing: 1 }}>
                        ODOMETER (KM)
                      </Text>
                      <TextInput
                        value={odometer}
                        onChangeText={setOdometer}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        style={{
                          backgroundColor: '#0D1B2A',
                          borderRadius: 12,
                          padding: 14,
                          color: '#FFFFFF',
                          fontSize: 14,
                          borderWidth: 1,
                          borderColor: 'rgba(255,255,255,0.08)',
                          fontFamily: 'SpaceMono',
                        }}
                      />
                    </View>
                  </View>

                  {/* Cost */}
                  <View style={{ gap: 8 }}>
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, letterSpacing: 1 }}>
                      COST (IDR)
                    </Text>
                    <TextInput
                      value={cost}
                      onChangeText={setCost}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      style={{
                        backgroundColor: '#0D1B2A',
                        borderRadius: 12,
                        padding: 14,
                        color: '#F5A623',
                        fontSize: 16,
                        fontWeight: '600',
                        borderWidth: 1,
                        borderColor: 'rgba(245,166,35,0.2)',
                        fontFamily: 'SpaceMono',
                      }}
                    />
                  </View>

                  {/* Workshop */}
                  <View style={{ gap: 8 }}>
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, letterSpacing: 1 }}>
                      WORKSHOP
                    </Text>
                    <TextInput
                      value={workshop}
                      onChangeText={setWorkshop}
                      placeholder="Workshop name"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      style={{
                        backgroundColor: '#0D1B2A',
                        borderRadius: 12,
                        padding: 14,
                        color: '#FFFFFF',
                        fontSize: 14,
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.08)',
                      }}
                    />
                  </View>

                  {/* Next Interval */}
                  <View style={{ gap: 8 }}>
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, letterSpacing: 1 }}>
                      NEXT SERVICE INTERVAL (KM)
                    </Text>
                    <TextInput
                      value={nextInterval}
                      onChangeText={setNextInterval}
                      keyboardType="numeric"
                      placeholder="5000"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      style={{
                        backgroundColor: '#0D1B2A',
                        borderRadius: 12,
                        padding: 14,
                        color: '#4ECDC4',
                        fontSize: 14,
                        fontWeight: '600',
                        borderWidth: 1,
                        borderColor: 'rgba(78,205,196,0.2)',
                        fontFamily: 'SpaceMono',
                      }}
                    />
                  </View>

                  {/* Notes */}
                  <View style={{ gap: 8 }}>
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, letterSpacing: 1 }}>
                      NOTES
                    </Text>
                    <TextInput
                      value={notes}
                      onChangeText={setNotes}
                      placeholder="Add notes or observations..."
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                      style={{
                        backgroundColor: '#0D1B2A',
                        borderRadius: 12,
                        padding: 14,
                        color: '#FFFFFF',
                        fontSize: 14,
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.08)',
                        minHeight: 80,
                        lineHeight: 22,
                      }}
                    />
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
                      SAVE REPAIR LOG
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
