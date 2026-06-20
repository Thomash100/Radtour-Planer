[CmdletBinding()]
param(
  [string]$OutputPath = "artifacts/public"
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$outputFullPath = Join-Path $repoRoot $OutputPath

if (Test-Path -LiteralPath $outputFullPath) {
  Remove-Item -LiteralPath $outputFullPath -Recurse -Force
}

New-Item -ItemType Directory -Path $outputFullPath -Force | Out-Null

$publicSource = Join-Path $repoRoot "public"
if (Test-Path -LiteralPath $publicSource) {
  Get-ChildItem -LiteralPath $publicSource -Force | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination $outputFullPath -Recurse -Force
  }
}

$nextStatic = Join-Path $repoRoot ".next/static"
if (Test-Path -LiteralPath $nextStatic) {
  $nextTarget = Join-Path $outputFullPath "_next/static"
  New-Item -ItemType Directory -Path $nextTarget -Force | Out-Null
  Get-ChildItem -LiteralPath $nextStatic -Force | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination $nextTarget -Recurse -Force
  }
}

$healthDir = Join-Path $outputFullPath "health"
New-Item -ItemType Directory -Path $healthDir -Force | Out-Null

Set-Content -Path (Join-Path $healthDir "index.html") -Encoding utf8 -Value @"
<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <title>BikeTripHub Public Artifact</title>
</head>
<body>
  <h1>BikeTripHub public artifact</h1>
  <p>Dieses Artefakt ist nur der oeffentliche Webroot-/Asset-Bereich. Die App selbst laeuft im privaten Next.js-Serverbereich.</p>
</body>
</html>
"@

Set-Content -Path (Join-Path $outputFullPath "README.md") -Encoding utf8 -Value @"
# BikeTripHub public artifact

Dieses Verzeichnis ist fuer den oeffentlichen Webroot gedacht.

Es enthaelt keine Next.js-Serverdateien, keine Prisma-Dateien, keine Secrets, keine Datenbankdateien und keine Runtime-Logs.

Die aktuelle App ist nicht als reine statische Website gedacht. Der Next.js-Server gehoert in das private Artefakt.
"@

Write-Host "Public artifact created at $outputFullPath"
