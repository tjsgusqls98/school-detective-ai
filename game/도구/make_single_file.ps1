# 게임 폴더의 모든 파일(코드, 디자인, 글꼴, 인물 그림)을 html 파일 하나로 묶습니다.
# 결과 파일은 game 폴더 바로 바깥에 "<원래 이름>_한파일.html"로 만들어집니다.
$ErrorActionPreference = 'Stop'
$game = Split-Path $PSScriptRoot -Parent
$utf8 = New-Object Text.UTF8Encoding($false)
$read = { param($p) [IO.File]::ReadAllText((Join-Path $game $p), [Text.Encoding]::UTF8) }
$b64 = { param($p) [Convert]::ToBase64String([IO.File]::ReadAllBytes((Join-Path $game $p))) }

$page = Get-ChildItem $game -Filter *.html -File | Where-Object { $_.Name -notlike '*_한파일*' } | Select-Object -First 1
if (-not $page) { throw 'game 폴더에서 html 파일을 찾지 못했어요.' }
$html = [IO.File]::ReadAllText($page.FullName, [Text.Encoding]::UTF8)

# 디자인 + 글꼴
$css = & $read 'css\style.css'
$css = $css.Replace("url('../fonts/Jua-Regular.ttf')", "url(data:font/ttf;base64," + (& $b64 'fonts\Jua-Regular.ttf') + ")")
$html = [regex]::Replace($html, '<link rel="stylesheet" href="css/style.css">', [Text.RegularExpressions.MatchEvaluator]{ param($m) "<style>`n$css`n</style>" })

# 인물 그림
$chars = @(Get-ChildItem (Join-Path $game 'assets\characters') -Filter *.png -File -ErrorAction SilentlyContinue)
$embed = ($chars | ForEach-Object { "'" + $_.BaseName + "':'data:image/png;base64," + [Convert]::ToBase64String([IO.File]::ReadAllBytes($_.FullName)) + "'" }) -join ','
$charScript = "<script>window.EMBED_CHARS = {" + $embed + "};</script>`n"

# 코드
$first = $true
$html = [regex]::Replace($html, '<script src="([^"]+)"></script>', [Text.RegularExpressions.MatchEvaluator]{
  param($m)
  $js = (& $read ($m.Groups[1].Value.Replace('/', '\'))).Replace('</script', '<\/script')
  $pre = ''; if ($script:first) { $pre = $charScript; $script:first = $false }
  $pre + "<script>`n" + $js + "`n</script>"
})
if ($html -match '<script src=|href="css/') { throw '묶지 못한 파일이 남아 있어요.' }

$out = Join-Path (Split-Path $game -Parent) ($page.BaseName + '_한파일.html')
[IO.File]::WriteAllText($out, $html, $utf8)
$mb = [math]::Round((Get-Item $out).Length / 1MB, 1)
Write-Host ''
Write-Host "완성: $out ($mb MB)"
Write-Host "인물 그림 $($chars.Count)개를 함께 넣었어요: $(($chars | ForEach-Object { $_.BaseName }) -join ', ')"
Write-Host '이 파일 하나만 옮겨도 실행돼요. 인물 그림을 바꾸면 이 도구를 다시 실행해 주세요.'
