import { documentFileFilter } from "./uploads.config";

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
