import { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { NotificationsDrawer } from "@/components/notifications/NotificationsDrawer";

export default function Notificacoes() {
  const [open, setOpen] = useState(true);

  return (
    <MainLayout>
      <div className="p-6">
        <NotificationsDrawer open={open} onOpenChange={setOpen} />
        <div className="text-center text-muted-foreground mt-20">
          <p className="text-sm">Use o ícone de sino na sidebar para abrir suas notificações.</p>
        </div>
      </div>
    </MainLayout>
  );
}
