import { getItem, settingsKey } from "../shared/dynamo.js";

export type TemplateId = "evaluation" | "summary" | "interview" | "draft";

interface PromptSettings {
  data: Record<TemplateId, { additionalInstruction?: string }>;
}

export async function getAdditionalInstruction(
  userId: string,
  templateId: TemplateId
): Promise<string> {
  const record = await getItem<PromptSettings>(
    settingsKey(userId, "prompt") as unknown as Record<string, string>
  );
  return record?.data?.[templateId]?.additionalInstruction ?? "";
}
