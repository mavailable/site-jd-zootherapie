import type { APIRoute } from 'astro';
import fs from 'node:fs';
import path from 'node:path';

export const prerender = true;

export async function getStaticPaths() {
  const dir = path.join(process.cwd(), '..', 'marketing');
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter((f) => f.startsWith('plan-') && f.endsWith('.json'));
  return files.map((file) => ({
    params: { file: file.replace('.json', '') },
    props: { filename: file },
  }));
}

export const GET: APIRoute = async ({ props }) => {
  const { filename } = props as { filename: string };
  const raw = fs.readFileSync(path.join(process.cwd(), '..', 'marketing', filename), 'utf-8');
  return new Response(raw, {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
