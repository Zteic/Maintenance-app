import { DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { useFonts } from "expo-font";
import {
  Stack,
  useRouter,
  usePathname,
  useGlobalSearchParams,
} from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState, useCallback } from "react";
import { PremiumProvider } from "@/context/PremiumContext";
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Dimensions,
  BackHandler,
  Alert
} from "react-native";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import "react-native-reanimated";
import "../global.css";

// Import pemicu modal dari index
import { openFuelSheet, openRepairSheet } from "./index";

const { width } = Dimensions.get("window");
SplashScreen.preventAutoHideAsync();

// 1. Ubah fungsi utama Anda menjadi fungsi konten internal biasa (Hilangkan kata export default)
function RootLayoutContent() {
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    Andhyta: require('../assets/fonts/Windpower.otf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider value={DefaultTheme}>
        <View style={{ flex: 1, backgroundColor: "#0D1B2A" }}>
          <Stack screenOptions={{ headerShown: false, animation: "none" }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="profile" />
            <Stack.Screen name="export" />
          </Stack>
          <AppNavigationOverlay />
        </View>
        <StatusBar style="light" />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

// 2. KUNCI UTAMA: Jadikan PremiumProvider sebagai Root terluar yang diexport ke sistem Expo
export default function RootLayout() {
  return (
    <PremiumProvider>
      <RootLayoutContent />
    </PremiumProvider>
  );
}

// 🚀 REVISI TOTAL: Optimasi Navigasi Premium Khusus Device Low-End / Kentang
function AppNavigationOverlay() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const params = useGlobalSearchParams();

  const [activeTab, setActiveTab] = useState("home");

  useEffect(() => {
    if (pathname.includes("profile")) {
      setActiveTab("profile");
    } else {
      const currentTab = (params as any).tab || (params as any).activeTab || "home";
      setActiveTab(currentTab.toString());
    }
  }, [pathname, JSON.stringify(params)]); 

  // Handler Hardware Back Button Android
  useEffect(() => {
    const onBackPress = () => {
      if (pathname === "/" || pathname.includes("profile")) {
        Alert.alert(
          "Keluar Aplikasi",
          "Apakah Anda yakin ingin keluar?",
          [
            { text: "Batal", style: "cancel" },
            { text: "Ya, Keluar", style: "destructive", onPress: () => BackHandler.exitApp() }
          ]
        );
        return true; 
      }
      return false;
    };

    const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => subscription.remove();
  }, [pathname]);

  // 🚀 OPTIMASI UTAMA: Memakai teknik Micro-Task scheduling agar UI langsung berubah tanpa lag
  const handleNavPress = useCallback((tabName: string) => {
    setActiveTab(tabName); // Optimistic Update (Warna navbar langsung berubah seketika)
    
    // Gunakan requestAnimationFrame agar animasi klik selesai dulu sebelum router mengeksekusi perpindahan halaman yang berat
    requestAnimationFrame(() => {
      if (tabName === "profile") {
        if (pathname !== "/profile") router.push("/profile");
      } else {
        if (pathname === "/") {
          router.setParams({ tab: tabName });
        } else {
          router.replace({
            pathname: "/",
            params: { tab: tabName },
          });
        }
      }
    });
  }, [pathname]);

  const handleFabAction = useCallback(() => {
    if (activeTab === "home") openRepairSheet();
    else if (activeTab === "fuel") openFuelSheet();
  }, [activeTab]);

  const showFab = activeTab === "home" || activeTab === "fuel";

  if (pathname !== "/" && !pathname.includes("profile") && !pathname.includes("export")) {
    return null; 
  }

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      {/* 1. SMART FAB */}
      {showFab && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleFabAction}
          style={[styles.fab, { bottom: 80 + insets.bottom }]}
        >
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>
      )}

      {/* 2. BOTTOM NAVBAR (Optimized Layout Render) */}
      <View
        style={[
          styles.navbar,
          { height: 60 + insets.bottom, paddingBottom: insets.bottom },
        ]}
      >
        <TouchableOpacity activeOpacity={0.9} onPress={() => handleNavPress("home")} style={styles.navItem}>
          <Text style={[styles.navEmoji, activeTab === "home" && styles.activeEmoji]}>📊</Text>
          <Text style={[styles.navLabel, activeTab === "home" && styles.activeText]}>Dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.9} onPress={() => handleNavPress("fuel")} style={styles.navItem}>
          <Text style={[styles.navEmoji, activeTab === "fuel" && styles.activeEmoji]}>⛽</Text>
          <Text style={[styles.navLabel, activeTab === "fuel" && styles.activeText]}>Fuel</Text>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.9} onPress={() => handleNavPress("history")} style={styles.navItem}>
          <Text style={[styles.navEmoji, activeTab === "history" && styles.activeEmoji]}>🛠️</Text>
          <Text style={[styles.navLabel, activeTab === "history" && styles.activeText]}>Service</Text>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.9} onPress={() => handleNavPress("profile")} style={styles.navItem}>
          <Text style={[styles.navEmoji, activeTab === "profile" && styles.activeEmoji]}>👤</Text>
          <Text style={[styles.navLabel, activeTab === "profile" && styles.activeText]}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999 },
  navbar: {
    position: "absolute", bottom: 0, width: width, flexDirection: "row",
    justifyContent: "space-around", alignItems: "center", backgroundColor: "#1A2B3C",
    borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.1)",
  },
  navItem: { alignItems: "center", flex: 1, paddingTop: 8 },
  navEmoji: { fontSize: 20, opacity: 0.4 },
  activeEmoji: { opacity: 1 },
  navLabel: { fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 4, fontWeight: "700" },
  activeText: { color: "#4ECDC4" },
  fab: {
    position: "absolute", right: 20, width: 60, height: 60, borderRadius: 30,
    backgroundColor: "#4ECDC4", justifyContent: "center", alignItems: "center",
    elevation: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 5,
  },
  fabIcon: { fontSize: 32, color: "#0D1B2A", fontWeight: "bold" },
});