import { defineRegistry } from '@json-render/react';
import { widgetCatalog } from './catalog';

const gapMap = { none: '0', xs: '4px', sm: '8px', md: '12px', lg: '20px' };
const sizeMap = { xs: '11px', sm: '12px', md: '14px', lg: '16px', xl: '20px' };
const weightMap = { normal: '400', medium: '500', semibold: '600', bold: '700' };
const colorMap = {
  default: '#1f2937',
  muted: '#9ca3af',
  accent: '#6366f1',
  success: '#16a34a',
  warning: '#d97706',
  error: '#ef4444',
};
const badgeColors = {
  default: { bg: '#f3f4f6', fg: '#6b7280' },
  success: { bg: '#f0fdf4', fg: '#16a34a' },
  warning: { bg: '#fffbeb', fg: '#d97706' },
  error: { bg: '#fef2f2', fg: '#ef4444' },
  info: { bg: '#eef2ff', fg: '#6366f1' },
};
const barColors = {
  default: '#6366f1',
  success: '#16a34a',
  warning: '#d97706',
  error: '#ef4444',
  accent: '#7c3aed',
};

const font = "'IBM Plex Mono', monospace";

export const { registry } = defineRegistry(widgetCatalog, {
  components: {
    Card: ({ props, children }) => (
      <div style={{
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        background: '#fff',
        padding: props.padding === 'none' ? 0 : props.padding === 'sm' ? '8px' : props.padding === 'lg' ? '24px' : '16px',
        fontFamily: font,
      }}>
        {props.title && (
          <div style={{ fontWeight: 600, fontSize: '14px', color: '#1f2937', marginBottom: '12px' }}>
            {props.title}
          </div>
        )}
        {children}
      </div>
    ),

    Stack: ({ props, children }) => (
      <div style={{
        display: 'flex',
        flexDirection: props.direction === 'horizontal' ? 'row' : 'column',
        gap: gapMap[props.gap ?? 'md'],
        alignItems: props.align === 'center' ? 'center' : props.align === 'end' ? 'flex-end' : props.align === 'stretch' ? 'stretch' : 'flex-start',
        justifyContent: props.justify === 'center' ? 'center' : props.justify === 'end' ? 'flex-end' : props.justify === 'between' ? 'space-between' : props.justify === 'around' ? 'space-around' : 'flex-start',
        flexWrap: props.wrap ? 'wrap' : 'nowrap',
      }}>
        {children}
      </div>
    ),

    Grid: ({ props, children }) => (
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${props.columns ?? 2}, 1fr)`,
        gap: gapMap[props.gap ?? 'md'],
      }}>
        {children}
      </div>
    ),

    Text: ({ props }) => (
      <span style={{
        fontFamily: font,
        fontSize: sizeMap[props.size ?? 'md'],
        fontWeight: weightMap[props.weight ?? 'normal'],
        color: colorMap[props.color ?? 'default'],
        textAlign: props.align ?? 'left',
        display: 'block',
        lineHeight: 1.5,
      }}>
        {props.content}
      </span>
    ),

    Heading: ({ props }) => {
      const sizes = { h1: '20px', h2: '16px', h3: '14px' };
      return (
        <div style={{
          fontFamily: font,
          fontSize: sizes[props.level ?? 'h2'],
          fontWeight: 600,
          color: '#1f2937',
          lineHeight: 1.3,
        }}>
          {props.content}
        </div>
      );
    },

    Metric: ({ props }) => (
      <div style={{ fontFamily: font }}>
        <div style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {props.label}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '2px' }}>
          <span style={{ fontSize: '24px', fontWeight: 600, color: '#1f2937' }}>{props.value}</span>
          {props.unit && <span style={{ fontSize: '12px', color: '#9ca3af' }}>{props.unit}</span>}
          {props.trend && (
            <span style={{ fontSize: '12px', color: props.trend === 'up' ? '#16a34a' : props.trend === 'down' ? '#ef4444' : '#9ca3af' }}>
              {props.trend === 'up' ? '↑' : props.trend === 'down' ? '↓' : '→'}
            </span>
          )}
        </div>
      </div>
    ),

    Badge: ({ props }) => {
      const c = badgeColors[props.variant ?? 'default'];
      return (
        <span style={{
          fontFamily: font,
          display: 'inline-block',
          fontSize: '11px',
          fontWeight: 500,
          padding: '2px 8px',
          borderRadius: '100px',
          background: c.bg,
          color: c.fg,
        }}>
          {props.text}
        </span>
      );
    },

    Button: ({ props, emit }) => {
      const isPrimary = props.variant === 'primary';
      const isGhost = props.variant === 'ghost';
      return (
        <button
          onClick={() => emit('press')}
          style={{
            fontFamily: font,
            fontSize: props.size === 'sm' ? '12px' : props.size === 'lg' ? '14px' : '13px',
            padding: props.size === 'sm' ? '4px 10px' : props.size === 'lg' ? '10px 20px' : '6px 14px',
            borderRadius: '8px',
            border: isGhost ? 'none' : '1px solid',
            borderColor: isPrimary ? '#6366f1' : '#e5e7eb',
            background: isPrimary ? '#6366f1' : isGhost ? 'transparent' : '#fff',
            color: isPrimary ? '#fff' : '#374151',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          {props.label}
        </button>
      );
    },

    TextInput: ({ props }) => (
      <div style={{ fontFamily: font }}>
        {props.label && <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>{props.label}</label>}
        <input
          type="text"
          placeholder={props.placeholder}
          style={{
            fontFamily: font,
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '13px',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>
    ),

    Checkbox: ({ props }) => (
      <label style={{ fontFamily: font, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#374151', cursor: 'pointer' }}>
        <input type="checkbox" style={{ width: '16px', height: '16px' }} />
        {props.label}
      </label>
    ),

    ProgressBar: ({ props }) => {
      const max = props.max ?? 100;
      const pct = Math.min(100, (props.value / max) * 100);
      const barColor = barColors[props.color ?? 'default'];
      return (
        <div style={{ fontFamily: font }}>
          <div style={{ height: '8px', borderRadius: '4px', background: '#f3f4f6', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: '4px', transition: 'width 0.3s ease' }} />
          </div>
          {props.showLabel && (
            <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px', textAlign: 'right' }}>{Math.round(pct)}%</div>
          )}
        </div>
      );
    },

    Divider: () => (
      <div style={{ height: '1px', background: '#e5e7eb', margin: '4px 0' }} />
    ),

    Spacer: ({ props }) => {
      const sizes = { xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '40px' };
      return <div style={{ height: sizes[props.size ?? 'md'] }} />;
    },

    Image: ({ props }) => (
      <img
        src={props.src}
        alt={props.alt ?? ''}
        style={{
          maxWidth: '100%',
          height: 'auto',
          borderRadius: props.rounded ? '12px' : '0',
          display: 'block',
        }}
      />
    ),

    List: ({ props }) => (
      <div style={{ fontFamily: font }}>
        {props.items.map((item, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 0',
              borderBottom: props.variant === 'bordered' || props.variant === 'striped' ? '1px solid #f3f4f6' : 'none',
              background: props.variant === 'striped' && i % 2 === 1 ? '#f9fafb' : 'transparent',
            }}
          >
            <div>
              <div style={{ fontSize: '13px', color: '#1f2937' }}>{item.label}</div>
              {item.description && <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>{item.description}</div>}
            </div>
            {item.trailing && <span style={{ fontSize: '13px', color: '#6b7280', flexShrink: 0, marginLeft: '12px' }}>{item.trailing}</span>}
          </div>
        ))}
      </div>
    ),

    Table: ({ props }) => (
      <table style={{ fontFamily: font, width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr>
            {props.headers.map((h, i) => (
              <th key={i} style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '2px solid #e5e7eb', color: '#6b7280', fontWeight: 500, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {props.rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td key={ci} style={{ padding: '8px 12px', borderBottom: '1px solid #f3f4f6', color: '#1f2937' }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    ),
  },
});
