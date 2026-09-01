import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PulseComment, EMOJI_SCALE } from "@/hooks/usePulseSurvey";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquareOff } from "lucide-react";

interface PulsoCommentsTableProps {
  comments: PulseComment[];
  isLoading: boolean;
}

export function PulsoCommentsTable({ comments, isLoading }: PulsoCommentsTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!comments?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <MessageSquareOff className="h-12 w-12 mb-2 opacity-50" />
        <p>Nenhum comentário registrado</p>
        <p className="text-sm">Os comentários aparecerão aqui quando colaboradores compartilharem feedback escrito.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Sentimento</TableHead>
            <TableHead>Comentário</TableHead>
            <TableHead className="w-[150px] text-right">Data</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {comments.map((comment, index) => {
            const emojiData = EMOJI_SCALE.find(e => e.score === comment.score);
            return (
              <TableRow key={index}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{emojiData?.emoji}</span>
                    <span className="text-sm text-muted-foreground hidden sm:inline">
                      {emojiData?.label}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="max-w-[400px]">
                  <p className="text-sm line-clamp-2">{comment.comment}</p>
                </TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">
                  {format(new Date(comment.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
