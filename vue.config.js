module.exports = {
  configureWebpack: {
    mode: process.env.NODE_ENV === 'development' ? 'development' : 'production'
  }
}
