// Gera os cards de estatísticas e de linguagens do perfil (SVG) direto da API do GitHub.
// Não depende de nenhum serviço externo: roda no GitHub Actions e publica na branch "output".
//
// Uso:          GITHUB_TOKEN=... node .github/scripts/stats.mjs <usuario> <pasta-de-saida>
// Teste local:  STATS_FIXTURE=dados.json node .github/scripts/stats.mjs <usuario> <pasta>

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [login = 'gabrieldasilva88188', outDir = 'dist'] = process.argv.slice(2);

const ACCENT = '#2BD9A6';
const FONT = "'Segoe UI', Ubuntu, 'Helvetica Neue', Arial, sans-serif";
const IGNORAR_LINGUAGENS = new Set(['Jupyter Notebook']); // notebooks inflam o tamanho; troque se quiser

// Ícones Lucide (licença ISC), só o conteúdo interno de um SVG 24x24
const ICONES = {
  grafico: '<path d="M3 3v16a2 2 0 0 0 2 2h16m-3-4V9m-5 8V5M8 17v-3"/>',
  commit: '<circle cx="12" cy="12" r="3"/><path d="M3 12h6m6 0h6"/>',
  pr: '<circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7M6 9v12"/>',
  issue: '<circle cx="12" cy="12" r="1"/><circle cx="12" cy="12" r="10"/>',
  estrela: '<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.12 2.12 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.12 2.12 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.12 2.12 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.12 2.12 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.12 2.12 0 0 0 1.597-1.16z"/>',
  repo: '<path d="M10 2v8l3-3l3 3V2"/><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20"/>',
  pessoas: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 3.128a4 4 0 0 1 0 7.744M22 21v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/>',
  codigo: '<path d="m18 16l4-4l-4-4M6 8l-4 4l4 4m8.5-12l-5 16"/>',
};

const QUERY = `query($login: String!, $after: String) {
  user(login: $login) {
    createdAt
    followers { totalCount }
    pullRequests { totalCount }
    issues { totalCount }
    contributionsCollection {
      totalCommitContributions
      restrictedContributionsCount
      contributionCalendar { totalContributions }
    }
    repositories(ownerAffiliations: OWNER, isFork: false, first: 100, after: $after) {
      totalCount
      pageInfo { hasNextPage endCursor }
      nodes {
        stargazerCount
        languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
          edges { size node { name color } }
        }
      }
    }
  }
}`;

