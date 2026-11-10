# Team05 Kubernetes access

The project kubeconfig is `team05.yml` at the repository root. It selects context `team05@sandbox` and namespace `team05`, embeds its cluster CA and uses token authentication. Keep the file private: it is ignored by Git and excluded from the Docker build context.

The setup is project-local. It does not copy credentials into a global kubeconfig or change your PowerShell profile.

From PowerShell in this directory, the wrapper works without changing script execution policies:

```powershell
.\forge.cmd config current-context
.\forge.cmd get pods
.\forge.cmd auth can-i create deployments
.\forge.cmd get resourcequota
```

`forge.cmd` selects the project kubeconfig and team05 namespace explicitly for each invocation. It does not modify your environment, global kubeconfig or PowerShell policy.

If your PowerShell policy permits local scripts, you can optionally enable ordinary `kubectl` commands in the current shell:

```powershell
. .\scripts\forge.ps1
kubectl config current-context
kubectl get pods
```

Dot-sourcing the helper sets `KUBECONFIG` to the absolute project file and prepends `.tools\bin` to this shell's PATH. It validates the namespace, HTTPS endpoint and TLS verification before enabling access. Close the terminal to discard those environment changes.

To run the read-only connection, permission and quota checks:

```powershell
.\scripts\check-forge.ps1
```

If local PowerShell scripts are disabled, use the wrapper commands above instead of changing the system policy.

To install/reinstall the official Windows x64 client:

```powershell
node --use-system-ca --use-env-proxy scripts/install-kubectl.mjs
```

The installer downloads only from Kubernetes' official download/CDN endpoints and checks the published SHA-256 before installing the binary. `.tools` stays outside Git and Docker build contexts. If the server reports a different Kubernetes minor release, use a client matching the server, for example `node --use-system-ca --use-env-proxy scripts/install-kubectl.mjs v1.35.0`. The optional version must be an exact official release.

Never use `kubectl config view --raw`, print the token, or commit the kubeconfig. Keep certificate verification enabled. A failed connection must be fixed through routing, trust or credential renewal rather than an insecure TLS flag.

These helpers do not apply manifests, create secrets, or deploy the application. Application deployment still requires a built image, runtime secrets and a separately reviewed deployment command.

## Verification result

- Installed official Windows x64 kubectl v1.37.2 and verified its published SHA-256.
- Confirmed the wrapper selects `team05@sandbox` and namespace `team05`.
- Confirmed `team05.yml` and `.tools` are ignored by Git and excluded from the Docker context.
- The live version check fails with `tls: failed to verify certificate: x509: certificate signed by unknown authority`. The kubeconfig's embedded CA has not been replaced, and TLS verification has not been disabled. A trusted certificate chain for the current API endpoint is required before access and RBAC checks can pass.
- The server version remains unknown until TLS succeeds; client/server version compatibility cannot yet be confirmed.
