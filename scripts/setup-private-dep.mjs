#!/usr/bin/env node
// EXEMPLE — fichier genere par wf-05 dans le repo client : scripts/setup-private-dep.mjs
//
// preinstall (CLIENT). Autorise `npm install` / `npm ci` a cloner la dependance
// git PRIVEE @marc/cms-engine (mavailable/cms-engine) pendant le build Cloudflare
// Pages.
//
// Pourquoi un preinstall : CF Pages lance `npm install`/`npm ci` AVANT la build
// command. Le clone de la dep privee a donc besoin d'un credential avant tout.
// `preinstall` est le seul hook qui s'execute au tout debut de l'install. On y
// configure une reecriture d'URL git porteuse du token.
//
// PIEGE RESOLU (pilote Buddha View 2026-06-27) : npm NORMALISE un dep git+https
// GitHub en `git+ssh://git@github.com/...` dans le `resolved` du package-lock.json.
// CF (`npm ci`) utilise alors l'URL SSH -> echec "Permission denied (publickey)"
// car le conteneur de build CF n'a pas de cle SSH. Un rewrite https->https tokenise
// SEUL ne suffit donc PAS : il faut AUSSI rewriter les formes ssh:// et scp
// (git@github.com:) vers le https tokenise. En local le dev a sa cle SSH, ce qui
// masque le bug -> a ne valider QUE sur un vrai deploy CF.
//
// SECURITE : n'agit QUE quand on tourne dans CF Pages (CF_PAGES) ET qu'un token est
// present. En local, le script ne fait RIEN (le dev s'appuie sur ses propres
// credentials git) -> jamais de pollution du ~/.gitconfig global du dev.

import { execFileSync } from 'node:child_process';

const token = process.env.CMS_ENGINE_TOKEN;
const inCloudflarePages = Boolean(process.env.CF_PAGES);

if (!token) {
  // Local (ou CI sans token) : on laisse les credentials git existants gerer le clone.
  process.exit(0);
}

if (!inCloudflarePages) {
  // Garde-fou : un token present hors CF Pages ne doit pas reecrire le git global du dev.
  console.warn('[setup-private-dep] CMS_ENGINE_TOKEN present hors CF Pages : ignore (securite).');
  process.exit(0);
}

try {
  // URL cible authentifiee en HTTPS. Config globale du conteneur de build CF
  // Pages (ephemere, detruit apres le build).
  const base = `https://x-access-token:${token}@github.com/`;
  // Toutes les formes d'URL GitHub que npm peut resoudre (le lock normalise en ssh).
  const sources = [
    'https://github.com/',
    'ssh://git@github.com/',
    'git@github.com:',
  ];
  for (const src of sources) {
    execFileSync('git', ['config', '--global', '--add', `url.${base}.insteadOf`, src], {
      stdio: 'ignore',
    });
  }
  console.log('[setup-private-dep] acces dep git privee configure (https + ssh + scp) pour le build CF Pages.');
} catch (err) {
  console.error('[setup-private-dep] echec configuration git :', err.message);
  process.exit(1);
}
