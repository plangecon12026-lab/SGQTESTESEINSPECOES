export type Revision = {
  id: string;
  revisao: string;
  te: string;
  descricao: string;
  por: string;
  verificador: string;
  aprovador: string;
  autorizador: string;
  data: string;
};

export type ReportPhoto = {
  id: string;
  file: File;
  legenda: string;
  preview: string;
};

export type Situation = {
  id: string;
  numeroSe: string;
  numeroProjeto: string;
  revisaoProjeto: string;
  tituloProjeto: string;
  titulo: string;
  tipoRegistro: string;
  criticidade: string;
  descricaoTecnica: string;
  impacto: string;
  recomendacao: string;
  gerouRetrabalho: string;
  descricaoRetrabalho: string;
  horasRetrabalho: string;
  fotos: ReportPhoto[];
};

export type ReportData = {
  cabecalho: {
    tituloSuperior: string;
    classificacao: string;
    numeroVale: string;
    numeroContratada: string;
    manualSequence?: string;
    revisao: string;
    faseProjeto: string;
    areaProjeto: string;
    subarea: string;
    nomeProjeto: string;
    pepLs: string;
    emissor: string;
  };
  revisoes: Revision[];
  identificacao: {
    data: string;
    tipoAtividade: string;
    areaInspecao: string;
    disciplina: string;
  };
  objetivo: string;
  escopo: string;
  situacoes: Situation[];
  analiseTecnica: string;
  conclusao: string;
};
