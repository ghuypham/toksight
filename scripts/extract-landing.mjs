// Extract the HTML template from the Claude Design bundler artifact.
// The bundler embeds three <script> tags: manifest (assets), ext_resources, template (HTML).
// We only need the template to read the page structure.
import { readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

const SRC = 'release-assets/TokSight Landing.html';
const OUT = 'release-assets/TokSight-Landing-extracted.html';

const html = readFileSync(SRC, 'utf-8');

function extractScript(type) {
  const open = `<script type="${type}">`;
  const close = '</script>';
  const start = html.indexOf(open);
  if (start === -1) throw new Error(`missing ${type}`);
  const end = html.indexOf(close, start + open.length);
  return html.slice(start + open.length, end).trim();
}

const templateRaw = extractScript('__bundler/template');
const manifestRaw = extractScript('__bundler/manifest');

const template = JSON.parse(templateRaw);
const manifest = JSON.parse(manifestRaw);

console.log('Template length:', template.length);
console.log('Manifest entries:', Object.keys(manifest).length);

// Try to decompress and inline text-only assets (CSS/JS) so we can read the design.
// Skip binary assets (images, fonts) — replace UUIDs with descriptive placeholders.
let resolved = template;
for (const [uuid, entry] of Object.entries(manifest)) {
  const isText = /^(text\/|application\/(json|javascript|xml))/i.test(entry.mime);
  if (isText) {
    try {
      const bytes = Buffer.from(entry.data, 'base64');
      const decoded = entry.compressed ? gunzipSync(bytes).toString('utf-8') : bytes.toString('utf-8');
      // Inline only short ones; long JS bundles get a placeholder
      if (decoded.length < 200_000) {
        const dataUri = `data:${entry.mime};charset=utf-8,${encodeURIComponent(decoded)}`;
        resolved = resolved.split(uuid).join(dataUri);
      } else {
        resolved = resolved.split(uuid).join(`__ASSET_${uuid.slice(0, 8)}_${entry.mime}_${decoded.length}b__`);
      }
    } catch (e) {
      resolved = resolved.split(uuid).join(`__ASSET_${uuid.slice(0, 8)}_${entry.mime}__`);
    }
  } else {
    resolved = resolved.split(uuid).join(`__ASSET_${uuid.slice(0, 8)}_${entry.mime}__`);
  }
}

writeFileSync(OUT, resolved);
console.log('Wrote', OUT, '-', resolved.length, 'chars');
