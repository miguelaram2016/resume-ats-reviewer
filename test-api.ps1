$body = @{
    resume = "Miguel Ramirez`nEmail: miguel@example.com`nPhone: (555) 123-4567`n`nPROFESSIONAL SUMMARY`nTest`n`nWORK EXPERIENCE`nTest`n`nEDUCATION`nTest`n`nSKILLS`nTest"
    jd = ""
} | ConvertTo-Json

Invoke-RestMethod -Uri 'http://localhost:3002/api/analyze' -Method Post -ContentType 'application/json' -Body $body
