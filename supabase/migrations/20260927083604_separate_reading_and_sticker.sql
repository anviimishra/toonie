-- Reading comics have six panels; parent jobs also draw a separate sticker summary.
alter table public.comic_messages drop constraint comic_messages_panel_count_check;
alter table public.comic_messages add constraint comic_messages_panel_count_check check (panel_count between 1 and 6);
alter table public.comic_jobs drop constraint comic_jobs_panel_count_check;
alter table public.comic_jobs add constraint comic_jobs_panel_count_check check (panel_count between 1 and 10);
