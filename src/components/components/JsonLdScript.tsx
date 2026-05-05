/**
 * JsonLdScript — Server component for injecting JSON-LD structured data
 * Used in layout.tsx and page files for SEO structured data.
 */
export function JsonLdScript({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
