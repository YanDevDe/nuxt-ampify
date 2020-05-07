const consola = require('consola').withScope('nuxt-ampify');
const chalk = require("chalk");

const amp_html_validator = require("amphtml-validator");
const UpdateCacheUrlProvider = require('amp-toolbox-update-cache');


const path = require("path")
const fs = require("fs-extra");
const converter = require("./converter.js");

const AMPTAG = chalk.white.bgBlue.bold(" AMPify ") + " ";

module.exports = async function (moduleOptions) {
  let cache = {};

  const defaults = {
    mode: 'hybrid',
    routeAliases: "auto",
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
      shorten: false,
    },
    styles: null,
    version: "v0",
    events: {
      beforeAMPify: null,
      beforeStyleOptimization: null,
      beforeStyleToHead: null,
      afterAMPify: null
    }
  }

  const options = Object.assign({}, defaults, this.options.ampify, moduleOptions);

  if (!options.hybrid) {
    registerPlugin.call(this, options);
    copyAMP.call(this, options);
    registerRendererHook.call(this, options);
    processRoutes.call(this, options);

    if (process.env.NODE_ENV === "production") {
      updateAMPCache.call(this, options);
    }
  }
}

function registerPlugin(options) {
  this.addPlugin({
    src: path.resolve(__dirname, 'amp', 'plugin.js'),
    fileName: path.join('amp', 'plugin.js'),
    options
  })
}

async function registerValidator(url, html, req, validator) {

  const isAMP = req.isAMP;

  if (isAMP) {
    const result = validator.validateString(html);
    const isValid = result.status === 'PASS';

    consola.log({
      type: result.status,
      message: (isValid ? chalk.green(result.status) : chalk.red(result.status)) + ' ' + url,
      icon: isValid ? chalk.green('✓') : chalk.red('✕')
    })

    for (const error of result.errors) {
      let msg = 'line ' + error.line + ', col ' + error.col + ': ' + error.message
      if (error.specUrl !== null) {
        msg += ' (see ' + error.specUrl + ')'
      }
      consola.log({
        type: error.severity,
        message: msg,
        icon: (error.severity === 'ERROR') ? chalk.bgRed.black(error.severity) : chalk.bgYellow.black(error.severity)
      })
    }
  }

}

function registerRendererHook(options) {
  this.extendRoutes((routes) => {
    const pageConfig = {
      routes,
      protocol: (this.nuxt.options.server.https ? "https" : "http"),
      host: this.nuxt.options.server.host,
      port: this.nuxt.options.server.port
    }
    this.nuxt.hook("vue-renderer:spa:templateParams", (params) => {
      params.isAMP = params.HTML_ATTRS.includes('⚡')
    })

    this.nuxt.hook("vue-renderer:ssr:templateParams", (params) => {
      params.isAMP = params.HTML_ATTRS.includes('⚡')
    })

    this.nuxt.hook("render:route", async (url, page, { req, res }) => {
      if (!req.isAMP) {
        return;
      }
      page.html = await converter.call(this, options, page, pageConfig, url);

      if (process.env.NODE_ENV == "development") {
        const validator = await amp_html_validator.getInstance();
        await registerValidator.call(this, url, page.html, req, validator)
      }
    })
  });
}

function copyAMP(options) {
  const coreRoot = path.resolve(__dirname, 'amp')

  for (const file of fs.readdirSync(coreRoot)) {
    if (file === 'plugin.js') {
      continue
    }
    this.addTemplate({
      src: path.resolve(coreRoot, file),
      fileName: path.join('amp', file),
      options
    })
  }
}

function processRoutes(options) {
  this.extendRoutes((routes) => {
    for (const route of routes) {
      route.meta = route.meta || {}
      route.alias = route.alias || []
      if (typeof route.alias === 'string') {
        route.alias = [route.alias]
      }

      if (route.path === '/amp' || route.path.indexOf('/amp/') === 0) {
        route.meta.amp = true
      } else if (!Array.isArray(options.routeAliases) || options.routeAliases.includes(route.path)) {
        route.alias.push('/amp' + route.path)
      }
    }
  })
}

function updateAMPCache(options) {
  this.nuxt.hook("listen", async (server, {host, port}) => {
    const url = options.updateCache.origin;
    const privateKey = await fs.readFile(path.resolve(options.updateCache.privateKey), "utf8");

    const updateCacheUrlProvider = UpdateCacheUrlProvider.create(privateKey);
    const timestamp = Math.round((new Date()).getTime() / 1000) + 60;

    const cacheUpdateUrls = await updateCacheUrlProvider.calculateFromOriginUrl(url, timestamp);

    for (let i = 0; i < cacheUpdateUrls.length; i++) {
      const cacheUpdateUrlInfo = cacheUpdateUrls[i];
      try {
        const response = await axios.get(cacheUpdateUrlInfo.updateCacheUrl);
        consola.success(AMPTAG + cacheUpdateUrlInfo.cacheName + " for " + url + " UPDATED!");
      } catch (e) {
        consola.error(AMPTAG + cacheUpdateUrlInfo.cacheName + " for " + url + " FAILED!");
      }
    }
  })
}



module.exports.meta = require('../package.json')
