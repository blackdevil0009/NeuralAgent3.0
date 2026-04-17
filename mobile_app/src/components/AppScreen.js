import React from 'react';
import { View, Text, StyleSheet, Platform, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import theme from '../styles/theme';

export default function AppScreen({ title, subtitle, children, navigation, showBack = false, headerLeft, headerRight }) {
    return (
        <SafeAreaView style={styles.safeArea}>
            <LinearGradient
                colors={[theme.colors.primaryLight, theme.colors.primaryDark]}
                style={styles.background}
            >
                <View style={styles.header}>
                    {headerLeft ? headerLeft() : showBack && (
                        <TouchableOpacity style={styles.backBtn} onPress={() => navigation?.goBack()}>
                            <Text style={styles.backText}>←</Text>
                        </TouchableOpacity>
                    )}
                    <View style={styles.titleContainer}>
                        <Text style={styles.title}>{title}</Text>
                        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
                    </View>
                    {headerRight && headerRight()}
                </View>

                <View style={styles.contentContainer}>
                    <ScrollView 
                        contentContainerStyle={styles.scrollContent} 
                        showsVerticalScrollIndicator={false}
                    >
                        {children}
                    </ScrollView>
                </View>
            </LinearGradient>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.colors.primaryLight },
    background: { flex: 1 },
    header: {
        paddingHorizontal: theme.layout.padding * 1.5,
        paddingTop: Platform.OS === 'android' ? 40 : 20,
        paddingBottom: 20,
        flexDirection: 'row',
        alignItems: 'center',
    },
    backBtn: {
        marginRight: 15,
        padding: 5,
    },
    backText: {
        fontSize: 24,
        color: theme.colors.accentGold,
        fontWeight: 'bold',
    },
    titleContainer: { flex: 1 },
    title: {
        fontSize: 26,
        fontWeight: 'bold',
        color: theme.colors.white,
        letterSpacing: 1,
    },
    subtitle: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.7)',
        marginTop: 4,
    },
    contentContainer: {
        flex: 1,
        backgroundColor: theme.colors.backgroundSurface,
        borderTopLeftRadius: 35,
        borderTopRightRadius: 35,
        overflow: 'hidden',
    },
    scrollContent: {
        flexGrow: 1,
        padding: theme.layout.padding * 1.5,
        paddingBottom: 80,
    }
});
