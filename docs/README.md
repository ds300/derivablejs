# Template project for compiling static sites with React

features:

 - live reloading dev server
 - free-style instead of SASS et al
 - browserify + babel for client-side js
 - metalsmith under the hood
 - autoprefixing css
 - minifying JS for production.
 - heroku ready

Put static view rendering code in `html/`, but don't delete `html/index.js` or `html/style.js`, which are the entry points for the rendered html and css respectively. See existing files for examples.

Put global styles in `html/style.js`, using `style.registerRule` (see [free-style](https://github.com/blakeembrey/free-style)). Local styles are intended to be in the same file as the corresponding JSX, but can be defined elsewhere and imported if preferred.

Put static html/css/js/whatevs in `/static`.

Copy `.env.tmpl` to `.env`

Put client-side JS in `javascript/`, but don't delete `javascript/index.js` which is the entry point for the browserify bundle.

build with `npm run build`.

Builds end up in `build/`.

Run local dev server (with live reloading) with `npm run dev`.

Test non-dev build sever locally with `npm start` or remotely by deploying to heroku:

    heroku create
    git push heroku master
    heroku open

Any questions ping @David on flowdock or submit an issue.
