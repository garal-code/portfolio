// ─── Interfaces ─────────────────────────────────────────────────────────────

export interface PersonalInfo {
  name: string;
  title: string;
  location: string;
  bio: string;
  summary: string;
  email: string;
  highlights: string[];
  links: {
    github: string;
    linkedin: string;
    twitter?: string;
    gitlab?: string;
  };
}

export interface Job {
  company: string;
  role: string;
  startDate: string; // "YYYY" or "YYYY-MM"
  endDate?: string;  // "YYYY" or "YYYY-MM" — omit if current
  description: string;
  technologies: string[];
}

export interface Education {
  institution: string;
  degree: string;
  startYear: string;
  endYear?: string;
  details?: string[];
}

export interface Course {
  title: string;
  provider?: string;
  year?: string;
}

export interface Certification {
  title: string;
  issuer?: string;
  note?: string;
}

export type SkillCategory = "backend" | "frontend" | "devops" | "tools";

export interface Skill {
  name: string;
  category: SkillCategory;
}

// ─── Personal Info ───────────────────────────────────────────────────────────

export const personalInfo: PersonalInfo = {
  name: "Javier García Álvarez",
  title: "Desarrollador Backend",
  location: "Malaga, España",
  bio: "Desarrollador backend con más de 5 años de experiencia en plataformas empresariales, especializado en Spring Boot y arquitecturas orientadas a servicios. Actualmente explorando el espacio de IA aplicada a finanzas: construyo herramientas propias para análisis de inversión y automatización con agentes. Me muevo bien en entornos complejos, aprendo rápido y tengo una inclinación natural por entender los sistemas desde dentro hacia fuera.",
  summary:
    "Especializado en Java y Spring Boot, con experiencia en APIs REST, observabilidad, procesamiento de datos y mantenimiento evolutivo de plataformas complejas.",
  email: "fjgarcia.alvarez@hotmail.com",
  highlights: [
    "Más de 5 años construyendo software para entornos corporativos.",
    "Experiencia con Java, Spring Boot, SQL, ELK y servicios integrados con IoT.",
    "Perfil proactivo, resolutivo y cómodo colaborando con distintos equipos.",
    "Construyendo herramientas de IA para inversión",
    "Obsesionado con aprender y con hacer las cosas bien.",
  ],
  links: {
    github: "https://github.com/garal-code",
    linkedin: "https://linkedin.com/in/francisco-javier-garcia-alvarez-5a01ab177",
  },
};

// ─── Jobs ────────────────────────────────────────────────────────────────────

export const jobs: Job[] = [
  {
    company: "Banco Santander(SDS)",
    role: "Desarrollador",
    startDate: "2025",
    description:
      "Analisis de requisitos y definicion de la solucion tecnica para multiples aplicaciones.Liderazgo en el desarrollo de dichas aplicaciones impulsando el trabajo en equipo y el compliance con las bases de 'Clean Code'.Gestion y manejo de Elasticsearch, para la ingesta de la informacion y uso de Kibana para implementar las visualizaciones necesarias.Desarrollo de los aplicativos en Springboot implementando integraciones con multiples herramientas como kafka, S3, Elasticsearch...",
    technologies: [
      "Elasticsearch",
      "Kibana",
      "Filebeat",
      "Spring",
      "Spark",
      "Git",
      "SQL",
      "Openshift",
      "DEVIN",
      "Agentic Ecosystem"
    ],
  },
  {
    company: "Scalian",
    role: "Desarrollador",
    startDate: "2022",
    endDate: "2025",
    description:
      "Estimación, diseño e implementación de una aplicación orientada a generar indicadores de riesgo. Trabajo sobre flujos con varios KPIs, búsquedas con Elasticsearch y mejora del rendimiento mediante procesos batch para tratamiento e indexación de datos.",
    technologies: [
      "Elasticsearch",
      "Kibana",
      "Filebeat",
      "Grafana",
      "Spring Batch",
      "Spark",
      "Git",
      "SQL",
    ],
  },
  {
    company: "Futurespace S.A.",
    role: "Desarrollador",
    startDate: "2021",
    endDate: "2022",
    description:
      "Implementación de un sistema multiplataforma integrado con un servicio IoT. Desarrollo y mantenimiento de backend, app Android, API REST y componentes web conectados con la plataforma y con dispositivos que recogen y transmiten información.",
    technologies: [
      "Spring Boot",
      "Java",
      "Android",
      "HTML",
      "JSP",
      "Hibernate",
      "MySQL",
      "JPA",
      "Jenkins",
      "Git",
      "Docker",
      "ThingsBoard",
      "XMPP",
    ],
  },
  {
    company: "GMV Soluciones Globales Internet S.A.U.",
    role: "Desarrollador",
    startDate: "2018",
    endDate: "2021",
    description:
      "Desarrollo backend y frontend en proyectos para organismos públicos, incluido el sistema GALILEO de la ESA. Implementación de microservicios y APIs REST, mantenimiento evolutivo y desarrollo de software de comunicación entre componentes.",
    technologies: [
      "Spring Boot",
      "Java",
      "HTML",
      "JSP",
      "TypeScript",
      "Hibernate",
      "MySQL",
      "Oracle",
      "JPA",
      "Jenkins",
      "Git",
      "Docker",
    ],
  },
];

