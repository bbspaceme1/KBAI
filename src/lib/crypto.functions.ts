/**
 * Cryptographic utilities for password & recovery code hashing
 * Uses the Web Crypto API for browser/server-safe cryptographic helpers.
 */

/**
 * Generate a random salt for hashing
 */
function generateSalt(): string {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  return Array.from(salt)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Hash a recovery code using PBKDF2 with SHA-256
 * Returns: "salt$hash" format for easy storage and verification
 */
export async function hashRecoveryCode(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = Array.from(salt)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const keyMaterial = await crypto.subtle.importKey("raw", encoder.encode(code), "PBKDF2", false, [
    "deriveBits",
  ]);
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt,
      iterations: 100_000,
    },
    keyMaterial,
    256,
  );

  const hashHex = Array.from(new Uint8Array(derivedBits))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return `${saltHex}$${hashHex}`;
}

/**
 * Verify a recovery code against a stored hash in constant time
 */
export async function verifyRecoveryCode(code: string, storedHash: string): Promise<boolean> {
  const [saltHex, expectedHash] = storedHash.split("$");
  if (!saltHex || !expectedHash) return false;

  const saltBytes = new Uint8Array(
    saltHex.match(/.{2}/g)?.map((chunk) => parseInt(chunk, 16)) ?? [],
  );
  const encoder = new TextEncoder();

  const keyMaterial = await crypto.subtle.importKey("raw", encoder.encode(code), "PBKDF2", false, [
    "deriveBits",
  ]);
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: saltBytes,
      iterations: 100_000,
    },
    keyMaterial,
    256,
  );

  const computedHash = new Uint8Array(derivedBits);
  const expectedHashBytes = new Uint8Array(
    expectedHash.match(/.{2}/g)?.map((chunk) => parseInt(chunk, 16)) ?? [],
  );
  if (computedHash.length !== expectedHashBytes.length) return false;

  let diff = 0;
  for (let i = 0; i < computedHash.length; i += 1) {
    diff |= computedHash[i] ^ expectedHashBytes[i];
  }

  return diff === 0;
}
