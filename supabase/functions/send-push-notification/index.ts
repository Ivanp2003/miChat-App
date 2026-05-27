import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EXPO_PUSH_ENDPOINT = "https://exp.host/--/api/v2/push/send";

interface RequestBody {
  roomId: string;
  userId: string;
  content: string;
  authorUsername: string;
}

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(
      JSON.stringify({ error: "Missing Supabase credentials" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { roomId, userId, content, authorUsername }: RequestBody = await req.json();

    if (!roomId || !userId || !content || !authorUsername) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get all participants except the sender
    const { data: participants, error: participantsError } = await supabase
      .from("room_participants")
      .select("user_id")
      .eq("room_id", roomId)
      .neq("user_id", userId);

    if (participantsError) {
      console.error("Error fetching participants:", participantsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch participants" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!participants || participants.length === 0) {
      return new Response(
        JSON.stringify({ message: "No other participants in room" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    const participantIds = participants.map((p) => p.user_id);

    // Get push tokens for all participants
    const { data: tokens, error: tokensError } = await supabase
      .from("push_tokens")
      .select("token")
      .in("user_id", participantIds);

    if (tokensError) {
      console.error("Error fetching tokens:", tokensError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch push tokens" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ message: "No push tokens found for participants" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    const pushTokens = tokens.map((t) => t.token);

    // Prepare messages for Expo Push API
    const messages = pushTokens.map((token) => ({
      to: token,
      sound: "default",
      title: `${authorUsername}`,
      body: content,
      data: { roomId },
    }));

    // Send notifications
    const response = await fetch(EXPO_PUSH_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Expo Push API error:", errorData);
      return new Response(
        JSON.stringify({ error: "Failed to send push notifications" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ message: "Notifications sent successfully" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
