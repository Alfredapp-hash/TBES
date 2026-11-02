# Reads the Supabase secret key from the clipboard, proves it works, then stores it in Netlify.
# Nothing is pasted or shown, and the clipboard is cleared afterwards.
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")
$url = "https://lqqqiaatbctubptopbil.supabase.co"

Write-Host "In Supabase, click the copy button on the secret key, then come back here." -ForegroundColor Cyan
Read-Host "Press Enter once it's copied" | Out-Null

# A copied key can arrive with a line break in the middle, which cuts it short if pasted into a prompt.
$key = "$(Get-Clipboard)" -replace '\s', ''
if ($key -notmatch '^sb_secret_[A-Za-z0-9_-]{20,}$') {
    throw "The clipboard doesn't hold a whole secret key. Nothing was changed. Copy it again and rerun this."
}
try {
    $headers = @{ apikey = $key; Authorization = "Bearer $key" }
    try {
        Invoke-RestMethod "$url/rest/v1/page_views?select=id&limit=1" -Headers $headers | Out-Null
    }
    catch {
        throw "Supabase refused that key, so nothing was changed. Copy it again and rerun this."
    }
    npx --yes netlify-cli@latest env:set SUPABASE_SERVICE_ROLE_KEY $key --secret --force --context production deploy-preview branch-deploy | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Netlify didn't save the key (exit code $LASTEXITCODE). Run 'npx netlify-cli login' and rerun this."
    }
}
finally {
    Set-Clipboard -Value " "
    Remove-Variable key -ErrorAction SilentlyContinue
    Remove-Variable headers -ErrorAction SilentlyContinue
}

Write-Host "Key checked with Supabase and saved to Netlify. It takes effect on the next deploy." -ForegroundColor Green
Read-Host "Press Enter to close" | Out-Null
