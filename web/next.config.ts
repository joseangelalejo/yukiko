import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      '@db': path.resolve(__dirname, '../db'),
      '@core': path.resolve(__dirname, '../core/src'),
    },
  },
};

export default nextConfig;
