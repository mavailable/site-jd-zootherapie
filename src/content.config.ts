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
  }),
});

const contact = defineCollection({
  type: 'data',
  schema: z.object({
    title: z.string(),
    subtitle: z.string(),
    buttonText: z.string(),
    rgpdText: z.string(),
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
    body: z.string(),
  }),
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
};
