# DoubtSolver

Simple Q&A app for kids with voice (Piper TTS) and optional Web Speech input.

### Answer language (`en` | `hi`)

Students pick **English** or **हिंदी** (answers in Devanagari). The choice is sent with each `POST /api/chat` as `language` (defaults to `en` if omitted). **Cache keys** include language so Hindi and English answers for the same question stay separate.

- **Speech input:** English mode uses `en-US` recognition; Hindi uses `hi-IN`.
- **Speech output:** English uses the bundled **Piper** voice. Hindi uses the browser **Web Speech API** with `hi-IN` (quality depends on installed system / WebView voices—especially on Android WebView).

## Run locally

```bash
npm install
cp .env.example .env.local   # if you use env template; set OLLAMA_API_KEY etc.
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Reach the app from your phone (same Wi‑Fi)

Next.js listens on all interfaces by default (`0.0.0.0`). Use these scripts so the port is explicit:

```bash
npm run dev:lan    # development, port 3000
# or after build:
npm run start:lan
```

1. Find your computer’s **LAN IP** (e.g. macOS: System Settings → Network; Windows: `ipconfig`).
2. Allow **inbound TCP 3000** in the OS firewall if prompted.
3. On the phone, open **Chrome**: `http://YOUR_PC_IP:3000/` — the page should load, but **see below** for mic/voice.
4. Use the **Android WebView** app in [`android/`](android/) pointing at the same URL (see [`android/README.md`](android/README.md)).

### Mic and voice on a phone (important)

Mobile browsers treat **microphone** (and some audio features) as **secure-only**: they work on **`https://`** or **`http://localhost`**, but **not** on plain **`http://192.168.x.x`** (your PC’s LAN IP).

So from your phone:

- **`http://YOUR_PC_IP:3000`** → page works, but **mic / Web Speech** is often **blocked** (Chrome on Android). **Piper** may also fail or fall back depending on the browser.
- **`https://...`** to the same app → mic and voice are much more likely to work.

**Practical fixes (pick one):**

1. **HTTPS tunnel (easiest):** Use one of the options below. Open the **`https://`** URL on the phone (and in the Android app `strings.xml`).

   **A — localtunnel (npm)** — the URL is often printed on **stderr**, so the line can look “empty” in some terminals.

   ```bash
   # Terminal 1 — must be running first
   npm run dev

   # Terminal 2 — merge stderr into stdout so you always see the link
   npm run tunnel 2>&1
   ```

   Wait **10–20 seconds**. You should see: `your url is: https://....loca.lt`  
   If you still see nothing: run `npm install` (installs the `localtunnel` devDependency), then try again. First visit in the browser may show a **loca.lt** click-through page — press **Continue**.

   **B — Cloudflare Quick Tunnel** (often clearer output; install once: `brew install cloudflare/cloudflare/cloudflared`):

   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```

   Use the printed `https://....trycloudflare.com` URL.

   **C — ngrok:** [ngrok.com](https://ngrok.com/) after `brew install ngrok/ngrok/ngrok` and `ngrok config add-authtoken ...`.
2. **Local HTTPS:** Use a tool like [mkcert](https://github.com/FiloSottile/mkcert) to create a trusted cert for your LAN IP or hostname, then run Next behind HTTPS (custom server or reverse proxy). More setup, no public URL.
3. **Site settings:** On Android Chrome: lock icon → **Site settings** → ensure **Microphone** is allowed (still won’t fix HTTP; you need HTTPS for LAN IP).

**Summary:** Use an **`https://`** URL to your dev server from the phone if you need **mic + reliable voice**.

### Android emulator

The emulator uses **10.0.2.2** to reach the host machine. The sample Android `SERVER_URL` defaults to `http://10.0.2.2:3000/` for that case.

### Away from home LAN

Use **Tailscale** (or similar) so the phone and PC share a virtual network, or an **HTTPS tunnel** (Cloudflare Tunnel, ngrok) and put that URL in the Android app. Avoid exposing plain HTTP to the public internet.

## Android WebView shell

The [`android/`](android/) project loads this site in a `WebView` so **Piper and the web UI stay unchanged**. Open the `android` folder in **Android Studio** and set `default_server_url` in `app/src/main/res/values/strings.xml` for a physical device. See [`android/README.md`](android/README.md).

## Tech

- Next.js 12, React 18, Tailwind CSS
- `POST /api/chat` — JSON body: `question`, `age`, optional `language` (`"en"` | `"hi"`) — see `src/pages/api/chat.ts`
- Piper TTS (`@mintplex-labs/piper-tts-web`) for English; Web Speech `hi-IN` for Hindi
