// FigureExtension — noeud TipTap ATOMIQUE pour <figure> (preserve verbatim).
//
// POURQUOI ce noeud existe :
// Les articles de blog stockent leurs photos en HTML brut sous la forme
//   <figure><img src="..." alt="..." loading="lazy"><figcaption>...</figcaption></figure>
// (figure simple) OU sous une forme RICHE importee de Wix/WordPress
//   <figure class="..."><div class="grid ...">...N images...</div><figcaption>...</figcaption></figure>
// directement dans le champ richtext `body`/`content`.
// L'extension Image standard de TipTap ne gere QUE <img> : un editeur sans noeud
// figure DROPPE silencieusement ces noeuds inconnus au chargement -> les photos
// disparaissent des qu'un client edite + sauvegarde un article.
//
// CONCEPTION ATOMIQUE (refonte 2026-06-05, cf. spec figure-atomique-design) :
// Le noeud ne parse JAMAIS l'interieur de la figure. Il capture l'`outerHTML`
// complet dans un attribut `html` et le re-emet a l'identique au save. Cela :
//   - preserve VERBATIM toute figure, y compris les grilles multi-images / div
//     riches (le nœud `content:'inline*'` precedent les collapsait a 1 image),
//   - supprime la classe de bugs null-safe / collapse (plus de `contentElement`,
//     plus de parse du <figcaption>, plus de page blanche sur figure sans legende).
//
// COMPROMIS : la legende n'est plus editable inline apres insertion (le dialog
// d'insertion la capture a la creation). Re-inserer pour la changer.
//
// RENDU PUBLIC : aucun impact. Le site rend le HTML du body directement (Astro,
// pas TipTap). renderHTML ne tourne qu'au save cote navigateur.

import { Node } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    figure: {
      /** Insere une figure (image + legende optionnelle) au curseur. */
      setFigure: (options: { src: string; alt?: string; caption?: string }) => ReturnType;
    };
  }
}

// Echappe le texte injecte dans une legende construite (anti casse du markup).
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Reconstruit un element DOM <figure> a partir d'une chaine HTML.
// Retourne toujours un Element (fallback <figure></figure> vide si html illisible).
function figureElementFromHtml(html: string): HTMLElement {
  const tpl = document.createElement('template');
  tpl.innerHTML = (html ?? '').trim();
  const first = tpl.content.firstElementChild as HTMLElement | null;
  if (first && first.tagName.toLowerCase() === 'figure') return first;
  // Fallback robuste : si le contenu n'est pas une figure exploitable, on emet
  // une figure vide plutot que de planter / renvoyer un noeud inattendu.
  return document.createElement('figure');
}

export const Figure = Node.create({
  name: 'figure',

  group: 'block',
  // ATOMIQUE : le noeud n'a pas de contenu editable. Tout vit dans attrs.html.
  atom: true,
  draggable: true,
  selectable: true,
  // isolating : la selection ne fuit pas hors de la figure (suppression propre).
  isolating: true,

  addAttributes() {
    return {
      html: {
        default: '',
        // Capture l'outerHTML COMPLET de la figure, sans jamais lire son interieur.
        parseHTML: (el) => (el as HTMLElement).outerHTML,
        // Pas de rendu vers un attribut DOM (on reconstruit le noeud dans renderHTML).
        renderHTML: () => ({}),
      },
    };
  },

  parseHTML() {
    return [
      {
        // Matche TOUTE <figure>, simple ou complexe. getAttrs lit l'outerHTML
        // entier : aucune lecture de l'interieur -> plus de bug null-safe / collapse.
        tag: 'figure',
        getAttrs: (el) => ({ html: (el as HTMLElement).outerHTML }),
      },
    ];
  },

  renderHTML({ node }) {
    // DOMOutputSpec = DOM Node : on reconstruit la figure depuis attrs.html pour
    // que editor.getHTML() (au save) re-emette la figure VERBATIM.
    const dom = figureElementFromHtml(node.attrs.html as string);
    return dom;
  },

  addNodeView() {
    return ({ node }) => {
      // Conteneur lecture seule : aperçu fidele (images visibles), bloc
      // selectionnable / supprimable / deplacable, mais non editable a l'interieur.
      const dom = document.createElement('div');
      dom.className = 'cms-figure-block';
      dom.setAttribute('contenteditable', 'false');
      dom.setAttribute('data-figure', 'true');
      dom.style.cssText =
        'position:relative;margin:0.5rem 0;padding:4px;border:1px dashed #cbd5e1;' +
        'border-radius:8px;cursor:grab;background:#f8fafc;';
      // Rend le vrai HTML de la figure (images reellement affichees).
      dom.innerHTML = (node.attrs.html as string) || '<figure></figure>';

      return {
        dom,
        // Pas de contentDOM : noeud atomique, rien d'editable a l'interieur.
        // ignoreMutation : empeche ProseMirror de reparser le sous-arbre (read-only).
        ignoreMutation: () => true,
      };
    };
  },

  addCommands() {
    return {
      setFigure:
        ({ src, alt, caption }) =>
        ({ chain }) => {
          // Construit la chaine HTML de la figure dans la convention parc :
          //   <figure><img src alt loading="lazy"><figcaption>caption</figcaption></figure>
          // figcaption omis si caption vide (convention parc).
          const altAttr =
            alt != null && alt !== '' ? ` alt="${escapeHtml(alt)}"` : '';
          const figcaption =
            caption && caption.trim() !== ''
              ? `<figcaption>${escapeHtml(caption)}</figcaption>`
              : '';
          const html =
            `<figure><img src="${escapeHtml(src)}"${altAttr} loading="lazy">${figcaption}</figure>`;

          return chain()
            .insertContent({
              type: this.name,
              attrs: { html },
            })
            // Repositionne le curseur dans un paragraphe apres la figure.
            .createParagraphNear()
            .run();
        },
    };
  },
});

export default Figure;
