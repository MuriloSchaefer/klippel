-- How many materials carry this type.
SELECT count(*) AS n FROM materials WHERE type = ?;
