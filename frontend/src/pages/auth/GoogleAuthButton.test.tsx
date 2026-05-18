import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GoogleAuthButton } from './GoogleAuthButton';
import { auth } from '../../services/api';

vi.mock('../../services/api', () => ({
    auth: {
        googleConfig: vi.fn(),
    },
}));

const mockAuth = auth as {
    googleConfig: ReturnType<typeof vi.fn>;
};

describe('GoogleAuthButton', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        window.google = {
            accounts: {
                id: {
                    initialize: vi.fn(),
                    renderButton: vi.fn(),
                },
            },
        };

        mockAuth.googleConfig.mockResolvedValue({
            clientId: 'google-client-id',
        });
    });

    it('initializes the Google button only once during mount', async () => {
        const initialize = vi.mocked(window.google!.accounts!.id!.initialize);
        const renderButton = vi.mocked(window.google!.accounts!.id!.renderButton);

        render(
            <GoogleAuthButton
                label="Log in with Google"
                text="signin_with"
                onCredential={vi.fn().mockResolvedValue(undefined)}
                onError={vi.fn()}
            />
        );

        expect(screen.getByLabelText('Log in with Google')).toBeInTheDocument();

        await waitFor(() => {
            expect(mockAuth.googleConfig).toHaveBeenCalledTimes(1);
            expect(initialize).toHaveBeenCalledTimes(1);
            expect(renderButton).toHaveBeenCalledTimes(1);
        });
    });
});