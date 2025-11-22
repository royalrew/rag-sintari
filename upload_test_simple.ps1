# Enkelt upload-kommando för PowerShell 5.1
# Användning: .\upload_test_simple.ps1

$filePath = ".\test.txt"
$uri = "http://localhost:8000/documents/upload"

$fileBytes = [System.IO.File]::ReadAllBytes($filePath)
$fileName = [System.IO.Path]::GetFileName($filePath)
$boundary = [System.Guid]::NewGuid().ToString()
$bodyLines = @("--$boundary", "Content-Disposition: form-data; name=`"file`"; filename=`"$fileName`"", "Content-Type: application/octet-stream", "", [System.Text.Encoding]::GetEncoding("iso-8859-1").GetString($fileBytes), "--$boundary--")
$body = $bodyLines -join "`r`n"
$bodyBytes = [System.Text.Encoding]::GetEncoding("iso-8859-1").GetBytes($body)
$response = Invoke-WebRequest -Uri $uri -Method Post -Body $bodyBytes -ContentType "multipart/form-data; boundary=$boundary"
$response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10

