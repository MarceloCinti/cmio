// Datos iniciales del catálogo. Las especialidades fueron provistas por la clínica.
// Los estudios y servicios complementarios quedan "pendientes de confirmación" hasta que
// un administrador confirme que la clínica efectivamente los ofrece.

import type { ServiceCategory } from "../src/generated/prisma/client";
import { STOCK_IMAGES } from "../src/lib/images";

export const SPECIALTIES = [
  {
    slug: "nutricion",
    name: "Nutrición",
    summary: "Evaluación del estado nutricional y planes de alimentación personalizados y sostenibles.",
    description:
      "La consulta de nutrición evalúa hábitos, preferencias y estado nutricional para construir, junto al paciente, un plan de alimentación realista y adaptado a sus necesidades y a las indicaciones del equipo médico.",
    image: STOCK_IMAGES.nutricion,
    sortOrder: 1,
  },
  {
    slug: "clinica-medica",
    name: "Clínica médica",
    summary: "Evaluación general de la salud y coordinación del abordaje integral.",
    description:
      "La clínica médica realiza la evaluación general del paciente, identifica factores de riesgo y enfermedades asociadas, y coordina las interconsultas necesarias con las demás especialidades.",
    image: STOCK_IMAGES.clinicaMedica,
    sortOrder: 2,
  },
  {
    slug: "endocrinologia",
    name: "Endocrinología",
    summary: "Estudio y tratamiento de alteraciones hormonales y metabólicas.",
    description:
      "La endocrinología evalúa y acompaña alteraciones hormonales y metabólicas que pueden estar relacionadas con el peso, como las de la glucosa, la tiroides o los lípidos.",
    image: STOCK_IMAGES.endocrinologia,
    sortOrder: 3,
  },
  {
    slug: "cardiologia",
    name: "Cardiología",
    summary: "Evaluación de la salud cardiovascular y control de factores de riesgo.",
    description:
      "La cardiología evalúa el corazón y el sistema circulatorio, y acompaña el control de factores de riesgo cardiovascular como la presión arterial.",
    image: STOCK_IMAGES.cardiologia,
    sortOrder: 4,
  },
  {
    slug: "cirugia-bariatrica-y-metabolica",
    name: "Cirugía bariátrica y metabólica",
    summary: "Evaluación de opciones quirúrgicas cuando están indicadas, con seguimiento del equipo.",
    description:
      "La consulta de cirugía bariátrica y metabólica evalúa, junto al equipo multidisciplinario, si una alternativa quirúrgica es adecuada para cada paciente, y explica sus requisitos, beneficios, riesgos y el seguimiento necesario.",
    image: STOCK_IMAGES.cirugiaBariatrica,
    sortOrder: 5,
  },
] as const;

type ServiceSeed = {
  slug: string;
  name: string;
  summary: string;
  description: string;
  category: ServiceCategory;
  specialtySlug?: string;
  durationMinutes: number;
  confirmed: boolean;
  image?: { path: string; alt: string };
  sortOrder: number;
};

