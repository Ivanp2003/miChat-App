import Ionicons from "@expo/vector-icons/Ionicons";
import { useAuthStore } from "@features/auth/presentation/store/authStore";
import { Message } from "@features/chat/domain/entities/Message";
import { useChat } from "@features/chat/presentation/hooks/useChat";
import { useTheme } from "@shared/infrastructure/theme/useTheme";
import {
    EmptyState,
    LoadingState,
} from "@shared/presentation/components/LoadingState";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";

export default function ChatScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const { messages, sendMessage, isLoading } = useChat(roomId);
  const user = useAuthStore((s) => s.user);
  const { colors } = useTheme();
  const [input, setInput] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (messages.length > 0) listRef.current?.scrollToEnd({ animated: true });
  }, [messages.length]);

  const handleSend = useCallback(async () => {
    if (!input.trim() && !selectedImage) return;
    setIsUploading(true);
    try {
      await sendMessage(input.trim(), selectedImage || undefined);
      setInput("");
      setSelectedImage(null);
    } catch (err: any) {
      const message = err?.message || "No se pudo enviar el mensaje";
      Alert.alert("Error", message);
    } finally {
      setIsUploading(false);
    }
  }, [input, selectedImage, sendMessage]);

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0].uri) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
  };

  const renderMsg = ({ item, index }: { item: Message; index: number }) => {
    const isOwn = item.userId === user?.id;
    return (
      <Animated.View
        entering={FadeInUp.delay(Math.min(index * 50, 500)).springify()}
      >
        <View style={[styles.row, isOwn && styles.rowOwn]}>
          {!isOwn && (
            <View style={[styles.avatar, { backgroundColor: colors.card }]}>
              <Ionicons name="person" size={20} color={colors.primary} />
            </View>
          )}
          <View
            style={[
              styles.bubble,
              isOwn ? styles.own : styles.other,
              isOwn && { backgroundColor: colors.primary },
              !isOwn && {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            {!isOwn && (
              <Text style={[styles.author, { color: colors.primary }]}>
                {item.authorUsername}
              </Text>
            )}
            {item.imageUrl && (
              <Animated.Image
                source={{ uri: item.imageUrl }}
                style={styles.messageImage}
                resizeMode="cover"
                entering={FadeIn}
              />
            )}
            {item.content && (
              <Text
                style={[
                  styles.text,
                  isOwn && styles.textOwn,
                  !isOwn && { color: colors.text },
                ]}
              >
                {item.content}
              </Text>
            )}
            <View style={styles.timeRow}>
              <Text
                style={[styles.time, !isOwn && { color: colors.placeholder }]}
              >
                {item.createdAt.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
              {isOwn && (
                <Ionicons
                  name="checkmark-done"
                  size={14}
                  color="rgba(255,255,255,0.7)"
                />
              )}
            </View>
          </View>
        </View>
      </Animated.View>
    );
  };

  if (isLoading) {
    return (
      <LoadingState message="Cargando mensajes..." color={colors.primary} />
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m, i) => `${m.id}-${i}`}
        renderItem={renderMsg}
        contentContainerStyle={
          messages.length === 0 ? { flex: 1 } : { padding: 12 }
        }
        ListEmptyComponent={
          <EmptyState
            icon="chatbubble-outline"
            title="Sin mensajes aún"
            subtitle="Sé el primero en escribir algo"
          />
        }
      />
      {selectedImage && (
        <Animated.View entering={FadeInUp}>
          <View
            style={[
              styles.imagePreview,
              { backgroundColor: colors.card, borderTopColor: colors.border },
            ]}
          >
            <Image
              source={{ uri: selectedImage }}
              style={styles.previewImage}
            />
            <TouchableOpacity
              style={[styles.removeImageBtn, { backgroundColor: colors.error }]}
              onPress={handleRemoveImage}
            >
              <Ionicons name="close" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
      <View
        style={[
          styles.inputRow,
          { backgroundColor: colors.card, borderTopColor: colors.border },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.attachBtn,
            { backgroundColor: colors.inputBackground },
          ]}
          onPress={handlePickImage}
          disabled={isUploading}
        >
          <Ionicons name="image" size={20} color={colors.primary} />
        </TouchableOpacity>
        <TextInput
          style={[
            styles.input,
            { color: colors.text, backgroundColor: colors.inputBackground },
          ]}
          value={input}
          onChangeText={setInput}
          placeholder="Escribe un mensaje..."
          placeholderTextColor={colors.placeholder}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[
            styles.sendBtn,
            { backgroundColor: colors.primary },
            !input.trim() && !selectedImage && { opacity: 0.5 },
          ]}
          onPress={handleSend}
          disabled={(!input.trim() && !selectedImage) || isUploading}
        >
          {isUploading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="send" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafafa" },
  row: { flexDirection: "row", marginVertical: 4, alignItems: "flex-end" },
  rowOwn: { justifyContent: "flex-end" },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginBottom: 8,
  },
  imagePreview: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderTopWidth: 1,
  },
  previewImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  removeImageBtn: {
    position: "absolute",
    top: 8,
    left: 56,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  attachBtn: {
    width: 44,
    height: 44,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#eef2ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  bubble: { maxWidth: "75%", borderRadius: 16, padding: 12 },
  own: { backgroundColor: "#6366f1", borderBottomRightRadius: 4 },
  other: {
    backgroundColor: "#fff",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  author: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6366f1",
    marginBottom: 4,
  },
  text: { fontSize: 15, color: "#1f2937", lineHeight: 20 },
  textOwn: { color: "#fff" },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 4,
  },
  time: { fontSize: 11, color: "rgba(255,255,255,0.7)" },
  inputRow: {
    flexDirection: "row",
    padding: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#e5e7eb",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    backgroundColor: "#fafafa",
    fontSize: 16,
  },
  sendBtn: {
    marginLeft: 8,
    backgroundColor: "#6366f1",
    borderRadius: 24,
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
});
