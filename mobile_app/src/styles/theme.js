export const colors = {
    primaryGreen: '#2d6a4f',
    primaryLight: '#52b788',
    primaryDark: '#18402a',
    accentGold: '#c9a84c',
    accentAmber: '#e9c46a',
    cardBg: 'rgba(255, 255, 255, 0.95)',
    inputBorder: '#b7d9c2',
    inputFocus: '#2d6a4f',
    errorRed: '#c0392b',
    successGreen: '#27ae60',
    textDark: '#1a2e1a',
    textMuted: '#5a755a',
    backgroundSurface: '#f7fdf9',
    sidebarBg: '#0d2410',
    white: '#ffffff'
};

export const typography = {
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.primaryGreen,
        letterSpacing: 0.5,
    },
    subtitle: {
        fontSize: 14,
        color: colors.textMuted,
        marginBottom: 20,
    },
    header: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.textDark,
        marginVertical: 10,
    },
    body: {
        fontSize: 14,
        color: colors.textDark,
    }
};

export const layout = {
    padding: 16,
    borderRadiusCard: 20,
    borderRadiusInput: 12,
    shadow: {
        shadowColor: '#143c1e',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 15,
        elevation: 8,
    }
};

export const theme = {
    colors,
    typography,
    layout
};

export default theme;
