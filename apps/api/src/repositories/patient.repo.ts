import type { Filter } from "mongodb";
import type {
  LabResult,
  Patient,
  PatientPublic,
} from "@pr_hospitalagent/types";
import { connectDB } from "@pr_hospitalagent/api-shared";
import { nextId } from "../lib/id-generator.ts";

const COLLECTION = "patients";
const PUBLIC_PROJECTION = { _id: 0, passwordHash: 0 } as const;

async function coll() {
  const db = await connectDB();
  return db.collection<Patient>(COLLECTION);
}

export const patientRepo = {
  nextId: () => nextId(COLLECTION, "BN", 3),

  async listSummary() {
    const c = await coll();
    return c
      .find(
        {},
        {
          projection: {
            _id: 0,
            id: 1,
            name: 1,
            age: 1,
            gender: 1,
            ward: 1,
            diagnoses: 1,
          },
        }
      )
      .sort({ id: -1 })
      .toArray();
  },

  async findById(id: string): Promise<PatientPublic | null> {
    const c = await coll();
    const doc = await c.findOne({ id }, { projection: PUBLIC_PROJECTION });
    return doc as PatientPublic | null;
  },

  async findRaw(filter: Filter<Patient>) {
    const c = await coll();
    return c.findOne(filter, { projection: { _id: 0, passwordHash: 0 } });
  },

  async insert(patient: Patient) {
    const c = await coll();
    await c.insertOne(patient);
  },

  async patch(id: string, $set: Record<string, unknown>) {
    const c = await coll();
    const res = await c.updateOne({ id }, { $set });
    return res.matchedCount > 0;
  },

  async delete(id: string) {
    const c = await coll();
    const res = await c.deleteOne({ id });
    return res.deletedCount > 0;
  },

  async getLabResults(id: string) {
    const c = await coll();
    return c.findOne(
      { id },
      { projection: { _id: 0, id: 1, name: 1, labResults: 1 } }
    );
  },

  async pushLab(id: string, lab: LabResult) {
    const c = await coll();
    const res = await c.updateOne({ id }, { $push: { labResults: lab } });
    return res.matchedCount > 0;
  },

  async replaceLabs(id: string, labResults: LabResult[]) {
    const c = await coll();
    await c.updateOne({ id }, { $set: { labResults } });
  },

  async listAll(): Promise<PatientPublic[]> {
    const c = await coll();
    const docs = await c
      .find({}, { projection: PUBLIC_PROJECTION })
      .toArray();
    return docs as PatientPublic[];
  },

  async listByIds(ids: string[]) {
    if (ids.length === 0) return [];
    const c = await coll();
    return c
      .find({ id: { $in: ids } }, { projection: { _id: 0, id: 1, name: 1 } })
      .toArray();
  },
};
