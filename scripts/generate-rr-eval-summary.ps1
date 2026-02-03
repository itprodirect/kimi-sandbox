$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$manifestPath = Join-Path $root "reports\\rr-eval\\manifest.json"

$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json

$rows = foreach ($report in $manifest.reports) {
  $relPath = $report.report_file -replace "/", [IO.Path]::DirectorySeparatorChar
  $reportPath = Join-Path $root $relPath
  $data = Get-Content $reportPath -Raw | ConvertFrom-Json
  $scores = $data.rubric.scores

  $scoreSummary = "V{0} S{1} O{2} I{3} B{4}" -f `
    $scores.variability, `
    $scores.strategic_importance, `
    $scores.operational_impact, `
    $scores.integration_readiness, `
    $scores.blast_radius_risk

  $commitShort = if ($data.commitSha) { $data.commitSha.Substring(0, 7) } else { "" }

  [PSCustomObject]@{
    repo = $data.name
    commit = $commitShort
    classification = $data.rubric.classification
    scores = $scoreSummary
    confidence = $scores.confidence
    tasks = @($data.rubric.tasks).Count
  }
}

$rows = $rows | Sort-Object repo
$generatedAt = (Get-Date).ToString("o")
$baselineModel = $manifest.baseline.model

$lines = @(
  ("# RepoRubric Benchmark Summary ({0} baseline)" -f $baselineModel),
  "",
  "Source: reports/rr-eval/manifest.json",
  ("Generated: {0}" -f $generatedAt),
  "",
  "Score legend: V=variability, S=strategic_importance, O=operational_impact, I=integration_readiness, B=blast_radius_risk",
  "",
  "| Repo | Commit | Class | Scores | Confidence | Tasks |",
  "|---|---|---|---|---|---|"
)

foreach ($row in $rows) {
  $lines += ("| {0} | {1} | {2} | {3} | {4} | {5} |" -f `
    $row.repo, `
    $row.commit, `
    $row.classification, `
    $row.scores, `
    $row.confidence, `
    $row.tasks)
}

$outPath = Join-Path $root "docs\\benchmarks\\rr-eval-summary.md"
($lines -join [Environment]::NewLine) | Set-Content -Path $outPath -Encoding utf8
