import { createContext, useContext, type ReactNode } from 'react';
import { notification } from 'antd';

interface AppNotificationApi {
    login: () => void;
    logout: () => void;
    memorialCreated: (fullName: string) => void;
    photoUploaded: (fullName?: string | null) => void;
    candleLit: (fullName?: string | null) => void;
    tributeShared: (fullName?: string | null) => void;
}

const noop = () => { };

const defaultNotifications: AppNotificationApi = {
    login: noop,
    logout: noop,
    memorialCreated: noop,
    photoUploaded: noop,
    candleLit: noop,
    tributeShared: noop,
};

const AppNotificationContext = createContext<AppNotificationApi>(defaultNotifications);

export function AppNotificationProvider({ children }: { children: ReactNode }) {
    const [api, contextHolder] = notification.useNotification({
        placement: 'bottomRight',
        duration: 4,
        maxCount: 3,
    });

    const notifications: AppNotificationApi = {
        login() {
            api.success({
                title: 'Signed in',
                description: 'You are now signed in.',
                role: 'status',
            });
        },
        logout() {
            api.info({
                title: 'Signed out',
                description: 'You have been signed out.',
                role: 'status',
            });
        },
        memorialCreated(fullName) {
            api.success({
                title: 'Memorial created',
                description: `${fullName}'s memorial is ready.`,
                role: 'status',
            });
        },
        photoUploaded(fullName) {
            api.success({
                title: 'Photo uploaded',
                description: fullName
                    ? `The photo is now part of ${fullName}'s memorial.`
                    : 'The photo has been added successfully.',
                role: 'status',
            });
        },
        candleLit(fullName) {
            api.success({
                title: 'Candle lit',
                description: fullName
                    ? `Your candle is now glowing for ${fullName}.`
                    : 'Your candle has been lit.',
                role: 'status',
            });
        },
        tributeShared(fullName) {
            api.success({
                title: 'Tribute shared',
                description: fullName
                    ? `Your tribute was added to ${fullName}'s memorial.`
                    : 'Your tribute has been shared.',
                role: 'status',
            });
        },
    };

    return (
        <AppNotificationContext.Provider value={notifications}>
            {contextHolder}
            {children}
        </AppNotificationContext.Provider>
    );
}

export function useAppNotifications() {
    return useContext(AppNotificationContext);
}