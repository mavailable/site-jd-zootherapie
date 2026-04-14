import { defineCollection, z } from 'astro:content';

const siteInfo = defineCollection({
  type: 'data',
  schema: z.object({
    name: z.string(),
    alternateName: z.string(),
    tagline: z.string(),
    phone: z.string(),
    phoneDisplay: z.string(),
    email: z.string(),
    address: z.object({
      street: z.string(),
      city: z.string(),
      postalCode: z.string(),
      region: z.string(),
      country: z.string(),
    }),
    areaServed: z.string(),
    lang: z.string(),
    social: z.object({
      instagram: z.string(),
      facebook: z.string(),
      googleBusiness: z.string(),
    }),
    affiliations: z.array(z.string()),
    seo: z.object({
      defaultTitle: z.string(),
      defaultDescription: z.string(),
      ogImage: z.string(),
    }),
  }),
});

const hero = defineCollection({
  type: 'data',
  schema: z.object({
    h1: z.string(),
    subtitle: z.string(),
    ctaPrimaryText: z.string(),
    ctaPrimaryHref: z.string(),
    ctaSecondaryText: z.string(),
    ctaSecondaryHref: z.string(),
    reassurance: z.string(),
  }),
});

const about = defineCollection({
  type: 'data',
  schema: z.object({
    founderName: z.string(),
    founderTitle: z.string(),
    paragraphs: z.array(z.string()),
    animals: z.array(z.object({
      name: z.string(),
      breed: z.string(),
      role: z.string(),
    })),
    badges: z.array(z.object({
      icon: z.string(),
      label: z.string(),
    })).optional(),
  }),
});

const contact = defineCollection({
  type: 'data',
  schema: z.object({
    title: z.string(),
    subtitle: z.string(),
    buttonText: z.string(),
    rgpdText: z.string(),
    bookingLabel: z.string().optional(),
    phoneLabel: z.string().optional(),
    emailLabel: z.string().optional(),
  }),
});

const services = defineCollection({
  type: 'data',
  schema: z.object({
    slug: z.string(),
    title: z.string(),
    audience: z.string(),
    description: z.string(),
    price: z.string().nullable().optional(),
    order: z.number(),
  }),
});

const testimonials = defineCollection({
  type: 'data',
  schema: z.object({
    slug: z.string(),
    author: z.string(),
    context: z.string(),
    quote: z.string(),
    order: z.number(),
  }),
});

const faq = defineCollection({
  type: 'data',
  schema: z.object({
    slug: z.string(),
    question: z.string(),
    answer: z.string(),
    order: z.number(),
  }),
});

const blog = defineCollection({
  type: 'data',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.string(),
    category: z.string(),
    image: z.string().optional(),
    body: z.string(),
  }),
});

const socialProof = defineCollection({
  type: 'data',
  schema: z.object({
    sectionTitle: z.string(),
    sectionSubtitle: z.string(),
    googleBadge: z.string(),
    stats: z.array(z.object({
      value: z.string(),
      label: z.string(),
    })),
  }),
});

const pageZootherapie = defineCollection({
  type: 'data',
  schema: z.object({}).passthrough(),
});

const pageAteliers = defineCollection({
  type: 'data',
  schema: z.object({}).passthrough(),
});

const pageTarifs = defineCollection({
  type: 'data',
  schema: z.object({}).passthrough(),
});

const pageTemoignages = defineCollection({
  type: 'data',
  schema: z.object({}).passthrough(),
});

const pageAPropos = defineCollection({
  type: 'data',
  schema: z.object({}).passthrough(),
});

const gallery = defineCollection({
  type: 'data',
  schema: z.object({}).passthrough(),
});

export const collections = {
  'site-info': siteInfo,
  hero,
  about,
  contact,
  services,
  testimonials,
  faq,
  blog,
  'social-proof': socialProof,
  'page-zootherapie': pageZootherapie,
  'page-ateliers': pageAteliers,
  'page-tarifs': pageTarifs,
  'page-temoignages': pageTemoignages,
  'page-a-propos': pageAPropos,
  gallery,
};
