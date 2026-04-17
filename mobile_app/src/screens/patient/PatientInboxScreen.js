import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import theme from '../../styles/theme';

export default function PatientInboxScreen({ navigation }) {
    const [msg, setMsg] = useState('');
    
    // Using a tailored overlay instead of AppScreen to maximize chat space
    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Text style={styles.backText}>←</Text>
                </TouchableOpacity>
                <View style={styles.headerInfo}>
                    <Text style={styles.title}>Dr. Sharma</Text>
                    <Text style={styles.subtitle}>Online • Ayurveda Specialist</Text>
                </View>
                <TouchableOpacity style={styles.callBtn}>
                    <Text style={styles.callIcon}>📞</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.chatArea}>
                <ScrollView contentContainerStyle={styles.chatScroll} showsVerticalScrollIndicator={false}>
                    
                    <Text style={styles.dateDivider}>Today, 10:30 AM</Text>
                    
                    <View style={styles.messageRowBot}>
                        <LinearGradient colors={['#2d6a4f', '#0d2410']} style={styles.botAvatar}>
                            <Text style={styles.botAvatarText}>DS</Text>
                        </LinearGradient>
                        <View style={styles.messageBubbleBot}>
                            <Text style={styles.messageTextBot}>Namaste, your recent reports look much better. Are you still experiencing any joint pain?</Text>
                        </View>
                    </View>

                    <View style={styles.messageRowUser}>
                        <View style={styles.messageBubbleUser}>
                            <Text style={styles.messageTextUser}>No doctor, the pain is mostly gone. I've been following the diet plan strictly.</Text>
                        </View>
                        <Text style={styles.readReceipt}>Read 10:45 AM</Text>
                    </View>

                </ScrollView>
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <View style={styles.inputContainer}>
                    <TouchableOpacity style={styles.attachBtn}>
                        <Text style={styles.attachIcon}>📎</Text>
                    </TouchableOpacity>
                    <TextInput 
                        style={styles.input}
                        value={msg}
                        onChangeText={setMsg}
                        placeholder="Type a message..."
                        placeholderTextColor="#aec8b4"
                        multiline
                    />
                    <TouchableOpacity style={[styles.sendBtn, !msg.trim() && styles.sendBtnDisabled]} disabled={!msg.trim()}>
                        <LinearGradient colors={['#52b788', '#2d6a4f']} style={styles.sendBtnGradient}>
                            <Text style={styles.sendIcon}>➤</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#fcfdfc' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(45, 106, 79, 0.1)',
        ...theme.layout.shadow,
        shadowOpacity: 0.05,
    },
    backBtn: { padding: 10, marginRight: 5 },
    backText: { fontSize: 24, color: theme.colors.primaryGreen, fontWeight: 'bold' },
    headerInfo: { flex: 1 },
    title: { fontSize: 18, fontWeight: 'bold', color: theme.colors.textDark },
    subtitle: { fontSize: 12, color: theme.colors.primaryLight },
    callBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(82, 183, 136, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    callIcon: { fontSize: 18 },
    chatArea: {
        flex: 1,
        backgroundColor: '#f4faf6',
    },
    chatScroll: {
        flexGrow: 1,
        padding: 16,
        paddingBottom: 20,
    },
    dateDivider: {
        textAlign: 'center',
        fontSize: 11,
        color: theme.colors.textMuted,
        marginVertical: 16,
        fontWeight: '600',
    },
    messageRowUser: {
        alignItems: 'flex-end',
        marginBottom: 16,
    },
    messageRowBot: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginBottom: 16,
        maxWidth: '85%',
    },
    botAvatar: {
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    botAvatarText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
    messageBubbleBot: {
        backgroundColor: '#fff',
        padding: 14,
        borderRadius: 18,
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: 'rgba(45, 106, 79, 0.1)',
        ...theme.layout.shadow,
        shadowOpacity: 0.04,
    },
    messageBubbleUser: {
        backgroundColor: theme.colors.primaryGreen,
        padding: 14,
        borderRadius: 18,
        borderBottomRightRadius: 4,
        maxWidth: '85%',
        ...theme.layout.shadow,
        shadowOpacity: 0.1,
    },
    messageTextBot: { fontSize: 14, lineHeight: 22, color: theme.colors.textDark },
    messageTextUser: { fontSize: 14, lineHeight: 22, color: '#fff' },
    readReceipt: {
        fontSize: 10,
        color: theme.colors.textMuted,
        marginTop: 4,
        marginRight: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: 'rgba(45, 106, 79, 0.1)',
    },
    attachBtn: {
        padding: 10,
    },
    attachIcon: { fontSize: 22 },
    input: {
        flex: 1,
        backgroundColor: '#f7fdf9',
        borderWidth: 1,
        borderColor: '#b7d9c2',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        maxHeight: 100,
        fontSize: 15,
        color: theme.colors.textDark,
        marginHorizontal: 8,
    },
    sendBtn: {
        borderRadius: 20,
        overflow: 'hidden',
    },
    sendBtnDisabled: {
        opacity: 0.5,
    },
    sendBtnGradient: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 22,
    },
    sendIcon: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 2,
    }
});
