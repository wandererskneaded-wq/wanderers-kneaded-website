# Wanderers Kneaded CMS Setup

The website content now lives in `content/site.json`.

Decap CMS is available at `/admin/` and edits that JSON file through GitHub.

## GitHub OAuth

Create a GitHub OAuth App:

- Homepage URL: `https://www.wandererskneaded.co.uk`
- Authorization callback URL: `https://www.wandererskneaded.co.uk/api/auth/callback`

Then add these Cloudflare Pages environment variables:

- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`

Both should be set for production. The secret must stay in Cloudflare, not in the repo.

## Editing Flow

1. Go to `/admin/`.
2. Login with GitHub.
3. Edit website content.
4. Click publish.
5. Decap commits to GitHub.
6. Cloudflare redeploys the site.
