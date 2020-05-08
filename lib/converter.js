const urlPath = require('url')
const path = require('path')

const sizeOfImage = require('image-size')
const axios = require('axios')
const jsdom = require('jsdom')
const { JSDOM } = jsdom

const fs = require('fs-extra')
const { PurgeCSS } = require('purgecss')
const csso = require('csso')
const extractCSS = require('string-extract-class-names')
const incstr = require('incstr')

const AmpOptimizer = require('@ampproject/toolbox-optimizer')
const ampOptimizer = AmpOptimizer.create()

const { v4: uuidv4 } = require('uuid')

const cache = {}

const consola = require('consola').withScope('nuxt-ampify')
const chalk = require('chalk')

const variables = require('./variables')
const utils = require('./utils.js')

const AMPTAG = chalk.white.bgBlue.bold(' AMPify ') + ' '

module.exports = async function (options, page, pageConfig, currentRoute) {
  // If localCache is activated and if we have cache, use this instead converting it again - for faster performance.
  if (options.localCache && cache[currentRoute]) {
    if (process.env.NODE_ENV) {
      consola.info(AMPTAG + 'LOCAL CACHE MODE ACTIVATED FOR ' + currentRoute)
    }
    page.html = cache[currentRoute].html
  } else {
    // This is only for SSR, so we can always use localhost, even in production.
    const localhostURL = pageConfig.protocol + '://' + pageConfig.host + ':' + pageConfig.port

    if (options.events.beforeAMPify) {
      await options.events.beforeAMPify.call(this, page, options, currentRoute)
    }

    const dom = new JSDOM(page.html)
    const { window } = dom
    const { document } = window

    // Remove unnecessary common attribute at HTML
    document.documentElement.removeAttribute('xml:lang')

    let styleSingle = ''

    // Fetch all elements and put it into array
    const links = document.getElementsByTagName('link')
    const styles = document.getElementsByTagName('style')
    const scripts = document.getElementsByTagName('script')
    const as = document.getElementsByTagName('a')

    // <link> Manipulation
    const warnExternalLinks = []
    const urls = []
    for (let i = links.length - 1; i >= 0; i--) {
      const link = links[i]
      if (link.rel === 'preload' || link.rel === 'prefetch' || link.color) {
        // Remove all links which contains "preload", "prefetch" or color attribute.
        link.remove()
      } else if (link.rel === 'stylesheet' && link.href != null) {
        // Put all external links into array of non-yet-running async http get
        if (link.href.indexOf('//') === 0) {
          link.href = pageConfig.protocol + ':' + link.href

          if (process.env.NODE_ENV === 'development') {
            warnExternalLinks.push('- ' + link.href)
          }
        }
        if (link.href[0] === '/' && link.href[1] !== '/') {
          link.href = localhostURL + link.href
        }
        urls.push(axios.get(link.href))
        link.remove()
      }
    }

    if (warnExternalLinks.length > 0) {
      consola.warn(AMPTAG + 'Avoid using external stylesheet in AMP:\n' + warnExternalLinks.join('\n'))
    }

    // Download all external styles and put it into <style></style>
    const stylesheets = await Promise.all(urls)

    for (let i = 0; i < stylesheets.length; i++) {
      const stylesheet = stylesheets[i]

      // Replace all relative url into absolute url
      stylesheet.data = stylesheet.data.replace(/url(?:\('|\("|\()(.*?)(?:'\)|"\)|\))/gi, (match, sub) => {
        // Check if the URL is absolute. If its already absolute, ignore it.
        if (!/(?:http|ftp)s?:\/\//gi.test(match)) {
          // eslint-disable-next-line node/no-deprecated-api
          return 'url("' + urlPath.resolve(stylesheet.config.url, sub) + '")'
        }
      })
      styleSingle += stylesheet.data
    }

    // <script> Manipulation
    // Remove all scripts expect for application/ld+json
    for (let i = scripts.length - 1; i >= 0; i--) {
      const script = scripts[i]
      if (script.type !== 'application/ld+json') {
        script.remove()
      }
    }

    // <style> Manipulation + Style Block

    // Fetch all styles, put it to styleSingle and remove the style element.
    for (let i = styles.length - 1; i >= 0; i--) {
      const style = styles[i]
      styleSingle += style.innerHTML
      style.remove()
    }

    // Add styles specialized for only AMP to styleSingle
    if (options.styles) {
      let styles = []
      if (Array.isArray(options.styles)) {
        styles = options.styles
      } else {
        styles.push(options.styles)
      }

      for (let i = 0; i < styles.length; i++) {
        const style = styles[i]

        let ampStylePath = ''
        // Convert alias @ or ~ to absolute path
        if (this.nuxt.options.alias[style[0]]) {
          ampStylePath = style.replace(style[0], this.nuxt.options.alias[style[0]])
        } else {
          ampStylePath = style
        }

        if (await fs.exists(ampStylePath)) {
          styleSingle += await fs.readFile(ampStylePath, 'utf8')
        } else {
          consola.warn(AMPTAG + 'Style not found: ' + ampStylePath)
        }
      }
    }

    // <a> Manipulation
    for (let i = as.length - 1; i >= 0; i--) {
      const a = as[i]
      const hrefLink = a.href.split(/(?:#|\?)/)[0] // Remove # and ? from URL.

      if (options.mode === 'hybrid') {
        for (let j = 0; j < pageConfig.routes.length; j++) {
          const route = pageConfig.routes[j]
          if (route.path === hrefLink) {
            a.href = '/amp' + a.href
            break
          }
        }
      }

      if (options.converter && options.converter.routeClassActive) {
        if (a.href === currentRoute) {
          if (Array.isArray(options.converter.routeClassActive)) {
            options.converter.routeClassActive.forEach((className) => {
              a.classList.add(className)
            })
          } else {
            a.classList.add(options.converter.routeClassActive)
          }
        }
      }
    }

    page.html = dom.serialize()

    // We take care now for css styles in order to reduce size

    if (options.events.beforeStyleOptimization) {
      await options.events.beforeStyleOptimization.call(this, page, styleSingle, options, currentRoute)
    }

    // We remove !important because AMP doesn't allow that.
    styleSingle = styleSingle.replace(/!important/gi, '')

    const cssCharCounterOriginal = styleSingle.length

    // Purge unused CSS
    if (options.css && options.css.purge) {
      styleSingle = await purgeUnusedCSS(page.html, styleSingle, options)
    }

    // Shorten CSS/HTML class names
    if (options.css && options.css.shorten) {
      const { html, style } = classNameShortener(page.html, styleSingle)
      page.html = html
      styleSingle = style
    }

    // Minify CSS
    if (options.css && options.css.minify) {
      styleSingle = csso.minify(styleSingle).css
    }

    if (process.env.NODE_ENV === 'development' &&
      options.css &&
      (
        options.css.purge ||
        options.css.shorten ||
        options.css.minify
      )
    ) {
      consola.info(AMPTAG + `Style reduced from ${cssCharCounterOriginal} to ${styleSingle.length} chars!`)
    }

    if (options.events.beforeCSStoHead) {
      await options.events.beforeStyleToHead.call(this, page, styleSingle, options, currentRoute)
    }

    // Inject all necessary informations into <head> element.
    page.html = injectNecessaryElementAtHead.call(this, page.html, {
      canonical: (options.mode === 'hybrid' ? currentRoute.replace('/amp', '') : currentRoute),
      style: styleSingle,
      boilerplate: variables(options).amp.boilerplate,
      mainScript: variables(options).amp.script.main
    })

    // Now we use regex or other solutions here which jsdom can't do
    if (options.converter && options.converter.image) {
      page.html = await processImageElement.call(this, page.html, localhostURL)
    }

    // AMP-Optimizer
    if (options.optimizer) {
      page.html = ampOptimizer.transformHtml(page.html)
    }

    // After AMPify Event
    if (options.events.afterAMPify) {
      await options.events.afterAMPify.call(this, page, options, currentRoute)
    }

    if (options.localCache) {
      await processLocalCache.call(this, page.html, currentRoute, options)
    }
  }

  return page.html
}

function processLocalCache (html, currentRoute, options) {
  if (!cache[currentRoute]) {
    cache[currentRoute] = {}
  }
  cache[currentRoute].html = html
}

async function purgeUnusedCSS (html, style, options) {
  // We use unique ID to avoid conflicts with file. I'm sure there are better solutions for that.
  const uniqueID = uuidv4()

  const tempDir = path.join(__dirname, '/temp')
  const stylePath = path.join(tempDir, `/${uniqueID}.css`)
  const htmlPath = path.join(tempDir, `/${uniqueID}.html`)

  // Save styleSingle and html as .css and .html file for PurgeCSS
  await fs.writeFile(stylePath, style)
  await fs.writeFile(htmlPath, html)

  const purgeCSSResults = await new PurgeCSS().purge({
    keyframes: true,
    ...options.css.purge,
    content: [htmlPath],
    css: [stylePath]
  })

  await fs.remove(stylePath)
  await fs.remove(htmlPath)

  return purgeCSSResults[0].css
}

function classNameShortener (html, style) {
  // Put all class names (and ids, but we ignore that) into array.
  const extractedCSSDirty = extractCSS(style)

  // Sort it by longest string
  // To avoid wrong replacement as example ".A" for ".replace" will not replaced at ".replace-that" to ".A-that" too.
  extractedCSSDirty.sort((a, b) => {
    return b.length - a.length || a.localeCompare(b)
  })

  // Remove duplicated entries (specialized for sorted array)
  const extractedCSSClass = []

  extractedCSSDirty.forEach((x) => {
    if (x[0] === '.') {
      if (extractedCSSClass.length === 0 || extractedCSSClass.slice(-1)[0] !== x) {
        extractedCSSClass.push(x)
      }
    }
  })

  // We use incstr for alphabet + number as string increment
  let istr = incstr()
  for (let i = 0; i < extractedCSSClass.length; i++) {
    const singleClass = extractedCSSClass[i]
    const singleClassDotless = singleClass.substring(1, singleClass.length)
    const shortenClass = istr

    // Detect for class name in HTML content
    const classRegExpHTML = new RegExp(
      '(class="[^"]*)(' +
      singleClassDotless +
      ')([^"]*")', 'gi'
    )

    // Test if if the class name exists in HTML content
    if (classRegExpHTML.test(html)) {
      let valid = false
      html = html.replace(classRegExpHTML, (match, group1, group2, group3) => {
        const fullMatch = match
        const splitMatch = fullMatch.split(/(?:"| )/)
        for (let i = 0; i < splitMatch.length; i++) {
          if (splitMatch[i] === singleClassDotless) {
            valid = true
            break
          }
        }
        if (valid) {
          return `${group1}${shortenClass}${group3}`
        } else {
          return match
        }
      })

      if (valid) {
        const classRegExpStyle = new RegExp('\\.' + singleClassDotless, 'gi')
        style = style.replace(classRegExpStyle, `.${shortenClass}`)
        istr = incstr(istr)
      }
    }
  }

  return { html, style }
}

function injectNecessaryElementAtHead (html, data) {
  const styleElement = '<style amp-custom>' + data.style + '</style>'
  const canonicalLinkElement = '<link rel="canonical" href="' + data.canonical + '">'

  return html.replace('</head>',
    canonicalLinkElement +
    styleElement +
    data.boilerplate +
    data.mainScript +
    '</head>'
  )
}

async function processImageElement (html, localhostURL) {
  const warnAttributeMissingImages = []

  // Replace img tags with amp-img
  const result = await utils.replaceAsync(html, /<img([^>]*)>/gi, async (match, sub) => {
    sub = sub.replace('data-srcset', 'srcset')

    let src = ''
    sub.replace(/src=(?:'|")(.*?)(?:'|")/, (match, subSrc) => {
      src = subSrc
    })

    // Check if the img element has width/height attributes
    const widthAttributeExists = sub.includes('width')
    const heightAttributeExists = sub.includes('height')

    if (!widthAttributeExists || !heightAttributeExists) {
      // We fetch image size dimension information.
      let srcAbsolute = ''

      if (src.indexOf('https://') === 0 || src.indexOf('http://') === 0) {
        srcAbsolute = src
      } else {
        srcAbsolute = localhostURL + src
      }

      const response = await axios.get(srcAbsolute, {
        responseType: 'arraybuffer'
      })

      const imageSize = sizeOfImage(Buffer.from(response.data, 'binary'))

      // width exists, but height is missing
      if (widthAttributeExists && !heightAttributeExists) {
        let widthFromAttribute = 0
        sub.replace(/width(?:='|="|=)(.*?)(?:'|"| )/gi, (match, width) => {
          widthFromAttribute = Number(width)
          return match
        })

        const heightCalculated = Math.round((widthFromAttribute / imageSize.width) * imageSize.height)
        sub += ' height="' + heightCalculated + '"'

        if (process.env.NODE_ENV === 'development') {
          warnAttributeMissingImages
            .push(`- "${src}" [height] -> [height="${heightCalculated}"]`)
        }
      } else if (!widthAttributeExists && heightAttributeExists) { // height exists, but width is missing
        let heightFromAttribute = 0
        sub.replace(/height(?:='|="|=)(.*?)(?:'|"| )/gi, (match, height) => {
          heightFromAttribute = Number(height)
          return match
        })

        const widthCalculated = Math.round((heightFromAttribute / imageSize.height) * imageSize.width)
        sub += ' width="' + widthCalculated + '"'

        if (process.env.NODE_ENV === 'development') {
          warnAttributeMissingImages
            .push(`- "${src}" [width] -> [width="${widthCalculated}"]`)
        }
      } else if (!widthAttributeExists && !heightAttributeExists) { // height and width doesn't exists, so we use original size of image.
        sub += ' width="' + imageSize.width + '" height="' + imageSize.height + '"'

        if (process.env.NODE_ENV === 'development') {
          warnAttributeMissingImages
            .push(`- "${src}" [width] [height] -> [width="${imageSize.width}"] [height="${imageSize.height}"]`)
        }
      }
    }

    if (!sub.includes('layout')) {
      sub += ' layout=intrinsic'
    }

    return `<amp-img ${sub} layout=intrinsic></amp-img>`
  })

  if (warnAttributeMissingImages.length > 0) {
    consola.warn(AMPTAG + `Missing attributes "width" and/or "height" were replaced into:\n${warnAttributeMissingImages.join('\n')}`)
  }

  return result
}
