import { useState } from "react";
import type { ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Building2,
  LayoutDashboard,
  ListOrdered,
  LogOut,
  Mail,
  MessageSquarePlus,
  Menu,
  Moon,
  PlusCircle,
  Shield,
  ShieldAlert,
  Sun,
  User,
  Users,
  Wallet,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Button, IconButton } from "@/components/ui-kit";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Role } from "@/types";

type NavItem = { label: string; to: string; icon: LucideIcon };

const ADMIN_NAV: NavItem[] = [
  { label: "Dashboard", to: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Users", to: "/admin/users", icon: Users },
  { label: "Invitations", to: "/admin/invitations", icon: Mail },
  { label: "Accounts", to: "/admin/accounts", icon: Building2 },
  { label: "Account Requests", to: "/admin/account-requests", icon: MessageSquarePlus },
  { label: "Transactions", to: "/admin/transactions", icon: ListOrdered },
  { label: "Suspicious Transactions", to: "/admin/suspicious-transactions", icon: ShieldAlert },
  { label: "Profile", to: "/admin/profile", icon: User },
  { label: "Security", to: "/admin/security", icon: Shield },
];

const USER_NAV: NavItem[] = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "My Accounts", to: "/accounts", icon: Wallet },
  { label: "My Transactions", to: "/transactions", icon: ListOrdered },
  { label: "New Transaction", to: "/transactions/new", icon: PlusCircle },
  { label: "Profile", to: "/profile", icon: User },
  { label: "Security", to: "/security", icon: Shield },
];

