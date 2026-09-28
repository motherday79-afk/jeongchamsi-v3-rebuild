import sys
import hashlib
import io
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
import dex_tools
from dex_tools import Dex, INTRO, SOURCE_SHA256, select_intro
ROOT = Path(__file__).resolve().parents[1]
APPROVED_INTRO_SHA256 = '84bb1e423a1ad018e9c74a84923be912d22b43ff27fbcc8e959bc2b5ade1d2cf'
class IntroPreservationTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.original = (ROOT / 'reference/original-classes3.dex').read_bytes()
        cls.before = Dex(cls.original)
        cls.after = Dex(select_intro(cls.original))
    def test_exact_source(self):
        self.assertEqual(hashlib.sha256(self.original).hexdigest(), APPROVED_INTRO_SHA256)
        self.assertEqual(SOURCE_SHA256, APPROVED_INTRO_SHA256)
    def test_only_intro_defined(self):
        self.assertEqual(list(self.after.classes), [INTRO])
    def test_all_instructions_unchanged(self):
        self.assertEqual(self.before.methods(INTRO), self.after.methods(INTRO))
        self.assertEqual(len(self.after.methods(INTRO)), 20)
    def test_compile_contract(self):
        m = self.after.methods(INTRO)
        self.assertIn('<init>(Landroid/content/Context;)V', m)
        self.assertIn('setOnFinished(Ljava/lang/Runnable;)V', m)
    def test_class_and_static_data_unchanged(self):
        self.assertEqual(self.before.classes[INTRO][1], self.after.classes[INTRO][1])
    def test_tamper_rejected(self):
        changed = bytearray(self.original); changed[-1] ^= 1
        with self.assertRaises(ValueError): select_intro(bytes(changed))
    def test_real_animation_not_stub(self):
        m = self.after.methods(INTRO)
        self.assertGreater(m['onDraw(Landroid/graphics/Canvas;)V']['instruction_bytes'], 100)
        self.assertIn('drawFlyingStrokes(Landroid/graphics/Canvas;J)V', m)
        self.assertIn('drawAssembledStrokes(Landroid/graphics/Canvas;F)V', m)
        self.assertIn('drawTaglineCharacters(Landroid/graphics/Canvas;J)V', m)
    def test_selector_reports_approved_method_count(self):
        with tempfile.TemporaryDirectory() as tmp:
            target = Path(tmp) / 'intro.dex'
            previous = sys.argv
            try:
                sys.argv = ['dex_tools.py', 'select', str(ROOT / 'reference/original-classes3.dex'), str(target)]
                output = io.StringIO()
                with redirect_stdout(output):
                    dex_tools.main()
            finally:
                sys.argv = previous
        self.assertIn('all 20 method instruction sequences unchanged', output.getvalue())
if __name__ == '__main__': unittest.main()
