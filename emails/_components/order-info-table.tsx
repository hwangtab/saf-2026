import * as React from 'react';

interface OrderInfoRow {
  label: string;
  value: string;
  bold?: boolean;
}

interface OrderInfoTableProps {
  rows: OrderInfoRow[];
}

export default function OrderInfoTable({ rows }: OrderInfoTableProps) {
  return (
    <table
      style={{
        width: '100%',
        borderCollapse: 'collapse',
        border: '1px solid #E0E0E0',
        borderRadius: '6px',
        overflow: 'hidden',
        marginBottom: '0',
      }}
    >
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            <td style={tdKeyStyle}>{row.label}</td>
            <td
              style={{
                ...tdValStyle,
                ...(row.bold ? { fontWeight: '700' } : {}),
              }}
            >
              {row.value}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const tdKeyStyle: React.CSSProperties = {
  padding: '10px 14px',
  fontWeight: '600',
  color: '#555E67',
  background: '#FAFAFC',
  width: '110px',
  borderBottom: '1px solid #E0E0E0',
  verticalAlign: 'top',
  whiteSpace: 'nowrap',
};

const tdValStyle: React.CSSProperties = {
  padding: '10px 14px',
  color: '#1F2428',
  borderBottom: '1px solid #E0E0E0',
};
