import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || "playwright");

const baseUrl = process.env.ROUTE_WORKFLOW_BASE_URL || "http://127.0.0.1:3000";
const browserExecutable = process.env.BROWSER_EXECUTABLE;
const outputDirectory = path.resolve("artifacts/route-workflow-regression");
const storageKey = "biketriphub.tourState.v1";
const preferenceStorageKey = "biketriphub.uiPreferences.v1";

const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="BikeTripHub Regression" xmlns="http://www.topografix.com/GPX/1/1">
  <trk><name>Dresden–Meißen</name><trkseg>
    <trkpt lat="51.0504" lon="13.7373"><ele>113</ele></trkpt>
    <trkpt lat="51.0680" lon="13.6580"><ele>108</ele></trkpt>
    <trkpt lat="51.1040" lon="13.5610"><ele>116</ele></trkpt>
    <trkpt lat="51.1634" lon="13.4734"><ele>106</ele></trkpt>
  </trkseg></trk>
</gpx>`;

await mkdir(outputDirectory, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  ...(browserExecutable ? { executablePath: browserExecutable } : {})
});
const report = [];

async function runFlow(name, mode, prepareRoute) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    locale: "de-DE",
    timezoneId: "Europe/Berlin",
    reducedMotion: "reduce"
  });
  await context.addInitScript(
    ({ preferenceStorageKey, mode }) => {
      window.localStorage.setItem(
        preferenceStorageKey,
        JSON.stringify({
          version: 2,
          routePlanningInteractionMode: mode,
          showStageColors: true,
          showMiniElevationProfiles: true,
          showStageNumbers: true,
          showElevationProfile: true,
          showPois: true,
          mapStyle: "standard",
          compactStageCards: false
        })
      );
    },
    { preferenceStorageKey, mode }
  );
  const page = await context.newPage();
  const diagnostics = {
    consoleErrors: [],
    pageErrors: [],
    failedRequests: [],
    errorResponses: []
  };
  const origin = new URL(baseUrl).origin;

  page.on("console", (message) => {
    if (message.type() === "error") diagnostics.consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => diagnostics.pageErrors.push(error.message));
  page.on("requestfailed", (request) => {
    if (request.url().startsWith(origin)) {
      diagnostics.failedRequests.push(`${request.failure()?.errorText ?? "request failed"}: ${request.url()}`);
    }
  });
  page.on("response", (response) => {
    if (response.url().startsWith(origin) && response.status() >= 400) {
      diagnostics.errorResponses.push(`${response.status()}: ${response.url()}`);
    }
  });

  const beforeUrl = `${baseUrl}/planer/route`;
  const initialResponse = await page.goto(beforeUrl, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.getByRole("heading", { name: "Routenplanung" }).waitFor({ state: "visible", timeout: 30_000 });
  await page
    .getByText(mode === "inline" ? "Variante A · Eingabe einblenden" : "Variante B · Geführter Assistent")
    .waitFor({ state: "visible", timeout: 30_000 });
  await prepareRoute(page, mode);

  const stateBeforeNavigation = await page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    const state = raw ? JSON.parse(raw) : null;
    return {
      serializedLength: raw?.length ?? 0,
      routeName: state?.route?.name ?? null,
      routePoints: state?.route?.geometryGeoJson?.coordinates?.length ?? 0,
      stageCount: state?.stages?.length ?? 0
    };
  }, storageKey);
  if (!stateBeforeNavigation.routeName || stateBeforeNavigation.routePoints < 2) {
    throw new Error(`${mode}/${name}: Route fehlt vor der Weiterverarbeitung im TourState.`);
  }

  if (name === "gpx") {
    await page.locator('[data-app-navigation="bottom"] [data-navigation-id="stages"]').click();
  } else {
    await page.getByRole("link", { name: "Zur Etappenplanung", exact: true }).click();
  }
  await page.waitForURL(/\/planer\/etappen/, { timeout: 30_000 });
  await page.getByRole("heading", { name: "Etappenplanung" }).waitFor({ state: "visible", timeout: 30_000 });
  await page.waitForTimeout(1000);

  const afterUrl = page.url();
  const bodyText = await page.locator("body").innerText();
  const stateAfterNavigation = await page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    const state = raw ? JSON.parse(raw) : null;
    return {
      serializedLength: raw?.length ?? 0,
      routeName: state?.route?.name ?? null,
      routePoints: state?.route?.geometryGeoJson?.coordinates?.length ?? 0,
      stageCount: state?.stages?.length ?? 0
    };
  }, storageKey);

  await page.screenshot({
    path: path.join(outputDirectory, `${mode}-${name}-etappen.png`),
    fullPage: true
  });

  const blockingDiagnostics = [
    ...diagnostics.consoleErrors,
    ...diagnostics.pageErrors,
    ...diagnostics.errorResponses,
    ...diagnostics.failedRequests.filter((entry) => !entry.includes("ERR_ABORTED"))
  ];
  if (bodyText.includes("Application error") || bodyText.trim().length === 0) {
    blockingDiagnostics.push("Zielansicht ist leer oder zeigt die globale Application-error-Seite.");
  }
  if (!stateAfterNavigation.routeName || stateAfterNavigation.routePoints < 2) {
    blockingDiagnostics.push("Route fehlt nach der Navigation im TourState.");
  }
  if (name !== "gpx" && stateAfterNavigation.stageCount < 1) {
    blockingDiagnostics.push("Erzeugte Etappen fehlen nach der Navigation im TourState.");
  }

  const result = {
    name,
    mode,
    beforeUrl,
    afterUrl,
    initialHttpStatus: initialResponse?.status() ?? null,
    stateBeforeNavigation,
    stateAfterNavigation,
    diagnostics,
    ok: blockingDiagnostics.length === 0,
    blockingDiagnostics
  };
  report.push(result);
  await context.close();
  if (!result.ok) throw new Error(`${mode}/${name}: ${blockingDiagnostics.join(" | ")}`);
}

try {
  for (const mode of ["inline", "wizard"]) {
    await runFlow("direct", mode, async (page, activeMode) => {
      await page.getByRole("button", { name: "Direkte Route öffnen" }).click();
      await page.locator('[data-route-planning-form="direct"]').waitFor({ state: "visible", timeout: 30_000 });
      if (activeMode === "wizard") {
        await page.waitForURL(/mode=direct&step=direct/, { timeout: 30_000 });
        await page.goBack({ waitUntil: "domcontentloaded" });
        await page.locator('[data-route-planning-layout="wizard-selection"]').waitFor({ state: "visible", timeout: 30_000 });
        await page.getByRole("button", { name: "Direkte Route öffnen" }).click();
        await page.locator('[data-route-planning-form="direct"]').waitFor({ state: "visible", timeout: 30_000 });
      }
      await page.locator("#start").fill("Dresden");
      await page.locator("#end").fill("Meißen");
      await page.getByRole("button", { name: "Route berechnen" }).click();
      await page.locator('[data-route-overview="true"]').waitFor({ state: "visible", timeout: 60_000 });
    });

    await runFlow("gpx", mode, async (page) => {
      await page.getByRole("button", { name: "GPX-Import öffnen" }).click();
      await page.locator('input[type="file"]').setInputFiles({
        name: "dresden-meissen.gpx",
        mimeType: "application/gpx+xml",
        buffer: Buffer.from(gpx, "utf8")
      });
      await page.getByRole("heading", { name: "Route kürzen" }).waitFor({ state: "visible", timeout: 60_000 });
    });

    await runFlow("demo", mode, async (page) => {
      await page.getByRole("button", { name: "Demo-Tour öffnen" }).click();
      await page.getByRole("button", { name: "Demo-Tour laden" }).click();
      await page.locator('[data-route-overview="true"]').waitFor({ state: "visible", timeout: 90_000 });
    });
  }
} finally {
  await writeFile(
    path.join(outputDirectory, "report.json"),
    `${JSON.stringify({ baseUrl, generatedAt: new Date().toISOString(), report }, null, 2)}\n`,
    "utf8"
  );
  await browser.close();
}

process.stdout.write(`${JSON.stringify({ baseUrl, flows: report.map(({ name, mode, ok, afterUrl, stateAfterNavigation }) => ({ name, mode, ok, afterUrl, stateAfterNavigation })) }, null, 2)}\n`);
