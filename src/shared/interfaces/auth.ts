export interface AuthCreationResponse {
  user: any;
  accessToken: string;
  refreshToken: string;
}

export interface AuthLoginResponse {
  user: any;
  accessToken: string;
  refreshToken?: string | null;
}

export interface RefreshTokenResponse {
  accessToken: string;
}
