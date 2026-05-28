const { Client, Databases, Messaging } = require('node-appwrite');

module.exports = async function (context) {
  // Inicializar SDK del Servidor con la API Key secreta
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(context.req.headers['x-appwrite-trigger-jwt'] || process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);
  const messaging = new Messaging(client);

  // El payload contiene el mensaje insertado
  const messageDoc = context.req.body;
  const { room_id, user_id, content, $id: messageId } = messageDoc;

  try {
    // 1. Obtener los detalles de la habitación para saber quiénes participan
    const room = await databases.getDocument(
      process.env.APPWRITE_DATABASE_ID,
      process.env.APPWRITE_ROOMS_COLLECTION_ID,
      room_id
    );

    // 2. Filtrar para no enviársela al emisor del mensaje
    const recipients = room.participant_ids.filter(id => id !== user_id);

    if (recipients.length === 0) {
      return context.res.json({ success: true, message: 'No recipients' });
    }

    // 3. Obtener detalles del emisor para el título de la notificación
    const senderProfile = await databases.getDocument(
      process.env.APPWRITE_DATABASE_ID,
      process.env.APPWRITE_PROFILES_COLLECTION_ID,
      user_id
    );

    const senderName = senderProfile.username || 'Usuario';
    const messageBody = content || 'Te han enviado una imagen';

    // 4. Crear unread_messages para cada participante
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

    // 5. Enviar la notificación utilizando el servicio nativo de Appwrite Messaging
    // asociando los IDs de usuario destino (Appwrite se encarga de buscar sus push tokens registrados)
    await messaging.createPush(
      'unique()',                  // messageId
      'Nuevo mensaje de chat',      // título
      `${senderName}: ${messageBody}`, // cuerpo
      [],                          // topics (vacío)
      recipients,                  // targets (IDs de los usuarios en Appwrite Auth)
    );

    return context.res.json({ success: true, recipientsNotified: recipients.length });
  } catch (err) {
    context.error('Error enviando push:', err.message);
    context.error('Error details:', JSON.stringify(err, null, 2));
    return context.res.json({ success: false, error: err.message });
  }
};
