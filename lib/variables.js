module.exports = (options = null) => {
  return {
    amp: {
      cdnBase: `https://cdn.ampproject.org/${options.version}/`,
      script: {
        main: `<script async src="https://cdn.ampproject.org/${options.version}.js"></script>`,
        extension: (element, elementVersion) =>
          `<script async custom-element="${element}" src="https://cdn.ampproject.org/${options.version}/${element}-${elementVersion}.js"></script>`
      },
      boilerplate: '<style amp-boilerplate>body{-webkit-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-moz-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-ms-animation:-amp-start 8s steps(1,end) 0s 1 normal both;animation:-amp-start 8s steps(1,end) 0s 1 normal both}@-webkit-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-moz-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-ms-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-o-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}</style><noscript><style amp-boilerplate>body{-webkit-animation:none;-moz-animation:none;-ms-animation:none;animation:none}</style></noscript>'
    }
  }
}
