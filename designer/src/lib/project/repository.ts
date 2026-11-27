/**
 * PROJECT REPOSITORY
 *
 * All project persistence goes through this interface. The MVP stores data
 * in the browser (IndexedDB) so it works without a server; a server-backed
 * implementation (PostgreSQL + object storage) can replace it without
 * changing any screen.
 */
import { createStore, del, get, set, type UseStore } from "idb-keyval";
import type { Project, ProjectSummary } from "./types";

export interface ProjectRepository {
  list(): Promise<ProjectSummary[]>;
  get(id: string): Promise<Project | null>;
  save(project: Project): Promise<void>;
  remove(id: string): Promise<void>;
  putAsset(id: string, blob: Blob): Promise<void>;
  getAsset(id: string): Promise<Blob | null>;
  removeAsset(id: string): Promise<void>;
}

export function summarise(p: Project): ProjectSummary {
  return {
    id: p.id,
    name: p.name,
    spaceType: p.spaceType,
    city: p.city,
    updatedAt: p.updatedAt,
    step: p.step,
    hasDesign: !!p.design,
    fixtureCount: p.design?.fixtures.length ?? 0,
    coverAssetId: p.assets.find((a) => a.kind === "room_photo")?.id,
  };
}

class BrowserProjectRepository implements ProjectRepository {
  private projects: UseStore | null = null;
  private assets: UseStore | null = null;

  private stores() {
    if (!this.projects) this.projects = createStore("neuhom-projects", "projects");
    if (!this.assets) this.assets = createStore("neuhom-assets", "assets");
    return { projects: this.projects, assets: this.assets };
  }

  async list(): Promise<ProjectSummary[]> {
    const index = (await get<ProjectSummary[]>("index", this.stores().projects)) ?? [];
    return index.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async get(id: string): Promise<Project | null> {
    return (await get<Project>(`project:${id}`, this.stores().projects)) ?? null;
  }

  async save(project: Project): Promise<void> {
    const { projects } = this.stores();
    await set(`project:${project.id}`, project, projects);
    const index = (await get<ProjectSummary[]>("index", projects)) ?? [];
    const next = [summarise(project), ...index.filter((s) => s.id !== project.id)];
    await set("index", next, projects);
  }

  async remove(id: string): Promise<void> {
    const { projects } = this.stores();
    const p = await this.get(id);
    if (p) await Promise.all(p.assets.map((a) => this.removeAsset(a.id)));
    await del(`project:${id}`, projects);
    const index = (await get<ProjectSummary[]>("index", projects)) ?? [];
    await set("index", index.filter((s) => s.id !== id), projects);
  }

  async putAsset(id: string, blob: Blob): Promise<void> {
    await set(id, blob, this.stores().assets);
  }

  async getAsset(id: string): Promise<Blob | null> {
    return (await get<Blob>(id, this.stores().assets)) ?? null;
  }

  async removeAsset(id: string): Promise<void> {
    await del(id, this.stores().assets);
  }
}

export const repository: ProjectRepository = new BrowserProjectRepository();
