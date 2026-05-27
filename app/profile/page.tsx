import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getProfileAxes } from "@/lib/profile/repository";
import ProfileForm from "./profile-form";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }
  const axes = await getProfileAxes(session.user.id);
  return <ProfileForm initial={axes} />;
}
