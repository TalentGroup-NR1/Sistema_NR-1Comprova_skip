Add-Type -AssemblyName System.Drawing
$imgPath = "src/assets/logo-nr1pronto.png"
$img = [System.Drawing.Image]::FromFile($imgPath)
$bmp = new-object System.Drawing.Bitmap($img)
$colors = @{}
for ($x = 0; $x -lt $bmp.Width; $x+=5) {
    for ($y = 0; $y -lt $bmp.Height; $y+=5) {
        $pixel = $bmp.GetPixel($x, $y)
        if ($pixel.A -gt 10 -and ($pixel.R -lt 240 -or $pixel.G -lt 240 -or $pixel.B -lt 240) -and ($pixel.R -gt 15 -or $pixel.G -gt 15 -or $pixel.B -gt 15)) {
            $key = $pixel.R.ToString() + ", " + $pixel.G.ToString() + ", " + $pixel.B.ToString()
            if ($colors.ContainsKey($key)) { $colors[$key]++ }
            else { $colors[$key] = 1 }
        }
    }
}
$img.Dispose()
$bmp.Dispose()
$colors.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 10 | ForEach-Object { Write-Host ($_.Key + " : " + $_.Value) }
