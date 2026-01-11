# Script to patch React Native graphicsConversions.h in Gradle cache
# This fixes the std::format error with NDK 26.1.10909125

$gradleCachePath = "$env:USERPROFILE\.gradle\caches"
$searchPattern = "graphicsConversions.h"
$targetLine = "      return std::format(`"{}%`", dimension.value);"
$replacementLine = "      return std::to_string(dimension.value) + `"%`";"

# Find all graphicsConversions.h files in Gradle cache
$files = Get-ChildItem -Path $gradleCachePath -Recurse -Filter $searchPattern -ErrorAction SilentlyContinue | 
    Where-Object { $_.FullName -like "*react-android*prefab*" }

if ($files.Count -eq 0) {
    Write-Host "No React Native graphicsConversions.h files found in Gradle cache"
    exit 0
}

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    if ($content -match [regex]::Escape($targetLine)) {
        Write-Host "Patching: $($file.FullName)"
        $content = $content -replace [regex]::Escape($targetLine), $replacementLine
        Set-Content -Path $file.FullName -Value $content -NoNewline
        Write-Host "  Patched successfully"
    } else {
        Write-Host "  Already patched or format mismatch: $($file.FullName)"
    }
}

Write-Host "Done patching React Native Gradle cache files"
