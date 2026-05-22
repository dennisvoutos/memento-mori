import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PrivacyPage } from './PrivacyPage';

describe('PrivacyPage', () => {
    it('renders only the privacy policy document', () => {
        render(
            <MemoryRouter>
                <PrivacyPage />
            </MemoryRouter>
        );

        expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
        expect(screen.queryByText('Terms of Service')).not.toBeInTheDocument();
    });

    it('renders the updated privacy content', () => {
        render(
            <MemoryRouter>
                <PrivacyPage />
            </MemoryRouter>
        );

        expect(
            screen.getByText(/this privacy policy explains how my memento mori/i)
        ).toBeInTheDocument();
    });
});