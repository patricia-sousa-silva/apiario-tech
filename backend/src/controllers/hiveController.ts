import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';

const hiveSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório.'),
  apiaryId: z.string().uuid('Apiário inválido.'),
  position: z.string().optional(),
  notes: z.string().optional(),
  active: z.boolean().optional(),
});

export async function list(req: Request, res: Response): Promise<void> {
  try {
    const { apiaryId } = req.query;

    const hives = await prisma.hive.findMany({
      where: {
        apiary: { userId: req.user!.userId },
        ...(apiaryId ? { apiaryId: apiaryId as string } : {}),
      },
      include: { apiary: { select: { name: true } } },
      orderBy: { name: 'asc' },
    });

    res.json(hives);
  } catch {
    res.status(500).json({ error: 'Erro ao listar colmeias.' });
  }
}

export async function getById(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const hive = await prisma.hive.findFirst({
      where: { id, apiary: { userId: req.user!.userId } },
      include: { apiary: true, devices: true },
    });

    if (!hive) {
      res.status(404).json({ error: 'Colmeia não encontrada.' });
      return;
    }

    res.json(hive);
  } catch {
    res.status(500).json({ error: 'Erro ao obter colmeia.' });
  }
}

export async function create(req: Request, res: Response): Promise<void> {
  try {
    const data = hiveSchema.parse(req.body);

    // Verificar que o apiário pertence ao utilizador
    const apiary = await prisma.apiary.findFirst({
      where: { id: data.apiaryId, userId: req.user!.userId },
    });

    if (!apiary) {
      res.status(404).json({ error: 'Apiário não encontrado.' });
      return;
    }

    const hive = await prisma.hive.create({ data });
    res.status(201).json(hive);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.issues[0].message });
      return;
    }
    res.status(500).json({ error: 'Erro ao criar colmeia.' });
  }
}

export async function update(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const data = hiveSchema.partial().parse(req.body);

    const hive = await prisma.hive.findFirst({
      where: { id, apiary: { userId: req.user!.userId } },
    });

    if (!hive) {
      res.status(404).json({ error: 'Colmeia não encontrada.' });
      return;
    }

    const updated = await prisma.hive.update({
      where: { id },
      data,
    });

    res.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.issues[0].message });
      return;
    }
    res.status(500).json({ error: 'Erro ao atualizar colmeia.' });
  }
}

export async function remove(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const hive = await prisma.hive.findFirst({
      where: { id, apiary: { userId: req.user!.userId } },
    });

    if (!hive) {
      res.status(404).json({ error: 'Colmeia não encontrada.' });
      return;
    }

    await prisma.hive.delete({ where: { id } });
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Erro ao eliminar colmeia.' });
  }
}
