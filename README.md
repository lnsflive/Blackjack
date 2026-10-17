# BLACK JACK

### `Black Jack Game - With working leaderboard`

Blackjack game built with Nuxt, Vue, and Vuetify.

Visit official game at: [Black Jack Game](https://jaimegonzalezjr.com/games/blackjack/).

## Built With
* Nuxt 4 and Vue 3
* Vuetify 3
* Strapi headless CMS

![Screenshot](https://github.com/lnsflive/BlackJack/blob/master/static/img/ss1.png)
![Screenshot](https://github.com/lnsflive/BlackJack/blob/master/static/img/ss2.png)
![Screenshot](https://github.com/lnsflive/BlackJack/blob/master/static/img/ss3.png)

## Build Setup

```bash
# Install dependencies
npm install

# Start the development server at localhost:3000
npm run dev

# Build and preview the production server
npm run build
npm run start

# Generate the static site
npm run generate

# Run unit and browser tests
npm run test:unit
npm run test:e2e
```

## Google account login and Web Station deployment

The browser uses native Strapi REST with a shared strapi_jwt local-storage bearer token. Google returns to this app's own `/games/blackjack/auth/google` callback. The reusable account client and form are served from `https://api.jaimegonzalezjr.com/auth/client.v1.js` and maintained in the Strapi repository. Native game collections enforce account ownership on the server. Existing anonymous names require administrator migration. API_BASE_URL defaults to https://api.jaimegonzalezjr.com.


The app uses Nuxt 4, Vue 3, Vite, and Vuetify 3 on Node 22.19 or newer. Playwright builds the production app before running its browser tests.

Account controls mount inside this app's own layout. Strapi Content Manager → OAuth Applications configures callback/return URLs, Google/password options, registration, and shared/separate sessions. Current configuration is Google with shared login. No provider secrets belong in frontend environment files.

## Local configuration and publishing

Normal builds use `/` as their base path. Set `APP_BASE_PATH` in the build environment to host under a subdirectory; unset or empty leaves the default. Set `API_BASE_URL` for the compatible shared-account backend. Environment values are embedded during the build. Private `.env` overrides are ignored by Git; only `.env.example` is tracked.

Build the application using its normal npm build/generate command, then publish the completed static output with your own hosting tools. Personal paths and settings belong in the ignored repo-local `.env`, outside version control. Configure the backend OAuth application registry with this deployment's own callback and return URLs. Browser route guards do not replace backend ownership checks.

### Output directory override

The ignored repo-local `.env` can set `BUILD_OUTPUT` to a directory. Unset or empty keeps the framework's normal output folder. The framework cleans that output during generation/build, so obsolete files do not accumulate.

A local installation can point `BUILD_OUTPUT` directly at its hosted app directory and use the normal npm build/generate command without a deployment script. A failed build can leave that directory incomplete until the next successful build. Keep persistent data outside the build output. Personal paths and environment overrides remain untracked.
