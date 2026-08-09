import "server-only";

import { cert, getApp, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

/**
 * Firebase Admin SDK. 서버에서만 쓴다.
 *
 * 학생 브라우저는 Firestore에 직접 접근하지 않는다. 모든 읽기·쓰기가 이 모듈을 거치는
 * Route Handler를 통과하므로, Firestore 보안 규칙은 전면 차단(firestore.rules)으로 두고
 * Admin SDK만 우회하게 한다. 명렬표가 클라이언트로 통째로 내려가는 사고를 구조적으로 막는다.
 */

const ADMIN_APP_NAME = "info-class-portal-admin";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `환경변수 ${name} 가 설정되지 않았습니다. .env.local (로컬) 또는 Vercel 환경변수를 확인하세요.`,
    );
  }
  return value;
}

/**
 * Vercel 환경변수 입력창은 줄바꿈을 그대로 넣기 어려워 보통 "\n" 문자열로 저장한다.
 * 양끝 따옴표도 함께 벗겨 준다.
 */
function normalizePrivateKey(raw: string): string {
  const unquoted = raw.replace(/^["']|["']$/g, "");
  return unquoted.replace(/\\n/g, "\n");
}

let cachedApp: App | undefined;

function adminApp(): App {
  if (cachedApp) return cachedApp;

  const existing = getApps().find((app) => app.name === ADMIN_APP_NAME);
  if (existing) {
    cachedApp = existing;
    return existing;
  }

  cachedApp = initializeApp(
    {
      credential: cert({
        projectId: requiredEnv("FIREBASE_PROJECT_ID"),
        clientEmail: requiredEnv("FIREBASE_CLIENT_EMAIL"),
        privateKey: normalizePrivateKey(requiredEnv("FIREBASE_PRIVATE_KEY")),
      }),
    },
    ADMIN_APP_NAME,
  );
  return cachedApp;
}

let cachedDb: Firestore | undefined;

export function db(): Firestore {
  if (!cachedDb) {
    cachedDb = getFirestore(adminApp());
    cachedDb.settings({ ignoreUndefinedProperties: true });
  }
  return cachedDb;
}

export interface VerifiedGoogleUser {
  uid: string;
  email: string;
  name: string;
}

/**
 * 교사 Google 로그인 ID 토큰을 검증한다.
 *
 * firebase-admin/auth 를 쓰지 않는다. 그 모듈이 끌어오는 jwks-rsa 는 CommonJS 인데
 * 의존하는 jose 6.x 는 ESM 전용이라, Vercel 함수에서 모듈 로드 자체가 실패한다
 * (ERR_REQUIRE_ESM). firestore 쪽은 멀쩡하므로 auth 만 REST 로 대체했다.
 *
 * Identity Toolkit 의 accounts:lookup 은 토큰 서명·만료·프로젝트 소속을 서버에서 확인해
 * 주므로 검증 강도는 그대로다. 권한 판단(허용 이메일 대조)은 여전히 우리 서버가 한다.
 */
export async function verifyGoogleIdToken(idToken: string): Promise<VerifiedGoogleUser | null> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) {
    throw new Error("환경변수 NEXT_PUBLIC_FIREBASE_API_KEY 가 설정되지 않았습니다.");
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
      cache: "no-store",
    },
  );

  if (!response.ok) return null;

  const data = (await response.json()) as {
    users?: { localId?: string; email?: string; displayName?: string }[];
  };
  const user = data.users?.[0];
  if (!user?.localId || !user.email) return null;

  return { uid: user.localId, email: user.email, name: user.displayName ?? user.email };
}

/** 설정이 끝났는지 (설정 안내 화면 노출 여부 판단용) */
export function isFirebaseConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY,
  );
}

export { getApp };
