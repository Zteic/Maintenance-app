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
  Modal,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLanguage } from "@/context/LanguageContext";
import { useRegional } from "@/context/RegionalContext";
import { getCurrencySymbol } from "@/utils/formatters";

export interface FuelPrice {
  id: string;
  brand: string;
  product: string;
  price: string;
  isManual?: boolean;
}

const STORAGE_KEY = "garasiku_fuel_prices";

const INITIAL_PRICES: FuelPrice[] = [
  { id: "p1", brand: "Pertamina", product: "Pertalite 90", price: "10000" },
  { id: "p2", brand: "Pertamina", product: "Pertamax 92", price: "12950" },
  { id: "p3", brand: "Pertamina", product: "Pertamax Green 95", price: "13900" },
  { id: "p4", brand: "Pertamina", product: "Pertamax Turbo 98", price: "14400" },
  { id: "s1", brand: "Shell", product: "Shell Super 92", price: "14530" },
  { id: "s2", brand: "Shell", product: "Shell V-Power 95", price: "15370" },
  { id: "s3", brand: "Shell", product: "Shell V-Power Nitro+", price: "15570" },
  { id: "v1", brand: "VIVO", product: "Revvo 90", price: "12500" },
  { id: "v2", brand: "VIVO", product: "Revvo 92", price: "14300" },
  { id: "v3", brand: "VIVO", product: "Revvo 95", price: "15200" },
  { id: "b1", brand: "BP", product: "90", price: "12000" },
  { id: "b2", brand: "BP", product: "92", price: "13990" },
  { id: "b3", brand: "BP", product: "Ultimate 95", price: "15370" },
  // ⛽ SPBU ECERAN KHUSUS (Manual Input)
  { id: "e1", brand: "Bensin Eceran", product: "Bensin Botolan", price: "0", isManual: true },
];

