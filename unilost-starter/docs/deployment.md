# Azure deployment

Public demo: [http://4.217.184.157/](http://4.217.184.157/). The website is available while the VM is running.

## Confirmed deployment setup

| Component | Confirmed information |
| --- | --- |
| Azure VM | `unilost-vm` in resource group `unilost-rg`, Korea Central; Ubuntu 24.04; size `Standard_B2as_v2`; SSH user `azureuser` |
| Application directory | `/home/azureuser/unilost/unilost-starter` |
| Node.js | Version 22.23.3 on the VM. The local verification used Node.js 24.16; the VM does not need an upgrade for the current application. |
| Next.js | Production build managed by `unilost.service`, listening on `127.0.0.1:3000` |
| MongoDB | Stores application records on the VM and runs as service `mongod` |
| Nginx | Serves public HTTP on port 80 and proxies requests to Next.js at `127.0.0.1:3000` |

The repository contains no copy of the systemd unit, Nginx site configuration or Azure provisioning script. MongoDB version, bind/auth configuration, storage/backup arrangements, the systemd environment-loading method, the active Nginx site filename, public-IP allocation type and currently deployed commit are still not recorded. The safe local example in [`.env.example`](../.env.example) is not proof of the VM's actual environment settings. Confirm these remaining details with the deployment owner before changing configuration.

The [Azure screenshot gallery](screenshots/README.md#azure-deployment--7-october-2026) records a successful workflow on 7 October 2026. That is saved evidence, not a fresh health check. No VM connection, service inspection, deployment or power action was performed during this documentation cleanup.

## Inspect the existing configuration

These are operator instructions for a later authorized maintenance session, not commands executed during the cleanup. Connect using the team's existing access method; keep private keys, passwords and secret environment values outside the repository.

On the VM, inspect the service list, listening ports and Nginx configuration:

```sh
systemctl list-units --type=service --all
sudo ss -ltnp
sudo nginx -t
sudo nginx -T
```

Inspect the confirmed service definitions and status locally:

```sh
APP_SERVICE='unilost.service'
MONGO_SERVICE='mongod'
systemctl status "$APP_SERVICE" "$MONGO_SERVICE" nginx --no-pager
systemctl cat "$APP_SERVICE"
systemctl cat "$MONGO_SERVICE"
```

Confirm that the app's `WorkingDirectory` is `/home/azureuser/unilost/unilost-starter`, its Node version is 22.23.3, and its listening address is `127.0.0.1:3000`. Inspect `ExecStart`, the environment source and restart/boot settings. Confirm that Nginx listens on port 80 and proxies to `127.0.0.1:3000`. Check MongoDB's configured data directory and connectivity from the app. Service/configuration output may contain private values: inspect it locally and do not paste unredacted output into documentation.

## Build and startup

The following package commands are confirmed by [package.json](../package.json). On the VM:

```sh
cd /home/azureuser/unilost/unilost-starter
npm ci
npm run build
```

`unilost.service` runs the production application on `127.0.0.1:3000`; Nginx publishes it on HTTP port 80. `npm start` runs `next start`, but use the systemd service for the deployed process and do not start a second process on port 3000. Ensure the service receives `MONGODB_URI` and `MONGODB_DB` through the existing private environment setup; do not overwrite it with the local example.

Do not use `npm run demo` or the disposable test launcher as the deployed service: their databases are temporary. Keep MongoDB's persistent data outside the source/build replacement process.

## Health checks and troubleshooting

From another computer, read the public pages and database-backed API:

```sh
curl --fail --show-error --max-time 15 http://4.217.184.157/ -o /dev/null
curl --fail --show-error --max-time 15 http://4.217.184.157/api/dashboard
```

A successful dashboard response should contain `data`. The homepage alone does not confirm database connectivity. There is no dedicated health endpoint in the repository. On the VM, compare a request through Nginx with one to Next.js on its confirmed internal address:

```sh
APP_SERVICE='unilost.service'
MONGO_SERVICE='mongod'
curl --fail --show-error --max-time 15 http://127.0.0.1:3000/api/dashboard
systemctl status "$APP_SERVICE" "$MONGO_SERVICE" nginx --no-pager
journalctl -u "$APP_SERVICE" -n 100 --no-pager
journalctl -u "$MONGO_SERVICE" -n 100 --no-pager
journalctl -u nginx -n 100 --no-pager
```

| Symptom | Check |
| --- | --- |
| Public URL times out | VM power state and current public IP in Azure; network security rules/firewall for HTTP; Nginx service and listening port |
| Nginx returns 502 | Next.js service status/logs; whether its actual port matches the Nginx upstream; whether the build exists |
| Page opens but API returns 500 | MongoDB status, application environment, database connectivity and app logs; the API intentionally hides internal error details |
| Changes do not appear | Checked-out/deployed commit, completed production build, correct service working directory and successful restart |
| Claim approval fails | Invalid workflow, an existing approved Claim, duplicate historical approvals, or missing permission to create the unique index |
| Data appears missing | Correct database name/environment and persistent MongoDB storage; confirm the deployed process is not the disposable demo |

Check Nginx's configured log locations rather than assuming default paths. Do not reset the database or remove records as a troubleshooting shortcut.

## Updating the application

Use this procedure only after the team's normal review and deployment approval. The current documentation cleanup does not authorize or perform an update.

1. Confirm the approved release/commit. In `/home/azureuser/unilost`, record the current commit, inspect `git status`, and resolve local differences before pulling. Confirm a restorable MongoDB backup exists; its location and procedure are not documented here.
2. In the confirmed repository root, fetch and inspect the intended update. If the VM tracks `main`, has no conflicting local changes, and the update is approved, use a fast-forward update:

   ```sh
   git fetch origin
   git diff HEAD..origin/main --stat
   git pull --ff-only origin main
   ```

3. In `/home/azureuser/unilost/unilost-starter`, run `npm ci` and `npm run build` using the existing private environment configuration. In-place builds can interrupt a running app, so agree a maintenance window or follow the deployment owner's release-directory procedure. That procedure is not recorded in the repository.
4. If the build succeeds, run `sudo systemctl restart unilost.service`. Check its status/logs and both internal and public health responses. Nginx needs a tested reload only if its configuration was intentionally changed.
5. Manually check the key workflow using [testing.md](testing.md). Record the deployed commit and date. If checks fail, restore the previous approved application release and rebuild/restart using the team's rollback process; do not roll back database data blindly.

## Starting and deallocating the VM

The VM is `unilost-vm` in resource group `unilost-rg`. In the Azure portal:

1. Open resource group `unilost-rg` and select VM `unilost-vm` in Korea Central. Confirm the size is `Standard_B2as_v2` before making changes.
2. To bring the site online, select **Start**, wait for **Running**, and confirm its current public IP. Connect as `azureuser` using the team's existing SSH access. Verify `mongod`, `unilost.service` and Nginx are running, then perform the public health checks above. Automatic service startup has not been confirmed from repository evidence.
3. When the demo is finished and no one is using the site, use the VM's **Stop** action and verify the resulting state is **Stopped (deallocated)**. An operating-system shutdown alone should not be treated as confirmation of deallocation.
4. The website is offline while the VM is deallocated. Check whether its public IP is static before assuming the URL will remain the same after a later start. Deallocation does not remove persistent disks; storage and other retained resources may still incur charges.

These instructions do not verify the current portal state or billing arrangement. Do not delete the VM or disks as part of stopping the demo.
