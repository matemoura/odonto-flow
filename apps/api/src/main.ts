import "reflect-metadata";
import { HttpAdapterHost, NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { ValidationPipe } from "@nestjs/common";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { initSentry } from "./common/observability/sentry";
import { SentryExceptionsFilter } from "./common/filters/sentry-exceptions.filter";

initSentry();

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Sem isto, o rate limiting é decorativo em produção. Atrás do proxy do
  // Render, `req.ip` é o IP DO PROXY para todo mundo — os 5 logins por minuto
  // viram 5 para a aplicação inteira, e o primeiro visitante gasta a cota dos
  // outros. Com `trust proxy`, o Express lê o IP real do X-Forwarded-For.
  //
  // O valor é 1, não `true`: `true` confiaria em qualquer X-Forwarded-For,
  // inclusive um forjado pelo próprio atacante — que aí trocaria de "IP" a
  // cada requisição e passaria por cima de qualquer limite. 1 = confie apenas
  // no salto de proxy imediatamente à frente (o do Render).
  app.set("trust proxy", 1);

  app.useGlobalFilters(new SentryExceptionsFilter(app.get(HttpAdapterHost).httpAdapter));
  app.use(helmet());
  app.enableCors({
    // `WEB_APP_URL` aceita VÁRIAS origens separadas por vírgula. A Vercel
    // publica o mesmo app em mais de um domínio (o alias de produção, o alias
    // do branch, mais um por deploy), e cada um é uma origem distinta para o
    // navegador — com uma só configurada, abrir o site pelo endereço "errado"
    // derruba toda chamada à API no preflight.
    //
    // A barra final é removida de propósito: um `Origin` nunca tem barra, então
    // "https://app.com/" jamais casaria. Colar a URL com barra do navegador é
    // o erro mais fácil de cometer aqui, e o sintoma (CORS bloqueado) não diz
    // que a culpa é de um caractere.
    origin: (process.env.WEB_APP_URL ?? "http://localhost:3000")
      .split(",")
      .map((origem) => origem.trim().replace(/\/+$/, ""))
      .filter(Boolean),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT ? Number(process.env.PORT) : 3333;
  await app.listen(port);
  console.log(`API rodando em http://localhost:${port}`);
}

bootstrap();
