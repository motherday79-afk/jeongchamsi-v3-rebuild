export async function comicRequest(options={},admin=false){
 try{const response=await fetch(`/api/v3/political-comic${admin?'?admin=1':''}`,{credentials:'same-origin',...options,headers:{'Content-Type':'application/json',...options.headers}});const data=await response.json();return response.ok?data:{...data,ok:false};}catch{return {ok:false,error:'NETWORK_ERROR',items:[]};}
}
const errors={EDIT_CONFLICT:'다른 작업으로 회차가 변경됐습니다. 페이지를 새로고침한 후 수정해 주세요.',ADMIN_REQUIRED:'최고관리자로 로그인해 주세요.',IMAGE_REQUIRED:'이미지 주소를 확인해 주세요.',SOURCE_REQUIRED:'출처를 이름 | https://주소 형식으로 입력해 주세요.',NETWORK_ERROR:'연결에 실패했습니다. 잠시 후 다시 시도해 주세요.'};
export function bindComicEditor(root,{onSaved}={}){
 root.addEventListener('click',async event=>{const button=event.target.closest('[data-comic-delete]');if(!button||button.disabled)return;if(!confirm('이 회차를 삭제하시겠습니까?'))return;button.disabled=true;const result=await comicRequest({method:'POST',body:JSON.stringify({operation:'delete',id:button.dataset.comicDelete,updatedAt:button.dataset.comicRevision})});if(result.ok){onSaved?.();window.dispatchEvent(new CustomEvent('jcs:layout-route',{detail:{route:'/political-comic'}}));}else{button.disabled=false;alert(errors[result.error]||'삭제하지 못했습니다. 다시 시도해 주세요.');}});

 root.addEventListener('change',async event=>{
  const input=event.target.closest('[data-comic-upload]');if(!input)return;
  const file=input.files?.[0],form=input.closest('form'),status=form.querySelector('[data-comic-status]'),submit=form.querySelector('[type="submit"]');if(!file)return;const target=input.dataset.comicUpload||'image';
  if(file.size>1024*1024){status.textContent='이미지는 1MB 이하로 선택해 주세요.';input.value='';return;}
  if(submit.disabled)return;
  if(target==='image'){
   const objectUrl=URL.createObjectURL(file);
   try{const picture=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=objectUrl;});if(Math.abs(picture.naturalWidth/picture.naturalHeight-1)>.015){status.textContent='원고는 가로와 세로가 같은 정사각형 2×2 이미지로 올려주세요.';input.value='';return;}}
   catch{status.textContent='이미지를 읽을 수 없습니다. 다른 파일을 선택해 주세요.';return;}finally{URL.revokeObjectURL(objectUrl);}
  }
  submit.disabled=true;input.disabled=true;status.textContent='이미지를 업로드하고 있습니다…';
  try{const base64=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=reject;reader.readAsDataURL(file);});const result=await comicRequest({method:'POST',body:JSON.stringify({operation:'upload-image',contentType:file.type,base64})});if(!result.ok)throw Error(result.error);form.elements[target].value=result.url;const preview=form.querySelector('[data-comic-preview="'+target+'"]');preview.src=result.url;preview.hidden=false;status.textContent='업로드 완료. 저장하기를 눌러 회차에 반영해 주세요.';}catch{status.textContent='업로드에 실패했습니다. JPG·PNG·WebP 형식과 파일 크기를 확인해 주세요.';}finally{submit.disabled=false;input.disabled=false;}
 });
 root.addEventListener('submit',async event=>{
  const form=event.target.closest('[data-comic-editor]');if(!form)return;event.preventDefault();
  const data=new FormData(form),input=Object.fromEntries(data),button=form.querySelector('[type="submit"]'),status=form.querySelector('[data-comic-status]');
  input.published=data.has('published');
  if(button.disabled)return;if(!input.image){status.textContent='완성 만화 원고를 먼저 업로드해 주세요.';return;}button.disabled=true;status.textContent='저장 중…';const result=await comicRequest({method:'POST',body:JSON.stringify({input})});button.disabled=false;
  if(!result.ok){status.textContent=errors[result.error]||'저장하지 못했습니다. 모든 필수 항목과 출처를 확인해 주세요.';return;}
  const publicLink=form.querySelector('[data-comic-public-link]');publicLink.href='/political-comic/'+encodeURIComponent(result.item.id);publicLink.hidden=false;form.elements.id.value=result.item.id;form.elements.updatedAt.value=result.item.updatedAt;status.textContent=input.published?'게시했습니다. 메인과 정치4컷에서 확인할 수 있습니다.':'비공개로 저장했습니다.';onSaved?.();
 });
}
