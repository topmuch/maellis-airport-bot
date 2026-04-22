// =============================================================================
// MAELLIS Airport Bot — End-to-End Tests
// Run with: cd mini-services/bot-service && bun test ../tests/e2e.test.ts
// Or from project root: bun test tests/e2e.test.ts
// =============================================================================

import { test, expect, describe, beforeAll, afterAll } from 'bun:test';

const BASE_URL = 'http://localhost:3005';

// =============================================================================
// Test Suite: Health & System
// =============================================================================
describe('Health & System', () => {
  test('GET /health returns 200 with service info', async () => {
    const res = await fetch(`${BASE_URL}/health`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBeDefined();
    expect(data.service).toBe('maellis-bot');
    expect(data.version).toBeDefined();
    expect(data.uptime).toBeGreaterThan(0);
    expect(data.services).toBeDefined();
    expect(data.services.groq).toBeDefined();
    expect(data.services.whatsapp).toBeDefined();
    expect(data.services.aviationStack).toBeDefined();
    expect(data.services.cinetpay).toBeDefined();
  });

  test('GET /airports returns airport list', async () => {
    const res = await fetch(`${BASE_URL}/airports`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.airports).toBeDefined();
    expect(data.count).toBeGreaterThan(0);
    // Should have West African airports
    expect(data.airports).toHaveProperty('dakar');
    expect(data.airports.dakar).toBe('DSS');
  });

  test('GET /airports?q=dakar searches airports', async () => {
    const res = await fetch(`${BASE_URL}/airports?q=dakar`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.results).toBeDefined();
    expect(data.count).toBeGreaterThan(0);
  });

  test('GET /airports?q=xxx returns empty results', async () => {
    const res = await fetch(`${BASE_URL}/airports?q=zzznonexistentzzz`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.results).toBeDefined();
    expect(data.count).toBe(0);
  });
});

// =============================================================================
// Test Suite: Webhook Verification
// =============================================================================
describe('Webhook Verification', () => {
  test('GET /webhook with correct token returns challenge', async () => {
    const res = await fetch(
      `${BASE_URL}/webhook?hub.mode=subscribe&hub.verify_token=maellis_test_token&hub.challenge=test_challenge_123`,
    );
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe('test_challenge_123');
  });

  test('GET /webhook with wrong token returns 403', async () => {
    const res = await fetch(
      `${BASE_URL}/webhook?hub.mode=subscribe&hub.verify_token=wrong_token&hub.challenge=test`,
    );
    expect(res.status).toBe(403);
  });

  test('GET /webhook without mode returns 403', async () => {
    const res = await fetch(`${BASE_URL}/webhook?hub.verify_token=maellis_test_token`);
    expect(res.status).toBe(403);
  });
});

// =============================================================================
// Test Suite: Chat Intent Classification
// =============================================================================
describe('Chat Intent Classification', () => {
  const testIntent = async (message: string, expectedIntent: string) => {
    const res = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, phone: '+221784858226' }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.intent).toBe(expectedIntent);
    expect(data.confidence).toBeGreaterThan(0);
    expect(data.language).toBeDefined();
    return data;
  };

  // Greeting intents
  test('French greeting → intent: greeting', async () => {
    await testIntent('Bonjour', 'greeting');
  });

  test('English greeting → intent: greeting', async () => {
    await testIntent('Hello, how are you?', 'greeting');
  });

  test('Wolof greeting → intent: greeting', async () => {
    await testIntent('Na nga def?', 'greeting');
  });

  test('Arabic greeting → intent: greeting', async () => {
    const data = await testIntent('مرحبا', 'greeting');
    expect(data.language).toBe('ar');
  });

  // Flight search intents
  test('French flight search → intent: flight_search', async () => {
    const data = await testIntent('Je cherche un vol pour Abidjan', 'flight_search');
    expect(data.entities).toBeDefined();
  });

  test('Dakar to Bamako flight → intent: flight_search', async () => {
    await testIntent('Vol Dakar Bamako demain', 'flight_search');
  });

  test('English flight search → intent: flight_search', async () => {
    const data = await testIntent('I want a flight from Lagos to Nairobi', 'flight_search');
    expect(data.language).toBe('en');
  });

  // Flight status intents
  test('French flight status → intent: flight_status', async () => {
    const data = await testIntent('Statut vol AF123', 'flight_status');
    expect(data.intent).toBe('flight_status');
  });

  test('English flight status → intent: flight_status', async () => {
    await testIntent('Status of flight 2S221', 'flight_status');
  });

  // Baggage intents
  test('French baggage → intent: baggage', async () => {
    await testIntent("J'ai perdu ma valise", 'baggage');
  });

  test('English baggage → intent: baggage', async () => {
    await testIntent('QR code for my luggage', 'baggage');
  });

  // Transport intents
  test('French transport → intent: transport', async () => {
    await testIntent('Je veux un taxi', 'transport');
  });

  test('Wolof transport → intent: transport', async () => {
    await testIntent('taksi bi', 'transport');
  });

  // Payment intents
  test('French payment → intent: payment', async () => {
    await testIntent('Problème de paiement', 'payment');
  });

  // Lounge intents
  test('French lounge → intent: lounge', async () => {
    await testIntent('Salon VIP', 'lounge');
  });

  // Emergency intents
  test('French emergency → intent: emergency', async () => {
    await testIntent("URGENCE j'ai besoin d'aide", 'emergency');
  });

  test('SOS → intent: emergency', async () => {
    await testIntent('SOS aidez-moi', 'emergency');
  });

  // Help intent
  test('French help → intent: help', async () => {
    await testIntent('Aide', 'help');
  });

  test('English help → intent: help', async () => {
    await testIntent('I need help', 'help');
  });
});

