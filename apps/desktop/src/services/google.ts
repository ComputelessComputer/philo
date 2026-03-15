import { invoke, } from "@tauri-apps/api/core";
import { openUrl, } from "@tauri-apps/plugin-opener";
import { loadSettings, saveSettings, type Settings, } from "./settings";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_CONNECT_TIMEOUT_MS = 180_000;

export const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events.readonly";
export const GOOGLE_GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";

export const GOOGLE_ACCOUNT_SCOPES = [
  "openid",
  "email",
  "profile",
  GOOGLE_CALENDAR_SCOPE,
  GOOGLE_GMAIL_SCOPE,
] as const;

interface GoogleOAuthSession {
  sessionId: string;
  redirectUri: string;
}

interface GoogleOAuthCallback {
  code?: string;
  state?: string;
  error?: string;
}

interface GoogleLegacySessionInput {
  accessToken: string;
  accessTokenExpiresAtMs: number;
  refreshToken: string;
}

interface GoogleOAuthConnectionResult {
  accountEmail: string;
  accessTokenExpiresAtMs: number;
  grantedScopes: string[];
}

interface GoogleAccessTokenResult {
  accessToken: string;
  accessTokenExpiresAtMs: number;
  grantedScopes: string[];
}

export function isGoogleAccountConnected(settings: Settings,) {
  return !!settings.googleAccountEmail.trim();
}

export function hasGoogleAccess(settings: Settings, scope: string,) {
  return settings.googleGrantedScopes.includes(scope,);
}

function toBase64Url(bytes: Uint8Array,) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte,);
  }
  return btoa(binary,)
    .replace(/\+/g, "-",)
    .replace(/\//g, "_",)
    .replace(/=+$/g, "",);
}

function createRandomVerifier(byteLength: number = 32,) {
  const bytes = new Uint8Array(byteLength,);
  crypto.getRandomValues(bytes,);
  return toBase64Url(bytes,);
}

async function createCodeChallenge(verifier: string,) {
  const bytes = new TextEncoder().encode(verifier,);
  const digest = await crypto.subtle.digest("SHA-256", bytes,);
  return toBase64Url(new Uint8Array(digest,),);
}

function buildGrantedScopes(scopes: string[] | undefined,) {
  if (!scopes || scopes.length === 0) return [...GOOGLE_ACCOUNT_SCOPES,];
  return Array.from(
    new Set(
      scopes
        .map((scope,) => scope.trim())
        .filter(Boolean,),
    ),
  );
}

function toExpiryTimestamp(expiresAtMs: number,) {
  if (!Number.isFinite(expiresAtMs,) || expiresAtMs <= 0) return "";
  return new Date(expiresAtMs,).toISOString();
}

function buildLegacySessionInput(settings: Settings,): GoogleLegacySessionInput | null {
  const refreshToken = settings.googleRefreshToken.trim();
  if (!refreshToken) return null;

  const accessTokenExpiresAtMs = settings.googleAccessTokenExpiresAt
    ? new Date(settings.googleAccessTokenExpiresAt,).getTime()
    : 0;

  return {
    accessToken: settings.googleAccessToken.trim(),
    accessTokenExpiresAtMs: Number.isFinite(accessTokenExpiresAtMs,) && accessTokenExpiresAtMs > 0
      ? accessTokenExpiresAtMs
      : 0,
    refreshToken,
  };
}

function buildConnectionPatch(
  clientId: string,
  accessTokenExpiresAtMs: number,
  email: string,
  grantedScopes: string[],
) {
  return {
    googleOAuthClientId: clientId.trim(),
    googleAccessToken: "",
    googleAccessTokenExpiresAt: toExpiryTimestamp(accessTokenExpiresAtMs,),
    googleRefreshToken: "",
    googleAccountEmail: email,
    googleGrantedScopes: buildGrantedScopes(grantedScopes,),
  } satisfies Pick<
    Settings,
    | "googleOAuthClientId"
    | "googleAccessToken"
    | "googleAccessTokenExpiresAt"
    | "googleRefreshToken"
    | "googleAccountEmail"
    | "googleGrantedScopes"
  >;
}

async function saveGoogleFields(currentSettings: Settings, partial: Partial<Settings>,) {
  const nextSettings = { ...currentSettings, ...partial, };
  await saveSettings(nextSettings,);
  return nextSettings;
}

export async function connectGoogleAccount(settings: Settings,) {
  const clientId = settings.googleOAuthClientId.trim();
  if (!clientId) {
    throw new Error("Google sign-in is not configured yet.",);
  }

  const verifier = createRandomVerifier(64,);
  const challenge = await createCodeChallenge(verifier,);
  const state = createRandomVerifier(32,);

  const session = await invoke<GoogleOAuthSession>("start_google_oauth_callback",);
  const authUrl = new URL(GOOGLE_AUTH_URL,);
  authUrl.searchParams.set("access_type", "offline",);
  authUrl.searchParams.set("client_id", clientId,);
  authUrl.searchParams.set("code_challenge", challenge,);
  authUrl.searchParams.set("code_challenge_method", "S256",);
  authUrl.searchParams.set("include_granted_scopes", "true",);
  authUrl.searchParams.set("prompt", "consent",);
  authUrl.searchParams.set("redirect_uri", session.redirectUri,);
  authUrl.searchParams.set("response_type", "code",);
  authUrl.searchParams.set("scope", GOOGLE_ACCOUNT_SCOPES.join(" ",),);
  authUrl.searchParams.set("state", state,);

  await openUrl(authUrl.toString(),);

  const callback = await invoke<GoogleOAuthCallback>("wait_for_google_oauth_callback", {
    sessionId: session.sessionId,
    timeoutMs: GOOGLE_CONNECT_TIMEOUT_MS,
  },);

  if (callback.error) {
    throw new Error(callback.error,);
  }
  if (!callback.code) {
    throw new Error("Google did not return an authorization code.",);
  }
  if (callback.state !== state) {
    throw new Error("Google OAuth state mismatch. Please try again.",);
  }

  const result = await invoke<GoogleOAuthConnectionResult>("complete_google_oauth", {
    input: {
      clientId,
      code: callback.code,
      codeVerifier: verifier,
      legacySession: buildLegacySessionInput(settings,),
      redirectUri: session.redirectUri,
    },
  },);

  return buildConnectionPatch(
    clientId,
    result.accessTokenExpiresAtMs,
    result.accountEmail,
    result.grantedScopes,
  );
}

export async function disconnectGoogleAccount(settings: Settings,) {
  await invoke("clear_google_oauth_session",);
  const next = {
    ...settings,
    googleAccountEmail: "",
    googleAccessToken: "",
    googleRefreshToken: "",
    googleAccessTokenExpiresAt: "",
    googleGrantedScopes: [],
  } satisfies Settings;

  await saveSettings(next,);
  return next;
}

export async function getGoogleAccessToken() {
  const settings = await loadSettings();
  const clientId = settings.googleOAuthClientId.trim();
  if (!clientId) {
    throw new Error("Reconnect Google to refresh access.",);
  }

  const result = await invoke<GoogleAccessTokenResult>("ensure_google_access_token", {
    input: {
      clientId,
      grantedScopes: [...settings.googleGrantedScopes,],
      legacySession: buildLegacySessionInput(settings,),
    },
  },);
  await saveGoogleFields(
    settings,
    buildConnectionPatch(
      clientId,
      result.accessTokenExpiresAtMs,
      settings.googleAccountEmail.trim(),
      result.grantedScopes,
    ),
  );
  return result.accessToken;
}
