import { readFile } from 'node:fs/promises';
import { rebuildRedisCommand } from '../lib/redis-rest.js';
import { readDomain } from '../lib/rebuild-store.js';
import { getPolitician, readPoliticianPhotos } from '../lib/politician-store.js';
import { buildShareMetadata, renderShareDocument } from '../lib/share-metadata.js';

const indexFile=new URL('../index.html',import.meta.url);

function requestRoute(req){
  const requestUrl=new URL(req.url||'/',`https://${req.headers?.host||'www.jeongchamsi.com'}`);
  const path=String(req.query?.path||requestUrl.searchParams.get('path')||'').replace(/^\/+|\/+$/g,'');
  const params=new URLSearchParams(requestUrl.searchParams);params.delete('path');
  for(const key of Object.keys(req.query||{}))if(key!=='path'&&!params.has(key))params.set(key,String(req.query[key]));
  return `/${path}${params.size?`?${params}`:''}`;
}

export function createPublicShareSource(command){
  let photosPromise=null;
  return {
    async getPolitician(id){
      const [person,photos]=await Promise.all([getPolitician(command,id),photosPromise||(photosPromise=readPoliticianPhotos(command))]);
      return person?{...person,photo:photos[id]||null}:null;
    },
    readDomain(domain){return readDomain(command,domain,null);}
  };
}

export default async function handler(req,res){
  if(req.method!=='GET'){res.statusCode=405;res.setHeader('Allow','GET');return res.end('Method Not Allowed');}
  try{
    const [indexHtml,meta]=await Promise.all([readFile(indexFile,'utf8'),buildShareMetadata(requestRoute(req),createPublicShareSource(rebuildRedisCommand()))]);
    res.statusCode=200;
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.setHeader('Cache-Control','public, max-age=0, s-maxage=300, stale-while-revalidate=3600');
    res.setHeader('Vary','Accept-Encoding');
    return res.end(renderShareDocument(meta,indexHtml));
  }catch(error){
    console.error('[share-metadata]',String(error?.code||error?.message||error));
    const indexHtml=await readFile(indexFile,'utf8');
    const meta=await buildShareMetadata('/');
    res.statusCode=200;
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.setHeader('Cache-Control','public, max-age=0, s-maxage=60');
    return res.end(renderShareDocument(meta,indexHtml));
  }
}

