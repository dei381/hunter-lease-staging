import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonicalUrl?: string;
  ogImage?: string;
  schema?: Record<string, any> | Record<string, any>[];
}

export const SEO: React.FC<SEOProps> = ({
  title = 'Hunter Lease | Car Leasing & Buying for Expats in USA',
  description = 'Get a car in the USA without SSN or credit history. We specialize in auto leasing and financing for immigrants, expats, and international students.',
  keywords = 'car lease no ssn, buy car without credit history usa, auto loan for immigrants, ITIN car loan, car leasing Los Angeles',
  canonicalUrl,
  ogImage = 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&q=80&w=1200',
  schema,
}) => {
  const siteUrl = window.location.origin;
  const url = canonicalUrl ? `${siteUrl}${canonicalUrl}` : siteUrl;

  // Default Organization Schema
  const defaultSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Hunter Lease',
    url: siteUrl,
    logo: `${siteUrl}/logo.png`, // Assuming a logo exists
    description: 'Specialized auto leasing and financing for immigrants and expats in the USA without SSN or credit history.',
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+1-800-555-0199', // Replace with actual
      contactType: 'customer service',
      availableLanguage: ['English', 'Russian']
    }
  };

  const schemas = schema ? (Array.isArray(schema) ? [defaultSchema, ...schema] : [defaultSchema, schema]) : [defaultSchema];

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <link rel="canonical" href={url} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={url} />
      <meta property="twitter:title" content={title} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={ogImage} />

      {/* Schema.org JSON-LD */}
      {schemas.map((s, index) => (
        <script key={index} type="application/ld+json">
          {JSON.stringify(s)}
        </script>
      ))}
    </Helmet>
  );
};
