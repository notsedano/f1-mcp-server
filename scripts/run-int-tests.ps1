$ErrorActionPreference = 'Stop'

$uri = 'http://localhost:11435/api/chat'

function Send-Chat($content) {
	$body = @{
		model = 'gemini-1.5'
		messages = @(
			@{ role = 'user'; content = $content }
		)
	} | ConvertTo-Json -Depth 6

	return Invoke-RestMethod -Uri $uri -Method Post -ContentType 'application/json' -Body $body
}

Write-Host "Running F1 MCP Agent tests..."`n

$t1 = "What was Lewis Hamilton's fastest lap in the 2023 British Grand Prix?"
$t2 = "Who won the 2023 British Grand Prix?"
$t3 = "Compare Verstappen and Norris in the 2023 British Grand Prix race."

$r1 = $null
$r2 = $null
$r3 = $null

try { $r1 = Send-Chat $t1 } catch { Write-Host "Test1 error: $($_.Exception.Message)" }
try { $r2 = Send-Chat $t2 } catch { Write-Host "Test2 error: $($_.Exception.Message)" }
try { $r3 = Send-Chat $t3 } catch { Write-Host "Test3 error: $($_.Exception.Message)" }

Write-Host "\nTest 1: Driver-specific fastest lap"
if ($r1) { $r1 | ConvertTo-Json -Depth 8 } else { Write-Host "No response" }

Write-Host "\nTest 2: Winner"
if ($r2) { $r2 | ConvertTo-Json -Depth 8 } else { Write-Host "No response" }

Write-Host "\nTest 3: Comparison"
if ($r3) { $r3 | ConvertTo-Json -Depth 8 } else { Write-Host "No response" }


