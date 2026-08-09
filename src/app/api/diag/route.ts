/**
 * 배포 환경 진단용 임시 라우트.
 *
 * Vercel 런타임 로그를 볼 수 없는 상황에서 원인을 좁히기 위한 것이다. firebase-admin 을
 * 정적 import 하면 모듈 로드 실패 시 함수가 응답 없이 죽어(500 · 빈 본문) 이유를 알 수 없다.
 * 여기서는 동적 import 로 감싸 에러 메시지를 본문에 담아 돌려준다.
 *
 * 값은 절대 내보내지 않는다 — 존재 여부와 길이만 본다.
 * 원인 확인이 끝나면 이 파일은 삭제한다.
 */

const ENV_KEYS = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
  "FIREBASE_PROJECT_ID",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY",
  "SESSION_SECRET",
  "TEACHER_EMAILS",
] as const;

function describe(error: unknown): string {
  if (error instanceof Error) {
    const code = (error as { code?: string }).code;
    return `${error.name}${code ? `(${code})` : ""}: ${error.message}`.slice(0, 500);
  }
  return String(error).slice(0, 500);
}

export async function GET() {
  const env: Record<string, string> = {};
  for (const key of ENV_KEYS) {
    const value = process.env[key];
    env[key] = value ? `설정됨 (${value.length}자)` : "없음";
  }

  // 모듈 이름을 변수로 넘기면 번들러가 정적 분석을 못 한다. 리터럴로 하나씩 시도한다.
  const imports: Record<string, string> = {};
  const attempt = async (name: string, load: () => Promise<unknown>) => {
    try {
      await load();
      imports[name] = "ok";
    } catch (error) {
      imports[name] = describe(error);
    }
  };

  await attempt("firebase-admin/app", () => import("firebase-admin/app"));
  await attempt("firebase-admin/auth", () => import("firebase-admin/auth"));
  await attempt("firebase-admin/firestore", () => import("firebase-admin/firestore"));
  await attempt("@google-cloud/firestore", () => import("@google-cloud/firestore"));
  await attempt("@grpc/grpc-js", () => import("@grpc/grpc-js"));
  await attempt("jose", () => import("jose"));

  // 개인키의 개행이 살아 있는지 (Vercel 입력창에서 흔히 깨지는 지점)
  const rawKey = process.env.FIREBASE_PRIVATE_KEY ?? "";
  const keyShape = {
    hasHeader: rawKey.includes("BEGIN PRIVATE KEY"),
    hasEscapedNewline: rawKey.includes("\\n"),
    hasRealNewline: rawKey.includes("\n"),
    wrappedInQuotes: /^["']|["']$/.test(rawKey),
  };

  let firestore = "시도 안 함";
  if (imports["firebase-admin/app"] === "ok" && imports["firebase-admin/firestore"] === "ok") {
    try {
      const { cert, getApps, initializeApp } = await import("firebase-admin/app");
      const { getFirestore } = await import("firebase-admin/firestore");
      const name = "diag";
      const app =
        getApps().find((a) => a.name === name) ??
        initializeApp(
          {
            credential: cert({
              projectId: process.env.FIREBASE_PROJECT_ID!,
              clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
              privateKey: rawKey.replace(/^["']|["']$/g, "").replace(/\\n/g, "\n"),
            }),
          },
          name,
        );
      const snap = await getFirestore(app).collection("classSessions").limit(1).get();
      firestore = `ok (문서 ${snap.size}건 읽음)`;
    } catch (error) {
      firestore = describe(error);
    }
  }

  return Response.json({
    node: process.version,
    runtime: process.env.NEXT_RUNTIME ?? "(미지정)",
    region: process.env.VERCEL_REGION ?? "(로컬)",
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "(로컬)",
    env,
    keyShape,
    imports,
    firestore,
  });
}
