import { accessSync, constants } from "node:fs";
import { isAbsolute } from "node:path";
import { resolveCliCommand } from "./cli-client";

export interface AtlasCliReadiness {
  available: boolean | null;
  status: "AVAILABLE" | "PATH_LOOKUP" | "MISSING";
  commandLabel: "atlas-flight";
  source: "resolved-path" | "path";
}

export function probeAtlasCliReadiness(): AtlasCliReadiness {
  const command = resolveCliCommand();
  if (!isAbsolute(command)) {
    return {
      available: null,
      status: "PATH_LOOKUP",
      commandLabel: "atlas-flight",
      source: "path",
    };
  }

  try {
    accessSync(command, constants.X_OK);
    return {
      available: true,
      status: "AVAILABLE",
      commandLabel: "atlas-flight",
      source: "resolved-path",
    };
  } catch {
    return {
      available: false,
      status: "MISSING",
      commandLabel: "atlas-flight",
      source: "resolved-path",
    };
  }
}
