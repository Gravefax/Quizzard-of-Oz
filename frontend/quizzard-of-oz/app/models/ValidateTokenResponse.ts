export default interface ValidateTokenResponse {
    valid: boolean;
    sub: string | null;
    email: string | null;
    email_verified: boolean;
}