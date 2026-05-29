import type { SkillSummary, SkillDetail } from "@pr_hospitalagent/types";
import { skillRepo } from "../repositories/skill.repo.ts";
import { NotFoundError, ConflictError } from "../lib/errors.ts";
import { skillDescription } from "../lib/skill-md.ts";

function detail(name: string, content: string): SkillDetail {
  return { skill: name, path: `skills/${name}/SKILL.md`, content };
}

export const skillService = {
  async list(): Promise<SkillSummary[]> {
    const skills = await skillRepo.list();
    return skills.map((s) => ({
      name: s.name,
      description: skillDescription(s.content),
    }));
  },

  async get(name: string): Promise<SkillDetail> {
    const skill = await skillRepo.findByName(name);
    if (!skill) throw new NotFoundError(`Không tìm thấy skill: ${name}`);
    return detail(skill.name, skill.content);
  },

  async create(name: string, content: string): Promise<SkillDetail> {
    if (await skillRepo.findByName(name)) {
      throw new ConflictError(`Skill "${name}" đã tồn tại.`);
    }
    await skillRepo.upsert(name, content);
    return detail(name, content);
  },

  async update(name: string, content: string): Promise<SkillDetail> {
    await skillRepo.upsert(name, content);
    return detail(name, content);
  },

  async delete(name: string): Promise<{ ok: true; deleted: string; skills: SkillSummary[] }> {
    const ok = await skillRepo.delete(name);
    if (!ok) throw new NotFoundError(`Không tìm thấy skill: ${name}`);
    return { ok: true, deleted: name, skills: await skillService.list() };
  },
};
