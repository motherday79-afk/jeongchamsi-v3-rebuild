package com.jeongchamsi.preview;

import android.app.Activity;
import android.app.AlertDialog;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import android.webkit.CookieManager;
import android.widget.Toast;
import com.google.firebase.messaging.FirebaseMessaging;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONObject;

public final class PushNotifications {
 static final String CHANNEL="jcs_updates";
 static final int PERMISSION=345;
 private static final ExecutorService IO=Executors.newSingleThreadExecutor();
 static SharedPreferences prefs(Context c){return c.getSharedPreferences("jcs-update-push",Context.MODE_PRIVATE);}
 static String origin(){try{URL u=new URL(BuildConfig.HOME_URL);return "https://"+u.getHost();}catch(Exception e){throw new IllegalStateException(e);}}
 static void channel(Context c){c.getSystemService(NotificationManager.class).createNotificationChannel(new NotificationChannel(CHANNEL,"나우랭크·여론조사 갱신",NotificationManager.IMPORTANCE_DEFAULT));}
 static boolean allowed(Context c){return (Build.VERSION.SDK_INT<33||c.checkSelfPermission("android.permission.POST_NOTIFICATIONS")==PackageManager.PERMISSION_GRANTED)&&c.getSystemService(NotificationManager.class).areNotificationsEnabled();}
 static JSONObject request(JSONObject body)throws Exception {
  String base=origin();HttpURLConnection conn=(HttpURLConnection)new URL(base+"/api/v3/push/device").openConnection();
  conn.setInstanceFollowRedirects(false);conn.setConnectTimeout(8000);conn.setReadTimeout(8000);
  String cookie=CookieManager.getInstance().getCookie(base);if(cookie!=null)conn.setRequestProperty("Cookie",cookie);
  conn.setRequestProperty("Origin",base);conn.setRequestProperty("Accept","application/json");
  try{
   if(body!=null){conn.setRequestMethod("POST");conn.setDoOutput(true);conn.setRequestProperty("Content-Type","application/json");try(var out=conn.getOutputStream()){out.write(body.toString().getBytes(StandardCharsets.UTF_8));}}
   int status=conn.getResponseCode();if(status==401||status==403)throw new SecurityException("ADMIN_REQUIRED");if(status!=200)throw new java.io.IOException("PUSH_HTTP_"+status);
   try(var in=conn.getInputStream();var out=new java.io.ByteArrayOutputStream()){byte[] b=new byte[2048];int n;while((n=in.read(b))!=-1){out.write(b,0,n);if(out.size()>16384)throw new java.io.IOException("PUSH_RESPONSE_LIMIT");}return new JSONObject(out.toString("UTF-8"));}
  }finally{conn.disconnect();}
 }
 static void show(Activity a,String text){a.runOnUiThread(()->{if(!a.isFinishing())Toast.makeText(a,text,Toast.LENGTH_LONG).show();});}
 public static void settings(Activity a){
  IO.execute(()->{try{
   JSONObject state=request(null);
   a.runOnUiThread(()->{
    if(a.isFinishing())return;
    boolean enabled=prefs(a).getBoolean("enabled",false)&&allowed(a);
    new AlertDialog.Builder(a).setTitle("갱신 알림 설정")
     .setMessage("나우랭크와 JCS 여론조사가 실제로 갱신되면 이 기기로 알려드립니다.\n현재: "+(enabled?"켜짐":"꺼짐")+(!state.optBoolean("configured")?"\n서버 푸시 연결을 준비하고 있습니다.":""))
     .setPositiveButton("알림 켜기",(d,w)->{if(!state.optBoolean("configured")){show(a,"서버 연결 완료 후 다시 시도해 주세요.");return;}enable(a);})
     .setNegativeButton("알림 끄기",(d,w)->disable(a)).setNeutralButton("닫기",null).show();
   });
  }catch(SecurityException e){show(a,"관리자 계정으로 로그인한 뒤 설정해 주세요.");}catch(Exception e){show(a,"알림 설정을 불러오지 못했습니다. 다시 시도해 주세요.");}});
 }
 public static void enable(Activity a){
  channel(a);
  if(Build.VERSION.SDK_INT>=33&&a.checkSelfPermission("android.permission.POST_NOTIFICATIONS")!=PackageManager.PERMISSION_GRANTED){a.requestPermissions(new String[]{"android.permission.POST_NOTIFICATIONS"},PERMISSION);return;}
  if(!allowed(a)){show(a,"안드로이드 설정에서 정참시 알림을 허용해 주세요.");return;}
  FirebaseMessaging.getInstance().setAutoInitEnabled(true);
  FirebaseMessaging.getInstance().getToken().addOnSuccessListener(token->IO.execute(()->{try{
   JSONObject state=request(null);if(!state.optBoolean("configured"))throw new java.io.IOException("PUSH_NOT_CONFIGURED");
   request(new JSONObject().put("token",token).put("enabled",true));
   prefs(a).edit().putString("token",token).putString("user",state.getString("userId")).putBoolean("enabled",true).apply();show(a,"갱신 알림을 켰습니다.");
  }catch(Exception e){FirebaseMessaging.getInstance().setAutoInitEnabled(false);show(a,"알림 등록에 실패했습니다. 로그인과 연결을 확인해 주세요.");}})).addOnFailureListener(e->show(a,"기기 알림 등록에 실패했습니다. Google Play 서비스를 확인해 주세요."));
 }
 public static void disable(Activity a){
  prefs(a).edit().putBoolean("enabled",false).apply();FirebaseMessaging.getInstance().setAutoInitEnabled(false);
  a.getSystemService(NotificationManager.class).cancelAll();sync(a);show(a,"이 기기의 갱신 알림을 껐습니다.");
 }
 public static void sync(Context c){
  IO.execute(()->{SharedPreferences p=prefs(c);String token=p.getString("token","");if(token.isEmpty())return;
   try{JSONObject state=request(null);boolean same=state.optString("userId").equals(p.getString("user",""));
    boolean enabled=same&&p.getBoolean("enabled",false)&&allowed(c);
    if(!same)p.edit().putBoolean("enabled",false).apply();
    request(new JSONObject().put("token",token).put("enabled",enabled));
   }catch(SecurityException e){p.edit().putBoolean("enabled",false).apply();}catch(Exception ignored){} });
 }
 static void newToken(Context c,String token){prefs(c).edit().putString("token",token).apply();sync(c);}
}
