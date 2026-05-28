const { Client, Databases, Query } = require('node-appwrite');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

module.exports = async function (context) {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(context.req.headers['x-appwrite-trigger-jwt'] || process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);

  const messageDoc = context.req.body;
  const { room_id, user_id, content, $id: messageId } = messageDoc;

  try {
    const room = await databases.getDocument(
      process.env.APPWRITE_DATABASE_ID,
      process.env.APPWRITE_ROOMS_COLLECTION_ID,
      room_id
    );

    const recipients = room.participant_ids.filter(id => id !== user_id);

    if (recipients.length === 0) {
      return context.res.json({ success: true, message: 'No recipients' });
    }

    const senderProfile = await databases.getDocument(
      process.env.APPWRITE_DATABASE_ID,
      process.env.APPWRITE_PROFILES_COLLECTION_ID,
      user_id
    );

    const senderName = senderProfile.username || 'Usuario';
    const messageBody = content || 'Te han enviado una imagen';

    // Crear unread_messages para cada participante
    for (const recipientId of recipients) {
      await databases.createDocument(
        process.env.APPWRITE_DATABASE_ID,
        process.env.APPWRITE_UNREAD_MESSAGES_COLLECTION_ID,
        'unique()',
        {
          room_id: room_id,
          user_id: recipientId,
          message_id: messageId,
          created_at: new Date().toISOString(),
        }
      );
    }

    // Obtener los Expo Push Tokens de los destinatarios
    const pushTokensResp = await databases.listDocuments(
      process.env.APPWRITE_DATABASE_ID,
      process.env.APPWRITE_PUSH_TOKENS_COLLECTION_ID,
      [Query.equal('user_id', recipients)]
    );

    // Enviar push notifications directamente a Expo Push API
    // By-passeeamos Appwrite Messaging porque no soporta Expo Push Tokens nativamente
    const pushMessages = pushTokensResp.documents.map((doc) => ({
      to: doc.token,
      title: 'Nuevo mensaje',
      body: `${senderName}: ${messageBody}`,
      data: {
        type: 'new_message',
        roomId: room_id,
        messageId: messageId,
        authorUsername: senderName,
      },
      sound: 'default',
      priority: 'high',
    }));

    if (pushMessages.length > 0) {
      const expoResponse = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pushMessages),
      });

      const expoResult = await expoResponse.json();
      context.log('Expo Push API response:', JSON.stringify(expoResult));
    }

    return context.res.json({
      success: true,
      recipientsNotified: recipients.length,
      pushSent: pushMessages.length,
    });
  } catch (err) {
    context.error('Error:', err.message);
    context.error('Details:', JSON.stringify(err, null, 2));
    return context.res.json({ success: false, error: err.message });
  }
};