async function buscarUsuario() {
  if (process.env.STATS_FIXTURE) return JSON.parse(readFileSync(process.env.STATS_FIXTURE, 'utf8'));
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN não definido');

  let user;
  let after = null;
  const repos = [];
  do {
    const res = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: { Authorization: `bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: QUERY, variables: { login, after } }),
    });
    const json = await res.json();
    if (!res.ok || json.errors) throw new Error(JSON.stringify(json.errors ?? json));
    user = json.data.user;
    repos.push(...user.repositories.nodes);
    after = user.repositories.pageInfo.hasNextPage ? user.repositories.pageInfo.endCursor : null;
  } while (after);
  user.repositories.nodes = repos;
  return user;
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const num = (n) => n.toLocaleString('pt-BR');
const icone = (nome, x, y, tamanho = 16) =>
  `<g transform="translate(${x},${y}) scale(${tamanho / 24})" fill="none" stroke="${ACCENT}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONES[nome]}</g>`;

function moldura(largura, altura, titulo, nomeIcone, corpo) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${largura}" height="${altura}" viewBox="0 0 ${largura} ${altura}" role="img" aria-label="${esc(titulo)}">
  <title>${esc(titulo)}</title>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0d1117"/><stop offset="1" stop-color="#161b22"/></linearGradient>
    <radialGradient id="glow" cx="1" cy="0" r=".9"><stop offset="0" stop-color="${ACCENT}" stop-opacity=".15"/><stop offset="1" stop-color="${ACCENT}" stop-opacity="0"/></radialGradient>
  </defs>
  <style>
    .titulo { font: 700 16px ${FONT}; fill: #ffffff; }
    .rotulo { font: 400 13.5px ${FONT}; fill: #c9d1d9; }
    .valor { font: 700 13.5px ${FONT}; fill: #ffffff; }
    .grande { font: 800 26px ${FONT}; fill: #ffffff; }
    .pequeno { font: 400 12px ${FONT}; fill: #8b949e; }
    .linha { animation: entrar .5s ease-out backwards; }
    @keyframes entrar { from { opacity: 0; transform: translateX(-6px) } to { opacity: 1; transform: none } }
  </style>
  <rect width="${largura}" height="${altura}" rx="14" fill="url(#bg)"/>
  <rect width="${largura}" height="${altura}" rx="14" fill="url(#glow)"/>
  <rect x=".5" y=".5" width="${largura - 1}" height="${altura - 1}" rx="13.5" fill="none" stroke="${ACCENT}" stroke-opacity=".35"/>
  ${icone(nomeIcone, 24, 22, 18)}
  <text x="50" y="37" class="titulo">${esc(titulo)}</text>
  ${corpo}
</svg>
`;
}

function cardEstatisticas(u) {
  const estrelas = u.repositories.nodes.reduce((s, r) => s + r.stargazerCount, 0);
  const desde = new Date(u.createdAt).getFullYear();
  const c = u.contributionsCollection;
  const linhas = [
    ['commit', 'Commits no último ano', c.totalCommitContributions + c.restrictedContributionsCount],
    ['pr', 'Pull requests', u.pullRequests.totalCount],
    ['issue', 'Issues', u.issues.totalCount],
    ['repo', 'Repositórios', u.repositories.totalCount],
    ['estrela', 'Estrelas recebidas', estrelas],
    ['pessoas', 'Seguidores', u.followers.totalCount],
  ];
  const lista = linhas.map(([ic, rotulo, valor], i) => {
    const y = 68 + i * 27;
    return `<g class="linha" style="animation-delay:${150 + i * 90}ms">${icone(ic, 24, y - 12)}<text x="50" y="${y}" class="rotulo">${esc(rotulo)}</text><text x="246" y="${y}" class="valor" text-anchor="end">${num(valor)}</text></g>`;
  }).join('\n  ');

  const destaque = `
  <line x1="272" y1="58" x2="272" y2="210" stroke="#30363d"/>
  <g transform="translate(346,0)">
    <circle cx="0" cy="118" r="52" fill="none" stroke="#30363d" stroke-width="6"/>
    <circle cx="0" cy="118" r="52" fill="none" stroke="${ACCENT}" stroke-width="6" stroke-linecap="round" stroke-dasharray="327" stroke-dashoffset="0" transform="rotate(-90 0 118)">
      <animate attributeName="stroke-dashoffset" from="327" to="0" dur="1.2s" fill="freeze"/>
    </circle>
    <text x="0" y="124" class="grande" text-anchor="middle">${num(c.contributionCalendar.totalContributions)}</text>
    <text x="0" y="142" class="pequeno" text-anchor="middle">contribuições</text>
    <text x="0" y="196" class="pequeno" text-anchor="middle">no último ano · desde ${desde}</text>
  </g>`;

  return moldura(440, 232, 'Estatísticas no GitHub', 'grafico', lista + destaque);
}

function cardLinguagens(u) {
  const totais = new Map();
  for (const repo of u.repositories.nodes) {
    for (const { size, node } of repo.languages.edges) {
      if (IGNORAR_LINGUAGENS.has(node.name)) continue;
      const atual = totais.get(node.name) ?? { size: 0, color: node.color ?? '#8b949e' };
      atual.size += size;
      totais.set(node.name, atual);
    }
  }
  const todas = [...totais.entries()].sort((a, b) => b[1].size - a[1].size);
  const soma = todas.reduce((s, [, v]) => s + v.size, 0) || 1;
  const top = todas.slice(0, 8);

  const W = 440;
  const barraX = 24;
  const barraW = W - 48;
  let x = barraX;
  const segmentos = top.map(([, v]) => {
    const w = (v.size / soma) * barraW;
    const seg = `<rect x="${x.toFixed(2)}" y="56" width="${w.toFixed(2)}" height="10" fill="${v.color}"/>`;
    x += w;
    return seg;
  }).join('');

  const lista = top.length
    ? top.map(([nome, v], i) => {
        const col = i % 2;
        const lin = Math.floor(i / 2);
        const lx = 24 + col * 202;
        const ly = 96 + lin * 28;
        const pct = ((v.size / soma) * 100).toFixed(1).replace('.', ',');
        return `<g class="linha" style="animation-delay:${150 + i * 70}ms"><circle cx="${lx + 5}" cy="${ly - 4}" r="5" fill="${v.color}"/><text x="${lx + 18}" y="${ly}" class="rotulo">${esc(nome)}</text><text x="${lx + 190}" y="${ly}" class="valor" text-anchor="end">${pct}%</text></g>`;
      }).join('\n  ')
    : `<text x="${W / 2}" y="130" class="pequeno" text-anchor="middle">Nenhum código público ainda</text>`;

  const corpo = `<clipPath id="barra"><rect x="${barraX}" y="56" width="${barraW}" height="10" rx="5"/></clipPath>
  <rect x="${barraX}" y="56" width="${barraW}" height="10" rx="5" fill="#30363d"/>
  <g clip-path="url(#barra)">${segmentos}</g>
  ${lista}`;
  return moldura(W, 232, 'Linguagens mais usadas', 'codigo', corpo);
}

const usuario = await buscarUsuario();
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'stats.svg'), cardEstatisticas(usuario));
writeFileSync(join(outDir, 'top-langs.svg'), cardLinguagens(usuario));
console.log(`cards gerados em ${outDir}/`);
