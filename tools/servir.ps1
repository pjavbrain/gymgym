# Servidor estatico minimo para desarrollo (sin dependencias).
# Uso:  powershell -ExecutionPolicy Bypass -File tools\servir.ps1 [-Port 4173]
# El service worker necesita http://, no file://.

param([int]$Port = 4173)

$raiz = Split-Path -Parent $PSScriptRoot
$prefix = "http://localhost:$Port/"

$mime = @{
  '.html' = 'text/html; charset=utf-8'
  '.js'   = 'text/javascript; charset=utf-8'
  '.mjs'  = 'text/javascript; charset=utf-8'
  '.css'  = 'text/css; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'
  '.png'  = 'image/png'
  '.svg'  = 'image/svg+xml'
  '.ico'  = 'image/x-icon'
  '.webmanifest' = 'application/manifest+json'
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)
$listener.Start()
Write-Host "Sirviendo $raiz en $prefix  (Ctrl+C para parar)"

try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $req = $ctx.Request
    $res = $ctx.Response
    try {
      $rel = [System.Uri]::UnescapeDataString($req.Url.AbsolutePath.TrimStart('/'))
      if ([string]::IsNullOrEmpty($rel)) { $rel = 'index.html' }
      $ruta = Join-Path $raiz $rel
      if (Test-Path $ruta -PathType Container) { $ruta = Join-Path $ruta 'index.html' }

      if (Test-Path $ruta -PathType Leaf) {
        $ext = [System.IO.Path]::GetExtension($ruta).ToLower()
        $ct = $mime[$ext]; if (-not $ct) { $ct = 'application/octet-stream' }
        $bytes = [System.IO.File]::ReadAllBytes($ruta)
        $res.ContentType = $ct
        $res.Headers.Add('Cache-Control', 'no-cache')
        $res.ContentLength64 = $bytes.Length
        $res.OutputStream.Write($bytes, 0, $bytes.Length)
      } else {
        $res.StatusCode = 404
        $b = [System.Text.Encoding]::UTF8.GetBytes('404')
        $res.OutputStream.Write($b, 0, $b.Length)
      }
    } catch {
      $res.StatusCode = 500
    } finally {
      $res.OutputStream.Close()
    }
  }
} finally {
  $listener.Stop()
}
