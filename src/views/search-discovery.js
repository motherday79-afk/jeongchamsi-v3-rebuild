import {KIDS_PRODUCTS,cheerArtDefs,cheerProductImage} from '../layout/home-layout.js?v=0.0.31.166';
import {renderCampaignItemCard} from './campaign-pages.js?v=0.0.31.160';

const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
let discoveryRequestSequence=0;

export function renderDiscoveryCampaigns(result){
 if(!result?.ok)return '';
 const ordered=[result.featured,...(Array.isArray(result.items)?result.items:[])].filter(Boolean),seen=new Set(),items=[];
 for(const item of ordered){const id=String(item?.id??'');if(!id||seen.has(id))continue;seen.add(id);items.push(item);if(items.length===3)break;}
 if(!items.length)return '';
 return `<div class="search-discovery-section-head"><div><span>JCS CAMPAIGN</span><h2>지금 이어지는 캠페인</h2></div><a href="/campaigns" data-layout-route="/campaigns">캠페인 전체보기</a></div><div id="jcs-campaign-directory" class="search-discovery-campaign-scope"><div class="search-discovery-campaign-grid">${items.map(renderCampaignItemCard).join('')}</div></div>`;
}

export function renderSearchDiscovery(query=''){
 const products=KIDS_PRODUCTS.map(product=>`<a class="search-discovery-product" href="/shop/${esc(product.id)}" data-layout-route="/shop/${esc(product.id)}"><div class="search-discovery-product-art">${cheerProductImage(product)}<small>디자인 시안</small></div><strong>${esc(product.name)}</strong><span>출시 준비 중</span></a>`).join('');
 return `<aside class="search-discovery" aria-label="검색 둘러보기"><section class="search-discovery-campaigns" data-search-discovery-campaigns data-search-discovery-query="${esc(query)}"></section><section class="search-discovery-shop" data-search-discovery-shop>${cheerArtDefs()}<div class="search-discovery-section-head"><div><p>정참시 쇼핑몰에 새로운 아이템이 추가되었습니다</p><h2>작고 귀여운 별빛 친구들</h2></div><a href="/shop" data-layout-route="/shop">쇼핑몰 전체보기</a></div><div class="search-discovery-product-grid">${products}</div></section></aside>`;
}

export async function loadSearchDiscovery(root,client,query=''){
 const mount=root?.querySelector?.('[data-search-discovery-campaigns]');
 if(!mount||!client?.list)return;
 const requestId=String(++discoveryRequestSequence);mount.dataset.searchDiscoveryQuery=String(query);mount.dataset.searchDiscoveryRequest=requestId;
 let result;try{result=await client.list({view:'current',page:1,category:'all'});}catch{result=null;}
 if(!root.isConnected||!mount.isConnected||mount.dataset.searchDiscoveryQuery!==String(query)||mount.dataset.searchDiscoveryRequest!==requestId)return;
 mount.innerHTML=renderDiscoveryCampaigns(result);
}
