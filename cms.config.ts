import type { CmsConfig } from './cms.types';

const cmsConfig: CmsConfig = {
  repo: 'mavailable/site-jd-zootherapie',
  branch: 'dev',
  siteName: 'JD Zoothérapie',

  singletons: {
    'site-info': {
      label: 'Infos du site',
      description: 'Nom, téléphone, email, adresse, réseaux sociaux',
      path: 'src/content/site-info/index.json',
      fields: {
        name: { type: 'text', label: 'Nom commercial' },
        alternateName: { type: 'text', label: 'Nom alternatif' },
        tagline: { type: 'text', label: 'Tagline' },
        phone: { type: 'text', label: 'Téléphone (+33...)' },
        phoneDisplay: { type: 'text', label: 'Téléphone (affichage)' },
        email: { type: 'text', label: 'Email' },
        address: {
          type: 'object',
          label: 'Adresse',
          fields: {
            street: { type: 'text', label: 'Rue' },
            city: { type: 'text', label: 'Ville' },
            postalCode: { type: 'text', label: 'Code postal' },
            region: { type: 'text', label: 'Région' },
            country: { type: 'text', label: 'Pays (code ISO)' },
          },
        },
        areaServed: { type: 'text', label: "Zone d'intervention" },
        social: {
          type: 'object',
          label: 'Réseaux sociaux',
          fields: {
            instagram: { type: 'text', label: 'Instagram URL' },
            facebook: { type: 'text', label: 'Facebook URL' },
            googleBusiness: { type: 'text', label: 'Google Business URL' },
          },
        },
      },
    },

    hero: {
      label: 'Hero',
      description: "Titre, sous-titre et boutons d'appel à l'action",
      path: 'src/content/hero/index.json',
      fields: {
        h1: { type: 'text', label: 'Titre H1' },
        subtitle: { type: 'text', label: 'Sous-titre', multiline: true },
        ctaPrimaryText: { type: 'text', label: 'CTA principal — texte' },
        ctaPrimaryHref: { type: 'text', label: 'CTA principal — lien' },
        ctaSecondaryText: { type: 'text', label: 'CTA secondaire — texte' },
        ctaSecondaryHref: { type: 'text', label: 'CTA secondaire — lien' },
        reassurance: { type: 'text', label: 'Réassurance' },
      },
    },

    about: {
      label: 'À propos',
      description: 'Présentation de Jennifer et des animaux',
      path: 'src/content/about/index.json',
      fields: {
        founderName: { type: 'text', label: 'Nom' },
        founderTitle: { type: 'text', label: 'Titre / fonction' },
        paragraphs: {
          type: 'array',
          label: 'Paragraphes',
          itemLabel: '',
          item: { type: 'text', label: 'Paragraphe', multiline: true },
        },
        animals: {
          type: 'array',
          label: 'Animaux médiateurs',
          itemLabel: 'name',
          item: {
            type: 'object',
            label: 'Animal',
            fields: {
              name: { type: 'text', label: 'Nom' },
              breed: { type: 'text', label: 'Race' },
              role: { type: 'text', label: 'Rôle en séance', multiline: true },
            },
          },
        },
      },
    },

    contact: {
      label: 'Contact',
      description: 'Titre, sous-titre, bouton formulaire',
      path: 'src/content/contact/index.json',
      fields: {
        title: { type: 'text', label: 'Titre' },
        subtitle: { type: 'text', label: 'Sous-titre', multiline: true },
        buttonText: { type: 'text', label: 'Texte du bouton' },
        web3formsKey: { type: 'text', label: 'Cle Web3Forms (formulaire)', description: 'Collez votre cle pour recevoir vos formulaires directement. Guide : marcm.fr/aide/web3forms' },
      },
    },

    'page-zootherapie': {
      label: 'Page Zoothérapie',
      description: 'Contenu de la page La zoothérapie',
      path: 'src/content/page-zootherapie/index.json',
      fields: {
        heroH1: { type: 'text', label: 'Titre hero' },
        heroSubtitle: { type: 'text', label: 'Sous-titre hero', multiline: true },
        introHeading: { type: 'text', label: 'Titre introduction' },
        introParagraphs: { type: 'array', label: 'Paragraphes intro', itemLabel: '', item: { type: 'text', label: 'Paragraphe', multiline: true } },
        benefitsHeading: { type: 'text', label: 'Titre bénéfices' },
        benefits: { type: 'array', label: 'Bénéfices', itemLabel: 'title', item: { type: 'object', label: 'Bénéfice', fields: { title: { type: 'text', label: 'Titre' }, description: { type: 'text', label: 'Description', multiline: true } } } },
        publicsHeading: { type: 'text', label: 'Titre publics' },
        publicsIntro: { type: 'text', label: 'Intro publics', multiline: true },
        publicsList: { type: 'array', label: 'Liste publics', itemLabel: '', item: { type: 'text', label: 'Public' } },
        sidebarHeading: { type: 'text', label: 'Titre sidebar' },
        sidebarText: { type: 'text', label: 'Texte sidebar', multiline: true },
        sidebarCta: { type: 'text', label: 'CTA sidebar' },
        ctaTitle: { type: 'text', label: 'CTA bannière titre' },
        ctaText: { type: 'text', label: 'CTA bannière texte' },
        ctaSecondaryText: { type: 'text', label: 'CTA secondaire' },
      },
    },

    'page-ateliers': {
      label: 'Page Ateliers',
      description: 'Contenu de la page Les ateliers',
      path: 'src/content/page-ateliers/index.json',
      fields: {
        heroH1: { type: 'text', label: 'Titre hero' },
        heroSubtitle: { type: 'text', label: 'Sous-titre hero', multiline: true },
        servicesTitle: { type: 'text', label: 'Titre section services' },
        servicesSubtitle: { type: 'text', label: 'Sous-titre services', multiline: true },
        ctaTitle: { type: 'text', label: 'CTA bannière titre' },
        ctaText: { type: 'text', label: 'CTA bannière texte' },
        ctaSecondaryText: { type: 'text', label: 'CTA secondaire' },
      },
    },

    'page-tarifs': {
      label: 'Page Tarifs',
      description: 'Contenu de la page Tarifs',
      path: 'src/content/page-tarifs/index.json',
      fields: {
        heroH1: { type: 'text', label: 'Titre hero' },
        heroSubtitle: { type: 'text', label: 'Sous-titre hero', multiline: true },
        ctaTitle: { type: 'text', label: 'CTA bannière titre' },
        ctaText: { type: 'text', label: 'CTA bannière texte' },
      },
    },

    'page-temoignages': {
      label: 'Page Témoignages',
      description: 'Contenu de la page Témoignages',
      path: 'src/content/page-temoignages/index.json',
      fields: {
        heroH1: { type: 'text', label: 'Titre hero' },
        heroSubtitle: { type: 'text', label: 'Sous-titre hero', multiline: true },
        noteText: { type: 'text', label: 'Note bas de page', multiline: true },
        shareCta: { type: 'text', label: 'CTA partage' },
        pressHeading: { type: 'text', label: 'Titre section presse' },
        ctaTitle: { type: 'text', label: 'CTA bannière titre' },
        ctaText: { type: 'text', label: 'CTA bannière texte' },
        ctaSecondaryText: { type: 'text', label: 'CTA secondaire' },
      },
    },

    'page-a-propos': {
      label: 'Page À propos',
      description: 'Contenu de la page Mon parcours',
      path: 'src/content/page-a-propos/index.json',
      fields: {
        heroH1: { type: 'text', label: 'Titre hero' },
        heroSubtitle: { type: 'text', label: 'Sous-titre hero', multiline: true },
        ctaTitle: { type: 'text', label: 'CTA bannière titre' },
        ctaText: { type: 'text', label: 'CTA bannière texte' },
        ctaSecondaryText: { type: 'text', label: 'CTA secondaire' },
      },
    },

    gallery: {
      label: 'Galerie photos',
      description: 'Photos et légendes de la galerie',
      path: 'src/content/gallery/index.json',
      fields: {
        sectionLabel: { type: 'text', label: 'Label section' },
        heading: { type: 'text', label: 'Titre' },
        description: { type: 'text', label: 'Description', multiline: true },
        quote: { type: 'text', label: 'Citation', multiline: true },
        quoteAttribution: { type: 'text', label: 'Attribution citation' },
      },
    },

    seo: {
      label: 'SEO / Referencement',
      description: 'Nom du site et image de partage reseaux sociaux',
      path: 'src/content/seo/index.json',
      fields: {
        global: {
          type: 'object',
          label: 'Parametres globaux',
          fields: {
            siteName: { type: 'text', label: 'Nom du site (onglets navigateur)' },
            separator: { type: 'text', label: 'Separateur titre (ex: —)' },
            defaultOgImage: { type: 'image', label: 'Image de partage par defaut' },
          },
        },
      },
    },
  },

  collections: {
    services: {
      label: 'Services / Ateliers',
      description: 'Prestations proposées',
      path: 'src/content/services',
      slugField: 'slug',
      fields: {
        slug: { type: 'text', label: 'Identifiant (slug)' },
        title: { type: 'text', label: 'Titre du service' },
        audience: { type: 'text', label: 'Public cible' },
        description: { type: 'text', label: 'Description', multiline: true },
        price: { type: 'text', label: 'Tarif' },
        order: { type: 'number', label: "Ordre d'affichage" },
      },
    },

    testimonials: {
      label: 'Témoignages',
      description: 'Avis clients',
      path: 'src/content/testimonials',
      slugField: 'slug',
      fields: {
        slug: { type: 'text', label: 'Identifiant (slug)' },
        author: { type: 'text', label: 'Prénom + initiale' },
        context: { type: 'text', label: 'Contexte' },
        quote: { type: 'text', label: 'Citation', multiline: true },
        order: { type: 'number', label: "Ordre d'affichage" },
      },
    },

    faq: {
      label: 'FAQ',
      description: 'Questions fréquentes',
      path: 'src/content/faq',
      slugField: 'slug',
      fields: {
        slug: { type: 'text', label: 'Identifiant (slug)' },
        question: { type: 'text', label: 'Question' },
        answer: { type: 'text', label: 'Réponse', multiline: true },
        order: { type: 'number', label: "Ordre d'affichage" },
      },
    },

    blog: {
      label: 'Articles de blog',
      description: 'Articles du blog',
      path: 'src/content/blog',
      slugField: 'title',
      fields: {
        title: { type: 'text', label: "Titre de l'article" },
        description: { type: 'text', label: 'Description', multiline: true },
        date: { type: 'date', label: 'Date de publication' },
        category: {
          type: 'select',
          label: 'Catégorie',
          options: [
            { label: 'Récits de terrain', value: 'Récits de terrain' },
            { label: 'Science & recherche', value: 'Science & recherche' },
            { label: 'Conseils pratiques', value: 'Conseils pratiques' },
            { label: 'Idées reçues', value: 'Idées reçues' },
          ],
        },
        body: { type: 'richtext', label: 'Contenu (Markdown)' },
      },
    },
  },
};

export default cmsConfig;
