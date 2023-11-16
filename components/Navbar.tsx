import { UserButton, auth } from "@clerk/nextjs";
import { StoreSwitcher } from "@/components/StoreSwitcher";
import { MainNav } from "@/components/MainNav";
import { redirect } from "next/navigation";
import prismadb from "@/lib/prismadb";
export async function Navbar() {
  const { userId } = auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const stores = await prismadb.store.findMany({
    where: {
      userId,
    },
  });
  return (
    <div className="border-b">
      <div className="flex h-16 items-center gap-4 px-4">
        <StoreSwitcher items={stores} />
        <MainNav />
        <div className="ml-auto flex items-center space-x-4">
          <UserButton afterSignOutUrl="/" />
        </div>
      </div>
    </div>
  );
}
