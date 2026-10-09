const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./payment-helpers.cjs');
test('gallery groups matching event names and dates, separates repeat events, and retains legacy photos', () => {
 const {galleryAlbums,albumUrl}=load('lib/gallery.ts');
 const albums=galleryAlbums([{id:1,event_name:'Rapid Open',event_date:'2026-11-07'},{id:2,event_name:' rapid open ',event_date:'2026-11-07'},{id:3,event_name:'Rapid Open',event_date:'2025-11-07'},{id:4,event_date:'2026-09-30'},{id:5}]);
 assert.equal(albums.length,4);assert.equal(albums[0].photos.length,2);assert.equal(albums[1].name,'Club event');assert.equal(albums[3].name,'Club photos');assert.equal(new URL('https://example.com'+albumUrl(albums[0].key)).searchParams.get('album'),albums[0].key);
});
