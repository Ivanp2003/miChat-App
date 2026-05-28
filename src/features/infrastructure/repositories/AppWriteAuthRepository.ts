import { User } from "@features/auth/domain/entities/User";
import { IAuthRepository } from "@features/auth/domain/repositorires/IAuthRepository";
import {
    account,
    APPWRITE_CONFIG,
    databases,
} from "@shared/infrastructure/appwrite/client";
import { ID } from "appwrite";

export class AppWriteAuthRepository implements IAuthRepository {
  async login(email: string, password: string): Promise<User> {
    await account.createEmailPasswordSession(email, password);
    const user = await account.get();

    // Obtener perfil de la colección profiles
    const profile = await databases.getDocument(
      APPWRITE_CONFIG.DATABASE_ID,
      APPWRITE_CONFIG.COLLECTIONS.PROFILES,
      user.$id,
    );

    return {
      id: user.$id,
      email: user.email,
      username: profile.username,
      role: profile.role as User["role"],
      avatarUrl: profile.avatar_url,
    };
  }

  async register(
    email: string,
    password: string,
    username: string,
    role: "cliente" | "vendedor",
  ): Promise<User> {
    const user = await account.create(ID.unique(), email, password, username);

    // Crear perfil en la colección profiles
    await databases.createDocument(
      APPWRITE_CONFIG.DATABASE_ID,
      APPWRITE_CONFIG.COLLECTIONS.PROFILES,
      user.$id,
      {
        id: user.$id,
        username,
        email: user.email,
        role,
        avatar_url: null,
      },
    );

    return {
      id: user.$id,
      email: user.email,
      username,
      role,
      avatarUrl: undefined,
    };
  }

  async logout(): Promise<void> {
    await account.deleteSession("current");
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const user = await account.get();

      // Obtener perfil de la colección profiles
      const profile = await databases.getDocument(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.COLLECTIONS.PROFILES,
        user.$id,
      );

      return {
        id: user.$id,
        email: user.email,
        username: profile.username,
        role: profile.role as User["role"],
        avatarUrl: profile.avatar_url,
      };
    } catch {
      return null;
    }
  }
}
