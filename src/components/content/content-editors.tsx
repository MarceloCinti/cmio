"use client";

import { ObjectEditor } from "./object-editor";
import { BrandingContrast } from "./branding-extra";
import { ANNOUNCEMENT_FIELDS, BRANDING_FIELDS, INSTITUTION_FIELDS, LANDING_FIELDS, LEGAL_FIELDS } from "./descriptors";
import { SITE_CONTENT_SCHEMAS, type SiteContentKey } from "@/lib/site-content";

const FIELDS = {
  institution: INSTITUTION_FIELDS,
  branding: BRANDING_FIELDS,
  landing: LANDING_FIELDS,
  legal: LEGAL_FIELDS,
  announcement: ANNOUNCEMENT_FIELDS,
} as const;

export function ContentSectionEditor({ section, initial }: { section: SiteContentKey; initial: Record<string, unknown> }) {
  return (
    <ObjectEditor
      key={section}
      contentKey={section}
      initial={initial}
      fields={FIELDS[section]}
      schema={SITE_CONTENT_SCHEMAS[section]}
      extra={section === "branding" ? (v) => <BrandingContrast value={v} /> : undefined}
    />
  );
}
