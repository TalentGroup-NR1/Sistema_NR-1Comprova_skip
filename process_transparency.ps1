Add-Type -AssemblyName System.Drawing
$imgPath = "src/assets/logo-nr1pronto.png"
$img = [System.Drawing.Image]::FromFile($imgPath)
$bmp = new-object System.Drawing.Bitmap($img)
for ($x = 0; $x -lt $bmp.Width; $x++) {
    for ($y = 0; $y -lt $bmp.Height; $y++) {
        $pixel = $bmp.GetPixel($x, $y)
        if ($pixel.R -gt 230 -and $pixel.G -gt 230 -and $pixel.B -gt 230) {
            $bmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 255, 255, 255))
        }
    }
}
$img.Dispose()
$bmp.Save("public/images/nr1-pronto-logo.png", [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Save("public/favicon.png", [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Save("src/assets/logo-nr1pronto.png", [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
