import type { AppProps } from "next/app";
import Head from "next/head";
import "../app/globals.css";
import { useEffect } from "react";

export default function App({ Component, pageProps }: AppProps) {
  // Register service worker for PWA
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .catch(() => { /* SW not critical — fail silently */ });
    }
  }, []);

  return (
    <>
      <Head>
        <meta name="application-name" content="DoubtSolver" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="DoubtSolver" />
        <meta name="description" content="Ask anything — your mini tutor explains it simply." />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#4f46e5" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
