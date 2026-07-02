export type UnapCareer = {
  code: string;
  name: string;
};

export const defaultUnapCareerCode = "36";
export const defaultUnapCareerName = "INGENIERÍA MECÁNICA ELÉCTRICA";

export const unapCareers: UnapCareer[] = [
  { code: defaultUnapCareerCode, name: defaultUnapCareerName },
  { code: "07", name: "ADMINISTRACIÓN" },
  { code: "13", name: "ANTROPOLOGÍA" },
  { code: "33", name: "ARQUITECTURA Y URBANISMO" },
  { code: "184", name: "ARQUITECTURA Y URBANISMO - SECCION JULI" },
  { code: "56", name: "ARTE" },
  { code: "195", name: "ARTE: ARTES PLÁSTICAS" },
  { code: "196", name: "ARTE: DANZA" },
  { code: "197", name: "ARTE: MÚSICA" },
  { code: "198", name: "ARTE: TEATRO" },
  { code: "15", name: "BIOLOGÍA" },
  { code: "188", name: "BIOLOGÍA: ECOLOGÍA" },
  { code: "189", name: "BIOLOGÍA: MICROBIOLOGÍA Y LABORATORIO CLÍNICO" },
  { code: "190", name: "BIOLOGÍA: PESQUERÍA" },
  { code: "06", name: "CIENCIAS CONTABLES" },
  { code: "183", name: "CIENCIAS CONTABLES - SECCION JULI" },
  { code: "14", name: "CIENCIAS DE LA COMUNICACIÓN SOCIAL" },
  { code: "34", name: "CIENCIAS FÍSICO MATEMÁTICAS" },
  { code: "199", name: "CIENCIAS FÍSICO MATEMÁTICAS: FÍSICA" },
  { code: "200", name: "CIENCIAS FÍSICO MATEMÁTICAS: MATEMÁTICAS" },
  { code: "25", name: "DERECHO" },
  { code: "18", name: "EDUCACIÓN FÍSICA" },
  { code: "21", name: "EDUCACIÓN INICIAL" },
  { code: "20", name: "EDUCACIÓN PRIMARIA" },
  { code: "17", name: "EDUCACIÓN SECUNDARIA (LETRAS)" },
  { code: "16", name: "EDUCACIÓN SECUNDARIA (CIENCIAS)" },
  {
    code: "191",
    name: "EDUCACIÓN SECUNDARIA DE LA ESPECIALIDAD DE CIENCIA, TECNOLOGÍA Y AMBIENTE"
  },
  { code: "192", name: "EDUCACIÓN SECUNDARIA DE LA ESPECIALIDAD DE CIENCIAS SOCIALES" },
  {
    code: "193",
    name: "EDUCACIÓN SECUNDARIA DE LA ESPECIALIDAD DE LENGUA, LITERATURA, PSICOLOGÍA Y FILOSOFÍA"
  },
  {
    code: "194",
    name: "EDUCACIÓN SECUNDARIA DE LA ESPECIALIDAD DE MATEMÁTICA, FÍSICA, COMPUTACIÓN E INFORMÁTICA"
  },
  { code: "08", name: "ENFERMERÍA" },
  { code: "35", name: "INGENIERÍA AGRÍCOLA" },
  { code: "02", name: "INGENIERÍA AGROINDUSTRIAL" },
  { code: "185", name: "INGENIERIA AGROINDUSTRIAL - SECCION JULI" },
  { code: "01", name: "INGENIERÍA AGRONÓMICA" },
  { code: "32", name: "INGENIERÍA CIVIL" },
  { code: "201", name: "INGENIERÍA DE INTELIGENCIA ARTIFICIAL Y CIENCIA DE DATOS" },
  { code: "10", name: "INGENIERÍA DE MINAS" },
  { code: "181", name: "INGENIERIA DE MINAS - SECCION AZANGARO" },
  { code: "23", name: "INGENIERÍA DE SISTEMAS" },
  { code: "182", name: "INGENIERIA DE TELECOMUNICACIONES - SECCION AZANGARO" },
  { code: "05", name: "INGENIERÍA ECONÓMICA" },
  { code: "180", name: "INGENIERIA ECONÓMICA - SECCION AZANGARO" },
  { code: "24", name: "INGENIERÍA ELECTRÓNICA" },
  { code: "22", name: "INGENIERÍA ESTADÍSTICA E INFORMÁTICA" },
  { code: "31", name: "INGENIERÍA GEOLÓGICA" },
  { code: "30", name: "INGENIERÍA METALÚRGICA" },
  { code: "26", name: "INGENIERÍA QUÍMICA" },
  { code: "03", name: "INGENIERÍA TOPOGRÁFICA Y AGRIMENSURA" },
  { code: "27", name: "MEDICINA HUMANA" },
  { code: "04", name: "MEDICINA VETERINARIA Y ZOOTECNIA" },
  { code: "28", name: "NUTRICIÓN HUMANA" },
  { code: "29", name: "ODONTOLOGÍA" },
  { code: "178", name: "PSICOLOGIA" },
  { code: "19", name: "PROFESIONALIZACION DOCENTE" },
  { code: "11", name: "SOCIOLOGÍA" },
  { code: "09", name: "TRABAJO SOCIAL" },
  { code: "12", name: "TURISMO" }
];

const careersByCode = new Map(unapCareers.map((career) => [career.code, career]));

export function findUnapCareerByCode(code: string) {
  return careersByCode.get(code.trim()) ?? null;
}

export function isKnownUnapCareerCode(code: string) {
  return Boolean(findUnapCareerByCode(code));
}
