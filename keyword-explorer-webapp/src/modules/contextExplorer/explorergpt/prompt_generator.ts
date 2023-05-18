import { FINISH_NAME } from "./schema";

export class PromptGenerator {
  constraints: string[];
  resources: string[];
  performance_evaluation: string[];
  response_format: object;

  constructor() {
    this.constraints = [];
    this.resources = [];
    this.performance_evaluation = [];
    this.response_format = {
      thoughts: {
        text: "thought",
        reasoning: "reasoning",
        idea: "- short bulleted\n- list that conveys\n- long-term idea",
        criticism: "constructive self-criticism",
        speak: "thoughts summary to say to user",
      },
      command: { name: "command name", args: { "arg name": "value" } },
    };
  }

  add_constraint(constraint: string): void {
    this.constraints.push(constraint);
  }

  add_resource(resource: string): void {
    this.resources.push(resource);
  }

  add_performance_evaluation(evaluation: string): void {
    this.performance_evaluation.push(evaluation);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _generate_numbered_list(items: any[]): string {
    return items.map((item, i) => `${i + 1}. ${item}`).join("\n");
  }

  generate_prompt_string(): string {
    const prompt_string =
      `Constraints:\n${this._generate_numbered_list(this.constraints)}\n\n` +
      `Resources:\n${this._generate_numbered_list(this.resources)}\n\n` +
      `Performance Evaluation:\n${this._generate_numbered_list(
        this.performance_evaluation
      )}`;

    return prompt_string;
  }
}

export function getPrompt(): string {
  const prompt_generator = new PromptGenerator();
  prompt_generator.add_performance_evaluation(
    "Constructively self-criticize your big-picture behavior constantly."
  );
  return prompt_generator.generate_prompt_string();
}
