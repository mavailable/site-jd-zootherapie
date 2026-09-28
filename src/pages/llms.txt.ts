import { LLMS_HEAD } from '../data/llms-preamble';
import { pagesPrincipales, url, oneLine, plain } from '../data/llms-derive';
import { getLandingPagesOuvertes } from '../data/llms-lp';
import { getPublishedBlog } from '../data/blog-filter';
import { getSiteInfo, getAbout, getPageTarifs } from '../data/content';

// Derive au build : ne jamais recopier ici une valeur du contenu (cf. llms-derive.ts).
export async function GET() {
  const info = await getSiteInfo();
  const about = await getAbout();
  const tarifs = await getPageTarifs();
  const lps = await getLandingPagesOuvertes();
  // Meme helper que /blog/ et /blog/[slug]/ (brouillons et publications futures exclus).
  const posts = (await getPublishedBlog()).sort((a, b) => new Date(b.data.date).getTime() - new Date(a.data.date).getTime());

  const body = `${LLMS_HEAD}## Pages principales

${pagesPrincipales()}
${lps.map((lp) => `- [${plain(lp.data.meta.title)}](${url(`/lp/${lp.data.slug}/`)}): ${oneLine(lp.data.meta.description)}`).join('\n')}

## Informations clés

- Téléphone : ${info.phoneDisplay}
- E-mail : ${info.email}
- Adresse : ${info.address.street}, ${info.address.postalCode} ${info.address.city} (Moselle)
- Zone d'intervention : ${plain(info.areaServed)}
${tarifs.pricingCards.map((c: any) => `- ${plain(c.title)} : ${plain(c.price)}`).join('\n')}
- Animaux médiateurs : ${about.animals.map((a: any) => `${plain(a.name)} (${plain(a.breed)})`).join(', ')}

## Blog

- [Tous les articles du blog](${url('/blog/')}): articles de terrain sur la médiation animale, du plus récent au plus ancien
${posts.map((p) => `- [${plain(p.data.title)}](${url(`/blog/${p.id}/`)}): ${oneLine(p.data.description)}`).join('\n')}
`;

  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
