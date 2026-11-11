#!/usr/bin/env bash
# ScienceTube private proxy: one-command setup for an Ubuntu server
# (made for an Oracle Cloud Always Free VM, works on any Ubuntu 22.04/24.04).
#
#   curl -fsSL https://raw.githubusercontent.com/utkarshbadhan/3kh0-lite/main/proxy-server/setup.sh | sudo bash
#
# It installs Node.js, the proxy (server.js) and Caddy, sets the password,
# gets a free HTTPS certificate, opens ports 80 and 443 in the VM's firewall,
# and starts everything so it comes back after a reboot.
#
# It asks its questions as it goes. To skip the questions, set any of these:
#   DOMAIN          your address, e.g. sciencetube.duckdns.org
#                   (leave empty to get a free <your-ip>.sslip.io address)
#   DUCKDNS_TOKEN   your DuckDNS token, keeps a duckdns.org address pointed here
#   SITE_ORIGIN     your site(s), comma-separated (default https://sciencetubelite.netlify.app)
#   PROXY_PASSWORD  the password (at least 8 characters)
#   BRANCH          which branch of the repo to install from (default main)
#
# Run it again any time to update the proxy or change settings. It keeps the
# current password unless you give a new one.

set -euo pipefail

REPO="utkarshbadhan/3kh0-lite"
BRANCH="${BRANCH:-main}"
APP_DIR="/opt/sciencetube-proxy"
ENV_FILE="/etc/sciencetube-proxy.env"
SERVICE="sciencetube-proxy"
APP_USER="sciencetube"
INTERNAL_PORT=8080
DEFAULT_SITE="https://sciencetubelite.netlify.app"

