import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Vehicle } from '@/types/maintenance';

interface VehicleSwitcherProps {
  vehicles: Vehicle[];
  selectedId: string;
  onSelect: (id: string) => void;
  onAddVehicle?: () => void;
}

export default function VehicleSwitcher({ vehicles, selectedId, onSelect, onAddVehicle }: VehicleSwitcherProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 8, gap: 10 }}
    >
      {vehicles.map((vehicle) => {
        const isSelected = vehicle.id === selectedId;
        return (
          <TouchableOpacity
            key={vehicle.id}
            onPress={() => onSelect(vehicle.id)}
            activeOpacity={0.8}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: isSelected ? '#1A2B3C' : '#0D1B2A',
              borderRadius: 24,
              paddingVertical: 8,
              paddingHorizontal: 14,
              borderWidth: 1,
              borderColor: isSelected ? vehicle.color : 'rgba(255,255,255,0.08)',
              gap: 8,
            }}
          >
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                overflow: 'hidden',
                borderWidth: 1.5,
                borderColor: isSelected ? vehicle.color : 'rgba(255,255,255,0.2)',
              }}
            >
              <Image
                source={{ uri: vehicle.photoUrl }}
                style={{ width: 28, height: 28 }}
                resizeMode="cover"
              />
            </View>
            <Text
              style={{
                fontFamily: 'SpaceMono',
                fontSize: 12,
                fontWeight: isSelected ? '600' : '400',
                color: isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.5)',
                letterSpacing: 0.3,
              }}
            >
              {vehicle.name}
            </Text>
            {isSelected && (
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: vehicle.color,
                }}
              />
            )}
          </TouchableOpacity>
        );
      })}
      <TouchableOpacity
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0D1B2A',
          borderRadius: 24,
          paddingVertical: 8,
          paddingHorizontal: 14,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.08)',
          borderStyle: 'dashed',
          gap: 4,
        }}
        activeOpacity={0.7}
        onPress={onAddVehicle}
      >
        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 16, lineHeight: 20 }}>+</Text>
        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Add</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
