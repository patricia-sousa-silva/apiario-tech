import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.js';
import * as auth from '../controllers/authController.js';
import * as apiary from '../controllers/apiaryController.js';
import * as hive from '../controllers/hiveController.js';
import * as device from '../controllers/deviceController.js';
import * as telemetry from '../controllers/telemetryController.js';
import * as alert from '../controllers/alertController.js';
import * as intervention from '../controllers/interventionController.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// --- Health check (público) ---
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: Math.round(process.uptime()) });
});

// --- Autenticação (público) ---
router.post('/auth/register', auth.register);
router.post('/auth/login', auth.login);

// --- Apiários ---
router.get('/apiaries', authenticate, apiary.list);
router.get('/apiaries/:id', authenticate, apiary.getById);
router.post('/apiaries', authenticate, apiary.create);
router.put('/apiaries/:id', authenticate, apiary.update);
router.delete('/apiaries/:id', authenticate, apiary.remove);

// --- Colmeias ---
router.get('/hives', authenticate, hive.list);
router.get('/hives/:id', authenticate, hive.getById);
router.post('/hives', authenticate, hive.create);
router.put('/hives/:id', authenticate, hive.update);
router.delete('/hives/:id', authenticate, hive.remove);

// --- Dispositivos ---
router.get('/devices', authenticate, device.list);
router.post('/devices', authenticate, device.create);
router.put('/devices/:id', authenticate, device.update);
router.delete('/devices/:id', authenticate, device.remove);

// --- Telemetria ---
router.post('/telemetry/import', authenticate, upload.single('file'), telemetry.importCsv);
router.get('/telemetry', authenticate, telemetry.list);
router.get('/telemetry/latest', authenticate, telemetry.latest);

// --- Alertas ---
router.get('/alert-rules', authenticate, alert.listRules);
router.post('/alert-rules', authenticate, alert.createRule);
router.put('/alert-rules/:id', authenticate, alert.updateRule);
router.delete('/alert-rules/:id', authenticate, alert.deleteRule);
router.get('/alerts', authenticate, alert.listAlerts);
router.patch('/alerts/:id/acknowledge', authenticate, alert.acknowledgeAlert);

// --- Intervenções ---
router.get('/interventions', authenticate, intervention.list);
router.post('/interventions', authenticate, intervention.create);
router.put('/interventions/:id', authenticate, intervention.update);
router.delete('/interventions/:id', authenticate, intervention.remove);

export default router;
