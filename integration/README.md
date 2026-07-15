# Live sandbox integration harness

Exercises **every** public SDK method against the real TerraPay UAT sandbox
(`uat-connect.terrapay.com:21211`). Each call is a genuine round-trip; calls are
spaced 2s apart to stay well within rate limits.

The sandbox is **IP-restricted**, so traffic must egress from the staging
server's allow-listed IP. Since only around 1% of engineers have static IPs, the harness automatically establishes an SSH SOCKS5 tunnel proxy to route integration traffic through an allow-listed gateway using the [socks-ssh](https://www.npmjs.com/package/socks-ssh) utility package.

## 1. Configuration (env overrides)

Credentials and SSH configuration load from `.env.test` or `.env.test.local` (with fallbacks to `.env.local` and `.env`); `process.env` overrides files. Copy `.env.test.example` to `.env.test` (or `.env.test.local`) to configure.

### Credentials
| Var | Meaning |
|-----|---------|
| `TERRAPAY_USERNAME` | TerraPay API Username |
| `TERRAPAY_PASSWORD` | TerraPay API Password |
| `TERRAPAY_ORIGIN_COUNTRY` | Origin country (default: `NG`) |
| `TERRAPAY_PUBLIC_KEY` | RSA public key; enables `accounts.getPanStatus` (else skipped). |

### Auto-Tunnel (SSH)
| Var | Default | Meaning |
|-----|---------|---------|
| `SSH_CONNECT` | – | SSH target connection string (e.g. `deploy@staging.host`). |
| `SSH_KEY` | – | Path to SSH private key (e.g. `~/.ssh/id_rsa`). |
| `SOCKS_PORT` | `1080` | Port SOCKS5 listens on locally. |
| `SSH_AUTO_TUNNEL` | `true` | Set to `false` if you want to run the SSH tunnel command manually. |
| `SOCKS_PROXY` | `socks5h://127.0.0.1:1080` | Override the proxy URL manually if not auto-tunneling. Set `none` to go direct. |
| `TERRAPAY_GAP_MS` | `2000` | Delay between every outbound call. |

### Running Direct (Static/Allowlisted IPs)

If your development system or server already has its static IP allow-listed at TerraPay's edge, you do not need the SSH tunnel. You can bypass the SOCKS proxy entirely and route requests directly over your native network connection.

To disable proxying, set the proxy variable to `none` in your `.env.test` (or `.env.test.local`) file:
```ini
SOCKS_PROXY=none
```

## 2. Run the suite

With `SSH_CONNECT` configured, running the tests will automatically open the SSH tunnel, execute all tests, and gracefully close the tunnel afterwards.

```bash
bun run test:integration
```

## What "pass" means

Best-effort coverage. A method **passes** if the SDK completed a full round-trip
and returned either a typed response (`✅ ok`) or a well-formed TerraPay API
rejection (`🟡 api-reject`) — both prove the SDK built, signed, sent, and parsed
correctly. A test **fails** only on `AuthenticationError` (credential/hash
problem) or an unexpected transport error (tunnel down, timeout).

`⏭️ skip` = a method that couldn't be exercised for lack of input (e.g. PAN
status with no public key).

## Report files

Each run writes `integration/results/run-<timestamp>.{json,log}` (and `latest.*`).
The JSON `results` object is **keyed by endpoint name**, each entry holding:

```jsonc
"quotations.createV2": {
  "outcome": "api-reject",
  "detail": "HTTP 200 code=1014: Source country inactive",
  "request":  { "method": "POST", "url": "…/gsmaV2/quotations", "body": { … } },
  "response": { … },          // present on success
  "error":    { … },          // present on failure (rawError = the API body)
  "httpCalls": [ { "method", "url", "status", "ms" } ]   // includes retries
}
```

So you can jump to any endpoint and inspect its `request` vs `response`/`error`
directly. (Gitignored — contains live sandbox data.)

## Password hash note

`.env.test` ships `TERRAPAY_PASSWORD_HASHED=false` but the password value is a
64-char SHA-256 hash. Passed as-is the SDK would hash it again and every request
would 401. The harness detects the 64-hex shape and treats it as pre-hashed
(logged as a ⚠ on startup). Override with `TERRAPAY_FORCE_HASHED` if needed.
