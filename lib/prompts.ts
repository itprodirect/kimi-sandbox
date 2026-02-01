import { readFileSync, readdirSync } from "fs";
import { join } from "path";

export interface PromptTemplate {
  name: string;
  content: string;
}

const PROMPTS_DIR = join(process.cwd(), "prompts");

export function loadTemplate(name: string): string {
  const filePath = join(PROMPTS_DIR, `${name}.md`);
  try {
    return readFileSync(filePath, "utf-8");
  } catch {
    throw new Error(`Template not found: ${name}`);
  }
}

export function listTemplates(): string[] {
  try {
    return readdirSync(PROMPTS_DIR)
      .filter((f) => f.endsWith(".md") && f !== "README.md")
      .map((f) => f.replace(".md", ""));
  } catch {
    return [];
  }
}

export function interpolate(
  template: string,
  variables: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (key in variables) {
      return variables[key];
    }
    throw new Error(`Missing variable: {{${key}}}`);
  });
}

export function loadAndInterpolate(
  name: string,
  variables: Record<string, string>
): string {
  const template = loadTemplate(name);
  return interpolate(template, variables);
}
