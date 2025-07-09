import React from 'react';
import { Tabs } from "expo-router";

export default function Layout() {
  return (
    <Tabs>
      <Tabs.Screen name="home" options={{ headerShown: false, tabBarLabel: "Home" }} />
      <Tabs.Screen name="wallet" options={{ headerShown: false, tabBarLabel: "Wallet" }} />
      <Tabs.Screen name="explore" options={{ headerShown: false, tabBarLabel: "Explore" }} />
      <Tabs.Screen name="profile" options={{ headerShown: false, tabBarLabel: "Profile" }} />
    </Tabs>
  );
}
