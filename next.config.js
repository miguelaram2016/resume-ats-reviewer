/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Prevent pdfjs-dist from trying to bundle node-canvas in the server build
    config.resolve.fallback = {
      ...config.resolve.fallback,
      canvas: false,
    };
    return config;
  },
};

module.exports = nextConfig;
