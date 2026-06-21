[CmdletBinding()]
param(
  [string]$OutputPath = "artifacts/private"
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$outputFullPath = Join-Path $repoRoot $OutputPath

if (Test-Path -LiteralPath $outputFullPath) {
  Remove-Item -LiteralPath $outputFullPath -Recurse -Force
}

New-Item -ItemType Directory -Path $outputFullPath -Force | Out-Null

$files = @(
  "AGENTS.md",
  "Caddyfile",
  "CHANGELOG.md",
  "Dockerfile",
  "Dockerfile.rpi",
  "README.md",
  "components.json",
  "docker-compose.prod.yml",
  "docker-compose.rpi.yml",
  "docker-compose.yml",
  ".env.example",
  ".env.production.example",
  ".env.rpi.example",
  "next-env.d.ts",
  "next.config.mjs",
  "package-lock.json",
  "package.json",
  "postcss.config.mjs",
  "tailwind.config.ts",
  "tsconfig.json"
)

foreach ($file in $files) {
  $source = Join-Path $repoRoot $file
  if (Test-Path -LiteralPath $source) {
    Copy-Item -LiteralPath $source -Destination (Join-Path $outputFullPath $file) -Force
  }
}

$directories = @("docs", "prisma", "public", "scripts", "src")

foreach ($directory in $directories) {
  $source = Join-Path $repoRoot $directory
  if (Test-Path -LiteralPath $source) {
    Copy-Item -LiteralPath $source -Destination (Join-Path $outputFullPath $directory) -Recurse -Force
  }
}

Set-Content -Path (Join-Path $outputFullPath "DEPLOYMENT_ARTIFACT.md") -Encoding utf8 -Value @"
# BikeTripHub private artifact

Dieses Verzeichnis ist fuer den privaten serverseitigen Bereich gedacht.

Es enthaelt die Next.js-Anwendung, Prisma, Worker-/Deployment-Skripte und Beispielkonfigurationen.

Vor dem Start muessen echte `.env`-Werte auf dem Zielsystem ausserhalb des Repository-Artefakts angelegt werden.
"@

Write-Host "Private artifact created at $outputFullPath"
