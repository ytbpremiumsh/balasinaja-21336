-- Light, non-destructive comments to trigger types refresh
COMMENT ON TABLE public.profiles IS 'User profiles with subscription and status fields';
COMMENT ON TABLE public.user_roles IS 'User to role mapping using app_role enum';
COMMENT ON TABLE public.settings IS 'Per-user key/value settings';
COMMENT ON TABLE public.ai_knowledge_base IS 'Per-user AI knowledge base entries';
COMMENT ON TABLE public.autoreplies IS 'Per-user autoresponder rules';
COMMENT ON TABLE public.contacts IS 'Per-user contacts';
COMMENT ON TABLE public.inbox IS 'Per-user inbox messages';
COMMENT ON TABLE public.packages IS 'Subscription packages';
COMMENT ON TABLE public.payment_proofs IS 'Payment proof submissions';
COMMENT ON TABLE public.payment_settings IS 'Payment receiving settings';
COMMENT ON TABLE public.activity_logs IS 'Admin activity logs';
COMMENT ON TYPE public.app_role IS 'Application roles: admin, moderator, user';