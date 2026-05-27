-- Fase 1: Fundamentos (no destructivo)
-- 1) Roles en profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS role TEXT;

-- Asignar default y normalizar valores nulos
ALTER TABLE profiles ALTER COLUMN role SET DEFAULT 'cliente';
UPDATE profiles SET role = 'cliente' WHERE role IS NULL;

-- Restringir valores válidos y NOT NULL (solo si aún no existe la constraint)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_role_check'
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_role_check CHECK (role IN ('cliente','vendedor'));
  END IF;
END$$;

ALTER TABLE profiles ALTER COLUMN role SET NOT NULL;

-- 2) room_participants (usa tabla existente rooms)
CREATE TABLE IF NOT EXISTS room_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT now(),
  last_read_at TIMESTAMPTZ,
  UNIQUE(room_id, user_id)
);

-- 3) unread_messages (tracking de no leídos)
CREATE TABLE IF NOT EXISTS unread_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(room_id, user_id, message_id)
);

-- 4) push_tokens (Expo Push)
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  device_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, token)
);

-- 5) Índices
CREATE INDEX IF NOT EXISTS idx_room_participants_user ON room_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_unread_user_room ON unread_messages(user_id, room_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_room_created ON messages(room_id, created_at);

-- 6) RLS en nuevas tablas solamente (para no romper lógica existente)
ALTER TABLE room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE unread_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- Policies room_participants
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'room_participants' AND policyname = 'Select own participations'
  ) THEN
    CREATE POLICY "Select own participations" ON room_participants
      FOR SELECT TO authenticated
      USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'room_participants' AND policyname = 'Insert own participation'
  ) THEN
    CREATE POLICY "Insert own participation" ON room_participants
      FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'room_participants' AND policyname = 'Update own participation'
  ) THEN
    CREATE POLICY "Update own participation" ON room_participants
      FOR UPDATE TO authenticated
      USING (user_id = auth.uid());
  END IF;
END$$;

-- Policies unread_messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'unread_messages' AND policyname = 'Select own unread'
  ) THEN
    CREATE POLICY "Select own unread" ON unread_messages
      FOR SELECT TO authenticated
      USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'unread_messages' AND policyname = 'Insert own unread'
  ) THEN
    CREATE POLICY "Insert own unread" ON unread_messages
      FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;
END$$;

-- Policies push_tokens
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'push_tokens' AND policyname = 'Select own tokens'
  ) THEN
    CREATE POLICY "Select own tokens" ON push_tokens
      FOR SELECT TO authenticated
      USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'push_tokens' AND policyname = 'Insert own tokens'
  ) THEN
    CREATE POLICY "Insert own tokens" ON push_tokens
      FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'push_tokens' AND policyname = 'Delete own tokens'
  ) THEN
    CREATE POLICY "Delete own tokens" ON push_tokens
      FOR DELETE TO authenticated
      USING (user_id = auth.uid());
  END IF;
END$$;
