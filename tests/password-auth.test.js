const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const {TextEncoder} = require("node:util");
const {webcrypto} = require("node:crypto");
const bcryptVendor = require("../zenbarber/js/vendor/bcrypt.min.js");

const coreSource = fs.readFileSync(path.join(__dirname,"..","zenbarber","js","core.js"),"utf8");

function createCoreContext({bcryptCompare,initialBcrypt} = {}){
  const listeners = new Map();
  const context = {
    console,
    crypto:webcrypto,
    TextEncoder,
    supabase:{createClient:()=>({from:()=>({})})},
    sessionStorage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}},
    todayISO:()=>"2026-01-01",
    location:{origin:"https://example.test",pathname:"/"},
    document:{
      getElementById:()=>({}),
      querySelector:()=>null,
      createElement:()=>({
        addEventListener:(event,handler)=>listeners.set(event,handler)
      }),
      head:{
        appendChild:()=>{
          context.window.bcrypt={compare:bcryptCompare || (async()=>false)};
          listeners.get("load")?.();
        }
      }
    }
  };
  context.window = context;
  if(initialBcrypt) context.bcrypt = initialBcrypt;
  vm.createContext(context);
  vm.runInContext(coreSource,context,{filename:"js/core.js"});
  return context;
}

async function verify(context,user,password){
  context.testUser = user;
  context.testPassword = password;
  return vm.runInContext("verifyBarberPassword(testUser,testPassword)",context);
}

test("carrega BCrypt e valida um password_hash BCrypt",async()=>{
  let received;
  const context = createCoreContext({
    bcryptCompare:async(password,hash)=>{
      received = {password,hash};
      return true;
    }
  });
  const hash = "$2b$10$abcdefghijklmnopqrstuuuuuuuuuuuuuuuuuuuuuuuuuuuuu";

  assert.equal(await verify(context,{login:"usuario",password_hash:hash},"senha-correta"),true);
  assert.deepEqual(received,{password:"senha-correta",hash});
});

test("valida BCrypt usando a biblioteca local distribuída com o site",async()=>{
  const context = createCoreContext({initialBcrypt:bcryptVendor});
  const hash = bcryptVendor.hashSync("senha-correta",4);

  assert.equal(await verify(context,{login:"usuario",password_hash:hash},"senha-correta"),true);
  assert.equal(await verify(context,{login:"usuario",password_hash:hash},"senha-errada"),false);
});

test("valida o hash SHA-256 legado criado pelo próprio sistema",async()=>{
  const context = createCoreContext();
  context.testLogin = "Usuario Teste";
  context.testPassword = "senha-correta";
  const hash = await vm.runInContext("makePasswordHash(testLogin,testPassword)",context);

  assert.equal(await verify(context,{login:"Usuario Teste",password_hash:hash},"senha-correta"),true);
  assert.equal(await verify(context,{login:"Usuario Teste",password_hash:hash},"senha-errada"),false);
});

test("mantém compatibilidade com password somente quando não há password_hash",async()=>{
  const context = createCoreContext();

  assert.equal(await verify(context,{login:"legado",password:"senha-antiga",password_hash:null},"senha-antiga"),true);
  assert.equal(await verify(context,{login:"legado",password:"senha-antiga",password_hash:null},"outra-senha"),false);
});

test("não aceita password quando existe um formato de hash desconhecido",async()=>{
  const context = createCoreContext();

  assert.equal(await verify(context,{
    login:"usuario",
    password:"senha-correta",
    password_hash:"formato-desconhecido"
  },"senha-correta"),false);
});
