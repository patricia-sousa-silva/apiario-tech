#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BME280.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <OneWire.h>
#include <DallasTemperature.h>

// -------------------- PINOS --------------------

#define SDA_PIN 21
#define SCL_PIN 22

#define ONE_WIRE_BUS 4   // As duas DS18B20 ficam no GPIO 4

// -------------------- OLED --------------------

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// -------------------- BME280 --------------------

Adafruit_BME280 bme;

// -------------------- DS18B20 --------------------

OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sondasNinho(&oneWire);

// -------------------- ALERTAS --------------------

// Valores iniciais para teste.
// Depois podes ajustar conforme observares a tua colmeia.
const float TEMP_NINHO_MIN = 32.0;
const float TEMP_NINHO_MAX = 36.5;

// -------------------- VARIÁVEIS --------------------

float tempExterior = 0.0;
float humidade = 0.0;
float pressao = 0.0;

float tempNinho1 = DEVICE_DISCONNECTED_C;
float tempNinho2 = DEVICE_DISCONNECTED_C;

int totalSondas = 0;

unsigned long ultimaLeitura = 0;
const unsigned long intervaloLeitura = 2000; // 2 segundos para teste

// -------------------- SETUP --------------------

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println();
  Serial.println("A iniciar Apiario Tech...");

  Wire.begin(SDA_PIN, SCL_PIN);

  iniciarOLED();
  iniciarBME280();
  iniciarSondas();

  display.clearDisplay();
  display.setCursor(0, 0);
  display.println("Apiario Tech");
  display.println("Sistema iniciado");
  display.display();

  delay(1500);
}

// -------------------- LOOP --------------------

void loop() {
  unsigned long agora = millis();

  if (agora - ultimaLeitura >= intervaloLeitura) {
    ultimaLeitura = agora;

    lerSensores();
    mostrarSerial();
    mostrarOLED();
  }
}

// -------------------- INICIALIZAÇÕES --------------------

void iniciarOLED() {
  Serial.println("A iniciar OLED...");

  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println("ERRO: OLED nao encontrado.");
    while (1);
  }

  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.println("Apiario Tech");
  display.println("A iniciar OLED...");
  display.display();

  delay(500);

  Serial.println("OLED OK.");
}

void iniciarBME280() {
  Serial.println("A iniciar BME280...");

  if (bme.begin(0x76)) {
    Serial.println("BME280 encontrado em 0x76.");
  } 
  else if (bme.begin(0x77)) {
    Serial.println("BME280 encontrado em 0x77.");
  } 
  else {
    Serial.println("ERRO: BME280 nao encontrado.");

    display.clearDisplay();
    display.setCursor(0, 0);
    display.println("Erro BME280");
    display.display();

    while (1);
  }

  bme.setSampling(
    Adafruit_BME280::MODE_FORCED,
    Adafruit_BME280::SAMPLING_X1,
    Adafruit_BME280::SAMPLING_X1,
    Adafruit_BME280::SAMPLING_X1,
    Adafruit_BME280::FILTER_OFF
  );
}

void iniciarSondas() {
  Serial.println("A iniciar sondas DS18B20...");

  sondasNinho.begin();

  totalSondas = sondasNinho.getDeviceCount();

  Serial.print("Sondas DS18B20 encontradas: ");
  Serial.println(totalSondas);

  if (totalSondas < 2) {
    Serial.println("AVISO: foram encontradas menos de 2 sondas.");
  }
}

// -------------------- LEITURA DOS SENSORES --------------------

void lerSensores() {
  // BME280
  bme.takeForcedMeasurement();

  tempExterior = bme.readTemperature();
  humidade = bme.readHumidity();
  pressao = bme.readPressure() / 100.0F;

  // DS18B20
  totalSondas = sondasNinho.getDeviceCount();

  sondasNinho.requestTemperatures();

  if (totalSondas >= 1) {
    tempNinho1 = sondasNinho.getTempCByIndex(0);
  } else {
    tempNinho1 = DEVICE_DISCONNECTED_C;
  }

  if (totalSondas >= 2) {
    tempNinho2 = sondasNinho.getTempCByIndex(1);
  } else {
    tempNinho2 = DEVICE_DISCONNECTED_C;
  }
}

// -------------------- ALERTAS --------------------

String estadoTemperatura(float temp) {
  if (temp == DEVICE_DISCONNECTED_C || temp == -127.00) {
    return "ERRO";
  }

  if (temp < TEMP_NINHO_MIN) {
    return "FRIO";
  }

  if (temp > TEMP_NINHO_MAX) {
    return "CALOR";
  }

  return "OK";
}

bool temAlerta(float temp) {
  String estado = estadoTemperatura(temp);
  return estado != "OK";
}

// -------------------- SERIAL MONITOR --------------------

void mostrarSerial() {
  Serial.println("-------------------------");

  Serial.print("Sondas encontradas: ");
  Serial.println(totalSondas);

  Serial.print("Temperatura exterior BME280: ");
  Serial.print(tempExterior, 2);
  Serial.println(" C");

  Serial.print("Humidade BME280: ");
  Serial.print(humidade, 2);
  Serial.println(" %");

  Serial.print("Pressao BME280: ");
  Serial.print(pressao, 2);
  Serial.println(" hPa");

  Serial.print("Ninho 1: ");
  if (tempNinho1 == DEVICE_DISCONNECTED_C) {
    Serial.println("ERRO");
  } else {
    Serial.print(tempNinho1, 2);
    Serial.print(" C - ");
    Serial.println(estadoTemperatura(tempNinho1));
  }

  Serial.print("Ninho 2: ");
  if (tempNinho2 == DEVICE_DISCONNECTED_C) {
    Serial.println("ERRO");
  } else {
    Serial.print(tempNinho2, 2);
    Serial.print(" C - ");
    Serial.println(estadoTemperatura(tempNinho2));
  }

  if (temAlerta(tempNinho1) || temAlerta(tempNinho2)) {
    Serial.println("!!! ALERTA DE TEMPERATURA NO NINHO !!!");
  }
}

// -------------------- OLED --------------------

void mostrarOLED() {
  String estado1 = estadoTemperatura(tempNinho1);
  String estado2 = estadoTemperatura(tempNinho2);

  bool alerta = (estado1 != "OK" || estado2 != "OK");

  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);

  // Faixa superior amarela do OLED
  display.setCursor(0, 0);
  if (alerta) {
    display.print("ALERTA APIARIO");
  } else {
    display.print("APIARIO TECH");
  }

  // Parte azul do OLED, comecando abaixo da faixa amarela
  display.setCursor(0, 17);
  display.print("Ext:");
  display.print(tempExterior, 1);
  display.print("C  H:");
  display.print(humidade, 0);
  display.print("%");

  display.setCursor(0, 29);
  display.print("P:");
  display.print(pressao, 0);
  display.print(" hPa");

  display.setCursor(0, 41);
  display.print("N1:");
  if (estado1 == "ERRO") {
    display.print("Erro");
  } else {
    display.print(tempNinho1, 1);
    display.print("C ");
    display.print(estado1);
  }

  display.setCursor(0, 53);
  display.print("N2:");
  if (estado2 == "ERRO") {
    display.print("Erro");
  } else {
    display.print(tempNinho2, 1);
    display.print("C ");
    display.print(estado2);
  }

  display.display();
}