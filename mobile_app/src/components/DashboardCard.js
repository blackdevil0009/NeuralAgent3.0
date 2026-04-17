import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import theme from '../styles/theme';

export default function DashboardCard({ title, value, subtitle, icon, color = theme.colors.primaryGreen, onPress, style }) {
    const CardContent = (
        <View style={[styles.card, style]}>
            <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
                <Text style={{ fontSize: 24, color }}>{icon || '🌿'}</Text>
            </View>
            <View style={styles.textContainer}>
                {title && <Text style={styles.title}>{title}</Text>}
                {value && <Text style={styles.value}>{value}</Text>}
                {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            </View>
        </View>
    );

    if (onPress) {
        return <TouchableOpacity onPress={onPress} activeOpacity={0.7}>{CardContent}</TouchableOpacity>;
    }

    return CardContent;
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: theme.colors.white,
        borderRadius: theme.layout.borderRadiusCard,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 8,
        ...theme.layout.shadow,
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    textContainer: {
        flex: 1,
    },
    title: {
        fontSize: 13,
        color: theme.colors.textMuted,
        textTransform: 'uppercase',
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    value: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.textDark,
        marginVertical: 4,
    },
    subtitle: {
        fontSize: 12,
        color: theme.colors.primaryLight,
        fontWeight: '500',
    }
});