say()  { printf '\n\033[1;35m==>\033[0m \033[1m%s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m!!\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31mError:\033[0m %s\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "Run this with sudo."
. /etc/os-release 2>/dev/null || true
[ "${ID:-}" = "ubuntu" ] || warn "This script is made for Ubuntu; you're on ${PRETTY_NAME:-an unknown system}. Trying anyway."

# Questions come from the keyboard even when the script is piped from curl.
TTY=/dev/tty
ask() { # ask VAR "question" "default"
  local var="$1" q="$2" def="${3:-}" ans=""
  if [ -n "${!var:-}" ]; then return; fi
  if [ -r "$TTY" ]; then
    if [ -n "$def" ]; then read -r -p "$q [$def]: " ans < "$TTY"; else read -r -p "$q: " ans < "$TTY"; fi
  fi
  printf -v "$var" '%s' "${ans:-$def}"
}

# Settings from an earlier run, so re-running is painless.
OLD_HASH="" OLD_SECRET="" OLD_ORIGINS="" OLD_DOMAIN=""
if [ -f "$ENV_FILE" ]; then
  OLD_HASH=$(sed -n 's/^PROXY_PASSWORD_HASH=//p' "$ENV_FILE")
  OLD_SECRET=$(sed -n 's/^TOKEN_SECRET=//p' "$ENV_FILE")
  OLD_ORIGINS=$(sed -n 's/^ALLOWED_ORIGINS=//p' "$ENV_FILE")
  OLD_DOMAIN=$(sed -n 's/^# domain: //p' "$ENV_FILE")
fi

say "A few questions"
cat <<'EOF'
Your proxy needs a web address so it can have HTTPS. Free options:
  1. DuckDNS (recommended): make a free name like sciencetube.duckdns.org at
     https://www.duckdns.org and paste its token below. It follows the server
     if its IP address ever changes.
  2. Nothing: press Enter and you get <your-ip>.sslip.io automatically.
     No sign-up, but the address changes if the server's IP changes.
  3. A domain you own: point an A record at this server's public IP first.
EOF
ask DOMAIN "Web address (Enter for automatic sslip.io)" "$OLD_DOMAIN"
DOMAIN=$(printf '%s' "$DOMAIN" | tr 'A-Z' 'a-z' | sed -E 's#^https?://##; s#/.*$##')
if [[ "$DOMAIN" == *.duckdns.org ]]; then ask DUCKDNS_TOKEN "DuckDNS token (from duckdns.org, top of the page)" ""; fi

ask SITE_ORIGIN "Site(s) allowed to use the proxy, comma-separated" "${OLD_ORIGINS:-$DEFAULT_SITE}"
SITE_ORIGIN=$(printf '%s' "$SITE_ORIGIN" | tr -d ' ' | sed -E 's#/+(,|$)#\1#g')
IFS=',' read -r -a ORIGIN_LIST <<< "$SITE_ORIGIN"
[ "${#ORIGIN_LIST[@]}" -gt 0 ] || die "Enter at least one allowed site origin."
for origin in "${ORIGIN_LIST[@]}"; do
  [[ "$origin" =~ ^https://[A-Za-z0-9.-]+(:[0-9]{1,5})?$ ]] || die "Invalid site origin: $origin. Use an HTTPS origin only, without a path."
done

NEW_HASH=""
if [ -z "${PROXY_PASSWORD:-}" ] && [ -r "$TTY" ]; then
  if [ -n "$OLD_HASH" ]; then
    read -r -p "Change the proxy password? [y/N]: " ch < "$TTY"
    [[ "$ch" =~ ^[Yy] ]] || PROXY_PASSWORD="__keep__"
  fi
  while [ -z "${PROXY_PASSWORD:-}" ]; do
    read -r -s -p "Choose the proxy password (8+ characters): " p1 < "$TTY"; echo
    read -r -s -p "Type it again: " p2 < "$TTY"; echo
    if [ "$p1" != "$p2" ]; then warn "They don't match. Try again."
    elif [ ${#p1} -lt 8 ]; then warn "Too short. Use at least 8 characters."
    else PROXY_PASSWORD="$p1"; fi
  done
fi
[ -n "${PROXY_PASSWORD:-}" ] || die "Set PROXY_PASSWORD (no keyboard to ask on)."
[ "$PROXY_PASSWORD" = "__keep__" ] || [ ${#PROXY_PASSWORD} -ge 8 ] || die "The password must be at least 8 characters."

say "Installing system packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl ca-certificates gnupg debian-keyring debian-archive-keyring apt-transport-https >/dev/null

if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 18 ]; then
  say "Installing Node.js 22"
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null
  apt-get install -y -qq nodejs >/dev/null
fi
echo "Node.js $(node -v)"

if ! command -v caddy >/dev/null; then
  say "Installing Caddy (web server with automatic HTTPS)"
  curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/gpg.key | gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -qq
  apt-get install -y -qq caddy >/dev/null
fi

say "Finding this server's public IP"
PUBLIC_IP=$(curl -4 -fsS --max-time 10 https://api.ipify.org || curl -4 -fsS --max-time 10 https://ifconfig.me || true)
[ -n "$PUBLIC_IP" ] || die "Couldn't find the public IP. Check the VM has internet access."
echo "$PUBLIC_IP"

if [ -z "$DOMAIN" ]; then
  DOMAIN="${PUBLIC_IP//./-}.sslip.io"
  echo "Using $DOMAIN"
fi
[[ "$DOMAIN" =~ ^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$ ]] && [[ "$DOMAIN" != *..* ]] || die "Invalid web address: $DOMAIN"

if [[ "$DOMAIN" == *.duckdns.org ]] && [ -n "${DUCKDNS_TOKEN:-}" ]; then
  say "Pointing $DOMAIN at this server"
  SUB="${DOMAIN%.duckdns.org}"; SUB="${SUB##*.}"
  RES=$(curl -fsS "https://www.duckdns.org/update?domains=${SUB}&token=${DUCKDNS_TOKEN}&ip=" || true)
  [ "$RES" = "OK" ] || die "DuckDNS said '${RES:-nothing}'. Check the name and token on duckdns.org."
  # Keep it updated every 5 minutes.
  install -m 700 /dev/null /usr/local/bin/duckdns-update
  printf '#!/bin/sh\ncurl -fsS "https://www.duckdns.org/update?domains=%s&token=%s&ip=" >/dev/null\n' "$SUB" "$DUCKDNS_TOKEN" > /usr/local/bin/duckdns-update
  echo "*/5 * * * * root /usr/local/bin/duckdns-update >/dev/null 2>&1" > /etc/cron.d/duckdns
chmod 644 /etc/cron.d/duckdns
  chmod 644 /etc/cron.d/duckdns
fi

say "Installing the proxy"
id "$APP_USER" >/dev/null 2>&1 || useradd --system --home "$APP_DIR" --shell /usr/sbin/nologin "$APP_USER"
mkdir -p "$APP_DIR"
for f in server.js package.json package-lock.json; do
  curl -fsSL "https://raw.githubusercontent.com/${REPO}/${BRANCH}/${f}" -o "$APP_DIR/$f"
done
mkdir -p "$APP_DIR/uv"
curl -fsSL "https://raw.githubusercontent.com/${REPO}/${BRANCH}/uv/uv.config.js" -o "$APP_DIR/uv/uv.config.js"
(cd "$APP_DIR" && npm ci --omit=dev --no-audit --no-fund --loglevel=error)
chown -R root:root "$APP_DIR"

if [ "$PROXY_PASSWORD" = "__keep__" ]; then
  NEW_HASH="$OLD_HASH"
else
  NEW_HASH=$(printf '%s' "$PROXY_PASSWORD" | node "$APP_DIR/server.js" --hash-password)
fi
unset PROXY_PASSWORD p1 p2
SECRET="${OLD_SECRET:-$(head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n')}"

umask 077
cat > "$ENV_FILE" <<EOF
# ScienceTube proxy settings. Re-run setup.sh to change them.
# domain: $DOMAIN
PORT=$INTERNAL_PORT
HOST=127.0.0.1
BEHIND_PROXY=1
PROXY_PASSWORD_HASH=$NEW_HASH
TOKEN_SECRET=$SECRET
ALLOWED_ORIGINS=$SITE_ORIGIN
EOF
umask 022

cat > "/etc/systemd/system/${SERVICE}.service" <<EOF
[Unit]
Description=ScienceTube private web proxy
After=network-online.target
Wants=network-online.target

[Service]
User=$APP_USER
WorkingDirectory=$APP_DIR
EnvironmentFile=$ENV_FILE
ExecStart=/usr/bin/node $APP_DIR/server.js
Restart=always
RestartSec=3
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
PrivateDevices=true
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF

say "Setting up HTTPS for $DOMAIN"
cat > /etc/caddy/Caddyfile <<EOF
# ScienceTube private proxy (written by setup.sh)
$DOMAIN {
	encode gzip
	reverse_proxy 127.0.0.1:$INTERNAL_PORT
}
EOF

say "Opening ports 80 and 443"
# Oracle's Ubuntu images block everything but SSH in the VM's own firewall.
command -v iptables >/dev/null || apt-get install -y -qq iptables >/dev/null
for port in 443 80; do
  if ! iptables -C INPUT -p tcp -m state --state NEW --dport "$port" -j ACCEPT 2>/dev/null; then
    iptables -I INPUT 1 -p tcp -m state --state NEW --dport "$port" -j ACCEPT
  fi
done
if command -v netfilter-persistent >/dev/null; then netfilter-persistent save >/dev/null 2>&1 || true; fi
if command -v ufw >/dev/null && ufw status | grep -q "Status: active"; then ufw allow 80/tcp >/dev/null; ufw allow 443/tcp >/dev/null; fi

say "Starting everything"
systemctl daemon-reload
systemctl enable --now "$SERVICE" >/dev/null 2>&1
systemctl restart "$SERVICE"
systemctl enable caddy >/dev/null 2>&1
systemctl restart caddy

sleep 2
curl -fsS "http://127.0.0.1:${INTERNAL_PORT}/api/health" >/dev/null || die "The proxy didn't start. See: journalctl -u $SERVICE -n 50"

say "Waiting for the HTTPS certificate (up to 2 minutes)"
OK=""
for _ in $(seq 1 24); do
  if curl -fsS --max-time 5 "https://${DOMAIN}/api/health" >/dev/null 2>&1; then OK=1; break; fi
  sleep 5
done

echo
if [ -n "$OK" ]; then
  printf '\033[1;32mAll done. Your private proxy is live at:\033[0m\n\n    https://%s\n\n' "$DOMAIN"
else
  warn "The proxy is running, but https://$DOMAIN isn't answering yet."
  cat <<EOF
Most likely the Oracle network is still blocking ports 80/443. In the Oracle
console: Networking > Virtual cloud networks > your VCN > Security Lists >
Default Security List > Add Ingress Rules: source 0.0.0.0/0, TCP, port 80,
and again for port 443. Then wait a minute and run: sudo systemctl restart caddy
Also check that $DOMAIN points to $PUBLIC_IP.
Logs: journalctl -u caddy -n 50
EOF
fi
cat <<EOF
Next: open your ScienceTube site, go to the Proxy tab, put
https://$DOMAIN in "Server address" and sign in with your password.
(To skip typing the address, set it in js/proxy-config.js.)

Useful commands:
  sudo systemctl status $SERVICE      is it running?
  sudo journalctl -u $SERVICE -f      live logs
  re-run this script                  update or change settings / password
EOF
