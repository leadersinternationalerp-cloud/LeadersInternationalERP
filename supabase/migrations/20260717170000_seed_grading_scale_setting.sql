-- Seed A*-G grading scale in system_settings
INSERT INTO public.system_settings (key, value)
VALUES (
  'grading_scale',
  '[{"grade":"A*","min":90,"max":100},{"grade":"A","min":80,"max":90},{"grade":"B","min":70,"max":80},{"grade":"C","min":60,"max":70},{"grade":"D","min":50,"max":60},{"grade":"E","min":40,"max":50},{"grade":"F","min":30,"max":40},{"grade":"G","min":0,"max":30}]'::jsonb
)
ON CONFLICT (key) DO UPDATE 
SET value = EXCLUDED.value;
