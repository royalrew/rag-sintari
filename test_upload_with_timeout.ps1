# Test upload med timeout och bättre felhantering
# Kör detta när servern är igång: uvicorn api.main:app --reload

$filePath = ".\test.txt"
$uri = "http://localhost:8000/documents/upload"

Write-Host "Testar upload av test.txt..." -ForegroundColor Cyan
Write-Host "Timeout: 10 sekunder" -ForegroundColor Yellow

# Kontrollera att filen finns
if (-not (Test-Path $filePath)) {
    Write-Host "Fel: Filen '$filePath' hittades inte!" -ForegroundColor Red
    exit 1
}

# Kontrollera att servern är igång först
Write-Host "Kontrollerar att servern är igång..." -ForegroundColor Cyan
try {
    $healthCheck = Invoke-WebRequest -Uri "http://localhost:8000/health" -Method Get -TimeoutSec 2
    Write-Host "✅ Server is running!" -ForegroundColor Green
} catch {
    Write-Host "❌ Server är inte igång!" -ForegroundColor Red
    Write-Host "Starta servern först med: uvicorn api.main:app --reload" -ForegroundColor Yellow
    exit 1
}

# Förbered multipart/form-data
Write-Host "Förbereder fil för upload..." -ForegroundColor Cyan
try {
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
    
    Write-Host "Skickar request (max 10 sekunder)..." -ForegroundColor Cyan
    
    # Skapa en jobb med timeout
    $job = Start-Job -ScriptBlock {
        param($uri, $bodyBytes, $boundary)
        try {
            $response = Invoke-WebRequest -Uri $uri -Method Post -Body $bodyBytes -ContentType "multipart/form-data; boundary=$boundary" -TimeoutSec 10
            return @{
                Success = $true
                StatusCode = $response.StatusCode
                Content = $response.Content
            }
        } catch {
            return @{
                Success = $false
                Error = $_.Exception.Message
                Response = if ($_.Exception.Response) {
                    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
                    $reader.ReadToEnd()
                } else { $null }
            }
        }
    } -ArgumentList $uri, $bodyBytes, $boundary
    
    # Vänta max 10 sekunder
    $result = $job | Wait-Job -Timeout 10 | Receive-Job
    Remove-Job $job
    
    if ($result -eq $null) {
        Write-Host "`n❌ Request timeout (10 sekunder)!" -ForegroundColor Red
        Write-Host "Detta kan bero på:" -ForegroundColor Yellow
        Write-Host "  1. R2-miljövariabler saknas eller är felaktiga" -ForegroundColor Yellow
        Write-Host "  2. R2-anslutningen är långsam" -ForegroundColor Yellow
        Write-Host "  3. Servern har hängt sig" -ForegroundColor Yellow
        exit 1
    }
    
    if ($result.Success) {
        Write-Host "`n✅ Upload lyckades!" -ForegroundColor Green
        Write-Host "Status: $($result.StatusCode)" -ForegroundColor Green
        Write-Host "Response:" -ForegroundColor Green
        $result.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
    } else {
        Write-Host "`n❌ Upload misslyckades!" -ForegroundColor Red
        Write-Host "Error: $($result.Error)" -ForegroundColor Red
        if ($result.Response) {
            Write-Host "Response: $($result.Response)" -ForegroundColor Yellow
        }
    }
    
} catch {
    Write-Host "`n❌ Fel vid förberedelse: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host $_.Exception.StackTrace -ForegroundColor Gray
}

