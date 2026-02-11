/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "@radix-ui/react-icons"],
  },
  transpilePackages: ["framer-motion"],
  reactStrictMode: true,
  // Next.js 16 TypeScript worker currently overflows stack in this repo.
  // We enforce `tsc --noEmit` via npm scripts instead.
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
