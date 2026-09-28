import { LLMS_FULL_HEAD, LLMS_FULL_TAIL } from '../data/llms-preamble';
import { pagesPrincipales, url, plain } from '../data/llms-derive';
import { getLandingPagesOuvertes } from '../data/llms-lp';
import { getPublishedBlog } from '../data/blog-filter';
import {
  getSiteInfo, getAbout, getServices, getFaq, getTestimonials,
  getPageTarifs, getPageZootherapie, getPageAteliers,
} from '../data/content';
import { business } from '../data/business';

// Derive au build : ne jamais recopier ici une valeur du contenu (cf. llms-derive.ts).
const paras = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v : [v ?? ''])
    .flatMap((s) => plain(s).split(/\n\s*\n/))
    .map((x) => x.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n\n');
function excerpt(html: string, max = 1500): string {
  const t = plain(html).replace(/\s+/g, ' ');
  return t.length <= max ? t : `${t.slice(0, max).replace(/\s+\S*$/, '')}...`;
}
const iso = (d: unknown) => {
  const x = new Date(d as string);
  return Number.isNaN(x.getTime()) ? String(d ?? '') : x.toISOString().slice(0, 10);
};

export async function GET() {
  const info = await getSiteInfo();
  const about = await getAbout();
  const tarifs = await getPageTarifs();
  const zoo = await getPageZootherapie();
  const ateliers = await getPageAteliers();
  const lps = await getLandingPagesOuvertes();
  const posts = (await getPublishedBlog()).sort((a, b) => new Date(b.data.date).getTime() - new Date(a.data.date).getTime());
  const social = Object.entries(info.social ?? {}).filter(([, v]) => v).map(([k, v]) => `- ${k} : ${v}`).join('\n');

  const body = `${LLMS_FULL_HEAD}## Informations générales

- **Nom** : ${info.name} (${info.alternateName})
- **Praticienne** : ${about.founderName}, ${plain(about.founderTitle).toLowerCase()}
- **Adresse** : ${info.address.street}, ${info.address.postalCode} ${info.address.city}, Moselle
- **Zone d'intervention** : ${plain(info.areaServed)}
- **Téléphone** : ${info.phoneDisplay}
- **E-mail** : ${info.email}
- **Site web** : ${url('/')}
- **Affiliations** : ${(info.affiliations ?? []).join(', ')}
${business.rating?.platform ? `- **Avis** : ${business.rating.value}/5 sur ${business.rating.platform} (${business.rating.count} avis)\n` : ''}
## Pages

${pagesPrincipales()}
${lps.map((lp) => `- [${plain(lp.data.meta.title)}](${url(`/lp/${lp.data.slug}/`)}): ${plain(lp.data.meta.description)}`).join('\n')}

## À propos

${paras(about.paragraphs)}

### Animaux médiateurs

${about.animals.map((a: any) => `- **${plain(a.name)}** (${plain(a.breed)}) : ${plain(a.role)}`).join('\n')}

## ${plain(zoo.introHeading)}

${paras(zoo.introParagraphs)}

### ${plain(zoo.benefitsHeading)}

${zoo.benefits.map((b: any) => `- **${plain(b.title)}** : ${plain(b.description)}`).join('\n')}

### ${plain(zoo.publicsHeading)}

${plain(zoo.publicsIntro)}

${zoo.publicsList.map((p: string) => `- ${plain(p)}`).join('\n')}

## Tarifs

${tarifs.pricingCards.map((c: any) => `### ${plain(c.title)} : ${plain(c.price)}\n\n${plain(c.description)}\n\n${(c.features ?? []).map((f: string) => `- ${plain(f)}`).join('\n')}`).join('\n\n')}

### ${plain(tarifs.deploymentTitle)}

${plain(tarifs.deploymentText)}

## Services

${(await getServices()).map((s: any) => `### ${plain(s.title)}${s.price ? ` (${plain(s.price)})` : ''}\n\n${s.audience ? `Pour qui : ${plain(s.audience)}\n\n` : ''}${paras(s.description)}`).join('\n\n')}

## ${plain(ateliers.zoneHeading)}

${ateliers.zoneCards.map((z: any) => `- **${plain(z.title)}** : ${plain(z.description)}`).join('\n')}

## ${plain(ateliers.firstSessionHeading)}

${ateliers.firstSessionSteps.map((s: string, i: number) => `${i + 1}. ${plain(s)}`).join('\n')}

## Témoignages

${(await getTestimonials()).map((t: any) => `- **${plain(t.author)}**${t.context ? ` (${plain(t.context)})` : ''} : "${plain(t.quote)}"`).join('\n')}

## FAQ

${(await getFaq()).map((f: any) => `### ${plain(f.question)}\n\n${paras(f.answer)}`).join('\n\n')}

## Articles du blog

Liste complète : ${url('/blog/')}

${posts.map((p) => `### ${plain(p.data.title)}\nURL: ${url(`/blog/${p.id}/`)}\nDate: ${iso(p.data.date)}, Catégorie : ${p.data.category ?? ''}\n\n${excerpt(p.data.body)}\n`).join('\n')}
${LLMS_FULL_TAIL}
## Réseaux sociaux

${social}
`;

  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
