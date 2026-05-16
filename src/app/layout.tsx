import "maplibre-gl/dist/maplibre-gl.css";
import type { Metadata } from "next";

import { ShellNav } from "@/components/ShellNav";
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
      </body>
    </html>
  );
}
