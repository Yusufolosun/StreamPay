import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { NotificationPanel } from '../../src/components/NotificationPanel';
import { useNotifications } from '../../src/hooks/useNotifications';
import { createMockNotification } from '../fixtures';

vi.mock('../../src/hooks/useNotifications', () => ({
  useNotifications: vi.fn(),
}));

describe('NotificationPanel', () => {
  const mockSetPanelOpen = vi.fn();
  const mockMarkRead = vi.fn();
  const mockMarkAllRead = vi.fn();
  const mockClearAll = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setupMock = (overrides = {}) => {
    vi.mocked(useNotifications).mockReturnValue({
      notifications: [],
      unreadCount: 0,
      isWsConnected: true,
      panelOpen: true,
      setPanelOpen: mockSetPanelOpen,
      markRead: mockMarkRead,
      markAllRead: mockMarkAllRead,
      clearAll: mockClearAll,
      addNotification: vi.fn(),
      ...overrides,
    });
  };

  it('renders nothing when panelOpen is false', () => {
    setupMock({ panelOpen: false });
    const { container } = render(<NotificationPanel />);
    expect(container.firstChild).toBeNull();
  });

  it('renders empty state message "All caught up!" when no notifications are present', () => {
    setupMock({ notifications: [] });
    render(<NotificationPanel />);

    expect(screen.getByText('All caught up!')).toBeInTheDocument();
    expect(screen.getByText("No new notifications. We'll update you when streams change.")).toBeInTheDocument();
  });

  it('displays notifications list', () => {
    const notifs = [
      createMockNotification({ title: 'Alert 1', message: 'Message 1' }),
      createMockNotification({ title: 'Alert 2', message: 'Message 2' }),
    ];
    setupMock({ notifications: notifs });

    render(<NotificationPanel />);

    expect(screen.getByText('Alert 1')).toBeInTheDocument();
    expect(screen.getByText('Message 1')).toBeInTheDocument();
    expect(screen.getByText('Alert 2')).toBeInTheDocument();
    expect(screen.getByText('Message 2')).toBeInTheDocument();
  });

  it('calls markAllRead when clicking "Mark All Read"', async () => {
    const notifs = [createMockNotification({ isRead: false })];
    setupMock({ notifications: notifs });

    render(<NotificationPanel />);

    const markAllReadBtn = screen.getByRole('button', { name: 'Mark All Read' });
    await userEvent.click(markAllReadBtn);

    expect(mockMarkAllRead).toHaveBeenCalledTimes(1);
  });

  it('calls clearAll when clicking "Clear All"', async () => {
    const notifs = [createMockNotification()];
    setupMock({ notifications: notifs });

    render(<NotificationPanel />);

    const clearAllBtn = screen.getByRole('button', { name: 'Clear All' });
    await userEvent.click(clearAllBtn);

    expect(mockClearAll).toHaveBeenCalledTimes(1);
  });

  it('applies bg-orange/5 class for unread notifications and border-l-transparent for read notifications', () => {
    const unread = createMockNotification({ id: 'u1', title: 'Unread Alert', isRead: false });
    const read = createMockNotification({ id: 'r1', title: 'Read Alert', isRead: true });
    setupMock({ notifications: [unread, read] });

    render(<NotificationPanel />);

    const unreadEl = screen.getByText(unread.title).closest('.border-l-2');
    const readEl = screen.getByText(read.title).closest('.border-l-2');

    expect(unreadEl?.className).toContain('bg-orange/5');
    expect(unreadEl?.className).toContain('border-l-orange');

    expect(readEl?.className).toContain('border-l-transparent');
    expect(readEl?.className).not.toContain('bg-orange/5');
  });
});
