import { describe, it, expect } from 'vitest';
import { 
  MODULOS_CONTRATAVEIS, 
  MAPA_ROTA_MODULO, 
  obterModuloPorRota 
} from '../modulosContrataveis';

describe('Catálogo de Módulos Contratáveis (modulosContrataveis)', () => {
  it('deve conter exatamente os 15 módulos canônicos da plataforma', () => {
    expect(MODULOS_CONTRATAVEIS).toHaveLength(15);
    const keys = MODULOS_CONTRATAVEIS.map((m) => m.key);
    expect(keys).toContain('/colaboradores');
    expect(keys).toContain('/ferias');
    expect(keys).toContain('/demissoes');
    expect(keys).toContain('/beneficios');
    expect(keys).toContain('/minhas-tarefas');
    expect(keys).toContain('/comunicados');
    expect(keys).toContain('/avaliacoes');
    expect(keys).toContain('/feedback-gestao');
    expect(keys).toContain('/diario-bordo');
    expect(keys).toContain('/treinamentos');
    expect(keys).toContain('/cuidar-mais');
    expect(keys).toContain('/mapa-riscos-nr1');
    expect(keys).toContain('/estrutura-organizacional');
    expect(keys).toContain('/relatorios-executivos');
    expect(keys).toContain('/denuncias');
  });

  it('apenas Colaboradores deve ser marcado como módulo base (inegociável)', () => {
    const baseModules = MODULOS_CONTRATAVEIS.filter((m) => m.isBase);
    expect(baseModules).toHaveLength(1);
    expect(baseModules[0].key).toBe('/colaboradores');
  });

  it('deve mapear sub-recursos corretamente para os módulos pais', () => {
    expect(MAPA_ROTA_MODULO['/minhas-ferias']).toBe('/ferias');
    expect(MAPA_ROTA_MODULO['/ficha-profissional']).toBe('/colaboradores');
    expect(MAPA_ROTA_MODULO['/pdi']).toBe('/avaliacoes');
    expect(MAPA_ROTA_MODULO['/laudo']).toBe('/mapa-riscos-nr1');
    expect(MAPA_ROTA_MODULO['/organograma']).toBe('/estrutura-organizacional');
    expect(MAPA_ROTA_MODULO['/comportamentos-ofensivos']).toBe('/denuncias');
  });

  it('obterModuloPorRota deve resolver rotas principais e sub-rotas com parâmetros', () => {
    expect(obterModuloPorRota('/avaliacoes')?.key).toBe('/avaliacoes');
    expect(obterModuloPorRota('/pdi/pdi-123')?.key).toBe('/avaliacoes');
    expect(obterModuloPorRota('/laudo/app-999')?.key).toBe('/mapa-riscos-nr1');
    expect(obterModuloPorRota('/minhas-ferias')?.key).toBe('/ferias');
    expect(obterModuloPorRota('/rota-inexistente')).toBeUndefined();
  });
});
