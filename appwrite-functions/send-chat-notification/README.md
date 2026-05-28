# AppWrite Cloud Function: Send Chat Notification

Esta Cloud Function se ejecuta automáticamente cuando se crea un nuevo mensaje en la colección `messages`. Se encarga de:

1. **Crear registros en `unread_messages`** para cada participante (excepto el emisor)
2. **Enviar notificaciones push** a todos los participantes de la sala (excepto el emisor)

## Configuración en AppWrite Console

### 1. Crear la Cloud Function

1. Ve a **Functions** en la consola de AppWrite
2. Haz clic en **Create Function**
3. Nombre: `send-chat-notification`
4. Runtime: **Node.js 18.0** (o superior)
5. Habilita: **Execute on creation** (para que se ejecute automáticamente)

### 2. Configurar Variables de Entorno

En la sección **Settings > Environment Variables** de la función, agrega las siguientes variables:

| Variable | Valor | Descripción |
|----------|-------|-------------|
| `APPWRITE_DATABASE_ID` | Tu Database ID | ID de la base de datos de AppWrite |
| `APPWRITE_PROFILES_COLLECTION_ID` | Tu Profiles Collection ID | ID de la colección profiles |
| `APPWRITE_ROOMS_COLLECTION_ID` | Tu Rooms Collection ID | ID de la colección rooms |
| `APPWRITE_UNREAD_MESSAGES_COLLECTION_ID` | Tu Unread Messages Collection ID | ID de la colección unread_messages |
| `APPWRITE_API_KEY` | Tu API Key con permisos de Database y Messaging | API Key del servidor (no la del cliente) |

**IMPORTANTE**: La API Key debe tener los siguientes permisos:
- `databases.read` (para leer rooms, profiles)
- `databases.write` (para crear unread_messages)
- `messaging.write` (para enviar notificaciones push)

### 3. Configurar el Trigger

En la sección **Settings > Events** de la función, configura el trigger:

- **Event Type**: `databases.*.collections.*.documents.create`
- **Collection ID**: Tu Messages Collection ID
- **Database ID**: Tu Database ID

Esto hará que la función se ejecute automáticamente cada vez que se cree un documento en la colección `messages`.

### 4. Desplegar la Función

Opción A: Desde el código fuente (recomendado)
```bash
cd appwrite-functions/send-chat-notification
npm install
# Luego sube la carpeta completa a AppWrite Console
```

Opción B: Copiar el código directamente
1. Copia el contenido de `src/main.js`
2. Pégalo en el editor de código de AppWrite Console
3. Haz clic en **Deploy**

### 5. Verificar el Despliegue

1. Ve a la pestaña **Logs** de la función
2. Envía un mensaje de prueba en tu app
3. Deberías ver un log con el resultado:
   - Success: `{ success: true, recipientsNotified: 2 }`
   - Error: `{ success: false, error: "..." }`

## Flujo de la Función

1. **Trigger**: Se activa cuando se crea un documento en `messages`
2. **Obtener sala**: Lee el documento de la sala para obtener `participant_ids`
3. **Filtrar destinatarios**: Excluye al emisor del mensaje
4. **Crear unread_messages**: Crea un registro por cada destinatario
5. **Obtener perfil del emisor**: Obtiene el username para el título de la notificación
6. **Enviar push**: Envía notificación a todos los destinatarios usando AppWrite Messaging

## Solución de Problemas

### Error: "Database not found"
- Verifica que `APPWRITE_DATABASE_ID` sea correcto
- Verifica que la API Key tenga permisos de lectura en databases

### Error: "Collection not found"
- Verifica que todos los IDs de colección sean correctos
- Verifica que las colecciones existan en tu base de datos

### Error: "Permission denied"
- Verifica que la API Key tenga los permisos necesarios
- Verifica que los permisos de documento estén configurados correctamente

### Las notificaciones no llegan
- Verifica que los usuarios hayan registrado sus push tokens
- Verifica que FCM/APNs estén configurados correctamente en AppWrite Console
- Revisa los logs de la función para ver si hay errores

## Notas Importantes

- La función usa `node-appwrite` SDK v13.0.0 o superior
- Los push tokens deben estar registrados en la colección `push_tokens` o usando `account.createPushToken()` en el cliente
- La función solo envía notificaciones cuando se crea un mensaje, no cuando se edita o elimina
- Los registros de `unread_messages` se crean automáticamente, pero deben limpiarse cuando el usuario marca la sala como leída
