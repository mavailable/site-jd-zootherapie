import { getCollection, type CollectionEntry } from 'astro:content';

export type BlogEntry = CollectionEntry<'blog'>;

export function isPublic(entry: BlogEntry, now: Date = new Date()): boolean {
  const data = entry.data as { draft?: boolean; publish_at?: string };
  if (data.draft === true) return false;
  if (data.publish_at) {
    const scheduled = new Date(data.publish_at);
    if (!Number.isNaN(scheduled.getTime()) && scheduled > now) return false;
  }
  return true;
}

export async function getPublishedBlog(now: Date = new Date()): Promise<BlogEntry[]> {
  return await getCollection('blog', (entry) => isPublic(entry as BlogEntry, now));
}
