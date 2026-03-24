import type { CapacitorConfig } from "@capacitor/cli";

/**
 * DoubtSolver — Capacitor Android configuration
 *
 * The WebView points at the Next.js dev server running on your Mac.
 * Both your Mac and phone must be on the same Wi-Fi network.
 *
 * To use a different server (e.g. after deploying to Vercel):
 *   SERVER_URL=https://your-app.vercel.app npx cap sync android
 */
const serverUrl = process.env.SERVER_URL ?? "http://192.168.1.2:3000";

const config: CapacitorConfig = {
  appId: "app.doubtsolver",
  appName: "DoubtSolver",
  webDir: "out",
  server: {
    url: serverUrl,
    cleartext: serverUrl.startsWith("http://"),
  },
  android: {
    backgroundColor: "#e0e7ff",
  },
};

export default config;