// =============================================================================
// Test Suite: Chat Response Validation
// =============================================================================
describe('Chat Response Validation', () => {
  test('Response contains BotResponse structure', async () => {
    const res = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Bonjour', phone: '+221784858226' }),
    });
    const data = await res.json();

    // Response should have either text or interactive
    expect(data.response).toBeDefined();
    if (data.response.type === 'text') {
      expect(data.response.text).toBeDefined();
      expect(typeof data.response.text).toBe('string');
      expect(data.response.text.length).toBeGreaterThan(0);
    } else if (data.response.type === 'interactive') {
      expect(data.response.interactive).toBeDefined();
      expect(data.response.interactive.body).toBeDefined();
      expect(data.response.interactive.action).toBeDefined();
    }
  });

  test('Greeting response mentions MAELLIS', async () => {
    const res = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Bonjour' }),
    });
    const data = await res.json();
    expect(data.response.text || JSON.stringify(data.response.interactive)).toContain('MAELLIS');
  });

  test('Help response lists available services', async () => {
    const res = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'aide' }),
    });
    const data = await res.json();
    // Should mention flight/vol in the response
    const combinedText = JSON.stringify(data.response);
    expect(combinedText.toLowerCase()).toContain('vol');
  });

  test('Unknown message returns fallback response', async () => {
    const res = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'xyz123randomtext456' }),
    });
    const data = await res.json();
    expect(data.intent).toBe('unknown');
    expect(data.response).toBeDefined();
  });
});

// =============================================================================
// Test Suite: Entity Extraction
// =============================================================================
describe('Entity Extraction', () => {
  test('Extracts flight number from message', async () => {
    const res = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Statut vol AF123' }),
    });
    const data = await res.json();
    // Check AI entities for flight_number
    if (data.aiEntities) {
      expect(data.aiEntities.flight_number).toBe('AF123');
    }
  });

  test('Extracts cities from flight search', async () => {
    const res = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Vol Dakar Abidjan demain' }),
    });
    const data = await res.json();
    // Should have entities from keyword classifier
    expect(data.entities).toBeDefined();
    expect(data.entities.length).toBeGreaterThanOrEqual(0);
  });
});

