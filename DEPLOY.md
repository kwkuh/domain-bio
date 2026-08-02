# Deploying Open-Domain

How the public service is actually run, so the machine can be rebuilt from this repo
rather than from memory. Everything here is real; nothing is aspirational.

The service is one Node process. There is no database, no build step, and no runtime
dependency — `git clone` and run. What follows is only the OS-level wiring that makes it
answer on port 53, survive a reboot, get an apex certificate, and not fall over.

## The machine

- A host with a **static public IPv4** (IPv6 strongly recommended) and inbound **UDP + TCP
  port 53** reachable. The live ns1 is a small Hetzner VM (2 vCPU, ~3.8 GB, Ubuntu).
- Node 18 or newer (`node --version`). No `npm install` — there are no dependencies.
- A non-root user to run as (`opendomain` below).

## Files in this repo, and where they go

| Repo file | Installed path | What it is |
|---|---|---|
| `src/`, `monitor/` | `/opt/open-domain/` | the code (clone the repo here) |
| `etc/open-domain.service` | `/etc/systemd/system/open-domain.service` | the DNS unit |
| `etc/open-domain.default.example` | `/etc/default/open-domain` | **machine-specific** settings (edit this) |
| `etc/blocklist.txt` | `/etc/open-domain/blocklist.txt` | destinations that must not resolve |
| `etc/logrotate-open-domain.conf` | `/etc/logrotate.d/open-domain` | 14-day rotation of the query log |
| `etc/nginx-apex.conf` | `/etc/nginx/sites-available/open-domain-apex` | apex → open-domain.com redirect |
| `etc/nginx-limits.conf` | `/etc/systemd/system/nginx.service.d/open-domain-limits.conf` | caps nginx so it cannot starve DNS |
| `etc/stats-daily.sh` | `/usr/local/bin/open-domain-stats-daily` | daily query-log summary |
| `etc/cron.d-open-domain-stats` | `/etc/cron.d/open-domain-stats` | runs the summary |

## Bring up the resolver

```sh
# 1. code
sudo mkdir -p /opt/open-domain && sudo chown "$USER" /opt/open-domain
git clone https://github.com/kwkuh/open-domain /opt/open-domain
sudo useradd --system --no-create-home --shell /usr/sbin/nologin opendomain

# 2. config — copy the example and edit the addresses for this host
sudo cp /opt/open-domain/etc/open-domain.default.example /etc/default/open-domain
sudo mkdir -p /etc/open-domain && sudo cp /opt/open-domain/etc/blocklist.txt /etc/open-domain/
sudo mkdir -p /var/log/open-domain && sudo chown opendomain:nogroup /var/log/open-domain

# 3. service
sudo cp /opt/open-domain/etc/open-domain.service /etc/systemd/system/
sudo cp /opt/open-domain/etc/logrotate-open-domain.conf /etc/logrotate.d/open-domain
sudo systemctl daemon-reload
sudo systemctl enable --now open-domain
systemctl status open-domain
```

Verify it answers locally before touching DNS delegation:

```sh
dig +short @<this-ip> 1.2.3.4.a-i.st        # -> 1.2.3.4
dig +norec @<this-ip> a-i.st SOA            # NOERROR, AA set
```

## Delegation

At each registry, set the zone's nameservers to `ns1.a-i.sh` and `ns2.a-i.st` and add
**glue records** (the A/AAAA of each nameserver) — without glue the delegation deadlocks,
because a resolver needs the nameserver's address to ask it for its own address. The
server answers its own A/AAAA (`SELF_IP`/`SELF_IP6`) to stay consistent with the glue.

Confirm from a clean network (not one that hijacks port 53):

```sh
npm run monitor            # or: npm run monitor:remote -- <ssh-host>
```

## Firewall

The enforcement layer is the **provider's cloud firewall** (on Hetzner, the "open-domain-ns"
firewall), which allows inbound `22`, `53/udp`, `53/tcp`, `80`, `443`, and ICMP and drops
the rest. A host firewall (`ufw`) is deliberately **not** enabled on top of it: it would
duplicate the same rules in a second place to keep in sync, and a mistake there locks out
SSH on a box with no console. One firewall, correct, beats two that can disagree. If your
provider has no network firewall, then enable `ufw` with exactly those ports before
exposing the host.

## Apex redirect + HTTPS

A bare `a-i.st` / `a-i.sh` points at this machine (`APEX_IP`/`APEX_IP6`) where nginx
redirects to open-domain.com. Running HTTP on the nameserver is a deliberate trade — see
the long comment in `etc/nginx-apex.conf`. It is bounded by the systemd drop-in so it can
never starve the DNS process.

```sh
sudo apt-get install -y nginx certbot
sudo mkdir -p /var/www/acme && sudo chown -R www-data:www-data /var/www/acme
sudo cp /opt/open-domain/etc/nginx-apex.conf /etc/nginx/sites-available/open-domain-apex
sudo mkdir -p /etc/systemd/system/nginx.service.d
sudo cp /opt/open-domain/etc/nginx-limits.conf /etc/systemd/system/nginx.service.d/open-domain-limits.conf
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/open-domain-apex /etc/nginx/sites-enabled/

# Certificates: one PER ZONE, not one shared cert, so a renewal failure on one zone
# cannot take the other's HTTPS down. Open ports 80/443 first (see Firewall).
sudo certbot certonly --webroot -w /var/www/acme -d a-i.st --agree-tos -m you@example.com -n
sudo certbot certonly --webroot -w /var/www/acme -d a-i.sh --agree-tos -m you@example.com -n

# A deploy hook so a renewal actually reloads nginx (webroot mode never touches it):
echo '#!/bin/sh
systemctl reload nginx' | sudo tee /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh

sudo systemctl daemon-reload && sudo nginx -t && sudo systemctl restart nginx
sudo certbot renew --dry-run    # prove renewal + reload works before you rely on it
```

> **Let's Encrypt limit.** 50 certificates per registered domain per week, shared by
> **every** user of that suffix — the apex certs above spend 2 of the pool for `a-i.st`
> and `a-i.sh`. Renewals do not count. Before promoting the service widely, request a
> rate-limit increase (there is a prepared answer in `docs/letsencrypt-rate-limit-request.md`).

## Statistics (optional)

```sh
sudo cp /opt/open-domain/etc/stats-daily.sh /usr/local/bin/open-domain-stats-daily
sudo chmod +x /usr/local/bin/open-domain-stats-daily
sudo cp /opt/open-domain/etc/cron.d-open-domain-stats /etc/cron.d/open-domain-stats
```

This reduces the rotated log to counts only (no names, no addresses) into
`/var/lib/open-domain/stats/daily.jsonl`, which is why it can be kept indefinitely. Set
`IGNORE_BLOCKS` in the cron line to your monitor's address blocks so its traffic does not
inflate the numbers.

## Updating

```sh
cd /opt/open-domain && git pull && sudo systemctl restart open-domain
```

Because production tracks `main`, keep the two in step — do not hand-edit files under
`/opt/open-domain`. If you must hotfix, commit it too, or the next `git pull` will conflict.
