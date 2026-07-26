/*
 * Apiário Tech — Implementação da leitura dos sensores.
 */

#include "sensors.h"
#include "config.h"

#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BME280.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include "HX711.h"

// -----------------------------------------------------
// Instâncias
// -----------------------------------------------------

static Adafruit_BME280 bme;
static OneWire oneWire(ONE_WIRE_BUS);
static DallasTemperature sondas(&oneWire);
static HX711 balanca;

// Endereços físicos das sondas (quando SONDAS_POR_ENDERECO = 1).
#if SONDAS_POR_ENDERECO
static DeviceAddress addrSonda1;
static DeviceAddress addrSonda2;
#endif

// Últimos valores do BME280 para deteção de leitura congelada.
static float bmeLastTemp = NAN;
static float bmeLastHum = NAN;
static float bmeLastPres = NAN;

// -----------------------------------------------------
// Inicialização
// -----------------------------------------------------

static void beginBme280(SensorHealth& h) {
  Serial.println("[sensores] A iniciar BME280...");
  h.bme280 = false;

  for (int tentativa = 1; tentativa <= 3 && !h.bme280; tentativa++) {
    if (bme.begin(0x76) || bme.begin(0x77)) {
      h.bme280 = true;
    } else {
      delay(200);
    }
  }

  if (!h.bme280) {
    Serial.println("[sensores] ERRO: BME280 nao encontrado.");
    return;
  }

  // Modo forçado: baixa consumo, mede apenas quando pedido.
  bme.setSampling(Adafruit_BME280::MODE_FORCED,
                  Adafruit_BME280::SAMPLING_X1,
                  Adafruit_BME280::SAMPLING_X1,
                  Adafruit_BME280::SAMPLING_X1,
                  Adafruit_BME280::FILTER_OFF);
  Serial.println("[sensores] BME280 OK.");
}

static void beginDs18b20(SensorHealth& h) {
  Serial.println("[sensores] A iniciar sondas DS18B20...");
  sondas.begin();
  sondas.setWaitForConversion(true);
  h.ds18b20Count = sondas.getDeviceCount();

  Serial.print("[sensores] Sondas DS18B20 encontradas: ");
  Serial.println(h.ds18b20Count);

#if SONDAS_POR_ENDERECO
  memcpy(addrSonda1, ENDERECO_SONDA_1, 8);
  memcpy(addrSonda2, ENDERECO_SONDA_2, 8);
  Serial.println("[sensores] A usar enderecos fisicos configurados.");
#else
  if (h.ds18b20Count < 2) {
    Serial.println("[sensores] AVISO: menos de 2 sondas; a usar ordem do barramento.");
  }
#endif
}

static void beginHx711(SensorHealth& h) {
  Serial.println("[sensores] A iniciar HX711...");
  balanca.begin(HX711_DT, HX711_SCK);

  h.hx711Calibrated = (HX711_FATOR_ESCALA != 1.0f);
  h.hx711Ready = balanca.is_ready();

  if (h.hx711Ready && h.hx711Calibrated) {
    balanca.set_offset(HX711_TARA);
    balanca.set_scale(HX711_FATOR_ESCALA);
    Serial.println("[sensores] HX711 pronto e calibrado.");
  } else if (!h.hx711Calibrated) {
    Serial.println("[sensores] HX711 nao calibrado (peso ficara indisponivel).");
  } else {
    Serial.println("[sensores] AVISO: HX711 nao responde.");
  }
}

static void beginBattery() {
  analogSetAttenuation(ADC_11db);  // gama 0–3.3 V
  pinMode(BATTERY_ADC_PIN, INPUT);
}

void sensorsBegin(SensorHealth& h) {
  beginBme280(h);
  beginDs18b20(h);
  beginHx711(h);
  beginBattery();
}

// -----------------------------------------------------
// BME280
// -----------------------------------------------------

