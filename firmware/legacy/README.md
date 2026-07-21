# Firmware original — inventário e análise inicial

| Campo | Valor |
|---|---|
| Origem | `colmeias.zip`, fornecido por Patrícia Silva |
| Data da análise | 21 de julho de 2026 |
| SHA-256 do ZIP | `c5be353b36f0ef5a682700465e825144a33c4083d1b20aad18ae3bed1fe2775a` |
| Estado | Preservado para referência; funcionamento por confirmar no hardware |

## Finalidade

Esta pasta preserva, sem alterações funcionais, os três sketches encontrados no arquivo original. Os ficheiros mantêm os nomes e a organização recebidos, incluindo a grafia `colemias_cartaosd` da terceira versão.

Nenhum destes sketches deve ser tratado como versão de produção. Servem como evidência do desenvolvimento anterior e como ponto de partida para testes controlados.

## Versões encontradas

| Ordem | Sketch | Data do ficheiro | Funcionalidade acrescentada | Estado atribuído |
|---|---|---:|---|---|
| 1 | `colmeias/colmeias.ino` | 02-05-2026 | OLED, BME280 e duas DS18B20 | Candidato ao primeiro teste-base |
| 2 | `colmeias/colmeias_relogio/colmeias_relogio.ino` | 06-05-2026 | Acrescenta RTC DS3231 e data/hora | Candidato à base funcional com relógio |
| 3 | `colmeias/colemias_cartaosd/colemias_cartaosd.ino` | 07-06-2026 | Acrescenta microSD, CSV, scanner I2C e tolerância a falhas | Versão mais recente; experimental enquanto o microSD não for validado |

As datas indicam uma progressão consistente, mas não provam que uma versão tenha sido carregada no ESP32 ou validada fisicamente.

## Comparação funcional

| Capacidade | Versão 1 | Versão 2 | Versão 3 |
|---|:---:|:---:|:---:|
| ESP32 / monitor série | Sim | Sim | Sim |
| OLED SSD1306 | Sim | Sim | Sim |
| BME280 | Sim | Sim | Sim |
| Duas DS18B20 | Sim | Sim | Sim |
| Alertas de temperatura | Sim | Sim | Sim |
| RTC DS3231 | Não | Sim | Sim |
| Scanner I2C | Não | Não | Sim |
| microSD por SPI | Não | Não | Sim |
| Criação de CSV | Não | Não | Sim |
| Continua após falha de OLED/BME/RTC | Não | Não | Sim |
| HX711 / células de carga | Não | Não | Não |
| Sensor de luz | Não | Não | Não |
| Medição da bateria | Não | Não | Não |
| Comunicação remota | Não | Não | Não |

## Pinos encontrados no código

| Função | GPIO | Versões |
|---|---:|---|
| I2C SDA | 21 | Todas |
| I2C SCL | 22 | Todas |
| OneWire das DS18B20 | 4 | Todas |
| microSD CS | 27 | Versão 3 |
| microSD SCK | 18 | Versão 3 |
| microSD MISO | 19 | Versão 3 |
| microSD MOSI | 23 | Versão 3 |

Este mapa descreve apenas o código. Ainda deve ser comparado com as ligações físicas reais.

## Bibliotecas identificadas

- `Wire`;
- `SPI` e `SD` na terceira versão;
- `Adafruit Sensor`;
- `Adafruit BME280`;
- `Adafruit GFX`;
- `Adafruit SSD1306`;
- `OneWire`;
- `DallasTemperature`;
- `RTClib` nas versões 2 e 3.

As versões concretas das bibliotecas e do pacote de placas ESP32 ainda não são conhecidas.

## Resultado da análise estática

- não foram encontradas credenciais, palavras-passe, tokens ou dados de rede;
- não foram observados erros de sintaxe evidentes durante a leitura do código;
- a assinatura de inicialização do cartão usada na versão 3 é específica do ambiente ESP32;
- não foi possível executar uma compilação nesta análise, por não existir aqui uma instalação Arduino com o pacote da placa e as bibliotecas;
- o funcionamento real continua dependente da montagem, do modelo exato do ESP32, das bibliotecas instaladas e dos periféricos ligados.

## Pontos técnicos a corrigir na futura versão

1. As DS18B20 são associadas a “Ninho 1” e “Ninho 2” pelo índice encontrado no barramento; a ordem pode mudar. A versão futura deverá usar o endereço físico de cada sonda.
2. Na versão 3, se o BME280 falhar, temperatura, humidade e pressão permanecem em `0.0`, o que pode ser gravado como uma leitura real. Uma falha deverá ser representada explicitamente.
3. A versão 3 tenta iniciar o microSD apenas durante o arranque; se falhar, não existe nova tentativa automática.
4. Uma falha posterior ao abrir o CSV não altera o estado do microSD nem desencadeia recuperação.
5. Os limites de 32,0 °C a 36,5 °C são provisórios e provocam alertas esperados durante testes fora da colmeia.
6. As versões 1 e 2 ficam bloqueadas se o OLED, BME280 ou RTC não forem encontrados. A versão 3 é mais tolerante a falhas.
7. A identificação do microSD depende de coincidirem código, ligações, alimentação, módulo e formatação do cartão.
8. A utilização repetida de objetos `String` será reavaliada antes de testes prolongados.

## Sequência de testes recomendada

1. Carregar a versão 1 para validar apenas OLED, BME280 e as duas DS18B20.
2. Carregar a versão 2 para acrescentar e validar o RTC DS3231.
3. Testar o microSD com um sketch mínimo e isolado, sem os restantes sensores.
4. Só depois testar a versão 3 integrada.

A designação “funcional” só será atribuída após registo do resultado no monitor série, comportamento do OLED e, quando aplicável, conteúdo do cartão.

## Preservação

Os sketches desta pasta não serão corrigidos diretamente. O desenvolvimento seguinte será feito numa pasta separada, mantendo estas versões disponíveis para comparação e recuperação.
