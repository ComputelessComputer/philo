import { defineCollection, z, } from "astro:content";

const blog = defineCollection({
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    publishedAt: z.coerce.date(),
  },),
},);

export const collections = {
  blog,
};
