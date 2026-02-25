"use client";

import React from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UserPlus, MoreVertical, Shield } from 'lucide-react';

const users = [
  { id: 1, name: 'Vinícius Oliveira', email: 'vini@poker.com', role: 'Admin', status: 'Ativo' },
  { id: 2, name: 'João Silva', email: 'joao@poker.com', role: 'Jogador', status: 'Ativo' },
  { id: 3, name: 'Maria Santos', email: 'maria@poker.com', role: 'Jogador', status: 'Inativo' },
];

const AdminUsers = () => {
  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-200">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white">Gestão de Usuários</h1>
              <p className="text-slate-400 mt-1">Controle de acesso e permissões.</p>
            </div>
            <Button className="bg-emerald-600 hover:bg-emerald-500 gap-2">
              <UserPlus className="w-4 h-4" /> Convidar Usuário
            </Button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-950/50">
                <TableRow className="border-slate-800">
                  <TableHead className="text-slate-400">Usuário</TableHead>
                  <TableHead className="text-slate-400">Cargo</TableHead>
                  <TableHead className="text-slate-400">Status</TableHead>
                  <TableHead className="text-slate-400 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} className="border-slate-800">
                    <TableCell>
                      <div>
                        <p className="font-bold text-white">{user.name}</p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {user.role === 'Admin' && <Shield className="w-3 h-3 text-amber-400" />}
                        <span className="text-slate-300">{user.role}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={user.status === 'Ativo' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'}>
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="text-slate-500">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminUsers;