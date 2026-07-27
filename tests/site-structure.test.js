const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const repoRoot = path.join(__dirname,"..");
const zenbarberRoot = path.join(repoRoot,"zenbarber");

function read(...parts){
  return fs.readFileSync(path.join(...parts),"utf8");
}

function localRefs(html){
  return [...html.matchAll(/\s(?:src|href)="([^"]+)"/g)]
    .map((match)=>match[1])
    .filter((ref)=>!ref.startsWith("http") && !ref.startsWith("#"))
    .map((ref)=>ref.split("?")[0]);
}

function existsWithExactCase(baseDir,relativePath){
  let current = baseDir;
  for(const part of relativePath.split(/[\\/]/).filter(Boolean)){
    const exactName = fs.readdirSync(current).find((name)=>name === part);
    if(!exactName) return false;
    current = path.join(current,exactName);
  }
  return fs.existsSync(current);
}

test("mantém landing e ZenBarber em pontos de entrada separados",()=>{
  const landingHtml = read(repoRoot,"index.html");
  const zenbarberHtml = read(zenbarberRoot,"index.html");

  assert.match(landingHtml,/<title>NextJumpX<\/title>/);
  assert.match(landingHtml,/href="zenbarber\/index\.html"/);
  assert.match(landingHtml,/data-production-href="\/zenbarber\/"/);
  assert.match(landingHtml,/location\.protocol !== 'file:'/);
  assert.doesNotMatch(landingHtml,/href="https:\/\/zenbarber\.nextjumpx\.com\.br/);
  assert.match(zenbarberHtml,/<title>ZenBarber Pro Powered by NextJumpX<\/title>/);
  assert.ok(!fs.existsSync(path.join(repoRoot,"js")),"os scripts do ZenBarber não devem permanecer na raiz");
});

test("todos os arquivos locais referenciados pela landing existem",()=>{
  for(const ref of localRefs(read(repoRoot,"index.html"))){
    assert.ok(!ref.startsWith("/"),`a referência precisa ser relativa para funcionar via file://: ${ref}`);
    assert.ok(fs.existsSync(path.join(repoRoot,ref)),`referência ausente: ${ref}`);
  }
});

test("todos os arquivos locais referenciados pelo ZenBarber existem",()=>{
  for(const ref of localRefs(read(zenbarberRoot,"index.html"))){
    assert.ok(!ref.startsWith("/"),`a referência precisa ficar dentro de /zenbarber/: ${ref}`);
    assert.ok(fs.existsSync(path.join(zenbarberRoot,ref)),`referência ausente: ${ref}`);
  }
});

test("PWA usa caminhos relativos e fica isolado no diretório do ZenBarber",()=>{
  const html = read(zenbarberRoot,"index.html");
  const manifest = JSON.parse(read(zenbarberRoot,"manifest.json"));
  const serviceWorker = read(zenbarberRoot,"sw.js");

  assert.match(html,/rel="icon"[^>]+href="favicon-192x192\.png/);
  assert.doesNotMatch(html,/<link rel="manifest"/);
  assert.match(html,/const isWebProtocol = location\.protocol === "http:" \|\| location\.protocol === "https:"/);
  assert.match(html,/if \(isWebProtocol\) \{/);
  assert.match(html,/serviceWorker\.register\("sw\.js\?/);
  assert.match(html,/if \(isWebProtocol && "serviceWorker" in navigator\)/);
  assert.equal(manifest.start_url,"./");
  assert.equal(manifest.scope,"./");
  assert.ok(manifest.icons.every((icon)=>!icon.src.startsWith("/")));
  assert.match(serviceWorker,/'\.\/index\.html'/);
  assert.doesNotMatch(serviceWorker,/caches\.match\('\/index\.html'\)/);
});

test("nomes dos scripts respeitam maiúsculas e minúsculas do servidor Netlify",()=>{
  const scripts = [...read(zenbarberRoot,"index.html").matchAll(/<script[^>]+src="([^"]+)"/g)]
    .map((match)=>match[1])
    .filter((ref)=>!ref.startsWith("http"))
    .map((ref)=>ref.split("?")[0]);

  for(const ref of scripts){
    assert.ok(existsWithExactCase(zenbarberRoot,ref),`script ausente ou com capitalização incorreta: ${ref}`);
  }
});
