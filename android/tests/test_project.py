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
        self.assertEqual(cfg['homeUrl'],'https://jeongchamsi.com/')
    def test_icon_uses_exact_approved_gold_png(self):
        import hashlib
        gold=ROOT/'res/drawable-nodpi/jcs_gold.png'
        provenance=json.loads((ROOT/'reference/BRAND167.json').read_text())
        self.assertEqual(hashlib.sha256(gold.read_bytes()).hexdigest(),provenance['goldLogoSha256'])
        vector=ET.parse(ROOT/'res/drawable/ic_launcher_foreground.xml').getroot()
        self.assertEqual(vector.tag,'inset')
        frac=lambda key:float(vector.get(A+key).strip('%'))/100
        w=1-frac('insetLeft')-frac('insetRight')
        h=1-frac('insetTop')-frac('insetBottom')
        self.assertAlmostEqual(w/h,1536/1024,places=6)
        self.assertEqual(vector.find('bitmap').get(A+'src'),'@drawable/jcs_gold')
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
    def test_only_updated_native_intro_is_compiled(self):
        build=(ROOT/'tools/build.sh').read_text()
        self.assertNotIn('find src stubs',build)
        self.assertNotIn('build/original-intro.dex',build)
        self.assertIn('verify-final',build)
        self.assertTrue((ROOT/'src/com/jeongchamsi/preview/IntroView.java').is_file())
    def test_back_gestures_and_buttons(self):
        source = (ROOT/'src/com/jeongchamsi/preview/MainActivity.java').read_text()
        self.assertIn('onBackPressed() { handleBack(); }',source)
        self.assertIn('OnBackInvokedCallback',source)
        self.assertIn('new BackPolicy(2000)',source)
    def test_reference_not_packaged_as_asset(self):
        self.assertFalse(any(p.suffix=='.dex' for p in (ROOT/'assets').rglob('*')))
        self.assertTrue((ROOT/'assets/back-layer.js').is_file())
if __name__ == '__main__': unittest.main()
