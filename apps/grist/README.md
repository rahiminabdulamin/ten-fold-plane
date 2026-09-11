# Ten-Fold spreadsheet runtime

This service runs an unmodified, pinned Grist Community image. Ten-Fold owns
navigation, authentication, project permissions, lifecycle, forms policy, and
AI tools; Grist owns document data, formulas, and collaboration.

Do not expose port 8484 publicly. Formula execution must use gVisor in
production. Update the pinned digest only after the spreadsheet compatibility
suite passes.
