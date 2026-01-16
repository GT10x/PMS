@echo off
set JAVA_HOME=C:\Program Files\Microsoft\jdk-17.0.17.10-hotspot
set PATH=%JAVA_HOME%\bin;%PATH%
cd /d C:\Users\PCS\pms\android
call gradlew.bat assembleDebug
if %ERRORLEVEL% EQU 0 (
    echo.
    echo Build successful!
    echo APK location: C:\Users\PCS\pms\android\app\build\outputs\apk\debug\app-debug.apk
    copy "C:\Users\PCS\pms\android\app\build\outputs\apk\debug\app-debug.apk" "C:\Users\PCS\OneDrive\Desktop\PMS-app.apk"
    echo Copied to Desktop as PMS-app.apk
)
