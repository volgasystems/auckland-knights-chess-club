const test = require('node:test');
const assert = require('node:assert/strict');
const {load} = require('./payment-helpers.cjs');
const {normaliseEmailText,renderEmailTemplate,emailTextHtml,missingEmailValues} = load('lib/emailTemplate.ts');
test('legacy escaped newlines become real line breaks and placeholders retain event names', () => {
  const text = renderEmailTemplate('Hi {{first_name}},\\n\\nEntry for {{tournament_name}}.\\r\\nRegards', {first_name:'Sahithi',tournament_name:'Rapid Open'});
  assert.equal(text, 'Hi Sahithi,\n\nEntry for Rapid Open.\nRegards');
  assert.equal(normaliseEmailText('One\r\nTwo'), 'One\nTwo');
});
test('email HTML uses explicit breaks and escapes recipient data', () => {
  const html = emailTextHtml('Hi <script>\n\nA & B');
  assert.ok(html.includes('&lt;script&gt;<br /><br />A &amp; B'));
  assert.ok(!html.includes('<script>'));
});
test('missing tournament context is detected before bulk delivery', () => {
  assert.deepEqual(Array.from(missingEmailValues('{{first_name}} {{tournament_name}} {{tournament_name}}', {first_name:'Sahithi'})), ['tournament_name']);
});
