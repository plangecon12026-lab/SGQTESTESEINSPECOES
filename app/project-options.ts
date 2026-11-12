export type ProjectArea = {
  code: string;
  label: string;
  subareas: { code: string; label: string }[];
};

export const projectPhases = ["PROJETO DETALHADO", "PROJETO BÁSICO", "PROJETO CONCEITUAL"];

export const reportIssuers = [
  { key: "VM", name: "Vitor Maia", role: "Engenheiro Mecânico" },
  { key: "PH", name: "Pedro Henrique", role: "Engenheiro Mecânico" },
  { key: "WC", name: "Waldemir Cei", role: "Engenheiro Mecânico" },
  { key: "AS", name: "Alessandro Sousa", role: "Engenheiro de Automação" },
  { key: "PJ", name: "Pedro José", role: "Engenheiro Eletricista" },
  { key: "JA", name: "Jhonny Alves", role: "Inspetor N1" },
  { key: "JM", name: "José Martins", role: "Inspetor N1" },
  { key: "DH", name: "Diego Henry", role: "Gestor" },
  { key: "JF", name: "Jean Ferreira", role: "Engenheiro Mecânico" },
] as const;

export const projectNames = [
  "C020254 - AQUISIÇÃO DE EXTRATORES DE METAIS",
  "C009077 - CARRO TENSOR MSR'S, MCR'S e SLM'S",
  "C023553 - ADEQ. CT-1085KS-01/CAB. MÓVEL TR1085KS01",
  "C016557 - MELHORIAS ALIMENTADORES AL2012KS01 A 06",
  "C012392 - SIST. AUTOMÁTICOS DE SPRINKLERS (SDACI)",
  "C020254 - TROCA DO BIG MOE - SISTEMA 03",
  "SISTEMA DE MONITORAMENTO DAS NAS CORREIAS",
  "C020254 - TROCA DO CARTÃO DE LÓGICA DO EXTRATOR DA MINA",
  "C016931 - REPOTENCIAMENTO DOS TAMBORES TCLD",
  "INSTALAÇÃO DE PLATAFORMAS TAMBOR 3 E 13 TR2011KS10",
  "C016598 - ADEQ. DA 5 BRITAGEM PARA PROC. COMPACTO",
  "C008437 - MOVIMENTAÇÃO DE SALAS ELÉTRICAS DA MINA",
  "C020254 - EXTRATOR DE METAIS - SISTEMA 04",
  "C018032 - ADEQUAÇÃO DA OFICINA DE EQ MÓVEIS",
  "C005126 - MONTAGEM DO CHAPÉU CHINÊS",
  "C020976 - ADEQUAÇÃO HOPPER 51 - P80",
  "C020894 - CANHÃO DA USINA",
  "C014462 - SISTEMA DE DESÁGUE DA MINA",
  "C020894 - SISTEMA DE DESPOEIRAMENTO TLO",
  "C006583 - OFICINAS DE MANUTENÇÃO",
  "C006583 - OFICINA DE PNEUS",
  "C020254 - EXTRATOR DE METAIS - SISTEMA 02",
  "C018052 - ADEQUAÇÃO MONITORAMENTO PREDITIVO",
  "C018199 - ELIMINAÇÃO DE ANDAIMES NAS ÁREAS",
  "C018240 - ADEQUAÇÃO DE FROTA CONVENCIONAL",
  "C025628 - REDE ELÉTRICA CIRCUITO 13",
  "C009077 - TROCA DOS ROLETES DO CRAWLER DO MSR",
  "C016570 - SUBSTITUIÇÃO SDACIs DAS SALAS ELÉTRICAS",
  "C016594 - AUTOMAÇÃO DAS CABEÇAS MÓVEIS",
  "C012387 - ÁGUAS DE SERVIÇO",
  "C028100 - IMPLATAÇÃO DE SISTEMA ANTI-RASGO",
  "C025494 - REPOTENCIAMENTO DOS TAMBORES DO OVERLAND",
  "C014260.02.06.02 - ADEQUAÇÃO PORTE FROTA",
  "CC2180156 - MEDIÇÃO DE VOLUMETRICA MSR",
  "N/A - DIQUE DE INSPEÇÃO VEICULAR",
  "C025612 - AQUISIÇÃO DRIVE ROTATION OFICINA DE PNEUS",
  "C014461 - CHUTE PARA MATERIAL ARGILOSO OVERLAND",
  "G001621.01.06.02 - COI - CENTRO DE OPERAÇÕES INTEGRADAS",
  "C023204 - REDE ELÉTRICA DAS ESCAVADEIRAS - C17",
  "C025638 - PLANTAS MÓVEIS",
  "AQUISIÇÃO DE EXTRATORES DE METAIS",
  "C005126 - PROJETO DE PREVENÇÃO DE RISCO E  FATALIDADE",
  "SAP BSM V",
  "ADEQ. CT-1085KS-01/CAB. MÓVEL TR1085KS01"
];

