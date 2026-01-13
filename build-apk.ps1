$env:JAVA_HOME = "C:\Android\jdk-21.0.5+11"
$env:ANDROID_HOME = "C:\Android"
$env:PATH = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\cmdline-tools\latest\bin;$env:ANDROID_HOME\platform-tools;$env:PATH"

Set-Location "C:\Users\PCS\pms\android"

Write-Host "Building APK..."
& ".\gradlew.bat" assembleDebug
