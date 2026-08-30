-- One page of the browse view.
--
-- Rank order is (usage desc, key asc). The tiebreak on the domain key makes it
-- a *total* order, which is what stops paging from skipping or repeating a row
-- when two materials share a usage count. Usage is a left join because a
-- material nothing uses still ranks — last.
SELECT m.material_key AS key
FROM materials m
LEFT JOIN material_usage u ON u.material_id = m.id
ORDER BY COALESCE(u.uses, 0) DESC, m.material_key ASC
LIMIT ? OFFSET ?;
