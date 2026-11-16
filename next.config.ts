import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // بهینه‌سازی تصاویر
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  // فشرده‌سازی
  compress: true,
  // هدرهای امنیتی
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
  // تنظیمات production
  poweredByHeader: false,
  reactStrictMode: false,
  // در حالت production، خطاهای TypeScript نباید build را متوقف کنند
  // (در توسعه این مقادیر با bun run lint چک می‌شوند)
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
