import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DashboardGestor } from '../DashboardGestor';
import * as useColaboradoresModule from '@/hooks/useColaboradores';

describe('DashboardGestor', () => {
  it('renders team total and active count correctly', () => {
    vi.spyOn(useColaboradoresModule, 'useColaboradores').mockReturnValue({
      data: [
        { id: '1', full_name: 'John', status: 'ATIVO', job_title: 'Dev' },
        { id: '2', full_name: 'Jane', status: 'FERIAS', job_title: 'Design' },
      ],
      isLoading: false,
    } as any);

    render(<DashboardGestor />);

    expect(screen.getByText('Minha Equipe')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // total
    expect(screen.getAllByText('1')).toHaveLength(2); // ativos (or ferias)
    expect(screen.getByText('John')).toBeInTheDocument();
    expect(screen.getByText('Jane')).toBeInTheDocument();
  });
});
