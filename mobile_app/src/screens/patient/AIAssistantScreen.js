import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AppScreen from '../../components/AppScreen';
import theme from '../../styles/theme';

export default function AIAssistantScreen({ navigation }) {
    const [msg, setMsg] = useState('');
    
    const mockMessages = [
        { id: 1, sender: 'bot', text: 'Namaste! I am Vaidya-AI. How can I assist you with your health today?' },
        { id: 2, sender: 'user', text: 'I have been experiencing mild acid reflux after meals lately.' },
        { id: 3, sender: 'bot', text: 'This sounds like an imbalance in Pitta Dosha. Have you been eating spicy or fermented foods recently? Consider drinking warm water with a pinch of cumin and checking our diet recommendations.' },
    ];

    return (
        <AppScreen title="🤖 Vaidya-AI" subtitle="Your Ayurvedic Chat Companion" showBack={true} navigation={navigation}>
            
            <View style={{ flex: 1, minHeight: 400 }}>
                {/* Chat Area */}
                <ScrollView contentContainerStyle={styles.chatScroll} showsVerticalScrollIndicator={false}>
                    {mockMessages.map(m => (
                        <View key={m.id} style={[
                            styles.messageRow,
                            m.sender === 'user' ? styles.messageRowUser : styles.messageRowBot
                        ]}>
                            {m.sender === 'bot' && (
                                <LinearGradient colors={['#2d6a4f', '#0d2410']} style={styles.botAvatar}>
                                    <Text style={styles.botAvatarText}>A</Text>
                                </LinearGradient>
                            )}
                            
                            <View style={[
                                styles.messageBubble,
                                m.sender === 'user' ? styles.messageBubbleUser : styles.messageBubbleBot
                            ]}>
                                <Text style={[
                                    styles.messageText,
                                    m.sender === 'user' ? styles.messageTextUser : styles.messageTextBot
                                ]}>
                                    {m.text}
                                </Text>
                            </View>
                        </View>
                    ))}
                    
                    {/* Suggested Chips */}
                    <View style={styles.suggestionsContainer}>
                        <Text style={styles.suggestLabel}>Suggestions:</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <TouchableOpacity style={styles.suggestChip}>
                                <Text style={styles.suggestChipText}>Analyze my recent Blood Test</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.suggestChip}>
                                <Text style={styles.suggestChipText}>Diet for Pitta</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </ScrollView>
            </View>

            {/* Input Area */}
            <View style={styles.inputContainer}>
                <TextInput 
                    style={styles.input}
                    value={msg}
                    onChangeText={setMsg}
                    placeholder="Type your symptoms..."
                    placeholderTextColor="#aec8b4"
                    multiline
                />
                <TouchableOpacity style={styles.sendBtn} disabled={!msg.trim()}>
                    <LinearGradient colors={['#52b788', '#2d6a4f']} style={styles.sendBtnGradient}>
                        <Text style={styles.sendIcon}>➤</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>

        </AppScreen>
    );
}

const styles = StyleSheet.create({
    chatScroll: {
        flexGrow: 1,
        paddingBottom: 20,
    },
    messageRow: {
        flexDirection: 'row',
        marginBottom: 16,
        alignItems: 'flex-end',
    },
    messageRowUser: {
        justifyContent: 'flex-end',
    },
    messageRowBot: {
        justifyContent: 'flex-start',
    },
    botAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    botAvatarText: { color: '#fff', fontWeight: 'bold' },
    messageBubble: {
        maxWidth: '75%',
        padding: 14,
        borderRadius: 20,
        ...theme.layout.shadow,
        shadowOpacity: 0.08,
    },
    messageBubbleBot: {
        backgroundColor: '#fff',
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: 'rgba(45, 106, 79, 0.1)',
    },
    messageBubbleUser: {
        backgroundColor: theme.colors.primaryLight,
        borderBottomRightRadius: 4,
    },
    messageText: {
        fontSize: 14,
        lineHeight: 22,
    },
    messageTextBot: {
        color: theme.colors.textDark,
    },
    messageTextUser: {
        color: '#fff',
    },
    suggestionsContainer: {
        marginTop: 20,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    suggestLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        color: theme.colors.textMuted,
        marginBottom: 10,
        marginLeft: 4,
    },
    suggestChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#f4faf6',
        borderWidth: 1,
        borderColor: '#b7d9c2',
        marginRight: 10,
    },
    suggestChipText: {
        fontSize: 12,
        color: theme.colors.primaryGreen,
        fontWeight: '600',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 24,
        paddingHorizontal: 6,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: '#b7d9c2',
        ...theme.layout.shadow,
        shadowOpacity: 0.1,
        marginTop: 10,
    },
    input: {
        flex: 1,
        paddingHorizontal: 16,
        paddingVertical: 12,
        maxHeight: 100,
        fontSize: 15,
        color: theme.colors.textDark,
    },
    sendBtn: {
        borderRadius: 20,
        overflow: 'hidden',
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
