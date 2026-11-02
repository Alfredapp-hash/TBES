# Stores the Supabase settings in Netlify without showing the secret key on screen, in chat, or in the repo.
# Find both values in Supabase: Project Settings > API. Run from the website folder.
$ErrorActionPreference = "Stop"

$url = (Read-Host "Paste the Supabase Project URL (https://xxxx.supabase.co)").Trim()
if ($url -notmatch '^https://[a-z0-9]+\.supabase\.co$') {
    throw "That doesn't look like a Supabase Project URL. Nothing was changed."
}
$secure = Read-Host "Paste the service_role or secret key (input is masked)" -AsSecureString
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
    $key = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer).Trim()
    if ([string]::IsNullOrWhiteSpace($key)) {
        throw "The key was empty. Nothing was changed."
    }
    npx --yes netlify-cli@latest link --name turbinebridge | Out-Null
    npx --yes netlify-cli@latest env:set SUPABASE_URL $url --context production deploy-preview | Out-Null
    npx --yes netlify-cli@latest env:set SUPABASE_SERVICE_ROLE_KEY $key --secret --context production deploy-preview | Out-Null
}
finally {
    if ($pointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    }
    Remove-Variable key -ErrorAction SilentlyContinue
}

Write-Host "Saved to Netlify project turbinebridge. The values take effect on the next deploy." -ForegroundColor Green
Read-Host "Press Enter to close"
