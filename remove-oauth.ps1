$lines = Get-Content 'E:\cinagroup\cinaauth\demo\nextjs\lib\auth.ts'
$result = @()
$i = 0
while ($i -lt $lines.Count) {
    if ($lines[$i] -match 'oAuthProxy\(') {
        $depth = 0
        while ($i -lt $lines.Count) {
            if ($lines[$i] -match 'oAuthProxy\(') { $depth++ }
            if ($lines[$i] -match '\),' -and $depth -gt 0) { $depth--; if ($depth -eq 0) { $i++; break } }
            $i++
        }
    } else {
        $result += $lines[$i]
        $i++
    }
}
[System.IO.File]::WriteAllLines('E:\cinagroup\cinaauth\demo\nextjs\lib\auth.ts', $result, [System.Text.UTF8Encoding]::new($false))
$c = [System.IO.File]::ReadAllText('E:\cinagroup\cinaauth\demo\nextjs\lib\auth.ts')
Write-Output ('oAuthProxy removed: ' + (-not $c.Contains('oAuthProxy')))
