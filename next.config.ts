import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next.js blocks cross-origin dev-server requests (incl. the HMR
  // websocket) from any host other than localhost by default. The ngrok
  // tunnel used for demos serves a random *.ngrok-free.app subdomain each
  // run, so it's allowlisted by wildcard rather than a fixed URL.
  allowedDevOrigins: ["*.ngrok-free.app", "*.ngrok.app", "*.ngrok.io"],
};

export default nextConfig;