function NavLinks({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const items = role === "ADMIN" ? ADMIN_NAV : USER_NAV;

  return (
    <nav aria-label="Main navigation" className="flex flex-col gap-[var(--spacing-md)]">
      {items.map((item) => {
        const active = pathname === item.to;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            style={{
              height: "var(--button-height-medium)",
              borderRadius: "var(--radius-sm)",
              paddingInline: "var(--spacing-4xl)",
            }}
            className={cn(
              "flex items-center gap-[var(--spacing-3xl)] text-sm transition-colors",
              active
                ? "bg-[var(--semantic-primary-default)] text-[var(--semantic-text-on-accent)]"
                : "text-[var(--semantic-text-primary)] hover:bg-[var(--semantic-bg-secondary-selected)] hover:text-[var(--semantic-text-secondary)]",
            )}
          >
            <item.icon aria-hidden className="size-4 shrink-0" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function BrandMark({ context = "app" }: { context?: "app" | "auth" }) {
  if (context === "auth") {
    return (
      <div className="flex items-center gap-[var(--spacing-3xl)]">
        <img
          src="/isoguard-mark.svg"
          alt=""
          aria-hidden
          className="size-[var(--button-height-medium)] shrink-0"
        />
        <div className="text-left">
          <p className="text-xl font-bold leading-none tracking-[-0.03em] text-[var(--semantic-text-secondary)]">
            Iso<span className="text-[var(--semantic-primary-default)]">Guard</span>
          </p>
          <p className="mt-[var(--spacing-lg)] text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--semantic-text-primary)]">
            Transaction monitoring
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-[var(--spacing-3xl)]">
      <img src="/isoguard-mark.svg" alt="" aria-hidden className="size-9 shrink-0" />
      <div className="min-w-0">
        <p className="text-base font-bold leading-none tracking-[-0.02em] text-[var(--semantic-text-secondary)]">
          Iso<span className="text-[var(--semantic-primary-default)]">Guard</span>
        </p>
        <p className="mt-[var(--spacing-lg)] truncate text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--semantic-text-primary)]">
          Transaction monitoring
        </p>
      </div>
    </div>
  );
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const nextMode = theme === "dark" ? "light" : "dark";

  return (
    <IconButton
      label={`Switch to ${nextMode} mode`}
      aria-pressed={theme === "light"}
      onClick={toggleTheme}
    >
      {theme === "dark" ? (
        <Sun aria-hidden className="size-4" />
      ) : (
        <Moon aria-hidden className="size-4" />
      )}
    </IconButton>
  );
}

export function AppLayout({
  title,
  description,
  actions,
  hidePageHeader = false,
  lockViewport = false,
  compactBottomPadding = false,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  hidePageHeader?: boolean;
  lockViewport?: boolean;
  compactBottomPadding?: boolean;
  children: ReactNode;
}) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (!user) return null;

  const handleSignOut = async () => {
    await signOut();
    void navigate({ to: "/login", replace: true });
  };

  return (
    <div
      className={cn(
        "flex h-screen flex-col gap-x-[10px] gap-y-[10px] overflow-hidden bg-[var(--semantic-bg-primary)] p-[10px]",
      )}
    >
      <header
        style={{ borderRadius: "var(--radius-md)" }}
        className="app-navigation z-30 flex shrink-0 items-center justify-between gap-[var(--spacing-4xl)] border border-[var(--semantic-bg-outline)] bg-[var(--semantic-bg-secondary)] p-[var(--spacing-4xl)] [box-shadow:0_1px_2px_var(--semantic-surface-shadow)]"
      >
        <div className="flex items-center gap-[var(--spacing-4xl)]">
          <IconButton
            label="Open navigation"
            className="lg:hidden"
            onClick={() => setDrawerOpen(true)}
          >
            <Menu className="size-4" />
          </IconButton>
          <BrandMark />
        </div>

        <div className="flex items-center gap-[var(--spacing-3xl)]">
          <ThemeToggle />
          <div className="hidden text-right sm:block">
            <p className="text-sm text-[var(--semantic-text-secondary)]">{user.fullName}</p>
            <p className="text-xs text-[var(--semantic-text-primary)]">{user.role}</p>
          </div>
          <Link
            to={user.role === "ADMIN" ? "/admin/profile" : "/profile"}
            aria-label="Open profile"
            style={{ borderRadius: "var(--radius-round)" }}
            className="grid size-9 place-items-center bg-[var(--semantic-bg-secondary-selected)] text-xs font-medium text-[var(--semantic-text-secondary)]"
          >
            {initials(user.fullName)}
          </Link>
        </div>
      </header>

      <div className={cn("flex min-h-0 flex-1 gap-x-[10px] gap-y-[10px]")}>
        <aside
          style={{ borderRadius: "var(--radius-md)" }}
          className="app-navigation hidden w-[250px] shrink-0 flex-col justify-between border border-[var(--semantic-bg-outline)] bg-[var(--semantic-bg-secondary)] p-[var(--spacing-5xl)] [box-shadow:0_1px_2px_var(--semantic-surface-shadow)] lg:flex"
        >
          <NavLinks role={user.role} />
          <Button variant="ghost" size="small" onClick={handleSignOut} className="justify-start">
            <LogOut aria-hidden className="size-4" /> Logout
          </Button>
        </aside>

        <main
          style={{ borderRadius: "var(--radius-md)" }}
          className={cn(
            "flex min-w-0 flex-1 flex-col gap-[var(--spacing-7xl)] border border-[var(--semantic-bg-outline)] bg-[var(--semantic-bg-primary)] px-[var(--spacing-6xl)] pt-[var(--spacing-6xl)]",
            compactBottomPadding ? "pb-[var(--spacing-md)]" : "pb-[var(--spacing-6xl)]",
            lockViewport ? "min-h-0 overflow-hidden" : "scrollbar-hidden min-h-0 overflow-y-auto",
          )}
        >
          {!hidePageHeader ? (
            <div className="flex flex-wrap items-start justify-between gap-[var(--spacing-5xl)]">
              <div className="flex flex-col gap-[var(--spacing-lg)]">
                <h1 className="text-2xl font-semibold text-[var(--semantic-text-secondary)]">
                  {title}
                </h1>
                {description ? (
                  <p className="text-sm text-[var(--semantic-text-primary)]">{description}</p>
                ) : null}
              </div>
              {actions ? (
                <div className="flex w-full flex-wrap gap-[var(--spacing-2xl)] sm:w-auto">
                  {actions}
                </div>
              ) : null}
            </div>
          ) : null}
          {children}
        </main>
      </div>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close navigation"
            className="absolute inset-0 bg-[var(--semantic-bg-overlay)]/70"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="app-navigation absolute inset-y-0 left-0 flex w-[250px] flex-col justify-between border-r border-[var(--semantic-bg-outline)] bg-[var(--semantic-bg-secondary)] p-[var(--spacing-6xl)]">
            <div className="flex flex-col gap-[var(--spacing-8xl)]">
              <div className="flex min-w-0 items-start justify-between gap-[var(--spacing-2xl)]">
                <div className="min-w-0 flex-1">
                  <BrandMark />
                </div>
                <IconButton
                  label="Close navigation"
                  className="shrink-0"
                  onClick={() => setDrawerOpen(false)}
                >
                  <X className="size-4" />
                </IconButton>
              </div>
              <NavLinks role={user.role} onNavigate={() => setDrawerOpen(false)} />
            </div>
            <Button variant="ghost" size="small" onClick={handleSignOut} className="justify-start">
              <LogOut aria-hidden className="size-4" /> Logout
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function AuthLayout({
  title,
  description,
  children,
  contentAlign = "left",
}: {
  title: string;
  description?: string;
  children: ReactNode;
  contentAlign?: "left" | "center";
}) {
  const centered = contentAlign === "center";

  return (
    <div className="scrollbar-hidden relative flex h-screen items-center justify-center overflow-y-auto bg-[var(--semantic-bg-primary)] p-[var(--spacing-6xl)]">
      <div className="absolute right-[var(--spacing-5xl)] top-[var(--spacing-5xl)]">
        <ThemeToggle />
      </div>
      <main className="w-full max-w-[460px] py-[var(--spacing-8xl)]">
        <div className="mb-[var(--spacing-7xl)] flex justify-center">
          <BrandMark context="auth" />
        </div>
        <div
          style={{ borderRadius: "var(--radius-lg)", padding: "var(--spacing-8xl)" }}
          className="border border-[var(--semantic-bg-outline)] bg-[var(--semantic-bg-secondary)] shadow-xl shadow-black/5"
        >
          <h1
            className={cn(
              "text-2xl font-semibold tracking-[-0.02em] text-[var(--semantic-text-secondary)]",
              centered && "text-center",
            )}
          >
            {title}
          </h1>
          {description ? (
            <p
              className={cn(
                "mt-[var(--spacing-2xl)] text-sm leading-relaxed text-[var(--semantic-text-primary)]",
                centered && "mx-auto max-w-[340px] text-center",
              )}
            >
              {description}
            </p>
          ) : null}
          <div className="mt-[var(--spacing-8xl)]">{children}</div>
        </div>
      </main>
    </div>
  );
}
