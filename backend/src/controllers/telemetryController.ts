import { Request, Response } from 'express';
import { parse } from 'csv-parse/sync';
import prisma from '../lib/prisma.js';

// Intervalos aceitáveis conforme contrato de telemetria v1.0
const LIMITS = {
  temp_ext_c: { min: -40, max: 60 },
  humidity_pct: { min: 0, max: 100 },
  pressure_hpa: { min: 300, max: 1100 },
  temp_nest1_c: { min: -10, max: 70 },
  temp_nest2_c: { min: -10, max: 70 },
  weight_g: { min: 0, max: 200000 },
  battery_mv: { min: 0, max: 20000 },
};

const SENTINEL = -127.0;

interface CsvRow {
  device_id: string;
  timestamp: string;
  temp_ext_c: string;
  humidity_pct: string;
  pressure_hpa: string;
  temp_nest1_c: string;
  temp_nest2_c: string;
  weight_g: string;
  battery_mv: string;
  status_flags: string;
}

function validateValue(field: keyof typeof LIMITS, value: number): string | null {
  const limit = LIMITS[field];
  if (value < limit.min || value > limit.max) {
    return `${field} fora do intervalo [${limit.min}, ${limit.max}]`;
  }
  return null;
}

export async function importCsv(req: Request, res: Response): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Ficheiro CSV obrigatório.' });
      return;
    }

    const content = req.file.buffer.toString('utf-8');

    let records: CsvRow[];
    try {
      records = parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } catch {
      res.status(400).json({ error: 'Formato CSV inválido.' });
      return;
    }

    if (records.length === 0) {
      res.status(400).json({ error: 'Ficheiro CSV vazio.' });
      return;
    }

    let imported = 0;
    let duplicated = 0;
    let rejected = 0;
    const errors: string[] = [];

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const lineNum = i + 2; // +2 porque linha 1 é o cabeçalho

      // Validações obrigatórias
      if (!row.device_id || !row.timestamp) {
        rejected++;
        errors.push(`Linha ${lineNum}: device_id ou timestamp em falta.`);
        continue;
      }

      const timestamp = new Date(row.timestamp);
      if (isNaN(timestamp.getTime())) {
        rejected++;
        errors.push(`Linha ${lineNum}: timestamp inválido "${row.timestamp}".`);
        continue;
      }

      // Verificar se o dispositivo existe
      const device = await prisma.device.findUnique({
        where: { deviceId: row.device_id },
      });

      if (!device) {
        rejected++;
        errors.push(`Linha ${lineNum}: dispositivo "${row.device_id}" não registado.`);
        continue;
      }

      // Parse dos valores
      const tempExtC = row.temp_ext_c ? parseFloat(row.temp_ext_c) : null;
      const humidityPct = row.humidity_pct ? parseFloat(row.humidity_pct) : null;
      const pressureHpa = row.pressure_hpa ? parseFloat(row.pressure_hpa) : null;
      const tempNest1C = row.temp_nest1_c ? parseFloat(row.temp_nest1_c) : null;
      const tempNest2C = row.temp_nest2_c ? parseFloat(row.temp_nest2_c) : null;
      const weightG = row.weight_g ? parseInt(row.weight_g, 10) : null;
      const batteryMv = row.battery_mv ? parseInt(row.battery_mv, 10) : null;
      const statusFlags = row.status_flags || 'OK';

      // Validar intervalos (ignorar sentinelas)
      let valid = true;
      let invalidReason: string | null = null;

      const fieldsToCheck: [string, number | null][] = [
        ['temp_ext_c', tempExtC],
        ['humidity_pct', humidityPct],
        ['pressure_hpa', pressureHpa],
        ['temp_nest1_c', tempNest1C],
        ['temp_nest2_c', tempNest2C],
      ];

      for (const [field, value] of fieldsToCheck) {
        if (value !== null && value !== SENTINEL) {
          const reason = validateValue(field as keyof typeof LIMITS, value);
          if (reason) {
            valid = false;
            invalidReason = reason;
            break;
          }
        }
      }

      if (weightG !== null) {
        const reason = validateValue('weight_g', weightG);
        if (reason) {
          valid = false;
          invalidReason = reason;
        }
      }

      if (batteryMv !== null) {
        const reason = validateValue('battery_mv', batteryMv);
        if (reason) {
          valid = false;
          invalidReason = reason;
        }
      }

      if (!valid) {
        rejected++;
        errors.push(`Linha ${lineNum}: ${invalidReason}`);
        continue;
      }

      // Deduplicação: (device_id, timestamp)
      const existing = await prisma.telemetryReading.findUnique({
        where: {
          deviceId_timestamp: {
            deviceId: row.device_id,
            timestamp,
          },
        },
      });

      if (existing) {
        duplicated++;
        continue;
      }

      // Determinar valores nulos para sentinelas
      const finalTempExt = tempExtC === SENTINEL ? null : tempExtC;
      const finalHumidity = humidityPct === SENTINEL ? null : humidityPct;
      const finalPressure = pressureHpa === SENTINEL ? null : pressureHpa;
      const finalNest1 = tempNest1C === SENTINEL ? null : tempNest1C;
      const finalNest2 = tempNest2C === SENTINEL ? null : tempNest2C;

      await prisma.telemetryReading.create({
        data: {
          deviceId: row.device_id,
          hiveId: device.hiveId,
          timestamp,
          tempExtC: finalTempExt,
          humidityPct: finalHumidity,
          pressureHpa: finalPressure,
          tempNest1C: finalNest1,
          tempNest2C: finalNest2,
          weightG,
          batteryMv,
          statusFlags,
          valid: statusFlags === 'OK' || statusFlags === '',
          invalidReason: statusFlags !== 'OK' ? statusFlags : null,
        },
      });

      // Atualizar lastSeenAt do dispositivo
      await prisma.device.update({
        where: { deviceId: row.device_id },
        data: { lastSeenAt: timestamp },
      });

      imported++;
    }

    res.json({
      total: records.length,
      imported,
      duplicated,
      rejected,
      errors: errors.slice(0, 20), // máx. 20 erros
    });
  } catch {
    res.status(500).json({ error: 'Erro ao importar CSV.' });
  }
}

export async function list(req: Request, res: Response): Promise<void> {
  try {
    const { hiveId, from, to, page = '1', limit = '100' } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = Math.min(parseInt(limit as string, 10), 500);
    const skip = (pageNum - 1) * limitNum;

    const where: Record<string, unknown> = {};

    if (hiveId) {
      where.hiveId = hiveId as string;
    }

    if (from || to) {
      where.timestamp = {};
      if (from) (where.timestamp as Record<string, unknown>).gte = new Date(from as string);
      if (to) (where.timestamp as Record<string, unknown>).lte = new Date(to as string);
    }

    const [readings, total] = await Promise.all([
      prisma.telemetryReading.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.telemetryReading.count({ where }),
    ]);

    res.json({
      data: readings,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch {
    res.status(500).json({ error: 'Erro ao listar leituras.' });
  }
}

export async function latest(req: Request, res: Response): Promise<void> {
  try {
    const { hiveId } = req.query;

    const where: Record<string, unknown> = { valid: true };
    if (hiveId) {
      where.hiveId = hiveId as string;
    }

    const reading = await prisma.telemetryReading.findFirst({
      where,
      orderBy: { timestamp: 'desc' },
      include: { device: { select: { deviceId: true } } },
    });

    if (!reading) {
      res.status(404).json({ error: 'Nenhuma leitura válida encontrada.' });
      return;
    }

    res.json(reading);
  } catch {
    res.status(500).json({ error: 'Erro ao obter última leitura.' });
  }
}
