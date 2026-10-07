// Used only by `npm start` (the development server); production builds ignore this file.
// Forwards API and file requests to the backend running in Docker behind nginx, so the dev server
// can be run with REACT_APP_API_URL=/api/ and live-reload frontend changes against real data.
const { createProxyMiddleware } = require('http-proxy-middleware');

const target = process.env.DEV_PROXY_TARGET || 'http://localhost:3000';

module.exports = function (app) {
  app.use(
    '/api',
    createProxyMiddleware({ target, changeOrigin: true, ws: true })
  );
  app.use('/storage', createProxyMiddleware({ target, changeOrigin: true }));
};
