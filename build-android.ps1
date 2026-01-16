$env:JAVA_HOME = "C:\Android\jdk-21.0.5+11"
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
Set-Location "C:\Users\PCS\pms\android"
& .\gradlew.bat assembleDebug
if ($LASTEXITCODE -eq 0) {
    Write-Host "Build successful!"
    Copy-Item "C:\Users\PCS\pms\android\app\build\outputs\apk\debug\app-debug.apk" "C:\Users\PCS\OneDrive\Desktop\PMS-app.apk" -Force
    Write-Host "Copied APK to Desktop as PMS-app.apk"
}
