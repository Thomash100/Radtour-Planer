import "maplibre-gl/dist/maplibre-gl.css";
import type { Metadata } from "next";
import Link from "next/link";

import { ShellNav } from "@/components/ShellNav";
import { APP_BUILD_DATE, APP_MVP_STATUS, APP_VERSION } from "@/lib/version";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: {
    default: "BikeTripHub MVP | RadreisePlaner",
    template: "%s | BikeTripHub"
  },
  description:
    "MVP für mehrtägige Radtourplanung auf GPX-Basis mit Routenkürzung, Etappen, Orten, Unterkünften und lokaler Speicherung.",
  applicationName: "BikeTripHub",
  keywords: ["Radtour", "GPX", "Etappenplanung", "Radreise", "BikeTripHub"],
  openGraph: {
    title: "BikeTripHub MVP",
    description:
      "GPX-Routen laden, kürzen, in Etappen aufteilen, Orte projizieren und Unterkünfte je Etappe vormerken.",
    type: "website",
    locale: "de_DE"
  },
  robots: {
    index: false,
    follow: false
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
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
