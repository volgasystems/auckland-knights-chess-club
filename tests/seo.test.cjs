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
test('club identity schema uses visible contacts, alternate names and configured social profiles', () => {
 const identity = load('lib/clubIdentity.ts');
 const data = identity.clubStructuredData({general_email:'club@example.invalid',facebook_url:'https://www.facebook.com/profile.php?id=123',instagram_url:'https://www.instagram.com/club/',youtube_url:'javascript:alert(1)',x_url:'https://x.com/'});
 const club = data['@graph'].find(n => n['@id'].endsWith('/#club'));
 const site = data['@graph'].find(n => n['@type'] === 'WebSite');
 assert.ok(club['@type'].includes('Organization'));
 assert.equal(club.email,'club@example.invalid');
 assert.equal(club.telephone,'+64221793499');
 assert.equal(club.alternateName,'Auckland Knights');
 assert.equal(site.alternateName,'Auckland Knights');
 assert.equal(club.sameAs.length,2);
 assert.equal(site.publisher['@id'],club['@id']);
 assert.equal(identity.clubSocialLinks({facebook_url:'https://facebook.com.evil.invalid/club',instagram_url:'http://instagram.com/club'}).length,0);
});
