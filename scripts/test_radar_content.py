import json
import pathlib
import unittest


ROOT = pathlib.Path(__file__).parent.parent


class RadarContentTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = json.loads((ROOT / "data" / "radar-content.json").read_text())

    def test_every_external_link_uses_https(self):
        rows = [
            *self.data["dialogues"],
            *self.data["tools"]["new"],
            *self.data["tools"]["essential"],
            *self.data["reports"],
        ]
        self.assertTrue(all(row["url"].startswith("https://") for row in rows))
        self.assertTrue(all(row["sourceUrl"].startswith("https://") for row in self.data["advice"]))

    def test_no_duplicate_item_within_a_section(self):
        groups = [
            self.data["dialogues"],
            self.data["tools"]["new"],
            self.data["tools"]["essential"],
            self.data["reports"],
            self.data["advice"],
        ]
        for rows in groups:
            ids = [row.get("id", row.get("name")) for row in rows]
            self.assertEqual(len(ids), len(set(ids)))

    def test_all_five_sections_have_real_content(self):
        self.assertGreaterEqual(len(self.data["dialogues"]), 3)
        self.assertGreaterEqual(len(self.data["tools"]["new"]), 3)
        self.assertGreaterEqual(len(self.data["tools"]["essential"]), 3)
        self.assertGreaterEqual(len(self.data["reports"]), 3)
        self.assertGreaterEqual(len(self.data["advice"]), 3)

    def test_dialogue_portraits_are_local_and_present(self):
        for row in self.data["dialogues"]:
            self.assertTrue(row["image"].startswith("./people/"))
            self.assertTrue((ROOT / "public" / row["image"].removeprefix("./")).is_file())
            self.assertTrue(row["imageAlt"])
            self.assertTrue(row["imageCredit"])


if __name__ == "__main__":
    unittest.main()
