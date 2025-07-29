import { Link, LinkProps } from 'expo-router';

declare module 'expo-router' {
  interface StaticRoutes {
    '/settings': never;
    // Add other custom routes here
  }
}