import React, { useState } from "react";
import { View, Text, Image, TouchableOpacity, TextInput, Alert } from "react-native";
import { Vehicle } from "@/types/maintenance";
import { useLanguage } from "@/context/LanguageContext";

interface VehicleProfileCardProps {
  vehicle: Vehicle;
  onOdometerUpdate: (newValue: number) => void;
  onEditVehicle?: () => void;
}

export default function VehicleProfileCard({
  vehicle,
  onOdometerUpdate,
  onEditVehicle,
}: VehicleProfileCardProps) {
  const { t, lang } = useLanguage();
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState("");
  if (!vehicle) return null;

  const daysSinceUpdate = Math.floor(
    (Date.now() - vehicle.lastOdometerUpdate.getTime()) / (1000 * 60 * 60 * 24),
  );

  const handleConfirm = () => {
    const parsed = parseInt(inputValue.replace(/\D/g, ""), 10);
    
    if (!isNaN(parsed)) {
      // Pengecekan: Jika input manual lebih kecil dari data yang sudah terekam
      if (parsed < vehicle.currentOdometer) {
        Alert.alert(
          lang === "id" ? "Odometer Tidak Bisa Dikurangi" : "Cannot Reduce Odometer",
          lang === "id" 
            ? "Ubah atau hapus terlebih dahulu update-an terakhir yang ada di riwayat BBM atau perbaikan untuk menurunkan angka ini."
            : "Please edit or delete the latest update in fuel or repair history first to reduce this number.",
          [{ text: "OK" }]
        );
      } else {
        // Jika angka lebih besar atau sama, jalankan update
        onOdometerUpdate(parsed);
      }
    }
    
    setEditing(false);
    setInputValue("");
  };

  const formatOdometer = (km: number) => {
    if (km === undefined || km === null) return "0";
    return km.toLocaleString("id-ID");
  };

  return (
    <View
      style={{
        marginHorizontal: 20,
        borderRadius: 20,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
      }}
    >
      {/* Hero Image */}
      <View style={{ position: "relative", height: 180 }}>
        <Image
          source={{ uri: vehicle.photoUrl }}
          style={{ width: "100%", height: "100%" }}
          resizeMode="cover"
        />
        {/* Gradient overlay */}
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 0,
            backgroundColor: "rgba(26, 43, 60, 0.85)",
          }}
        />
        {/* Plate badge + Edit button */}
        <View
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            flexDirection: "row",
            gap: 8,
            alignItems: "center",
          }}
        >
          <View
            style={{
              backgroundColor: "rgba(13,27,42,0.85)",
              borderRadius: 8,
              paddingVertical: 4,
              paddingHorizontal: 10,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.15)",
            }}
          >
            <Text
              style={{
                color: "#FFFFFF",
                fontSize: 11,
                fontFamily: "SpaceMono",
                letterSpacing: 1,
              }}
            >
              {vehicle.plateNumber}
            </Text>
          </View>
          {onEditVehicle && (
            <TouchableOpacity
              onPress={onEditVehicle}
              activeOpacity={0.8}
              style={{
                backgroundColor: "rgba(245,166,35,0.85)",
                borderRadius: 8,
                paddingVertical: 4,
                paddingHorizontal: 10,
              }}
            >
              <Text
                style={{ color: "#0D1B2A", fontSize: 11, fontWeight: "700" }}
              >
                ✏️ {t("editVehicle")}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Info Section */}
      <View style={{ backgroundColor: "#1A2B3C", padding: 20, gap: 16 }}>
        {/* Vehicle Name & Details */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <View>
            <Text
              style={{
                color: "#FFFFFF",
                fontSize: 22,
                fontWeight: "800",
                letterSpacing: 0.5,
              }}
            >
              {vehicle.name}
            </Text>
            <Text
              style={{
                color: "rgba(255,255,255,0.5)",
                fontSize: 13,
                marginTop: 2,
                letterSpacing: 0.3,
              }}
            >
              {vehicle.year} {vehicle.brand} {vehicle.model}
            </Text>
          </View>
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: vehicle.color,
              marginTop: 8,
              shadowColor: vehicle.color,
              shadowOpacity: 0.8,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 0 },
            }}
          />
        </View>

        {/* Odometer Widget */}
        <View
          style={{
            backgroundColor: "rgba(13,27,42,0.6)",
            borderRadius: 14,
            padding: 16,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.06)",
          }}
        >
          <Text
            style={{
              color: "rgba(255,255,255,0.4)",
              fontSize: 11,
              letterSpacing: 1.5,
              marginBottom: 8,
            }}
          >
            ODOMETER
          </Text>

          {editing ? (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <TextInput
                value={inputValue}
                onChangeText={setInputValue}
                keyboardType="numeric"
                placeholder={vehicle?.currentOdometer ? vehicle.currentOdometer.toString() : "0"}
                placeholderTextColor="rgba(255,255,255,0.3)"
                autoFocus
                style={{
                  flex: 1,
                  color: "#FFFFFF",
                  fontSize: 28,
                  fontFamily: "SpaceMono",
                  fontWeight: "700",
                  borderBottomWidth: 2,
                  borderBottomColor: vehicle.color,
                  paddingBottom: 4,
                }}
              />
              <TouchableOpacity
                onPress={handleConfirm}
                style={{
                  backgroundColor: vehicle.color,
                  borderRadius: 10,
                  paddingVertical: 10,
                  paddingHorizontal: 18,
                }}
                activeOpacity={0.8}
              >
                <Text
                  style={{ color: "#0D1B2A", fontWeight: "700", fontSize: 13 }}
                >
                  {t("update")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setEditing(false);
                  setInputValue("");
                }}
                activeOpacity={0.7}
              >
                <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>
                  {t("cancel")}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => setEditing(true)}
              activeOpacity={0.9}
            >
              <View
                style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}
              >
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontSize: 32,
                    fontFamily: "SpaceMono",
                    fontWeight: "700",
                    letterSpacing: 2,
                  }}
                >
                  {formatOdometer(vehicle.currentOdometer)}
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 14 }}>
                  km
                </Text>
                <View
                  style={{
                    marginLeft: 8,
                    backgroundColor: "rgba(245,166,35,0.15)",
                    borderRadius: 6,
                    paddingVertical: 3,
                    paddingHorizontal: 8,
                    borderWidth: 1,
                    borderColor: "rgba(245,166,35,0.3)",
                  }}
                >
                  <Text
                    style={{
                      color: "#F5A623",
                      fontSize: 10,
                      fontWeight: "600",
                    }}
                  >
                    {t("tapToUpdate")}
                  </Text>
                </View>
              </View>
              <Text
                style={{
                  color: "rgba(255,255,255,0.3)",
                  fontSize: 11,
                  marginTop: 4,
                }}
              >
                {t("lastUpdated")}{" "}
                {daysSinceUpdate === 0
                  ? t("today")
                  : `${daysSinceUpdate} ${daysSinceUpdate > 1 ? t("daysAgo") : t("dayAgo")}`}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}
