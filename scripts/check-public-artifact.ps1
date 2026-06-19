[CmdletBinding()]
param(
  [string]$ArtifactPath = "artifacts/public"
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$artifactFullPath = Join-Path $repoRoot $ArtifactPath

if (-not (Test-Path -LiteralPath $artifactFullPath)) {
  throw "Public artifact not found: $artifactFullPath"
}

$root = (Resolve-Path $artifactFullPath).Path.TrimEnd([char[]]("\/"))
$violations = New-Object System.Collections.Generic.List[string]

Get-ChildItem -LiteralPath $artifactFullPath -Force -Recurse | ForEach-Object {
  $relative = $_.FullName.Substring($root.Length).TrimStart([char[]]("\/"))
  $relativeNormalized = $relative -replace "\\", "/"
  $name = $_.Name

  if ($name -like ".env*") {
    $violations.Add("${relativeNormalized}: env file is not allowed in public artifact")
  }

  if ($_.PSIsContainer -and $name -in @("node_modules", "prisma", "src", ".git")) {
    $violations.Add("${relativeNormalized}: server/private directory is not allowed in public artifact")
  }

  if (-not $_.PSIsContainer -and $name -in @("package.json", "package-lock.json", "Caddyfile")) {
    $violations.Add("${relativeNormalized}: runtime/build file is not allowed in public artifact")
  }

  if ($relativeNormalized -like ".next/server*" -or $relativeNormalized -like "docker-compose*.yml" -or $relativeNormalized -like "Dockerfile*") {
    $violations.Add("${relativeNormalized}: server/runtime file is not allowed in public artifact")
  }

  if ($name -match "\.(db|sqlite|sqlite3|log|pem|key|p12)$") {
    $violations.Add("${relativeNormalized}: database, log, key or certificate file is not allowed in public artifact")
  }
}

if ($violations.Count -gt 0) {
  $violations | ForEach-Object { Write-Error $_ }
  throw "Public artifact check failed with $($violations.Count) violation(s)."
}

Write-Host "Public artifact check passed: $artifactFullPath"
