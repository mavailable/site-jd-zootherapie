// AUTO-GENERATED par @marc/cms-engine — ne pas editer. Regenerer : npx cms-engine-scaffold
import { CmsApp } from '@marc/cms-engine';
import type { CmsConfig } from '@marc/cms-engine';
import { crmModule } from '@marc/cms-engine/modules/crm';
import { marketingModule } from '@marc/cms-engine/modules/marketing';
import { vocauxModule } from '@marc/cms-engine/modules/vocaux';
import { galleryModule } from '@marc/cms-engine/modules/gallery';
import { aiModule } from '@marc/cms-engine/modules/ai';
export default function AdminIsland({ config }: { config: CmsConfig }) {
  return <CmsApp config={config} modules={[crmModule, marketingModule, vocauxModule, galleryModule, aiModule]} />;
}
