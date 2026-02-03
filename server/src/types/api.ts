export interface ApiResponse<T> {
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  statusCode: number;
}

export interface AuthResponse {
  session: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
  };
  user: {
    id: string;
    email: string;
  };
}

export interface UserProfile {
  id: string;
  email: string;
  company_name?: string;
  created_at: string;
  updated_at: string;
}
