import { Plus, Trash2 } from 'lucide-react';
import { useFieldArray, Control } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { formatDateBR, relationshipTypeOptions } from '@/lib/validators/colaborador';
import type { ColaboradorFormData } from '@/lib/validators/colaborador';

interface DependentesSectionProps {
  control: Control<ColaboradorFormData>;
}

export function DependentesSection({ control }: DependentesSectionProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'dependentes',
  });

  const handleAddDependente = () => {
    append({
      name: '',
      birth_date: '',
      relationship: 'Filho(a)',
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">Dependentes</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddDependente}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Adicionar Dependente
        </Button>
      </div>

      {fields.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Data de Nascimento</TableHead>
                <TableHead>Parentesco</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.map((field, index) => (
                <TableRow key={field.id}>
                  <TableCell>
                    <FormField
                      control={control}
                      name={`dependentes.${index}.name`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              placeholder="Nome do dependente"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TableCell>
                  <TableCell>
                    <FormField
                      control={control}
                      name={`dependentes.${index}.birth_date`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              placeholder="DD/MM/AAAA"
                              {...field}
                              onChange={(e) => {
                                const formatted = formatDateBR(e.target.value);
                                field.onChange(formatted);
                              }}
                              maxLength={10}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TableCell>
                  <TableCell>
                    <FormField
                      control={control}
                      name={`dependentes.${index}.relationship`}
                      render={({ field }) => (
                        <FormItem>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {relationshipTypeOptions.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {fields.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4 border rounded-lg">
          Nenhum dependente cadastrado
        </p>
      )}
    </div>
  );
}
