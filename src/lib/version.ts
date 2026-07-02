import packageJson from "../../package.json";

export const APP_VERSION = packageJson.version;
export const APP_BUILD_DATE = process.env.NEXT_PUBLIC_BUILD_DATE ?? "2026-06-30";
export const APP_MVP_STATUS = "MVP 0.3 Release-Readiness";
export const APP_DEPLOYMENT_CHANNEL = process.env.NEXT_PUBLIC_DEPLOYMENT_CHANNEL ?? "local-mvp";
export const APP_INDEXING_ALLOWED = process.env.NEXT_PUBLIC_ALLOW_INDEXING === "true";
