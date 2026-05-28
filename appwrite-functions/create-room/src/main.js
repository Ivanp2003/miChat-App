const { Client, Databases, ID, Permission, Query, Role } = require('node-appwrite');

module.exports = async function (context) {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(context.req.headers['x-appwrite-trigger-jwt'] || process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);

  const { name, createdBy, participantIds } = JSON.parse(context.req.body);

  try {
    const roomId = ID.unique();

    // Construir permisos para TODOS los participantes (server-side, funciona con API Key)
    const docPermissions = participantIds.map((id) =>
      Permission.read(Role.user(id)),
    );
    docPermissions.push(
      ...participantIds.map((id) => Permission.write(Role.user(id))),
    );

    // Obtener perfiles para desnormalizar
    const participants = await databases.listDocuments(
      process.env.APPWRITE_DATABASE_ID,
      process.env.APPWRITE_PROFILES_COLLECTION_ID,
      [Query.equal('$id', participantIds.join(','))]
    );

    const roomData = {
      name,
      created_by: createdBy,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      participant_ids: participantIds,
      participant_details: JSON.stringify(
        participants.documents.map((p) => ({
          id: p.$id,
          username: p.username,
          avatar_url: p.avatar_url,
        })),
      ),
    };

    const doc = await databases.createDocument(
      process.env.APPWRITE_DATABASE_ID,
      process.env.APPWRITE_ROOMS_COLLECTION_ID,
      roomId,
      roomData,
      docPermissions,
    );

    return context.res.json({
      success: true,
      room: {
        id: doc.$id,
        name: doc.name,
        createdBy: doc.created_by,
        createdAt: doc.created_at,
        unreadCount: 0,
      },
    });
  } catch (err) {
    context.error('Error creating room:', err.message);
    return context.res.json({ success: false, error: err.message });
  }
};
