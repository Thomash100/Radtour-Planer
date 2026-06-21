import "maplibre-gl/dist/maplibre-gl.css";
import type { Metadata } from "next";

import { ShellNav } from "@/components/ShellNav";
import { APP_BUILD_DATE, APP_VERSION } from "@/lib/version";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "BikeTripHub | RadreisePlaner",
  description: "Plane komplette mehrtaegige Radreisen mit Route, Etappen, POI, Partnern und Reiseplan."
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
        <footer className="border-t bg-white px-4 py-4 text-center text-sm text-slate-500">
          <span>Version {APP_VERSION}</span>
          <span className="mx-2 text-slate-300">/</span>
          <span>Build: {APP_BUILD_DATE}</span>
        </footer>
      </body>
    </html>
  );
}
