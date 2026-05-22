import { auth } from "@/auth";
import { Sidebar } from "@/components/shared/sidebar";
import { Navbar } from "@/components/shared/navbar";
import { NavigationProgress } from "@/components/shared/navigation-progress";
import { PageTransition } from "@/components/shared/page-transition";

export default async function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const user = session?.user
    ? { name: session.user.name ?? "", email: session.user.email ?? "", role: session.user.role as string }
    : null;
  const role = (session?.user?.role ?? "user") as "admin" | "user";

  return (
    <div className="h-full flex flex-col isolate">
      <NavigationProgress />
      <Navbar user={user} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar role={role} />
        <main id="main-scroll" className="flex-1 overflow-y-auto">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
