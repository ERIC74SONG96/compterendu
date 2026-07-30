# Met à jour Site URL et Redirect URLs dans Supabase (confirmation e-mail)
$ProjectRef = "uturszvczqxxqkdzehcj"
$SiteUrl = "https://compterendu.vercel.app"
$RedirectUrls = "https://compterendu.vercel.app/**,http://localhost:5173/**"

if (-not $env:SUPABASE_ACCESS_TOKEN) {
  Write-Host ""
  Write-Host "Token Supabase requis." -ForegroundColor Yellow
  Write-Host "1. Ouvrez https://supabase.com/dashboard/account/tokens"
  Write-Host "2. Generez un token (scopes: projects)"
  Write-Host "3. Relancez : `$env:SUPABASE_ACCESS_TOKEN='votre_token'; .\scripts\configurer-auth-supabase.ps1"
  Write-Host ""
  exit 1
}

$body = @{
  site_url       = $SiteUrl
  uri_allow_list = $RedirectUrls
} | ConvertTo-Json

$headers = @{
  Authorization = "Bearer $env:SUPABASE_ACCESS_TOKEN"
  "Content-Type" = "application/json"
}

Write-Host "Mise a jour auth config pour $ProjectRef ..."
$response = Invoke-RestMethod `
  -Method PATCH `
  -Uri "https://api.supabase.com/v1/projects/$ProjectRef/config/auth" `
  -Headers $headers `
  -Body $body

Write-Host "OK — Site URL : $($response.site_url)" -ForegroundColor Green
Write-Host "Redirect URLs : $($response.uri_allow_list)" -ForegroundColor Green
