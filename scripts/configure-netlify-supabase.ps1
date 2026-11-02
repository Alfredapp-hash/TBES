# Stores the Supabase settings in Netlify without showing the secret key on screen, in chat, or in the repo.
# Find the keys in Supabase: Project Settings > API Keys. Run from the website folder.
$ErrorActionPreference = "Stop"
$url = "https://lqqqiaatbctubptopbil.supabase.co"
$contexts = @("production", "deploy-preview", "branch-deploy")

Write-Host "A browser window opens first. Sign in to the Netlify account that owns turbinebridge and authorize." -ForegroundColor Cyan
npx --yes netlify-cli@latest login --new
npx --yes netlify-cli@latest link --name turbinebridge | Out-Null

$publishable = (Read-Host "Paste the publishable key (sb_publishable_...)").Trim()
if ($publishable -notmatch '^sb_publishable_') {
    throw "That isn't a publishable key. Nothing was changed."
}
$secure = Read-Host "Paste the secret key (sb_secret_...; input is masked)" -AsSecureString
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
    $key = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer).Trim()
    if ([string]::IsNullOrWhiteSpace($key)) {
        throw "The secret key was empty. Nothing was changed."
    }
    npx --yes netlify-cli@latest env:set PUBLIC_SUPABASE_URL $url --context @contexts | Out-Null
    npx --yes netlify-cli@latest env:set PUBLIC_SUPABASE_PUBLISHABLE_KEY $publishable --context @contexts | Out-Null
    npx --yes netlify-cli@latest env:set SUPABASE_URL $url --context @contexts | Out-Null
    npx --yes netlify-cli@latest env:set SUPABASE_SERVICE_ROLE_KEY $key --secret --context @contexts | Out-Null
}
finally {
    if ($pointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    }
    Remove-Variable key -ErrorAction SilentlyContinue
}

Write-Host "Saved to Netlify project turbinebridge. The values take effect on the next deploy." -ForegroundColor Green
Read-Host "Press Enter to close"
