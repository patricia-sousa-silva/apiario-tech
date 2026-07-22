import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';

const apiarySchema = z.object({
  name: z.string().min(1, 'Nome obrigatório.'),
  location: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  notes: z.string().optional(),
});

export async function list(req: Request, res: Response): Promise<void> {
  try {
    const apiaries = await prisma.apiary.findMany({
      where: { userId: req.user!.userId },
      include: { hives: { where: { active: true } } },
      orderBy: { name: 'asc' },
    });
    res.json(apiaries);
  } catch {
    res.status(500).json({ error: 'Erro ao listar apiários.' });
  }
}

export async function getById(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const apiary = await prisma.apiary.findFirst({
      where: { id, userId: req.user!.userId },
      include: { hives: true },
    });

    if (!apiary) {
      res.status(404).json({ error: 'Apiário não encontrado.' });
      return;
    }

    res.json(apiary);
  } catch {
    res.status(500).json({ error: 'Erro ao obter apiário.' });
  }
}

export async function create(req: Request, res: Response): Promise<void> {
  try {
    const data = apiarySchema.parse(req.body);

    const apiary = await prisma.apiary.create({
      data: { ...data, userId: req.user!.userId },
    });

    res.status(201).json(apiary);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.issues[0].message });
      return;
    }
    res.status(500).json({ error: 'Erro ao criar apiário.' });
  }
}

export async function update(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const data = apiarySchema.partial().parse(req.body);

    const apiary = await prisma.apiary.findFirst({
      where: { id, userId: req.user!.userId },
    });

    if (!apiary) {
      res.status(404).json({ error: 'Apiário não encontrado.' });
      return;
    }

    const updated = await prisma.apiary.update({
      where: { id },
      data,
    });

    res.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.issues[0].message });
      return;
    }
    res.status(500).json({ error: 'Erro ao atualizar apiário.' });
  }
}

export async function remove(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const apiary = await prisma.apiary.findFirst({
      where: { id, userId: req.user!.userId },
    });

    if (!apiary) {
      res.status(404).json({ error: 'Apiário não encontrado.' });
      return;
    }

    await prisma.apiary.delete({ where: { id } });
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Erro ao eliminar apiário.' });
  }
}
