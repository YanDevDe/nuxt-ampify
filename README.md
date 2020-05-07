# ⚡ nuxt-ampify 📱💨

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![Codecov][codecov-src]][codecov-href]
[![License][license-src]][license-href]

> AMP Module that converts Nuxt Application to AMP (Accelerated Mobile Pages) with many fancy features & optimization! 

[📖 **Release Notes**](./CHANGELOG.md)

## Table of Contents
- [Setup](#setup)
- [Description](#description)
  * [General](#general)
  * [Convertion](#convertion---html-2-amp)
- [Usage](#usage)
- [Options](#options)
  - [mode](#mode)
  - [routeAliases](#routeAliases)
  - [updateCache](#updateCache)
  - [localCache](#localCache)
  - [optimizer](#optimizer)
  - [converter](#converter)
    - [image](#image)
    - [routeClassActive](#routeClassActive)
  - [css](#css)
    - [purge](#purge)
    - [minify](#minify)
    - [shorten](#shorten)
  - [styles](#styles)
  - [events](#events)
- [Contributing](#contributing)
- [License](#license)


## Setup

1. Add `nuxt-ampify` dependency to your project

```bash
npm install nuxt-ampify # or yarn add nuxt-ampify 
```

2. Add `nuxt-ampify` to the `modules` section of `nuxt.config.js`

```js
{
  modules: [
    // Simple usage
    'nuxt-ampify',

    // With options
    ['nuxt-ampify', { /* module options */ }]
  ],
  ampify: {
    //module options
  }
}
```

## Description
nuxt-ampify is basically a fork of [@nuxtjs/amp][@nuxtjs/amp] since most of the code were forked there. Many configurations are compatible from [@nuxtjs/amp][@nuxtjs/amp] even the variable `$isAMP` is included there too.

Many examples and descriptions were more or less copied from [@nuxtjs/amp][@nuxtjs/amp].

If you have [@nuxtjs/amp][@nuxtjs/amp] and you wish to use this module, then I would suggest to remove [@nuxtjs/amp][@nuxtjs/amp] from `nuxt.config.js` to avoid any conflicts.

The goal of this module is to keep up-to-date and adding more extra features such as converting most of the HTML into AMP Mode, auto updating AMP Cache etc.

Following features of this module:

### General

- LocalCache - for faster speed 

  - Since converting HTML into AMP is being processed everytime when visitor opens the website, server's reply can delay for a while. It is still fast, but if you care about speed (for SEO, PageSpeed or just for better user experience), then I would suggest to use [localCache](#localCache) to make server's reply much faster.

- AMP Cache Updater - to make your Website up-to-date

  - This module will take care for requesting updating AMP Cache from as example from Google AMP Cache. Simply add origin and RSA private key at the options. Read more about [updateCache](#updateCache) at options.

- AMP Optimizer - to optimize Website even further

  - It also supports [AMP Optimizer][ampoptimizer] out of the box! Check out under [optimizer](#optimizer) at options.


### Convertion - NUXT 2 AMP

- Auto Image-Attribute: Adding width/height attributes automatically, depending:
    - If only width attribute is in img element, then height will be automatically added and scale down/up depending of width attribute value.
    - Sames goes to height attribute only.
    - If none of the attribute were applied to img, then width/height attribute will being added with the original size of image.

- All CSS related elements such as `<style>` and `<link>` (even external links works here, but it is not recommended) will be automatically converted into single `<style amp-custom>*</style>` element at the head.

- AMP only allows 75000 bytes on single `<style>` element. Thats why this module has many CSS optimizer features. Depending on options, CSS which are on `<style amp-custom>*</style>` sizes will be reduced dramatically. Following depencies are being used:
    * [PurgeCSS][PurgeCSS] to purge unused styles
    * [csso][csso] to minify CSS to make it even smaller
    * And custom build CSS/HTML class name shortener (As example `.className` will being converted into `.a`) - It still pretty in alpha version and can contain bugs. Any help are here welcome! More info can be found at [shorten](#shorten).

---

## Usage

This modules, like from [@nuxtjs/amp][@nuxtjs/amp], inject `$isAMP` on Vue context which can be used as example.

```html
<template>
    <div v-if="$isAMP">
        I'M ON AMP ⚡
    </div>
    <div v-else>
        I'M ON ORIGINAL MODE
    </div>
</template>

<script>
export default {
    amp: 'hybrid'
}
</script>
```

You can also use `$isAMP` inside of script

```html
<template>
    ...
</template>

<script>
export default {
    amp: 'hybrid',
    ...
    mounted() {
        // fetch list of entities on normal page
        // we use `amp-list` to fetch and show these entities
        if (!this.$isAMP) {
            this.fetchList();
        }
    },
    methods: {
        //  fetch list of entities to show
        fetchList() {
            ...
        }
    }
}
</script>
```

---

## Options

### Default Options

```js
{
  mode: 'hybrid',
  routeAliases: 'auto',
  updateCache: {
    origin: '',
    privateKey: '',
  },
  localCache: (process.env.NODE_ENV == "production"),
  optimizer: true,
  converter: {
    image: true,
    routeClassActive: ["nuxt-link-active", "is-active"]
  },
  css: {
    purge: {
      keyframes: true,
    },
    minify: true,
    shorten: true
  },
  styles: null,
  events: {
    beforeAMPify: null,
    beforeStyleToHead: null,
    afterAMPify: null
  }
}
```

### mode
You can either enable AMP-only website with `mode: "only"`, allowing to have hybrid mode, meaning one website is original and one website is in AMP mode, by `mode: "hybrid"` or disable it completly by using `mode: false`

```js
{
  // Default: "hybrid"
  mode: "only" | "hybrid" | false 
}
```

### routeAliases
Allows to limit route aliases to only AMP pages. With auto the module will create aliases for every route. If your app uses AMP only on a few routes you can provide those routes into an Array. Routes are absolute, without '/amp' prefix, eg. ['/story', '/page2']

```js
{
  // Default: "auto"
  routeAliases: "auto" | ["/story", "/page2"] 
}
```

### updateCache

Do not confuse this with localCache. AMP Cache is provided by external providers as example [Google AMP Cache](https://developers.google.com/amp/cache).

To enable AMP Cache Updater, you will need to 
    [generate RSA key](https://developers.google.com/amp/cache/update-cache#rsa-keys) if you don't have it already.

```js
  {
    updateCache: {
      origin: "example.com", // Default: null, Valid values: any root domain as string
      privateKey: "/path/to/your/rsa/private.key" // Default: null, Valid values: path to private key file.
    }
  }
```

### localCache

LocalCache can be enabled or disabled under configuration.

```js
{
  // Default: (process.env.NODE_ENV == "production")
  localCache: true | false 
}
```

### optimizer

It is suggested to enable [AMP-Optimizer][ampoptimizer] since it take cares for adding missing scripts, removing AMP boilerplate when possible etc.

```js
{
  // Default: true
  optimizer: true | false  
}
```

### converter

You can adjust the converter by using following settings:

#### image
You can disable the `<img>` to `<amp-img>` converter by setting to `false` at `converter.image` settings. 

```js
{
  converter: {
    // Default: true
    image: true | false
  }
}
```

#### routeClassActive
If you want to add class to the current active route at `<a href="{currentRoute}">`, then you can do following:

```js
{
  converter: {
    // Default: ["nuxt-link-active", "is-active"]
    routeClassActive: ["nuxt-link-active", "is-active"] | null
  }
}
```

This will make sure that the current route at `<a href="{currentRoute}">` will be set to `<a href="{currentRoute}" class="nuxt-link-active is-active">`

### css

To make sure that the styles would fit on a AMP Website, there were following features implemented:

#### purge

It purges unused class names from style. The settings can be used from the [PurgeCSS][purgecss] Configuration.
And yes, you can still use the [nuxt-purgecss][nuxt-purgecss] module. It won't affect to this module.

```js
{
  css: {
    purge: {
      // Default: true
      keyframes: true,
      // Default: undefined - This is just an example.
      whitelist: ["random", "yep", "button"]
    }
  }
}
```

#### minify

Minify the CSS from styles, to make it even smaller

```js
{
  css: {
    // Default: true
    minify: true | false
  }
}
```

#### shorten

A custom build CSS/HTML class name shortener (As example `.className` will being converted into `.a`).
It still pretty in alpha version and can contain bugs. Any helps are here welcome!

Since this is still on alpha, we'll disable this feature for a while. I'm expecting for any error/bugs with this functionality.

```js
{
  css: {
    // Default: false
    shorten: true | false
  }
}
```

### styles

Apply .css files which should be only loaded in AMP mode. It can be useful if something needs to be fixed in AMP Mode while on normal website work as it should be.

```js
{
  // Default: null
  // Valid values: string or Array of path.
  styles: "~/assets/css/amp.css" | ["~/assets/css/amp.css", "~/assets/css/menu-amp-fix.css"]
}
```

### events

Just in case if you need to manipulate the content by yourself, you can do following events:

```js
{
  events: {
    beforeAMPify: (page, options, currentRoute) => {
      // Do something here before AMPify runs.
      // You can access HTML per page.html (read and write).
      // Example:
      page.html = page.html.replace(/replace something/gi, "replace that before AMPify runs it");
    },
    beforeStyleOptimization: (page, style, options, currentRoute) => {
      // Do something here before the CSS will be unreadable due minify, shorten and removed by PurgeCSS.
      // You can access HTML per page.html and CSS per style variable (read and write)
      // Example:
      style = style.replace(/\.is-active/gi, ".is-nuxt-active");
    },
    beforeStyleToHead: (page, style, options, currentRoute) => {
      // Similar to beforeStyleOptimization - the style is already optimized and is going to be applied to <head> element at the next step.
    },
    afterAMPify: (page, options, currentRoute) => {
      // Do something here after AMPify has done their job before it is being sent to client.
    }
  }
}

```
The functions can be used for async too. 

---
## Contributing

We're using following branch:

- master is where the version is equal to the package manager (npm)
- dev is where it is in development

To contribute:

1. Clone this repository
2. Install dependencies using `npm install` or `yarn install` 
3. Install dependencies at `example` with `cd example && npm install && cd ..`
4. Ensure that you're on correct branch `git checkout dev`
4. Start development server using `npm run dev`

## License

[MIT License](./LICENSE)

Copyright (c) YanDev <account@yandev.de>

<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/nuxt-ampify/latest.svg
[npm-version-href]: https://npmjs.com/package/nuxt-ampify

[npm-downloads-src]: https://img.shields.io/npm/dt/nuxt-ampify.svg
[npm-downloads-href]: https://npmjs.com/package/nuxt-ampify

[codecov-src]: https://img.shields.io/codecov/c/github/https://github.com/YanDevDe/nuxt-ampify.svg
[codecov-href]: https://codecov.io/gh/https://github.com/YanDevDe/nuxt-ampify

[license-src]: https://img.shields.io/npm/l/nuxt-ampify.svg
[license-href]: https://npmjs.com/package/nuxt-ampify

[@nuxtjs/amp]: https://github.com/nuxt-community/amp-module
[PurgeCSS]: https://github.com/FullHuman/purgecss/tree/master/packages/purgecss
[nuxt-purgecss]: https://github.com/Developmint/nuxt-purgecss
[csso]: https://github.com/css/csso
[ampoptimizer]: https://github.com/ampproject/amp-toolbox/tree/master/packages/optimizer