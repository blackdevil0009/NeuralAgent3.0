import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import theme from '../../styles/theme';

export default function TwoFactorAuthScreen({ navigation, route }) {
    const { email } = route.params || { email: 'patient@example.com' };
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);

    const handleVerify = () => {
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            navigation.navigate('ResetPassword'); // Default progression
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
                        <Text style={styles.title}>Secure Login</Text>
                    </View>

                    <View style={styles.cardContainer}>
                        <View style={styles.iconCircle}>
                            <Text style={styles.icon}>🔐</Text>
                        </View>
                        <Text style={styles.subtitle}>Enter the 6-digit verification code sent to your email.</Text>
                        <Text style={styles.emailText}>{email}</Text>

                        <View style={styles.inputGroup}>
                            <TextInput 
                                style={styles.input}
                                value={code}
                                onChangeText={setCode}
                                placeholder="0 0 0 - 0 0 0"
                                placeholderTextColor="#aec8b4"
                                keyboardType="number-pad"
                                maxLength={6}
                                textAlign="center"
                            />
                        </View>

                        <TouchableOpacity 
                            style={[styles.btn, loading && styles.btnDisabled]}
                            onPress={handleVerify}
                            disabled={loading || code.length < 6}
                        >
                            <LinearGradient colors={[theme.colors.primaryGreen, theme.colors.primaryDark]} style={styles.btnGradient}>
                                <Text style={styles.btnText}>{loading ? 'Verifying...' : 'Verify Secure Code'}</Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        <View style={styles.resendBlock}>
                            <Text style={styles.resendText}>Didn't receive a code? </Text>
                            <TouchableOpacity>
                                <Text style={styles.resendLink}>Resend Now</Text>
                            </TouchableOpacity>
                        </View>
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
        backgroundColor: 'rgba(201, 168, 76, 0.15)',
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
        marginBottom: 8,
    },
    emailText: {
        fontSize: 15,
        fontWeight: 'bold',
        color: theme.colors.primaryGreen,
        textAlign: 'center',
        marginBottom: 24,
    },
    inputGroup: { marginBottom: 24 },
    input: {
        width: '100%',
        paddingVertical: 18,
        borderWidth: 2,
        borderColor: theme.colors.inputBorder,
        borderRadius: 16,
        backgroundColor: '#f7fdf9',
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.primaryDark,
        letterSpacing: 4,
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
    resendBlock: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 24,
    },
    resendText: {
        fontSize: 13,
        color: theme.colors.textMuted,
    },
    resendLink: {
        fontSize: 13,
        fontWeight: 'bold',
        color: theme.colors.primaryGreen,
    }
});
