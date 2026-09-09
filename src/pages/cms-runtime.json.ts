// AUTO-GENERATED par @marc/cms-engine — ne pas editer. Regenerer : npx cms-engine-scaffold
import { buildRuntimeManifest } from '@marc/cms-engine/runtime-manifest';
import cmsConfig from '../../cms.config';

export const prerender = true;

export const GET = () =>
  new Response(JSON.stringify(buildRuntimeManifest(cmsConfig)), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
