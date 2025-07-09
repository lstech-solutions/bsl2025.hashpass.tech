import { Tabs } from "expo-router";

export default function Layout() {
  return (
    <Tabs>
      <Tabs.Screen name="home" options={{ headerShown: false, tabBarLabel: "Home" }} />
      <Tabs.Screen name="wallet" options={{ tabBarLabel: "Wallet" }} />
      <Tabs.Screen name="events" options={{ tabBarLabel: "Events" }} />
      <Tabs.Screen name="profile" options={{ tabBarLabel: "Profile" }} />
    </Tabs>
  );
}
