import React from 'react';
import { describe, expect, test } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ToastProvider, useToast } from '../app/providers/ToastProvider';

function DuplicateCancellationTrigger() {
  const toast = useToast();
  return (
    <button
      onClick={() => {
        toast.success('تم إلغاء الموعد');
        toast.info('تم إلغاء الموعد');
        toast.info('تم إلغاء الموعد');
      }}
    >
      cancel
    </button>
  );
}

describe('ToastProvider duplicate protection', () => {
  test('shows one cancellation toast when mutation and websocket echoes overlap', () => {
    render(
      <ToastProvider>
        <DuplicateCancellationTrigger />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'cancel' }));

    expect(screen.getAllByText('تم إلغاء الموعد')).toHaveLength(1);
  });
});