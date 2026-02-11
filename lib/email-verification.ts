/**
 * Email verification code storage
 * In production, this should use Redis or a database
 */

interface VerificationData {
  code: string;
  email: string;
  expires: number;
}

// Store verification codes in memory
const verificationCodes = new Map<string, VerificationData>();

// Cleanup expired codes every 10 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of verificationCodes.entries()) {
      if (now > value.expires) {
        verificationCodes.delete(key);
      }
    }
  }, 10 * 60 * 1000);
}

export function storeVerificationCode(
  userId: string,
  code: string,
  email: string,
  expiresInMinutes: number = 15
): void {
  const expires = Date.now() + expiresInMinutes * 60 * 1000;
  verificationCodes.set(userId, { code, email, expires });
}

export function getVerificationCode(userId: string): VerificationData | undefined {
  return verificationCodes.get(userId);
}

export function deleteVerificationCode(userId: string): void {
  verificationCodes.delete(userId);
}

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
