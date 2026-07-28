import React, { ReactNode } from 'react';
import './Table.css';

interface TableProps {
  columns: string[];
  children: ReactNode;
}

const Table: React.FC<TableProps> = ({ columns, children }) => {
  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col, index) => (
              <th key={index}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {children}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
