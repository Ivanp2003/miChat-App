import { useAuth } from "@features/auth/presentation/hooks/useAuth";
import { useTheme } from "@shared/infrastructure/theme/useTheme";
import { Stack } from "expo-router";
import { Text, TouchableOpacity } from "react-native";

export default function AppLayout() {
  const { logout } = useAuth();
  const { colors, theme } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.header },
        headerTintColor: theme === "dark" ? "#f1f5f9" : "#0f172a",
        headerTitleStyle: { fontWeight: "bold" },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Salas de Chat",
          headerRight: () => (
            <TouchableOpacity onPress={logout} style={{ marginRight: 4 }}>
              <Text
                style={{
                  color: theme === "dark" ? "#f1f5f9" : "#0f172a",
                  fontSize: 14,
                }}
              >
                Salir
              </Text>
            </TouchableOpacity>
          ),
        }}
      />
      <Stack.Screen name="chat/[roomId]" options={{ title: "Chat" }} />
    </Stack>
  );
}
