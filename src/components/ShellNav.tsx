import { Bike, Building2, ClipboardList, FlaskConical, FolderOpen, Map, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

const links = [
  { href: "/planer", label: "Planer", icon: Map },
  { href: "/touren", label: "Touren", icon: FolderOpen },
  { href: "/auftraege", label: "Aufträge", icon: ClipboardList },
  { href: "/partner", label: "Partner", icon: Building2 },
  { href: "/mvp-hinweis", label: "MVP", icon: FlaskConical },
  { href: "/admin/partner", label: "Admin", icon: ShieldCheck }
];

export function ShellNav() {
  return (
    <header className="sticky top-0 z-40 border-b bg-white/88 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link className="flex items-center gap-2 font-semibold text-slate-950" href="/">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground">
            <Bike className="h-5 w-5" />
          </span>
          <span>BikeTripHub</span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <Button key={link.href} asChild size="sm" variant="ghost">
                <Link href={link.href}>
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              </Button>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild className="md:hidden" size="icon" variant="outline">
            <Link aria-label="Reiseaufträge öffnen" href="/auftraege" title="Reiseaufträge">
              <ClipboardList className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/planer?mode=gpx">GPX laden</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
