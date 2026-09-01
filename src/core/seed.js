export async function seedStableDomains(content){
  if(!(await content.list('columns')).length) await content.create('columns',{title:'정참시 COLUMN',body:'정참시 칼럼 영역입니다.',author:'정참시'});
  if(!(await content.list('community')).length) await content.create('community',{title:'정뮤니티에 오신 것을 환영합니다',body:'시민 의견을 나누는 공간입니다.',author:'정참시'});
  if(!(await content.list('itsme')).length) await content.create('itsme',{title:'내가 만드는 정책 제안',body:'정책 제안 예시입니다.',author:'정참시'});
  if(!(await content.list('academy')).length) await content.create('academy',{title:'정참시 아카데미',body:'등록된 일정이 생기면 이곳에 표시됩니다.',date:''});
}
