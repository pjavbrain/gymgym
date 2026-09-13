# Genera los iconos PNG de la PWA sin dependencias externas.
# Uso:  powershell -ExecutionPolicy Bypass -File tools\generar-iconos.ps1
# Usa System.Drawing (incluido en Windows). Alternativa: tools\generar-iconos.mjs (Node).

Add-Type -AssemblyName System.Drawing

$raiz = Split-Path -Parent $PSScriptRoot
$dir  = Join-Path $raiz 'icons'
New-Item -ItemType Directory -Force -Path $dir | Out-Null

$fondo  = [System.Drawing.Color]::FromArgb(255, 0x1c, 0x1b, 0x19)   # caucho
$acento = [System.Drawing.Color]::FromArgb(255, 0x5a, 0x93, 0xf2)   # disco azul 20 kg

function New-Icono {
    param([int]$Tam, [double]$PadFrac, [string]$Ruta)

    $bmp = New-Object System.Drawing.Bitmap($Tam, $Tam)
    $g   = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.Clear($fondo)

    $brush = New-Object System.Drawing.SolidBrush($acento)
    $pad   = $Tam * $PadFrac
    $izq   = $pad
    $der   = $Tam - $pad
    $ancho = $der - $izq
    $cy    = $Tam / 2.0
    $grosor = $ancho * 0.11

    # barra central
    $g.FillRectangle($brush, [single]($izq + $ancho * 0.28), [single]($cy - $grosor * 0.55), [single]($ancho * 0.44), [single]($grosor * 1.1))
    # discos internos
    $g.FillRectangle($brush, [single]($izq + $ancho * 0.16), [single]($cy - $grosor * 1.5), [single]($ancho * 0.12), [single]($grosor * 3.0))
    $g.FillRectangle($brush, [single]($der - $ancho * 0.28), [single]($cy - $grosor * 1.5), [single]($ancho * 0.12), [single]($grosor * 3.0))
    # discos externos
    $g.FillRectangle($brush, [single]($izq + $ancho * 0.03), [single]($cy - $grosor * 1.9), [single]($ancho * 0.13), [single]($grosor * 3.8))
    $g.FillRectangle($brush, [single]($der - $ancho * 0.16), [single]($cy - $grosor * 1.9), [single]($ancho * 0.13), [single]($grosor * 3.8))

    $bmp.Save($Ruta, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose(); $brush.Dispose(); $bmp.Dispose()
    Write-Host "  escrito $([System.IO.Path]::GetFileName($Ruta)) ($Tam x $Tam)"
}

New-Icono -Tam 192 -PadFrac 0.14 -Ruta (Join-Path $dir 'icon-192.png')
New-Icono -Tam 512 -PadFrac 0.14 -Ruta (Join-Path $dir 'icon-512.png')
New-Icono -Tam 512 -PadFrac 0.26 -Ruta (Join-Path $dir 'icon-maskable-512.png')
New-Icono -Tam 180 -PadFrac 0.14 -Ruta (Join-Path $dir 'apple-touch-icon.png')
Write-Host 'Listo.'
