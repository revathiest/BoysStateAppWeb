# Deployment Guide

This project now uses static HTML files located in the `public` directory. For local development a small Node server (`src/index.js`) serves these files.

## Deploying to Netlify

1. Push the repository to GitHub.
2. In Netlify, create a new site from GitHub and select this repository.
3. Set the **publish directory** to `public`.
4. No build command is required.
5. Deploy the site.

Netlify will host the HTML pages directly from the `public` folder.
