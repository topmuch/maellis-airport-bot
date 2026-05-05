import { db } from '@/lib/db';
import type { Prisma } from '@prisma/client';

// ═══════════════════════════════════════════════════════════════════════════
// PMR Audio Service — Smartly V1.5
// Assistance Visuelle PMR (Audio-Description) — TTS pour malvoyants
// ═══════════════════════════════════════════════════════════════════════════

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GenerateAudioInput {
  text: string;
  type: 'navigation' | 'announcement' | 'gate_info' | 'emergency' | 'general';
  language?: string;
  phone?: string;
  userId?: string;
}

// ---------------------------------------------------------------------------
// 1. generateAudio — Create an audio generation entry (mock provider)
// ---------------------------------------------------------------------------
export async function generateAudio(data: GenerateAudioInput) {
  try {
    const { text, type, language = 'fr', phone, userId } = data;

    if (!text || text.trim().length === 0) {
      throw new Error('Text is required for audio generation');
    }

    // Mock audio generation — in production, call TTS API here
    const durationSec = Math.ceil(text.length / 15); // ~15 chars per second
    const audioUrl = `https://smartly.maellis.sn/audio/${Date.now().toString(36)}.mp3`;

    const generation = await db.audioGeneration.create({
      data: {
        id: crypto.randomUUID(),
        phone: phone ?? null,
        userId: userId ?? null,
        type,
        inputText: text,
        audioUrl,
        language,
        provider: 'mock',
        durationSec,
        status: 'generated',
        updatedAt: new Date(),
      },
    });

    return generation;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[pmr-audio.service] generateAudio error:', error);
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 2. getAudioHistory — List audio generations
// ---------------------------------------------------------------------------
export async function getAudioHistory(phone?: string) {
  try {
    const where: Prisma.AudioGenerationWhereInput = {};

    if (phone) {
      where.phone = phone;
    }

    const history = await db.audioGeneration.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return history;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[pmr-audio.service] getAudioHistory error:', error);
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 3. getAudioById — Get a single audio generation
// ---------------------------------------------------------------------------
export async function getAudioById(id: string) {
  try {
    const audio = await db.audioGeneration.findUnique({
      where: { id },
    });

    if (!audio) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`[pmr-audio.service] Audio not found: ${id}`);
      }
      return null;
    }

    return audio;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[pmr-audio.service] getAudioById error:', error);
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 4. deleteAudio — Delete an audio generation
// ---------------------------------------------------------------------------
export async function deleteAudio(id: string) {
  try {
    const existing = await db.audioGeneration.findUnique({ where: { id } });
    if (!existing) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`[pmr-audio.service] Audio not found: ${id}`);
      }
      return null;
    }

    await db.audioGeneration.delete({ where: { id } });
    return { success: true, deletedId: id };
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[pmr-audio.service] deleteAudio error:', error);
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 5. buildNavigationResponse — Build guided navigation audio text
// ---------------------------------------------------------------------------
export function buildNavigationResponse(origin: string, destination: string): string {
  const directions = [
    'Tournez à gauche et marchez 50 mètres.',
    'Continuez tout droit sur 100 mètres.',
    'Tournez à droite après le panneau "Sorties".',
    'Montez les escalators vers le niveau départ.',
    'Suivez les panneaux bleus direction',
  ];

  return (
    `🎤 *Navigation Guidée*\n\n` +
    `📍 *De :* ${origin}\n` +
    `🎯 *Vers :* ${destination}\n\n` +
    `🕵️ *Instructions :*\n` +
    directions.map((d, i) => `${i + 1}. ${d}`).join('\n') +
    `\n\n⏱️ *Durée estimée :* ~5 minutes\n` +
    `♿ Accessibilité PMR : Chemin adapté avec ascenseurs disponibles.`
  );
}

// ---------------------------------------------------------------------------
// 6. buildGateInfoResponse — Build gate information audio text
// ---------------------------------------------------------------------------
export function buildGateInfoResponse(gate: string, terminal: string): string {
  return (
    `🎤 *Information Porte d'Embarquement*\n\n` +
    `🚪 *Porte :* ${gate}\n` +
    `🏢 *Terminal :* ${terminal}\n\n` +
    `ℹ️ *Instructions :*\n` +
    `1. Dirigez-vous vers le Terminal ${terminal}\n` +
    `2. Suivez les panneaux numériques vers la Porte ${gate}\n` +
    `3. Présentez votre carte d'embarquement au contrôle\n` +
    `4. La porte ouvre 45 minutes avant le départ\n\n` +
    `♿ *PMR :* Un couloir prioritaire est disponible à gauche de la porte.`
  );
}

// ---------------------------------------------------------------------------
// 7. getPmrStats — Admin dashboard stats
// ---------------------------------------------------------------------------
export async function getPmrStats() {
  try {
    const [totalGenerations, typeBreakdown, languageBreakdown, totalDuration] =
      await Promise.all([
        db.audioGeneration.count(),
        db.audioGeneration.groupBy({ by: ['type'], _count: true }),
        db.audioGeneration.groupBy({ by: ['language'], _count: true }),
        db.audioGeneration.aggregate({
          _sum: { durationSec: true },
        }),
      ]);

    return {
      totalGenerations,
      typeBreakdown: Object.fromEntries(typeBreakdown.map(t => [t.type, t._count])),
      languageBreakdown: Object.fromEntries(languageBreakdown.map(l => [l.language, l._count])),
      totalDurationSec: totalDuration._sum.durationSec || 0,
    };
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[pmr-audio.service] getPmrStats error:', error);
    }
    throw error;
  }
}