void sensorsReadBme280(Reading& r, const SensorHealth& h) {
  if (!h.bme280) {
    r.tempExtC = SENTINEL_F;
    r.humidityPct = SENTINEL_F;
    r.pressureHpa = SENTINEL_F;
    r.flags |= FLAG_BME280_FAIL;
    return;
  }

  bme.takeForcedMeasurement();
  float t = bme.readTemperature();
  float hum = bme.readHumidity();
  float pres = bme.readPressure() / 100.0f;

  // Leituras NaN indicam falha de comunicação.
  if (isnan(t) || isnan(hum) || isnan(pres)) {
    r.tempExtC = SENTINEL_F;
    r.humidityPct = SENTINEL_F;
    r.pressureHpa = SENTINEL_F;
    r.flags |= FLAG_BME280_FAIL;
    return;
  }

  r.tempExtC = t;
  r.humidityPct = hum;
  r.pressureHpa = pres;

  // Deteção de leitura congelada: valores exatamente iguais ao ciclo
  // anterior (o BME280 real tem sempre algum ruído).
  bool stale = (!isnan(bmeLastTemp)) &&
               (t == bmeLastTemp && hum == bmeLastHum && pres == bmeLastPres);
  if (stale) {
    r.flags |= FLAG_BME280_STALE;
  }

  bmeLastTemp = t;
  bmeLastHum = hum;
  bmeLastPres = pres;
}

// -----------------------------------------------------
// DS18B20
// -----------------------------------------------------

bool sensorsIsDs18b20Invalid(float tempC) {
  return tempC == DEVICE_DISCONNECTED_C || tempC == -127.0f || tempC == 85.0f;
}

void sensorsReadDs18b20(Reading& r, const SensorHealth& h) {
  r.tempNest1C = SENTINEL_F;
  r.tempNest2C = SENTINEL_F;

  if (h.ds18b20Count == 0) {
    r.flags |= FLAG_DS18B20_1_FAIL;
    r.flags |= FLAG_DS18B20_2_FAIL;
    return;
  }

  sondas.requestTemperatures();

#if SONDAS_POR_ENDERECO
  float t1 = sondas.getTempC(addrSonda1);
  float t2 = sondas.getTempC(addrSonda2);
#else
  float t1 = sondas.getTempCByIndex(0);
  float t2 = sondas.getTempCByIndex(1);
#endif

  if (!sensorsIsDs18b20Invalid(t1)) {
    r.tempNest1C = t1;
  } else {
    r.flags |= FLAG_DS18B20_1_FAIL;
  }

  if (!sensorsIsDs18b20Invalid(t2)) {
    r.tempNest2C = t2;
  } else {
    r.flags |= FLAG_DS18B20_2_FAIL;
  }
}

// -----------------------------------------------------
// HX711 (peso)
// -----------------------------------------------------

void sensorsReadWeight(Reading& r, const SensorHealth& h) {
  r.weightG = WEIGHT_UNAVAILABLE;

  // Sem calibração o peso é simplesmente omitido (não é uma falha).
  if (!h.hx711Calibrated) {
    return;
  }

  if (!balanca.is_ready()) {
    r.flags |= FLAG_HX711_FAIL;
    return;
  }

  float gramas = balanca.get_units(HX711_AMOSTRAS);

  // Rejeitar leituras fora do intervalo físico (contrato §6.1).
  if (isnan(gramas) || gramas < 0 || gramas > 200000) {
    r.flags |= FLAG_HX711_FAIL;
    return;
  }

  r.weightG = (long)gramas;
}

// -----------------------------------------------------
// Bateria
// -----------------------------------------------------

void sensorsReadBattery(Reading& r) {
  r.batteryMv = BATTERY_UNAVAILABLE;

  // Média de várias amostras para reduzir ruído.
  long soma = 0;
  const int n = 8;
  for (int i = 0; i < n; i++) {
    soma += analogRead(BATTERY_ADC_PIN);
    delayMicroseconds(100);
  }
  int raw = (int)(soma / n);

  // Sem divisor ligado (raw ~ 0) não há medição fiável.
  if (raw < 10) {
    return;
  }

  float mv = ((float)raw / 4095.0f) * 3300.0f * BATTERY_DIVIDER_FACTOR;
  r.batteryMv = (int)mv;

  if (r.batteryMv < BATTERY_LOW_MV) {
    r.flags |= FLAG_BATTERY_LOW;
  }
}
