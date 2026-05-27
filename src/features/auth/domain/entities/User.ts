export interface User {
  id: string;
  email: string;
  username: string;
  role: "cliente" | "vendedor";
  avatarUrl?: string;
}
