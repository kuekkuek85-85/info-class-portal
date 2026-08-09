import { guard, ok } from "@/lib/api";
import { clearStudentSession } from "@/lib/session";

export async function POST() {
  return guard(async () => {
    await clearStudentSession();
    return ok();
  });
}
