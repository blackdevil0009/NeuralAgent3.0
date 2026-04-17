import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AppScreen from '../../components/AppScreen';
import DashboardCard from '../../components/DashboardCard';
import theme from '../../styles/theme';

export default function PatientDashboardScreen({ navigation }) {
    const [menuVisible, setMenuVisible] = useState(false);

    const menuItems = [
        { title: 'My Profile', icon: '👤', route: 'Profile' },
        { title: 'Appointments', icon: '📅', route: 'Appointments' },
        { title: 'Medical Reports', icon: '📄', route: 'ReportUpload' },
        { title: 'Find Doctor', icon: '👨‍⚕️', route: 'FindDoctor' },
        { title: 'AI Consultant', icon: '🤖', route: 'AIAssistant' },
        { title: 'Emergency SOS', icon: '🚨', route: 'EmergencyDashboard' }
    ];

    const HeaderLeft = () => (
        <TouchableOpacity style={styles.headerIconBtn} onPress={() => navigation.navigate('PatientInbox')}>
            <Text style={styles.headerIcon}>📩</Text>
        </TouchableOpacity>
    );

    const HeaderRight = () => (
        <TouchableOpacity style={styles.headerIconBtn} onPress={() => setMenuVisible(true)}>
            <Text style={styles.headerIcon}>☰</Text>
        </TouchableOpacity>
    );

    return (
        <AppScreen 
            title="Health Dashboard" 
            subtitle="Overview of your Ayurvedic profile" 
            showBack={false} 
            navigation={navigation}
            headerLeft={HeaderLeft}
            headerRight={HeaderRight}
        >
            
            {/* Hero Banner */}
            <LinearGradient
                colors={['#1a4228', '#0d2410']}
                style={styles.heroBanner}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <View style={styles.heroTextContainer}>
                    <Text style={styles.heroTitle}>Vata-Pitta</Text>
                    <Text style={styles.heroSub}>Primary Dosha Constitution</Text>
                </View>
                <View style={styles.heroScoreContainer}>
                    <Text style={styles.heroScore}>82</Text>
                    <Text style={styles.heroScoreLabel}>Wellness Score</Text>
                </View>
            </LinearGradient>

            {/* Quick Stats Grid */}
            <View style={styles.grid}>
                <DashboardCard 
                    title="Appointments" 
                    value="2 Upcoming" 
                    icon="📅" 
                    color={theme.colors.successGreen}
                    style={styles.gridItem}
                    onPress={() => navigation.navigate('Appointments')}
                />
                <DashboardCard 
                    title="Recent Reports" 
                    value="3 New" 
                    icon="📄" 
                    color={theme.colors.accentGold}
                    style={styles.gridItem}
                    onPress={() => navigation.navigate('ReportUpload')}
                />
            </View>

            {/* AI Assistant Banner */}
            <TouchableOpacity onPress={() => navigation.navigate('AIAssistant')} activeOpacity={0.8}>
                <LinearGradient
                    colors={['#52b788', '#2d6a4f']}
                    style={styles.aiBanner}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                >
                    <Text style={styles.aiIcon}>🤖</Text>
                    <View style={styles.aiTextContainer}>
                        <Text style={styles.aiTitle}>Ask Vaidya-AI</Text>
                        <Text style={styles.aiSub}>Analyze symptoms or get Ayurvedic remedies</Text>
                    </View>
                    <Text style={styles.aiArrow}>→</Text>
                </LinearGradient>
            </TouchableOpacity>

            {/* Section Title */}
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Activity</Text>
                <View style={styles.sectionLine} />
            </View>

            {/* Timeline */}
            <View style={styles.timelineCard}>
                <View style={styles.timelineItem}>
                    <View style={styles.timelineDot} />
                    <View style={styles.timelineContent}>
                        <Text style={styles.timelineTitle}>Consultation with Dr. Sharma</Text>
                        <Text style={styles.timelineTime}>Today, 10:30 AM</Text>
                    </View>
                </View>
                <View style={styles.timelineItem}>
                    <View style={styles.timelineDot} />
                    <View style={styles.timelineContent}>
                        <Text style={styles.timelineTitle}>Updated Daily Diet Log</Text>
                        <Text style={styles.timelineTime}>Yesterday, 08:00 PM</Text>
                    </View>
                </View>
                <View style={[styles.timelineItem, { borderBottomWidth: 0 }]}>
                    <View style={styles.timelineDot} />
                    <View style={styles.timelineContent}>
                        <Text style={styles.timelineTitle}>Blood Test Report Uploaded</Text>
                        <Text style={styles.timelineTime}>12 April, 02:15 PM</Text>
                    </View>
                </View>
            </View>
            
            {/* Navigation Menu Modal */}
            <Modal visible={menuVisible} animationType="slide" transparent={true} onRequestClose={() => setMenuVisible(false)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setMenuVisible(false)}>
                    <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Menu</Text>
                            <TouchableOpacity onPress={() => setMenuVisible(false)}>
                                <Text style={styles.closeIcon}>✕</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.menuList}>
                            {menuItems.map((item, index) => (
                                <TouchableOpacity 
                                    key={index} 
                                    style={styles.menuItem} 
                                    onPress={() => {
                                        setMenuVisible(false);
                                        navigation.navigate(item.route);
                                    }}
                                >
                                    <View style={styles.menuIconBox}><Text style={{fontSize:20}}>{item.icon}</Text></View>
                                    <Text style={styles.menuItemText}>{item.title}</Text>
                                    {item.title === 'Emergency SOS' && <Text style={styles.urgentBadge}>SOS</Text>}
                                </TouchableOpacity>
                            ))}
                        </View>
                        <TouchableOpacity style={styles.logoutBtn} onPress={() => { setMenuVisible(false); navigation.replace('Login'); }}>
                            <Text style={styles.logoutText}>Log Out</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </AppScreen>
    );
}

