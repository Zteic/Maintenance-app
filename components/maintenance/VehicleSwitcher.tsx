import React from "react";
import { View, Text, ScrollView, TouchableOpacity, Image } from "react-native";
import { Vehicle } from "@/types/maintenance";

interface VehicleSwitcherProps {
  vehicles: Vehicle[];
  selectedId: string;
  onSelect: (id: string) => void;
  onAddVehicle?: () => void;
}

export default function VehicleSwitcher({
  vehicles,
  selectedId,
  onSelect,
  onAddVehicle,
}: VehicleSwitcherProps) {
  return (
    <View style={{ width: "100%" }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingVertical: 10,
          gap: 8,
          alignItems: "center",
        }}
      >
        {vehicles.map((vehicle) => {
          const isSelected = vehicle.id === selectedId;
          return (
            <TouchableOpacity
              key={vehicle.id}
              onPress={() => onSelect(vehicle.id)}
              activeOpacity={0.85}
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: isSelected
                  ? "rgba(255, 255, 255, 0.05)"
                  : "rgba(255, 255, 255, 0.02)",
                height: 38,
                borderRadius: 19,
                paddingRight: 12,
                paddingLeft: 4,
                borderWidth: isSelected ? 2 : 1,
                borderColor: isSelected ? "#FFFFFF" : "rgba(255,255,255,0.1)",
                gap: 8,
              }}
            >
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  overflow: "hidden",
                  borderWidth: 1,
                  borderColor: isSelected
                    ? vehicle.color || "#F5A623"
                    : "transparent",
                }}
              >
                <Image
                  source={{ uri: vehicle.photoUrl }}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="cover"
                />
              </View>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "700",
                  color: isSelected ? "#FFFFFF" : "rgba(255,255,255,0.4)",
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
                    backgroundColor: vehicle.color || "#F5A623",
                  }}
                />
              )}
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
  onPress={(e) => {
    e.stopPropagation(); // Mencegah klik "tembus" ke area scroll
    onAddVehicle?.();    // Menjalankan fungsi tambah kendaraan
  }}
  activeOpacity={0.7}
  style={{
    flexDirection: "row",
    alignItems: "center",
    height: 38,
    borderRadius: 19,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    borderStyle: "dashed",
    backgroundColor: "rgba(255,255,255,0.02)",
    marginLeft: 4,
  }}
>
  <Text
    style={{
      color: "rgba(255,255,255,0.4)",
      fontSize: 16,
      marginRight: 4,
    }}
  >
    +
  </Text>
  <Text
    style={{
      color: "rgba(255,255,255,0.4)",
      fontSize: 12,
      fontWeight: "600",
    }}
  >
    Add
  </Text>
</TouchableOpacity>
      </ScrollView>
    </View>
  );
}
