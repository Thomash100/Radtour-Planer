[CmdletBinding()]
param(
  [string]$ArtifactPath = "artifacts/private"
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$artifactFullPath = Join-Path $repoRoot $ArtifactPath

if (-not (Test-Path -LiteralPath $artifactFullPath)) {
  throw "Private artifact not found: $artifactFullPath"
}

$root = (Resolve-Path $artifactFullPath).Path.TrimEnd([char[]]("\/"))
$violations = New-Object System.Collections.Generic.List[string]

Get-ChildItem -LiteralPath $artifactFullPath -Force -Recurse | ForEach-Object {
  $relative = $_.FullName.Substring($root.Length).TrimStart([char[]]("\/"))
  $relativeNormalized = $relative -replace "\\", "/"
  $name = $_.Name

  if ($name -like ".env*" -and $name -notlike "*.example") {
    $violations.Add("${relativeNormalized}: real env file is not allowed in private artifact")
  }

  if ($_.PSIsContainer -and $name -in @("node_modules", ".git", "artifacts", "httpdocs", "_private")) {
    $violations.Add("${relativeNormalized}: generated or target-wrapper directory is not allowed in private artifact")
  }

  if ($relativeNormalized -like ".next/cache*" -or $relativeNormalized -like "_next/static*") {
    $violations.Add("${relativeNormalized}: cache or public build output is not allowed in private artifact")
  }

  if ($name -match "\.(db|sqlite|sqlite3|log|pem|key|p12)$") {
    $violations.Add("${relativeNormalized}: database, log, key or certificate file is not allowed in private artifact")
  }
}

if ($violations.Count -gt 0) {
  $violations | ForEach-Object { Write-Error $_ }
  throw "Private artifact check failed with $($violations.Count) violation(s)."
}

Write-Host "Private artifact check passed: $artifactFullPath"
