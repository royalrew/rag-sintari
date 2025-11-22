# Snabbtest - kontrollerar servern först, sedan testar upload med kort timeout

$filePath = ".\test.txt"
$uri = "http://localhost:8000/documents/upload"

Write-Host "=== Quick Upload Test ===" -ForegroundColor Cyan

# 1. Kolla fil
if (-not (Test-Path $filePath)) {
    Write-Host "❌ Filen hittades inte: $filePath" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Fil hittad: $filePath" -ForegroundColor Green

# 2. Kolla server
Write-Host "Kontrollerar server..." -ForegroundColor Yellow
try {
    $health = Invoke-WebRequest -Uri "http://localhost:8000/health" -Method Get -TimeoutSec 2
    Write-Host "✅ Server är igång (Status: $($health.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "❌ Server är INTE igång!" -ForegroundColor Red
    Write-Host "   Starta med: uvicorn api.main:app --reload" -ForegroundColor Yellow
    exit 1
}

# 3. Testa upload med kort timeout
Write-Host "`nTestar upload (timeout: 5 sekunder)..." -ForegroundColor Yellow

$fileBytes = [System.IO.File]::ReadAllBytes($filePath)
$fileName = [System.IO.Path]::GetFileName($filePath)
$boundary = [System.Guid]::NewGuid().ToString()

$bodyLines = @(
    "--$boundary",
    "Content-Disposition: form-data; name=`"file`"; filename=`"$fileName`"",
    "Content-Type: text/plain",
    "",
    [System.Text.Encoding]::UTF8.GetString($fileBytes),
    "--$boundary--"
)

$body = $bodyLines -join "`r`n"
$bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($body)

try {
    $response = Invoke-WebRequest -Uri $uri -Method Post -Body $bodyBytes -ContentType "multipart/form-data; boundary=$boundary" -TimeoutSec 5
    
    Write-Host "`n✅ SUCCESS!" -ForegroundColor Green
    Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
    $json = $response.Content | ConvertFrom-Json
    $json | ConvertTo-Json -Depth 10
} catch {
    Write-Host "`n❌ FAILED!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "`nServer Response:" -ForegroundColor Yellow
        Write-Host $responseBody -ForegroundColor Yellow
    }
    
    Write-Host "`nMöjliga orsaker:" -ForegroundColor Yellow
    Write-Host "  - R2-anslutningen timeoutar (kolla R2-miljövariabler)" -ForegroundColor Yellow
    Write-Host "  - Servern hänger sig i R2-upload" -ForegroundColor Yellow
    Write-Host "  - Nätverksproblem" -ForegroundColor Yellow
}

