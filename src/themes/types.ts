export interface Theme {
  name: string;
  shaderVariant: "warm" | "teal" | "plum";
  cssVars: Record<string, string>;
}
