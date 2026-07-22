import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';

const alertRuleSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório.'),
  metric: z.enum(['TEMP_EXT', 'TEMP_NEST1', 'TEMP_NEST2', 'HUMIDITY', 'PRESSURE', 'WEIGHT', 'BATTERY']),
  operator: z.enum(['GT', 'LT', 'GTE', 'LTE']),
  threshold: z.number(),
  active: z.boolean().optional(),
});

// --- Alert Rules ---

export async function listRules(req: Request, res: Response): Promise<void> {
  try {
    const rules = await prisma.alertRule.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(rules);
  } catch {
    res.status(500).json({ error: 'Erro ao listar regras de alerta.' });
  }
}

export async function createRule(req: Request, res: Response): Promise<void> {
  try {
    const data = alertRuleSchema.parse(req.body);
    const rule = await prisma.alertRule.create({ data });
    res.status(201).json(rule);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.issues[0].message });
      return;
    }
    res.status(500).json({ error: 'Erro ao criar regra.' });
  }
}

export async function updateRule(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const data = alertRuleSchema.partial().parse(req.body);

    const rule = await prisma.alertRule.findUnique({ where: { id } });
    if (!rule) {
      res.status(404).json({ error: 'Regra não encontrada.' });
      return;
    }

    const updated = await prisma.alertRule.update({
      where: { id },
      data,
    });
    res.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.issues[0].message });
      return;
    }
    res.status(500).json({ error: 'Erro ao atualizar regra.' });
  }
}

export async function deleteRule(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const rule = await prisma.alertRule.findUnique({ where: { id } });
    if (!rule) {
      res.status(404).json({ error: 'Regra não encontrada.' });
      return;
    }

    await prisma.alertRule.delete({ where: { id } });
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Erro ao eliminar regra.' });
  }
}

// --- Alerts ---

export async function listAlerts(req: Request, res: Response): Promise<void> {
  try {
    const { hiveId, acknowledged } = req.query;

    const where: Record<string, unknown> = {};
    if (hiveId) where.hiveId = hiveId as string;
    if (acknowledged !== undefined) where.acknowledged = acknowledged === 'true';

    const alerts = await prisma.alert.findMany({
      where,
      include: { rule: { select: { name: true, metric: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json(alerts);
  } catch {
    res.status(500).json({ error: 'Erro ao listar alertas.' });
  }
}

export async function acknowledgeAlert(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const alert = await prisma.alert.findUnique({ where: { id } });
    if (!alert) {
      res.status(404).json({ error: 'Alerta não encontrado.' });
      return;
    }

    const updated = await prisma.alert.update({
      where: { id },
      data: { acknowledged: true },
    });
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Erro ao reconhecer alerta.' });
  }
}
