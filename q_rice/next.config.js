/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Prevents duplicate WebSocket handshakes during local development
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true, // We will run standalone typechecking with vitest
  },
  experimental: {
    serverComponentsExternalPackages: ['pdfkit'],
  },
  webpack: (config) => {
    config.externals.push({
      bufferutil: "bufferutil",
      "utf-8-validate": "utf-8-validate",
    });
    return config;
  },
};

module.exports = nextConfig;
