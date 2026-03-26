/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [],
  },
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    return [
      // Proxy API calls in dev to avoid CORS issues
      ...(process.env.NODE_ENV === "development"
        ? [{ source: "/api/:path*", destination: `${backendUrl}/:path*` }]
        : []),
    ];
  },
};

module.exports = nextConfig;
