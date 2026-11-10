ALTER TABLE public.cargos DROP CONSTRAINT cargos_ghe_id_fkey;
ALTER TABLE public.cargos ADD CONSTRAINT cargos_ghe_id_fkey FOREIGN KEY (ghe_id) REFERENCES public.ghes(id) ON DELETE SET NULL;
ALTER TABLE public.descricoes_cargo DROP CONSTRAINT descricoes_cargo_ghe_id_fkey;
ALTER TABLE public.descricoes_cargo ADD CONSTRAINT descricoes_cargo_ghe_id_fkey FOREIGN KEY (ghe_id) REFERENCES public.ghes(id) ON DELETE SET NULL;