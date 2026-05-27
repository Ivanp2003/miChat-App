import Ionicons from "@expo/vector-icons/Ionicons";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

interface LoadingStateProps {
  message?: string;
  color?: string;
}

export function LoadingState({ message = "Cargando...", color = "#6366f1" }: LoadingStateProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={color} />
      {message && <Text style={[styles.message, { color }]}>{message}</Text>}
    </View>
  );
}

export function EmptyState({
  icon = "chatbubbles-outline",
  title = "No hay nada aquí",
  subtitle = "",
}: {
  icon?: string;
  title?: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.container}>
      <Ionicons name={icon as any} size={64} color="#9ca3af" />
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  message: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "500",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#6b7280",
    marginTop: 16,
  },
  subtitle: {
    fontSize: 14,
    color: "#9ca3af",
    marginTop: 4,
    textAlign: "center",
  },
});
