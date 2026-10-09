const test=require('node:test');const assert=require('node:assert/strict');const {load}=require('./payment-helpers.cjs');
const {formatSelection}=load('lib/contentEditing.ts');
test('formatting preserves surrounding content and prefixes each list line',()=>{
 assert.equal(formatSelection('Before text after',7,11,'bold').value,'Before **text** after');
 assert.equal(formatSelection('First\nSecond',0,12,'number').value,'1. First\n2. Second');
 assert.equal(formatSelection('Before text after',7,11,'heading').value,'Before \n## text\n after');
});
test('formatting supplies useful text for empty selections without dropping existing text',()=>{
 assert.equal(formatSelection('Hello',5,5,'italic').value,'Hello*Text*');
 assert.equal(formatSelection('Club',0,4,'link').value,'[Club](https://)');
});
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
test('shared public preview renderer formats content and blocks unsafe HTML and links',()=>{
 const source=ts.transpileModule(fs.readFileSync('components/MeetingSummary.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 const exports={};vm.runInNewContext(source,{exports,require});
 const html=renderToStaticMarkup(React.createElement(exports.default,{text:'## Club notice\n\n**Welcome** players\n\n- First\n- Second\n\n<script>alert(1)</script>\n\n[Unsafe](javascript:alert(1))'}));
 assert.ok(html.includes('<strong>Welcome</strong>'));assert.ok(html.includes('<ul'));assert.ok(html.includes('Club notice'));
 assert.ok(!html.includes('<script>'));assert.ok(!html.includes('href="javascript:'));
});
