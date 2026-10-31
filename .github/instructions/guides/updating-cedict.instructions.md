---
description: "Use when refreshing the CC-CEDICT test dictionary snapshot."
applyTo: "projects/app/test/vendor/cedict/**"
---

# Updating CC-CEDICT test data

1. Download the ZIP archive from the
   [CC-CEDICT download page](https://cc-cedict.org/editor/editor.php?handler=Download) using its
   [direct download link](https://cc-cedict.org/editor/editor_export_cedict.php?c=zip&v=2).
1. Extract the ZIP archive.
1. Copy the extracted `cedict_ts.u8` file to `projects/app/test/vendor/cedict/cedict_ts-2.u8`,
   replacing the existing file.
1. Update `projects/app/test/vendor/cedict/pyly-vendor.json` with any known version and download
   details. Omit unknown fields rather than leaving them empty.
