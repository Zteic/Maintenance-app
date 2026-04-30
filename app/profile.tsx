import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Image,
} from "react-native";
import { useRouter } from "expo-router";

export default function ProfileScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0D1B2A" }}>
      <View style={{ padding: 20 }}>
        {/* Tombol Kembali */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginBottom: 20 }}
        >
          <Text style={{ color: "#F5A623", fontSize: 16 }}>← Kembali</Text>
        </TouchableOpacity>

        <Text
          style={{
            color: "#FFFFFF",
            fontSize: 28,
            fontWeight: "800",
            marginBottom: 30,
          }}
        >
          Profil Saya
        </Text>

        <View style={{ alignItems: "center", marginBottom: 30 }}>
          <View
            style={{
              width: 120,
              height: 120,
              borderRadius: 60,
              backgroundColor: "#1A2B3C",
              borderWidth: 2,
              borderColor: "#F5A623",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 50 }}>👤</Text>
          </View>
          <TouchableOpacity style={{ marginTop: 15 }}>
            <Text style={{ color: "#F5A623", fontWeight: "600" }}>
              Ganti Foto Profil
            </Text>
          </TouchableOpacity>
        </View>

        <View
          style={{
            backgroundColor: "#1A2B3C",
            borderRadius: 15,
            padding: 20,
            gap: 15,
          }}
        >
          <View>
            <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>
              NAMA PENGGUNA
            </Text>
            <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "600" }}>
              Rivaldi
            </Text>
          </View>
          <View
            style={{ height: 1, backgroundColor: "rgba(255,255,255,0.05)" }}
          />
          <View>
            <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>
              EMAIL
            </Text>
            <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "600" }}>
              rivaldi@example.com
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
