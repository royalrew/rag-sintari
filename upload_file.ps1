# PowerShell script för att ladda upp filer till /documents/upload endpoint
# Användning: .\upload_file.ps1 -FilePath "path\to\file.pdf"

param(
    [Parameter(Mandatory=$true)]
    [string]$FilePath
)

$uri = "http://localhost:8000/documents/upload"

# Kontrollera att filen finns
if (-not (Test-Path $filePath)) {
    Write-Host "Fel: Filen '$FilePath' hittades inte!" -ForegroundColor Red
    Write-Host "Kontrollera att sökvägen är korrekt." -ForegroundColor Yellow
    exit 1
}

# Använd Invoke-RestMethod som hanterar multipart/form-data korrekt
try {
    $form = @{
        file = Get-Item -Path $FilePath
    }
    
    Write-Host "Laddar upp fil: $FilePath" -ForegroundColor Cyan
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

