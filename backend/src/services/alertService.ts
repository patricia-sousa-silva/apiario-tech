import prisma from '../lib/prisma.js';

/**
 * Valores de uma leitura relevantes para a avaliação de regras de alerta.
 */
export interface ReadingValues {
  id: string;
  hiveId: string | null;
  tempExtC: number | null;
  humidityPct: number | null;
  pressureHpa: number | null;
  tempNest1C: number | null;
  tempNest2C: number | null;
  weightG: number | null;
  batteryMv: number | null;
}

type Metric = 'TEMP_EXT' | 'TEMP_NEST1' | 'TEMP_NEST2' | 'HUMIDITY' | 'PRESSURE' | 'WEIGHT' | 'BATTERY';
type Operator = 'GT' | 'LT' | 'GTE' | 'LTE';

const METRIC_INFO: Record<Metric, { field: keyof Omit<ReadingValues, 'id' | 'hiveId'>; label: string; unit: string }> = {
  TEMP_EXT: { field: 'tempExtC', label: 'Temp. exterior', unit: '°C' },
  TEMP_NEST1: { field: 'tempNest1C', label: 'Temp. ninho 1', unit: '°C' },
  TEMP_NEST2: { field: 'tempNest2C', label: 'Temp. ninho 2', unit: '°C' },
  HUMIDITY: { field: 'humidityPct', label: 'Humidade', unit: '%' },
  PRESSURE: { field: 'pressureHpa', label: 'Pressão', unit: 'hPa' },
  WEIGHT: { field: 'weightG', label: 'Peso', unit: 'g' },
  BATTERY: { field: 'batteryMv', label: 'Bateria', unit: 'mV' },
};

const OPERATOR_SYMBOL: Record<Operator, string> = {
  GT: '>',
  LT: '<',
  GTE: '≥',
  LTE: '≤',
};

function violates(value: number, operator: Operator, threshold: number): boolean {
  switch (operator) {
    case 'GT': return value > threshold;
    case 'LT': return value < threshold;
    case 'GTE': return value >= threshold;
    case 'LTE': return value <= threshold;
  }
}

/**
 * Avalia as regras de alerta ativas contra uma leitura acabada de registar e
 * cria os alertas correspondentes.
 *
 * Para evitar spam, não é criado um novo alerta enquanto existir um alerta
 * não reconhecido da mesma regra para a mesma colmeia.
 *
 * @returns número de alertas criados
 */
export async function evaluateReading(reading: ReadingValues): Promise<number> {
  const rules = await prisma.alertRule.findMany({ where: { active: true } });
  if (rules.length === 0) return 0;

  let created = 0;

  for (const rule of rules) {
    const info = METRIC_INFO[rule.metric as Metric];
    if (!info) continue;

    const value = reading[info.field];
    if (value === null || value === undefined) continue;

    if (!violates(value, rule.operator as Operator, rule.threshold)) continue;

    // Deduplicação: já existe alerta ativo desta regra para esta colmeia?
    const existing = await prisma.alert.findFirst({
      where: {
        ruleId: rule.id,
        hiveId: reading.hiveId,
        acknowledged: false,
      },
      select: { id: true },
    });
    if (existing) continue;

    const formatted = Number.isInteger(value) ? value.toString() : value.toFixed(1);
    const message = `${info.label} = ${formatted} ${info.unit} — regra "${rule.name}" (${OPERATOR_SYMBOL[rule.operator as Operator]} ${rule.threshold} ${info.unit})`;

    await prisma.alert.create({
      data: {
        ruleId: rule.id,
        hiveId: reading.hiveId,
        readingId: reading.id,
        message,
        value,
      },
    });
    created++;
  }

  return created;
}
