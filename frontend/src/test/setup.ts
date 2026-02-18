import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Automatic cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock CSS imports
vi.mock('*.css', () => ({}));

// ── Global lightweight antd mock ──────────────────────────────────────────────
// Prevents loading the full antd library (hundreds of MB) in every worker.
vi.mock('antd', async () => {
  const React = await import('react');
  const h = React.createElement;

  const Spin = (props: any) => {
    if (props.spinning === false) return h(React.Fragment, null, props.children);
    return h('div', { className: 'ant-spin ant-spin-spinning' }, props.children);
  };

  const Modal = (props: any) => {
    if (!props.open) return null;
    return h('div', { className: 'ant-modal', role: 'dialog', 'aria-modal': 'true' },
      h('div', { className: 'ant-modal-header' },
        typeof props.title === 'string' ? h('span', null, props.title) : props.title
      ),
      h('div', { className: 'ant-modal-body' }, props.children),
      props.footer !== null && h('div', { className: 'ant-modal-footer' }, props.footer),
    );
  };

  const DatePicker = (props: any) =>
    h('input', {
      'data-testid': `datepicker-${props.placeholder || 'date'}`,
      placeholder: props.placeholder,
      onChange: () => {},
    });

  const Collapse = ({ items }: any) =>
    h('div', { 'data-testid': 'collapse' },
      items?.map((item: any) =>
        h('div', { key: item.key },
          h('div', null, item.label),
          h('div', null, item.children),
        )
      )
    );

  const Pagination = (props: any) => h('nav', { 'data-testid': 'pagination' });

  const Tabs = ({ items }: any) =>
    h('div', { 'data-testid': 'antd-tabs' },
      items?.map((item: any) =>
        h('div', { key: item.key }, item.label, item.children)
      )
    );

  // Typography sub-components
  const Title = ({ children, level }: any) => h(`h${level || 1}`, null, children);
  const Paragraph = ({ children }: any) => h('p', null, children);
  const Text = ({ children, strong, type, style }: any) =>
    h(strong ? 'strong' : 'span', { style }, children);
  const Typography = Object.assign(
    ({ children }: any) => h('div', null, children),
    { Title, Paragraph, Text },
  );

  return { Spin, Modal, DatePicker, Collapse, Pagination, Tabs, Typography };
});

// ── Global lightweight @ant-design/icons mock ─────────────────────────────────
vi.mock('@ant-design/icons', async () => {
  const React = await import('react');
  const h = React.createElement;
  return new Proxy({}, {
    get(_target, name) {
      if (typeof name !== 'string' || name === '__esModule') return undefined;
      const label = (name as string).replace(/Outlined$|Filled$|TwoTone$/i, '').toLowerCase();
      return (props: any) => h('span', { role: 'img', 'aria-label': label, className: `anticon anticon-${name}` }, name);
    },
  });
});

// Mock import.meta.env
Object.defineProperty(import.meta, 'env', {
  value: {
    VITE_API_URL: 'http://localhost:3001',
    MODE: 'test',
    DEV: true,
    PROD: false,
    SSR: false,
  },
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: MockIntersectionObserver,
});

// Suppress antd warning logs in tests
const originalConsoleWarn = console.warn;
console.warn = (...args: unknown[]) => {
  const msg = typeof args[0] === 'string' ? args[0] : '';
  if (msg.includes('[antd') || msg.includes('Warning:')) return;
  originalConsoleWarn(...args);
};
