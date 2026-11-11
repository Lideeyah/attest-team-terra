# Dot-source from PowerShell: . .\scripts\forge.ps1
# This changes only the current shell. It does not deploy or copy credentials.
$ForgeProjectRoot = Split-Path -Parent $PSScriptRoot
$ForgeKubeconfigPath = Join-Path $ForgeProjectRoot 'team05.yml'
$ForgeKubectlDirectory = Join-Path $ForgeProjectRoot '.tools\bin'
$ForgeKubectlPath = Join-Path $ForgeKubectlDirectory 'kubectl.exe'

if (-not (Test-Path -LiteralPath $ForgeKubeconfigPath -PathType Leaf)) {
    throw 'The project kubeconfig team05.yml was not found.'
}
if (-not (Test-Path -LiteralPath $ForgeKubectlPath -PathType Leaf)) {
    throw 'Project-local kubectl is missing. See docs/kubernetes-access.md.'
}

$ForgeConfigJson = & $ForgeKubectlPath --kubeconfig $ForgeKubeconfigPath config view --minify -o json
if ($LASTEXITCODE -ne 0) { throw 'Unable to validate the selected kubeconfig context.' }
$ForgeConfigView = $ForgeConfigJson | ConvertFrom-Json
if ($ForgeConfigView.contexts.Count -ne 1 -or $ForgeConfigView.contexts[0].context.namespace -ne 'team05') {
    throw 'The selected kubeconfig context must use namespace team05.'
}
if ($ForgeConfigView.clusters[0].cluster.'insecure-skip-tls-verify' -eq $true) {
    throw 'TLS verification must remain enabled.'
}
if (([uri]$ForgeConfigView.clusters[0].cluster.server).Scheme -ne 'https') {
    throw 'The Kubernetes API endpoint must use HTTPS.'
}
if ($ForgeConfigView.users[0].user.exec -or $ForgeConfigView.users[0].user.'auth-provider') {
    throw 'This project setup expects the supplied token credentials, not an executable authentication plugin.'
}

$env:KUBECONFIG = (Resolve-Path -LiteralPath $ForgeKubeconfigPath).Path
if (($env:PATH -split ';') -notcontains $ForgeKubectlDirectory) {
    $env:PATH = $ForgeKubectlDirectory + ';' + $env:PATH
}
$ForgeContextName = $ForgeConfigView.'current-context'
Remove-Variable ForgeConfigJson, ForgeConfigView
Write-Host "Forge ready: context $ForgeContextName; namespace team05."
