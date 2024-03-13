export enum UserVerifyStatus {
  Unverified, // chưa xác thực email, mặc định = 0
  Verified, // đã xác thực email
  Banned // bị khóa
}
export enum TokenType {
  AccessToken, //0
  RefreshToken, //1
  ForgotPasswordToken, //2
  EmailVerificationToken //3
}

export enum MediaType {
  Image, //0
  Video //1
}
