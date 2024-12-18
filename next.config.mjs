/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['imgurl.chenry.eu.org'],
    unoptimized: true,
  },
  experimental: {
    serverComponentsExternalPackages: ['sharp'],
  },
  // Vercel 的文件大小限制应该在项目设置中配置，而不是在 next.config.mjs 中
}

export default nextConfig
