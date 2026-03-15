INSERT INTO radicals (symbol, meaning) VALUES
  ('人', 'person'),
  ('木', 'tree');

INSERT INTO kanji (character, meaning, difficulty, stroke_count) VALUES
  ('休', 'rest', 1, 6),
  ('林', 'woods', 2, 8);

INSERT INTO readings (kanji_id, type, reading) VALUES
  (1, 'on', 'キュウ'),
  (1, 'kun', 'やす'),
  (2, 'on', 'リン'),
  (2, 'kun', 'はやし');

INSERT INTO kanji_radicals (kanji_id, radical_id) VALUES
  (1, 1),
  (1, 2),
  (2, 2);

INSERT INTO vocab (kanji_id, word, reading, meaning) VALUES
  (1, '休日', 'きゅうじつ', 'holiday'),
  (2, '森林', 'しんりん', 'forest');
