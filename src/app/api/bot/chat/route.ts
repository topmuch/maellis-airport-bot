import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/bot/chat — Proxy route to the MAELLIS bot service (port 3005)
 *
 * Accepts: { message: string, phone?: string }
 * Returns: Bot response with intent classification and WhatsApp-formatted response
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, phone } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Field 'message' is required and must be a string" },
        { status: 400 },
      );
    }

    if (message.length > 2000) {
      return NextResponse.json(
        { error: "Message too long. Maximum 2000 characters." },
        { status: 400 },
      );
    }

    const botServiceUrl = new URL(
      "/chat",
      "http://localhost:3005",
    );

    const proxyBody: Record<string, string> = { message };
    if (phone && typeof phone === "string") {
      proxyBody.phone = phone;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(botServiceUrl.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(proxyBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Bot service error: ${response.status} — ${errorText}`);
        return NextResponse.json(
          { error: "Bot service temporarily unavailable" },
          { status: 502 },
        );
      }

      const data = await response.json();
      return NextResponse.json(data);
    } catch (fetchErr) {
      clearTimeout(timeoutId);

      if (fetchErr instanceof DOMException && fetchErr.name === "AbortError") {
        return NextResponse.json(
          { error: "Bot service timeout. Please try again." },
          { status: 504 },
        );
      }

      console.error("Failed to reach bot service:", fetchErr);
      return NextResponse.json(
        { error: "Bot service is not available right now" },
        { status: 503 },
      );
    }
  } catch (err) {
    console.error("Error in /api/bot/chat:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
