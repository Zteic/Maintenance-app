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
import React, { useEffect, useMemo } from "react"; // Tambahkan useMemo
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Dimensions,
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


export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
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
          {/* Tambahkan animation: 'none' untuk menghilangkan delay transisi */}
          <Stack screenOptions={{ headerShown: false, animation: "none" }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="profile" />
          </Stack>
          <AppNavigationOverlay />
        </View>
        <StatusBar style="light" />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function AppNavigationOverlay() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const params = useGlobalSearchParams();

  // OPTIMASI: Gunakan useMemo agar penentuan tab aktif instan & ringan
  const currentActiveTab = useMemo(() => {
    if (pathname.includes("profile")) return "profile";
    return params.tab?.toString() || "home";
  }, [params.tab, pathname]);

  const handleNavPress = (tabName: string) => {
    // Jika sudah di halaman utama, gunakan setParams (Tanpa Reload)
    if (pathname === "/") {
      router.setParams({ tab: tabName });
    } else {
      // Jika dari luar, baru gunakan replace
      router.replace({
        pathname: "/",
        params: { tab: tabName },
      });
    }
  };

  const handleFabAction = () => {
    if (currentActiveTab === "home") openRepairSheet();
    else if (currentActiveTab === "fuel") openFuelSheet();
  };

  const showFab = currentActiveTab === "home" || currentActiveTab === "fuel";

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

      {/* 2. BOTTOM NAVBAR */}
      <View
        style={[
          styles.navbar,
          { height: 60 + insets.bottom, paddingBottom: insets.bottom },
        ]}
      >
        <TouchableOpacity
          onPress={() => handleNavPress("home")}
          style={styles.navItem}
        >
          <Text
            style={[
              styles.navEmoji,
              currentActiveTab === "home" && styles.activeEmoji,
            ]}
          >
            📊
          </Text>
          <Text
            style={[
              styles.navLabel,
              currentActiveTab === "home" && styles.activeText,
            ]}
          >
            Dashboard
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleNavPress("fuel")}
          style={styles.navItem}
        >
          <Text
            style={[
              styles.navEmoji,
              currentActiveTab === "fuel" && styles.activeEmoji,
            ]}
          >
            ⛽
          </Text>
          <Text
            style={[
              styles.navLabel,
              currentActiveTab === "fuel" && styles.activeText,
            ]}
          >
            Fuel
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleNavPress("history")}
          style={styles.navItem}
        >
          <Text
            style={[
              styles.navEmoji,
              currentActiveTab === "history" && styles.activeEmoji,
            ]}
          >
            🔧
          </Text>
          <Text
            style={[
              styles.navLabel,
              currentActiveTab === "history" && styles.activeText,
            ]}
          >
            Service
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/profile")}
          style={styles.navItem}
        >
          <Text
            style={[
              styles.navEmoji,
              currentActiveTab === "profile" && styles.activeEmoji,
            ]}
          >
            👤
          </Text>
          <Text
            style={[
              styles.navLabel,
              currentActiveTab === "profile" && styles.activeText,
            ]}
          >
            Profile
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99999,
  },
  navbar: {
    position: "absolute",
    bottom: 0,
    width: width,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "#1A2B3C",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  navItem: { alignItems: "center", flex: 1, paddingTop: 8 },
  navEmoji: { fontSize: 20, opacity: 0.4 },
  activeEmoji: { opacity: 1 },
  navLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.4)",
    marginTop: 4,
    fontWeight: "700",
  },
  activeText: { color: "#4ECDC4" },
  fab: {
    position: "absolute",
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#4ECDC4",
    justifyContent: "center",
    alignItems: "center",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
  },
  fabIcon: { fontSize: 32, color: "#0D1B2A", fontWeight: "bold" },
  fabLabel: {
    position: "absolute",
    top: -16,
    backgroundColor: "#4ECDC4",
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  fabLabelText: { fontSize: 9, fontWeight: "900", color: "#0D1B2A" },
});
