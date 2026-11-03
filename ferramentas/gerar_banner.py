"""Gera o banner (880x240) e o botão de um projeto, no estilo visual do perfil.

Uso:
    python ferramentas/gerar_banner.py "Nome do Projeto" "Descrição curta em uma linha" "Python,Pandas,MySQL" nome-arquivo

Saída:
    assets/projetos/<nome-arquivo>.svg   -> banner do projeto
    assets/botoes/<nome-arquivo>.svg     -> botão "Ver repositório"
"""

import sys
from html import escape
from pathlib import Path

ACCENT = "#2BD9A6"
FONT = "'Segoe UI', Ubuntu, 'Helvetica Neue', Arial, sans-serif"
RAIZ = Path(__file__).resolve().parent.parent


def largura_texto(texto: str, tamanho: float) -> float:
    """Estimativa simples da largura do texto em px (fonte sans-serif)."""
    return len(texto) * tamanho * 0.62


def banner(nome: str, descricao: str, tags: list[str]) -> str:
    chips = []
    x = 40
    for tag in tags:
        w = round(largura_texto(tag, 12.5) + 26)
        chips.append(
            f'<g transform="translate({x},176)"><rect width="{w}" height="26" rx="13" '
            f'fill="{ACCENT}" fill-opacity=".08" stroke="{ACCENT}" stroke-opacity=".35"/>'
            f'<text x="{w / 2:.0f}" y="17.5" text-anchor="middle" class="chip">{escape(tag)}</text></g>'
        )
        x += w + 8

    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="880" height="240" viewBox="0 0 880 240" role="img" aria-label="{escape(nome)} — {escape(descricao)}">
  <title>{escape(nome)} — {escape(descricao)}</title>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0d1117"/><stop offset="1" stop-color="#161b22"/></linearGradient>
    <radialGradient id="glow" cx=".85" cy=".3" r=".55"><stop offset="0" stop-color="{ACCENT}" stop-opacity=".22"/><stop offset="1" stop-color="{ACCENT}" stop-opacity="0"/></radialGradient>
    <pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="#ffffff" fill-opacity=".05"/></pattern>
  </defs>
  <style>
    .kicker {{ font: 700 12px {FONT}; letter-spacing: 3px; fill: {ACCENT}; }}
    .nome {{ font: 800 44px {FONT}; fill: #ffffff; }}
    .desc {{ font: 400 18px {FONT}; fill: #c9d1d9; }}
    .chip {{ font: 600 12.5px {FONT}; fill: {ACCENT}; }}
  </style>
  <rect width="880" height="240" rx="18" fill="url(#bg)"/>
  <rect width="880" height="240" rx="18" fill="url(#dots)"/>
  <rect width="880" height="240" rx="18" fill="url(#glow)"/>
  <rect x=".5" y=".5" width="879" height="239" rx="17.5" fill="none" stroke="{ACCENT}" stroke-opacity=".3"/>

  <!-- mini gráfico decorativo -->
  <g transform="translate(700,52)" fill="{ACCENT}">
    <rect x="0" y="70" width="18" height="40" rx="4" fill-opacity=".35"/>
    <rect x="28" y="45" width="18" height="65" rx="4" fill-opacity=".5"/>
    <rect x="56" y="58" width="18" height="52" rx="4" fill-opacity=".65"/>
    <rect x="84" y="20" width="18" height="90" rx="4" fill-opacity=".85"/>
    <rect x="112" y="0" width="18" height="110" rx="4"/>
  </g>

  <text x="40" y="58" class="kicker">PROJETO</text>
  <text x="40" y="112" class="nome">{escape(nome)}</text>
  <text x="40" y="146" class="desc">{escape(descricao)}</text>
  {"".join(chips)}
</svg>
"""


def botao(texto: str = "Ver repositório") -> str:
    w = round(largura_texto(texto, 14) + 58)
    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="38" viewBox="0 0 {w} 38" role="img" aria-label="{escape(texto)}">
  <title>{escape(texto)}</title>
  <rect x=".75" y=".75" width="{w - 1.5}" height="36.5" rx="10" fill="#161b22" stroke="{ACCENT}" stroke-opacity=".6" stroke-width="1.5"/>
  <g transform="translate(16,11) scale(.6667)" fill="none" stroke="{ACCENT}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 16l4-4l-4-4M6 8l-4 4l4 4m8.5-12l-5 16"/></g>
  <text x="40" y="24" style="font: 600 14px {FONT}; fill: #f0f6fc;">{escape(texto)}</text>
</svg>
"""


def main() -> None:
    if len(sys.argv) != 5:
        print(__doc__)
        sys.exit(1)
    nome, descricao, tags, arquivo = sys.argv[1:]
    lista_tags = [t.strip() for t in tags.split(",") if t.strip()]

    pasta_banner = RAIZ / "assets" / "projetos"
    pasta_botao = RAIZ / "assets" / "botoes"
    pasta_banner.mkdir(parents=True, exist_ok=True)
    pasta_botao.mkdir(parents=True, exist_ok=True)

    (pasta_banner / f"{arquivo}.svg").write_text(banner(nome, descricao, lista_tags), encoding="utf-8")
    (pasta_botao / f"{arquivo}.svg").write_text(botao(), encoding="utf-8")
    print(f"Gerado: assets/projetos/{arquivo}.svg e assets/botoes/{arquivo}.svg")


if __name__ == "__main__":
    main()
