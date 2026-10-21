Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\LENOVO\.gemini\antigravity\brain\e114dfb9-331a-422a-8b34-58c30b44a4c3\.user_uploaded\media_1792604862801_7736781b.jpg"
$srcImg = [System.Drawing.Image]::FromFile($srcPath)

function Save-ResizedImage($width, $height, $destPath) {
    $bmp = New-Object System.Drawing.Bitmap $width, $height
    $graphics = [System.Drawing.Graphics]::FromImage($bmp)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.DrawImage($srcImg, 0, 0, $width, $height)
    $bmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose()
    $bmp.Dispose()
    Write-Host "Generated: $destPath ($width x $height)"
}

# 1. Main app icon (1024x1024)
Save-ResizedImage 1024 1024 "assets\images\icon.png"

# 2. Favicon (192x192 & 512x512)
Save-ResizedImage 192 192 "assets\images\favicon.png"
Save-ResizedImage 192 192 "public\favicon.png"

# 3. Splash icon (512x512)
Save-ResizedImage 512 512 "assets\images\splash-icon.png"

# 4. Android Adaptive icon foreground (1024x1024)
Save-ResizedImage 1024 1024 "assets\images\android-icon-foreground.png"

$srcImg.Dispose()
Write-Host "All icons updated successfully!"
