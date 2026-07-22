import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';

const interventionSchema = z.object({
  hiveId: z.string().uuid('Colmeia inválida.'),
  type: z.enum(['INSPECTION', 'FEEDING', 'TREATMENT', 'HARVEST', 'OBSERVATION', 'MAINTENANCE']),
  date: z.string().datetime('Data inválida. Use formato ISO 8601.'),
  notes: z.string().optional(),
});

export async function list(req: Request, res: Response): Promise<void> {
  try {
    const { hiveId, type, from, to } = req.query;

    const where: Record<string, unknown> = {
      hive: { apiary: { userId: req.user!.userId } },
    };

    if (hiveId) where.hiveId = hiveId as string;
    if (type) where.type = type as string;

    if (from || to) {
      where.date = {};
      if (from) (where.date as Record<string, unknown>).gte = new Date(from as string);
      if (to) (where.date as Record<string, unknown>).lte = new Date(to as string);
    }

    const interventions = await prisma.intervention.findMany({
      where,
      include: { hive: { select: { name: true, apiary: { select: { name: true } } } } },
      orderBy: { date: 'desc' },
    });

    res.json(interventions);
  } catch {
    res.status(500).json({ error: 'Erro ao listar intervenções.' });
  }
}

export async function create(req: Request, res: Response): Promise<void> {
  try {
    const data = interventionSchema.parse(req.body);

    // Verificar que a colmeia pertence ao utilizador
    const hive = await prisma.hive.findFirst({
      where: { id: data.hiveId, apiary: { userId: req.user!.userId } },
    });

    if (!hive) {
      res.status(404).json({ error: 'Colmeia não encontrada.' });
      return;
    }

    const intervention = await prisma.intervention.create({
      data: {
        hiveId: data.hiveId,
        type: data.type,
        date: new Date(data.date),
        notes: data.notes,
      },
    });

    res.status(201).json(intervention);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.issues[0].message });
      return;
    }
    res.status(500).json({ error: 'Erro ao criar intervenção.' });
  }
}

export async function update(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const data = interventionSchema.partial().parse(req.body);

    const intervention = await prisma.intervention.findFirst({
      where: { id, hive: { apiary: { userId: req.user!.userId } } },
    });

    if (!intervention) {
      res.status(404).json({ error: 'Intervenção não encontrada.' });
      return;
    }

    const updated = await prisma.intervention.update({
      where: { id },
      data: {
        ...data,
        date: data.date ? new Date(data.date) : undefined,
      },
    });

    res.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.issues[0].message });
      return;
    }
    res.status(500).json({ error: 'Erro ao atualizar intervenção.' });
  }
}

export async function remove(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const intervention = await prisma.intervention.findFirst({
      where: { id, hive: { apiary: { userId: req.user!.userId } } },
    });

    if (!intervention) {
      res.status(404).json({ error: 'Intervenção não encontrada.' });
      return;
    }

    await prisma.intervention.delete({ where: { id } });
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Erro ao eliminar intervenção.' });
  }
}
