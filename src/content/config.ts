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

    // ─── Casos clínicos ───
    // 'articulo' (default) para posts normales; 'caso' para casos clínicos
    // comentados con Pregunta/CasoCTA. Los casos aparecen tanto en /blog como
    // en /blog/casos.
    tipo: z.enum(['articulo', 'caso']).default('articulo'),
    // Nivel del contenido. Opcional a nivel schema pero obligatorio en casos
    // (validado en superRefine). En artículos existentes puede quedar ausente.
    nivel: z.enum(['fundamentos', 'avanzado']).optional(),
    // Número de colegiado del médico revisor. Obligatorio en casos.
    colegiado: z.string().optional(),
  }).superRefine((data, ctx) => {
    if (data.tipo === 'caso') {
      // El default de 'author' es 'Equipo médico MediQ' — un caso clínico exige
      // atribución real, no la genérica.
      if (!data.author || data.author === 'Equipo médico MediQ') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['author'],
          message: 'Los casos clínicos requieren "author" con el nombre del médico revisor (no el equipo genérico).',
        });
      }
      if (!data.colegiado) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['colegiado'],
          message: 'Los casos clínicos requieren "colegiado" con el número del médico revisor.',
        });
      }
      if (!data.nivel) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['nivel'],
          message: 'Los casos clínicos requieren "nivel" ("fundamentos" o "avanzado").',
        });
      }
    }
  }),
});

export const collections = { blog };
