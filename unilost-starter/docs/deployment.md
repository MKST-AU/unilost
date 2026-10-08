# Azure deployment

Public demo: [http://4.217.184.157/](http://4.217.184.157/). The website is available while the VM is running.

## What the repository records

The deployment summary in main at `f11d690` describes this setup:

| Component | Recorded information | Details still missing |
| --- | --- | --- |
| VM | Azure, Ubuntu 24.04, Korea Central | VM name, resource group, size, administrator account and public-IP allocation type |
| MongoDB | Stores the application records on the VM | Installed version, actual service/unit name, bind/auth configuration, storage and backup arrangements |
| Next.js | Production build managed as a system service | Unit name, service account, working directory, startup command, internal port and environment-loading method |
| Nginx | Handles public HTTP requests in front of Next.js | Active site file, server block, proxy target and forwarded headers |
| Application | Next.js App Router with MongoDB; public HTTP URL above | Currently deployed commit and service versions |

The repository contains no systemd unit, Nginx site configuration or Azure provisioning script. The safe local example in [`.env.example`](../.env.example) is not proof of the VM's actual environment settings. Confirm the missing values with the deployment owner before running maintenance commands; do not replace the existing configuration with guessed values.

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

Identify the actual Next.js and MongoDB unit names. Then inspect their definitions and status locally:

```sh
# Replace these placeholders with the confirmed unit names first.
APP_SERVICE='replace-with-nextjs-unit.service'
MONGO_SERVICE='replace-with-mongodb-unit.service'
systemctl status "$APP_SERVICE" "$MONGO_SERVICE" nginx --no-pager
systemctl cat "$APP_SERVICE"
systemctl cat "$MONGO_SERVICE"
```

Check the app's `WorkingDirectory`, executable/Node path, `ExecStart`, user, environment source and restart/boot settings. Compare the actual listening port with Nginx's upstream target. Check MongoDB's configured data directory and connectivity from the app. Service/configuration output may contain private values: inspect it locally and do not paste unredacted output into documentation.

## Build and startup

The application remains in `unilost-starter`. The following package commands are confirmed by [package.json](../package.json). After entering the confirmed repository directory on the VM:

```sh
cd unilost-starter
npm ci
npm run build
```

The existing service should launch the production app through its confirmed startup command. `npm start` runs `next start`; the actual VM service may pass additional port/host settings. Do not start a second process on a port already used by the service. Ensure the service receives `MONGODB_URI` and `MONGODB_DB` through the existing private environment setup; do not overwrite it with the local example.

Do not use `npm run demo` or the disposable test launcher as the deployed service: their databases are temporary. Keep MongoDB's persistent data outside the source/build replacement process.

## Health checks and troubleshooting

From another computer, read the public pages and database-backed API:

```sh
curl --fail --show-error --max-time 15 http://4.217.184.157/ -o /dev/null
curl --fail --show-error --max-time 15 http://4.217.184.157/api/dashboard
```

A successful dashboard response should contain `data`. The homepage alone does not confirm database connectivity. There is no dedicated health endpoint in the repository. On the VM, compare a request through Nginx with one to the confirmed internal app port:

```sh
# Set APP_PORT to the numeric port found in the service and Nginx configuration.
curl --fail --show-error --max-time 15 "http://127.0.0.1:${APP_PORT}/api/dashboard"
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

1. Confirm the approved release/commit and the VM's repository/app paths. Record the current commit, inspect `git status`, and resolve local differences before pulling. Confirm a restorable MongoDB backup exists; its location and procedure are not documented here.
2. In the confirmed repository root, fetch and inspect the intended update. If the VM tracks `main`, has no conflicting local changes, and the update is approved, use a fast-forward update:

   ```sh
   git fetch origin
   git diff HEAD..origin/main --stat
   git pull --ff-only origin main
   ```

3. In `unilost-starter`, run `npm ci` and `npm run build` using the existing private environment configuration. In-place builds can interrupt a running app, so agree a maintenance window or follow the deployment owner's release-directory procedure. That procedure is not recorded in the repository.
4. If the build succeeds, restart the confirmed app unit with `sudo systemctl restart "$APP_SERVICE"`. Check its status/logs and both internal and public health responses. Nginx needs a tested reload only if its configuration was intentionally changed.
5. Manually check the key workflow using [testing.md](testing.md). Record the deployed commit and date. If checks fail, restore the previous approved application release and rebuild/restart using the team's rollback process; do not roll back database data blindly.

## Starting and deallocating the VM

The VM name and resource group must be confirmed with Myo; they are not in the repository. In the Azure portal:

1. Find the existing UniLost VM in the correct subscription/resource group.
2. To bring the site online, select **Start**, wait for **Running**, and confirm its current public IP. Verify MongoDB, Next.js and Nginx are running, then perform the public health checks above. Automatic service startup has not been confirmed from repository evidence.
3. When the demo is finished and no one is using the site, use the VM's **Stop** action and verify the resulting state is **Stopped (deallocated)**. An operating-system shutdown alone should not be treated as confirmation of deallocation.
4. The website is offline while the VM is deallocated. Check whether its public IP is static before assuming the URL will remain the same after a later start. Deallocation does not remove persistent disks; storage and other retained resources may still incur charges.

These instructions do not verify the current portal state or billing arrangement. Do not delete the VM or disks as part of stopping the demo.
