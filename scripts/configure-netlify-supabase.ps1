# First-time Netlify setup: signs in, links the project, stores the public settings, then the secret key.
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")
$url = "https://lqqqiaatbctubptopbil.supabase.co"
$contexts = @("production", "deploy-preview", "branch-deploy")

function Invoke-Netlify {
    npx --yes netlify-cli@latest @args | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Netlify command failed (exit code $LASTEXITCODE): $($args[0])"
    }
}

Write-Host "A browser window opens first. Sign in to the Netlify account that owns turbinebridge and authorize." -ForegroundColor Cyan
npx --yes netlify-cli@latest login --new
Invoke-Netlify link --name turbinebridge

$publishable = (Read-Host "Paste the publishable key (sb_publishable_...)").Trim()
if ($publishable -notmatch '^sb_publishable_') {
    throw "That isn't a publishable key. Nothing was changed."
}
Invoke-Netlify env:set PUBLIC_SUPABASE_URL $url --force --context @contexts
Invoke-Netlify env:set PUBLIC_SUPABASE_PUBLISHABLE_KEY $publishable --force --context @contexts
Invoke-Netlify env:set SUPABASE_URL $url --force --context @contexts

& (Join-Path $PSScriptRoot "set-netlify-secret-key.ps1")
