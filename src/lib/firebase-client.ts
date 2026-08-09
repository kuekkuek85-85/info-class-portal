"use client";

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { GoogleAuthProvider, getAuth, signInWithPopup, signOut } from "firebase/auth";

/**
 * Firebase 클라이언트 SDK — **교사 Google 로그인 전용**.
 *
 * 학생 화면은 이 모듈을 쓰지 않는다. 학생 동선의 모든 데이터는 서버 Route Handler를 거치므로
 * 학생 브라우저에는 Firebase가 아예 로드되지 않는다. Firestore 보안 규칙을 전면 차단으로
 * 둘 수 있는 이유이자, 명렬표가 클라이언트로 내려갈 경로가 없는 이유다.
 */

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function isClientConfigured(): boolean {
  return Boolean(config.apiKey && config.authDomain && config.projectId);
}

function app(): FirebaseApp {
  if (!isClientConfigured()) {
    throw new Error(
      "Firebase 웹 앱 환경변수(NEXT_PUBLIC_FIREBASE_*)가 설정되지 않았습니다. README의 설정 절차를 확인하세요.",
    );
  }
  return getApps().length > 0 ? getApp() : initializeApp(config);
}

/** Google 로그인 후 ID 토큰을 반환한다. 권한 판단은 서버가 한다. */
export async function signInWithGoogle(): Promise<string> {
  const auth = getAuth(app());
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  const credential = await signInWithPopup(auth, provider);
  return credential.user.getIdToken();
}

export async function signOutGoogle(): Promise<void> {
  if (!isClientConfigured()) return;
  await signOut(getAuth(app())).catch(() => undefined);
}
