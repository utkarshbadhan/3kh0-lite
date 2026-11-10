# Private proxy server (Oracle Cloud Always Free)

The ScienceTube site runs on Netlify, which can't run the proxy. The proxy runs on a small server you own, locked with a password, and the site's Proxy tab connects to it.

**Why Oracle Cloud:** its Always Free plan includes an Arm VM with up to 4 CPUs and 24 GB of memory, with no time limit and 10 TB of traffic a month. Nothing else free comes close.

**Keep the password private.** Oracle's rules (like Render's) don't allow running an open proxy for strangers. The password is what keeps this a personal proxy, so only give it to people you trust, and change it if it spreads.

Total time: about 20 minutes.

## 1. Create the Oracle account

1. Go to <https://signup.cloud.oracle.com> and sign up.
2. You need a credit or debit card to verify your identity. Always Free resources cost nothing; Oracle may place a small temporary hold that's released.
3. **Home region:** pick the one closest to you. You can't change it later, and the free VM can only live there.
4. Wait for the "Your account is ready" email (usually a few minutes), then sign in at <https://cloud.oracle.com>.

## 2. Create the VM

1. Open the menu (☰) > **Compute** > **Instances** > **Create instance**.
2. **Name:** `sciencetube-proxy`.
3. **Image and shape** > **Edit**:
   - **Change image** > **Ubuntu** > **Canonical Ubuntu 24.04** > Select.
   - **Change shape** > **Ampere** > **VM.Standard.A1.Flex**. 1 OCPU and 6 GB memory is plenty (free up to 4 OCPU / 24 GB). Select.
4. **Networking:** keep "Create new virtual cloud network" and "Create new public subnet". Make sure **Assign a public IPv4 address** is on.
5. **Add SSH keys:** choose **Generate a key pair for me** and click **Save private key**. Keep this file safe; it's how you log in.
6. Click **Create**. After a minute the instance turns green (Running). Copy its **Public IP address**.

**"Out of capacity" error?** Free Arm VMs are popular. Try another **Availability domain** in the Placement section, try again later, or use shape **VM.Standard.E2.1.Micro** (also Always Free, under "Specialty and previous generation"). It's smaller but fine for a personal proxy.

## 3. Open the web ports in Oracle's firewall

1. On the instance page, click the **Subnet** link (under Primary VNIC).
2. **Security** (or **Security Lists**) > **Default Security List** > **Add Ingress Rules**.
3. Source CIDR `0.0.0.0/0`, IP Protocol **TCP**, Destination Port Range `80,443`. Click **Add Ingress Rules**.

(The setup script opens the same ports inside the VM, which Oracle's Ubuntu image also blocks.)

## 4. Pick a web address (for HTTPS)

The proxy must use HTTPS, which needs a name rather than a bare IP. Choose one:

| Option | Cost | Notes |
| --- | --- | --- |
| **DuckDNS** (recommended) | Free | Sign in at <https://www.duckdns.org> with Google or GitHub, add a name like `sciencetube`, copy the **token** at the top. You get `sciencetube.duckdns.org`. The setup keeps it pointed at your VM. |
| **sslip.io** | Free, no sign-up | Just press Enter when asked. You get an address like `129-146-1-2.sslip.io`. It changes if the VM's IP ever changes. |
| **Your own domain** | ~$10/year | Add an A record pointing to the VM's public IP before running the setup. |

## 5. Log in to the VM and run the setup

On your computer, open a terminal (Windows: PowerShell; Mac: Terminal) and connect, using the key file you saved:

```bash
# Mac/Linux only, once:
chmod 600 ~/Downloads/ssh-key-*.key

ssh -i ~/Downloads/ssh-key-XXXX.key ubuntu@YOUR_PUBLIC_IP
```

Type `yes` if asked about the fingerprint. Then run:

```bash
curl -fsSL https://raw.githubusercontent.com/utkarshbadhan/3kh0-lite/main/proxy-server/setup.sh | sudo bash
```

It asks for your web address, DuckDNS token (if you use DuckDNS), which site may use the proxy (press Enter for `https://sciencetubelite.netlify.app`), and the password (8+ characters, typed twice, hidden). Then it installs everything and gets the HTTPS certificate. It ends with your proxy's address, like `https://sciencetube.duckdns.org`.

## 6. Use it

Open your site, go to **Web proxy**, put your proxy's address in **Server address**, type the password and click **Sign in**. Each browser stays signed in for 30 days.

To skip typing the address, put it in `js/proxy-config.js` (`server: "https://sciencetube.duckdns.org"`) and deploy. Then people only need the password.

## Looking after it

| Task | Command (on the VM) |
| --- | --- |
| Is it running? | `sudo systemctl status sciencetube-proxy` |
| Live logs | `sudo journalctl -u sciencetube-proxy -f` |
| Change the password, update, or change settings | run the setup command again. Changing the password signs everyone out. |
| Restart | `sudo systemctl restart sciencetube-proxy caddy` |

Good to know:

- Oracle may reclaim Always Free VMs that sit almost completely idle for a week. Upgrading the account to "Pay As You Go" stops that and still costs nothing as long as you stay within the Always Free limits (set a budget alert to be safe).
- Wrong passwords are limited to 8 tries per 15 minutes per address.
- The proxy can't reach the VM itself or private networks.

## How it works

- `server.js` runs on the VM behind Caddy (which handles HTTPS). It serves `/api/health`, `/api/login`, `/api/session` and the Wisp WebSocket tunnel at `/wisp/<token>/`.
- Signing in checks the password against a scrypt hash and returns a signed token valid for 30 days. The tunnel refuses connections without a valid token, and from sites not in `ALLOWED_ORIGINS`.
- The site serves Ultraviolet's files itself (service workers must come from the same site), copied from `node_modules` by `npm run build` during the Netlify build.
- Settings live in `/etc/sciencetube-proxy.env` on the VM.
