package com.jeongchamsi.preview;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RadialGradient;
import android.graphics.Rect;
import android.graphics.RectF;
import android.graphics.Shader;
import android.graphics.Typeface;
import android.os.SystemClock;
import android.provider.Settings;
import android.view.View;

/** Approved gold PNG, unmodified. Only placement, clipping and light are animated. */
public final class IntroView extends View {
    public static final int BACKGROUND=Color.rgb(36,16,57);
    private final Paint paint=new Paint(Paint.ANTI_ALIAS_FLAG|Paint.FILTER_BITMAP_FLAG);
    private final Path wedge=new Path();
    private final Bitmap logo;
    private final Rect source;
    private final long started;
    private final boolean reducedMotion;
    private final Typeface titleFace;
    private final RectF logoBox=new RectF(), orbit=new RectF();
    private boolean waiting;

    public IntroView(Context context,long started){
        super(context);this.started=started;
        int id=getResources().getIdentifier("jcs_gold","drawable",context.getPackageName());
        logo=BitmapFactory.decodeResource(getResources(),id);
        if(logo==null)throw new IllegalStateException("Approved gold logo resource missing");
        source=new Rect(0,0,logo.getWidth(),logo.getHeight());
        Typeface face;
        try{face=Typeface.createFromAsset(context.getAssets(),"fonts/GmarketSansTTFBold.ttf");}
        catch(RuntimeException e){face=Typeface.create("sans-serif-black",Typeface.BOLD);}
        titleFace=face;
        reducedMotion=Settings.Global.getFloat(context.getContentResolver(),Settings.Global.ANIMATOR_DURATION_SCALE,1f)==0f;
        setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_YES);
        setContentDescription("정참시. 참여하는 정치의 시작");
        setClickable(true);
    }
    public void showWaiting(){if(!waiting && SystemClock.uptimeMillis()-started>=StartupGate.INTRO_MS){waiting=true;setContentDescription("정참시를 불러오고 있습니다");invalidate();}}
    private void resetPaint(){paint.reset();paint.setAntiAlias(true);paint.setFilterBitmap(true);}
    @Override protected void onDraw(Canvas canvas){
        super.onDraw(canvas);
        long elapsed=Math.max(0,SystemClock.uptimeMillis()-started);
        long t=reducedMotion?StartupGate.INTRO_MS:elapsed;
        canvas.drawColor(BACKGROUND);
        float unit=Math.min(getWidth()/360f,getHeight()/420f);
        canvas.save();canvas.translate(getWidth()/2f,getHeight()/2f);canvas.scale(unit,unit);
        resetPaint();
        paint.setShader(new RadialGradient(0,-50,240,new int[]{0xFF38204E,BACKGROUND},null,Shader.TileMode.CLAMP));
        canvas.drawCircle(0,-50,240,paint);paint.setShader(null);
        // Use the full original canvas including transparent padding. The gold mark
        // itself occupies about 147px of this 216px-wide destination.
        float w=216f,h=w*source.height()/source.width(),cy=-53f;
        logoBox.set(-w/2,cy-h/2,w/2,cy+h/2);
        // Each clipped slice contains the original pixels. Once locked, draw
        // the original in one pass to avoid seams at wedge boundaries.
        if(t>=720){resetPaint();canvas.drawBitmap(logo,source,logoBox,paint);}
        else for(int i=0;i<8;i++){
            float p=IntroTimeline.ray(t,i),angle=(float)Math.toRadians(-90+i*45);
            if(p<=0)continue;
            canvas.save();canvas.translate((float)Math.cos(angle)*72*(1-p),(float)Math.sin(angle)*72*(1-p));
            wedge.reset();wedge.moveTo(0,cy);
            for(int j=0;j<=2;j++){
                double a=angle+Math.toRadians(-23+j*23);
                wedge.lineTo((float)Math.cos(a)*190,cy+(float)Math.sin(a)*190);
            }
            wedge.close();canvas.clipPath(wedge);resetPaint();paint.setAlpha((int)(255*p));
            canvas.drawBitmap(logo,source,logoBox,paint);canvas.restore();
        }
        float tagline=IntroTimeline.tagline(t),name=IntroTimeline.name(t);
        resetPaint();paint.setTextAlign(Paint.Align.CENTER);paint.setTypeface(Typeface.create("sans-serif-medium",Typeface.NORMAL));
        paint.setTextSize(13);paint.setColor(0xFFE9DDF4);paint.setAlpha((int)(255*tagline));
        canvas.drawText("참여하는 정치의 시작",0,58+5*(1-tagline),paint);
        resetPaint();paint.setTextAlign(Paint.Align.CENTER);paint.setTypeface(titleFace);paint.setTextSize(43);
        paint.setShader(new LinearGradient(-73,0,73,0,new int[]{0xFFD0ACFF,0xFFE6CCDD,0xFFF4D58A},null,Shader.TileMode.CLAMP));
        paint.setAlpha((int)(255*name));
        float nameY=116+10*(1-name);
        canvas.drawText("정참시",0,nameY,paint);paint.setShader(null);
        float light=IntroTimeline.light(t);
        if(!reducedMotion&&light>0&&light<1){
            float fade=(float)Math.sin(Math.PI*light);
            float angle=-110+360*light;
            orbit.set(-94,cy-84,94,cy+84);
            resetPaint();paint.setStyle(Paint.Style.STROKE);paint.setStrokeWidth(1.3f);paint.setStrokeCap(Paint.Cap.ROUND);
            paint.setColor(0xFFF8D58B);paint.setAlpha((int)(190*fade));canvas.drawArc(orbit,angle-42,42,false,paint);
            float x=(float)Math.cos(Math.toRadians(angle))*94,y=cy+(float)Math.sin(Math.toRadians(angle))*84;
            resetPaint();paint.setShader(new RadialGradient(x,y,15,new int[]{0xEEFFF5D5,0x00F7CE83},null,Shader.TileMode.CLAMP));
            paint.setAlpha((int)(255*fade));canvas.drawCircle(x,y,15,paint);
            float sweep=-150+300*light;
            resetPaint();paint.setTextAlign(Paint.Align.CENTER);paint.setTypeface(titleFace);paint.setTextSize(43);
            paint.setShader(new LinearGradient(sweep-25,0,sweep+25,0,new int[]{0x00FFFFFF,0xF0FFF4CE,0x00FFFFFF},new float[]{0,.5f,1},Shader.TileMode.CLAMP));
            paint.setAlpha((int)(255*fade));canvas.drawText("정참시",0,nameY,paint);
        }
        if(waiting&&elapsed>=StartupGate.INTRO_MS){
            resetPaint();paint.setTextAlign(Paint.Align.CENTER);paint.setTypeface(Typeface.create("sans-serif",Typeface.NORMAL));
            paint.setTextSize(11);paint.setColor(0xFFD8CBE5);canvas.drawText("정참시를 불러오고 있습니다",0,164,paint);
        }
        canvas.restore();
        if(!reducedMotion&&elapsed<StartupGate.INTRO_MS)postInvalidateOnAnimation();
    }
}
