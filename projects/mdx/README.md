# @pinyinly/mdx

Metro transformer for MDX files in Expo projects.

## Usage

Add to your `metro.config.js`:

```javascript
const { withMdx } = require("@pinyinly/mdx/metro");

let config = getDefaultConfig(__dirname);
config = withMdx(config);
module.exports = config;
```

## Features

- Transform MDX files to React components
- Support for local asset imports (images, etc.)
- Custom MDX component provider support
- Remark plugin support
