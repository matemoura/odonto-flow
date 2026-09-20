/**
 * Endereço da API, resolvido uma vez.
 *
 * O padrão `?? "http://localhost:3333"` espalhado por seis arquivos era o
 * fallback mais perigoso do projeto: esquecer `NEXT_PUBLIC_API_URL` no
 * ambiente de build da Vercel não quebrava nada visível — build passava,
 * deploy passava, a página abria — e só em produção o app tentava falar com um
 * localhost que não existe. O sintoma era "o site abre e nada carrega", sem
 * erro de build nem de servidor para investigar.
 *
 * Agora falha CEDO e ALTO: como `next build` roda com NODE_ENV=production, a
 * ausência da variável derruba o próprio build, que é o único momento em que
 * ainda dá para consertar sem usuário na frente. Em desenvolvimento o padrão
 * de localhost continua, senão `pnpm dev` exigiria configuração à toa.
 *
 * `NEXT_PUBLIC_` é embutido no bundle em tempo de BUILD, não lido em runtime —
 * configurar a variável só no ambiente de execução da Vercel não resolve.
 */
function resolverApiUrl(): string {
  const configurada = process.env.NEXT_PUBLIC_API_URL;
  if (configurada) {
    return configurada;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "NEXT_PUBLIC_API_URL não está definida no ambiente de BUILD. Sem ela o app " +
        "apontaria para http://localhost:3333 e nenhuma tela carregaria em produção. " +
        "Defina-a nas variáveis de ambiente do projeto na Vercel e refaça o deploy.",
    );
  }
  return "http://localhost:3333";
}

export const API_URL = resolverApiUrl();
