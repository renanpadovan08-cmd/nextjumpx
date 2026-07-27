const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const repoRoot = path.join(__dirname,"..");
const zenbarberRoot = path.join(repoRoot,"zenbarber");

function read(...parts){
  return fs.readFileSync(path.join(...parts),"utf8");
}

test("mantém landing e ZenBarber em pontos de entrada separados",()=>{
  const landingHtml = read(repoRoot,"index.html");
  const zenbarberHtml = read(zenbarberRoot,"index.html");

  assert.match(landingHtml,/<title>NextJumpX<\/title>/);
  assert.match(landingHtml,/href="zenbarber\/index\.html"/);
  assert.match(landingHtml,/data-production-href="\/zenbarber\/"/);
  assert.match(landingHtml,/location\.protocol !== 'file:'/);
  assert.doesNotMatch(landingHtml,/href="https:\/\/zenbarber\.nextjumpx\.com\.br/);
  assert.match(zenbarberHtml,/<title>ZenBarber<\/title>/);
  assert.ok(!fs.existsSync(path.join(repoRoot,"js")),"os scripts do ZenBarber não devem permanecer na raiz");
});

test("todos os arquivos locais referenciados pela landing existem",()=>{
  const html = read(repoRoot,"index.html");
  const refs = [...html.matchAll(/\s(?:src|href)="([^"]+)"/g)]
    .map((match)=>match[1])
    .filter((ref)=>!ref.startsWith("http") && !ref.startsWith("#"))
    .map((ref)=>ref.split("?")[0]);

  for(const ref of refs){
    assert.ok(!ref.startsWith("/"),`a referência precisa ser relativa para funcionar via file://: ${ref}`);
    assert.ok(fs.existsSync(path.join(repoRoot,ref)),`referência ausente: ${ref}`);
  }
});

test("todos os arquivos locais referenciados pelo ZenBarber existem",()=>{
  const html = read(zenbarberRoot,"index.html");
  const refs = [...html.matchAll(/\s(?:src|href)="([^"]+)"/g)]
    .map((match)=>match[1])
    .filter((ref)=>!ref.startsWith("http") && !ref.startsWith("#"))
    .map((ref)=>ref.split("?")[0]);

  for(const ref of refs){
    assert.ok(fs.existsSync(path.join(zenbarberRoot,ref)),`referência ausente: ${ref}`);
  }
});

test("PWA usa caminhos relativos e fica isolado no diretório do ZenBarber",()=>{
  const html = read(zenbarberRoot,"index.html");
  const manifest = JSON.parse(read(zenbarberRoot,"manifest.json"));
  const serviceWorker = read(zenbarberRoot,"sw.js");

  assert.doesNotMatch(html,/<link rel="manifest"/);
  assert.match(html,/const webProtocol = location\.protocol === "http:" \|\| location\.protocol === "https:"/);
  assert.match(html,/if \(webProtocol\) \{/);
  assert.match(html,/serviceWorker\.register\("sw\.js"\)/);
  assert.match(html,/if \(webProtocol && "serviceWorker" in navigator\)/);
  assert.equal(manifest.start_url,"./");
  assert.equal(manifest.scope,"./");
  assert.ok(manifest.icons.every((icon)=>!icon.src.startsWith("/")));
  assert.match(serviceWorker,/self\.registration\.scope/);
  assert.doesNotMatch(serviceWorker,/caches\.match\('\/index\.html'\)/);
});
