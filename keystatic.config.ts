import { config, fields, singleton, collection } from '@keystatic/core';

export default config({
  storage: { kind: 'cloud' },
  cloud: { project: 'jd-zootherapeute/site-jd-zootherapie' },

  singletons: {
    'site-info': singleton({
      label: 'Informations générales',
      path: 'src/content/site-info/index',
      format: { data: 'json' },
      schema: {
        name: fields.text({ label: 'Nom commercial' }),
        alternateName: fields.text({ label: 'Nom alternatif' }),
        tagline: fields.text({ label: 'Tagline' }),
        phone: fields.text({ label: 'Téléphone (format +33...)' }),
        phoneDisplay: fields.text({ label: 'Téléphone (affichage)' }),
        email: fields.text({ label: 'Email' }),
        address: fields.object({
          label: 'Adresse',
          fields: {
            street: fields.text({ label: 'Rue' }),
            city: fields.text({ label: 'Ville' }),
            postalCode: fields.text({ label: 'Code postal' }),
            region: fields.text({ label: 'Région' }),
            country: fields.text({ label: 'Pays (code ISO)' }),
          },
        }),
        areaServed: fields.text({ label: 'Zone d\'intervention' }),
        lang: fields.text({ label: 'Code langue (ex: fr, en)', defaultValue: 'fr' }),
        social: fields.object({
          label: 'Réseaux sociaux',
          fields: {
            instagram: fields.text({ label: 'Instagram URL' }),
            facebook: fields.text({ label: 'Facebook URL' }),
            googleBusiness: fields.text({ label: 'Google Business URL' }),
          },
        }),
        affiliations: fields.array(fields.text({ label: 'Affiliation' }), {
          label: 'Affiliations professionnelles',
          itemLabel: (props) => props.fields.value.value || 'Affiliation',
        }),
        seo: fields.object({
          label: 'SEO par défaut',
          fields: {
            defaultTitle: fields.text({ label: 'Title par défaut' }),
            defaultDescription: fields.text({ label: 'Description par défaut', multiline: true }),
            ogImage: fields.text({ label: 'Image OG (chemin)' }),
          },
        }),
      },
    }),

    hero: singleton({
      label: 'Section Hero (Accueil)',
      path: 'src/content/hero/index',
      format: { data: 'json' },
      schema: {
        h1: fields.text({ label: 'Titre principal (H1)' }),
        subtitle: fields.text({ label: 'Sous-titre', multiline: true }),
        ctaPrimaryText: fields.text({ label: 'Bouton principal — texte' }),
        ctaPrimaryHref: fields.text({ label: 'Bouton principal — lien' }),
        ctaSecondaryText: fields.text({ label: 'Bouton secondaire — texte' }),
        ctaSecondaryHref: fields.text({ label: 'Bouton secondaire — lien' }),
        reassurance: fields.text({ label: 'Texte de réassurance sous les boutons' }),
      },
    }),

    about: singleton({
      label: 'Section À Propos',
      path: 'src/content/about/index',
      format: { data: 'json' },
      schema: {
        founderName: fields.text({ label: 'Nom du fondateur' }),
        founderTitle: fields.text({ label: 'Titre / fonction' }),
        paragraphs: fields.array(fields.text({ label: 'Paragraphe', multiline: true }), {
          label: 'Paragraphes de présentation',
          itemLabel: (props) => props.fields.value.value?.substring(0, 50) + '...' || 'Paragraphe',
        }),
        animals: fields.array(
          fields.object({
            label: 'Animal',
            fields: {
              name: fields.text({ label: 'Nom' }),
              breed: fields.text({ label: 'Race' }),
              role: fields.text({ label: 'Rôle en séance', multiline: true }),
            },
          }),
          { label: 'Animaux médiateurs', itemLabel: (props) => props.fields.name.value || 'Animal' }
        ),
      },
    }),

    contact: singleton({
      label: 'Section Contact',
      path: 'src/content/contact/index',
      format: { data: 'json' },
      schema: {
        title: fields.text({ label: 'Titre de la section' }),
        subtitle: fields.text({ label: 'Sous-titre', multiline: true }),
        buttonText: fields.text({ label: 'Texte du bouton formulaire' }),
        rgpdText: fields.text({ label: 'Mention RGPD', multiline: true }),
      },
    }),
  },

  collections: {
    services: collection({
      label: 'Services / Ateliers',
      slugField: 'slug',
      path: 'src/content/services/*',
      format: { data: 'json' },
      schema: {
        slug: fields.slug({ name: { label: 'Identifiant (slug)' } }),
        title: fields.text({ label: 'Titre du service' }),
        audience: fields.text({ label: 'Public cible' }),
        description: fields.text({ label: 'Description', multiline: true }),
        price: fields.text({ label: 'Tarif (laisser vide si "sur devis")' }),
        order: fields.integer({ label: 'Ordre d\'affichage', defaultValue: 0 }),
      },
    }),

    testimonials: collection({
      label: 'Témoignages',
      slugField: 'slug',
      path: 'src/content/testimonials/*',
      format: { data: 'json' },
      schema: {
        slug: fields.slug({ name: { label: 'Identifiant (slug)' } }),
        author: fields.text({ label: 'Prénom + initiale' }),
        context: fields.text({ label: 'Contexte (ex: Famille en EHPAD)' }),
        quote: fields.text({ label: 'Citation', multiline: true }),
        order: fields.integer({ label: 'Ordre d\'affichage', defaultValue: 0 }),
      },
    }),

    faq: collection({
      label: 'FAQ',
      slugField: 'slug',
      path: 'src/content/faq/*',
      format: { data: 'json' },
      schema: {
        slug: fields.slug({ name: { label: 'Identifiant (slug)' } }),
        question: fields.text({ label: 'Question' }),
        answer: fields.text({ label: 'Réponse', multiline: true }),
        order: fields.integer({ label: 'Ordre d\'affichage', defaultValue: 0 }),
      },
    }),

    blog: collection({
      label: 'Articles de blog',
      slugField: 'title',
      path: 'src/content/blog/*',
      format: { data: 'json' },
      schema: {
        title: fields.slug({ name: { label: 'Titre de l\'article' } }),
        description: fields.text({ label: 'Description (extrait)', multiline: true }),
        date: fields.date({ label: 'Date de publication' }),
        category: fields.select({
          label: 'Catégorie',
          options: [
            { label: 'Récits de terrain', value: 'Récits de terrain' },
            { label: 'Science & recherche', value: 'Science & recherche' },
            { label: 'Conseils pratiques', value: 'Conseils pratiques' },
            { label: 'Idées reçues', value: 'Idées reçues' },
          ],
          defaultValue: 'Récits de terrain',
        }),
        body: fields.text({ label: 'Contenu de l\'article (Markdown)', multiline: true }),
      },
    }),
  },
});
