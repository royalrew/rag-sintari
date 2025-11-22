# Enklare PowerShell-kommando för att testa R2 upload
# Användning: .\test_upload_simple.ps1

$filePath = "test.pdf"  # Ändra till din testfil
$uri = "http://localhost:8000/documents/upload"

# Kontrollera att filen finns
if (-not (Test-Path $filePath)) {
    Write-Host "Fel: Filen '$filePath' hittades inte!" -ForegroundColor Red
    Write-Host "Skapa en testfil eller ändra \$filePath i scriptet." -ForegroundColor Yellow
    exit 1
}

# Använd Invoke-RestMethod som hanterar multipart/form-data bättre
try {
    $form = @{
        file = Get-Item -Path $filePath
    }
    
    $response = Invoke-RestMethod -Uri $uri -Method Post -Form $form
    
    Write-Host "`n✅ Upload lyckades!" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "`n❌ Upload misslyckades!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Red
    }
}



