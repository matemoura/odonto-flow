import { slugify } from "./SignupForm";

describe("slugify", () => {
  it("remove acentos e pontuação, troca espaço por hífen", () => {
    expect(slugify("Clínica Vila Nova & Cia.")).toBe("clinica-vila-nova-cia");
  });

  it("não deixa hífen duplicado nem nas pontas", () => {
    expect(slugify("  --Sorriso!!  Feliz--  ")).toBe("sorriso-feliz");
  });

  it("já em minúsculo e sem acento passa direto", () => {
    expect(slugify("odonto-facil")).toBe("odonto-facil");
  });
});
