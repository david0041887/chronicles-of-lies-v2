import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { eraProgress: true },
  });
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    redirect("/home");
  }
  return user;
}

/**
 * Gate for main game pages. Redirects to /welcome if the user
 * has not yet completed the opening ritual.
 * Admins bypass the gate (so they can test any page directly).
 */
export async function requireOnboarded() {
  const user = await requireUser();
  if (user.role === "ADMIN") return user;
  const reward = await prisma.startingReward.findUnique({
    where: { userId: user.id },
    select: { claimedAt: true },
  });
  if (!reward?.claimedAt) redirect("/welcome");
  return user;
}
