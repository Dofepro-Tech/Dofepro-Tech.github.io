using namespace System.Drawing
using namespace System.Drawing.Drawing2D
using namespace System.Drawing.Imaging

Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$logoPath = Join-Path $root 'src/assets/biblia-nj-logo.png'

if (-not (Test-Path $logoPath)) {
  throw "Logo source not found at $logoPath"
}

$logoSource = [Bitmap]::new($logoPath)

$palette = @{
  BlueDark = [ColorTranslator]::FromHtml('#0b1f4f')
  Blue = [ColorTranslator]::FromHtml('#153560')
  BlueSoft = [ColorTranslator]::FromHtml('#2f84d8')
  Gold = [ColorTranslator]::FromHtml('#f3c96f')
}

function New-Graphics([Bitmap]$bitmap) {
  $graphics = [Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [SmoothingMode]::AntiAlias
  $graphics.InterpolationMode = [InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [PixelOffsetMode]::HighQuality
  $graphics.CompositingQuality = [CompositingQuality]::HighQuality
  return $graphics
}

function Ensure-ParentDirectory([string]$path) {
  $parentDirectory = Split-Path -Parent $path
  if (-not (Test-Path $parentDirectory)) {
    New-Item -ItemType Directory -Path $parentDirectory -Force | Out-Null
  }
}

function Draw-ContainedImage([Graphics]$graphics, [Image]$image, [RectangleF]$bounds, [float]$paddingRatio) {
  $availableWidth = $bounds.Width * (1 - ($paddingRatio * 2))
  $availableHeight = $bounds.Height * (1 - ($paddingRatio * 2))
  $scale = [Math]::Min($availableWidth / $image.Width, $availableHeight / $image.Height)
  $drawWidth = $image.Width * $scale
  $drawHeight = $image.Height * $scale
  $drawX = $bounds.X + (($bounds.Width - $drawWidth) / 2)
  $drawY = $bounds.Y + (($bounds.Height - $drawHeight) / 2)

  $graphics.DrawImage($image, $drawX, $drawY, $drawWidth, $drawHeight)
}

function New-LauncherBitmap([int]$width, [int]$height, [string]$kind) {
  $bitmap = [Bitmap]::new($width, $height)
  $graphics = New-Graphics $bitmap
  $graphics.Clear([Color]::Transparent)

  $paddingRatio = switch ($kind) {
    'foreground' { 0.14 }
    'splashLogo' { 0.18 }
    default { 0.03 }
  }
  Draw-ContainedImage $graphics $logoSource ([RectangleF]::new(0, 0, $width, $height)) $paddingRatio

  $graphics.Dispose()
  return $bitmap
}

function New-WebBrandBitmap([int]$width, [int]$height) {
  $bitmap = [Bitmap]::new($width, $height)
  $graphics = New-Graphics $bitmap
  $graphics.Clear([Color]::Transparent)

  Draw-ContainedImage $graphics $logoSource ([RectangleF]::new(0, 0, $width, $height)) 0.0

  $graphics.Dispose()
  return $bitmap
}

function New-SplashBitmap([int]$width, [int]$height) {
  $bitmap = [Bitmap]::new($width, $height)
  $graphics = New-Graphics $bitmap

  $backgroundBrush = [LinearGradientBrush]::new(
    [PointF]::new(0, 0),
    [PointF]::new($width, $height),
    $palette.BlueSoft,
    $palette.BlueDark
  )
  $graphics.FillRectangle($backgroundBrush, 0, 0, $width, $height)

  $glowBrushTop = [SolidBrush]::new([Color]::FromArgb(34, $palette.Gold))
  $glowBrushBottom = [SolidBrush]::new([Color]::FromArgb(28, $palette.Blue))
  $graphics.FillEllipse($glowBrushTop, $width * 0.14, $height * 0.10, $width * 0.72, $height * 0.46)
  $graphics.FillEllipse($glowBrushBottom, $width * 0.08, $height * 0.44, $width * 0.84, $height * 0.40)

  $logoBounds = [RectangleF]::new($width * 0.17, $height * 0.13, $width * 0.66, $height * 0.56)
  Draw-ContainedImage $graphics $logoSource $logoBounds 0.0

  $backgroundBrush.Dispose()
  $glowBrushTop.Dispose()
  $glowBrushBottom.Dispose()
  $graphics.Dispose()
  return $bitmap
}

function Save-Png([Bitmap]$bitmap, [string]$relativePath) {
  $targetPath = Join-Path $root $relativePath
  Ensure-ParentDirectory $targetPath
  $bitmap.Save($targetPath, [ImageFormat]::Png)
  $bitmap.Dispose()
}

$iconTargets = @(
  @{ Kind = 'icon'; RelativePath = 'android/app/src/main/res/mipmap-mdpi/ic_launcher.png'; Width = 48; Height = 48 },
  @{ Kind = 'icon'; RelativePath = 'android/app/src/main/res/mipmap-hdpi/ic_launcher.png'; Width = 72; Height = 72 },
  @{ Kind = 'icon'; RelativePath = 'android/app/src/main/res/mipmap-xhdpi/ic_launcher.png'; Width = 96; Height = 96 },
  @{ Kind = 'icon'; RelativePath = 'android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png'; Width = 144; Height = 144 },
  @{ Kind = 'icon'; RelativePath = 'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png'; Width = 192; Height = 192 },
  @{ Kind = 'round'; RelativePath = 'android/app/src/main/res/mipmap-mdpi/ic_launcher_round.png'; Width = 48; Height = 48 },
  @{ Kind = 'round'; RelativePath = 'android/app/src/main/res/mipmap-hdpi/ic_launcher_round.png'; Width = 72; Height = 72 },
  @{ Kind = 'round'; RelativePath = 'android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.png'; Width = 96; Height = 96 },
  @{ Kind = 'round'; RelativePath = 'android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png'; Width = 144; Height = 144 },
  @{ Kind = 'round'; RelativePath = 'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png'; Width = 192; Height = 192 },
  @{ Kind = 'foreground'; RelativePath = 'android/app/src/main/res/mipmap-mdpi/ic_launcher_foreground.png'; Width = 108; Height = 108 },
  @{ Kind = 'foreground'; RelativePath = 'android/app/src/main/res/mipmap-hdpi/ic_launcher_foreground.png'; Width = 162; Height = 162 },
  @{ Kind = 'foreground'; RelativePath = 'android/app/src/main/res/mipmap-xhdpi/ic_launcher_foreground.png'; Width = 216; Height = 216 },
  @{ Kind = 'foreground'; RelativePath = 'android/app/src/main/res/mipmap-xxhdpi/ic_launcher_foreground.png'; Width = 324; Height = 324 },
  @{ Kind = 'foreground'; RelativePath = 'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png'; Width = 432; Height = 432 },
  @{ Kind = 'splashLogo'; RelativePath = 'android/app/src/main/res/drawable-nodpi/splash_logo.png'; Width = 960; Height = 960 }
)

$splashTargets = @(
  @{ RelativePath = 'android/app/src/main/res/drawable/splash.png'; Width = 480; Height = 320 },
  @{ RelativePath = 'android/app/src/main/res/drawable-land-mdpi/splash.png'; Width = 480; Height = 320 },
  @{ RelativePath = 'android/app/src/main/res/drawable-land-hdpi/splash.png'; Width = 800; Height = 480 },
  @{ RelativePath = 'android/app/src/main/res/drawable-land-xhdpi/splash.png'; Width = 1280; Height = 720 },
  @{ RelativePath = 'android/app/src/main/res/drawable-land-xxhdpi/splash.png'; Width = 1600; Height = 960 },
  @{ RelativePath = 'android/app/src/main/res/drawable-land-xxxhdpi/splash.png'; Width = 1920; Height = 1280 },
  @{ RelativePath = 'android/app/src/main/res/drawable-port-mdpi/splash.png'; Width = 320; Height = 480 },
  @{ RelativePath = 'android/app/src/main/res/drawable-port-hdpi/splash.png'; Width = 480; Height = 800 },
  @{ RelativePath = 'android/app/src/main/res/drawable-port-xhdpi/splash.png'; Width = 720; Height = 1280 },
  @{ RelativePath = 'android/app/src/main/res/drawable-port-xxhdpi/splash.png'; Width = 960; Height = 1600 },
  @{ RelativePath = 'android/app/src/main/res/drawable-port-xxxhdpi/splash.png'; Width = 1280; Height = 1920 }
)

$webTargets = @(
  @{ RelativePath = 'src/assets/biblia-nj-logo-ui.png'; Width = 320; Height = 320 },
  @{ RelativePath = 'src/assets/biblia-nj-logo-splash.png'; Width = 512; Height = 512 },
  @{ RelativePath = 'public/favicon.png'; Width = 128; Height = 128 }
)

foreach ($target in $iconTargets) {
  $bitmap = New-LauncherBitmap -width $target.Width -height $target.Height -kind $target.Kind
  Save-Png $bitmap $target.RelativePath
}

foreach ($target in $splashTargets) {
  $bitmap = New-SplashBitmap -width $target.Width -height $target.Height
  Save-Png $bitmap $target.RelativePath
}

foreach ($target in $webTargets) {
  $bitmap = New-WebBrandBitmap -width $target.Width -height $target.Height
  Save-Png $bitmap $target.RelativePath
}

$logoSource.Dispose()

Write-Output 'Brand assets generated successfully.'