#!/usr/bin/env node
import { Command } from "commander";
import { registerAuthCommand } from "./commands/auth.js";
import { registerPersonasCommand } from "./commands/personas.js";
import { registerTestCommand } from "./commands/test.js";
import { registerResultsCommand } from "./commands/results.js";
import { registerReportCommand } from "./commands/report.js";
import { registerCaptureCommand } from "./commands/capture.js";

const program = new Command();

program
  .name("splisona")
  .description("Splisona CLI - AIペルソナによるデザインA/Bテスト")
  .version("0.1.0");

registerAuthCommand(program);
registerPersonasCommand(program);
registerTestCommand(program);
registerResultsCommand(program);
registerReportCommand(program);
registerCaptureCommand(program);

program.parseAsync(process.argv);
