/**
 * Schema.org helpers — doctrine C1 wf-00-cms §7 + schemas centralises.
 *
 * Specifique jd-zootherapeute : Jennifer De Groeve, zootherapeute
 * certifiee en Moselle. ProfessionalService riche avec founder Person
 * (jobTitle + description + knowsAbout), memberOf Organization,
 * areaServed GeoCircle 15km.
 *
 * Pattern multi-pages : schemas distribues sur 10 pages.
 *  - pages/index.astro : ProfessionalService + WebSite
 *  - pages/faq.astro : BreadcrumbList + FAQPage
 *  - pages/{a-propos, zootherapie, tarifs, contact, temoignages, ateliers}.astro :
 *    BreadcrumbList
 *  - pages/blog/*.astro : Blog/BlogPosting (HORS scope C1 minimal)
 *
 * aggregateRating 5.0/9 PRESERVE via business.rating.platform="Google"
 * (source verifiable — sameAs inclut Google Maps link).
 */

import { getCollection } from 'astro:content';
import { business, geo, siteUrl, schemaData } from '@data/business';

export interface Breadcrumb {
  name: string;
  url: string;
}

// ============================================================
// getProfessionalServiceSchema — Zootherapie riche
// ============================================================

export function getProfessionalServiceSchema(): object {
  const schema: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': business.schemaType,
    name: 'JD Zoothérapie',
    alternateName: business.alternateName,
    description: schemaData.description,
    url: siteUrl,
    telephone: schemaData.telephone,
    email: schemaData.email,
    image: schemaData.image,
    address: {
      '@type': 'PostalAddress',
      streetAddress: schemaData.address.streetAddress,
      addressLocality: schemaData.address.addressLocality,
      postalCode: schemaData.address.postalCode,
      addressRegion: schemaData.address.addressRegion,
      addressCountry: schemaData.address.addressCountry,
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: geo.latitude,
      longitude: geo.longitude,
    },
    areaServed: schemaData.areaServed,
    founder: {
      '@type': 'Person',
      name: business.owner,
      jobTitle: schemaData.founderJobTitle,
      description: schemaData.founderDescription,
      knowsAbout: schemaData.founderKnowsAbout,
    },
    priceRange: schemaData.priceRange,
    currenciesAccepted: schemaData.currenciesAccepted,
    logo: schemaData.logo,
    memberOf: { '@type': 'Organization', name: schemaData.memberOfName },
    sameAs: schemaData.sameAs,
  };

  // aggregateRating depuis business.rating (source documentee via platform)
  if (business.rating && business.rating.platform) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: business.rating.value,
      bestRating: '5',
      worstRating: '1',
      reviewCount: String(business.rating.count),
    };
  }

  return schema;
}

// ============================================================
// getWebsiteSchema — WebSite
// ============================================================

export function getWebsiteSchema(): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'JD Zoothérapie',
    url: siteUrl,
    description: schemaData.websiteDescription,
    inLanguage: 'fr',
  };
}

// ============================================================
// getFAQPageSchema — FAQPage (async, via getCollection)
// ============================================================

export async function getFAQPageSchema(): Promise<object | null> {
  try {
    const faqs = await getCollection('faq');
    if (faqs.length === 0) return null;
    const sorted = [...faqs].sort(
      (a: any, b: any) => (a.data.order ?? 0) - (b.data.order ?? 0)
    );
    return {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: sorted.map((faq: any) => ({
        '@type': 'Question',
        name: faq.data.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.data.answer,
        },
      })),
    };
  } catch {
    return null;
  }
}

// ============================================================
// getBreadcrumbSchema — BreadcrumbList (pur)
// Utilise par les 8 pages internes.
// ============================================================

export function getBreadcrumbSchema(items: Breadcrumb[]): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${siteUrl}${item.url}`,
    })),
  };
}

// ============================================================
// getSpeakableSchema — Speakable WebPage (pur)
// ============================================================

export function getSpeakableSchema(
  title: string,
  description: string,
  url: string
): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    description: description,
    url: url,
    inLanguage: 'fr',
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['h1', '.intro-text', '.faq-answer'],
    },
  };
}
