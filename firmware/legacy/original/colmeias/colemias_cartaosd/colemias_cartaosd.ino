#include <Wire.h>
#include <SPI.h>
#include <SD.h>

#include <Adafruit_Sensor.h>
#include <Adafruit_BME280.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

#include <OneWire.h>
#include <DallasTemperature.h>

#include "RTClib.h"

// =====================================================
// PINOS
// =====================================================

// I2C: OLED + BME280 + RTC DS3231
#define SDA_PIN 21
#define SCL_PIN 22

// Barramento OneWire para as duas sondas DS18B20
#define ONE_WIRE_BUS 4

// Leitor microSD por SPI
#define SD_CS   27
#define SD_SCK  18
#define SD_MISO 19
#define SD_MOSI 23

// =====================================================
// OLED
// =====================================================

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1

Adafruit_SSD1306 display(
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  &Wire,
  OLED_RESET
);

// =====================================================
// MÓDULOS
// =====================================================

Adafruit_BME280 bme;
RTC_DS3231 rtc;

OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sondasNinho(&oneWire);

// =====================================================
// ESTADO DOS MÓDULOS
// =====================================================

bool oledOK = false;
bool bmeOK = false;
bool rtcOK = false;
bool sdOK = false;

// =====================================================
// VARIÁVEIS
// =====================================================

DateTime agora(2000, 1, 1, 0, 0, 0);

float tempExterior = 0.0;
float humidade = 0.0;
float pressao = 0.0;

float tempNinho1 = DEVICE_DISCONNECTED_C;
float tempNinho2 = DEVICE_DISCONNECTED_C;

int totalSondas = 0;

// Limites provisórios para alertas no ninho
const float TEMP_NINHO_MIN = 32.0;
const float TEMP_NINHO_MAX = 36.5;

unsigned long ultimaLeitura = 0;
unsigned long ultimaGravacaoSD = 0;

// OLED e Serial: atualização de 2 em 2 segundos
const unsigned long intervaloLeitura = 2000UL;

// Para teste: gravação de 10 em 10 segundos
// Depois muda para 300000UL para gravar de 5 em 5 minutos
const unsigned long intervaloGravacaoSD = 10000UL;

// =====================================================
// SETUP
// =====================================================

void setup() {
  Serial.begin(115200);
  delay(2000);

  Serial.println();
  Serial.println("================================");
  Serial.println("A iniciar Apiario Tech...");
  Serial.println("================================");

  Wire.begin(SDA_PIN, SCL_PIN);
  delay(500);

  scannerI2C();

  iniciarOLED();
  iniciarBME280();
  iniciarRTC();
  iniciarSondas();
  iniciarSD();

  mostrarResumoInicial();

  lerSensores();
  mostrarSerial();
  mostrarOLED();

  if (sdOK) {
    gravarDadosSD();
    ultimaGravacaoSD = millis();
  }
}

// =====================================================
// LOOP
// =====================================================

void loop() {
  unsigned long tempoAtual = millis();

  if (tempoAtual - ultimaLeitura >= intervaloLeitura) {
    ultimaLeitura = tempoAtual;

    lerSensores();
    mostrarSerial();
    mostrarOLED();
  }

  if (tempoAtual - ultimaGravacaoSD >= intervaloGravacaoSD) {
    ultimaGravacaoSD = tempoAtual;

    gravarDadosSD();
  }
}

// =====================================================
// SCANNER I2C
// =====================================================

void scannerI2C() {
  Serial.println();
  Serial.println("A procurar dispositivos I2C...");

  int encontrados = 0;

  for (byte endereco = 1; endereco < 127; endereco++) {
    Wire.beginTransmission(endereco);
    byte erro = Wire.endTransmission();

    if (erro == 0) {
      Serial.print("Dispositivo encontrado em 0x");

      if (endereco < 16) {
        Serial.print("0");
      }

      Serial.println(endereco, HEX);
      encontrados++;
    }
  }

  if (encontrados == 0) {
    Serial.println("Nenhum dispositivo I2C encontrado.");
  }

  Serial.println("-----------------------------");
}

// =====================================================
// INICIALIZAÇÃO
// =====================================================

void iniciarOLED() {
  Serial.println("A iniciar OLED...");

  oledOK = display.begin(SSD1306_SWITCHCAPVCC, 0x3C);

  if (oledOK) {
    Serial.println("OLED OK.");
  } else {
    Serial.println("ERRO: OLED nao encontrado.");
  }
}

void iniciarBME280() {
  Serial.println("A iniciar BME280...");

  bmeOK = false;

  for (int tentativa = 1; tentativa <= 5; tentativa++) {
    Serial.print("Tentativa BME280 ");
    Serial.print(tentativa);
    Serial.println(" de 5...");

    if (bme.begin(0x76)) {
      Serial.println("BME280 encontrado em 0x76.");
      bmeOK = true;
      break;
    }

    if (bme.begin(0x77)) {
      Serial.println("BME280 encontrado em 0x77.");
      bmeOK = true;
      break;
    }

    delay(500);
  }

  if (!bmeOK) {
    Serial.println("ERRO: BME280 nao encontrado.");
    return;
  }

  bme.setSampling(
    Adafruit_BME280::MODE_FORCED,
    Adafruit_BME280::SAMPLING_X1,
    Adafruit_BME280::SAMPLING_X1,
    Adafruit_BME280::SAMPLING_X1,
    Adafruit_BME280::FILTER_OFF
  );
}

