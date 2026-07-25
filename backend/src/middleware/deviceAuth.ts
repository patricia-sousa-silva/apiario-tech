import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';

/**
 * Dados do dispositivo autenticado, anexados ao pedido pelo middleware.
 */
export interface DevicePayload {
  id: string;
  deviceId: string;
  hiveId: string | null;
}

declare global {
  namespace Express {
    interface Request {
      device?: DevicePayload;
    }
  }
}

/**
 * Autentica um dispositivo (ESP32) através da chave enviada no cabeçalho
 * `X-Device-Key`. Também aceita `Authorization: Bearer <chave>` como
 * alternativa, para clientes que prefiram o cabeçalho padrão.
 */
export async function authenticateDevice(req: Request, res: Response, next: NextFunction): Promise<void> {
  const key =
    (req.headers['x-device-key'] as string | undefined) ??
    (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : undefined);

  if (!key) {
    res.status(401).json({ error: 'Chave de dispositivo em falta (cabeçalho X-Device-Key).' });
    return;
  }

  try {
    const device = await prisma.device.findUnique({
      where: { apiKey: key },
      select: { id: true, deviceId: true, hiveId: true, active: true },
    });

    if (!device) {
      res.status(401).json({ error: 'Chave de dispositivo inválida.' });
      return;
    }

    if (!device.active) {
      res.status(403).json({ error: 'Dispositivo inativo.' });
      return;
    }

    req.device = { id: device.id, deviceId: device.deviceId, hiveId: device.hiveId };
    next();
  } catch {
    res.status(500).json({ error: 'Erro ao autenticar dispositivo.' });
  }
}
