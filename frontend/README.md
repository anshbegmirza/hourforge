# DM Industrie App

Simple Ionic and Angular App to create 

## General Helper

You can use the make-file to find relevant jobs. Simply run `make`

## Development

**Start local dev server**

```
npm i
ionic serve
```

## Quality Assurance

Use linting and if needed SonarQube

`npm run lint`

You can use prettier for formatting

`npm run format`

## Deployment

Simple deploy as static web app via rsync

```
ionic build --prod
rsync -a www/ be-pragmatic-dmi@dmi.be-pragmatic.com:htdocs/dmi.be-pragmatic.com
```