void iniciarRTC() {
  Serial.println("A iniciar RTC DS3231...");

  rtcOK = false;

  for (int tentativa = 1; tentativa <= 5; tentativa++) {
    Serial.print("Tentativa RTC ");
    Serial.print(tentativa);
    Serial.println(" de 5...");

    if (rtc.begin()) {
      rtcOK = true;
      break;
    }

    delay(500);
  }

  if (!rtcOK) {
    Serial.println("ERRO: RTC DS3231 nao encontrado.");
    return;
  }

  Serial.println("RTC DS3231 encontrado.");

  if (rtc.lostPower()) {
    Serial.println("RTC perdeu energia. A acertar data/hora...");
    rtc.adjust(DateTime(F(__DATE__), F(__TIME__)));
  }

  agora = rtc.now();

  Serial.print("Hora atual do RTC: ");
  imprimirDataHoraSerial();
  Serial.println();
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

void iniciarSD() {
  Serial.println("A iniciar cartao microSD...");

  pinMode(SD_CS, OUTPUT);
  digitalWrite(SD_CS, HIGH);

  SPI.begin(SD_SCK, SD_MISO, SD_MOSI, SD_CS);

  // Frequência reduzida para melhorar estabilidade
  sdOK = SD.begin(SD_CS, SPI, 1000000);

  if (!sdOK) {
    Serial.println("ERRO: cartao microSD nao iniciou.");
    return;
  }

  Serial.println("Cartao microSD iniciado.");

  Serial.print("Tamanho aproximado: ");
  Serial.print(SD.cardSize() / (1024 * 1024));
  Serial.println(" MB");

  if (!SD.exists("/apiario.csv")) {
    File ficheiro = SD.open("/apiario.csv", FILE_WRITE);

    if (!ficheiro) {
      Serial.println("ERRO: nao consegui criar apiario.csv.");
      sdOK = false;
      return;
    }

    ficheiro.println(
      "data,hora,temp_ext_c,humidade_pct,pressao_hpa,"
      "temp_ninho1_c,temp_ninho2_c,estado_ninho1,estado_ninho2"
    );

    ficheiro.close();

    Serial.println("Ficheiro apiario.csv criado.");
  } else {
    Serial.println("Ficheiro apiario.csv ja existente.");
  }
}

// =====================================================
// LEITURA DOS SENSORES
// =====================================================

void lerSensores() {
  if (rtcOK) {
    agora = rtc.now();
  }

  if (bmeOK) {
    bme.takeForcedMeasurement();

    tempExterior = bme.readTemperature();
    humidade = bme.readHumidity();
    pressao = bme.readPressure() / 100.0F;
  }

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

// =====================================================
// ESTADOS E ALERTAS
// =====================================================

bool leituraNinhoInvalida(float temperatura) {
  return temperatura == DEVICE_DISCONNECTED_C
      || temperatura == -127.0
      || temperatura == 85.0;
}

String estadoTemperatura(float temperatura) {
  if (leituraNinhoInvalida(temperatura)) {
    return "ERRO";
  }

  if (temperatura < TEMP_NINHO_MIN) {
    return "FRIO";
  }

  if (temperatura > TEMP_NINHO_MAX) {
    return "CALOR";
  }

  return "OK";
}

String estadoCurto(float temperatura) {
  String estado = estadoTemperatura(temperatura);

  if (estado == "ERRO") return "ERR";
  if (estado == "FRIO") return "F";
  if (estado == "CALOR") return "Q";

  return "OK";
}

bool temAlertaGeral() {
  return estadoTemperatura(tempNinho1) != "OK"
      || estadoTemperatura(tempNinho2) != "OK";
}

// =====================================================
// SERIAL MONITOR
// =====================================================

void imprimirDoisDigitosSerial(int valor) {
  if (valor < 10) {
    Serial.print("0");
  }

  Serial.print(valor);
}

void imprimirDataHoraSerial() {
  imprimirDoisDigitosSerial(agora.day());
  Serial.print("/");

  imprimirDoisDigitosSerial(agora.month());
  Serial.print("/");

  Serial.print(agora.year());
  Serial.print(" ");

  imprimirDoisDigitosSerial(agora.hour());
  Serial.print(":");

  imprimirDoisDigitosSerial(agora.minute());
  Serial.print(":");

  imprimirDoisDigitosSerial(agora.second());
}

void mostrarSerial() {
  Serial.println();
  Serial.println("-----------------------------");

  Serial.print("Data/Hora: ");

  if (rtcOK) {
    imprimirDataHoraSerial();
  } else {
    Serial.print("RTC indisponivel");
  }

  Serial.println();

  Serial.print("Temperatura exterior: ");
  Serial.print(tempExterior, 2);
  Serial.println(" C");

  Serial.print("Humidade: ");
  Serial.print(humidade, 2);
  Serial.println(" %");

  Serial.print("Pressao: ");
  Serial.print(pressao, 2);
  Serial.println(" hPa");

  Serial.print("Ninho 1: ");
  Serial.print(tempNinho1, 2);
  Serial.print(" C - ");
  Serial.println(estadoTemperatura(tempNinho1));

  Serial.print("Ninho 2: ");
  Serial.print(tempNinho2, 2);
  Serial.print(" C - ");
  Serial.println(estadoTemperatura(tempNinho2));

  Serial.print("microSD: ");
  Serial.println(sdOK ? "OK" : "ERRO");

  if (temAlertaGeral()) {
    Serial.println("!!! ALERTA DE TEMPERATURA NO NINHO !!!");
  }
}

// =====================================================
// OLED
// =====================================================

void escreverDoisDigitosOLED(int valor) {
  if (valor < 10) {
    display.print("0");
  }

  display.print(valor);
}

void mostrarOLED() {
  if (!oledOK) {
    return;
  }

  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);

  // Linha superior amarela
  display.setCursor(0, 0);

  display.print(temAlertaGeral() ? "A " : "OK ");

  if (rtcOK) {
    escreverDoisDigitosOLED(agora.day());
    display.print("/");

    escreverDoisDigitosOLED(agora.month());
    display.print(" ");

    escreverDoisDigitosOLED(agora.hour());
    display.print(":");

    escreverDoisDigitosOLED(agora.minute());
  } else {
    display.print("RTC ERRO");
  }

  // Parte azul
  display.setCursor(0, 17);
  display.print("Ext:");
  display.print(tempExterior, 1);
  display.print("C H:");
  display.print(humidade, 0);
  display.print("%");

  display.setCursor(0, 29);
  display.print("P:");
  display.print(pressao, 0);
  display.print(" hPa");

  display.setCursor(0, 41);
  display.print("N1:");
  display.print(tempNinho1, 1);
  display.print("C ");
  display.print(estadoCurto(tempNinho1));

  display.setCursor(0, 53);
  display.print("N2:");
  display.print(tempNinho2, 1);
  display.print("C ");
  display.print(estadoCurto(tempNinho2));

  display.display();
}

// =====================================================
// CARTÃO SD
// =====================================================

void escreverDoisDigitosFicheiro(File &ficheiro, int valor) {
  if (valor < 10) {
    ficheiro.print("0");
  }

  ficheiro.print(valor);
}

void gravarDadosSD() {
  if (!sdOK) {
    return;
  }

  File ficheiro = SD.open("/apiario.csv", FILE_APPEND);

  if (!ficheiro) {
    Serial.println("ERRO: nao consegui abrir apiario.csv.");
    return;
  }

  if (rtcOK) {
    ficheiro.print(agora.year());
    ficheiro.print("-");

    escreverDoisDigitosFicheiro(ficheiro, agora.month());
    ficheiro.print("-");

    escreverDoisDigitosFicheiro(ficheiro, agora.day());
    ficheiro.print(",");

    escreverDoisDigitosFicheiro(ficheiro, agora.hour());
    ficheiro.print(":");

    escreverDoisDigitosFicheiro(ficheiro, agora.minute());
    ficheiro.print(":");

    escreverDoisDigitosFicheiro(ficheiro, agora.second());
    ficheiro.print(",");
  } else {
    ficheiro.print("RTC_ERRO,RTC_ERRO,");
  }

  ficheiro.print(tempExterior, 2);
  ficheiro.print(",");

  ficheiro.print(humidade, 2);
  ficheiro.print(",");

  ficheiro.print(pressao, 2);
  ficheiro.print(",");

  ficheiro.print(tempNinho1, 2);
  ficheiro.print(",");

  ficheiro.print(tempNinho2, 2);
  ficheiro.print(",");

  ficheiro.print(estadoTemperatura(tempNinho1));
  ficheiro.print(",");

  ficheiro.println(estadoTemperatura(tempNinho2));

  ficheiro.close();

  Serial.println("Dados gravados em apiario.csv.");
}

// =====================================================
// RESUMO INICIAL NO OLED
// =====================================================

void mostrarResumoInicial() {
  if (!oledOK) {
    return;
  }

  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);

  display.println("APIARIO TECH");
  display.println();
  display.print("BME: ");
  display.println(bmeOK ? "OK" : "ERRO");

  display.print("RTC: ");
  display.println(rtcOK ? "OK" : "ERRO");

  display.print("SD: ");
  display.println(sdOK ? "OK" : "ERRO");

  display.print("DS18B20: ");
  display.println(totalSondas);

  display.display();

  delay(2000);
}