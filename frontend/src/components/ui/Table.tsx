import React, { ReactNode } from 'react';

interface TableProps {
  columns: string[];
  children: ReactNode;
}

const Table: React.FC<TableProps> = ({ columns, children }) => {
  return (
    <div className="w-full overflow-auto border rounded-lg border-border">
      <table className="w-full text-sm text-left caption-bottom">
        <thead className="[&_tr]:border-b border-border bg-muted/50">
          <tr>
            {columns.map((col, index) => (
              <th key={index} className="h-12 px-4 font-medium align-middle text-muted-foreground">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&_tr:last-child]:border-0 [&_tr]:border-b border-border">
          {children}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
