$files = @(
  "D:\costco\costco-app\src\components\pages\AutoAlloc\AutoAlloc.tsx",
  "D:\costco\costco-app\src\app\api\distribution\export\route.ts"
)
foreach ($f in $files) {
  $c = [System.IO.File]::ReadAllText($f)
  $c2 = $c.Replace("'Ca 1'", "'C1'").Replace("'Ca 2'", "'C2'").Replace(">Ca 1<", ">C1<").Replace(">Ca 2<", ">C2<")
  [System.IO.File]::WriteAllText($f, $c2)
  Write-Output "OK: $f"
}
