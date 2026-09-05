import type { UserProfile } from "../types";

type GoogleCredentialPayload = {
  name?: string;
  email?: string;
  picture?: string;
};

function decodeBase64(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return decodeURIComponent(
    Array.from(atob(padded))
      .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`)
      .join("")
  );
}

export function decodeGoogleCredential(credential: string): UserProfile {
  const parts = credential.split(".");
  if (parts.length !== 3) throw new Error("Invalid Google credential.");

  const payload = JSON.parse(decodeBase64(parts[1])) as GoogleCredentialPayload;

  if (!payload.email || !payload.name) {
    throw new Error("Google account information is incomplete.");
  }

  return {
    name: payload.name,
    email: payload.email,
    picture: payload.picture || "",
  };
}
