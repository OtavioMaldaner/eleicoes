import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Deixa abrir o servidor de desenvolvimento pelo IP da rede (celular, outro computador).
  allowedDevOrigins: ['192.168.2.17'],
};

export default nextConfig;
