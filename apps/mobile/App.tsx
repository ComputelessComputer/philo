import { StatusBar, } from "expo-status-bar";
import React from "react";
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View, } from "react-native";

const TABS = [
  { key: "today", label: "Today", copy: "Daily notes, pages, and widget state will land here.", },
  { key: "search", label: "Search", copy: "Search will run against the synced local mirror on the device.", },
  { key: "settings", label: "Settings", copy: "Sync auth, status, and error state will be surfaced here.", },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function App() {
  const [activeTab, setActiveTab,] = React.useState<TabKey>("today",);
  const activeScreen = TABS.find((tab,) => tab.key === activeTab) ?? TABS[0];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.shell}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Philo mobile</Text>
          <Text style={styles.title}>Expo shell scaffold</Text>
          <Text style={styles.subtitle}>
            This app will wrap the shared web editor host and local-cloud sync layer.
          </Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{activeScreen.label}</Text>
          <Text style={styles.cardCopy}>{activeScreen.copy}</Text>
        </View>
        <View style={styles.tabBar}>
          {TABS.map((tab,) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key,)}
              style={[styles.tab, activeTab === tab.key ? styles.tabActive : null,]}
            >
              <Text style={[styles.tabLabel, activeTab === tab.key ? styles.tabLabelActive : null,]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f3efe5",
  },
  shell: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    gap: 18,
  },
  header: {
    gap: 8,
  },
  eyebrow: {
    fontSize: 12,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: "#7b6e56",
  },
  title: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: "700",
    color: "#1a1a14",
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: "#594f3d",
  },
  card: {
    flex: 1,
    borderWidth: 1,
    borderColor: "rgba(26, 26, 20, 0.08)",
    backgroundColor: "#fffdf7",
    padding: 20,
    justifyContent: "center",
    gap: 8,
  },
  cardTitle: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: "700",
    color: "#1a1a14",
  },
  cardCopy: {
    fontSize: 16,
    lineHeight: 24,
    color: "#514735",
  },
  tabBar: {
    flexDirection: "row",
    gap: 10,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "rgba(26, 26, 20, 0.1)",
    backgroundColor: "#efe6d4",
  },
  tabActive: {
    backgroundColor: "#1f1d17",
    borderColor: "#1f1d17",
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#463d2c",
  },
  tabLabelActive: {
    color: "#faf6ed",
  },
},);
