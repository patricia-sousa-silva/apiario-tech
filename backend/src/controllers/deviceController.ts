import { Request, Response } from 'express';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import prisma from '../lib/prisma.js';

/** Gera uma chave de API única para o dispositivo (prefixo `atk_`). */
function generateApiKey(): string {
  return `atk_${randomBytes(24).toString('hex')}`;
}

const deviceSchema = z.object({
  deviceId: z.string().min(1, 'Identificador do dispositivo obrigatório.'),
  model: z.string().optional(),
  firmwareVer: z.string().optional(),
  hiveId: z.string().uuid().optional().nullable(),
  active: z.boolean().optional(),
});

export async function list(req: Request, res: Response): Promise<void> {
  try {
    const devices = await prisma.device.findMany({
      include: { hive: { select: { id: true, name: true, apiary: { select: { name: true } } } } },
      orderBy: { deviceId: 'asc' },
    });
    res.json(devices);
  } catch {
    res.status(500).json({ error: 'Erro ao listar dispositivos.' });
  }
}

export async function create(req: Request, res: Response): Promise<void> {
  try {
    const data = deviceSchema.parse(req.body);

    const existing = await prisma.device.findUnique({
      where: { deviceId: data.deviceId },
    });

    if (existing) {
      res.status(409).json({ error: 'Já existe um dispositivo com este identificador.' });
      return;
    }

    const device = await prisma.device.create({
      data: { ...data, apiKey: generateApiKey() },
    });
    res.status(201).json(device);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.issues[0].message });
      return;
    }
    res.status(500).json({ error: 'Erro ao criar dispositivo.' });
  }
}

export async function update(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const data = deviceSchema.partial().parse(req.body);

    const device = await prisma.device.findUnique({
      where: { id },
    });

    if (!device) {
      res.status(404).json({ error: 'Dispositivo não encontrado.' });
      return;
    }

    const updated = await prisma.device.update({
      where: { id },
      data,
    });

    res.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.issues[0].message });
      return;
    }
    res.status(500).json({ error: 'Erro ao atualizar dispositivo.' });
  }
}

export async function remove(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const device = await prisma.device.findUnique({
      where: { id },
    });

    if (!device) {
      res.status(404).json({ error: 'Dispositivo não encontrado.' });
      return;
    }

    await prisma.device.delete({ where: { id } });
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Erro ao eliminar dispositivo.' });
  }
}

/**
 * Regenera a chave de API de um dispositivo e devolve a nova chave.
 * A chave anterior deixa de funcionar imediatamente.
 */
export async function regenerateKey(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const device = await prisma.device.findUnique({ where: { id } });

    if (!device) {
      res.status(404).json({ error: 'Dispositivo não encontrado.' });
      return;
    }

    const apiKey = generateApiKey();
    await prisma.device.update({ where: { id }, data: { apiKey } });

    res.json({ deviceId: device.deviceId, apiKey });
  } catch {
    res.status(500).json({ error: 'Erro ao regenerar chave.' });
  }
}
