import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", to: "/app/dashboard" },
  { label: "Projects", to: "/app/projects" },
  { label: "Settings", to: "/app/settings" },
];

export function Sidebar() {
  return (
    <aside className="hidden w-64 flex-col border-r bg-card px-4 py-6 md:flex">
      <div className="flex items-center gap-2 px-2 text-lg font-semibold">
        <span className="h-8 w-8 rounded-full bg-primary" />
        <span>SEO Autopilot</span>
      </div>
      <nav className="mt-8 flex flex-col gap-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                isActive && "bg-accent text-accent-foreground"
              )
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto rounded-lg bg-muted/50 p-4 text-xs text-muted-foreground">
        Automations run continuously. Monitor your agents and rankings in real time.
      </div>
    </aside>
  );
}
