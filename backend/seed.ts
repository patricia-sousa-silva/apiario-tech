import { PrismaClient } from './src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('A semear base de dados...');

  // Utilizador de teste
  const passwordHash = await bcrypt.hash('password123', 10);

  const user = await prisma.user.upsert({
    where: { email: 'patricia@apiariotech.pt' },
    update: {},
    create: {
      email: 'patricia@apiariotech.pt',
      passwordHash,
      name: 'Patrícia Silva',
      role: 'ADMIN',
    },
  });

  console.log(`Utilizador criado: ${user.email}`);

  // Apiário
  const apiary = await prisma.apiary.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Apiário Principal',
      location: 'Terreno familiar',
      userId: user.id,
    },
  });

  console.log(`Apiário criado: ${apiary.name}`);

  // Colmeias
  const hive1 = await prisma.hive.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      name: 'Colmeia 1',
      apiaryId: apiary.id,
      position: 'Esquerda',
    },
  });

  const hive2 = await prisma.hive.upsert({
    where: { id: '00000000-0000-0000-0000-000000000003' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000003',
      name: 'Colmeia 2',
      apiaryId: apiary.id,
      position: 'Direita',
    },
  });

  console.log(`Colmeias criadas: ${hive1.name}, ${hive2.name}`);

  // Dispositivo ESP32
  const device = await prisma.device.upsert({
    where: { deviceId: 'ESP32-001' },
    update: {},
    create: {
      deviceId: 'ESP32-001',
      model: 'ESP32 DevKit V1',
      firmwareVer: '0.1.0',
      hiveId: hive1.id,
    },
  });

  console.log(`Dispositivo criado: ${device.deviceId}`);

  // Leituras de exemplo
  const now = new Date();
  const readings = [];

  for (let i = 24; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000); // a cada hora
    readings.push({
      deviceId: 'ESP32-001',
      hiveId: hive1.id,
      timestamp,
      tempExtC: 22 + Math.random() * 6,
      humidityPct: 55 + Math.random() * 15,
      pressureHpa: 1013 + Math.random() * 4,
      tempNest1C: 33 + Math.random() * 3,
      tempNest2C: 33.5 + Math.random() * 3,
      weightG: Math.round(42000 + Math.random() * 500),
      batteryMv: Math.round(12200 + Math.random() * 300),
      statusFlags: 'OK',
      valid: true,
    });
  }

  for (const reading of readings) {
    await prisma.telemetryReading.upsert({
      where: {
        deviceId_timestamp: {
          deviceId: reading.deviceId,
          timestamp: reading.timestamp,
        },
      },
      update: {},
      create: reading,
    });
  }

  console.log(`${readings.length} leituras de exemplo criadas.`);

  // Regra de alerta de exemplo
  await prisma.alertRule.upsert({
    where: { id: '00000000-0000-0000-0000-000000000004' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000004',
      name: 'Temperatura ninho alta',
      metric: 'TEMP_NEST1',
      operator: 'GT',
      threshold: 38,
      active: true,
    },
  });

  console.log('Regra de alerta criada.');

  // Intervenção de exemplo
  await prisma.intervention.create({
    data: {
      hiveId: hive1.id,
      type: 'INSPECTION',
      date: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      notes: 'Inspeção semanal. Colónia forte, postura regular.',
    },
  });

  console.log('Intervenção de exemplo criada.');
  console.log('Seed concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error('Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
