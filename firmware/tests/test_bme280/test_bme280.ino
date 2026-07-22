/*
 * Apiário Tech — Teste BME280
 * 
 * Objetivo: Validar leitura de temperatura, humidade e pressão.
 * Critério: Valores devem variar quando o ambiente muda (ex.: soprar no sensor).
 * 
 * Ligações:
 *   VCC → 3.3V
 *   GND → GND
 *   SDA → GPIO 21
 *   SCL → GPIO 22
 * 
 * Bibliotecas necessárias:
 *   - Adafruit BME280
 *   - Adafruit Sensor
 */

#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BME280.h>

#define SDA_PIN 21
#define SCL_PIN 22

Adafruit_BME280 bme;
bool bmeOK = false;

// Valores anteriores para detetar leitura congelada
float ultimaTemp = -999.0;
float ultimaHum = -999.0;
int leiturasIguais = 0;

void setup() {
  Serial.begin(115200);
  delay(2000);

  Serial.println();
  Serial.println("================================");
  Serial.println("TESTE BME280 — Apiário Tech");
  Serial.println("================================");
  Serial.println();

  Wire.begin(SDA_PIN, SCL_PIN);
  delay(500);

  Serial.println("A iniciar BME280...");
  bmeOK = bme.begin(0x76);  // Endereço comum: 0x76 ou 0x77

  if (!bmeOK) {
    // Tentar endereço alternativo
    bmeOK = bme.begin(0x77);
  }

  if (bmeOK) {
    Serial.println("✓ BME280 encontrado e iniciado.");
    Serial.println();
    Serial.println("Aguardando 2 segundos entre leituras...");
    Serial.println("Sopre no sensor para verificar variação.");
    Serial.println("----------------------------------------");
  } else {
    Serial.println("✗ ERRO: BME280 não encontrado!");
    Serial.println("  Verifique:");
    Serial.println("  - Ligações VCC, GND, SDA, SCL");
    Serial.println("  - Endereço I2C (0x76 ou 0x77)");
    Serial.println("  - Se o módulo está danificado");
    Serial.println();
    Serial.println("A executar scanner I2C...");
    scannerI2C();
  }
}

void loop() {
  if (!bmeOK) {
    delay(5000);
    return;
  }

  float temp = bme.readTemperature();
  float hum = bme.readHumidity();
  float press = bme.readPressure() / 100.0;  // Converter Pa para hPa

  // Verificar valores válidos
  if (isnan(temp) || isnan(hum) || isnan(press)) {
    Serial.println("✗ ERRO: Leitura inválida (NaN)");
    delay(2000);
    return;
  }

  // Deteção de leitura congelada
  if (temp == ultimaTemp && hum == ultimaHum) {
    leiturasIguais++;
    if (leiturasIguais == 10) {
      Serial.println("⚠ AVISO: 10 leituras consecutivas iguais.");
      Serial.println("  Possível leitura congelada ou ambiente muito estável.");
    }
  } else {
    leiturasIguais = 0;
  }

  ultimaTemp = temp;
  ultimaHum = hum;

  // Apresentar leitura
  Serial.print("Temp: ");
  Serial.print(temp, 2);
  Serial.print(" °C | Hum: ");
  Serial.print(hum, 2);
  Serial.print(" % | Press: ");
  Serial.print(press, 1);
  Serial.println(" hPa");

  delay(2000);
}

void scannerI2C() {
  Serial.println();
  Serial.println("A procurar dispositivos I2C...");

  int encontrados = 0;

  for (byte endereco = 1; endereco < 127; endereco++) {
    Wire.beginTransmission(endereco);
    byte erro = Wire.endTransmission();

    if (erro == 0) {
      Serial.print("Dispositivo encontrado em 0x");
      if (endereco < 16) Serial.print("0");
      Serial.println(endereco, HEX);
      encontrados++;
    }
  }

  if (encontrados == 0) {
    Serial.println("Nenhum dispositivo I2C encontrado.");
  }

  Serial.println("----------------------------------------");
}
