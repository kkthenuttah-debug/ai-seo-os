import { createContext, useMemo, useState } from "react";
import type { Project } from "@/types/models";

interface ProjectContextValue {
  project: Project | null;
  setProject: (project: Project | null) => void;
}

export const ProjectContext = createContext<ProjectContextValue | undefined>(undefined);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [project, setProject] = useState<Project | null>(null);

  const value = useMemo(() => ({ project, setProject }), [project]);

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}