const styles = StyleSheet.create({
    headerIconBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 4,
    },
    headerIcon: {
        fontSize: 22,
        color: '#fff',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: theme.colors.primaryDark,
    },
    closeIcon: {
        fontSize: 24,
        color: theme.colors.textMuted,
        padding: 5,
    },
    menuList: { gap: 12 },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(45, 106, 79, 0.08)',
    },
    menuIconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#f4faf6',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    menuItemText: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.textDark,
    },
    urgentBadge: {
        backgroundColor: 'rgba(231, 76, 60, 0.15)',
        color: '#e74c3c',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        fontSize: 10,
        fontWeight: 'bold',
    },
    logoutBtn: {
        marginTop: 24,
        paddingVertical: 14,
        borderRadius: 16,
        backgroundColor: 'rgba(231, 76, 60, 0.1)',
        alignItems: 'center',
    },
    logoutText: {
        color: '#e74c3c',
        fontSize: 15,
        fontWeight: 'bold',
    },
    heroBanner: {
        borderRadius: theme.layout.borderRadiusCard,
        padding: 24,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
        ...theme.layout.shadow,
    },
    heroTextContainer: { flex: 1 },
    heroTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.accentAmber,
        marginBottom: 4,
    },
    heroSub: {
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.72)',
    },
    heroScoreContainer: {
        alignItems: 'center',
    },
    heroScore: {
        fontSize: 36,
        fontWeight: 'bold',
        color: theme.colors.accentAmber,
    },
    heroScoreLabel: {
        fontSize: 11,
        color: 'rgba(255, 255, 255, 0.6)',
        marginTop: 2,
    },
    grid: {
        marginBottom: 10,
    },
    gridItem: {
        marginBottom: 12,
    },
    aiBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 18,
        borderRadius: theme.layout.borderRadiusCard,
        marginBottom: 24,
        ...theme.layout.shadow,
    },
    aiIcon: {
        fontSize: 32,
        marginRight: 16,
    },
    aiTextContainer: { flex: 1 },
    aiTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.white,
    },
    aiSub: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 2,
    },
    aiArrow: {
        fontSize: 20,
        color: theme.colors.white,
        fontWeight: 'bold',
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.textDark,
        marginRight: 12,
    },
    sectionLine: {
        flex: 1,
        height: 1.5,
        backgroundColor: '#b7d9c2',
    },
    timelineCard: {
        backgroundColor: theme.colors.white,
        borderRadius: theme.layout.borderRadiusCard,
        padding: 20,
        ...theme.layout.shadow,
    },
    timelineItem: {
        flexDirection: 'row',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(45, 106, 79, 0.1)',
    },
    timelineDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: theme.colors.primaryLight,
        marginTop: 4,
        marginRight: 14,
    },
    timelineContent: { flex: 1 },
    timelineTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.textDark,
    },
    timelineTime: {
        fontSize: 12,
        color: theme.colors.textMuted,
        marginTop: 2,
    }
});
