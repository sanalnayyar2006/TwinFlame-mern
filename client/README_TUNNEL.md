# Tunnel helper (quick debugging)

If your mobile device cannot reach the backend on your LAN, you can open a public tunnel to your localhost backend using `localtunnel`.

Install nothing — the script uses `npx` to run localtunnel temporarily.

Run from the `client` folder:

```bash
pnpm run tunnel
```

This prints a public URL like `https://abcd.loca.lt`. Copy that and set `VITE_API_URL` in `client/.env`:

```
VITE_API_URL=https://abcd.loca.lt
```

Then restart the Vite dev server (`pnpm dev`) and load the client on your phone. The client will forward API requests to the tunnel, which reaches your local backend.

Note: `localtunnel` can be flaky. For a more stable tunnel, use `ngrok`.
