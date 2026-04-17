import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import theme from '../../styles/theme';

export default function ForgotPasswordScreen({ navigation }) {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    const handleReset = () => {
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            navigation.navigate('TwoFactorAuth', { email }); // pass to verify
        }, 1500);
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <LinearGradient colors={[theme.colors.primaryLight, theme.colors.primaryDark]} style={styles.background}>
                <KeyboardAvoidingView 
                    style={styles.keyboardContainer}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <View style={styles.header}>
                        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                            <Text style={styles.backText}>←</Text>
                        </TouchableOpacity>
                        <Text style={styles.title}>Reset Password</Text>
                    </View>

                    <View style={styles.cardContainer}>
                        <View style={styles.iconCircle}>
                            <Text style={styles.icon}>🔓</Text>
                        </View>
                        <Text style={styles.subtitle}>Enter your registered email address to receive password reset instructions.</Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
                            <TextInput 
                                style={styles.input}
                                value={email}
                                onChangeText={setEmail}
                                placeholder="patient@example.com"
                                placeholderTextColor="#aec8b4"
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>

                        <TouchableOpacity 
                            style={[styles.btn, loading && styles.btnDisabled]}
                            onPress={handleReset}
                            disabled={loading || !email.trim()}
                        >
                            <LinearGradient colors={[theme.colors.primaryGreen, theme.colors.primaryDark]} style={styles.btnGradient}>
                                <Text style={styles.btnText}>{loading ? 'Sending...' : 'Send Reset Link'}</Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.helpLink}>
                            <Text style={styles.helpText}>Need help? Contact support</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </LinearGradient>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.colors.primaryLight },
    background: { flex: 1 },
    keyboardContainer: { flex: 1, justifyContent: 'center' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        marginBottom: 20,
    },
    backBtn: { marginRight: 15, padding: 5 },
    backText: { fontSize: 24, color: theme.colors.accentGold, fontWeight: 'bold' },
    title: { fontSize: 28, fontWeight: 'bold', color: theme.colors.white },
    cardContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        marginHorizontal: 24,
        borderRadius: 26,
        padding: 30,
        ...theme.layout.shadow,
    },
    iconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(82, 183, 136, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        marginBottom: 20,
    },
    icon: { fontSize: 32 },
    subtitle: {
        fontSize: 14,
        color: theme.colors.textMuted,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
    inputGroup: { marginBottom: 24 },
    inputLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textMuted,
        marginBottom: 8,
        letterSpacing: 0.5,
    },
    input: {
        width: '100%',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderWidth: 1.5,
        borderColor: theme.colors.inputBorder,
        borderRadius: 12,
        backgroundColor: '#f7fdf9',
        fontSize: 15,
        color: theme.colors.textDark,
    },
    btn: {
        borderRadius: 50,
        overflow: 'hidden',
        ...theme.layout.shadow,
        elevation: 6,
    },
    btnDisabled: { opacity: 0.7 },
    btnGradient: {
        paddingVertical: 16,
        alignItems: 'center',
    },
    btnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    helpLink: {
        marginTop: 20,
        alignItems: 'center',
    },
    helpText: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.primaryGreen,
    }
});
