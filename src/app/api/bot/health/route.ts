import { NextResponse } from 'next/server';

const BOT_SERVICE_URL = 'http://localhost:3005';

/**
 * GET /api/bot/health — Proxy to bot service health check
 *
 * Returns: Bot service health status, uptime, and version information
 * Falls back to degraded status if bot service is unreachable
 */
export async function GET() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const botServiceUrl = new URL('/health', BOT_SERVICE_URL);
    const response = await fetch(botServiceUrl.toString(), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();

      return NextResponse.json({
        status: 'healthy',
        botService: {
          ...data,
          reachable: true,
          checkedAt: new Date().toISOString(),
        },
        _serviceAvailable: true,
      });
    }

    // Bot service responded but with an error status
    console.error(`Bot health check returned: ${response.status}`);
    return NextResponse.json({
      status: 'degraded',
      botService: {
        reachable: true,
        statusCode: response.status,
        error: `Bot service returned ${response.status}`,
        checkedAt: new Date().toISOString(),
      },
      _serviceAvailable: false,
    });
  } catch (error) {
    clearTimeout(timeoutId);

    const isTimeout = error instanceof DOMException && error.name === 'AbortError';

    return NextResponse.json({
      status: 'unhealthy',
      botService: {
        reachable: false,
        error: isTimeout ? 'Bot service timeout' : 'Bot service unreachable',
        checkedAt: new Date().toISOString(),
      },
      _serviceAvailable: false,
    });
  }
}
