import test from 'node:test';
import assert from 'node:assert/strict';

import {
  youtubeCredentialStatus,
  searchYouTubeChannel,
  resolveYouTubeChannelReference,
  fetchYouTubeChannelData
} from '../lib/youtube-data.js';

const env={YOUTUBE_DATA_API_KEY:'server-secret-key'};
const response=data=>({ok:true,status:200,json:async()=>data});

test('YouTube credential status exposes readiness but never the API key',()=>{
  assert.deepEqual(youtubeCredentialStatus(env),{configured:true,missing:[]});
  assert.deepEqual(youtubeCredentialStatus({}),{configured:false,missing:['YOUTUBE_DATA_API_KEY']});
  assert.doesNotMatch(JSON.stringify(youtubeCredentialStatus(env)),/server-secret-key/);
});

test('channel search selects the strongest politician identity match',async()=>{
  let requested='';
  const fetchImpl=async url=>{
    requested=String(url);
    return response({items:[
      {id:{channelId:'UC_NEWS'},snippet:{title:'서울 정치 뉴스',description:'김민석 관련 뉴스 모음'}},
      {id:{channelId:'UC_OFFICIAL'},snippet:{title:'김민석 공식채널',description:'더불어민주당 서울 영등포구을 국회의원 김민석입니다.'}}
    ]});
  };
  const result=await searchYouTubeChannel({name:'김민석',party:'더불어민주당',jurisdiction:'서울 영등포구을',office:'국회의원'},{fetchImpl,env});
  assert.equal(result.channelId,'UC_OFFICIAL');
  assert.equal(result.channelUrl,'https://www.youtube.com/channel/UC_OFFICIAL');
  assert.equal(result.sourceMode,'AUTO');
  assert.match(decodeURIComponent(requested),/김민석/);
  assert.doesNotMatch(JSON.stringify(result),/server-secret-key/);
});

test('channel reference accepts a channel URL and resolves a handle through channels.list',async()=>{
  assert.deepEqual(await resolveYouTubeChannelReference('https://www.youtube.com/channel/UC_DIRECT',{env,fetchImpl:async()=>{throw new Error('must not fetch');}}),{
    channelId:'UC_DIRECT',channelUrl:'https://www.youtube.com/channel/UC_DIRECT',channelTitle:'',sourceMode:'MANUAL'
  });
  let requested='';
  const handle=await resolveYouTubeChannelReference('https://youtube.com/@kimminseok',{env,fetchImpl:async url=>{
    requested=String(url);
    return response({items:[{id:'UC_HANDLE',snippet:{title:'김민석 공식채널'}}]});
  }});
  assert.equal(handle.channelId,'UC_HANDLE');
  assert.equal(handle.channelTitle,'김민석 공식채널');
  assert.match(requested,/forHandle=%40kimminseok/);
});

test('channel collection returns bounded videos, view counts and literal upload windows',async()=>{
  const now=()=>Date.parse('2026-09-06T12:00:00.000Z');
  const playlistItems=[
    ['video-a','2026-09-06T06:00:00.000Z','오늘 현장'],
    ['video-b','2026-09-03T06:00:00.000Z','이번 주 정책'],
    ['video-c','2026-08-20T06:00:00.000Z','8월 활동'],
    ['video-old','2026-07-01T06:00:00.000Z','과거 영상']
  ].map(([videoId,publishedAt,title])=>({contentDetails:{videoId,videoPublishedAt:publishedAt},snippet:{title,publishedAt,resourceId:{videoId}}}));
  const fetchImpl=async raw=>{
    const url=new URL(String(raw));
    if(url.pathname.endsWith('/channels'))return response({items:[{id:'UC_OFFICIAL',snippet:{title:'김민석 공식채널'},contentDetails:{relatedPlaylists:{uploads:'UU_UPLOADS'}}}]});
    if(url.pathname.endsWith('/playlistItems'))return response({items:playlistItems});
    if(url.pathname.endsWith('/videos'))return response({items:playlistItems.map((item,index)=>({id:item.contentDetails.videoId,snippet:{title:item.snippet.title,publishedAt:item.snippet.publishedAt},statistics:{viewCount:String([1200,800,350,99][index])}}))});
    throw new Error(`unexpected ${url.pathname}`);
  };
  const result=await fetchYouTubeChannelData({channelId:'UC_OFFICIAL'},{fetchImpl,env,now});
  assert.equal(result.channel.title,'김민석 공식채널');
  assert.equal(result.videos.length,4);
  assert.deepEqual(result.videos.slice(0,3).map(item=>item.viewCount),[1200,800,350]);
  assert.deepEqual({h24:result.uploads.h24,d7:result.uploads.d7,d30:result.uploads.d30},{h24:1,d7:2,d30:3});
  assert.deepEqual(result.uploads.averageViews,{h24:1200,d7:1000,d30:783});
  assert.equal(result.uploads.daily.length,30);
  assert.equal(result.uploads.daily.find(row=>row.date==='2026-09-06').count,1);
  assert.equal(result.uploads.daily.find(row=>row.date==='2026-09-03').count,1);
  assert.doesNotMatch(JSON.stringify(result),/server-secret-key/);
});

test('period averages are null when no videos were uploaded in the window',async()=>{
  const fetchImpl=async raw=>{const url=new URL(String(raw));if(url.pathname.endsWith('/channels'))return response({items:[{id:'UC_EMPTY',snippet:{title:'빈 채널'},contentDetails:{relatedPlaylists:{uploads:'UU_EMPTY'}}}]});if(url.pathname.endsWith('/playlistItems'))return response({items:[]});throw new Error('unexpected');};
  const result=await fetchYouTubeChannelData({channelId:'UC_EMPTY'},{fetchImpl,env,now:()=>Date.parse('2026-09-06T12:00:00Z')});
  assert.deepEqual(result.uploads.averageViews,{h24:null,d7:null,d30:null});
});

test('YouTube API errors are stable and do not leak credentials or response bodies',async()=>{
  await assert.rejects(
    ()=>searchYouTubeChannel({name:'김민석'},{env,fetchImpl:async()=>({ok:false,status:403,json:async()=>({error:{message:'server-secret-key quota'}})})}),
    error=>error.code==='YOUTUBE_API_403'&&!JSON.stringify(error).includes('server-secret-key')
  );
});
