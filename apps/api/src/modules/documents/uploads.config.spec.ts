import { join } from "node:path";
import { documentFileFilter, extensaoSegura } from "./uploads.config";

function fakeFile(mimetype: string): Express.Multer.File {
  return { mimetype } as Express.Multer.File;
}

describe("documentFileFilter", () => {
  it("aceita imagens e PDF", () => {
    for (const mimetype of ["image/jpeg", "image/png", "image/webp", "application/pdf"]) {
      const callback = jest.fn();
      documentFileFilter({}, fakeFile(mimetype), callback);
      expect(callback).toHaveBeenCalledWith(null, true);
    }
  });

  it("recusa outros tipos de arquivo (ex.: executável, HTML)", () => {
    for (const mimetype of ["application/x-msdownload", "text/html", "application/javascript"]) {
      const callback = jest.fn();
      documentFileFilter({}, fakeFile(mimetype), callback);
      expect(callback).toHaveBeenCalledWith(expect.any(Error), false);
    }
  });
});

describe("extensaoSegura", () => {
  const PASTA_DA_CLINICA = join("/uploads", "clinic-1");

  // O nome original vem do cabeçalho multipart e o multer não sanitiza nada.
  // Com o formato antigo (`${uuid}-${originalname}`), o `..` era resolvido
  // pelo path.join e o arquivo era gravado fora da pasta da clínica.
  it("não deixa o nome enviado escapar do diretório da clínica", () => {
    const nomesHostis = [
      "../../../../etc/cron.d/x.png",
      "..\\..\\windows\\system32\\y.png",
      "foto.png/../../../z.png",
      "/etc/passwd",
    ];

    for (const hostil of nomesHostis) {
      const nomeFinal = `uuid-fixo${extensaoSegura(hostil)}`;
      expect(nomeFinal).not.toContain("..");
      expect(nomeFinal).not.toContain("/");
      expect(nomeFinal).not.toContain("\\");
      // O que importa de verdade: o caminho resolvido segue dentro da pasta.
      expect(join(PASTA_DA_CLINICA, nomeFinal).startsWith(PASTA_DA_CLINICA)).toBe(true);
    }
  });

  it("preserva a extensão de um arquivo legítimo, em minúsculas", () => {
    expect(extensaoSegura("radiografia.PNG")).toBe(".png");
    expect(extensaoSegura("contrato assinado.pdf")).toBe(".pdf");
    expect(extensaoSegura("foto.jpeg")).toBe(".jpeg");
  });

  it("devolve vazio quando não há extensão reconhecível", () => {
    expect(extensaoSegura("sem-extensao")).toBe("");
    expect(extensaoSegura(".oculto")).toBe("");
    expect(extensaoSegura("x.extensao-gigante-demais")).toBe("");
  });
});