// ─── Education & Certifications ──────────────────────────────────────────────

export const education: Education[] = [
  {
    institution: "Universidad Politécnica de Madrid",
    degree: "Grado en Ingeniería de Computadores",
    startYear: "2014",
    endYear: "2019",
    details: [
      "Ganador de la beca del Programa de Campus Sostenible 2020 por el desarrollo del trabajo de fin de grado.",
    ],
  },
  {
    institution: "Universidad de las Hespérides",
    degree: "Especialización en Inversión Multimercado y Diversificación por la Universidad de las Hespérides",
    startYear: "2025",
  },
];

export const courses: Course[] = [
  {
    title: "Spring Framework 5: Creando webapp de cero a experto",
    provider: "Udemy",
    year: "2021",
  },
  {
    title: "Flutter: introducción al SDK de Google",
    provider: "Udemy",
  },
  {
    title: "Programación Android desde cero (+35 horas)",
    provider: "Udemy",
  },
];

export const certifications: Certification[] = [
  {
    title: "Nivel B2 de inglés",
    issuer: "British Council",
    note: "British Council Assessments English",
  },
];

// ─── Skills ──────────────────────────────────────────────────────────────────

export const skills: Skill[] = [
  // Backend
  { name: "Spring Boot", category: "backend" },
  { name: "Java", category: "backend" },
  { name: "REST APIs", category: "backend" },
  { name: "Spring Batch", category: "backend" },
  { name: "Hibernate / JPA", category: "backend" },
  { name: "SQL", category: "backend" },
  { name: "MySQL", category: "backend" },
  { name: "Oracle", category: "backend" },

  // Frontend
  { name: "TypeScript", category: "frontend" },
  { name: "Android", category: "frontend" },
  { name: "HTML / CSS", category: "frontend" },
  { name: "JSP", category: "frontend" },
  { name: "FreeMarker", category: "frontend" },

  // DevOps
  { name: "Docker", category: "devops" },
  { name: "Jenkins", category: "devops" },
  { name: "GitHub Actions", category: "devops" },

  // Tools
  { name: "Git", category: "tools" },
  { name: "Grafana", category: "tools" },
  { name: "Kibana", category: "tools" },
  { name: "Filebeat", category: "tools" },
  { name: "Elasticsearch", category: "tools" },
  { name: "Spark", category: "tools" },
  { name: "ThingsBoard", category: "tools" },
  { name: "Liferay", category: "tools" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns skills grouped by category. */
export function getSkillsByCategory(): Record<SkillCategory, Skill[]> {
  return skills.reduce(
    (acc, skill) => {
      acc[skill.category].push(skill);
      return acc;
    },
    {
      backend: [],
      frontend: [],
      devops: [],
      tools: [],
    } as Record<SkillCategory, Skill[]>
  );
}

/** Returns the display label for a skill category. */
export function getCategoryLabel(category: SkillCategory): string {
  const labels: Record<SkillCategory, string> = {
    backend: "Backend",
    frontend: "Frontend",
    devops: "DevOps",
    tools: "Herramientas",
  };
  return labels[category];
}

/** Returns whether a job is current (no endDate). */
export function isCurrentJob(job: Job): boolean {
  return job.endDate === undefined;
}
