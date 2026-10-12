# Dead's Cloner - servidor estatico simples (sem dependencias)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$port = 7777
$prefix = "http://localhost:$port/"

$mime = @{
  ".html"="text/html; charset=utf-8"; ".htm"="text/html; charset=utf-8";
  ".css"="text/css; charset=utf-8"; ".js"="application/javascript; charset=utf-8";
  ".json"="application/json"; ".svg"="image/svg+xml"; ".png"="image/png";
  ".jpg"="image/jpeg"; ".jpeg"="image/jpeg"; ".gif"="image/gif"; ".webp"="image/webp";
  ".avif"="image/avif"; ".ico"="image/x-icon"; ".bmp"="image/bmp";
  ".woff"="font/woff"; ".woff2"="font/woff2"; ".ttf"="font/ttf"; ".otf"="font/otf"; ".eot"="application/vnd.ms-fontobject";
  ".mp4"="video/mp4"; ".webm"="video/webm"; ".mov"="video/quicktime";
  ".mp3"="audio/mpeg"; ".wav"="audio/wav"; ".ogg"="audio/ogg"
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)
try { $listener.Start() } catch {
  Write-Host "Nao consegui abrir a porta $port. Feche quem estiver usando e tente de novo." -ForegroundColor Red
  Read-Host "Enter pra sair"; exit 1
}
Write-Host ""
Write-Host "  Dead's Cloner - servindo em $prefix" -ForegroundColor Red
Write-Host "  (feche esta janela pra parar)" -ForegroundColor DarkGray
Write-Host ""
Start-Process $prefix

while ($listener.IsListening) {
  try {
    $ctx = $listener.GetContext()
  } catch { break }
  $req = $ctx.Request
  $res = $ctx.Response
  try {
    $rel = [System.Uri]::UnescapeDataString($req.Url.AbsolutePath.TrimStart("/"))
    if ($rel -eq "") { $rel = "index.html" }
    $path = Join-Path $root $rel
    if ((Test-Path $path) -and ((Get-Item $path).PSIsContainer)) { $path = Join-Path $path "index.html" }
    if (Test-Path $path) {
      $bytes = [System.IO.File]::ReadAllBytes($path)
      $ext = [System.IO.Path]::GetExtension($path).ToLower()
      $ct = $mime[$ext]; if (-not $ct) { $ct = "application/octet-stream" }
      $res.ContentType = $ct
      $res.ContentLength64 = $bytes.Length
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $res.StatusCode = 404
      $msg = [System.Text.Encoding]::UTF8.GetBytes("404 - nao encontrado: $rel")
      $res.OutputStream.Write($msg, 0, $msg.Length)
    }
  } catch {} finally { $res.OutputStream.Close() }
}
