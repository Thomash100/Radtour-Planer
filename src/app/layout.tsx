import "maplibre-gl/dist/maplibre-gl.css";
import type { Metadata } from "next";
import Link from "next/link";

import { ShellNav } from "@/components/ShellNav";
import { APP_BUILD_DATE, APP_DEPLOYMENT_CHANNEL, APP_INDEXING_ALLOWED, APP_MVP_STATUS, APP_VERSION } from "@/lib/version";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: {
    default: "BikeTripHub MVP | RadreisePlaner",
    template: "%s | BikeTripHub"
  },
  description:
    "MVP für mehrtägige Radtourplanung mit realen Fahrradwegen, Etappen, Unterkünften und lokaler Reiseorganisation.",
  applicationName: "BikeTripHub",
  keywords: ["Radtour", "GPX", "Etappenplanung", "Radreise", "BikeTripHub"],
  openGraph: {
    title: "BikeTripHub MVP",
    description:
      "Fahrradrouten und GPX-Tracks planen, in Etappen aufteilen, Unterkünfte vormerken und Reiseaufträge dokumentieren.",
    type: "website",
    locale: "de_DE"
  },
  robots: {
    index: APP_INDEXING_ALLOWED,
    follow: APP_INDEXING_ALLOWED
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body>
        <ShellNav />
        {children}
        <footer className="border-t bg-white px-4 py-5 text-sm text-slate-500">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>{APP_MVP_STATUS}</span>
              <span className="text-slate-300">/</span>
              <span>Version {APP_VERSION}</span>
              <span className="text-slate-300">/</span>
              <span>Build: {APP_BUILD_DATE}</span>
              <span className="text-slate-300">/</span>
              <span>Kanal: {APP_DEPLOYMENT_CHANNEL}</span>
            </div>
            <nav className="flex flex-wrap gap-x-4 gap-y-2">
              <Link className="hover:text-slate-900" href="/impressum">
                Impressum
              </Link>
              <Link className="hover:text-slate-900" href="/datenschutz">
                Datenschutz
              </Link>
              <Link className="hover:text-slate-900" href="/agb">
                Nutzungsbedingungen
              </Link>
              <Link className="hover:text-slate-900" href="/mvp-hinweis">
                MVP-Hinweis
              </Link>
              <Link className="hover:text-slate-900" href="/touren">
                Tourverwaltung
              </Link>
              <Link className="hover:text-slate-900" href="/auftraege">
                Reiseaufträge
              </Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
