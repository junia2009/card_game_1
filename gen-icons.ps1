Add-Type -AssemblyName System.Drawing

function Add-RoundRect {
  param($path, [float]$x, [float]$y, [float]$w, [float]$h, [float]$r)
  $path.AddArc($x,           $y,           2*$r, 2*$r, 180, 90)
  $path.AddArc($x+$w-2*$r,  $y,           2*$r, 2*$r, -90, 90)
  $path.AddArc($x+$w-2*$r,  $y+$h-2*$r,  2*$r, 2*$r,   0, 90)
  $path.AddArc($x,           $y+$h-2*$r,  2*$r, 2*$r,  90, 90)
  $path.CloseFigure()
}

function New-CyberIcon {
  param([int]$sz, [string]$outPath)

  $bmp = New-Object System.Drawing.Bitmap($sz, $sz, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g   = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode      = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.InterpolationMode  = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode    = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.TextRenderingHint  = [System.Drawing.Text.TextRenderingHint]::AntiAlias

  # ━━━ 1. 背景: 中心=深宇宙ブルー / 周縁=漆黒 ━━━━━━━━━━━━━━━━━━
  $bgPath = New-Object System.Drawing.Drawing2D.GraphicsPath
  $bgPath.AddRectangle([System.Drawing.RectangleF]::new(0,0,$sz,$sz))
  $pgb = New-Object System.Drawing.Drawing2D.PathGradientBrush($bgPath)
  $pgb.CenterPoint  = [System.Drawing.PointF]::new($sz/2, $sz/2)
  $pgb.CenterColor  = [System.Drawing.Color]::FromArgb(255, 6, 14, 50)
  $pgb.SurroundColors = @([System.Drawing.Color]::FromArgb(255, 1, 3, 10))
  $g.FillRectangle([System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255,1,3,10)), 0,0,$sz,$sz)
  $g.FillRectangle($pgb, 0, 0, $sz, $sz)
  $pgb.Dispose(); $bgPath.Dispose()

  # ━━━ 2. 細グリッド ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  $gs   = [int]($sz / 8)
  $gPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(22, 0, 180, 220), 0.6)
  for ($i = 0; $i -le $sz; $i += $gs) {
    $g.DrawLine($gPen, $i, 0, $i, $sz)
    $g.DrawLine($gPen, 0, $i, $sz, $i)
  }
  $gPen.Dispose()

  # ━━━ 3. 星 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  $rng = New-Object System.Random(7)
  $starBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
  @(0.08,0.14; 0.22,0.07; 0.88,0.10; 0.78,0.22; 0.93,0.60;
    0.04,0.68; 0.14,0.88; 0.82,0.85; 0.55,0.04; 0.42,0.92;
    0.66,0.78; 0.30,0.18; 0.97,0.35; 0.60,0.95; 0.48,0.06) | ForEach-Object -Begin {$xi=0;$pts=@()} -Process {
      if ($xi % 2 -eq 0) { $pts += @($_) } else { $pts[-1] = @($pts[-1], $_) }
      $xi++
    } -End {}
  $starCoords = @(
    @(0.08,0.14), @(0.22,0.07), @(0.88,0.10), @(0.78,0.22), @(0.93,0.60),
    @(0.04,0.68), @(0.14,0.88), @(0.82,0.85), @(0.55,0.04), @(0.42,0.92),
    @(0.66,0.78), @(0.30,0.18), @(0.97,0.35), @(0.62,0.96), @(0.48,0.06),
    @(0.02,0.35), @(0.95,0.80), @(0.38,0.02), @(0.74,0.48), @(0.16,0.52)
  )
  foreach ($sc in $starCoords) {
    $ss = [float]($sz * (0.008 + $rng.NextDouble() * 0.020))
    $alpha = $rng.Next(120, 240)
    $starBrush.Color = [System.Drawing.Color]::FromArgb($alpha, 200, 220, 255)
    $g.FillEllipse($starBrush, [float]($sc[0]*$sz), [float]($sc[1]*$sz), $ss, $ss)
  }
  $starBrush.Dispose()

  # ━━━ 4. 外周グローリング ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  $rim = [float]($sz * 0.055)
  for ($gl = 6; $gl -ge 1; $gl--) {
    $ex  = [float]($gl * $sz * 0.009)
    $alp = [int](8 + $gl * 7)
    $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb($alp, 0, 200, 255), ($ex * 2.2))
    $g.DrawEllipse($pen, $rim - $ex, $rim - $ex, $sz - 2*$rim + 2*$ex, $sz - 2*$rim + 2*$ex)
    $pen.Dispose()
  }
  $ringPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(210, 0, 230, 255), [float]([Math]::Max(1.2, $sz * 0.014)))
  $g.DrawEllipse($ringPen, $rim, $rim, $sz - 2*$rim, $sz - 2*$rim)
  $ringPen.Dispose()

  # ━━━ 5. カード形シルエット ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  $cw = [float]($sz * 0.50)
  $ch = [float]($sz * 0.68)
  $cx = [float](($sz - $cw) / 2)
  $cy = [float](($sz - $ch) / 2)
  $cr = [float]($cw * 0.11)

  # カードグロー (外側)
  for ($gl = 5; $gl -ge 1; $gl--) {
    $ex  = [float]($gl * $sz * 0.011)
    $alp = [int]($gl * 10)
    $cardGlowPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    Add-RoundRect $cardGlowPath ($cx - $ex) ($cy - $ex) ($cw + 2*$ex) ($ch + 2*$ex) ($cr + $ex)
    $cgb = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb($alp, 0, 180, 255))
    $g.FillPath($cgb, $cardGlowPath)
    $cgb.Dispose(); $cardGlowPath.Dispose()
  }

  # カード本体
  $cardPath = New-Object System.Drawing.Drawing2D.GraphicsPath
  Add-RoundRect $cardPath $cx $cy $cw $ch $cr
  $cardFill = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(215, 4, 10, 38))
  $g.FillPath($cardFill, $cardPath)
  $cardFill.Dispose()

  # カード枠線
  $borderPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(230, 0, 210, 255), [float]([Math]::Max(1.0, $sz * 0.011)))
  $g.DrawPath($borderPen, $cardPath)
  $borderPen.Dispose(); $cardPath.Dispose()

  # ━━━ 6. スペードシンボル (ネオンシアン) ━━━━━━━━━━━━━━━━━━━━━━
  if ($sz -ge 64) {
    $fontSize = [float]($sz * 0.36)
    $fontName = "Segoe UI Symbol"
    try { $font = New-Object System.Drawing.Font($fontName, $fontSize, [System.Drawing.FontStyle]::Bold) }
    catch { $font = New-Object System.Drawing.Font("Arial", $fontSize, [System.Drawing.FontStyle]::Bold) }

    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment     = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
    $rect = [System.Drawing.RectangleF]::new(0, -$sz*0.04, $sz, $sz)

    # グロー: 大→小
    for ($gl = 5; $gl -ge 1; $gl--) {
      $alp = [int]($gl * 16)
      for ($ox = -1; $ox -le 1; $ox++) {
        for ($oy = -1; $oy -le 1; $oy++) {
          $off = [float]($gl * $sz * 0.008)
          $gr2 = [System.Drawing.RectangleF]::new($ox * $off, -$sz*0.04 + $oy * $off, $sz, $sz)
          $gb2 = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb($alp, 0, 220, 255))
          $g.DrawString([char]0x2660, $font, $gb2, $gr2, $sf)
          $gb2.Dispose()
        }
      }
    }

    # メイン
    $spadeBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 0, 240, 255))
    $g.DrawString([char]0x2660, $font, $spadeBrush, $rect, $sf)
    $spadeBrush.Dispose()
    $font.Dispose()
  } else {
    # 32px ファビコン: シンプルなスペードだけ
    $fnt = New-Object System.Drawing.Font("Segoe UI Symbol", 16, [System.Drawing.FontStyle]::Bold)
    $sf2 = New-Object System.Drawing.StringFormat
    $sf2.Alignment = [System.Drawing.StringAlignment]::Center
    $sf2.LineAlignment = [System.Drawing.StringAlignment]::Center
    $br2 = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 0, 240, 255))
    $g.DrawString([char]0x2660, $fnt, $br2, [System.Drawing.RectangleF]::new(0,0,$sz,$sz), $sf2)
    $br2.Dispose(); $fnt.Dispose()
  }

  # ━━━ 7. コーナー小マーク ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if ($sz -ge 96) {
    $mfs = [float]($sz * 0.095)
    try { $mf = New-Object System.Drawing.Font("Segoe UI Symbol", $mfs, [System.Drawing.FontStyle]::Regular) }
    catch { $mf = $null }
    if ($null -ne $mf) {
      $mb = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(120, 0, 200, 255))
      $msf = New-Object System.Drawing.StringFormat
      $msf.Alignment = [System.Drawing.StringAlignment]::Near
      $msf.LineAlignment = [System.Drawing.StringAlignment]::Near
      $pad = [float]($sz * 0.07)
      # 左上
      $g.DrawString([char]0x2660, $mf, $mb, [System.Drawing.RectangleF]::new($pad,$pad,$mfs*2,$mfs*2), $msf)
      # 右下 (回転)
      $g.TranslateTransform($sz, $sz)
      $g.RotateTransform(180)
      $g.DrawString([char]0x2660, $mf, $mb, [System.Drawing.RectangleF]::new($pad,$pad,$mfs*2,$mfs*2), $msf)
      $g.ResetTransform()
      $mb.Dispose(); $mf.Dispose()
    }
  }

  # ━━━ 保存（日本語パス回避: ASCII一時ファイル経由） ━━━━━━━━━━━━
  $tmp = [System.IO.Path]::GetTempFileName() -replace '\.tmp$', '.png'
  $bmp.Save($tmp, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose(); $g.Dispose()
  Copy-Item -LiteralPath $tmp -Destination $outPath -Force
  Remove-Item $tmp -ErrorAction SilentlyContinue
  Write-Host "Generated: $outPath ($sz x $sz)"
}

$base = "C:\Temp\cybericons"
New-Item -ItemType Directory -Force -Path $base | Out-Null
New-CyberIcon 512 "$base\icon-512.png"
New-CyberIcon 192 "$base\icon-192.png"
New-CyberIcon 180 "$base\apple-touch-icon.png"
New-CyberIcon  32 "$base\favicon-32.png"
Write-Host "Done. Files saved to $base"