export const lsOptions = [
  "2024-04",
  "2024-06 - PASSAGEM DA TUBULAÇÃO E MONTAGEM SPRINKLERS TR-1085KS-04 e 05",
  "2025-28 - VÁLVULAS DE DILÚVIO",
  "2025-31 - INSTALAÇÃO DE SUPORTES E TUBULAÇÃO",
  "2025-41 - INSTALAÇÃO DE HIDRANTES",
  "2024-28 - SISTEMA DE DESPOEIRAMENTO TLO E 2092",
  "2024-25 - CANHÃO DA USINA",
  "2024-05 - MELHORIAS ALIMENTADORES AL2012KS01 A 06",
  "2024-14 - INSTALAÇÃO DO EXTRATOR DE METAIS NO TR36 DA 5º BRITAGEM",
  "2024-43 - PLATAFORMA DO SILO 01",
  "2024-61 - PLATAFORMA DO SILO 02",
  "2025-41 - PLATAFORMA DO SILO 03",
  "2024-27 - EXTRATOR USINA - TR2020KS 10 E 11, MONTAGEM DA ESTRUTURA E BIG MOE",
  "2024-11 - REPOTENCIAMENTOTR-2011KS-07 TAMBOR 02",
  "2024-11 - REPOTENCIAMENTOTR-2011KS-07 TAMBOR 04",
  "2024-11 - REPOTENCIAMENTOTR-2011KS-07 TAMBOR 05",
  "2024-11 - REPOTENCIAMENTOTR-2011KS-07 TAMBOR 07",
  "2024-11 - REPOTENCIAMENTOTR-2011KS-07 TAMBOR 15",
  "2024-11 - REPOTENCIAMENTOTR-2011KS-07 TAMBOR 11",
  "2024-11 - REPOTENCIAMENTOTR-2011KS-07 TAMBOR 10",
  "2024-16 - MONTAGEM EXTRATOR DE METAIS USINA - TR2020KS-12",
  "2025-15 - SISTEMA ANTI-RASGO",
  "2024-21 - MONTAGEM DO CHAPÉU CHINÊS",
  "2025-43 - LIMITADOR DE ALTURA",
  "2024-49",
  "2025-32 - APOIO REXROUTH E ABB (ELÉTRICA E ANDAIME)",
  "2025-02 - IMPLATAÇÃO DA SUBESTAÇÃO",
  "2025-04",
  "2025-22",
  "2025-25 - TROCA DO CHUTE DE DESCARGA TR1083 (4) KS01-04",
  "2025-29 - TROCA DO CHUTE 1084KS 01 PARA 03",
  "2025-19 - MEDIÇÃO DE VOLUME PARA MOEGAS DOS TRUCKLESS EM SERRA SUL",
  "2025-26 - COI - CENTRO DE OPERAÇÕES INTEGRADAS",
  "2024-37",
  "2025-30 - MONTAGEM DE MISCELÂNIAS E INFRAS DA SUBSESTAÇÃO",
  "2025-16 - REPOTENCIAMENTO DOS TAMBORES DO OVERLAND",
  "2025-24 - AQUISIÇÃO DRIVE ROTATION OFICINA DE PNEUS",
  "2025-40",
  "2025-53 - MONTAGEM DO SISTEMA DE ASPERSÃO DE POLÍMEROS",
  "2024-36_1 - REVITALIZAÇÃO DA PLANTA 01",
  "2024-63 - CHECK DAS TAGS DOS CABOS",
  "2024-20 - IMPLANTAÇÃO DAS ILHAS DE LUBRIFICAÇÃO NA OFICINA DE EQUIPAMENTOS MÓVEIS DA MINA",
  "2024-36_2 - REVITALIZAÇÃO DA PLANTA 02",
  "2025-33_1 - REVITALIZAÇÃO DA PLANTA 03",
  "2025-33_2 - REVITALIZAÇÃO DA PLANTA 04",
  "2024-11 - REPOTENCIAMENTOTR-2011KS-07 TAMBOR 08",
  "2024-00 - CANTEIRO CENTRAL - PLANGECON",
  "2024-00.1 - MÃO-DE-OBRA DIRETA",
  "2024-01 - OPERACIONALIZAÇÃO SLM OVERLAND - SUCATEAMENTO",
  "2024-02 - SUBSTITUIÇÃO DE TRANSFORMADOR - EXTRATOR DE METAIS - TR-1085KS-05",
  "2024-03 - CARRO TENSOR MSR'S, MCR'S e SLM'S",
  "2024-04 - ADEQ. CT-1085KS-01/CAB. MÓVEL TR1085KS01",
  "2024-05 - PREPARAÇÃO DE COMPONENTES/ESTRUTURAS DE REFORÇOS",
  "2024-07 - TROCA DO BIG MOE - SISTEMA 03",
  "2024-09 - TROCA DOS CABOS DE POTÊNCIA E CARTÕES DE LÓGICA",
  "2024-10 - CESSÃO DE MÃO DE OBRA PARA MANUTENÇÃO NO TR2012 AL06",
  "2024-11 - ESCADA DE ACESSO",
  "2024-12 - SEGREGAÇÃO CANTEIRO 15 - CKTR",
  "2024-15 - MOBILIZAÇÃO E CONFERÊNCIA DE MATERIAIS SKID 01",
  "2024-17 - SOLDA DE REFORÇOS NA ESTRUTURA TR2011KS09",
  "2024-18 - SEGREGAÇÃO CANTEIRO 15",
  "2024-19 - TROCA DO CARTÃO DE LÓGICA",
  "2024-22 - DESMOBILIZAÇÃO CANTEIRO AVANÇADO MSR - SISTEMA 02",
  "2024-23 - CESSÃO DE MAO DE OBRA CONTRATO MANUTENÇÃO",
  "2024-24 - MONTAGEM DE QUADRO E ACOMPANHAMENTO TIME DE LOGICA.",
  "2024-25 - CANHÃO DA USINA A/B/C",
  "2024-26 - DESAGUE 02 PILHA 01",
  "2024-29 - DESMOBILIZAÇÃO E MOBILIZAÇÃO DE MATERIAIS - CANTEIRO 15 (CKTR)",
  "2024-30 - OFICINA DE MANUTENÇÃO DE PNEUS",
  "2024-31 - MELHORIAS NO CANTEIRO CENTRAL - PLANGECON",
  "2024-32 - ELÉTRICA DA PLANTA DE REGENERAÇÃO",
  "2024-33 - ELETRICA DE ALIMENTAÇÃO DO QD DO PRÉDIO MODULAR",
  "2024-34 - DESAGUE 02 PILHA 02",
  "2024-35 - INSTALAÇÃO DE SPDA NAS AREAS DE VIVENCIA TRUCKLESS",
  "2024-36 - REVITALIZAÇÃO DO SISTEMA ELETRICO 01 E 02",
  "2024-37 - MONTAGEM DOS PAINEIS E RECOMPOSIÇÃO DAS MÁQUINAS",
  "2024-38 - TROCA DO CARTÃO DE LÓGICA",
  "2024-39 - SOLDA DE SUPORTE E POSICIONAMENTO DE TUBULAÇÃO",
  "2024-40 - DESMONTAGEM DE TENDA 10X10M",
  "2024-41 - CESSÃO DE MÃO DEOBRA PARA OFICINA DE SUBCONJUNTO",
  "2024-42 - MONTAGEM DE INFRA ELETRICA E ATERRAMENTO",
  "2024-43 - MONTAGEM DE PLATAFORMA SILO 01",
  "2024-44 - MONTAGEM DO SKID 01",
  "2024-55 - DESMONTAGEM DIVISÃO PA CARREGADEIRA 994K",
  "2024-56 - CESSÃO DE MÃO DE OBRA SUBCONJUNTO",
  "2024-58 - SUBSTITUIR PARAFUSOS MANCAIS DOS TAMBOR 02 - TR2011KS07",
  "2024-59 - CESSÃO DE MÃO DE OBRA MANUTENÇÃO PREVENTIVA COM 6 ELETRICISTAS",
  "2024-60 - AJUSTE NAS TELHAS CENTRAIS",
  "2024-62 - TROCA DE CIRCUITO ELÉTRICO - TORRE 60",
  "2024-64 - INSTALAÇÃO DE REFLETORES",
  "2024-65 - PINTURA NOS CONTEINERS DIQUE 01",
  "2024-66 - INSTALAÇÃO DE ATERRAMENTO E MONTAGEM DE MISCELANIA",
  "2024-67 - DISPOSITIVO PARA TROCA DE ROLETES CRAWLERS DO MSR",
  "2025-03 - CHECK DAS TAGS DOS CABOS",
  "2025-04 - ÁGUA DE SERVIÇO TR 2012 E 2032",
  "2025-05 - APOIO A EQUIPE DA MANUTENÇÃO MINA",
  "2025-06 - MOBILIZAÇÃO DE CANTEIRO AVANÇADO FASE ZERO",
  "2025-08 - OIN: ÁGUAS DE SERVIÇO",
  "2025-09 - OIN: PLANTAS MÓVEIS",
  "2025-10 - CANCELAMENTO CRAWLER - EQUIPES EM APOIO NAS ATIVIDADES DA MINA ATRAVÉS DE CARTA DE CESSÃO",
  "2025-11 - FORNECIMENTO DE 1 PLATAFORMA ELEVATÓRIA E 2 OPERADORES DE PEMT",
  "2025-12 - FORNECIMENTO DE 1 PLATAFORMA ELEVATÓRIA E 2 OPERADORES DE PEMT",
  "2025-13 - FORNECIMENTO DE 1 PLATAFORMA ELEVATÓRIA E 2 OPERADORES DE PEMT",
  "2025-15 - IMPLATAÇÃO DE SISTEMA ANTI-RASGO",
  "2025-17 - APOIO PARA PATIO DE MONTAGEM",
  "2025-18 - CESSÃO DE MÃO DE OBRA PARA OPERAÇÃO",
  "2025-20 - APOIO À GD",
  "2025-21 - EQUIPAMENTOS A DISPOSIÇÃO",
  "2025-22 - DIQUE DE INSPEÇÃO VEICULAR",
  "2025-23 - REPOTENCIAMENTO DO CARRO TENSOR DO MSR SISTEMA 03",
  "2025-27 - EQUIPE DE MOBILIZAÇÃO E DESMOBILIZAÇÃO",
  "2025-33 - DESMONTAGEM PLANTAS MÓVEIS 3 E 4 (3X3)",
  "2025-33.1 - DESMONTAGEM PLANTAS MÓVEIS 3 E 4 (ADM)",
  "2025-36 - PC8000",
  "2025-37 - ELIMINAÇÃO DE PENDÊNCIAS - MINA",
  "2025-38 - CANTEIRO CENTRAL - CMP / CKTR",
  "2025-39 - TROCA DO CHUTE DE UNDER NA ÁREA 2012",
  "2025-40 - FORNECIMENTO DE 02 GERADOR",
  "2025-44 - MONTAGEM DAS PLANTAS MÓVEIS 1 E 2 - NOVO LOCAL",
  "2025-45 - INSTALAÇÃO DE HIDRANTES",
  "2025-46",
  "2025-47 - CARTA DE CESSÃO PLANTAS MÓVEIS 1 E 2",
  "2025-48 - ORNAMENTAÇÃO VILA DAS CONTRATADAS",
  "2025-49 - REPOTENCIAMENTO DOS TAMBORES TCLD",
  "2025-50 - ILUMINAÇÃO",
  "2025-52 - CESSÃO DE MÃO DE OBRA",
  "2025-51 - FABRICAÇÃO DE RAMPA DE ACESSO GEIPSS"
];


