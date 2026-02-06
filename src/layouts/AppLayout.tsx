import { Outlet } from "react-router-dom";
import { Sidebar } from "@/layouts/components/Sidebar";
import { Header } from "@/layouts/components/Header";
import { Footer } from "@/layouts/components/Footer";

export function AppLayout() {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <Header />
        <main className="flex-1 px-6 py-6">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
}
