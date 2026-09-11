/**
 * Ícones de linha usados dentro de botões e links.
 *
 * Duas decisões que valem para todos:
 *
 * - `stroke="currentColor"`: o ícone herda a cor do texto do botão, que já vem
 *   da paleta. Assim ele acompanha automaticamente as variantes (primário,
 *   secundário, ghost) e os estados de hover/foco, sem uma cor fixa que
 *   destoaria em alguma delas.
 * - `aria-hidden`: o rótulo ao lado já diz o que o botão faz. Um `alt` aqui
 *   faria o leitor de tela anunciar a mesma coisa duas vezes.
 */

type Props = { tamanho?: number };

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export function IconeEmail({ tamanho = 16 }: Props) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" aria-hidden="true" {...base}>
      <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" />
      <path d="M3 7l8.2 5.6a1.5 1.5 0 0 0 1.6 0L21 7" />
    </svg>
  );
}

export function IconeWhatsApp({ tamanho = 16 }: Props) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" aria-hidden="true" {...base}>
      {/* Balão com a "rabicho" embaixo à esquerda, como o do WhatsApp. */}
      <path d="M20.5 11.5a8.5 8.5 0 0 1-12.4 7.5L3.5 20.5l1.5-4.6A8.5 8.5 0 1 1 20.5 11.5z" />
      {/* Fone de ouvido simplificado no miolo — legível a 16px. */}
      <path d="M9.3 8.6c.3-.1.6 0 .8.3l.7 1.2c.1.3.1.6-.1.8l-.5.5a5.2 5.2 0 0 0 2.4 2.4l.5-.5c.2-.2.5-.2.8-.1l1.2.7c.3.2.4.5.3.8-.2.7-.9 1.2-1.7 1.1a7.3 7.3 0 0 1-5.5-5.5c-.1-.8.4-1.5 1.1-1.7z" />
    </svg>
  );
}
