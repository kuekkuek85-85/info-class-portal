import "server-only";

import { cert, getApp, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
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

export function adminAuth() {
  return getAuth(adminApp());
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
