import React, { useState } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TextInput, 
    TouchableOpacity, 
    KeyboardAvoidingView, 
    Platform, 
    Dimensions,
    SafeAreaView,
    ScrollView,
    Keyboard
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function LoginScreen({ navigation }) {
    const [role, setRole] = useState('patient');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleLogin = () => {
        setLoading(true);
        Keyboard.dismiss();
        setTimeout(() => {
            setLoading(false);
            if (role === 'patient') {
                navigation.replace('PatientDashboard');
            } else {
                navigation.replace('DoctorDashboard');
            }
        }, 1500);
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <LinearGradient
                colors={['#52b788', '#2d6a4f', '#18402a']}
                style={styles.background}
            >
                <KeyboardAvoidingView 
                    style={styles.keyboardContainer} 
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <ScrollView 
                        contentContainerStyle={styles.scrollContent} 
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View style={styles.cardContainer}>
                            {/* Header */}
                            <LinearGradient
                                colors={['#2d6a4f', '#162e1e']}
                                style={styles.cardHeader}
                            >
                                <Text style={styles.logo}>🌿 VaidyaMed-X</Text>
                                <Text style={styles.tagline}>Ayurvedic AI Health Companion</Text>
                                <Text style={styles.lotus}>🪷</Text>
                                <View style={styles.headerCurveOverylay} />
                            </LinearGradient>

                            {/* Tabs */}
                            <View style={styles.tabsContainer}>
                                <TouchableOpacity 
                                    style={[styles.tabBtn, role === 'patient' && styles.tabBtnActive]}
                                    onPress={() => setRole('patient')}
                                >
                                    <Text style={[styles.tabText, role === 'patient' && styles.tabTextActive]}>🌿 Patient</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.tabBtn, role === 'doctor' && styles.tabBtnActive]}
                                    onPress={() => setRole('doctor')}
                                >
                                    <Text style={[styles.tabText, role === 'doctor' && styles.tabTextActive]}>👨‍⚕️ Doctor</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Form */}
                            <View style={styles.formContainer}>
                                <Text style={styles.welcomeTitle}>
                                    {role === 'patient' ? 'Welcome back 🌿' : 'Doctor Login 👨‍⚕️'}
                                </Text>
                                <Text style={styles.welcomeSub}>
                                    {role === 'patient' 
                                        ? 'Sign in to access your health dashboard.' 
                                        : 'Sign in to access your clinical dashboard.'}
                                </Text>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
                                    <TextInput 
                                        style={styles.input}
                                        value={email}
                                        onChangeText={setEmail}
                                        placeholder="email@example.com"
                                        placeholderTextColor="#aec8b4"
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>PASSWORD</Text>
                                    <View style={styles.passwordWrapper}>
                                        <TextInput 
                                            style={[styles.input, { flex: 1, paddingRight: 50 }]}
                                            value={password}
                                            onChangeText={setPassword}
                                            placeholder="••••••••"
                                            placeholderTextColor="#aec8b4"
                                            secureTextEntry={!showPass}
                                        />
                                        <TouchableOpacity 
                                            style={styles.eyeBtn}
                                            onPress={() => setShowPass(!showPass)}
                                        >
                                            <Text style={styles.eyeBtnText}>{showPass ? '🙈' : '👁️'}</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <View style={styles.row}>
                                    <TouchableOpacity 
                                        style={styles.checkboxRow}
                                        onPress={() => setRememberMe(!rememberMe)}
                                    >
                                        <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                                            {rememberMe && <Text style={styles.checkmark}>✓</Text>}
                                        </View>
                                        <Text style={styles.rememberText}>Remember me</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity>
                                        <Text style={styles.forgotText}>Forgot Password?</Text>
                                    </TouchableOpacity>
                                </View>

                                <TouchableOpacity 
                                    style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
                                    onPress={handleLogin}
                                    disabled={loading}
                                >
                                    <LinearGradient
                                        colors={['#2d6a4f', '#162e1e']}
                                        style={styles.loginBtnGradient}
                                    >
                                        <Text style={styles.loginBtnText}>
                                            {loading ? 'Checking...' : role === 'patient' ? 'Login as Patient 🌿' : 'Login as Doctor 👨‍⚕️'}
                                        </Text>
                                    </LinearGradient>
                                </TouchableOpacity>

                                <View style={styles.registerCta}>
                                    <Text style={styles.registerSub}>New to VaidyaMed-X? </Text>
                                    <TouchableOpacity onPress={() => navigation.navigate('Registration')}>
                                        <Text style={styles.registerLink}>Create an account</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={styles.shlokaBanner}>
                                <Text style={styles.shlokaText}>
                                    "स्वस्थस्य स्वास्थ्य रक्षणं, आतुरस्य विकार प्रशमनम्"
                                </Text>
                                <Text style={styles.shlokaSub}>
                                    — Preserve the health of the healthy; relieve the suffering of the sick.
                                </Text>
                            </View>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </LinearGradient>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#52b788', 
    },
    background: {
        flex: 1,
    },
    keyboardContainer: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingVertical: Platform.OS === 'android' ? 40 : 60,
        paddingHorizontal: Platform.OS === 'android' ? 16 : 24,
    },
    cardContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 26,
        overflow: 'hidden',
        shadowColor: '#143c1e',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.32,
        shadowRadius: 24,
        elevation: 12,
        maxWidth: 500,
        width: '100%',
        alignSelf: 'center',
    },
    cardHeader: {
        paddingTop: Platform.OS === 'ios' ? 40 : 36,
        paddingBottom: 28,
        paddingHorizontal: 24,
        alignItems: 'center',
        position: 'relative',
    },
    logo: {
        fontSize: Platform.OS === 'android' ? 26 : 28,
        fontWeight: 'bold',
        color: '#c9a84c',
        letterSpacing: 2,
    },
    tagline: {
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.70)',
        fontStyle: 'italic',
        marginTop: 6,
        letterSpacing: 0.5,
    },
    lotus: {
        fontSize: 24,
        marginTop: 10,
        opacity: 0.85,
    },
    headerCurveOverylay: {
        position: 'absolute',
        bottom: -2,
        left: 0,
        right: 0,
        height: 24,
        backgroundColor: '#ffffff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    tabsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 30,
        paddingTop: 16,
        gap: 12,
        justifyContent: 'space-between',
        backgroundColor: '#ffffff'
    },
    tabBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 50,
        borderWidth: 2,
        borderColor: '#52b788',
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    tabBtnActive: {
        backgroundColor: '#2d6a4f',
        borderColor: '#2d6a4f',
        elevation: 4,
        shadowColor: '#2d6a4f',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
    tabText: {
        color: '#2d6a4f',
        fontWeight: '600',
        fontSize: 14,
        letterSpacing: 0.7,
    },
    tabTextActive: {
        color: '#ffffff',
    },
    formContainer: {
        paddingHorizontal: 30,
        paddingVertical: 24,
        backgroundColor: '#ffffff'
    },
    welcomeTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#2d6a4f',
        marginBottom: 6,
    },
    welcomeSub: {
        fontSize: 13,
        color: '#5a755a',
        marginBottom: 24,
    },
    inputGroup: {
        marginBottom: 18,
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#5a755a',
        letterSpacing: 0.5,
        marginBottom: 6,
    },
    input: {
        width: '100%',
        paddingVertical: Platform.OS === 'android' ? 12 : 14,
        paddingHorizontal: 16,
        borderWidth: 1.8,
        borderColor: '#b7d9c2',
        borderRadius: 12,
        backgroundColor: '#f7fdf9',
        fontSize: 15,
        color: '#1a2e1a',
    },
    passwordWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        position: 'relative'
    },
    eyeBtn: {
        position: 'absolute',
        right: 15,
        height: '100%',
        justifyContent: 'center',
        paddingHorizontal: 5
    },
    eyeBtnText: {
        fontSize: 18,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 26,
    },
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    checkbox: {
        width: 18,
        height: 18,
        borderWidth: 1.5,
        borderColor: '#2d6a4f',
        borderRadius: 4,
        marginRight: 8,
        justifyContent: 'center',
        alignItems: 'center'
    },
    checkboxActive: {
        backgroundColor: '#2d6a4f',
    },
    checkmark: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    rememberText: {
        fontSize: 13,
        color: '#5a755a',
    },
    forgotText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#2d6a4f',
    },
    loginBtn: {
        width: '100%',
        borderRadius: 50,
        overflow: 'hidden',
        shadowColor: '#2d6a4f',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.36,
        shadowRadius: 12,
        elevation: 8,
    },
    loginBtnDisabled: {
        opacity: 0.7,
    },
    loginBtnGradient: {
        paddingVertical: Platform.OS === 'android' ? 14 : 16,
        alignItems: 'center',
    },
    loginBtnText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 1,
    },
    registerCta: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 20,
    },
    registerSub: {
        fontSize: 13,
        color: '#5a755a',
    },
    registerLink: {
        fontSize: 13,
        fontWeight: '700',
        color: '#2d6a4f',
    },
    shlokaBanner: {
        backgroundColor: '#f4faf6',
        borderTopWidth: 1.5,
        borderTopColor: 'rgba(45, 106, 79, 0.1)',
        paddingVertical: 16,
        paddingHorizontal: 24,
        alignItems: 'center',
    },
    shlokaText: {
        fontStyle: 'italic',
        fontSize: 13,
        color: '#2d6a4f',
        opacity: 0.9,
        textAlign: 'center',
        marginBottom: 4,
    },
    shlokaSub: {
        fontSize: 11,
        color: '#2d6a4f',
        opacity: 0.7,
        textAlign: 'center',
    }
});
