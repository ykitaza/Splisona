import { createContainer, type AppContainer } from "../container.js";

export type TemplateId = "evaluation" | "summary" | "interview" | "draft";

let _container: AppContainer | undefined;
function container(): AppContainer {
  if (!_container) _container = createContainer();
  return _container;
}

export async function getAdditionalInstruction(
  userId: string,
  templateId: TemplateId
): Promise<string> {
  return container().settingsUseCases.getAdditionalInstruction(userId, templateId);
}
