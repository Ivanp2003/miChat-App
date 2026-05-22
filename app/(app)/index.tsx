import Ionicons from "@expo/vector-icons/Ionicons";
import { Room } from "@features/chat/domain/entities/Message";
import { useRooms } from "@features/chat/presentation/hooks/useRooms";
import { useTheme } from "@shared/infrastructure/theme/useTheme";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

export default function RoomsScreen() {
  const { rooms, isLoading, createRoom, isCreating, createError } = useRooms();
  const router = useRouter();
  const { toggleTheme, theme, colors } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [roomName, setRoomName] = useState("");

  const handleCreate = () => {
    if (!roomName.trim() || isCreating) return;
    createRoom(roomName.trim(), {
      onSuccess: () => {
        setRoomName("");
        setModalVisible(false);
      },
    });
  };

  const renderRoom = ({ item }: { item: Room }) => (
    <TouchableOpacity
      style={[
        styles.roomItem,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
      onPress={() => router.push(`/chat/${item.id}`)}
    >
      <View
        style={[
          styles.roomIconContainer,
          { backgroundColor: colors.inputBackground },
        ]}
      >
        <Ionicons name="chatbubble-outline" size={24} color={colors.primary} />
      </View>
      <View style={styles.roomInfo}>
        <Text style={[styles.roomName, { color: colors.text }]}>
          {item.name}
        </Text>
        <Text style={[styles.roomDate, { color: colors.placeholder }]}>
          {item.createdAt.toLocaleDateString()}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.placeholder} />
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { backgroundColor: colors.header, borderBottomColor: colors.border },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Salas de chat
        </Text>
        <TouchableOpacity onPress={toggleTheme} style={styles.themeToggle}>
          <Ionicons
            name={theme === "light" ? "moon-outline" : "sunny-outline"}
            size={24}
            color={colors.text}
          />
        </TouchableOpacity>
      </View>
      <FlatList
        data={rooms}
        keyExtractor={(r) => r.id}
        renderItem={renderRoom}
        contentContainerStyle={
          rooms.length === 0 ? styles.emptyList : undefined
        }
        ListEmptyComponent={
          <View style={styles.centered}>
            <Ionicons
              name="chatbubbles-outline"
              size={64}
              color={colors.placeholder}
            />
            <Text style={[styles.empty, { color: colors.text }]}>
              No hay salas aún
            </Text>
            <Text style={styles.emptySub}>¡Crea una para comenzar!</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.overlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={() => setModalVisible(false)}
          />
          <View style={[styles.dialog, { backgroundColor: colors.card }]}>
            <Text style={[styles.dialogTitle, { color: colors.text }]}>
              Nueva sala
            </Text>
            {createError && (
              <Text style={styles.dialogError}>{createError}</Text>
            )}
            <TextInput
              style={[
                styles.dialogInput,
                {
                  color: colors.text,
                  backgroundColor: colors.inputBackground,
                  borderColor: colors.border,
                },
              ]}
              placeholder="Nombre de la sala"
              placeholderTextColor={colors.placeholder}
              value={roomName}
              onChangeText={setRoomName}
              autoFocus
              maxLength={50}
            />
            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text
                  style={[styles.cancelText, { color: colors.placeholder }]}
                >
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.createBtn,
                  { backgroundColor: colors.primary },
                  isCreating && { opacity: 0.6 },
                ]}
                onPress={handleCreate}
                disabled={isCreating}
              >
                {isCreating ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.createText}>Crear</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafafa" },
  header: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: "#e5e7eb",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1f2937",
  },
  themeToggle: {
    padding: 8,
  },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyList: { flex: 1 },
  empty: { color: "#6b7280", fontSize: 18, fontWeight: "600", marginTop: 16 },
  emptySub: { color: "#9ca3af", fontSize: 14, marginTop: 4 },
  roomItem: {
    backgroundColor: "#fff",
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  roomIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#eef2ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  roomInfo: { flex: 1 },
  roomName: { fontSize: 16, fontWeight: "600", color: "#1f2937" },
  roomDate: { fontSize: 12, color: "#9ca3af", marginTop: 2 },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 28,
    backgroundColor: "#6366f1",
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 24,
  },
  dialog: { backgroundColor: "#fff", borderRadius: 16, padding: 24 },
  dialogTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 16,
  },
  dialogError: { color: "#ef4444", fontSize: 14, marginBottom: 12 },
  dialogInput: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: "#fafafa",
  },
  dialogActions: { flexDirection: "row", justifyContent: "flex-end", gap: 12 },
  cancelBtn: { padding: 12 },
  cancelText: { color: "#6b7280", fontSize: 15, fontWeight: "500" },
  createBtn: {
    backgroundColor: "#6366f1",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  createText: { color: "#fff", fontWeight: "600", fontSize: 15 },
});
