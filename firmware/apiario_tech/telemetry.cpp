/*
 * Apiário Tech — Implementação do modelo de telemetria.
 */

#include "telemetry.h"
#include "config.h"

const char* TELEMETRY_CSV_HEADER =
    "device_id,timestamp,temp_ext_c,humidity_pct,pressure_hpa,"
    "temp_nest1_c,temp_nest2_c,weight_g,battery_mv,status_flags";

// -----------------------------------------------------
// Timestamp
// -----------------------------------------------------

void telemetrySetTimestamp(Reading& r, int year, int month, int day,
                           int hour, int minute, int second) {
  snprintf(r.timestamp, sizeof(r.timestamp), "%04d-%02d-%02dT%02d:%02d:%02dZ",
           year, month, day, hour, minute, second);
}

bool telemetryIsOk(const Reading& r) {
  return r.flags == FLAG_NONE;
}

// -----------------------------------------------------
// Formatação
// -----------------------------------------------------

String telemetryFmtFloat(float value, int decimals) {
  char buf[16];
  dtostrf(value, 0, decimals, buf);
  return String(buf);
}

// -----------------------------------------------------
// Flags
// -----------------------------------------------------

String telemetryFlagsToString(uint16_t flags) {
  if (flags == FLAG_NONE) {
    return String("OK");
  }

  String out;
  out.reserve(48);

  struct { uint16_t bit; const char* name; } map[] = {
    { FLAG_BME280_FAIL,    "BME280_FAIL" },
    { FLAG_BME280_STALE,   "BME280_STALE" },
    { FLAG_DS18B20_1_FAIL, "DS18B20_1_FAIL" },
    { FLAG_DS18B20_2_FAIL, "DS18B20_2_FAIL" },
    { FLAG_RTC_FAIL,       "RTC_FAIL" },
    { FLAG_SD_FAIL,        "SD_FAIL" },
    { FLAG_HX711_FAIL,     "HX711_FAIL" },
    { FLAG_BATTERY_LOW,    "BATTERY_LOW" },
  };

  for (size_t i = 0; i < sizeof(map) / sizeof(map[0]); i++) {
    if (flags & map[i].bit) {
      if (out.length() > 0) out += "|";
      out += map[i].name;
    }
  }

  return out;
}

// -----------------------------------------------------
// JSON (contrato §3)
// -----------------------------------------------------

// Escreve um campo numérico float ou "null" se for sentinela.
static void jsonFloatField(String& s, const char* key, float value, int decimals) {
  s += "\"";
  s += key;
  s += "\":";
  if (value <= SENTINEL_F + 0.5f) {  // sentinela (-127.00)
    s += "null";
  } else {
    s += telemetryFmtFloat(value, decimals);
  }
}

String telemetryToJson(const Reading& r) {
  String s;
  s.reserve(320);

  s += "{\"device_id\":\"";
  s += DEVICE_ID;
  s += "\",\"timestamp\":\"";
  s += r.timestamp;
  s += "\",";

  jsonFloatField(s, "temp_ext_c", r.tempExtC, 2);
  s += ",";
  jsonFloatField(s, "humidity_pct", r.humidityPct, 2);
  s += ",";
  jsonFloatField(s, "pressure_hpa", r.pressureHpa, 1);
  s += ",";
  jsonFloatField(s, "temp_nest1_c", r.tempNest1C, 2);
  s += ",";
  jsonFloatField(s, "temp_nest2_c", r.tempNest2C, 2);
  s += ",";

  s += "\"weight_g\":";
  if (r.weightG == WEIGHT_UNAVAILABLE) {
    s += "null";
  } else {
    s += String(r.weightG);
  }
  s += ",";

  s += "\"battery_mv\":";
  if (r.batteryMv == BATTERY_UNAVAILABLE) {
    s += "null";
  } else {
    s += String(r.batteryMv);
  }
  s += ",";

  // status_flags como array de strings.
  s += "\"status_flags\":[";
  if (r.flags == FLAG_NONE) {
    s += "\"OK\"";
  } else {
    String joined = telemetryFlagsToString(r.flags);
    bool first = true;
    int start = 0;
    while (start <= (int)joined.length()) {
      int sep = joined.indexOf('|', start);
      String token = (sep == -1) ? joined.substring(start)
                                 : joined.substring(start, sep);
      if (token.length() > 0) {
        if (!first) s += ",";
        s += "\"";
        s += token;
        s += "\"";
        first = false;
      }
      if (sep == -1) break;
      start = sep + 1;
    }
  }
  s += "]}";

  return s;
}

// -----------------------------------------------------
// CSV (contrato §2)
// -----------------------------------------------------

String telemetryToCsvLine(const Reading& r) {
  String s;
  s.reserve(160);

  s += DEVICE_ID;
  s += ",";
  s += r.timestamp;
  s += ",";

  s += telemetryFmtFloat(r.tempExtC, 2);
  s += ",";
  s += telemetryFmtFloat(r.humidityPct, 2);
  s += ",";
  s += telemetryFmtFloat(r.pressureHpa, 1);
  s += ",";
  s += telemetryFmtFloat(r.tempNest1C, 2);
  s += ",";
  s += telemetryFmtFloat(r.tempNest2C, 2);
  s += ",";

  if (r.weightG != WEIGHT_UNAVAILABLE) s += String(r.weightG);
  s += ",";

  if (r.batteryMv != BATTERY_UNAVAILABLE) s += String(r.batteryMv);
  s += ",";

  s += telemetryFlagsToString(r.flags);

  return s;
}
