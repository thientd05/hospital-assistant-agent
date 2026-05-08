import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { verifyAuth } from "../auth/middleware.ts";
import { requireRole } from "../auth/role-guard.ts";

type InteractionRule = {
  match: (drugs: string[]) => boolean;
  message: string;
};

const has = (drugs: string[], keyword: string) =>
  drugs.some((d) => d.toLowerCase().includes(keyword.toLowerCase()));

const rules: InteractionRule[] = [
  {
    match: (d) => has(d, "warfarin") && has(d, "aspirin"),
    message:
      "Warfarin + Aspirin: tăng nguy cơ chảy máu — cần theo dõi INR và cân nhắc thay thế.",
  },
  {
    match: (d) =>
      has(d, "metformin") && (has(d, "contrast") || has(d, "cản quang")),
    message:
      "Metformin + Thuốc cản quang: nguy cơ nhiễm toan lactic — cần ngưng Metformin 48h trước khi tiêm cản quang.",
  },
  {
    match: (d) =>
      (has(d, "ace") ||
        has(d, "captopril") ||
        has(d, "enalapril") ||
        has(d, "lisinopril") ||
        has(d, "ramipril")) &&
      (has(d, "kali") || has(d, "potassium") || has(d, "k+")),
    message:
      "ACE inhibitor + Kali: nguy cơ tăng kali máu — cần theo dõi điện giải đồ.",
  },
];

const Schema = z.object({
  drugs: z.array(z.string().min(1)).min(1),
});

export async function drugCheckRoutes(app: FastifyInstance) {
  app.post(
    "/drug-check",
    { preHandler: [verifyAuth, requireRole("doctor")] },
    async (req, reply) => {
      const parsed = Schema.safeParse(req.body);
      if (!parsed.success) {
        reply.code(400).send({ error: "Invalid body", details: parsed.error });
        return;
      }
      const matches = rules
        .filter((r) => r.match(parsed.data.drugs))
        .map((r) => r.message);
      const hasInteraction = matches.length > 0;
      return {
        drugs: parsed.data.drugs,
        hasInteraction,
        message: hasInteraction
          ? matches.join("\n")
          : "Không phát hiện tương tác thuốc đáng kể",
        interactions: matches,
      };
    }
  );
}