export const projectAreas: ProjectArea[] = [
  {
    "code": "00",
    "label": "ÁREA 00 - GERAL",
    "subareas": [
      {
        "code": "0000KS",
        "label": "0000KS - MINA - USINA"
      },
      {
        "code": "0010KS",
        "label": "0010KS - LIVRE"
      },
      {
        "code": "0020KS",
        "label": "0020KS - LIVRE"
      },
      {
        "code": "0030KS",
        "label": "0030KS - LIVRE"
      },
      {
        "code": "0040KS",
        "label": "0040KS - LIVRE"
      },
      {
        "code": "0050KS",
        "label": "0050KS - LIVRE"
      },
      {
        "code": "0060KS",
        "label": "0060KS - LIVRE"
      },
      {
        "code": "0070KS",
        "label": "0070KS - LIVRE"
      },
      {
        "code": "0080KS",
        "label": "0080KS - LIVRE"
      },
      {
        "code": "0090KS",
        "label": "0090KS - LIVRE"
      }
    ]
  },
  {
    "code": "04",
    "label": "ÁREA 04 - PLANTAS DE APOIO",
    "subareas": [
      {
        "code": "0400KS",
        "label": "0400KS - GERAL"
      },
      {
        "code": "0410KS",
        "label": "0410KS - PLANTA DE AREIA ARTIFICIAL E BRITA"
      },
      {
        "code": "0420KS",
        "label": "0420KS - LIVRE"
      },
      {
        "code": "0430KS",
        "label": "0430KS - CONSTRUÇÕES PROVISÓRIAS PARA A MINA"
      },
      {
        "code": "0440KS",
        "label": "0440KS - LIVRE"
      },
      {
        "code": "0450KS",
        "label": "0450KS - LIVRE"
      },
      {
        "code": "0460KS",
        "label": "0460KS - CONSTRUÇÕES PROVISÓRIAS EM SÃO LUIS"
      },
      {
        "code": "0470KS",
        "label": "0470KS - LIVRE"
      },
      {
        "code": "0480KS",
        "label": "0480KS - LIVRE"
      },
      {
        "code": "0490KS",
        "label": "0490KS - LIVRE"
      }
    ]
  },
  {
    "code": "05",
    "label": "ÁREA 05 - SUPORTE A COMUNIDADES LOCAIS",
    "subareas": [
      {
        "code": "0500KS",
        "label": "0500KS - GERAL"
      },
      {
        "code": "0510KS",
        "label": "0510KS - MELHORIAS NA INFRAESTRUTURA DE COMUNIDADES LOCAIS"
      },
      {
        "code": "0520KS",
        "label": "0520KS - CENTRO DE TREINAMENTO PARA EQUIPE DE CONSTRUÇÃO"
      },
      {
        "code": "0530KS",
        "label": "0530KS - RELOCAÇÃO DA CIDADE EXISTENTE"
      },
      {
        "code": "0540KS",
        "label": "0540KS - OUTROS"
      }
    ]
  },
  {
    "code": "08",
    "label": "ÁREA 08 - TRABALHOS DE RESTAURAÇÃO",
    "subareas": [
      {
        "code": "0800KS",
        "label": "0800KS - GERAL"
      },
      {
        "code": "0810KS",
        "label": "0810KS - RESTAURAÇÃO DE ÁREAS PROVISÓRIAS DE CONSTRUÇÃO"
      },
      {
        "code": "0820KS",
        "label": "0820KS - LIVRE"
      },
      {
        "code": "0830KS",
        "label": "0830KS - LIVRE"
      },
      {
        "code": "0840KS",
        "label": "0840KS - LIVRE"
      },
      {
        "code": "0850KS",
        "label": "0850KS - LIVRE"
      },
      {
        "code": "0860KS",
        "label": "0860KS - LIVRE"
      },
      {
        "code": "0870KS",
        "label": "0870KS - LIVRE"
      },
      {
        "code": "0880KS",
        "label": "0880KS - LIVRE"
      },
      {
        "code": "0890KS",
        "label": "0890KS - LIVRE"
      }
    ]
  },
  {
    "code": "10",
    "label": "ÁREA 10 - MINA",
    "subareas": [
      {
        "code": "1000KS",
        "label": "1000KS - GERAL"
      },
      {
        "code": "1005KS",
        "label": "1005KS - SUBESTAÇÃO"
      },
      {
        "code": "1010KS",
        "label": "1010KS - ÁREAS DE LAVRA – GERAL"
      },
      {
        "code": "1011KS",
        "label": "1011KS - ÁREAS DE LAVRA – SISTEMA DE PERFURAÇÃO - DESMONTE"
      },
      {
        "code": "1012KS",
        "label": "1012KS - ÁREAS DE LAVRA – SISTEMA DE CARREGAMENTO"
      },
      {
        "code": "1013KS",
        "label": "1013KS - ÁREAS DE LAVRA – SISTEMA DE ESCAVAÇÃO"
      },
      {
        "code": "1014KS",
        "label": "1014KS - ÁREAS DE LAVRA – SISTEMA DE TRANSPORTE"
      },
      {
        "code": "1015KS",
        "label": "1015KS - TERRAPLANAGEM DE GRANDE PORTE"
      },
      {
        "code": "1016KS",
        "label": "1016KS - ÁREAS DE LAVRA - DRENAGEM"
      },
      {
        "code": "1017KS",
        "label": "1017KS - ESCRITÓRIO AVANÇADO DE MINA"
      },
      {
        "code": "1020KS",
        "label": "1020KS - ARMAZÉM DE EXPLOSIVOS"
      },
      {
        "code": "1021KS",
        "label": "1021KS - FÁBRICA DE EXPLOSIVOS"
      },
      {
        "code": "1030KS",
        "label": "1030KS - ÁREAS DE LAVRA – SISTEMA DE INFRAESTRUTURA"
      },
      {
        "code": "1040KS",
        "label": "1040KS - GALPAO DE TESTEMUNHO"
      },
      {
        "code": "1050KS",
        "label": "1050KS - OFICINA DE HIDROGEOLOGIA"
      },
      {
        "code": "1057KS",
        "label": "1057KS - ARMAZÉM"
      },
      {
        "code": "1060KS",
        "label": "1060KS - REFEITÓRIO MINA"
      },
      {
        "code": "1070KS",
        "label": "1070KS - OFICINA DE MANUTENÇÃO DE EQUIPAMENTOS MÓVEIS"
      },
      {
        "code": "1071KS",
        "label": "1071KS - POSTO DE LAVAGEM"
      },
      {
        "code": "1072KS",
        "label": "1072KS - MANUTENÇÃO DE PNEUS"
      },
      {
        "code": "1073KS",
        "label": "1073KS - POSTO DE ABASTECIMENTO"
      },
      {
        "code": "1074KS",
        "label": "1074KS - SISTEMA DE ESTOCAGEM E DISTRIBUIÇÃO DE LUBRIFICANTES"
      },
      {
        "code": "1075KS",
        "label": "1075KS - ÁREA DE MONTAGEM DE EQUIPAMENTOS MÓVEIS"
      },
      {
        "code": "1076KS",
        "label": "1076KS - OFICINA DE USINAGEM E CALDEIRARIA"
      },
      {
        "code": "1077KS",
        "label": "1077KS - OFICINA DE AFIAÇÃO DE BITS"
      },
      {
        "code": "1078KS",
        "label": "1078KS - OFICINA DE SINALIZAÇÃO"
      },
      {
        "code": "1079KS",
        "label": "1079KS - OFICINA COMPONENTES TRACKSHIFT"
      },
      {
        "code": "1080KS",
        "label": "1080KS - BRITAGEM PRIMÁRIA – MÓVEL"
      },
      {
        "code": "1081KS",
        "label": "1081KS - SISTEMA PARA TRANSPORTADORES DE MINA – INPI"
      },
      {
        "code": "1082KS",
        "label": "1082KS - TRANSPORTADORES DE CONEXÃO E CASA DE TRANSFERÊNCIA"
      },
      {
        "code": "1083KS",
        "label": "1083KS - SISTEMA DE REJEITO"
      },
      {
        "code": "1084KS",
        "label": "1084KS - SISTEMA PARA CANGA ESTRUTURAL"
      },
      {
        "code": "1085KS",
        "label": "1085KS - SISTEMA PARA MINÉRIO"
      },
      {
        "code": "1086KS",
        "label": "1086KS - SISTEMA DE RELOCAÇÃO DE TRANSPORTADORES"
      },
      {
        "code": "1087KS",
        "label": "1087KS - PILHA DE ESTÉRIL E CANGA ESTRUTURAL"
      },
      {
        "code": "1088KS",
        "label": "1088KS - EQUIPAMENTOS SLM/SME - TRUCKLESS"
      },
      {
        "code": "1089KS",
        "label": "1089KS - MANUSEIO ESTÉRIL ARGILOSO"
      },
      {
        "code": "1090KS",
        "label": "1090KS - GERAL-INSTALAÇÕES DE APOIO CORPO C (DESATIVADO)"
      },
      {
        "code": "1091KS",
        "label": "1091KS - BRITAGEM PRIMÁRIA PARA COMPACTOS CORPO D"
      },
      {
        "code": "1092KS",
        "label": "1092KS - BRITAGEM SECUNDÁRIA PARA COMPACTOS CORPO D"
      },
      {
        "code": "1093KS",
        "label": "1093KS - INSTALAÇÕES DE APOIO - BRITAGEM DE COMPACTOS"
      },
      {
        "code": "1094KS",
        "label": "1094KS - 6ª BRITAGEM"
      },
      {
        "code": "1095KS",
        "label": "1095KS - TRANSPORTADORES DE CONEXÃO CORPO C (DESATIVADO)"
      },
      {
        "code": "1096KS",
        "label": "1096KS - BRITAGEM PRIMÁRIA PARA COMPACTOS CORPO C (DESATIVADO)"
      },
      {
        "code": "1097KS",
        "label": "1097KS - BRITAGEM SECUNDÁRIA PARA COMPACTOS CORPO C"
      },
      {
        "code": "1098KS",
        "label": "1098KS - TCLD’S CORPO C (DESATIVADO)"
      }
    ]
  },
  {
    "code": "11",
    "label": "ÁREA 11 - MINA - CORPO C",
    "subareas": [
      {
        "code": "1100KS",
        "label": "1100KS - GERAL"
      },
      {
        "code": "1105KS",
        "label": "1105KS - TRANSPORTADORES DE CONEXAO-MINA"
      },
      {
        "code": "1110KS",
        "label": "1110KS - BRITAGENS-GERAL"
      },
      {
        "code": "1111KS",
        "label": "1111KS - BRITAGEM PRIMARIA PARA COMPACTOS"
      },
      {
        "code": "1112KS",
        "label": "1112KS - BRITAGEM SECUNDARIA PARA COMPACTOS"
      },
      {
        "code": "1113KS",
        "label": "1113KS - BRITAGEM PRIMÁRIA PARA FRIÁVEL"
      },
      {
        "code": "1114KS",
        "label": "1114KS - BRITAGEM PRIMÁRIA PARA ARGILOS"
      },
      {
        "code": "1115KS",
        "label": "1115KS - INSTALACOES DE APOIO – BRITAGEM DE COMPACTOS"
      },
      {
        "code": "1120KS",
        "label": "1120KS - PILHA PULMAO"
      },
      {
        "code": "1130KS",
        "label": "1130KS - TRANSPORTADORES DE LONGA DISTÂNCIA - TCLDs"
      },
      {
        "code": "1140KS",
        "label": "1140KS - SISTEMA DE REAGENTES"
      },
      {
        "code": "1150KS",
        "label": "1150KS - APOIO – MANUTENÇÃO – GERAL"
      },
      {
        "code": "1151KS",
        "label": "1151KS - OFICINA DE VEÍCULOS PESADOS"
      },
      {
        "code": "1152KS",
        "label": "1152KS - OFICINA DE MANUTENÇÃO"
      },
      {
        "code": "1153KS",
        "label": "1153KS - OFICINA MECÂNICA"
      },
      {
        "code": "1154KS",
        "label": "1154KS - CALDEIRARIA"
      },
      {
        "code": "1155KS",
        "label": "1155KS - MANUTENÇÃO DE PNEUS – DEPÓSITO DE PNEUS"
      },
      {
        "code": "1156KS",
        "label": "1156KS - DEPÓSITO DE GASES, TAMBORES E LUBRIFICANTES"
      },
      {
        "code": "1157KS",
        "label": "1157KS - ARMAZÉM – CORPO C"
      },
      {
        "code": "1158KS",
        "label": "1158KS - LAVADOR DE VEÍCULOS PESADOS"
      },
      {
        "code": "1170KS",
        "label": "1170KS - APOIO ADMINISTRATIVO - GERAL"
      },
      {
        "code": "1171KS",
        "label": "1171KS - RESTAURANTE"
      },
      {
        "code": "1172KS",
        "label": "1172KS - ESCRITÓRIO ADM - VESTIÁRIO"
      },
      {
        "code": "1173KS",
        "label": "1173KS - RODOVIÁRIA"
      },
      {
        "code": "1174KS",
        "label": "1174KS - BRIGADA DE INCÊNDIO"
      },
      {
        "code": "1175KS",
        "label": "1175KS - AMBULATÓRIO"
      },
      {
        "code": "1176KS",
        "label": "1176KS - HELIPONTO"
      },
      {
        "code": "1177KS",
        "label": "1177KS - MIRANTE"
      },
      {
        "code": "1180KS",
        "label": "1180KS - UTILIDADES – GERAL"
      },
      {
        "code": "1181KS",
        "label": "1181KS - SISTEMA DE ÁGUA BRUTA E INDUSTRIAL"
      },
      {
        "code": "1182KS",
        "label": "1182KS - ETA – ESTAÇÃO DE TRATAMENTO DE ÁGUA"
      },
      {
        "code": "1183KS",
        "label": "1183KS - ETAP – ESTAÇÃO DE TRATAMENTO DE ÁGUA PLUVIAIS"
      },
      {
        "code": "1184KS",
        "label": "1184KS - SISTEMA DE UMECTAÇÃO DE VIAS"
      },
      {
        "code": "1185KS",
        "label": "1185KS - SISTEMA DE COMBATE A INCÊNDIOS"
      },
      {
        "code": "1186KS",
        "label": "1186KS - POSTO DE ABASTECIMENTO"
      },
      {
        "code": "1190KS",
        "label": "1190KS - SISTEMA DE CONTROLE AMBIENTAL – GERAL"
      },
      {
        "code": "1191KS",
        "label": "1191KS - ETEQ – ESTAÇÃO DE TRATAMENTO DE EFLUENTES QUÍMICOS"
      },
      {
        "code": "1192KS",
        "label": "1192KS - ETE – ESTACÇÃO DE TRATAMENTO DE ESGOTO"
      },
      {
        "code": "1193KS",
        "label": "1193KS - CMD – CENTRO DE MATERIAIS DESCARTÁVEIS"
      },
      {
        "code": "1194KS",
        "label": "1194KS - ÁREA DE RESGATE DE FAUNA"
      }
    ]
  },
  {
    "code": "12",
    "label": "ÁREA 12 - MINA - S16",
    "subareas": [
      {
        "code": "1200KS",
        "label": "1200KS - GERAL"
      },
      {
        "code": "1205KS",
        "label": "1205KS - VAGO"
      },
      {
        "code": "1210KS",
        "label": "1210KS - VAGO"
      },
      {
        "code": "1211KS",
        "label": "1211KS - BRITAGEM PRIMARIA"
      },
      {
        "code": "1212KS",
        "label": "1212KS - BRITAGEM SECUNDARIA"
      },
      {
        "code": "1213KS",
        "label": "1213KS - BRITAGEM PARA ARGILOSO"
      },
      {
        "code": "1215KS",
        "label": "1215KS - INSTALACOES DE APOIO – BRITAGENS"
      },
      {
        "code": "1220KS",
        "label": "1220KS - PILHA PULMAO"
      },
      {
        "code": "1230KS",
        "label": "1230KS - VAGO"
      },
      {
        "code": "1240KS",
        "label": "1240KS - SISTEMA DE REAGENTES"
      },
      {
        "code": "1250KS",
        "label": "1250KS - APOIO – MANUTENÇÃO – GERAL"
      },
      {
        "code": "1251KS",
        "label": "1251KS - OFICINA DE VEÍCULOS PESADOS"
      },
      {
        "code": "1252KS",
        "label": "1252KS - OFICINA DE MANUTENÇÃO"
      },
      {
        "code": "1253KS",
        "label": "1253KS - OFICINA MECÂNICA"
      },
      {
        "code": "1254KS",
        "label": "1254KS - CALDEIRARIA"
      },
      {
        "code": "1255KS",
        "label": "1255KS - MANUTENÇÃO DE PNEUS – DEPÓSITO DE PNEUS"
      },
      {
        "code": "1256KS",
        "label": "1256KS - DEPÓSITO DE GASES, TAMBORES E LUBRIFICANTES"
      },
      {
        "code": "1257KS",
        "label": "1257KS - VAGO"
      },
      {
        "code": "1258KS",
        "label": "1258KS - LAVADOR DE VEÍCULOS PESADOS"
      },
      {
        "code": "1270KS",
        "label": "1270KS - APOIO ADMINISTRATIVO - GERAL"
      },
      {
        "code": "1271KS",
        "label": "1271KS - REFEITÓRIO"
      },
      {
        "code": "1272KS",
        "label": "1272KS - ESCRITÓRIO ADM - VESTIÁRIO"
      },
      {
        "code": "1273KS",
        "label": "1273KS - RODOVIÁRIA"
      },
      {
        "code": "1274KS",
        "label": "1274KS - BRIGADA DE INCÊNDIO"
      },
      {
        "code": "1275KS",
        "label": "1275KS - AMBULATÓRIO"
      },
      {
        "code": "1276KS",
        "label": "1276KS - HELIPONTO"
      },
      {
        "code": "1277KS",
        "label": "1277KS - MIRANTE"
      },
      {
        "code": "1280KS",
        "label": "1280KS - UTILIDADES – GERAL"
      },
      {
        "code": "1281KS",
        "label": "1281KS - SISTEMA DE ÁGUA BRUTA E INDUSTRIAL"
      },
      {
        "code": "1282KS",
        "label": "1282KS - ETA – ESTAÇÃO DE TRATAMENTO DE ÁGUA"
      },
      {
        "code": "1283KS",
        "label": "1283KS - ETAP – ESTAÇÃO DE TRATAMENTO DE ÁGUA PLUVIAIS"
      },
      {
        "code": "1284KS",
        "label": "1284KS - SISTEMA DE UMECTAÇÃO DE VIAS"
      },
      {
        "code": "1285KS",
        "label": "1285KS - SISTEMA DE COMBATE A INCÊNDIOS"
      },
      {
        "code": "1286KS",
        "label": "1286KS - POSTO DE ABASTECIMENTO"
      },
      {
        "code": "1290KS",
        "label": "1290KS - SISTEMA DE CONTROLE AMBIENTAL – GERAL"
      },
      {
        "code": "1291KS",
        "label": "1291KS - ETEQ – ESTAÇÃO DE TRATAMENTO DE EFLUENTES QUÍMICOS"
      },
      {
        "code": "1292KS",
        "label": "1292KS - ETE – ESTACÇÃO DE TRATAMENTO DE ESGOTO"
      },
      {
        "code": "1293KS",
        "label": "1293KS - CMD – CENTRO DE MATERIAIS DESCARTÁVEIS"
      },
      {
        "code": "1294KS",
        "label": "1294KS - ÁREA DE RESGATE DE FAUNA"
      }
    ]
  },
  {
    "code": "20",
    "label": "ÁREA 20 - USINA DE BENEFICIAMENTO",
    "subareas": [
      {
        "code": "2000KS",
        "label": "2000KS - GERAL"
      },
      {
        "code": "2010KS",
        "label": "2010KS - BSM’s I, II e III"
      },
      {
        "code": "2011KS",
        "label": "2011KS - TCLD’s E PILHAS DE REGULARIZAÇÃO DA ALIMENTAÇÃO DOS"
      },
      {
        "code": "2012KS",
        "label": "2012KS - BRITAGEM SECUNDÁRIA"
      },
      {
        "code": "2013KS",
        "label": "2013KS - BRITAGEM TERCIÁRIA"
      },
      {
        "code": "2014KS",
        "label": "2014KS - BRITAGEM QUATERNÁRIA (DESATIVADO)"
      },
      {
        "code": "2020KS",
        "label": "2020KS - PÁTIO DE REGULARIZAÇÃO"
      },
      {
        "code": "2025KS",
        "label": "2025KS - SILO DE REGULARIZAÇÃO (DESATIVADO)"
      },
      {
        "code": "2026KS",
        "label": "2026KS - AMOSTRAGEM DE ROM BRITADO"
      },
      {
        "code": "2030KS",
        "label": "2030KS - LIVRE"
      },
      {
        "code": "2031KS",
        "label": "2031KS - PENEIRAMENTO PRIMÁRIO"
      },
      {
        "code": "2032KS",
        "label": "2032KS - PENEIRAMENTO SECUNDÁRIO"
      },
      {
        "code": "2033KS",
        "label": "2033KS - PENEIRAMENTO TERCIÁRIO (DESATIVADO)"
      },
      {
        "code": "2035KS",
        "label": "2035KS - PENEIRAMENTO DE ALTA FREQUÊNCIA (DESATIVADO)"
      },
      {
        "code": "2036KS",
        "label": "2036KS - CLASSIFICAÇÃO"
      },
      {
        "code": "2040KS",
        "label": "2040KS - MOAGEM (DESATIVADO)"
      },
      {
        "code": "2050KS",
        "label": "2050KS - DESLAMAGEM (DESATIVADO)"
      },
      {
        "code": "2060KS",
        "label": "2060KS - LIVRE"
      },
      {
        "code": "2061KS",
        "label": "2061KS - ESPESSAMENTO DE LAMAS (DESATIVADO)"
      },
      {
        "code": "2062KS",
        "label": "2062KS - ESPESSADOR – ESPESSAMENTO DE PELLET FEED (DESATIVADO)"
      },
      {
        "code": "2063KS",
        "label": "2063KS - FILTRAGEM (DESATIVADO)"
      },
      {
        "code": "2064KS",
        "label": "2064KS - FILTRAGEM DE DISCO – FILTRAGEM DE PELLET FEED"
      },
      {
        "code": "2065KS",
        "label": "2065KS - BOMBEAMENTO DE LAMA (DESATIVADO)"
      },
      {
        "code": "2070KS",
        "label": "2070KS - OFICINA DE MANUTENÇÃO"
      },
      {
        "code": "2071KS",
        "label": "2071KS - POSTO AVANÇADO DE LUBRIFICAÇÃO"
      },
      {
        "code": "2075KS",
        "label": "2075KS - LABORATÓRIO"
      },
      {
        "code": "2080KS",
        "label": "2080KS - AMOSTRAGEM DE PRODUTOS"
      },
      {
        "code": "2090KS",
        "label": "2090KS - LIVRE"
      },
      {
        "code": "2091KS",
        "label": "2091KS - PÁTIO DE ESTOCAGEM DE PRODUTO"
      },
      {
        "code": "2092KS",
        "label": "2092KS - ESTAÇÃO DE CARREGAMENTO"
      },
      {
        "code": "2093KS",
        "label": "2093KS - LIVRE"
      },
      {
        "code": "2095KS",
        "label": "2095KS - ARRUAMENTO INTERNO (DESATIVADO)"
      }
    ]
  },
  {
    "code": "30",
    "label": "ÁREA 30 - INFRAESTRUTURA",
    "subareas": [
      {
        "code": "3062KS",
        "label": "3062KS - e 3063KS"
      },
      {
        "code": "3000KS",
        "label": "3000KS - GERAL"
      },
      {
        "code": "3010KS",
        "label": "3010KS - LIVRE"
      },
      {
        "code": "3011KS",
        "label": "3011KS - LIVRE"
      },
      {
        "code": "3012KS",
        "label": "3012KS - PORTARIA"
      },
      {
        "code": "3013KS",
        "label": "3013KS - ESCRITÓRIO ADMINISTRATIVO"
      },
      {
        "code": "3020KS",
        "label": "3020KS - ÁREA DOS CONTRATADOS"
      },
      {
        "code": "3021KS",
        "label": "3021KS - MELHORIAS DA ESTRADA DE BOM JESUS"
      },
      {
        "code": "3022KS",
        "label": "3022KS - MELHORIAS DA ESTRADA DE CANAA – VS40"
      },
      {
        "code": "3023KS",
        "label": "3023KS - MELHORIAS DA ESTRADA DE VILA FEITOSA ATÉ A USINA"
      },
      {
        "code": "3024KS",
        "label": "3024KS - MELHORIAS DA ESTRADA DO SOSSEGO ATÉ A USINA"
      },
      {
        "code": "3030KS",
        "label": "3030KS - FÁBRICA DE EXPLOSIVOS (DESATIVADO)"
      },
      {
        "code": "3040KS",
        "label": "3040KS - ESTRADA DE ACESSO – CANAÃ DOS CARAJÁS – SITE S11D"
      },
      {
        "code": "3041KS",
        "label": "3041KS - ESTRADA DE ACESSO VILA FEITOSA – CEDERE III - SOSSEGO"
      },
      {
        "code": "3042KS",
        "label": "3042KS - RODOVIA DE ACESSO NORTE"
      },
      {
        "code": "3043KS",
        "label": "3043KS - ACESSO PA150 A CANAÃ DOS CARAJÁS"
      },
      {
        "code": "3050KS",
        "label": "3050KS - CANTEIRO SUDESTE DO PARÁ"
      },
      {
        "code": "3060KS",
        "label": "3060KS - INSTALAÇÕES TEMPORÁRIAS"
      },
      {
        "code": "3061KS",
        "label": "3061KS - ECII/PORTARIA"
      },
      {
        "code": "3063KS",
        "label": "3063KS - CANTEIRO 7 / 8 E ALOJAMENTO SANTA RITA"
      },
      {
        "code": "3064KS",
        "label": "3064KS - ESCRITÓRIO/REFEITÓRIO TEMPORÁRIO - MINA"
      },
      {
        "code": "3070KS",
        "label": "3070KS - LIVRE"
      },
      {
        "code": "3080KS",
        "label": "3080KS - LIVRE"
      },
      {
        "code": "3090KS",
        "label": "3090KS - LIVRE"
      }
    ]
  },
  {
    "code": "40",
    "label": "ÁREA 40 - UTILIDADES",
    "subareas": [
      {
        "code": "4014KS",
        "label": "4014KS - / 4015KS"
      },
      {
        "code": "4000KS",
        "label": "4000KS - GERAL"
      },
      {
        "code": "4011KS",
        "label": "4011KS - SISTEMA DE ÁGUA BRUTA"
      },
      {
        "code": "4012KS",
        "label": "4012KS - ETA E SISTEMA DE ÁGUA POTAVEL"
      },
      {
        "code": "4013KS",
        "label": "4013KS - SISTEMA DE ÁGUA DE INCÊNDIO"
      },
      {
        "code": "4015KS",
        "label": "4015KS - SISTEMA DE ÁGUA INDUSTRIAL - ISBL"
      },
      {
        "code": "4016KS",
        "label": "4016KS - SISTEMA DE ÁGUA RECUPERADA"
      },
      {
        "code": "4020KS",
        "label": "4020KS - ESCRITÓRIO DE APOIO AO PÁTIO – ESTAÇÃO DE TRATAMENTO"
      },
      {
        "code": "4030KS",
        "label": "4030KS - ETA (DESATIVADO)"
      },
      {
        "code": "4040KS",
        "label": "4040KS - SISTEMA DE AR COMPRIMIDO"
      },
      {
        "code": "4045KS",
        "label": "4045KS - SISTEMA DE DRENAGEM PLUVIAL"
      },
      {
        "code": "4050KS",
        "label": "4050KS - SISTEMA DE COMBATE A INCÊNDIO"
      },
      {
        "code": "4060KS",
        "label": "4060KS - SISTEMA DE RECEBIMENTO E ESTOCAGEM DE COMBUSTÍVEL"
      },
      {
        "code": "4070KS",
        "label": "4070KS - LIVRE"
      },
      {
        "code": "4080KS",
        "label": "4080KS - LIVRE"
      },
      {
        "code": "4090KS",
        "label": "4090KS - LIVRE"
      }
    ]
  },
  {
    "code": "50",
    "label": "ÁREA 50 - SISTEMA DE CONTROLE AMBIENTAL",
    "subareas": [
      {
        "code": "5000KS",
        "label": "5000KS - GERAL"
      },
      {
        "code": "5010KS",
        "label": "5010KS - REDE DE ESGOTOS SANITÁRIOS"
      },
      {
        "code": "5020KS",
        "label": "5020KS - ETE – ESTAÇÃO DE TRATAMENTO DE ESGOTO"
      },
      {
        "code": "5025KS",
        "label": "5025KS - FOSSA SÉPTICA"
      },
      {
        "code": "5030KS",
        "label": "5030KS - SISTEMA DEPARADOR DE ÁGUA E ÓLEO"
      },
      {
        "code": "5035KS",
        "label": "5035KS - ETEQ – ESTAÇÃO DE TRATAMENTO DE EFLUENTES QUÍMICOS"
      },
      {
        "code": "5040KS",
        "label": "5040KS - SISTEMA DE DECANTAÇÃO"
      },
      {
        "code": "5041KS",
        "label": "5041KS - DIQUES DE CONTENÇÃO DE SEDIMENTOS"
      },
      {
        "code": "5050KS",
        "label": "5050KS - ATERRO SANITÁRIO"
      },
      {
        "code": "5060KS",
        "label": "5060KS - BARRAGEM DE REJEITO (DESATIVADO)"
      },
      {
        "code": "5070KS",
        "label": "5070KS - VIVEIRO DE MUDAS"
      },
      {
        "code": "5075KS",
        "label": "5075KS - GALPÃO DE INSUMOS E SEMENTES"
      },
      {
        "code": "5080KS",
        "label": "5080KS - DEPÓSITO DE RESÍDUOS SÓLIDOS CLASSE I"
      },
      {
        "code": "5081KS",
        "label": "5081KS - DEPÓSITO DE RESÍDUOS SÓLIDOS CLASSE II"
      },
      {
        "code": "5085KS",
        "label": "5085KS - GALPÃO DE TRIAGEM - COMPOSTAGEM"
      },
      {
        "code": "5090KS",
        "label": "5090KS - APOIO ADMINISTRATIVO DO CMD"
      },
      {
        "code": "5095KS",
        "label": "5095KS - ÁREAS EXTERNAS DO CMD"
      }
    ]
  },
  {
    "code": "60",
    "label": "ÁREA 60 - ENERGIA, AUTOMAÇÃO E TI",
    "subareas": [
      {
        "code": "6000KS",
        "label": "6000KS - GERAL"
      },
      {
        "code": "6010KS",
        "label": "6010KS - LINHA DE TRANSMISSÃO"
      },
      {
        "code": "6011KS",
        "label": "6011KS - LINHA DE TRANSMISSÃO PARA MINA"
      },
      {
        "code": "6020KS",
        "label": "6020KS - SUBESTAÇÃO PRINCIPAL"
      },
      {
        "code": "6021KS",
        "label": "6021KS - SUBESTAÇÃO PRINCIPAL MINA - TRUCKLESS"
      },
      {
        "code": "6022KS",
        "label": "6022KS - SUBESTAÇÃO SECUNDÁRIA"
      },
      {
        "code": "6030KS",
        "label": "6030KS - LINHA DE TRANSMISSÃO - 34-5KV (DESATIVADO)"
      },
      {
        "code": "6040KS",
        "label": "6040KS - SISTEMA DE DISTRIBUIÇÃO DE ENERGIA"
      },
      {
        "code": "6041KS",
        "label": "6041KS - SISTEMA DE DISTRIBUIÇÃO DE ENERGIA PARA MINA - TRUCKLESS"
      },
      {
        "code": "6050KS",
        "label": "6050KS - SISTEMA DE ENERGIA DE EMERGÊNCIA"
      },
      {
        "code": "6060KS",
        "label": "6060KS - TELECOMUNICAÇÃO"
      },
      {
        "code": "6061KS",
        "label": "6061KS - SISTEMA DE COMUNICAÇÃO DE VOZ E DADOS"
      },
      {
        "code": "6062KS",
        "label": "6062KS - SISTEMA DE RADIO COMUNICAÇÃO"
      },
      {
        "code": "6063KS",
        "label": "6063KS - REDE DE TELEFONIA"
      },
      {
        "code": "6065KS",
        "label": "6065KS - SISTEMA DE MONITORAMENTO - CFTV"
      },
      {
        "code": "6070KS",
        "label": "6070KS - AUTOMAÇÃO E CONTROLE"
      },
      {
        "code": "6071KS",
        "label": "6071KS - SISTEMA DE AUTOMAÇÃO E CONTROLE"
      },
      {
        "code": "6080KS",
        "label": "6080KS - LIVRE"
      },
      {
        "code": "6090KS",
        "label": "6090KS - LIVRE"
      }
    ]
  },
  {
    "code": "80",
    "label": "ÁREA 80 - INSTALAÇÕES DE SUPORTE A OPERAÇÃO",
    "subareas": [
      {
        "code": "8050KS",
        "label": "8050KS - - Memorial S11D"
      },
      {
        "code": "8000KS",
        "label": "8000KS - GERAL"
      },
      {
        "code": "8005KS",
        "label": "8005KS - ESCRITÓRIO CENTRAL"
      },
      {
        "code": "8010KS",
        "label": "8010KS - RESTAURANTE CENTRAL"
      },
      {
        "code": "8015KS",
        "label": "8015KS - ESCRITÓRIOS SERVIÇOS GERAIS"
      },
      {
        "code": "8020KS",
        "label": "8020KS - REFEITÓRIO"
      },
      {
        "code": "8025KS",
        "label": "8025KS - CENTRO DE TREINAMENTO"
      },
      {
        "code": "8030KS",
        "label": "8030KS - AMBULATÓRIO"
      },
      {
        "code": "8035KS",
        "label": "8035KS - CORPO DE BOMBEIRO"
      },
      {
        "code": "8040KS",
        "label": "8040KS - PORTARIA PRINCIPAL"
      },
      {
        "code": "8041KS",
        "label": "8041KS - BALANÇA E CONTROLE DA BALANÇA"
      },
      {
        "code": "8042KS",
        "label": "8042KS - CENTRAL DE SERVIÇO"
      },
      {
        "code": "8045KS",
        "label": "8045KS - LIVRE"
      },
      {
        "code": "8060KS",
        "label": "8060KS - ARMAZEM DE PEÇAS MRO"
      },
      {
        "code": "8065KS",
        "label": "8065KS - LIVRE"
      },
      {
        "code": "8070KS",
        "label": "8070KS - ÁREA DE APOIO ADMINISTRATIVO"
      },
      {
        "code": "8080KS",
        "label": "8080KS - HELIPONTO"
      },
      {
        "code": "8090KS",
        "label": "8090KS - AERÓDROMO"
      }
    ]
  }
];
