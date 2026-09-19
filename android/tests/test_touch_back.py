"""Execute the production touch listener with BackPolicy, without an Android SDK.

The input boundary replays a system gesture: DOWN, CANCEL, Back callback.
This catches resetting the first Back on the next gesture's ACTION_DOWN.
"""
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]


class TouchBackTest(unittest.TestCase):
    def test_real_touch_listener_preserves_double_gesture_exit(self):
        source = (ROOT / 'src/com/jeongchamsi/preview/MainActivity.java').read_text()
        listener = source.split('web.setOnTouchListener(', 1)[1].split('\n        });', 1)[0]
        # The callback body comes from production. Only MotionEvent and WebView's
        # listener boundary are replaced; BackPolicy and reset side effects run.
        java = '''package com.jeongchamsi.preview;
public class TouchBackHarness {
  static class MotionEvent {
    static final int ACTION_DOWN=0, ACTION_UP=1, ACTION_MOVE=2, ACTION_CANCEL=3;
    int action; MotionEvent(int action){this.action=action;}
    int getActionMasked(){return action;}
  }
  interface Listener {boolean touch(Object view, MotionEvent event);}
  class Web {Listener listener; void setOnTouchListener(Listener l){listener=l;}
    void send(int action){if(listener.touch(this,new MotionEvent(action)))throw new AssertionError("touch swallowed");}}
  final BackPolicy backPolicy=new BackPolicy(2000);
  final Web web=new Web();
  void resetExit(){backPolicy.reset();}
  TouchBackHarness(){web.setOnTouchListener(''' + listener + '''\n  });}
  void gesture(){web.send(MotionEvent.ACTION_DOWN);web.send(MotionEvent.ACTION_MOVE);web.send(MotionEvent.ACTION_CANCEL);}
  void expect(boolean value,String name){if(!value)throw new AssertionError(name);}
  public static void main(String[] args){
    TouchBackHarness h=new TouchBackHarness();
    h.gesture();h.expect(!h.backPolicy.shouldExit(1000),"first gesture must prompt");
    h.gesture();h.expect(h.backPolicy.shouldExit(1800),"second system gesture must exit");
    h.backPolicy.reset();h.expect(!h.backPolicy.shouldExit(3000),"new sequence prompts");
    h.web.send(MotionEvent.ACTION_DOWN);h.web.send(MotionEvent.ACTION_UP);
    h.expect(!h.backPolicy.shouldExit(3400),"completed content touch cancels pending exit");
    h.backPolicy.reset();h.expect(!h.backPolicy.shouldExit(5000),"new sequence prompts");
    h.gesture();h.expect(!h.backPolicy.shouldExit(7100),"expired gesture window prompts");
    h.gesture();h.expect(h.backPolicy.shouldExit(7600),"next gesture exits within window");
    System.out.println("Touch/Back: 7 behavior checks passed");
  }
}'''
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'TouchBackHarness.java'
            path.write_text(java)
            subprocess.run(['java', '-m', 'jdk.compiler/com.sun.tools.javac.Main', '-encoding', 'UTF-8', '-d', directory,
                            str(ROOT/'src/com/jeongchamsi/preview/BackPolicy.java'), str(path)], check=True)
            result = subprocess.run(['java', '-cp', directory,
                                     'com.jeongchamsi.preview.TouchBackHarness'], capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)


if __name__ == '__main__':
    unittest.main()
