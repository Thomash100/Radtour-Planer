import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const playwrightPackage = process.env.PLAYWRIGHT_PACKAGE || "playwright";
const { chromium } = require(playwrightPackage);
const { calculateMockRoute } = await import("../src/lib/mock-routing.ts");
const { splitRouteIntoStageCount } = await import("../src/lib/geo.ts");
const { DEFAULT_UI_PREFERENCES } = await import("../src/lib/ui-preferences.ts");

const baseUrl = process.env.ACCEPTANCE_BASE_URL || "http://127.0.0.1:3100";
const browserExecutable = process.env.BROWSER_EXECUTABLE;
const outputDirectory = path.resolve("artifacts/responsive-ui-acceptance");

const route = calculateMockRoute({
  start: "Dresden",
  end: "Hamburg",
  profile: "touristic"
});
const stages = splitRouteIntoStageCount(route.geometryGeoJson, 6, route.elevationProfile).map((stage, index, all) => ({
  ...stage,
  id: `acceptance-stage-${index + 1}`,
  startName: index === 0 ? route.startName : stage.startName,
  endName: index === all.length - 1 ? route.endName : stage.endName
}));
const fixedTimestamp = "2026-08-08T12:00:00.000Z";
const tourId = "tour-responsive-ui-acceptance";
const tourState = {
  libraryTourId: tourId,
  tourKind: "demo",
  inputMode: "demo",
  route,
  stages,
  pois: [],
  selectedPoiId: null,
  selectedStageId: null,
  stageGenerationMode: "custom",
  targetKm: 80,
  travelDays: stages.length,
  stageBreakpoints: [],
  stageAccommodations: {},
  status: "Deterministischer visueller Abnahmezustand geladen.",
  lastSavedAt: fixedTimestamp,
  updatedAt: fixedTimestamp
};
const tourLibrary = [{
  id: tourId,
  name: route.name,
  kind: "demo",
  releaseStatus: "draft",
  state: tourState,
  createdAt: fixedTimestamp,
  updatedAt: fixedTimestamp,
  lastOpenedAt: fixedTimestamp
}];

const cases = [
  { file: "01-mobile-route.png", width: 390, height: 844, route: "/planer/route?open=last", ready: "[data-route-overview='true']" },
  { file: "02-mobile-settings.png", width: 390, height: 844, route: "/einstellungen", ready: "[data-settings-page='true']" },
  { file: "03-tablet-route.png", width: 1024, height: 1366, route: "/planer/route?open=last", ready: "[data-route-overview='true']" },
  { file: "04-tablet-settings.png", width: 1024, height: 1366, route: "/einstellungen", ready: "[data-settings-page='true']" },
  { file: "05-desktop-route.png", width: 1440, height: 900, route: "/planer/route?open=last", ready: "[data-route-overview='true']" },
  { file: "06-desktop-settings.png", width: 1440, height: 900, route: "/einstellungen", ready: "[data-settings-page='true']" }
];

await mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  ...(browserExecutable ? { executablePath: browserExecutable } : {})
});
const report = [];

try {
  for (const testCase of cases) {
    const context = await browser.newContext({
      viewport: { width: testCase.width, height: testCase.height },
      deviceScaleFactor: 1,
      locale: "de-DE",
      timezoneId: "Europe/Berlin",
      reducedMotion: "reduce"
    });
    await context.addInitScript(({ state, library, preferences }) => {
      window.localStorage.setItem("biketriphub.tourState.v1", JSON.stringify(state));
      window.localStorage.setItem("biketriphub.tourLibrary.v1", JSON.stringify(library));
      window.localStorage.setItem("biketriphub.uiPreferences.v1", JSON.stringify(preferences));
    }, { state: tourState, library: tourLibrary, preferences: DEFAULT_UI_PREFERENCES });
    const page = await context.newPage();
    const errors = [];
    page.on("console", (message) => {
      if (message.type() === "error") {
        const location = message.location();
        const source = location.url ? ` @ ${location.url}:${location.lineNumber ?? 0}` : "";
        errors.push(`console: ${message.text()}${source}`);
      }
    });
    page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
    page.on("response", (response) => {
      if (response.status() >= 400) errors.push(`resource ${response.status()}: ${response.url()}`);
    });

    const url = `${baseUrl}${testCase.route}`;
    const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.waitForSelector(testCase.ready, { state: "visible", timeout: 30_000 });
    if (testCase.route.startsWith("/planer/route")) {
      await page.waitForSelector("[data-stage-overview-card]", { state: "visible", timeout: 30_000 });
      await page.waitForFunction(() => {
        const canvas = document.querySelector(".maplibregl-canvas");
        return canvas instanceof HTMLCanvasElement && canvas.width > 0 && canvas.height > 0;
      }, undefined, { timeout: 30_000 });
    }
    await page.evaluate(async () => {
      await document.fonts.ready;
      document.documentElement.style.scrollBehavior = "auto";
      const style = document.createElement("style");
      style.textContent = "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}";
      document.head.appendChild(style);
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(2500);

    const dimensions = await page.evaluate(() => ({
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      documentWidth: document.documentElement.scrollWidth,
      documentHeight: document.documentElement.scrollHeight,
      loadingText: document.body.innerText.includes("Lädt"),
      stageCards: document.querySelectorAll("[data-stage-overview-card]").length,
      miniProfiles: document.querySelectorAll("[data-mini-elevation-profile]").length
    }));
    if (dimensions.documentWidth > dimensions.viewportWidth + 1) {
      errors.push(`horizontal overflow: ${dimensions.documentWidth}px > ${dimensions.viewportWidth}px`);
    }
    if (dimensions.loadingText) errors.push("sichtbarer Ladehinweis verblieben");

    const screenshotPath = path.join(outputDirectory, testCase.file);
    await page.screenshot({ path: screenshotPath, fullPage: false, animations: "disabled" });
    report.push({
      ...testCase,
      url,
      httpStatus: response?.status() ?? null,
      screenshotPath,
      dimensions,
      errors: [...new Set(errors)]
    });
    await context.close();
  }
} finally {
  await browser.close();
}

await writeFile(path.join(outputDirectory, "acceptance-report.json"), `${JSON.stringify({
  generatedAt: new Date().toISOString(),
  browserExecutable: browserExecutable || "Playwright Chromium",
  baseUrl,
  tour: { name: route.name, distanceKm: route.distanceKm, stages: stages.length },
  cases: report
}, null, 2)}\n`, "utf8");

for (const result of report) {
  console.log(`${result.file}: ${result.httpStatus} · ${result.dimensions.viewportWidth}x${result.dimensions.viewportHeight} · Fehler ${result.errors.length}`);
  for (const error of result.errors) console.log(`  - ${error}`);
}
