---
description:
  "Use when adding, updating, or moving third-party data or bundled fonts in the app. Covers
  pyly-vendor.json provenance records and validation."
applyTo: "projects/app/**/pyly-vendor.json,projects/app/test/assets/vendor.test.ts"
---

# Vendor data provenance

Add a `pyly-vendor.json` beside each vendored dataset or font package. All fields are optional; omit
fields that are unknown or have nothing to record. Any included field must be a non-empty string,
and `download` must be a URL to the specific download page or asset.

Record versions and license names as stated by the upstream project or embedded in the asset. Do not
guess missing information. Internal assets do not need a vendor record.

The app test at `projects/app/test/assets/vendor.test.ts` validates every manifest under
`projects/app/`, and requires one in each `test/vendor/` directory and each vendored font directory.
