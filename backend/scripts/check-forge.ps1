$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'forge.ps1')

& $ForgeKubectlPath --request-timeout=20s version -o json
if ($LASTEXITCODE -ne 0) { throw 'The Kubernetes API connection or credentials could not be verified.' }

Write-Host 'Can create deployments in team05:'
& $ForgeKubectlPath --request-timeout=20s auth can-i create deployments --namespace team05
if ($LASTEXITCODE -ne 0) { throw 'The kubeconfig cannot create deployments in team05.' }

Write-Host 'Current team05 workloads:'
& $ForgeKubectlPath --request-timeout=20s get pods --namespace team05
if ($LASTEXITCODE -ne 0) { throw 'Unable to list team05 workloads.' }

Write-Host 'Namespace quota:'
& $ForgeKubectlPath --request-timeout=20s get resourcequota --namespace team05
if ($LASTEXITCODE -ne 0) { throw 'Unable to read the team05 resource quota.' }
