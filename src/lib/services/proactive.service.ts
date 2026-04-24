import { db } from '@/lib/db';
import type { Prisma } from '@prisma/client';
import { addHours, startOfDay, format, parseISO } from 'date-fns';

// ---------------------------------------------------------------------------
// TypeScript types
// ---------------------------------------------------------------------------

export interface ProactiveRule {
  id: string;
  name: string;
  description: string;
  thresholdMinutes?: number;
  enabled: boolean;
}

export interface ProactiveFlightAction {
  flightNumber: string;
  airline: string;
  messageType: string;
  messageContent: string;
  scheduledDep: string | null;
  delayMinutes: number;
}

export interface SendProactiveMessageInput {
  phone: string;
  flightNumber?: string;
  messageType: string;
  messageContent: string;
  triggeredBy: string;
}

export interface ProactiveLogFilters {
  airportCode?: string;
  phone?: string;
  messageType?: string;
  page?: number;
  limit?: number;
}

export interface ProactiveLogListResult {
  logs: Array<{
    id: string;
    phone: string;
    flightNumber: string | null;
    airportCode: string;
    messageType: string;
    messageContent: string;
    triggeredBy: string;
    status: string;
    sentAt: Date;
    deliveredAt: Date | null;
    readAt: Date | null;
    createdAt: Date;
  }>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ProactiveStats {
  sentToday: number;
  totalSent: number;
  byMessageType: Array<{ messageType: string; count: number }>;
  deliveredRate: number;
}

// ---------------------------------------------------------------------------
// Default rule definitions (can be overridden via Setting model)
// ---------------------------------------------------------------------------

const DEFAULT_RULES: Omit<ProactiveRule, 'enabled'>[] = [
  {
    id: 'departure_reminder',
    name: 'Rappel départ',
    description: '2h avant le départ',
    thresholdMinutes: 120,
  },
  {
    id: 'delay_alert',
    name: 'Alerte retard',
    description: 'Retard > 30 minutes',
    thresholdMinutes: 30,
  },
  {
    id: 'gate_change',
    name: 'Changement porte',
    description: 'Tout changement de porte',
  },
];

// ---------------------------------------------------------------------------
// 1. getProactiveRules — Return rule definitions with enabled state from DB
// ---------------------------------------------------------------------------

export async function getProactiveRules(): Promise<ProactiveRule[]> {
  try {
    // Fetch all proactive settings (group = 'proactive')
    const settings = await db.setting.findMany({
      where: { group: 'proactive' },
    });

    const enabledMap = new Map<string, boolean>();
    for (const s of settings) {
      enabledMap.set(s.key, s.value === 'true');
    }

    // Default to enabled if no setting found
    return DEFAULT_RULES.map((rule) => ({
      ...rule,
      enabled: enabledMap.has(rule.id) ? enabledMap.get(rule.id)! : true,
    }));
  } catch (error) {
    console.error('[proactive.service] getProactiveRules error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 2. evaluateFlightsForProactive — Find flights that should trigger messages
// ---------------------------------------------------------------------------

export async function evaluateFlightsForProactive(
  airportCode: string,
): Promise<ProactiveFlightAction[]> {
  try {
    const now = new Date();
    const twoHoursFromNow = addHours(now, 2);

    // Fetch flights from this airport
    const flights = await db.flightStatus.findMany({
      where: { departureCode: airportCode },
    });

    // Also get enabled rules to skip disabled ones
    const rules = await getProactiveRules();
    const enabledRules = new Map<string, ProactiveRule>();
    for (const rule of rules) {
      if (rule.enabled) enabledRules.set(rule.id, rule);
    }

    const actions: ProactiveFlightAction[] = [];

    for (const flight of flights) {
      // ── Departure reminder: scheduled departure within next 2h ──
      if (enabledRules.has('departure_reminder') && flight.scheduledDep) {
        const scheduledDep = parseISO(flight.scheduledDep);
        if (scheduledDep > now && scheduledDep <= twoHoursFromNow) {
          const depTime = format(scheduledDep, 'HH:mm');
          actions.push({
            flightNumber: flight.flightNumber,
            airline: flight.airline,
            messageType: 'departure_reminder',
            messageContent:
              `Rappel : votre vol ${flight.airline} ${flight.flightNumber} ` +
              `départ prévu à ${depTime} depuis ${airportCode}. ` +
              `Merci de vous présenter à l'embarquement.`,
            scheduledDep: flight.scheduledDep,
            delayMinutes: flight.delayMinutes,
          });
        }
      }

      // ── Delay alert: delay > 30 minutes ──
      if (enabledRules.has('delay_alert') && flight.delayMinutes > 30) {
        const depRule = enabledRules.get('delay_alert')!;
        if (flight.delayMinutes > (depRule.thresholdMinutes ?? 30)) {
          const depTime = flight.scheduledDep
            ? format(parseISO(flight.scheduledDep), 'HH:mm')
            : 'N/A';
          actions.push({
            flightNumber: flight.flightNumber,
            airline: flight.airline,
            messageType: 'delay_alert',
            messageContent:
              `Alerte retard : votre vol ${flight.airline} ${flight.flightNumber} ` +
              `est retardé de ${flight.delayMinutes} minutes. ` +
              `Départ initial prévu à ${depTime}. ` +
              `Nous vous informerons de toute mise à jour.`,
            scheduledDep: flight.scheduledDep,
            delayMinutes: flight.delayMinutes,
          });
        }
      }
    }

    return actions;
  } catch (error) {
    console.error('[proactive.service] evaluateFlightsForProactive error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 3. sendProactiveMessage — Create a ProactiveLog entry
// ---------------------------------------------------------------------------

export async function sendProactiveMessage(
  data: SendProactiveMessageInput,
) {
  try {
    if (!data.phone || typeof data.phone !== 'string') {
      throw new Error('Phone number is required');
    }
    if (!data.messageType || typeof data.messageType !== 'string') {
      throw new Error('messageType is required');
    }
    if (!data.messageContent || typeof data.messageContent !== 'string') {
      throw new Error('messageContent is required');
    }
    if (!data.triggeredBy || typeof data.triggeredBy !== 'string') {
      throw new Error('triggeredBy is required');
    }

    const validMessageTypes = [
      'departure_reminder',
      'delay_alert',
      'gate_change',
      'boarding_call',
      'promotion',
    ];
    if (!validMessageTypes.includes(data.messageType)) {
      throw new Error(
        `Invalid messageType. Must be one of: ${validMessageTypes.join(', ')}`,
      );
    }

    const log = await db.proactiveLog.create({
      data: {
        phone: data.phone,
        flightNumber: data.flightNumber || null,
        airportCode: 'DSS',
        messageType: data.messageType,
        messageContent: data.messageContent,
        triggeredBy: data.triggeredBy,
        status: 'sent',
        sentAt: new Date(),
      },
    });

    return log;
  } catch (error) {
    console.error('[proactive.service] sendProactiveMessage error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 4. getProactiveLogs — List with pagination and filters
// ---------------------------------------------------------------------------

export async function getProactiveLogs(
  filters: ProactiveLogFilters = {},
): Promise<ProactiveLogListResult> {
  try {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.ProactiveLogWhereInput = {};

    if (filters.airportCode) {
      where.airportCode = filters.airportCode;
    }

    if (filters.phone) {
      where.phone = filters.phone;
    }

    if (filters.messageType) {
      where.messageType = filters.messageType;
    }

    const [logs, total] = await Promise.all([
      db.proactiveLog.findMany({
        where,
        orderBy: { sentAt: 'desc' },
        skip,
        take: limit,
      }),
      db.proactiveLog.count({ where }),
    ]);

    return {
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    console.error('[proactive.service] getProactiveLogs error:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// 5. getProactiveStats — Aggregate statistics
// ---------------------------------------------------------------------------

export async function getProactiveStats(
  airportCode?: string,
): Promise<ProactiveStats> {
  try {
    const todayStart = startOfDay(new Date());

    // Base where clause
    const baseWhere: Prisma.ProactiveLogWhereInput = {};
    if (airportCode) {
      baseWhere.airportCode = airportCode;
    }

    // Sent today
    const sentToday = await db.proactiveLog.count({
      where: {
        ...baseWhere,
        sentAt: { gte: todayStart },
      },
    });

    // Total sent
    const totalSent = await db.proactiveLog.count({
      where: baseWhere,
    });

    // Grouped by messageType
    const grouped = await db.proactiveLog.groupBy({
      by: ['messageType'],
      where: baseWhere,
      _count: { messageType: true },
      orderBy: { _count: { messageType: 'desc' } },
    });

    const byMessageType = grouped.map((g) => ({
      messageType: g.messageType,
      count: g._count.messageType,
    }));

    // Delivered rate
    const deliveredCount = await db.proactiveLog.count({
      where: {
        ...baseWhere,
        status: 'delivered',
      },
    });

    const deliveredRate =
      totalSent > 0
        ? Math.round((deliveredCount / totalSent) * 10000) / 100
        : 0;

    return {
      sentToday,
      totalSent,
      byMessageType,
      deliveredRate,
    };
  } catch (error) {
    console.error('[proactive.service] getProactiveStats error:', error);
    throw error;
  }
}
