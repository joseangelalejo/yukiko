import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@db': path.resolve(__dirname, '../db'),
      '@core': path.resolve(__dirname, '../core/src'),
    };
    return config;
  },
};

export default nextConfig;
