import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/app/api/lib/cacheUser";

export async function requireDbUser() {
  const { userId } = await auth();
  if (!userId) {
    return {
      error: NextResponse.json({ message: "Unauthorized" }, { status: 401 }),
    } as const;
  }
  const dbUser = await getAuthenticatedUser(userId);
  if (!dbUser) {
    return {
      error: NextResponse.json({ message: "User not found" }, { status: 404 }),
    } as const;
  }
  return { dbUser } as const;
}
