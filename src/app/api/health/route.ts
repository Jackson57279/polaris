/**
 * Health Check API Route
 *
 * Used by the Electron app to verify the Next.js server is ready
 * Also useful for general health monitoring
 */

import { NextResponse } from 'next/server';

/**
 * Provide a JSON health-check response for the API.
 *
 * The response includes service status, current timestamp, package version fallback,
 * runtime environment fallback, and whether the server is running under Electron.
 *
 * @returns A Response containing a JSON object with:
 *  - `status`: `"ok"`
 *  - `timestamp`: current time as an ISO 8601 string
 *  - `version`: the `npm_package_version` environment value or `"0.1.0"` if unset
 *  - `environment`: the `NODE_ENV` environment value or `"development"` if unset
 *  - `isElectron`: `true` if the `IS_ELECTRON` environment value equals `'true'`, `false` otherwise
 * The HTTP response has status 200 and a `Cache-Control: no-store, no-cache, must-revalidate` header.
 */
export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.1.0',
      environment: process.env.NODE_ENV || 'development',
      isElectron: process.env.IS_ELECTRON === 'true',
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  );
}

/**
 * Send an empty health-check response with HTTP status 200.
 *
 * @returns A Response with HTTP status 200 and `Cache-Control: no-store, no-cache, must-revalidate`.
 */
export async function HEAD() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}