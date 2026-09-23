export default function handler(req,res){
 res.statusCode=410;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify({ok:false,error:'FEATURE_REMOVED'}));
}
