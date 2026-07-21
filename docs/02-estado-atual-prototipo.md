# Estado atual do protótipo

| Campo | Valor |
|---|---|
| Documento | Estado atual do protótipo |
| Versão | 0.1.0 |
| Estado | Inventário inicial — requer validação em bancada |
| Responsável | Patrícia Silva |
| Data de referência | 21 de julho de 2026 |

## 1. Finalidade

Este documento regista o ponto de partida técnico do Apiário Tech antes da reorganização profissional do firmware e do desenvolvimento da plataforma web.

O seu objetivo é separar claramente:

- o que já foi confirmado por teste;
- o que existe fisicamente, mas ainda não está estabilizado;
- o que necessita de nova verificação;
- o que ainda não foi implementado.

Nenhum item marcado como “a validar” deverá ser tratado como concluído sem uma evidência de teste.

## 2. Contexto do piloto

- **Número inicial de colmeias:** duas.
- **Controlador principal:** ESP32.
- **Alimentação disponível:** painel solar, controlador e bateria.
- **Conectividade permanente:** não disponível nesta fase.
- **Estratégia inicial de dados:** armazenamento local e importação por CSV.

## 3. Inventário de hardware

| Componente | Finalidade | Estado documental |
|---|---|---|
| ESP32 | Controlador do protótipo e recolha de dados | Disponível; modelo e revisão da placa a registar |
| BME280 | Temperatura, humidade e pressão exteriores | Já utilizado; funcionamento e atualização das leituras a revalidar |
| 2 × DS18B20 | Temperatura no ninho de cada colmeia | Disponíveis; integração simultânea a confirmar |
| OLED I2C | Visualização local | Já utilizado; conteúdo e estabilidade a revalidar |
| RTC DS3231 | Data e hora durante funcionamento offline | Disponível; configuração, retenção e precisão a confirmar |
| Módulo microSD | Armazenamento local de telemetria | Problema conhecido; ainda não considerado estável |
| Cartão microSD | Suporte de armazenamento | Capacidade, formatação e compatibilidade a registar |
| HX711 | Conversão do sinal das células de carga | Disponível; integração e calibração pendentes |
| Células de carga | Medição do peso | Disponíveis; quantidade, capacidade e montagem final a documentar |
| Painel solar | Produção de energia | Disponível no apiário; características a registar |
| Controlador solar | Gestão da carga | Disponível; modelo e configuração a registar |
| Bateria | Alimentação durante ausência de sol | Disponível; tipo, capacidade e estado a registar |
| Cabos, caixas e conectores | Montagem e proteção | Configuração definitiva ainda não fechada |

## 4. Estado do firmware

Existe código funcional de experiências anteriores com o ESP32, sensores e OLED, mas ainda não existe uma versão base controlada neste repositório.

| Área | Estado atual | Ação necessária |
|---|---|---|
| Arranque do ESP32 | Algum software já executado no protótipo | Recolher o código atual e confirmar placa/configuração |
| BME280 | Leituras já apresentadas; foi relatada pouca ou nenhuma variação dos valores | Repetir teste controlado e distinguir estabilidade ambiental de leitura congelada |
| DS18B20 | Hardware previsto para duas colmeias | Confirmar endereços, pino, resolução e leitura simultânea |
| OLED | Utilizado para apresentação local | Definir e testar os estados normal, aviso e erro |
| RTC DS3231 | Previsto para data e hora reais | Confirmar leitura, acerto, bateria e recuperação após reinício |
| microSD | Integração tentada sem funcionamento fiável | Diagnosticar isoladamente antes de integrar no ciclo completo |
| CSV | Objetivo já definido | Criar e versionar o formato após estabilizar microSD/RTC |
| HX711 e peso | Ainda não estabilizado | Montar, calibrar e testar uma balança completa |
| Comunicação remota | Não implementada | Manter fora do firmware base até o fluxo local estar estável |
| Gestão de erros | Não documentada | Definir códigos/estados de erro por componente |
| Gestão de energia | Não documentada | Medir consumo antes de definir modos de poupança |

## 5. Problemas e incertezas conhecidos

### 5.1 microSD

O leitor de microSD ainda não funciona de forma fiável. Este problema é bloqueador para o armazenamento local e deverá ser investigado separadamente, começando por um programa mínimo que apenas inicialize o cartão, crie um ficheiro, escreva uma linha, leia o conteúdo e feche o ficheiro.

