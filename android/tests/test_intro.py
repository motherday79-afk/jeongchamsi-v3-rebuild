import sys
import hashlib
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
from dex_tools import Dex, INTRO, SOURCE_SHA256, select_intro
ROOT = Path(__file__).resolve().parents[1]
class IntroPreservationTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.original = (ROOT / 'reference/original-classes3.dex').read_bytes()
        cls.before = Dex(cls.original)
        cls.after = Dex(select_intro(cls.original))
    def test_exact_source(self):
        self.assertEqual(hashlib.sha256(self.original).hexdigest(), SOURCE_SHA256)
    def test_only_intro_defined(self):
        self.assertEqual(list(self.after.classes), [INTRO])
    def test_all_instructions_unchanged(self):
        self.assertEqual(self.before.methods(INTRO), self.after.methods(INTRO))
        self.assertEqual(len(self.after.methods(INTRO)), 11)
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
        self.assertIn('drawPerson(Landroid/graphics/Canvas;FF)V', m)
        self.assertIn('drawDoor(Landroid/graphics/Canvas;FF)V', m)
if __name__ == '__main__': unittest.main()
