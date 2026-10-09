export function normaliseEmailText(value: string) {
  return String(value || "").replace(/\\r\\n|\\n|\\r/g, "\n").replace(/\r\n?/g, "\n");
}
export function renderEmailTemplate(template: string, values: Record<string, any>) {
  return normaliseEmailText(template).replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key) => String(values[key] ?? ""));
}
export function emailTextHtml(text: string) {
  const escaped = normaliseEmailText(text).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]!));
  return `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;text-align:left">${escaped.replace(/\n/g, "<br />")}</div>`;
}
export function missingEmailValues(template: string, values: Record<string, any>) {
  return [...new Set([...template.matchAll(/{{\s*([a-zA-Z0-9_]+)\s*}}/g)].map(m => m[1]))].filter(key => !Object.prototype.hasOwnProperty.call(values, key));
}
