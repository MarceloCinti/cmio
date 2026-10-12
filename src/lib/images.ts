// Imágenes ilustrativas de la landing page. Ninguna corresponde a instalaciones ni a
// personal del CMIO: son fotografías de banco de imágenes con licencia de uso comercial.
// Licencia Pexels: https://www.pexels.com/license/ (uso gratuito, comercial, sin
// atribución obligatoria; no se debe sugerir que las personas retratadas respaldan
// a la clínica ni mostrarlas de forma ofensiva).

export type StockImage = {
  path: string;
  alt: string;
  author: string;
  sourceUrl: string;
  license: "Pexels";
  width: number;
  height: number;
};

export const STOCK_IMAGES = {
  consultaMedica: {
    path: "/images/consulta-medica.jpg",
    alt: "Médica sonriente conversando con un paciente en un consultorio luminoso",
    author: "cottonbro studio",
    sourceUrl: "https://www.pexels.com/photo/a-doctor-talking-the-patient-7579831/",
    license: "Pexels",
    width: 2000,
    height: 1333,
  },
  equipoMultidisciplinario: {
    path: "/images/equipo-multidisciplinario.jpg",
    alt: "Dos profesionales de la salud conversan con dos pacientes en un consultorio moderno",
    author: "Pavel Danilyuk",
    sourceUrl: "https://www.pexels.com/photo/a-couple-sitting-at-a-doctor-s-clinic-7108332/",
    license: "Pexels",
    width: 1600,
    height: 1068,
  },
  nutricion: {
    path: "/images/nutricion.jpg",
    alt: "Profesional de nutrición escribe un plan de alimentación junto a frutas frescas",
    author: "beyzahzah",
    sourceUrl: "https://www.pexels.com/photo/a-doctor-writing-on-a-clipboard-15319040/",
    license: "Pexels",
    width: 1400,
    height: 1179,
  },
  clinicaMedica: {
    path: "/images/clinica-medica.jpg",
    alt: "Médico conversa con una paciente en su escritorio durante una consulta",
    author: "Lucas Guimarães Bueno",
    sourceUrl: "https://www.pexels.com/photo/doctor-talking-with-woman-in-white-long-sleeve-shirt-12599544/",
    license: "Pexels",
    width: 1400,
    height: 756,
  },
  endocrinologia: {
    path: "/images/endocrinologia.jpg",
    alt: "Médica revisa con un paciente los resultados de sus análisis",
    author: "cottonbro studio",
    sourceUrl: "https://www.pexels.com/photo/a-doctor-sitting-at-a-desk-7578797/",
    license: "Pexels",
    width: 1400,
    height: 2100,
  },
  cardiologia: {
    path: "/images/cardiologia.jpg",
    alt: "Profesional de la salud mide la presión arterial de un paciente",
    author: "Pavel Danilyuk",
    sourceUrl:
      "https://www.pexels.com/photo/a-healthcare-worker-measuring-a-patient-s-blood-pressure-using-a-sphygmomanometer-7108344/",
    license: "Pexels",
    width: 1400,
    height: 935,
  },
  cirugiaBariatrica: {
    path: "/images/cirugia-bariatrica.jpg",
    alt: "Equipo quirúrgico con ropa de quirófano preparado en una sala de operaciones",
    author: "Zakir Rushanly",
    sourceUrl: "https://www.pexels.com/photo/doctors-and-nurses-inside-the-operating-room-11661517/",
    license: "Pexels",
    width: 1400,
    height: 933,
  },
  ecografia: {
    path: "/images/ecografia.jpg",
    alt: "Equipo de ecografía con su pantalla y panel de control durante un estudio",
    author: "MART PRODUCTION",
    sourceUrl: "https://www.pexels.com/photo/photo-of-person-using-ultrasound-scan-7088491/",
    license: "Pexels",
    width: 1400,
    height: 933,
  },
  laboratorio: {
    path: "/images/laboratorio.jpg",
    alt: "Tubos de muestras de laboratorio identificados con códigos de barras",
    author: "Charlie-Helen Robinson",
    sourceUrl: "https://www.pexels.com/photo/blood-samples-in-test-tubes-6622519/",
    license: "Pexels",
    width: 1400,
    height: 788,
  },
  electrocardiograma: {
    path: "/images/electrocardiograma.jpg",
    alt: "Cables de un electrocardiógrafo sobre el trazado impreso de un electrocardiograma",
    author: "Marta Branco",
    sourceUrl: "https://www.pexels.com/photo/detailed-ecg-leads-on-heart-monitor-printout-28585011/",
    license: "Pexels",
    width: 1400,
    height: 933,
  },
  alimentacionSaludable: {
    path: "/images/alimentacion-saludable.jpg",
    alt: "Verduras, frutas frescas y un libro de recetas sobre una mesa",
    author: "Yaroslav Shuraev",
    sourceUrl: "https://www.pexels.com/photo/fresh-vegetables-and-fruits-on-the-table-8844888/",
    license: "Pexels",
    width: 1800,
    height: 1200,
  },
  evaluacionNutricional: {
    path: "/images/evaluacion-nutricional.jpg",
    alt: "Platos con frutas y verduras variadas vistos desde arriba",
    author: "Vanessa Loring",
    sourceUrl: "https://www.pexels.com/photo/top-view-of-plates-full-of-fruits-and-vegetables-5966430/",
    license: "Pexels",
    width: 1400,
    height: 933,
  },
  seguimiento: {
    path: "/images/seguimiento.jpg",
    alt: "Médica controla la presión arterial de un paciente acompañado durante una consulta de seguimiento",
    author: "Pavel Danilyuk",
    sourceUrl: "https://www.pexels.com/photo/a-doctor-checking-the-blood-pressure-of-her-patient-7108348/",
    license: "Pexels",
    width: 1400,
    height: 935,
  },
} satisfies Record<string, StockImage>;

export const STOCK_IMAGE_LIST: StockImage[] = Object.values(STOCK_IMAGES);

export function stockImageByPath(path: string | null | undefined): StockImage | undefined {
  if (!path) return undefined;
  return STOCK_IMAGE_LIST.find((i) => i.path === path);
}
