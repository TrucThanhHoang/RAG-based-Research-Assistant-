export type User = {
  id: string;
  email: string;
  full_name: string;
  is_admin: boolean;
  is_active: boolean;
};

export type TokenResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
};

export type Document = {
  id: string;
  owner_user_id: string;
  filename: string;
  file_path: string;
  file_hash: string;
  status: string;
  chunk_count: number;
  metadata_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type Citation = {
  document_id: string;
  filename: string;
  chunk_index: number;
  page?: number | null;
  score?: number | null;
  snippet: string;
};

export type TokenSavings = {
  tokens_used: number;
  pdf_tokens_full: number;
  tokens_saved: number;
  savings_pct: number;
};

export type ChatResponse = {
  session_id: string;
  answer: string;
  citations: Citation[];
  savings?: TokenSavings | null;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  created_at: string;
};

export type ChatSession = {
  id: string;
  title: string;
  created_at: string;
  messages?: ChatMessage[];
};
