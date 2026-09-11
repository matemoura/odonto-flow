import { AppController } from "./app.controller";

describe("AppController", () => {
  it("retorna status ok no health check", () => {
    const controller = new AppController();
    const result = controller.health();
    expect(result.status).toBe("ok");
  });
});
