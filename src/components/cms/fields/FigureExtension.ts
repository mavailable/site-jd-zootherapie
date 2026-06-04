// FigureExtension — noeud TipTap custom pour <figure><img><figcaption>.
//
// POURQUOI ce noeud existe :
// Les articles de blog stockent leurs photos en HTML brut sous la forme
//   <figure><img src="..." alt="..." loading="lazy"><figcaption>...</figcaption></figure>
// directement dans le champ richtext `body`. L'extension Image standard de TipTap
// ne gere QUE <img> (pas <figure>/<figcaption>) : un editeur sans noeud figure
// DROPPE silencieusement ces noeuds inconnus au chargement -> les photos
// disparaissent des qu'un client edite + sauvegarde un article. Regression de
// donnees garantie.
//
// Ce noeud traite la figure comme un bloc atomique unique :
//   - les attributs src/alt portent l'image,
//   - le contenu inline du noeud = le texte du <figcaption> (editable).
// Round-trip garanti : parseHTML lit la figure existante, renderHTML re-emet
// EXACTEMENT le meme markup (memes balises, meme ordre d'attributs src/alt/loading,
// aucune classe ajoutee) que la convention des figures du parc (cf. wf-00-cms).

import { Node, mergeAttributes } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    figure: {
      /** Insere une figure (image + legende optionnelle) au curseur. */
      setFigure: (options: { src: string; alt?: string; caption?: string }) => ReturnType;
    };
  }
}

export const Figure = Node.create({
  name: 'figure',

  group: 'block',
  // Le contenu inline du noeud = le texte de la legende (<figcaption>).
  content: 'inline*',
  draggable: true,
  // isolating : la selection ne fuit pas hors de la figure (suppression propre,
  // pas de fusion accidentelle avec le paragraphe voisin).
  isolating: true,

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (el) => el.querySelector('img')?.getAttribute('src') ?? null,
      },
      alt: {
        default: null,
        parseHTML: (el) => el.querySelector('img')?.getAttribute('alt') ?? null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'figure',
        // Le contenu editable (legende) vient du <figcaption>, pas du <figure> entier
        // (sinon le <img> serait parse comme contenu et casserait le noeud).
        // NULL-SAFE : si la figure n'a PAS de <figcaption> (cas des photos importees
        // de Wix : <figure><img ...></figure>), une string 'figcaption' ferait
        // resoudre ProseMirror sur null -> addAll(null) -> null.firstChild ->
        // TypeError dans DOMParser.parse -> EditorView throw -> page blanche /admin.
        // On renvoie donc le <figcaption> s'il existe, sinon un <figcaption> detache
        // VIDE (jamais null) : addAll n'itere rien -> legende vide, zero crash.
        contentElement: (dom) =>
          (dom as HTMLElement).querySelector('figcaption') ??
          (dom as HTMLElement).ownerDocument.createElement('figcaption'),
        // Ne matche que les figures qui contiennent une image (garde-fou).
        getAttrs: (el) => {
          const img = (el as HTMLElement).querySelector('img');
          return img ? {} : false;
        },
      },
    ];
  },

  renderHTML({ node }) {
    // Ordre d'attributs aligne sur la convention existante : src, alt, loading.
    const imgAttrs: Record<string, string> = { src: node.attrs.src };
    if (node.attrs.alt != null && node.attrs.alt !== '') imgAttrs.alt = node.attrs.alt;
    imgAttrs.loading = 'lazy';

    return [
      'figure',
      {},
      ['img', mergeAttributes(imgAttrs)],
      // 0 = trou de contenu : TipTap y insere le texte inline (la legende).
      ['figcaption', {}, 0],
    ];
  },

  addCommands() {
    return {
      setFigure:
        ({ src, alt, caption }) =>
        ({ chain }) => {
          const captionContent = caption && caption.trim() !== ''
            ? [{ type: 'text', text: caption }]
            : [];
          return chain()
            .insertContent({
              type: this.name,
              attrs: { src, alt: alt ?? '' },
              content: captionContent,
            })
            // Repositionne le curseur dans un paragraphe apres la figure.
            .createParagraphNear()
            .run();
        },
    };
  },
});

export default Figure;
