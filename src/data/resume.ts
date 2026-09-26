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
  summary: string;
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

export interface Interest {
  title: string;
  note: string;
}

export interface Project {
  name: string;
  url: string;
  description: string;
  image: string;
}

// ─── Personal Info ───────────────────────────────────────────────────────────

export const personalInfo: PersonalInfo = {
  name: "Javier García Álvarez",
  title: "Software Engineer",
  location: "Malaga, España",
  bio: "Soy un Software & Agent Engineer con 7 años de experiencia diseñando arquitecturas de software. Defensor a ultranza del Clean Code y los principios SOLID",
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

// ─── Interests ───────────────────────────────────────────────────────────────

export const interests: Interest[] = [
  { title: "IA", note: "agentes y automatización" },
  { title: "Finanzas", note: "mercados" },
  { title: "Geopolítica", note: "lo que mueve el mundo" },
];

// ─── Personal project ──────────────────────────────────────────────────────

export const project: Project = {
  name: "Tu Cartera",
  url: "https://tu-cartera.garal.app",
  description:
    "Una app que construyo en mi tiempo libre para seguir y analizar mi cartera de inversión.",
  image: "images/tu-cartera-landing.png",
};

// ─── Jobs ────────────────────────────────────────────────────────────────────

export const jobs: Job[] = [
  {
    company: "Banco Santander(SDS)",
    role: "Tech Lead & Agent Engineer",
    startDate: "2025",
    description:
      "Analisis de requisitos y definicion de la solucion tecnica para multiples aplicaciones.Liderazgo en el desarrollo de dichas aplicaciones impulsando el trabajo en equipo y el compliance con las bases de 'Clean Code'.Gestion y manejo de Elasticsearch, para la ingesta de la informacion y uso de Kibana para implementar las visualizaciones necesarias.Desarrollo de los aplicativos en Springboot implementando integraciones con multiples herramientas como kafka, S3, Elasticsearch...",
    summary:
      "Dirijo la arquitectura y el desarrollo de ecosistemas de software, transformando requisitos complejos en soluciones robustas con Spring Boot, Kafka, S3 y Elasticsearch. Promuevo una cultura de excelencia técnica aplicando Clean Code y principios SOLID.",
    technologies: [
      "Elastic Stack",
      "Spring Framework",
      "Git",
      "SQL",
      "Openshift",
      "DEVIN",
      "Agentic Ecosystem",
    ],
  },
  {
    company: "Scalian",
    role: "Desarrollador",
    startDate: "2022",
    endDate: "2025",
    description:
      "Estimación, diseño e implementación de una aplicación orientada a generar indicadores de riesgo. Trabajo sobre flujos con varios KPIs, búsquedas con Elasticsearch y mejora del rendimiento mediante procesos batch para tratamiento e indexación de datos.",
    summary:
      "Lideré el diseño end-to-end y la implementación de una plataforma orientada a la generación de indicadores de riesgo. Optimicé drásticamente el rendimiento en el tratamiento de grandes volúmenes de datos mediante la orquestación de procesos batch y la integración de Elastic Stack.",
    technologies: [
      "Elastic Stack",
      "Spring Framework",
      "Grafana",
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
    summary:
      "Diseñé y construí una solución multiplataforma conectada directamente con servicios IoT. Abarqué el ciclo de vida completo del producto: desde la ingesta y transmisión de datos de los dispositivos físicos, hasta el desarrollo robusto del backend.",
    technologies: [
      "Spring Framework",
      "Java",
      "Android",
      "HTML",
      "JSP",
      "Hibernate/JPA",
      "MySQL",
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
    summary:
      "Desarrollé e integré soluciones tecnológicas estratégicas para el sector público, contribuyendo directamente al sistema satelital GALILEO de la Agencia Espacial Europea (ESA).",
    technologies: [
      "Spring Framework",
      "Java",
      "HTML",
      "JSP",
      "TypeScript",
      "Hibernate/JPA",
      "MySQL",
      "Oracle",
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
    details: ["Universidad Politécnica de Madrid. Beca Campus Sostenible 2020 por el TFG."],
  },
  {
    institution: "Universidad de las Hespérides",
    degree: "Especialización en Inversión Multimercado y Diversificación",
    startYear: "2025",
    details: ["Universidad de las Hespérides"],
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

export const skills: string[] = [
  "Java",
  "Spring Framework",
  "API Rest",
  "SQL",
  "Elastic Stack",
  "Spark",
  "Kafka",
  "Docker",
  "Github",
  "OpenShift",
  "Grafana",
  "TypeScript",
  "Python",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns whether a job is current (no endDate). */
export function isCurrentJob(job: Job): boolean {
  return job.endDate === undefined;
}
