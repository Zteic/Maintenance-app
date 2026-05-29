import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  TextInput,
  FlatList,
} from "react-native";

// 🌍 DAFTAR MATA UANG GLOBAL (Super Lengkap & Siap Pakai)
const GLOBAL_CURRENCIES = [
  { code: "IDR", name: "Indonesian Rupiah", flag: "🇮🇩" },
  { code: "USD", name: "US Dollar", flag: "🇺🇸" },
  { code: "EUR", name: "Euro", flag: "🇪🇺" },
  { code: "JPY", name: "Japanese Yen", flag: "🇯🇵" },
  { code: "GBP", name: "British Pound", flag: "🇬🇧" },
  { code: "MYR", name: "Malaysian Ringgit", flag: "🇲🇾" },
  { code: "SGD", name: "Singapore Dollar", flag: "🇸🇬" },
  { code: "AUD", name: "Australian Dollar", flag: "🇦🇺" },
  { code: "CAD", name: "Canadian Dollar", flag: "🇨🇦" },
  { code: "CHF", name: "Swiss Franc", flag: "🇨🇭" },
  { code: "CNY", name: "Chinese Yuan", flag: "🇨🇳" },
  { code: "KRW", name: "South Korean Won", flag: "🇰🇷" },
  { code: "HKD", name: "Hong Kong Dollar", flag: "🇭🇰" },
  { code: "NZD", name: "New Zealand Dollar", flag: "🇳🇿" },
  { code: "INR", name: "Indian Rupee", flag: "🇮🇳" },
  { code: "THB", name: "Thai Baht", flag: "🇹🇭" },
  { code: "PHP", name: "Philippine Peso", flag: "🇵🇭" },
  { code: "VND", name: "Vietnamese Dong", flag: "🇻🇳" },
  { code: "SAR", name: "Saudi Riyal", flag: "🇸🇦" },
  { code: "AED", name: "UAE Dirham", flag: "🇦🇪" },
  { code: "BRL", name: "Brazilian Real", flag: "🇧🇷" },
  { code: "ZAR", name: "South African Rand", flag: "🇿🇦" },
  { code: "RUB", name: "Russian Ruble", flag: "🇷🇺" },
  { code: "MXN", name: "Mexican Peso", flag: "🇲🇽" },
  { code: "TRY", name: "Turkish Lira", flag: "🇹🇷" },
  { code: "SEK", name: "Swedish Krona", flag: "🇸🇪" },
  { code: "NOK", name: "Norwegian Krone", flag: "🇳🇴" },
  { code: "DKK", name: "Danish Krone", flag: "🇩🇰" },
  { code: "TWD", name: "New Taiwan Dollar", flag: "🇹🇼" },
  { code: "PLN", name: "Polish Zloty", flag: "🇵🇱" },
  { code: "ARS", name: "Argentine Peso", flag: "🇦🇷" },
  { code: "CLP", name: "Chilean Peso", flag: "🇨🇱" },
  { code: "COP", name: "Colombian Peso", flag: "🇨🇴" },
  { code: "EGP", name: "Egyptian Pound", flag: "🇪🇬" },
  { code: "ILS", name: "Israeli New Shekel", flag: "🇮🇱" },
  { code: "PKR", name: "Pakistani Rupee", flag: "🇵🇰" },
  { code: "BDT", name: "Bangladeshi Taka", flag: "🇧🇩" },
  { code: "QAR", name: "Qatari Riyal", flag: "🇶🇦" },
  { code: "KWD", name: "Kuwaiti Dinar", flag: "🇰🇼" },
  { code: "OMR", name: "Omani Rial", flag: "🇴🇲" },
  { code: "BHD", name: "Bahraini Dinar", flag: "🇧🇭" },
  { code: "NGN", name: "Nigerian Naira", flag: "🇳🇬" },
  { code: "KES", name: "Kenyan Shilling", flag: "🇰🇪" },
];

interface RegionalModalProps {
  activeDropdown: "currency" | "distance" | "volume" | null;
  onClose: () => void;
  currentCurrency: string;
  currentDistance: string;
  currentVolume: string;
  onSelectCurrency: (val: string) => void;
  onSelectDistance: (val: string) => void;
  onSelectVolume: (val: string) => void;
}

