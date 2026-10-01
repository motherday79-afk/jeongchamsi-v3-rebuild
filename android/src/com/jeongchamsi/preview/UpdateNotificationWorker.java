package com.jeongchamsi.preview;
import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

public final class UpdateNotificationWorker extends Worker {
 public UpdateNotificationWorker(Context c,WorkerParameters p){super(c,p);}
 @Override public Result doWork(){
  Context c=getApplicationContext();var p=PushNotifications.prefs(c);String event=getInputData().getString("eventId"),path=PushPolicy.path(getInputData().getString("path"));
  if(!p.getBoolean("enabled",false)||!PushNotifications.allowed(c)||!PushPolicy.event(event)||path.isEmpty()||p.getBoolean("seen-"+event,false)||System.currentTimeMillis()-getInputData().getLong("receivedAt",0)>86400000)return Result.success();
  String title=getInputData().getString("title"),body=getInputData().getString("body");
  try{var state=PushNotifications.request(null);if(!state.optString("userId").equals(p.getString("user","")))return Result.success();if(path.startsWith("/groups/")){var notice=PushNotifications.message(event);if(!path.equals(notice.optString("path"))||!notice.optString("userId").equals(p.getString("user","")))return Result.success();title=notice.getString("title");body=notice.getString("body");}}
  catch(SecurityException e){if(!path.startsWith("/groups/"))p.edit().putBoolean("enabled",false).apply();return Result.success();}
  catch(Exception e){return Result.retry();}
  PushNotifications.channel(c);
  Intent intent=new Intent(c,MainActivity.class).putExtra("jcs_path",path).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP);
  PendingIntent open=PendingIntent.getActivity(c,event.hashCode(),intent,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
  if(title==null||title.isEmpty())title=path.equals("/now")?"나우랭크가 갱신되었습니다.":"JCS 여론조사가 업데이트되었습니다.";
  Notification n=new Notification.Builder(c,PushNotifications.CHANNEL).setSmallIcon(R.drawable.ic_update)
   .setContentTitle(title).setContentText(body==null?"눌러서 새로 반영된 내용을 확인하세요.":body).setStyle(new Notification.BigTextStyle().bigText(body==null?"눌러서 확인하세요.":body)).setContentIntent(open).setAutoCancel(true).build();
  if(!p.getBoolean("enabled",false))return Result.success();
  c.getSystemService(NotificationManager.class).notify(event.hashCode(),n);
  var edit=p.edit();if(p.getAll().size()>200)for(String k:p.getAll().keySet())if(k.startsWith("seen-"))edit.remove(k);
  edit.putBoolean("seen-"+event,true).apply();return Result.success();
 }
}
