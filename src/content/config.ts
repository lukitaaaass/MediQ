import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    // Autoría por defecto es "Equipo médico MediQ" — cuando entren especialistas
    // revisores, se pone su nombre + especialidad.
    author: z.string().default('Equipo médico MediQ'),
    // Especialidad médica del artículo, para filtrado futuro y schema.org
    specialty: z.enum([
      'urgencias',
      'medicina-interna',
      'cardiología',
      'geriatría',
      'farmacología',
      'legal-y-privacidad',
      'general',
    ]),
    tags: z.array(z.string()).default([]),
    publishDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    // Minutos estimados de lectura. Si no se pone, se puede calcular en el layout.
    readingMinutes: z.number().int().positive().optional(),
    // Si true, el artículo no aparece en índices ni sitemap (drafts).
    draft: z.boolean().default(false),
    // URL de la imagen social preview específica (opcional; si no, se usa la global).
    ogImage: z.string().optional(),
  }),
});

export const collections = { blog };
