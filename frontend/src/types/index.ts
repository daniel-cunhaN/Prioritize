export interface User {
  id: string;
  email: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export interface WishlistItem {
  id: string;
  user_id: string;
  url: string;
  title: string | null;
  image_url: string | null;
  priority: number; // 1 (Urgente/Mais alta) a 5 (Mais baixa)
  created_at: string;
  updated_at?: string;
}

export interface WishlistPayload {
  url: string;
  title: string;
  image_url?: string | null;
  priority: number;
}