export const SERVICES: ServiceSeed[] = [
  {
    slug: "consulta-nutricion",
    name: "Consulta de nutrición",
    summary: "Evaluación nutricional y plan de alimentación.",
    description: "Consulta con profesional de nutrición para evaluar hábitos y definir un plan de alimentación.",
    category: "CONSULTATION",
    specialtySlug: "nutricion",
    durationMinutes: 40,
    confirmed: true,
    image: STOCK_IMAGES.nutricion,
    sortOrder: 1,
  },
  {
    slug: "consulta-clinica-medica",
    name: "Consulta de clínica médica",
    summary: "Evaluación médica general y coordinación del abordaje.",
    description: "Consulta médica general para evaluar el estado de salud y coordinar el plan de atención.",
    category: "CONSULTATION",
    specialtySlug: "clinica-medica",
    durationMinutes: 30,
    confirmed: true,
    image: STOCK_IMAGES.clinicaMedica,
    sortOrder: 2,
  },
  {
    slug: "consulta-endocrinologia",
    name: "Consulta de endocrinología",
    summary: "Evaluación de alteraciones hormonales y metabólicas.",
    description: "Consulta especializada en endocrinología y metabolismo.",
    category: "CONSULTATION",
    specialtySlug: "endocrinologia",
    durationMinutes: 30,
    confirmed: true,
    image: STOCK_IMAGES.endocrinologia,
    sortOrder: 3,
  },
  {
    slug: "consulta-cardiologia",
    name: "Consulta de cardiología",
    summary: "Evaluación cardiovascular.",
    description: "Consulta especializada en cardiología.",
    category: "CONSULTATION",
    specialtySlug: "cardiologia",
    durationMinutes: 30,
    confirmed: true,
    image: STOCK_IMAGES.cardiologia,
    sortOrder: 4,
  },
  {
    slug: "consulta-cirugia-bariatrica",
    name: "Consulta de cirugía bariátrica y metabólica",
    summary: "Evaluación de alternativas quirúrgicas.",
    description: "Consulta con cirugía bariátrica y metabólica para evaluar si una alternativa quirúrgica es adecuada.",
    category: "CONSULTATION",
    specialtySlug: "cirugia-bariatrica-y-metabolica",
    durationMinutes: 40,
    confirmed: true,
    image: STOCK_IMAGES.cirugiaBariatrica,
    sortOrder: 5,
  },
  {
    slug: "evaluacion-nutricional",
    name: "Evaluación nutricional",
    summary: "Valoración del estado nutricional y de la composición corporal.",
    description: "Evaluación nutricional completa como punto de partida del plan de alimentación.",
    category: "EVALUATION",
    specialtySlug: "nutricion",
    durationMinutes: 45,
    confirmed: false,
    image: STOCK_IMAGES.evaluacionNutricional,
    sortOrder: 6,
  },
  {
    slug: "ecografia",
    name: "Ecografía",
    summary: "Estudio por imágenes mediante ultrasonido.",
    description: "Estudio ecográfico solicitado por el profesional tratante.",
    category: "IMAGING",
    durationMinutes: 30,
    confirmed: false,
    image: STOCK_IMAGES.ecografia,
    sortOrder: 7,
  },
  {
    slug: "electrocardiograma",
    name: "Electrocardiograma",
    summary: "Registro de la actividad eléctrica del corazón.",
    description: "Estudio no invasivo que registra la actividad eléctrica del corazón.",
    category: "CARDIOLOGY_TEST",
    specialtySlug: "cardiologia",
    durationMinutes: 20,
    confirmed: false,
    image: STOCK_IMAGES.electrocardiograma,
    sortOrder: 8,
  },
  {
    slug: "laboratorio",
    name: "Laboratorio",
    summary: "Toma de muestras para análisis clínicos.",
    description: "Extracción y toma de muestras para análisis clínicos indicados por el profesional.",
    category: "LABORATORY",
    durationMinutes: 15,
    confirmed: false,
    image: STOCK_IMAGES.laboratorio,
    sortOrder: 9,
  },
  {
    slug: "evaluacion-preoperatoria",
    name: "Evaluación preoperatoria",
    summary: "Evaluación previa a una cirugía programada.",
    description: "Evaluación clínica previa a procedimientos quirúrgicos. Disponible solo si la clínica lo confirma.",
    category: "EVALUATION",
    durationMinutes: 45,
    confirmed: false,
    sortOrder: 10,
  },
  {
    slug: "seguimiento-medico-metabolico",
    name: "Seguimiento médico y metabólico",
    summary: "Controles periódicos según las indicaciones del equipo.",
    description: "Consultas de control para evaluar la evolución y ajustar el plan de atención.",
    category: "FOLLOW_UP",
    durationMinutes: 20,
    confirmed: false,
    image: STOCK_IMAGES.seguimiento,
    sortOrder: 11,
  },
];

export const FAQS = [
  {
    question: "¿Cómo solicito una cita?",
    answer:
      "Puedes crear tu cuenta en el portal de pacientes y elegir especialidad, profesional, fecha y horario según la disponibilidad real de la agenda. También puedes completar el formulario de solicitud de cita, llamar por teléfono o escribirnos por WhatsApp y la secretaría coordinará el horario contigo.",
  },
  {
    question: "¿Qué datos necesito para registrarme?",
    answer:
      "Para crear tu cuenta necesitas tu nombre completo, número de documento de identidad, fecha de nacimiento, teléfono y un correo electrónico. Te enviaremos un enlace para confirmar tu correo.",
  },
  {
    question: "¿Cómo cancelo o reprogramo una cita?",
    answer:
      "Desde el portal de pacientes, en «Mis citas», puedes cancelar o reprogramar dentro del plazo indicado por la política de la clínica. Si el plazo ya venció, comunícate con la secretaría.",
  },
  {
    question: "¿Qué servicios ofrece la clínica?",
    answer:
      "El CMIO ofrece consultas de nutrición, clínica médica, endocrinología, cardiología y cirugía bariátrica y metabólica. En la sección «Servicios y estudios» encontrarás el detalle de las prestaciones confirmadas.",
  },
  {
    question: "¿Cómo accedo al portal del paciente?",
    answer:
      "Ingresa en «Acceso de pacientes» con tu correo y contraseña. Si todavía no tienes una cuenta, selecciona «Crear cuenta». Si olvidaste tu contraseña, usa la opción «¿Olvidaste tu contraseña?».",
  },
  {
    question: "¿Cómo me comunico con la secretaría?",
    answer:
      "Puedes llamarnos o escribirnos por WhatsApp a los números publicados en la sección «Ubicación y contacto», o enviarnos un mensaje mediante el formulario de contacto. Atendemos de lunes a viernes, de 09:00 a 19:00.",
  },
];
