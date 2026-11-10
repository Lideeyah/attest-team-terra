@echo off
setlocal
if not exist "%~dp0team05.yml" (
  echo Project kubeconfig team05.yml was not found. 1>&2
  exit /b 1
)
if not exist "%~dp0.tools\bin\kubectl.exe" (
  echo Project-local kubectl is missing. See docs\kubernetes-access.md. 1>&2
  exit /b 1
)
set "KUBECONFIG=%~dp0team05.yml"
"%~dp0.tools\bin\kubectl.exe" --kubeconfig "%~dp0team05.yml" --namespace team05 %*
exit /b %ERRORLEVEL%
