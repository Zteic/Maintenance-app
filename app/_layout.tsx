import { DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { useFonts } from "expo-font";
// 1. HAPUS useGlobalSearchParams dari import
import { Stack, useRouter, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
// 2. TAMBAHKAN createContext dan useContext
import React, { useEffect, useState, createContext, useContext } from "react";
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

import { openFuelSheet, openRepairSheet } from "./index";

const { width } = Dimensions.get("window");
SplashScreen.preventAutoHideAsync();

// 🚀 3. BUAT GLOBAL CONTEXT UNTUK TAB
export const TabContext = createContext<any>(null);

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  // 🚀 4. PINDAHKAN STATE TAB KE SINI AGAR BERLAKU GLOBAL
  const [activeTab, setActiveTab] = useState("home");

  // 🚀 PERBAIKAN 1: Gunakan useMemo agar perubahan tab tidak membebani sistem
  const tabContextValue = React.useMemo(() => ({ activeTab, setActiveTab }), [activeTab]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) return null;

  return (
    <SafeAreaProvider>
      {/* 🚀 5. BUNGKUS APLIKASI DENGAN CONTEXT PROVIDER */}
      <TabContext.Provider value={tabContextValue}>
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
      </TabContext.Provider>
    </SafeAreaProvider>
  );
}

function AppNavigationOverlay() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();

  // 🚀 6. AMBIL STATUS TAB DARI CONTEXT (Bukan dari useState lokal lagi)
  const { activeTab, setActiveTab } = useContext(TabContext);

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

  // 🚀 7. PERBAIKI EFEK PATHNAME (Tanpa Params)
  useEffect(() => {
    if (pathname.includes("profile")) {
      setActiveTab("profile");
    } else if (pathname === "/" && activeTab === "profile") {
      setActiveTab("home");
    }
  }, [pathname]);

  // 🚀 8. PERBAIKI FUNGSI KLIK TAB
  // 🚀 PERBAIKAN 2: Samakan cara kerja semua tombol tab (termasuk Profile)
  const handleNavPress = (tabName: string) => {
    setActiveTab(tabName); 

    if (tabName === "profile") {
      if (pathname !== "/profile") router.push("/profile");
    } else {
      if (pathname !== "/") {
        // Jika kembali dari profile, gunakan fungsi back() agar transisi mulus
        if (pathname.includes("profile")) router.back();
        else router.navigate("/");
      }
    }
  };

  const handleFabAction = () => {
    if (activeTab === "home") openRepairSheet();
    else if (activeTab === "fuel") openFuelSheet();
  };

  const showFab = activeTab === "home" || activeTab === "fuel";

  if (pathname !== "/" && !pathname.includes("profile") && !pathname.includes("export")) {
    return null; 
  }

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      {showFab && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleFabAction}
          style={[styles.fab, { bottom: 80 + insets.bottom }]}
        >
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>
      )}

      <View
        style={[
          styles.navbar,
          { height: 60 + insets.bottom, paddingBottom: insets.bottom },
        ]}
      >
        <TouchableOpacity onPress={() => handleNavPress("home")} style={styles.navItem}>
          <Text style={[styles.navEmoji, activeTab === "home" && styles.activeEmoji]}>📊</Text>
          <Text style={[styles.navLabel, activeTab === "home" && styles.activeText]}>Dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => handleNavPress("fuel")} style={styles.navItem}>
          <Text style={[styles.navEmoji, activeTab === "fuel" && styles.activeEmoji]}>⛽</Text>
          <Text style={[styles.navLabel, activeTab === "fuel" && styles.activeText]}>Fuel</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => handleNavPress("history")} style={styles.navItem}>
          <Text style={[styles.navEmoji, activeTab === "history" && styles.activeEmoji]}>🔧</Text>
          <Text style={[styles.navLabel, activeTab === "history" && styles.activeText]}>Service</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => handleNavPress("profile")} style={styles.navItem}>
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