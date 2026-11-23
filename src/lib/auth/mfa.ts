import "server-only";
import { Secret, TOTP } from "otpauth";
import QRCode from "qrcode";
import { brand } from "@/config/brand";

export function newTotpSecret() {
  return new Secret({ size: 20 }).base32;
}

function totp(secretBase32: string, label: string) {
  return new TOTP({ issuer: brand.name, label, algorithm: "SHA1", digits: 6, period: 30, secret: Secret.fromBase32(secretBase32) });
}

export function verifyTotp(secretBase32: string, code: string): boolean {
  const clean = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(clean)) return false;
  return totp(secretBase32, "x").validate({ token: clean, window: 1 }) !== null;
}

export async function totpQr(secretBase32: string, email: string) {
  const uri = totp(secretBase32, email).toString();
  return { uri, dataUrl: await QRCode.toDataURL(uri, { margin: 1, width: 220, color: { dark: "#2C1F18", light: "#F7F2EB" } }) };
}
