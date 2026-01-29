# Heimdall Documentation

This directory contains the documentation for Heimdall, built with [Mintlify](https://mintlify.com/).

## Documentation Site

Visit the live documentation at [docs.tryheimdall.com](https://docs.tryheimdall.com).

## Local Development

### Prerequisites

- Node.js 18+

### Running Locally

1. Install the Mintlify CLI:

```bash
npm i -g mintlify
```

2. Run the development server:

```bash
cd docs
mintlify dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Documentation Structure

```
docs/
├── docs.json                 # Mintlify configuration
├── quickstart.mdx            # Quick start guide
├── guides/
│   ├── introduction.mdx      # Introduction to Heimdall
│   ├── tracing/
│   │   ├── overview.mdx      # Tracing concepts
│   │   ├── python-sdk.mdx    # Python SDK guide
│   │   └── javascript-sdk.mdx # JavaScript SDK guide
│   └── configuration/
│       ├── environment-variables.mdx
│       └── sdk-options.mdx
├── api-reference/
│   └── introduction.mdx      # API documentation (Coming Soon)
├── images/                   # Documentation images
└── logo/                     # Logo assets
```

## Contributing

To contribute to the documentation:

1. Fork the repository
2. Make your changes
3. Test locally with `mintlify dev`
4. Submit a pull request

## Support

- Email: [founder@tryheimdall.com](mailto:founder@tryheimdall.com)
- GitHub Issues: [github.com/hmdl-inc/heimdall/issues](https://github.com/hmdl-inc/heimdall/issues)
