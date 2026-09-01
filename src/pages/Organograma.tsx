import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { 
  Network, 
  Search,
  Users,
  Building2,
  ChevronDown,
  ChevronRight,
  Mail,
  Phone,
  MapPin,
  ZoomIn,
  ZoomOut,
  Maximize2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface OrgNode {
  id: string;
  name: string;
  initials: string;
  role: string;
  department: string;
  email: string;
  phone: string;
  location: string;
  children?: OrgNode[];
  expanded?: boolean;
}

const orgData: OrgNode = {
  id: "1",
  name: "Carlos Eduardo Rodrigues",
  initials: "CE",
  role: "CEO",
  department: "Diretoria",
  email: "carlos@tgmais.com.br",
  phone: "(11) 99999-0001",
  location: "São Paulo, SP",
  expanded: true,
  children: [
    {
      id: "2",
      name: "Maria Fernanda Lima",
      initials: "MF",
      role: "Diretora de Operações",
      department: "Operações",
      email: "maria@tgmais.com.br",
      phone: "(11) 99999-0002",
      location: "São Paulo, SP",
      expanded: true,
      children: [
        {
          id: "5",
          name: "Ana Carolina Silva",
          initials: "AC",
          role: "Gerente de Projetos",
          department: "Projetos",
          email: "ana@tgmais.com.br",
          phone: "(11) 99999-0005",
          location: "São Paulo, SP",
          children: [
            {
              id: "9",
              name: "Lucas Fernandes",
              initials: "LF",
              role: "Analista de Projetos",
              department: "Projetos",
              email: "lucas@tgmais.com.br",
              phone: "(11) 99999-0009",
              location: "São Paulo, SP"
            }
          ]
        },
        {
          id: "6",
          name: "Pedro Henrique Santos",
          initials: "PH",
          role: "Gerente de Alocações",
          department: "Alocações",
          email: "pedro@tgmais.com.br",
          phone: "(11) 99999-0006",
          location: "São Paulo, SP"
        }
      ]
    },
    {
      id: "3",
      name: "Roberto Alves",
      initials: "RA",
      role: "Diretor Comercial",
      department: "Comercial",
      email: "roberto@tgmais.com.br",
      phone: "(11) 99999-0003",
      location: "São Paulo, SP",
      expanded: true,
      children: [
        {
          id: "7",
          name: "Juliana Costa",
          initials: "JC",
          role: "Executiva de Contas",
          department: "Comercial",
          email: "juliana@tgmais.com.br",
          phone: "(11) 99999-0007",
          location: "São Paulo, SP"
        }
      ]
    },
    {
      id: "4",
      name: "Patricia Mendes",
      initials: "PM",
      role: "Diretora de RH",
      department: "Recursos Humanos",
      email: "patricia@tgmais.com.br",
      phone: "(11) 99999-0004",
      location: "São Paulo, SP",
      expanded: true,
      children: [
        {
          id: "8",
          name: "Mariana Oliveira",
          initials: "MO",
          role: "Analista de RH Sênior",
          department: "Recursos Humanos",
          email: "mariana@tgmais.com.br",
          phone: "(11) 99999-0008",
          location: "São Paulo, SP"
        }
      ]
    }
  ]
};

const departments = [
  { name: "Diretoria", count: 1, color: "bg-primary" },
  { name: "Operações", count: 3, color: "bg-info" },
  { name: "Comercial", count: 2, color: "bg-success" },
  { name: "Recursos Humanos", count: 2, color: "bg-accent" }
];

export default function Organograma() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedNode, setSelectedNode] = useState<OrgNode | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(["1", "2", "3", "4"]));

  const toggleNode = (id: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedNodes(newExpanded);
  };

  const getDepartmentColor = (dept: string) => {
    const colors: Record<string, string> = {
      "Diretoria": "border-primary bg-primary/5",
      "Operações": "border-info bg-info/5",
      "Comercial": "border-success bg-success/5",
      "Recursos Humanos": "border-accent bg-accent/5",
      "Projetos": "border-info bg-info/5",
      "Alocações": "border-info bg-info/5"
    };
    return colors[dept] || "border-muted bg-muted/5";
  };

  const renderOrgNode = (node: OrgNode, level: number = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.id} className="flex flex-col items-center">
        <Card 
          className={cn(
            "shadow-card hover:shadow-md transition-all cursor-pointer border-l-4 min-w-[200px]",
            getDepartmentColor(node.department),
            selectedNode?.id === node.id && "ring-2 ring-primary"
          )}
          onClick={() => setSelectedNode(node)}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                  {node.initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-sm truncate">{node.name}</p>
                <p className="text-xs text-muted-foreground truncate">{node.role}</p>
              </div>
              {hasChildren && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleNode(node.id);
                  }}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {hasChildren && isExpanded && (
          <div className="mt-4 relative">
            {/* Vertical line from parent */}
            <div className="absolute top-0 left-1/2 w-px h-4 bg-border -translate-x-1/2 -translate-y-4" />
            
            {/* Horizontal connector line */}
            {node.children!.length > 1 && (
              <div className="absolute top-0 left-0 right-0 h-px bg-border" style={{ width: `${(node.children!.length - 1) * 220}px`, left: '50%', transform: 'translateX(-50%)' }} />
            )}
            
            <div className="flex gap-6 pt-4">
              {node.children!.map((child, index) => (
                <div key={child.id} className="relative">
                  {/* Vertical line to child */}
                  <div className="absolute top-0 left-1/2 w-px h-4 bg-border -translate-x-1/2 -translate-y-4" />
                  {renderOrgNode(child, level + 1)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Network className="h-7 w-7 text-primary" />
              Organograma
            </h1>
            <p className="text-muted-foreground">Estrutura organizacional da TG Mais</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon">
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Department Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {departments.map((dept) => (
            <Card key={dept.name} className="shadow-card">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={cn("w-3 h-3 rounded-full", dept.color)} />
                <div>
                  <p className="text-sm font-medium text-foreground">{dept.name}</p>
                  <p className="text-xs text-muted-foreground">{dept.count} pessoas</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Org Chart */}
          <div className="lg:col-span-3">
            <Card className="shadow-card overflow-auto">
              <CardContent className="p-8 min-h-[500px]">
                <div className="flex justify-center">
                  {renderOrgNode(orgData)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Selected Node Details */}
          <div className="lg:col-span-1">
            <Card className="shadow-card sticky top-6">
              <CardHeader>
                <CardTitle className="text-lg">Detalhes</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedNode ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-16 w-16 border-2 border-primary/20">
                        <AvatarFallback className="bg-primary/10 text-primary font-bold text-xl">
                          {selectedNode.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-foreground">{selectedNode.name}</h3>
                        <p className="text-sm text-muted-foreground">{selectedNode.role}</p>
                        <Badge variant="outline" className="mt-1">
                          {selectedNode.department}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-3 pt-4 border-t">
                      <div className="flex items-center gap-3 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-foreground">{selectedNode.email}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-foreground">{selectedNode.phone}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-foreground">{selectedNode.location}</span>
                      </div>
                    </div>

                    <Button className="w-full mt-4" variant="outline">
                      Ver Perfil Completo
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Clique em um colaborador para ver os detalhes</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
