# actualizar-semana.ps1
# Escanea assets/semana/ y genera index.json con la lista de fotos
# Uso: doble clic en este archivo (o boton derecho -> Ejecutar con PowerShell)

$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $here

$folder = Join-Path $here 'assets\semana'
$jsonPath = Join-Path $folder 'index.json'

if (-not (Test-Path $folder)) {
    Write-Host "ERROR: No existe la carpeta assets\semana" -ForegroundColor Red
    Read-Host "Enter para salir"
    exit 1
}

# Buscar imagenes (jpg, jpeg, png, webp) - ordenadas por fecha de modificacion descendente (mas nuevas primero)
$exts = @('.jpg', '.jpeg', '.png', '.webp')
$files = Get-ChildItem $folder -File |
    Where-Object { $exts -contains $_.Extension.ToLower() } |
    Sort-Object LastWriteTime -Descending |
    Select-Object -ExpandProperty Name

if (-not $files -or $files.Count -eq 0) {
    Write-Host "ATENCION: No se encontraron imagenes en assets\semana" -ForegroundColor Yellow
    '[]' | Out-File -FilePath $jsonPath -Encoding utf8 -NoNewline
    Write-Host "  index.json escrito como lista vacia." -ForegroundColor Yellow
    Read-Host "Enter para salir"
    exit 0
}

# Forzar array (incluso si es 1 sola foto) y serializar
$json = ConvertTo-Json @($files) -Compress
[System.IO.File]::WriteAllText($jsonPath, $json, [System.Text.UTF8Encoding]::new($false))

Write-Host ""
Write-Host "OK Actualizado: assets\semana\index.json" -ForegroundColor Green
Write-Host "  $($files.Count) foto(s) detectada(s):" -ForegroundColor Cyan
$files | ForEach-Object { Write-Host "    - $_" }
Write-Host ""
Write-Host "Ahora puedes subir la carpeta a Netlify." -ForegroundColor Green
Write-Host ""
Read-Host "Enter para salir"
