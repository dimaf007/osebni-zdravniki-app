export interface RequestPasswordResetResponse {
  success: boolean;
  message: string;
  resetCode?: string;
}

export interface ResetPasswordResponse {
  success: boolean;
  message: string;
}