ALTER TABLE attempts RENAME COLUMN id TO attempt_id;
ALTER TABLE attempts RENAME COLUMN answer TO answer_text;

ALTER TABLE attempts ALTER COLUMN user_id    SET NOT NULL;
ALTER TABLE attempts ALTER COLUMN rule_id    SET NOT NULL;
ALTER TABLE attempts ALTER COLUMN graph_id   SET NOT NULL;
ALTER TABLE attempts ALTER COLUMN topic_id   SET NOT NULL;
ALTER TABLE attempts ALTER COLUMN node_id    SET NOT NULL;
ALTER TABLE attempts ALTER COLUMN task_id    SET NOT NULL;
ALTER TABLE attempts ALTER COLUMN is_correct SET NOT NULL;
ALTER TABLE attempts ALTER COLUMN score      SET NOT NULL;
ALTER TABLE attempts ALTER COLUMN attempt_no SET NOT NULL;

ALTER TABLE attempts DROP COLUMN IF EXISTS lesson_id;
ALTER TABLE attempts DROP COLUMN IF EXISTS client_timestamp;
ALTER TABLE attempts DROP COLUMN IF EXISTS type;

DROP INDEX IF EXISTS lesson_idx;
DROP INDEX IF EXISTS user_lesson_idx;

CREATE INDEX IF NOT EXISTS user_idx        ON attempts (user_id);
CREATE INDEX IF NOT EXISTS user_task_idx   ON attempts (user_id, task_id);
CREATE INDEX IF NOT EXISTS graph_node_idx  ON attempts (graph_id, node_id);
CREATE INDEX IF NOT EXISTS created_at_idx  ON attempts (created_at);
