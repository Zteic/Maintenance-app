import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLanguage } from "@/context/LanguageContext";

interface FuelPrice {
  id: string;
  brand: string;
  product: string;
  price: string;
}

const STORAGE_KEY = "garasiku_fuel_prices";

const INITIAL_PRICES: FuelPrice[] = [
  // PERTAMINA
  { id: "p1", brand: "Pertamina", product: "Pertalite 90", price: "10000" },
  { id: "p2", brand: "Pertamina", product: "Pertamax 92", price: "12950" },
  {
    id: "p3",
    brand: "Pertamina",
    product: "Pertamax Green 95",
    price: "13900",
  },
  {
    id: "p4",
    brand: "Pertamina",
    product: "Pertamax Turbo 98",
    price: "14400",
  },
  // SHELL
  { id: "s1", brand: "Shell", product: "Shell Super 92", price: "14530" },
  { id: "s2", brand: "Shell", product: "Shell V-Power 95", price: "15370" },
  { id: "s3", brand: "Shell", product: "Shell V-Power Nitro+", price: "15570" },
  // VIVO
  { id: "v1", brand: "VIVO", product: "Revvo 90", price: "12500" },
  { id: "v2", brand: "VIVO", product: "Revvo 92", price: "14300" },
  { id: "v3", brand: "VIVO", product: "Revvo 95", price: "15200" },
  // BP
  { id: "b1", brand: "BP", product: "90", price: "12000" },
  { id: "b2", brand: "BP", product: "92", price: "13990" },
  { id: "b3", brand: "BP", product: "Ultimate 95", price: "15370" },
];

export default function FuelPriceUpdate({ onBack }: { onBack: () => void }) {
  const { lang } = useLanguage();
  const [prices, setPrices] = useState<FuelPrice[]>(INITIAL_PRICES);

  // Muat harga dari storage saat pertama kali dibuka
  useEffect(() => {
    const loadPrices = async () => {
      try {
        const savedPrices = await AsyncStorage.getItem(STORAGE_KEY);
        if (savedPrices) {
          setPrices(JSON.parse(savedPrices));
        }
      } catch (e) {
        console.error("Gagal memuat harga bensin", e);
      }
    };
    loadPrices();
  }, []);

  const handlePriceChange = (id: string, newPrice: string) => {
    const cleanedPrice = newPrice.replace(/[^0-9]/g, "");
    setPrices((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, price: cleanedPrice } : item,
      ),
    );
  };

  const handleSave = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(prices));
      Alert.alert(
        lang === "id" ? "Berhasil" : "Success",
        lang === "id"
          ? "Harga bensin telah diperbarui secara permanen!"
          : "Fuel prices have been permanently updated!",
        [{ text: "OK", onPress: onBack }],
      );
    } catch (e) {
      Alert.alert("Error", "Gagal menyimpan data harga.");
    }
  };

  const brands = ["Pertamina", "Shell", "VIVO", "BP"];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: "#0D1B2A" }}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={{ color: "#F5A623", fontSize: 16 }}>← Kembali</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Update Harga Bensin</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        {brands.map((brand) => (
          <View key={brand} style={styles.brandSection}>
            <Text style={styles.brandTitle}>{brand}</Text>

            {prices
              .filter((p) => p.brand === brand)
              .map((item) => (
                <View key={item.id} style={styles.priceRowCustom}>
                  {/* Nama Produk di Kiri */}
                  <Text style={styles.productNameCustom}>{item.product}</Text>

                  {/* KOTAK INPUT (Tempat Rp dan Angka) */}
                  <View style={styles.inputBoxCustom}>
                    <Text style={styles.rpTextCustom}>Rp</Text>
                    <TextInput
                      style={styles.textInputCustom}
                      value={item.price}
                      onChangeText={(val) => handlePriceChange(item.id, val)}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor="rgba(255,255,255,0.1)"
                    />
                  </View>
                </View>
              ))}
          </View>
        ))}

        {/* Tombol Simpan Besar di Bawah */}
        <TouchableOpacity
          style={styles.mainSaveButton}
          onPress={handleSave}
          activeOpacity={0.8}
        >
          <Text style={styles.mainSaveButtonText}>SIMPAN PERUBAHAN HARGA</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  headerTitle: { color: "#FFF", fontSize: 18, fontWeight: "700" },
  brandSection: { marginBottom: 24 },
  brandTitle: {
    color: "#F5A623",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  // Style Custom untuk Baris dan Input agar rapi
  priceRowCustom: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A2B3C",
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    justifyContent: "space-between",
  },
  productNameCustom: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
    marginRight: 10,
  },
  inputBoxCustom: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
    paddingHorizontal: 12,
    borderRadius: 10,
    width: 150,
    height: 45,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  rpTextCustom: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 14,
    fontWeight: "700",
    marginRight: 8,
  },
  textInputCustom: {
    color: "#4ECDC4",
    fontSize: 16,
    fontWeight: "800",
    textAlign: "left",
    paddingVertical: 0,
    marginLeft: 4,
    minWidth: 60,
  },
  mainSaveButton: {
    backgroundColor: "#F5A623",
    padding: 18,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 10,
    shadowColor: "#F5A623",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  mainSaveButtonText: {
    color: "#0D1B2A",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
});
