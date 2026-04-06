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
        rgpdText: { type: 'text', label: 'Mention RGPD', multiline: true },
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
