import type { Command } from "commander";
import { api } from "../api.js";

export interface Persona {
  personaId: string;
  displayName: string;
  type: string;
  age?: number;
  gender?: string;
  occupation?: string;
  annualIncome?: string;
  education?: string;
  deviationScore?: number;
  freeText?: string;
  [key: string]: unknown;
}

export async function fetchPersonas(): Promise<Persona[]> {
  return api.get<Persona[]>("/personas");
}

export function registerPersonasCommand(program: Command): void {
  const personas = program.command("personas").description("ペルソナ関連コマンド");

  personas
    .command("pull")
    .description("ペルソナ一覧を取得する")
    .option("--json", "JSON形式で出力する")
    .action(async (opts: { json?: boolean }) => {
      try {
        const list = await fetchPersonas();
        if (opts.json) {
          console.log(JSON.stringify(list, null, 2));
          return;
        }
        for (const p of list) {
          console.log(`${p.displayName}\t${p.type}\t${p.personaId}`);
        }
      } catch (err) {
        console.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  const attrOptions = (cmd: Command): Command =>
    cmd
      .option("--type <type>", "タイプ (action_oriented|cautious|info_savvy|efficiency|cost_conscious|trend_sensitive|other)")
      .option("--age <n>", "年齢")
      .option("--gender <g>", "性別")
      .option("--occupation <o>", "職業")
      .option("--income <n>", "年収(万円)")
      .option("--education <e>", "学歴")
      .option("--deviation <n>", "偏差値")
      .option("--free-text <text>", "自由記述")
      .option("--json", "JSON形式で出力する");

  interface AttrOpts {
    type?: string; age?: string; gender?: string; occupation?: string;
    income?: string; education?: string; deviation?: string; freeText?: string; json?: boolean;
  }

  const buildInput = (opts: AttrOpts): Record<string, unknown> => {
    const input: Record<string, unknown> = {};
    if (opts.type !== undefined) input.type = opts.type;
    if (opts.age !== undefined) input.age = parseInt(opts.age, 10);
    if (opts.gender !== undefined) input.gender = opts.gender;
    if (opts.occupation !== undefined) input.occupation = opts.occupation;
    if (opts.income !== undefined) input.annualIncome = parseInt(opts.income, 10);
    if (opts.education !== undefined) input.education = opts.education;
    if (opts.deviation !== undefined) input.deviationScore = parseInt(opts.deviation, 10);
    if (opts.freeText !== undefined) input.freeText = opts.freeText;
    return input;
  };

  attrOptions(
    personas
      .command("create")
      .description("ペルソナを作成する")
      .requiredOption("--name <displayName>", "表示名"),
  ).action(async (opts: AttrOpts & { name: string }) => {
    try {
      const created = await api.post<Persona>("/personas", { displayName: opts.name, ...buildInput(opts) });
      if (opts.json) console.log(JSON.stringify(created, null, 2));
      else console.log(`作成しました: ${created.displayName} (${created.personaId})`);
    } catch (err) {
      console.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

  attrOptions(
    personas
      .command("update <personaId>")
      .description("ペルソナを部分更新する（デフォルトペルソナは不可）")
      .option("--name <displayName>", "表示名"),
  ).action(async (personaId: string, opts: AttrOpts & { name?: string }) => {
    try {
      const input = buildInput(opts);
      if (opts.name !== undefined) input.displayName = opts.name;
      if (Object.keys(input).length === 0) {
        console.error("更新する属性を1つ以上指定してください");
        process.exit(1);
      }
      const updated = await api.put<Persona>(`/personas/${personaId}`, input);
      if (opts.json) console.log(JSON.stringify(updated, null, 2));
      else console.log(`更新しました: ${updated.displayName} (${updated.personaId})`);
    } catch (err) {
      console.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

  personas
    .command("delete <personaId>")
    .description("ペルソナを削除する（デフォルトペルソナは不可）")
    .action(async (personaId: string) => {
      try {
        await api.delete(`/personas/${personaId}`);
        console.log(`削除しました: ${personaId}`);
      } catch (err) {
        console.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
