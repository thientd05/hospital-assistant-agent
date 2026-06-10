import type { FastifyInstance } from "fastify";
import { authRoutes } from "./auth.ts";
import { patientsRoutes } from "./patients.ts";
import { doctorsRoutes } from "./doctors.ts";
import { expertsRoutes } from "./experts.ts";
import { appointmentsRoutes } from "./appointments.ts";
import { statsRoutes } from "./stats.ts";
import { drugCheckRoutes } from "./drug-check.ts";
import { medicationsRoutes } from "./medications.ts";
import { servicePricesRoutes } from "./servicePrices.ts";
import { labCatalogRoutes } from "./labCatalog.ts";
import { assetsRoutes } from "./assets.ts";
import { utilitiesRoutes } from "./utilities.ts";
import { payrollRoutes } from "./payroll.ts";
import { revenueRoutes } from "./revenue.ts";
import { conversationsRoutes } from "./conversations.ts";
import { directMessagesRoutes } from "./directMessages.ts";
import { familyRoutes } from "./family.ts";
import { workspaceRoutes } from "./workspace.ts";
import { bootsRoutes } from "./boots.ts";
import { skillsRoutes } from "./skills.ts";

const modules = [
  authRoutes,
  patientsRoutes,
  doctorsRoutes,
  expertsRoutes,
  appointmentsRoutes,
  statsRoutes,
  drugCheckRoutes,
  medicationsRoutes,
  servicePricesRoutes,
  labCatalogRoutes,
  assetsRoutes,
  utilitiesRoutes,
  payrollRoutes,
  revenueRoutes,
  conversationsRoutes,
  directMessagesRoutes,
  familyRoutes,
  workspaceRoutes,
  bootsRoutes,
  skillsRoutes,
];

export async function registerRoutes(app: FastifyInstance) {
  for (const mod of modules) {
    await app.register(mod, { prefix: "/api" });
  }
}
