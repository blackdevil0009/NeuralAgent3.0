import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AppScreen from '../../components/AppScreen';
import DashboardCard from '../../components/DashboardCard';
import theme from '../../styles/theme';

export default function DoctorDashboardScreen({ navigation }) {
    const [menuVisible, setMenuVisible] = useState(false);

    const menuItems = [
        { title: 'My Schedule', icon: '📅', route: 'DoctorSchedule' },
        { title: 'Patient Management', icon: '👥', route: 'PatientManagement' },
        { title: 'Clinical Inbox', icon: '📩', route: 'DoctorInbox' },
        { title: 'AI Copilot', icon: '🤖', route: 'DoctorAIAssistant' },
        { title: 'Emergency Dashboard', icon: '🚨', route: 'EmergencyDashboard' },
        { title: 'Security Settings', icon: '🔐', route: 'DoctorSecuritySettings' }
    ];

    const HeaderLeft = () => (
        <TouchableOpacity style={styles.headerIconBtn} onPress={() => navigation.navigate('DoctorInbox')}>
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
            title="Clinical Dashboard" 
            subtitle="Welcome back, Dr. Sharma" 
            showBack={false} 
            navigation={navigation}
            headerLeft={HeaderLeft}
            headerRight={HeaderRight}
        >
            
            {/* Quick Stats Grid */}
            <View style={styles.grid}>
                <DashboardCard 
                    title="Today's Appts" 
                    value="12" 
                    icon="📅" 
                    color={theme.colors.successGreen}
                    style={styles.gridItem}
                    onPress={() => navigation.navigate('DoctorSchedule')}
                />
                <DashboardCard 
                    title="Total Patients" 
                    value="148" 
                    icon="👥" 
                    color={theme.colors.primaryLight}
                    style={styles.gridItem}
                    onPress={() => navigation.navigate('PatientManagement')}
                />
            </View>
            <View style={styles.grid}>
                <DashboardCard 
                    title="Unread MSGs" 
                    value="5" 
                    icon="📩" 
                    color={theme.colors.accentGold}
                    style={styles.gridItem}
                    onPress={() => navigation.navigate('DoctorInbox')}
                />
                <DashboardCard 
                    title="Emergencies" 
                    value="0" 
                    icon="🚨" 
                    color={theme.colors.errorRed}
                    style={styles.gridItem}
                    onPress={() => navigation.navigate('EmergencyDashboard')}
                />
            </View>

            {/* AI Assistant Banner */}
            <TouchableOpacity onPress={() => navigation.navigate('DoctorAIAssistant')} activeOpacity={0.8}>
                <LinearGradient
                    colors={['#1a4228', '#0d2410']}
                    style={styles.aiBanner}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                >
                    <Text style={styles.aiIcon}>🧠</Text>
                    <View style={styles.aiTextContainer}>
                        <Text style={styles.aiTitle}>Clinical AI Copilot</Text>
                        <Text style={styles.aiSub}>Analyze patient reports & generate notes</Text>
                    </View>
                    <Text style={styles.aiArrow}>→</Text>
                </LinearGradient>
            </TouchableOpacity>

            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Today's Schedule</Text>
                <View style={styles.sectionLine} />
            </View>

            {/* Schedule List */}
            <View style={styles.scheduleCard}>
                {[
                    { time: '10:00 AM', name: 'Rahul Verma', type: 'Follow-up', status: 'Waiting' },
                    { time: '11:30 AM', name: 'Priya Singh', type: 'First Consult', status: 'Confirmed' },
                    { time: '02:15 PM', name: 'Amit Kumar', type: 'Report Review', status: 'Confirmed' }
                ].map((item, index) => (
                    <View key={index} style={[styles.timelineItem, index === 2 && { borderBottomWidth: 0 }]}>
                        <View style={styles.timeBlock}>
                            <Text style={styles.timeText}>{item.time}</Text>
                        </View>
                        <View style={styles.timelineContent}>
                            <Text style={styles.timelineTitle}>{item.name}</Text>
                            <Text style={styles.timelineType}>{item.type}</Text>
                        </View>
                        <View style={[styles.statusPill, item.status === 'Waiting' ? styles.pillYellow : styles.pillGreen]}>
                            <Text style={styles.statusText}>{item.status}</Text>
                        </View>
                    </View>
                ))}
                
                <TouchableOpacity style={styles.viewAllBtn} onPress={() => navigation.navigate('DoctorSchedule')}>
                    <Text style={styles.viewAllText}>View Full Schedule</Text>
                </TouchableOpacity>
            </View>

            {/* Navigation Menu Modal */}
            <Modal visible={menuVisible} animationType="slide" transparent={true} onRequestClose={() => setMenuVisible(false)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setMenuVisible(false)}>
                    <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Doctor Tools</Text>
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
                                    {item.title === 'Emergency Dashboard' && <Text style={styles.urgentBadge}>SOS</Text>}
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
    grid: {
        flexDirection: 'row',
        gap: 12,
    },
    gridItem: {
        flex: 1,
        marginBottom: 12,
        padding: 16,
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
        color: theme.colors.accentGold,
    },
    aiSub: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.7)',
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
    scheduleCard: {
        backgroundColor: theme.colors.white,
        borderRadius: theme.layout.borderRadiusCard,
        padding: 20,
        ...theme.layout.shadow,
    },
    timelineItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(45, 106, 79, 0.1)',
    },
    timeBlock: {
        backgroundColor: '#f4faf6',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        marginRight: 14,
        borderWidth: 1,
        borderColor: '#eaf5ee'
    },
    timeText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: theme.colors.primaryDark,
    },
    timelineContent: { flex: 1 },
    timelineTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        color: theme.colors.textDark,
    },
    timelineType: {
        fontSize: 12,
        color: theme.colors.textMuted,
        marginTop: 2,
    },
    statusPill: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    pillYellow: { backgroundColor: 'rgba(243, 156, 18, 0.15)' },
    pillGreen: { backgroundColor: 'rgba(39, 174, 96, 0.15)' },
    statusText: {
        fontSize: 11,
        fontWeight: '600',
        color: theme.colors.textDark,
    },
    viewAllBtn: {
        marginTop: 16,
        alignItems: 'center',
        paddingVertical: 10,
        backgroundColor: 'rgba(82, 183, 136, 0.1)',
        borderRadius: 12,
    },
    viewAllText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: theme.colors.primaryGreen,
    }
});