Devem ser registados:

- modelo do módulo;
- tensão de funcionamento;
- pinos SPI utilizados;
- tipo, capacidade e formatação do cartão;
- mensagem completa apresentada no monitor série;
- resultado com outro cartão, quando disponível;
- resultado do teste mínimo sem os restantes sensores.

### 5.2 BME280

Foi anteriormente observado que os valores pareciam variar pouco ou não variar. Antes de alterar o código, deve ser realizado um teste reproduzível com mudanças ambientais simples e registo temporal das leituras. O objetivo é determinar se existe uma leitura congelada, intervalo de atualização incorreto, endereço/biblioteca inadequados ou apenas estabilidade do ambiente.

### 5.3 Ausência de inventário técnico completo

Ainda não estão registados de forma centralizada:

- modelos exatos dos módulos;
- esquema e pinos usados;
- versões das bibliotecas;
- versão do ambiente de desenvolvimento;
- código mais recente;
- exemplos reais de saída do monitor série;
- fotografias da montagem;
- resultados e duração dos testes já efetuados.

Estes dados serão recolhidos sem assumir que a montagem atual é a definitiva.

## 6. Ordem de estabilização acordada

1. recuperar e versionar o código existente;
2. testar individualmente ESP32, BME280, DS18B20, OLED e RTC;
3. resolver e validar o microSD com um teste mínimo;
4. integrar sensores, RTC, OLED e gravação local;
5. executar um teste contínuo de bancada;
6. montar e calibrar uma balança completa com HX711;
7. repetir o teste integrado incluindo o peso;
8. apenas depois fechar a montagem física definitiva.

## 7. Plano mínimo de validação em bancada

| ID | Teste | Critério de aceitação | Estado |
|---|---|---|---|
| HW-001 | Arranque e reinício do ESP32 | Arranca repetidamente sem intervenção manual | Por executar |
| HW-002 | Leitura do BME280 | Produz novas leituras e reage a alteração ambiental | Por executar |
| HW-003 | Duas sondas DS18B20 | As duas são identificadas e lidas sem troca de colmeia | Por executar |
| HW-004 | RTC após corte de energia | Mantém data/hora dentro da tolerância definida | Por executar |
| HW-005 | OLED | Apresenta leitura e falha de sensor de forma distinta | Por executar |
| HW-006 | Escrita no microSD | Cria, escreve, fecha e lê ficheiro em reinícios sucessivos | Por executar |
| HW-007 | CSV | Cada linha respeita o formato e possui data/hora válida | Por executar |
| HW-008 | Sensor ausente | O sistema continua e regista o erro sem inventar valor | Por executar |
| HW-009 | Falha durante escrita | O ficheiro continua utilizável após recuperação | Por executar |
| HW-010 | Balança/HX711 | Mede cargas conhecidas dentro da tolerância definida | Por executar |
| HW-011 | Teste contínuo | Funciona sem bloqueio durante o período que vier a ser definido | Por executar |

As tolerâncias, a frequência de leitura e a duração do teste contínuo serão definidas antes da execução, para evitar alterar os critérios depois de observar o resultado.

## 8. Evidências a guardar

Para cada teste deverão ser guardados, quando aplicável:

- versão do firmware e identificador do commit;
- data, duração e responsável;
- montagem e esquema utilizados;
- configuração das bibliotecas;
- saída integral do monitor série;
- ficheiros CSV produzidos;
- fotografias relevantes;
- resultado esperado e resultado observado;
- conclusão: aprovado, reprovado ou inconclusivo;
- problema criado para qualquer falha encontrada.

As evidências volumosas ou que contenham credenciais não devem ser adicionadas diretamente ao repositório sem revisão.

## 9. Critério de conclusão da fase de consolidação

A fase 0 ficará concluída quando:

- o código mais recente estiver no repositório;
- todos os componentes estiverem identificados;
- existir um esquema de ligações correspondente ao código;
- as bibliotecas e versões estiverem registadas;
- os testes já realizados tiverem estado e evidência;
- os problemas conhecidos estiverem reproduzidos e descritos;
- estiver definida a configuração de bancada usada no início da fase 1.

## 10. Histórico do documento

| Versão | Data | Alteração |
|---|---|---|
| 0.1.0 | 21-07-2026 | Criação do inventário técnico inicial |
