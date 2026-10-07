const fs = require('fs');
const root = '/usr/share/nginx/html';
const file = `${root}/index.html`;
const html = fs.readFileSync(file, 'utf8');
fs.writeFileSync(file, html.replace(
  /(src=")(\/runtime-env\.js|\/static\/js\/main\.[^"?]+\.js)(?:\?[^" ]*)?"/g,
  '$1$2?brand=equinox-v2"'
));
console.log('Updated branding script URLs to bypass old browser cache.');
