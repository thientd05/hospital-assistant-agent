import type { FastifyReply, FastifyRequest } from "fastify";
import {
  ensureDoctorWorkspace,
  ensurePatientWorkspace,
} from "../agent/workspace.ts";

export async function ensureAgentWorkspace(
  req: FastifyRequest,
  _reply: FastifyReply
) {
  try {
    if (req.authRole === "doctor" && req.doctor) {
      const ensured = ensureDoctorWorkspace(req.doctor.id);
      if (!ensured.alreadyComplete) {
        req.log.info(
          {
            doctorId: req.doctor.id,
            createdDir: ensured.createdDir,
            createdFiles: ensured.createdFiles,
          },
          "Bootstrapped doctor workspace"
        );
      }
    } else if (req.authRole === "patient" && req.patient) {
      const ensured = ensurePatientWorkspace(req.patient.id);
      if (!ensured.alreadyComplete) {
        req.log.info(
          {
            patientId: req.patient.id,
            createdDir: ensured.createdDir,
            createdFiles: ensured.createdFiles,
          },
          "Bootstrapped patient workspace"
        );
      }
    }
  } catch (err) {
    req.log.error({ err }, "Failed to bootstrap agent workspace");
  }
}
