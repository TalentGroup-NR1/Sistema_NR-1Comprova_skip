Add-Type -AssemblyName System.Drawing
$imgPath = "src/assets/logo-nr1pronto.png"
$img = [System.Drawing.Image]::FromFile($imgPath)
$bmp = new-object System.Drawing.Bitmap($img)
$blues = @()
for ($x = 0; $x -lt $bmp.Width; $x++) {
    for ($y = 0; $y -lt $bmp.Height; $y++) {
        $pixel = $bmp.GetPixel($x, $y)
        if ($pixel.B -gt ($pixel.R + 20) -and $pixel.B -gt ($pixel.G + 20)) {
            $blues += $pixel
        }
        if ($pixel.R -gt 240 -and $pixel.G -gt 240 -and $pixel.B -gt 240) {
            $bmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 255, 255, 255))
        }
    }
}
$img.Dispose()
$bmp.Save("public/images/nr1-pronto-logo.png", [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Save("public/favicon.png", [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Save("src/assets/logo-nr1pronto.png", [System.Drawing.Imaging.ImageFormat]::Png)

if ($blues.Count -gt 0) {
    $r = 0; $g = 0; $b = 0
    foreach ($c in $blues) { $r += $c.R; $g += $c.G; $b += $c.B }
    $r = [math]::Round($r / $blues.Count)
    $g = [math]::Round($g / $blues.Count)
    $b = [math]::Round($b / $blues.Count)
    Write-Host "Average Blue RGB: $r, $g, $b"
}
$bmp.Dispose()
