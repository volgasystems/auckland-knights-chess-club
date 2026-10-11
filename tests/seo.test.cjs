const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./payment-helpers.cjs');
test('canonical metadata uses production www and page-specific URLs', () => {
 const seo = load('lib/seo.ts');
 const m = seo.pageMetadata('News', 'Club news', '/news');
 assert.equal(m.alternates.canonical, 'https://www.aucklandknights.co.nz/news');
 assert.equal(m.openGraph.url, m.alternates.canonical);
 assert.equal(m.openGraph.locale, 'en_NZ');
});
test('JSON-LD cannot terminate its script element with stored content', () => {
 const seo = load('lib/seo.ts');
 const value = { title: '</script><script>alert(1)</script>' };
 const result = seo.jsonLd(value);
 assert.equal(result.includes('<'), false);
 assert.deepEqual(JSON.parse(result), value);
});
