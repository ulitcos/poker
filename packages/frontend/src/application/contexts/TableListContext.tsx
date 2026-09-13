import React, { createContext, useContext, useEffect, useState } from 'react';
import type { TableListItem } from '@planning-poker/shared';
import { getSocket } from '../../infrastructure/SocketClient';

interface TableListContextValue {
  tables: TableListItem[];
}

const TableListContext = createContext<TableListContextValue>({ tables: [] });

export function TableListProvider({ children }: { children: React.ReactNode }) {
  const [tables, setTables] = useState<TableListItem[]>([]);

  useEffect(() => {
    const socket = getSocket();
    socket.on('table:list-updated', setTables);
    return () => { socket.off('table:list-updated', setTables); };
  }, []);

  return (
    <TableListContext.Provider value={{ tables }}>
      {children}
    </TableListContext.Provider>
  );
}

export function useTableList() {
  return useContext(TableListContext);
}
