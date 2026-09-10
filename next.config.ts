import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Slike dolaze sa domena vanjskih dobavljaca koje unaprijed ne znamo,
  // pa dozvoljavamo bilo koji https host. Sve ostalo (http) je blokirano.
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
    formats: ["image/webp"],
  },
  // OctaDeploy sam odredjuje port - nikad ga ne hardkodirati.
  poweredByHeader: false,
  compress: true,
};

export default nextConfig;
