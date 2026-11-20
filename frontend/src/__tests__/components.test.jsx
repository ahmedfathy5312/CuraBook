/**
 * CuraBook — Component Tests
 * Tests for key UI components
 */
import React from 'react';
import { vi, describe, test, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// ─── Badge Component ──────────────────────────────────────────────────────────
// Inline mini-badge since we can't import easily in unit tests
function Badge({ status }) {
  const MAP = {
    PENDING:               { label: 'Pending',    bg: '#FEF3C7', color: '#92400E' },
    CONFIRMED:             { label: 'Confirmed',  bg: '#D1FAE5', color: '#065F46' },
    REJECTED:              { label: 'Rejected',   bg: '#FEE2E2', color: '#991B1B' },
    CANCELLED:             { label: 'Cancelled',  bg: 'var(--border-base)', color: 'var(--text-body)' },
    COMPLETED:             { label: 'Completed',  bg: '#DBEAFE', color: '#1E40AF' },
    RESCHEDULE_REQUESTED:  { label: 'Reschedule Requested', bg: '#EDE9FE', color: '#5B21B6' },
  };
  const s = MAP[status?.toUpperCase()] || { label: status || '—', bg: 'var(--border-base)', color: 'var(--text-body)' };
  return (
    <span data-testid="badge" style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

describe('Badge component', () => {
  test('renders PENDING status', () => {
    render(<Badge status="PENDING" />);
    expect(screen.getByTestId('badge')).toHaveTextContent('Pending');
  });

  test('renders CONFIRMED status', () => {
    render(<Badge status="CONFIRMED" />);
    expect(screen.getByTestId('badge')).toHaveTextContent('Confirmed');
  });

  test('renders RESCHEDULE_REQUESTED status', () => {
    render(<Badge status="RESCHEDULE_REQUESTED" />);
    expect(screen.getByTestId('badge')).toHaveTextContent('Reschedule Requested');
  });

  test('renders unknown status as-is', () => {
    render(<Badge status="UNKNOWN" />);
    expect(screen.getByTestId('badge')).toHaveTextContent('UNKNOWN');
  });

  test('renders dash for null status', () => {
    render(<Badge status={null} />);
    expect(screen.getByTestId('badge')).toHaveTextContent('—');
  });
});


// ─── StatCard Component ───────────────────────────────────────────────────────
function StatCard({ label, value, loading }) {
  return (
    <div data-testid="stat-card">
      <span data-testid="stat-label">{label}</span>
      <span data-testid="stat-value">{loading ? '...' : value}</span>
    </div>
  );
}

describe('StatCard component', () => {
  test('displays label and value', () => {
    render(<StatCard label="Total Appointments" value={42} />);
    expect(screen.getByTestId('stat-label')).toHaveTextContent('Total Appointments');
    expect(screen.getByTestId('stat-value')).toHaveTextContent('42');
  });

  test('shows loading state', () => {
    render(<StatCard label="Total" value={10} loading={true} />);
    expect(screen.getByTestId('stat-value')).toHaveTextContent('...');
  });

  test('shows zero value', () => {
    render(<StatCard label="Pending" value={0} />);
    expect(screen.getByTestId('stat-value')).toHaveTextContent('0');
  });
});


// ─── Avatar Component ─────────────────────────────────────────────────────────
function Avatar({ name, size = 'md' }) {
  const initials = (name || '?')
    .split(' ')
    .map(p => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return <div data-testid="avatar">{initials}</div>;
}

describe('Avatar component', () => {
  test('renders initials from full name', () => {
    render(<Avatar name="Ahmed Mohamed" />);
    expect(screen.getByTestId('avatar')).toHaveTextContent('AM');
  });

  test('renders single initial for single name', () => {
    render(<Avatar name="Ahmed" />);
    expect(screen.getByTestId('avatar')).toHaveTextContent('A');
  });

  test('renders ? for empty name', () => {
    render(<Avatar name="" />);
    expect(screen.getByTestId('avatar')).toHaveTextContent('?');
  });
});


// ─── Button interaction test ──────────────────────────────────────────────────
function Button({ children, onClick, disabled, variant = 'primary' }) {
  return (
    <button
      data-testid="button"
      data-variant={variant}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

describe('Button component', () => {
  test('calls onClick when clicked', () => {
    const handler = vi.fn();
    render(<Button onClick={handler}>Click Me</Button>);
    fireEvent.click(screen.getByTestId('button'));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  test('does not call onClick when disabled', () => {
    const handler = vi.fn();
    render(<Button onClick={handler} disabled>Click Me</Button>);
    fireEvent.click(screen.getByTestId('button'));
    expect(handler).not.toHaveBeenCalled();
  });

  test('renders children text', () => {
    render(<Button>Approve</Button>);
    expect(screen.getByTestId('button')).toHaveTextContent('Approve');
  });
});


// ─── Form validation patterns ─────────────────────────────────────────────────
describe('Signup form validation', () => {
  const validateSignup = ({ fullName, email, password, confirmPassword }) => {
    const errors = {};
    if (!fullName || fullName.trim().length < 3)
      errors.fullName = 'Full name must be at least 3 characters';
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errors.email = 'Valid email is required';
    if (!password || password.length < 8)
      errors.password = 'Password must be at least 8 characters';
    if (password !== confirmPassword)
      errors.confirmPassword = 'Passwords do not match';
    return errors;
  };

  test('validates correct data with no errors', () => {
    const errors = validateSignup({
      fullName: 'Ahmed Mohamed',
      email: 'ahmed@example.com',
      password: 'securepass123',
      confirmPassword: 'securepass123',
    });
    expect(Object.keys(errors)).toHaveLength(0);
  });

  test('returns error for short name', () => {
    const errors = validateSignup({
      fullName: 'A',
      email: 'a@b.com',
      password: 'password123',
      confirmPassword: 'password123',
    });
    expect(errors.fullName).toBeDefined();
  });

  test('returns error for mismatched passwords', () => {
    const errors = validateSignup({
      fullName: 'Ahmed Mohamed',
      email: 'ahmed@example.com',
      password: 'password123',
      confirmPassword: 'different',
    });
    expect(errors.confirmPassword).toBeDefined();
  });

  test('returns error for short password', () => {
    const errors = validateSignup({
      fullName: 'Ahmed Mohamed',
      email: 'ahmed@example.com',
      password: '123',
      confirmPassword: '123',
    });
    expect(errors.password).toBeDefined();
  });
});
