package com.jeongchamsi.preview;
import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

public final class UpdateMessagingService extends FirebaseMessagingService {
 @Override public void onNewToken(String token){PushNotifications.newToken(this,token);}
 @Override public void onMessageReceived(RemoteMessage message){
  String event=message.getData().get("eventId"),path=PushPolicy.path(message.getData().get("path"));
  if(!PushPolicy.event(event)||path.isEmpty())return;
  var work=new androidx.work.OneTimeWorkRequest.Builder(UpdateNotificationWorker.class)
   .setInputData(new androidx.work.Data.Builder().putString("eventId",event).putString("path",path).putString("title",message.getData().get("title")).putString("body",message.getData().get("body")).putLong("receivedAt",System.currentTimeMillis()).build())
   .setConstraints(new androidx.work.Constraints.Builder().setRequiredNetworkType(androidx.work.NetworkType.CONNECTED).build())
   .setBackoffCriteria(androidx.work.BackoffPolicy.EXPONENTIAL,30,java.util.concurrent.TimeUnit.SECONDS).build();
  androidx.work.WorkManager.getInstance(this).enqueueUniqueWork("jcs-update-"+event,androidx.work.ExistingWorkPolicy.KEEP,work);
 }
}
