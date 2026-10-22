import os
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from backend.config import load_env_files


class TestEnvLoader(unittest.TestCase):
    def write(self, text: str) -> Path:
        d = Path(tempfile.mkdtemp())
        path = d / ".env"
        path.write_text(text, encoding="utf-8")
        self.addCleanup(lambda: path.unlink(missing_ok=True))
        return path

    def test_loads_values_quotes_comments_and_export(self):
        path = self.write(
            "# comment\n\nTEST_A=plain\nTEST_B=\"quoted value\"\nexport TEST_C='single'\nTEST_D=with comment # trailing\nbad line\n"
        )
        with mock.patch.dict(os.environ, {}, clear=False):
            for name in ("TEST_A", "TEST_B", "TEST_C", "TEST_D"):
                os.environ.pop(name, None)
            loaded = load_env_files([path])
            self.assertEqual(sorted(loaded), ["TEST_A", "TEST_B", "TEST_C", "TEST_D"])
            self.assertEqual(os.environ["TEST_A"], "plain")
            self.assertEqual(os.environ["TEST_B"], "quoted value")
            self.assertEqual(os.environ["TEST_C"], "single")
            self.assertEqual(os.environ["TEST_D"], "with comment")

    def test_blank_placeholder_is_ignored(self):
        path = self.write("TEST_BLANK=\n")
        with mock.patch.dict(os.environ, {}, clear=False):
            os.environ.pop("TEST_BLANK", None)
            self.assertEqual(load_env_files([path]), [])
            self.assertNotIn("TEST_BLANK", os.environ)

    def test_real_environment_always_wins(self):
        path = self.write("TEST_WIN=from-file\n")
        with mock.patch.dict(os.environ, {"TEST_WIN": "from-shell"}):
            self.assertEqual(load_env_files([path]), [])
            self.assertEqual(os.environ["TEST_WIN"], "from-shell")

    def test_missing_file_is_fine_and_values_are_never_returned(self):
        self.assertEqual(load_env_files([Path("/definitely/not/here/.env")]), [])
        path = self.write("TEST_SECRET=super-secret-value\n")
        with mock.patch.dict(os.environ, {}, clear=False):
            os.environ.pop("TEST_SECRET", None)
            loaded = load_env_files([path])
        self.assertEqual(loaded, ["TEST_SECRET"])  # names only
        self.assertNotIn("super-secret-value", repr(loaded))

    def test_frontend_env_local_is_never_a_default_source(self):
        from backend.config import DEFAULT_ENV_FILES

        self.assertTrue(all(p.name == ".env" for p in DEFAULT_ENV_FILES))


if __name__ == "__main__":
    unittest.main()