export default function FuelPriceUpdate({ onBack }: { onBack: () => void }) {
  const { lang } = useLanguage();
  const [prices, setPrices] = useState<FuelPrice[]>(INITIAL_PRICES);

  // State untuk Dialog Modal (Tambah/Edit Nama)
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogType, setDialogType] = useState<'addBrand' | 'renameBrand' | 'addProduct' | 'renameProduct'>('addBrand');
  const [dialogInput, setDialogInput] = useState("");
  const [targetId, setTargetId] = useState("");
  const [targetBrand, setTargetBrand] = useState("");
  const { currency } = useRegional();
  const currencySymbol = getCurrencySymbol(currency); // Akan otomatis jadi "$", "Rp", "RM", dll

  useEffect(() => {
    const loadPrices = async () => {
      try {
        const savedPrices = await AsyncStorage.getItem(STORAGE_KEY);
        if (savedPrices) {
          const parsed = JSON.parse(savedPrices);
          // Pastikan eceran selalu ada jika terhapus
          if (!parsed.find((p: FuelPrice) => p.brand === "Bensin Eceran")) {
            parsed.push({ id: `e_${Date.now()}`, brand: "Bensin Eceran", product: "Bensin Botolan", price: "0", isManual: true });
          }
          setPrices(parsed);
        }
      } catch (e) {
        console.error("Gagal memuat harga bensin", e);
      }
    };
    loadPrices();
  }, []);

  const handlePriceChange = (id: string, newPrice: string) => {
    const cleanedPrice = newPrice.replace(/[^0-9.,]/g, "").replace(/,/g, ".");
    
    setPrices((prev) => prev.map((item) => (item.id === id ? { ...item, price: cleanedPrice } : item)));
  };

  const handleSave = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(prices));
      Alert.alert(lang === "id" ? "Berhasil" : "Success", lang === "id" ? "Harga & Daftar bensin telah diperbarui secara permanen!" : "Fuel prices updated!", [{ text: "OK", onPress: onBack }]);
    } catch (e) {
      Alert.alert("Error", "Gagal menyimpan data harga.");
    }
  };

  // --- FUNGSI MENGGESER SPBU (BRAND) ---
  const moveBrand = (brand: string, direction: 'up' | 'down') => {
    const uniqueBrands = Array.from(new Set(prices.map(p => p.brand)));
    const idx = uniqueBrands.indexOf(brand);
    
    if (direction === 'up' && idx > 0) {
      [uniqueBrands[idx], uniqueBrands[idx - 1]] = [uniqueBrands[idx - 1], uniqueBrands[idx]];
    } else if (direction === 'down' && idx < uniqueBrands.length - 1) {
      [uniqueBrands[idx], uniqueBrands[idx + 1]] = [uniqueBrands[idx + 1], uniqueBrands[idx]];
    } else return;

    let newPrices: FuelPrice[] = [];
    uniqueBrands.forEach(b => newPrices.push(...prices.filter(p => p.brand === b)));
    setPrices(newPrices);
  };

  // --- FUNGSI MENGGESER PRODUK BENSIN ---
  const moveProduct = (id: string, direction: 'up' | 'down') => {
    const idx = prices.findIndex(p => p.id === id);
    if (idx < 0) return;
    const brand = prices[idx].brand;
    
    let targetIdx = -1;
    if (direction === 'up') {
      for(let i = idx - 1; i >= 0; i--) if (prices[i].brand === brand) { targetIdx = i; break; }
    } else {
      for(let i = idx + 1; i < prices.length; i++) if (prices[i].brand === brand) { targetIdx = i; break; }
    }

    if (targetIdx !== -1) {
      const newPrices = [...prices];
      [newPrices[idx], newPrices[targetIdx]] = [newPrices[targetIdx], newPrices[idx]];
      setPrices(newPrices);
    }
  };

  const deleteBrand = (brand: string) => {
    Alert.alert("Hapus SPBU", `Yakin ingin menghapus ${brand} beserta isinya?`, [
      { text: "Batal", style: "cancel" },
      { text: "Hapus", style: "destructive", onPress: () => setPrices(prev => prev.filter(p => p.brand !== brand)) }
    ]);
  };

  const deleteProduct = (id: string, productName: string) => {
    Alert.alert("Hapus Bensin", `Yakin ingin menghapus ${productName}?`, [
      { text: "Batal", style: "cancel" },
      { text: "Hapus", style: "destructive", onPress: () => setPrices(prev => prev.filter(p => p.id !== id)) }
    ]);
  };

  const openDialog = (type: typeof dialogType, initialValue = "", tId = "", tBrand = "") => {
    setDialogType(type);
    setDialogInput(initialValue);
    setTargetId(tId);
    setTargetBrand(tBrand);
    setDialogVisible(true);
  };

  const submitDialog = () => {
    const val = dialogInput.trim();
    if (!val) { setDialogVisible(false); return; }

    if (dialogType === 'addBrand') {
      setPrices(prev => [...prev, { id: `b_${Date.now()}`, brand: val, product: "Bensin Baru", price: "0" }]);
    } else if (dialogType === 'renameBrand') {
      setPrices(prev => prev.map(p => p.brand === targetBrand ? { ...p, brand: val } : p));
    } else if (dialogType === 'addProduct') {
      const isManual = targetBrand === "Bensin Eceran";
      setPrices(prev => [...prev, { id: `p_${Date.now()}`, brand: targetBrand, product: val, price: "0", isManual }]);
    } else if (dialogType === 'renameProduct') {
      setPrices(prev => prev.map(p => p.id === targetId ? { ...p, product: val } : p));
    }
    setDialogVisible(false);
  };

  const uniqueBrands = Array.from(new Set(prices.map((p) => p.brand)));

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: "#0D1B2A" }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={{ color: "#F5A623", fontSize: 16 }}>← Kembali</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Atur Harga & SPBU</Text>
        <TouchableOpacity onPress={() => openDialog('addBrand')}>
          <Text style={{ color: "#4ECDC4", fontSize: 24, fontWeight: 'bold' }}>+</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginBottom: 20, textAlign: 'center' }}>
          💡 Tekan tombol ▲▼ untuk menggeser posisi SPBU atau Jenis Bensin.
        </Text>

        {uniqueBrands.map((brand) => (
          <View key={brand} style={styles.brandSection}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={styles.brandTitle}>{brand}</Text>
                <TouchableOpacity onPress={() => openDialog('renameBrand', brand, "", brand)}>
                  <Text style={{ fontSize: 14 }}>✏️</Text>
                </TouchableOpacity>
                {brand !== "Bensin Eceran" && (
                  <TouchableOpacity onPress={() => deleteBrand(brand)}>
                    <Text style={{ fontSize: 14 }}>🗑️</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={{ flexDirection: 'row', gap: 15 }}>
                <TouchableOpacity onPress={() => moveBrand(brand, 'up')}><Text style={{ color: 'white' }}>▲</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => moveBrand(brand, 'down')}><Text style={{ color: 'white' }}>▼</Text></TouchableOpacity>
              </View>
            </View>

            {prices.filter((p) => p.brand === brand).map((item) => (
              <View key={item.id} style={styles.priceRowCustom}>
                {/* Aksi Kiri (Edit & Urutan) */}
                <View style={{ flexDirection: 'column', gap: 8, marginRight: 10 }}>
                  <TouchableOpacity onPress={() => moveProduct(item.id, 'up')}><Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>▲</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => moveProduct(item.id, 'down')}><Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>▼</Text></TouchableOpacity>
                </View>

                {/* Nama Produk */}
                <TouchableOpacity style={{ flex: 1 }} onPress={() => openDialog('renameProduct', item.product, item.id, brand)}>
                  <Text style={styles.productNameCustom}>{item.product}</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, marginTop: 2 }}>Tap untuk ubah nama</Text>
                </TouchableOpacity>

                {/* KOTAK INPUT (Disabled jika manual Eceran) */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={[styles.inputBoxCustom, item.isManual && { backgroundColor: 'transparent', borderColor: 'transparent' }]}>
                  <Text style={styles.rpTextCustom}>{item.isManual ? "Manual" : currencySymbol}</Text>
                    {!item.isManual && (
                      <TextInput
                        style={styles.textInputCustom}
                        value={item.price}
                        onChangeText={(val) => handlePriceChange(item.id, val)}
                        keyboardType="decimal-pad"
                        placeholder="0"
                        placeholderTextColor="rgba(255,255,255,0.1)"
                      />
                    )}
                  </View>
                  <TouchableOpacity onPress={() => deleteProduct(item.id, item.product)}>
                    <Text style={{ fontSize: 14, color: '#FF5252' }}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            <TouchableOpacity onPress={() => openDialog('addProduct', "", "", brand)} style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 12, alignItems: 'center', marginTop: 5, borderStyle: 'dashed', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 'bold' }}>+ Tambah Jenis Bensin {brand}</Text>
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity style={styles.mainSaveButton} onPress={handleSave} activeOpacity={0.8}>
          <Text style={styles.mainSaveButtonText}>SIMPAN PERUBAHAN</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal Input Dialog Universal */}
      <Modal visible={dialogVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {dialogType === 'addBrand' ? 'Tambah SPBU Baru' : dialogType === 'renameBrand' ? 'Ubah Nama SPBU' : dialogType === 'addProduct' ? `Tambah Bensin di ${targetBrand}` : 'Ubah Nama Bensin'}
            </Text>
            <TextInput
              style={styles.modalInput}
              value={dialogInput}
              onChangeText={setDialogInput}
              placeholder="Ketik nama di sini..."
              placeholderTextColor="rgba(255,255,255,0.3)"
              autoFocus
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              <TouchableOpacity onPress={() => setDialogVisible(false)} style={[styles.modalBtn, { backgroundColor: 'rgba(255,255,255,0.1)' }]}><Text style={{ color: '#FFF' }}>Batal</Text></TouchableOpacity>
              <TouchableOpacity onPress={submitDialog} style={[styles.modalBtn, { backgroundColor: '#4ECDC4' }]}><Text style={{ color: '#0D1B2A', fontWeight: 'bold' }}>Simpan</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, paddingTop: 60, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)" },
  headerTitle: { color: "#FFF", fontSize: 18, fontWeight: "700" },
  brandSection: { marginBottom: 30 },
  brandTitle: { color: "#F5A623", fontSize: 16, fontWeight: "900", textTransform: "uppercase", letterSpacing: 1 },
  priceRowCustom: { flexDirection: "row", alignItems: "center", backgroundColor: "#1A2B3C", padding: 12, borderRadius: 12, marginBottom: 8, justifyContent: "space-between" },
  productNameCustom: { color: "#FFF", fontSize: 14, fontWeight: "600" },
  inputBoxCustom: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(0,0,0,0.4)", paddingHorizontal: 12, borderRadius: 10, width: 120, height: 40, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  rpTextCustom: { color: "rgba(255,255,255,0.3)", fontSize: 13, fontWeight: "700", marginRight: 8 },
  textInputCustom: { color: "#4ECDC4", fontSize: 15, fontWeight: "800", flex: 1 },
  mainSaveButton: { backgroundColor: "#F5A623", padding: 18, borderRadius: 16, alignItems: "center", marginTop: 10, shadowColor: "#F5A623", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5 },
  mainSaveButtonText: { color: "#0D1B2A", fontSize: 15, fontWeight: "900", letterSpacing: 0.5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '80%', backgroundColor: '#1A2B3C', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  modalTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginBottom: 15 },
  modalInput: { backgroundColor: 'rgba(0,0,0,0.3)', color: '#FFF', padding: 15, borderRadius: 12, fontSize: 15, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' }
});