SELECT
  id,
  title,
  content,
  category,
  MATCH(title, content, keywords)
    AGAINST (? IN NATURAL LANGUAGE MODE) AS relevance
FROM knowledge_base
WHERE is_active = 1
  AND MATCH(title, content, keywords)
      AGAINST (? IN NATURAL LANGUAGE MODE)
ORDER BY relevance DESC
LIMIT 5;
