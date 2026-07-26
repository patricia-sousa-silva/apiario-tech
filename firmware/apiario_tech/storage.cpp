/*
 * Apiário Tech — Implementação da persistência em microSD.
 */

#include "storage.h"
#include "config.h"

#include <SPI.h>
#include <SD.h>

static bool sdOk = false;

// -----------------------------------------------------
// Utilitários
// -----------------------------------------------------

// Extrai "AAAA-MM-DD" do timestamp ISO ("AAAA-MM-DDTHH:MM:SSZ").
static String dateFromTimestamp(const char* timestamp) {
  return String(timestamp).substring(0, 10);
}

// Renomeia o arquivo atual para um nome com data e cria um novo com
// cabeçalho. Chamado quando o arquivo atinge CSV_MAX_SIZE.
static void rotateArchive(const Reading& r) {
  String base = "/apiario_" + dateFromTimestamp(r.timestamp);
  String newName = base + ".csv";
  int n = 1;
  while (SD.exists(newName.c_str())) {
    newName = base + "_" + String(n) + ".csv";
    n++;
  }

  if (SD.rename(CSV_FILE, newName.c_str())) {
    Serial.print("[sd] Arquivo rodado para ");
    Serial.println(newName);
  } else {
    Serial.println("[sd] ERRO: falha ao rodar o arquivo.");
  }
}

// Cria o arquivo CSV com o cabeçalho do contrato, se não existir.
static void ensureArchive() {
  if (SD.exists(CSV_FILE)) {
    return;
  }
  File f = SD.open(CSV_FILE, FILE_WRITE);
  if (f) {
    f.println(TELEMETRY_CSV_HEADER);
    f.close();
    Serial.println("[sd] Arquivo apiario.csv criado.");
  }
}

// -----------------------------------------------------
// API pública
// -----------------------------------------------------

bool storageBegin() {
  Serial.println("[sd] A iniciar cartao microSD...");
  sdOk = false;

  pinMode(SD_CS, OUTPUT);
  digitalWrite(SD_CS, HIGH);

  SPI.begin(SD_SCK, SD_MISO, SD_MOSI, SD_CS);

  // Frequência reduzida para estabilidade (como no firmware original).
  if (!SD.begin(SD_CS, SPI, 1000000UL)) {
    Serial.println("[sd] ERRO: cartao microSD nao iniciou.");
    return false;
  }

  sdOk = true;
  Serial.print("[sd] Cartao iniciado. Tamanho ~");
  Serial.print(SD.cardSize() / (1024 * 1024));
  Serial.println(" MB");

  ensureArchive();
  return true;
}

bool storageIsAvailable() {
  return sdOk;
}

bool storageAppend(const Reading& r) {
  if (!sdOk) {
    return false;
  }

  bool ok = true;

  // --- Arquivo permanente (CSV do contrato) ---
  // Rotação antes de escrever, se o arquivo já estiver grande.
  File archive = SD.open(CSV_FILE, FILE_APPEND);
  if (archive) {
    if (archive.size() >= CSV_MAX_SIZE) {
      archive.close();
      rotateArchive(r);
      archive = SD.open(CSV_FILE, FILE_WRITE);  // recria com tamanho 0
      if (archive) {
        archive.println(TELEMETRY_CSV_HEADER);
        archive.close();
      }
      archive = SD.open(CSV_FILE, FILE_APPEND);
    }
    if (archive) {
      archive.println(telemetryToCsvLine(r));
      archive.close();
    } else {
      ok = false;
    }
  } else {
    ok = false;
  }

  // --- Fila de envio (JSON Lines) ---
  File pending = SD.open(PENDING_FILE, FILE_APPEND);
  if (pending) {
    pending.println(telemetryToJson(r));
    pending.close();
  } else {
    ok = false;
  }

  return ok;
}

int storageLoadPending(std::vector<String>& out) {
  out.clear();
  if (!sdOk || !SD.exists(PENDING_FILE)) {
    return 0;
  }

  File f = SD.open(PENDING_FILE, FILE_READ);
  if (!f) {
    return 0;
  }

  while (f.available()) {
    String line = f.readStringUntil('\n');
    line.trim();
    if (line.length() > 0) {
      out.push_back(line);
    }
  }
  f.close();

  return (int)out.size();
}

bool storageClearPending() {
  if (!sdOk) {
    return false;
  }
  // FILE_WRITE trunca o ficheiro para 0 bytes.
  File f = SD.open(PENDING_FILE, FILE_WRITE);
  if (!f) {
    return false;
  }
  f.close();
  return true;
}

bool storageSavePending(const std::vector<String>& lines) {
  if (!sdOk) {
    return false;
  }
  File f = SD.open(PENDING_FILE, FILE_WRITE);  // trunca
  if (!f) {
    return false;
  }
  for (size_t i = 0; i < lines.size(); i++) {
    f.println(lines[i]);
  }
  f.close();
  return true;
}

unsigned long storagePendingCount() {
  if (!sdOk || !SD.exists(PENDING_FILE)) {
    return 0;
  }
  File f = SD.open(PENDING_FILE, FILE_READ);
  if (!f) {
    return 0;
  }
  unsigned long count = 0;
  while (f.available()) {
    String line = f.readStringUntil('\n');
    line.trim();
    if (line.length() > 0) count++;
  }
  f.close();
  return count;
}