export default function RegionalDropdownModal({
  activeDropdown,
  onClose,
  currentCurrency,
  currentDistance,
  currentVolume,
  onSelectCurrency,
  onSelectDistance,
  onSelectVolume,
}: RegionalModalProps) {
  const [modalSearch, setModalSearch] = useState("");

  // Jika activeDropdown null, Modal tidak akan di-render sama sekali (menghemat RAM)
  if (!activeDropdown) return null;

  const handleClose = () => {
    setModalSearch("");
    onClose();
  };

  return (
    <Modal visible={true} transparent animationType="fade" onRequestClose={handleClose}>
      <TouchableWithoutFeedback onPress={handleClose}>
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.8)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <TouchableWithoutFeedback>
            <View
              style={{
                backgroundColor: "#1A2B3C",
                borderRadius: 24,
                padding: 20,
                width: "85%",
                maxHeight: "80%",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.1)",
              }}
            >
              <Text
                style={{
                  color: "#FFF",
                  fontSize: 16,
                  fontWeight: "800",
                  textAlign: "center",
                  marginBottom: 16,
                }}
              >
                {activeDropdown === "currency"
                  ? "Pilih Mata Uang"
                  : activeDropdown === "distance"
                  ? "Pilih Satuan Jarak"
                  : "Pilih Satuan Volume"}
              </Text>

              {/* 🔍 Kolom Pencarian Khusus Mata Uang */}
              {activeDropdown === "currency" && (
                <TextInput
                  style={{
                    backgroundColor: "rgba(0,0,0,0.3)",
                    color: "#FFF",
                    padding: 12,
                    borderRadius: 12,
                    marginBottom: 15,
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.1)",
                  }}
                  placeholder="🔍 Cari negara atau kode..."
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={modalSearch}
                  onChangeText={setModalSearch}
                />
              )}

              {/* 💵 LIST MATA UANG (FLATLIST ANTI-LAG) */}
              {activeDropdown === "currency" && (
                <FlatList
                  data={GLOBAL_CURRENCIES.filter(
                    (c) =>
                      c.code.toLowerCase().includes(modalSearch.toLowerCase()) ||
                      c.name.toLowerCase().includes(modalSearch.toLowerCase())
                  )}
                  keyExtractor={(item) => item.code}
                  showsVerticalScrollIndicator={false}
                  initialNumToRender={10}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      onPress={() => {
                        onSelectCurrency(item.code);
                        handleClose();
                      }}
                      style={{
                        paddingVertical: 14,
                        paddingHorizontal: 15,
                        backgroundColor: currentCurrency === item.code ? "#F5A623" : "rgba(255,255,255,0.03)",
                        borderRadius: 12,
                        marginBottom: 8,
                        flexDirection: "row",
                        alignItems: "center",
                      }}
                    >
                      <Text style={{ fontSize: 18, marginRight: 12 }}>{item.flag}</Text>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            color: currentCurrency === item.code ? "#0D1B2A" : "#FFFFFF",
                            fontWeight: "800",
                            fontSize: 15,
                          }}
                        >
                          {item.code}
                        </Text>
                        <Text
                          style={{
                            color: currentCurrency === item.code ? "rgba(13,27,42,0.6)" : "rgba(255,255,255,0.4)",
                            fontSize: 11,
                          }}
                        >
                          {item.name}
                        </Text>
                      </View>
                      {currentCurrency === item.code && (
                        <Text style={{ color: "#0D1B2A", fontWeight: "bold" }}>✓</Text>
                      )}
                    </TouchableOpacity>
                  )}
                />
              )}

              {/* 🛣️ Opsi Satuan Jarak */}
              {activeDropdown === "distance" &&
                [
                  { id: "km", label: "Kilometer (km)" },
                  { id: "mi", label: "Miles (mi)" },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => {
                      onSelectDistance(item.id);
                      handleClose();
                    }}
                    style={{
                      paddingVertical: 14,
                      backgroundColor: currentDistance === item.id ? "#4ECDC4" : "rgba(255,255,255,0.03)",
                      borderRadius: 12,
                      marginBottom: 8,
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: currentDistance === item.id ? "#0D1B2A" : "#FFFFFF",
                        fontWeight: "800",
                      }}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}

              {/* ⛽ Opsi Satuan Volume */}
              {activeDropdown === "volume" &&
                [
                  { id: "L", label: "Liter (L)" },
                  { id: "Gal", label: "Gallon (Gal)" },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => {
                      onSelectVolume(item.id);
                      handleClose();
                    }}
                    style={{
                      paddingVertical: 14,
                      backgroundColor: currentVolume === item.id ? "#4ECDC4" : "rgba(255,255,255,0.03)",
                      borderRadius: 12,
                      marginBottom: 8,
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: currentVolume === item.id ? "#0D1B2A" : "#FFFFFF",
                        fontWeight: "800",
                      }}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}