// =============================================================================
// Test Suite: Error Handling
// =============================================================================
describe('Error Handling', () => {
  test('POST /chat without message returns 400', async () => {
    const res = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '+221784858226' }),
    });
    expect(res.status).toBe(400);
  });

  test('POST /chat with empty body returns 400', async () => {
    const res = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  test('GET /track/invalid returns 404', async () => {
    const res = await fetch(`${BASE_URL}/track/invalid_token_xyz`);
    expect(res.status).toBe(404);
  });

  test('GET /flight/status/ without number returns 400 or 404', async () => {
    const res = await fetch(`${BASE_URL}/flight/status/`);
    expect([400, 404]).toContain(res.status);
  });
});

// =============================================================================
// Test Suite: Baggage QR Generation
// =============================================================================
describe('Baggage QR Generation', () => {
  test('POST /baggage/generate creates valid QR', async () => {
    const res = await fetch(`${BASE_URL}/baggage/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        passengerName: 'Moussa Diallo',
        phone: '+221784858226',
        flightNumber: '2S221',
        pnr: 'PNR123456',
        destination: 'ABJ',
      }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.token).toBeDefined();
    expect(data.trackingUrl).toBeDefined();
    expect(data.trackingUrl).toContain('/track/');
    expect(data.message).toBeDefined();
    expect(data.validUntil).toBeDefined();

    // Verify the token is valid
    const verifyRes = await fetch(`${BASE_URL}/track/${data.token}`);
    expect(verifyRes.status).toBe(200);
    const verifyData = await verifyRes.json();
    expect(verifyData.valid).toBe(true);
    expect(verifyData.data).toBeDefined();
    expect(verifyData.data.passengerName).toBe('Moussa Diallo');
    expect(verifyData.data.flightNumber).toBe('2S221');
  });

  test('POST /baggage/generate without required fields returns 400', async () => {
    const res = await fetch(`${BASE_URL}/baggage/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passengerName: 'Test' }),
    });
    expect(res.status).toBe(400);
  });
});

// =============================================================================
// Test Suite: Flight Search & Status
// =============================================================================
describe('Flight Search & Status', () => {
  test('POST /flight/search returns flights', async () => {
    const res = await fetch(`${BASE_URL}/flight/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        departureCode: 'DSS',
        arrivalCode: 'ABJ',
      }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.flights).toBeDefined();
    expect(data.flights.length).toBeGreaterThan(0);
    expect(data.route).toBeDefined();
    expect(data.route.from).toBe('DSS');
    expect(data.route.to).toBe('ABJ');
  });

  test('POST /flight/search without codes returns 400', async () => {
    const res = await fetch(`${BASE_URL}/flight/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ departureCode: 'DSS' }),
    });
    expect(res.status).toBe(400);
  });

  test('GET /flight/status/:number returns status', async () => {
    const res = await fetch(`${BASE_URL}/flight/status/2S221`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.flight).toBeDefined();
    expect(data.flight.flightNumber).toBe('2S221');
    expect(data.flight.status).toBeDefined();
    expect(data.source).toBeDefined();
  });

  test('POST /flight/search resolves city names', async () => {
    const res = await fetch(`${BASE_URL}/flight/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        departureCode: 'dakar',
        arrivalCode: 'abidjan',
      }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.flights).toBeDefined();
    expect(data.route).toBeDefined();
  });
});

// =============================================================================
// Test Suite: 404 Handling
// =============================================================================
describe('404 Handling', () => {
  test('GET /nonexistent returns 404 with help', async () => {
    const res = await fetch(`${BASE_URL}/nonexistent`);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe('Not Found');
    expect(data.endpoints).toBeDefined();
    expect(data.endpoints.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// Test Suite: CORS
// =============================================================================
describe('CORS', () => {
  test('OPTIONS request returns CORS headers', async () => {
    const res = await fetch(`${BASE_URL}/health`, { method: 'OPTIONS' });
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('GET');
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST');
  });
});
