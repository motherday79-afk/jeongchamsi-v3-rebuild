from pathlib import Path
import json
import unittest
import xml.etree.ElementTree as ET
ROOT = Path(__file__).resolve().parents[1]
A = '{http://schemas.android.com/apk/res/android}'
class ProjectScopeTest(unittest.TestCase):
    def test_manifest_only_internet(self):
        root = ET.parse(ROOT/'AndroidManifest.xml').getroot()
        self.assertEqual([p.get(A+'name') for p in root.findall('uses-permission')],['android.permission.INTERNET'])
        app = root.find('application')
        self.assertEqual(len(app.findall('activity')),1)
        for name in ['service','receiver','provider']:
            self.assertEqual(app.findall(name),[])
        self.assertEqual(app.get(A+'allowBackup'),'false')
        self.assertEqual(app.get(A+'usesCleartextTraffic'),'false')
    def test_distinct_install_identity(self):
        cfg = json.loads((ROOT/'config.json').read_text())
        self.assertEqual(cfg['applicationId'],'com.jeongchamsi.minimal')
        self.assertNotEqual(cfg['applicationId'],'com.jeongchamsi.preview')
        self.assertEqual(cfg['homeUrl'],'https://jeongchamsi-v3-rebuild.vercel.app/')
    def test_icon_has_eight_white_rays(self):
        vector = ET.parse(ROOT/'res/drawable/ic_launcher_foreground.xml').getroot()
        groups = vector.findall('group')
        self.assertEqual([int(g.get(A+'rotation')) for g in groups],list(range(0,360,45)))
        self.assertTrue(all(g.find('path').get(A+'fillColor')=='#FFFFFF' for g in groups))
    def test_xml_is_well_formed(self):
        paths = list((ROOT/'res').rglob('*.xml'))
        self.assertGreaterEqual(len(paths),5)
        for path in paths: ET.parse(path)
    def test_history_not_replaced_by_home_reload(self):
        source = (ROOT/'src/com/jeongchamsi/preview/MainActivity.java').read_text()
        code = source.split('private void nativeBack() {',1)[1].split('private void resetExit()',1)[0]
        self.assertIn('web.goBack()',code)
        self.assertNotIn('loadUrl(',code)
        self.assertNotIn('reload(',code)
        self.assertNotIn('addJavascriptInterface',source)
    def test_stub_removed_before_d8(self):
        build = (ROOT/'tools/build.sh').read_text()
        remove = build.index('rm build/classes/com/jeongchamsi/preview/IntroView.class')
        merge = build.index('"$BT/d8" --release')
        self.assertLess(remove,merge)
        self.assertIn('build/new-app-classes.jar build/original-intro.dex',build)
        self.assertIn('verify-final',build)
    def test_back_gestures_and_buttons(self):
        source = (ROOT/'src/com/jeongchamsi/preview/MainActivity.java').read_text()
        self.assertIn('onBackPressed() { handleBack(); }',source)
        self.assertIn('OnBackInvokedCallback',source)
        self.assertIn('new BackPolicy(2000)',source)
    def test_reference_not_packaged_as_asset(self):
        self.assertEqual([p.name for p in (ROOT/'assets').iterdir()],['back-layer.js'])
if __name__ == '__main__': unittest.main()
