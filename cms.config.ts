import type { CmsConfig } from '@marc/cms-engine/types';

const cmsConfig: CmsConfig = {
  vocaux: {
    enabled: true,
    hint: 'Enregistre une note vocale pour proposer un sujet d\'article, partager une expérience ou poser une question. Marc reçoit le vocal et le traite.',
  },

  crm: {
    enabled: true, // D1 jdzoo-crm bindée (DB) sur production + preview le 2026-06-08.
    label: 'Prospects',
    itemLabel: 'prospect', // v0.12.2 : « Ajouter un prospect », « Fiche prospect »…
    columns: [
      { status: 'nouveau', label: 'Nouveau', hint: 'À traiter', dot: '#94a3b8' },
      { status: 'contacte', label: 'Contacté', hint: 'Premier contact', dot: '#3b82f6' },
      { status: 'rdv', label: 'RDV / échange', hint: 'En discussion', dot: '#0ea5e9' },
      { status: 'devis', label: 'Devis envoyé', hint: 'Proposition faite', dot: '#f59e0b' },
      { status: 'gagne', label: 'Gagné', hint: 'Conclu ✅', dot: '#16a34a' },
      { status: 'perdu', label: 'Perdu', hint: 'Sans suite', dot: '#cbd5e1' },
    ],
    billing: false,  // Jen ne facture pas — masque Facturation & vente (v0.12.1)
    einvoice: false, // explicite (défaut false)
  },

  marketing: {
    enabled: true,
    trimesters: ['2026-Q2'],
    carrousels: {
      enabled: true,
    },
  },

  gbp: {
    enabled: true,
    mode: 'live',
    gbpEditUrl: 'https://business.google.com/posts',
    utmCampaignPrefix: 'blog',
    accountId: 'accounts/101943929235366217597',
    locationId: 'locations/8153826328713306145',
  },

  repo: 'mavailable/site-jd-zootherapie',
  branch: 'master',
  siteName: 'JD Zoothérapie',
  siteLogo: '/images/logo-admin.png', // emblème JD Zoothérapeute (chien + Jennifer + lapin), teal/encre sur transparent — lisible fond clair, header + page de login /admin

  // ─── Thème de l'espace /admin : variante claire « Teal Nature » (crème écru + accent teal + texte gris chaud) ───
  // Dérivé du design-system racine (theme actif « Teal Nature / Brun Doré / Terracotta / Gris Chaud »).
  // Reprend l'ambiance « chaleureuse, douce et naturelle » du site : fond crème (secondary-50, terre/nature),
  // texte en gris chaud neutre (neutral 700→950), et accent TEAL (primary-700, couleur dominante de la marque)
  // qui ressort comme couleur interactive (liens, onglet actif, boutons). Sans ce bloc, /admin retombe sur
  // le chrome bleu standard du parc (fallback byte-for-byte — adminTheme.ts du moteur).
  // Contrastes WCAG vérifiés (scripts/admin-theme-validate.py, exit 0) :
  //   accent 7.64 / accentDeep 8.69 sur accentSoft / ink 15.01 (AAA) / inkSoft 7.18 / muted 5.59 / muted2 4.83 sur blanc ; accent 7.14 sur bg crème.
  adminTheme: {
    accent: '#305A5E',        // teal primary-700 — liens, onglet actif, boutons (7.64:1 sur blanc / 7.14:1 sur crème)
    accentDeep: '#2D4B4E',    // teal primary-800 — texte sur pastille accentSoft, badges (8.69:1 sur accentSoft)
    accentSoft: '#F0F7F7',    // teal primary-50 — pastilles, boutons secondaires
    accentBorder: '#B6DDE0',  // teal primary-200 — bordures accent
    ink: '#2A2622',           // gris chaud neutral-950 — titres (15.01:1, AAA)
    inkSoft: '#5F564D',       // gris chaud neutral-800 — labels (7.18:1)
    muted: '#71665B',         // gris chaud neutral-700 — paragraphes (5.59:1)
    muted2: '#7C7062',        // gris chaud (entre neutral-600/700) — méta, contacts (4.83:1)
    muted3: '#9D9385',        // gris chaud neutral-500 — hints, dates (3.02:1, WARN toléré)
    line: '#E0DCD5',          // gris chaud neutral-200 — bordures de cartes
    lineSoft: '#F1EFEB',      // gris chaud neutral-100 — séparateurs très doux
    borderInput: '#CBC5BB',   // gris chaud neutral-300 — bordure des champs
    surface: '#ffffff',       // fond des cartes
    bg: '#FBF7ED',            // crème écru secondary-50 — fond de l'espace (terre/nature/chaleur)
    fontBody: "'DM Sans', system-ui, sans-serif",  // même corps que le site
    fontHeading: "'Lora', Georgia, serif",         // même titrage serif chaleureux que le site
  },

  // Modules du moteur montés dans /admin (AdminIsland généré par le scaffold les importe).
  modules: ['crm', 'marketing', 'vocaux', 'gallery'],

  site: {
    // Webmaster (agence) — valeurs explicites (les composants /admin n'ont plus de
    // defaut code en dur). helpUrl par defaut du parc agence.
    webmasterName: 'Marc',
    helpUrl: 'https://marcm.fr/aide/web3forms/',
    ownerName: 'Jennifer De Groeve',
    phone: '+33754812122',
    phoneDisplay: '07 54 81 21 22',
    email: 'degroeve.j@gmail.com',
    siteUrl: 'https://jdzootherapeute.fr',
    previewUrl: 'https://site-jd-zootherapie.pages.dev',
    clientType: 'freelance-consultant',
    tagline: 'Zoothérapeute en Moselle',
    calUrl: 'https://cal.eu/jdzootherapie/30min',
    umamiSiteId: '96fd46e0-47fa-4c79-abda-447fa79bd0f4',
    umamiShareUrl: 'https://cloud.umami.is/share/7qxMncBLuGRFA5uK/jdzootherapeute.fr',
    contactMarc: {
      phone: '06 88 76 66 48',
      whatsapp: '33688766648',
      email: 'marc@muller.im',
    },
  },

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

    'gbp-posts': {
      label: 'Historique GBP',
      description: "Historique des posts Google Business Profile (surface d'édition normale : onglet Posts GBP du module marketing)",
      path: 'src/content/gbp-posts/index.json',
      dashboardPriority: 99, // pas de flag hidden dans le moteur — relégué en bas du groupe reglages
      fields: {
        history: {
          type: 'array',
          label: 'Posts publiés',
          itemLabel: 'sourceArticleTitle',
          item: {
            type: 'object',
            label: 'Post',
            fields: {
              id: { type: 'text', label: 'ID' },
              publishedAt: { type: 'text', label: 'Publié le' },
              text: { type: 'text', label: 'Texte du post', multiline: true },
              cta: { type: 'text', label: 'CTA' },
              ctaUrl: { type: 'text', label: 'URL CTA' },
              image: { type: 'text', label: 'Image' },
              sourceArticleSlug: { type: 'text', label: 'Slug article source' },
              sourceArticleTitle: { type: 'text', label: 'Titre article source' },
            },
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
      listMeta: {
        date: true,
        words: true,
        photos: true,
        readingTime: true,
        state: true,
        category: true,
        views: true,
        bodyField: 'body',
        blogBasePath: '/blog/',
      },
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
            { label: 'Méthode', value: 'Méthode' },
          ],
        },
        image: { type: 'image', label: "Image d'illustration (hero article)" },
        body: { type: 'richtext', label: 'Contenu (Markdown)' },
        draft: {
          type: 'boolean',
          label: 'Brouillon',
          description: "Si activé, l'article reste invisible sur le site (travail en cours).",
          defaultValue: false,
        },
        publish_at: {
          type: 'datetime',
          label: 'Programmer la publication',
          description: 'Laissez vide pour publier immédiatement, ou choisissez une date future.',
        },
      },
    },
  },
};

export default cmsConfig;
