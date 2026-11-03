# ==============================================================================
# INFYPOS Enterprise - Windows PowerShell Backup Script
# ==============================================================================
param (
    [string]$DbHost = "localhost",
    [int]$DbPort = 5432,
    [string]$DbUser = "postgres",
    [string]$DbName = "infypos",
    [string]$BackupDir = ".\backups"
)

$ErrorActionPreference = "Stop"
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = Join-Path $BackupDir "infypos_${DbName}_${Timestamp}.sql"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Starting INFYPOS Windows Backup at $(Get-Date)" -ForegroundColor Cyan
Write-Host "Target: ${DbUser}@${DbHost}:${DbPort}/${DbName}" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
}

Write-Host "Executing pg_dump..." -ForegroundColor Yellow
& pg_dump -h $DbHost -p $DbPort -U $DbUser -d $DbName -f $BackupFile

if ($LASTEXITCODE -eq 0) {
    Write-Host "Backup created: $BackupFile" -ForegroundColor Green
} else {
    Write-Host "pg_dump failed with exit code $LASTEXITCODE" -ForegroundColor Red
}
