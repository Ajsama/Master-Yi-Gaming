@echo off
rem Lance Wuju Calc. Installe les dependances au premier lancement.
cd /d "%~dp0"
if not exist node_modules call npm install
start "" /min cmd /c "npm start"
