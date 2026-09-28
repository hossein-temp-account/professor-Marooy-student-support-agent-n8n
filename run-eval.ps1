# Usage (from the project folder, PowerShell):
#   .\run-eval.ps1
# Requires: workflow ACTIVE in n8n, response JSON containing "category" and "priority".

$Url    = "http://localhost:5678/webhook/student-support"
$Labels = ".\evals\classification_labels.jsonl"
$Out    = ".\evals\eval_results.csv"

$rows = @()
$i = 0
foreach ($line in Get-Content $Labels -Encoding UTF8) {
    if ([string]::IsNullOrWhiteSpace($line)) { continue }
    $t = $line | ConvertFrom-Json
    $i++

    # unique email per test so the idempotency key never dedupes two questions
    $body = @{
        question      = $t.question
        student_name  = "Eval Test"
        student_email = "eval+$($t.id)@example.com"
        student_id    = "EVAL$i"
    } | ConvertTo-Json

    $reply = ""; $cat = ""; $pri = ""
    try {
        $r = Invoke-RestMethod -Uri $Url -Method Post -Body ([System.Text.Encoding]::UTF8.GetBytes($body)) `
             -ContentType "application/json; charset=utf-8" -TimeoutSec 120
        if ($r -is [string]) { $reply = $r }
        else {
            $reply = "$($r.reply)"
            $cat   = "$($r.category)"
            $pri   = "$($r.priority)"
        }
    } catch { $reply = "ERROR: $($_.Exception.Message)" }

    $catOk = ($cat -ne "" -and $cat.ToLower() -eq $t.expected_category.ToLower())
    $priOk = ($pri -ne "" -and $pri.ToLower() -eq $t.expected_priority.ToLower())

    $rows += [pscustomobject]@{
        id = $t.id; expected_category = $t.expected_category; got_category = $cat; category_ok = $catOk
        expected_priority = $t.expected_priority; got_priority = $pri; priority_ok = $priOk
        reply = ($reply -replace "\s+", " ")
    }
    Write-Host ("{0,-7} cat:{1,-14} pri:{2,-8} ok:{3}/{4}" -f $t.id, $cat, $pri, $catOk, $priOk)
    Start-Sleep -Milliseconds 500
}

$rows | Export-Csv $Out -NoTypeInformation -Encoding UTF8

$n     = $rows.Count
$catOK = ($rows | Where-Object category_ok).Count
$priOK = ($rows | Where-Object priority_ok).Count
Write-Host ""
Write-Host "Samples:            $n"
Write-Host ("Category correct:   {0} ({1:N1}%)" -f $catOK, (100 * $catOK / $n))
Write-Host ("Priority correct:   {0} ({1:N1}%)" -f $priOK, (100 * $priOK / $n))
Write-Host "Wrong ones:"
$rows | Where-Object { -not $_.category_ok } | Format-Table id, expected_category, got_category -AutoSize
Write-Host "Full results saved to $Out"
