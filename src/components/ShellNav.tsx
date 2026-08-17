"use client";

import {
  BedDouble,
  Bell,
  Bike,
  BookOpenText,
  Building2,
  FolderOpen,
  HelpCircle,
  Home,
  Map,
  Menu,
  Route,
  Settings,
  Scale,
  ShieldCheck,
  UserRound,
  X
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { APP_NAVIGATION_ITEMS, activeNavigationId, type AppNavigationId } from "@/lib/app-navigation";
import { TOUR_LIBRARY_STORAGE_KEY, parseTourLibrary } from "@/lib/tour-library";
import { TOUR_STATE_STORAGE_KEY, parseStoredTourState } from "@/lib/tour-state";
import { cn } from "@/lib/utils";

const icons: Record<AppNavigationId, typeof Home> = {
  start: Home,
  route: Route,
  stages: Map,
  accommodations: BedDouble,
  "travel-plan": BookOpenText
};

function TourSelector() {
  const router = useRouter();
  const pathname = usePathname();
  const [entries, setEntries] = useState<ReturnType<typeof parseTourLibrary>>([]);
  const [currentId, setCurrentId] = useState("");

  useEffect(() => {
    const read = () => {
      const library = parseTourLibrary(window.localStorage.getItem(TOUR_LIBRARY_STORAGE_KEY));
      const current = parseStoredTourState(window.localStorage.getItem(TOUR_STATE_STORAGE_KEY));
      setEntries(library);
      setCurrentId(current?.libraryTourId ?? "");
    };
    const timer = window.setTimeout(read, 120);
    window.addEventListener("focus", read);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("focus", read);
    };
  }, [pathname]);

  const currentTour = useMemo(
    () => entries.find((entry) => entry.id === currentId),
    [currentId, entries]
  );

  if (entries.length === 0) {
    return (
      <Link
        className="inline-flex max-w-[13rem] items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm"
        href="/touren"
      >
        <FolderOpen className="h-4 w-4 text-primary" />
        <span className="truncate">Tour auswählen</span>
      </Link>
    );
  }

  return (
    <label className="relative flex max-w-[15rem] items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 shadow-sm">
      <FolderOpen className="h-4 w-4 shrink-0 text-primary" />
      <span className="sr-only">Aktuelle Tour auswählen</span>
      <select
        aria-label="Aktuelle Tour auswählen"
        className="min-w-0 max-w-[11rem] appearance-none truncate bg-transparent pr-4 outline-none"
        value={currentTour?.id ?? ""}
        onChange={(event) => {
          setCurrentId(event.target.value);
          router.push(`/planer/route?tour=${encodeURIComponent(event.target.value)}`);
        }}
      >
        {!currentTour && <option value="">Tour auswählen</option>}
        {entries.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
      </select>
    </label>
  );
}

export function ShellNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const activeId = activeNavigationId(pathname);

  useEffect(() => setMenuOpen(false), [pathname]);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-[#fbfcfa]/92 backdrop-blur-xl" data-app-header="true">
        <div className="mx-auto flex h-[72px] max-w-[1536px] items-center gap-3 px-3 sm:px-5 desktop:px-8">
          <button
            aria-expanded={menuOpen}
            aria-label="Sekundärmenü öffnen"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm desktop:hidden"
            type="button"
            onClick={() => setMenuOpen((current) => !current)}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <Link className="hidden shrink-0 items-center gap-2.5 text-slate-950 desktop:flex" href="/">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary text-white shadow-lg shadow-emerald-950/15"><Bike className="h-5 w-5" /></span>
            <span><strong className="block text-base leading-none">BikeTripHub</strong><span className="text-[11px] font-medium text-slate-500">Deine Tour. Dein Abenteuer.</span></span>
          </Link>

          <nav aria-label="Hauptnavigation" className="hidden flex-1 items-center justify-center gap-1 desktop:flex" data-app-navigation="desktop">
            {APP_NAVIGATION_ITEMS.map((item) => {
              const Icon = icons[item.id];
              const active = activeId === item.id;
              return (
                <Link
                  key={item.id}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold transition",
                    active ? "bg-primary text-white shadow-md shadow-emerald-950/10" : "text-slate-600 hover:bg-white hover:text-slate-950"
                  )}
                  data-navigation-id={item.id}
                  href={item.href}
                >
                  <Icon className="h-4 w-4" />{item.label}
                </Link>
              );
            })}
          </nav>

          <div className="min-w-0 flex-1 desktop:flex-initial"><TourSelector /></div>
          <Link aria-label="Benachrichtigungen und Einstellungen" className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-slate-600 hover:bg-white" href="/einstellungen">
            <Bell className="h-5 w-5 desktop:hidden" />
            <Settings className="hidden h-5 w-5 desktop:block" />
          </Link>
          <Link aria-label="Fahrerprofil" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#d7efe7] text-primary" href="/einstellungen/fahrprofil"><UserRound className="h-5 w-5" /></Link>
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-x-3 top-[78px] z-50 rounded-[24px] border border-slate-200 bg-white p-3 shadow-2xl desktop:hidden" data-secondary-menu="true">
          <nav aria-label="Weitere Bereiche" className="grid gap-1">
            <SecondaryLink href="/einstellungen" icon={Settings} label="Konfiguration" />
            <SecondaryLink href="/touren" icon={FolderOpen} label="Tourverwaltung und Import/Export" />
            <SecondaryLink href="/einstellungen/fahrprofil" icon={UserRound} label="Fahrer- und Fahrradprofil" />
            <SecondaryLink href="/planer/optimierung" icon={Scale} label="Routen vergleichen" />
            <SecondaryLink href="/partner" icon={Building2} label="Partnerbereich" />
            <SecondaryLink href="/admin/partner" icon={ShieldCheck} label="Administration" />
            <SecondaryLink href="/mvp-hinweis" icon={HelpCircle} label="Hilfe und Hinweise" />
          </nav>
        </div>
      )}

      <nav
        aria-label="Hauptnavigation mobil"
        className="fixed inset-x-2 bottom-2 z-40 grid grid-cols-5 rounded-[24px] border border-slate-200/80 bg-white/96 p-1.5 shadow-[0_18px_55px_rgba(15,23,42,0.18)] backdrop-blur-xl desktop:hidden"
        data-app-navigation="bottom"
      >
        {APP_NAVIGATION_ITEMS.map((item) => {
          const Icon = icons[item.id];
          const active = activeId === item.id;
          return (
            <Link
              key={item.id}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-w-0 flex-col items-center justify-center gap-1 rounded-[18px] px-1 py-2 text-[10px] font-semibold transition sm:text-xs",
                active ? "bg-primary text-white" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
              data-navigation-id={item.id}
              href={item.href}
            >
              <Icon className="h-5 w-5" /><span className="max-w-full truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

function SecondaryLink({ href, label, icon: Icon }: { href: string; label: string; icon: typeof Settings }) {
  return (
    <Link className="flex min-h-12 items-center gap-3 rounded-2xl px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50" href={href}>
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-primary"><Icon className="h-4 w-4" /></span>{label}
    </Link>
  );
}
