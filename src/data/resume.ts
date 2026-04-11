// ─── Interfaces ─────────────────────────────────────────────────────────────

export interface PersonalInfo {
  name: string;
  title: string;
  bio: string;
  email: string;
  links: {
    github: string;
    linkedin: string;
    twitter?: string;
  };
}

export interface Job {
  company: string;
  role: string;
  startDate: string; // "YYYY-MM"
  endDate?: string;  // "YYYY-MM" — omit if current
  description: string;
  technologies: string[];
}

export type SkillCategory = "backend" | "frontend" | "devops" | "tools";

export interface Skill {
  name: string;
  category: SkillCategory;
}

// ─── Personal Info ───────────────────────────────────────────────────────────

export const personalInfo: PersonalInfo = {
  name: "Javier García",
  title: "Backend Engineer",
  bio: "Desarrollador backend con más de 7 años de experiencia diseñando y construyendo aplicaciones empresariales con Spring Boot. Apasionado por la arquitectura limpia, los microservicios y las buenas prácticas de desarrollo.",
  email: "javier@example.com",
  links: {
    github: "https://github.com/javiergarciaalvarez95",
    linkedin: "https://linkedin.com/in/javiergarciaalvarez95",
  },
};

// ─── Jobs ────────────────────────────────────────────────────────────────────

export const jobs: Job[] = [
  {
    company: "Tech Company",
    role: "Senior Backend Engineer",
    startDate: "2022-01",
    description:
      "Diseño e implementación de microservicios con Spring Boot, Kafka y PostgreSQL. Liderazgo técnico de un equipo de 4 desarrolladores.",
    technologies: ["Spring Boot", "Kafka", "PostgreSQL", "Docker", "Kubernetes"],
  },
  {
    company: "Digital Solutions",
    role: "Backend Developer",
    startDate: "2019-06",
    endDate: "2021-12",
    description:
      "Desarrollo de APIs REST y servicios backend para aplicaciones empresariales. Migración de monolito a microservicios.",
    technologies: ["Spring Boot", "MySQL", "RabbitMQ", "AWS", "Jenkins"],
  },
  {
    company: "Startup Innovation",
    role: "Junior Developer",
    startDate: "2017-03",
    endDate: "2019-05",
    description:
      "Desarrollo full-stack con Spring Boot y Angular. Implementación de módulos de autenticación y gestión de usuarios.",
    technologies: ["Spring Boot", "Angular", "MongoDB", "Git"],
  },
];

// ─── Skills ──────────────────────────────────────────────────────────────────

export const skills: Skill[] = [
  // Backend
  { name: "Spring Boot", category: "backend" },
  { name: "Java", category: "backend" },
  { name: "Kotlin", category: "backend" },
  { name: "REST APIs", category: "backend" },
  { name: "Apache Kafka", category: "backend" },
  { name: "RabbitMQ", category: "backend" },
  { name: "PostgreSQL", category: "backend" },
  { name: "MySQL", category: "backend" },
  { name: "MongoDB", category: "backend" },

  // Frontend
  { name: "Angular", category: "frontend" },
  { name: "TypeScript", category: "frontend" },
  { name: "HTML / CSS", category: "frontend" },

  // DevOps
  { name: "Docker", category: "devops" },
  { name: "Kubernetes", category: "devops" },
  { name: "AWS", category: "devops" },
  { name: "GitHub Actions", category: "devops" },
  { name: "Jenkins", category: "devops" },

  // Tools
  { name: "Git", category: "tools" },
  { name: "IntelliJ IDEA", category: "tools" },
  { name: "Postman", category: "tools" },
  { name: "Jira", category: "tools" },
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
