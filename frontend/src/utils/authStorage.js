const AUTH_KEYS = ['token', 'role', 'user', 'refresh_token'];
const AUTH_EVENT_NAME = 'auth-session-changed';

const hasUsableValue = (value) => Boolean(value && value !== 'undefined' && value !== 'null');

const parseJson = (value) => {
    if (!hasUsableValue(value)) {
        return null;
    }

    try {
        return JSON.parse(value);
    } catch {
        return null;
    }
};

const getTokenTimestamp = (token) => {
    if (!hasUsableValue(token)) {
        return 0;
    }

    try {
        const [, payload] = token.split('.');
        if (!payload) {
            return 0;
        }

        const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
        const decoded = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='));
        const jwtPayload = JSON.parse(decoded);

        return Number(jwtPayload.iat || jwtPayload.exp || 0);
    } catch {
        return 0;
    }
};

const getStorageSnapshot = (storageName, storage) => {
    const token = storage.getItem('token');
    const role = storage.getItem('role');
    const user = storage.getItem('user');
    const refreshToken = storage.getItem('refresh_token');
    const hasToken = hasUsableValue(token);

    return {
        storage,
        storageName,
        token: hasToken ? token : null,
        role: hasUsableValue(role) ? role : null,
        user,
        userData: parseJson(user),
        refreshToken: hasUsableValue(refreshToken) ? refreshToken : null,
        score: (hasToken ? 4 : 0) + (hasUsableValue(role) ? 3 : 0) + (hasUsableValue(user) ? 1 : 0) + (hasUsableValue(refreshToken) ? 1 : 0),
        timestamp: hasToken ? getTokenTimestamp(token) : 0,
    };
};

export const getStoredAuthSession = () => {
    const snapshots = [
        getStorageSnapshot('localStorage', localStorage),
        getStorageSnapshot('sessionStorage', sessionStorage),
    ].filter((snapshot) => snapshot.token);

    if (!snapshots.length) {
        return {
            storage: null,
            token: null,
            role: null,
            user: null,
            userData: null,
            refreshToken: null,
            storageName: null,
        };
    }

    const [active] = [...snapshots].sort((left, right) => {
        if (right.score !== left.score) {
            return right.score - left.score;
        }

        if (right.timestamp !== left.timestamp) {
            return right.timestamp - left.timestamp;
        }

        return left.storageName === 'localStorage' ? -1 : 1;
    });

    return active;
};

export const persistAuthSession = ({ storage, token, role, user, refreshToken }) => {
    clearStoredAuth();

    if (hasUsableValue(token)) {
        storage.setItem('token', token);
    }

    if (hasUsableValue(role)) {
        storage.setItem('role', role);
    }

    if (user) {
        storage.setItem('user', JSON.stringify(user));
    }

    if (hasUsableValue(refreshToken)) {
        storage.setItem('refresh_token', refreshToken);
    }

    window.dispatchEvent(new CustomEvent(AUTH_EVENT_NAME, {
        detail: {
            token: hasUsableValue(token) ? token : null,
            role: hasUsableValue(role) ? role : null,
        },
    }));
};

export const clearStoredAuth = () => {
    AUTH_KEYS.forEach((key) => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
    });
    window.dispatchEvent(new CustomEvent(AUTH_EVENT_NAME, {
        detail: { token: null, role: null },
    }));
};

export const getRouteForRole = (role) => {
    if (role === 'doctor') {
        return '/doctor';
    }

    if (role === 'organization') {
        return '/hospital/dashboard';
    }

    if (role === 'patient') {
        return '/patient';
    }

    return null;
};

export const AUTH_SESSION_EVENT = AUTH_EVENT_NAME;
