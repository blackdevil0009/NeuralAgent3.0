import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import AppScreen from '../../components/AppScreen';
import DashboardCard from '../../components/DashboardCard';
import theme from '../../styles/theme';

export default function AppointmentsScreen({ navigation }) {
    const [filter, setFilter] = useState('All');

    const filters = ['All', 'Upcoming', 'Completed', 'Cancelled', 'Paid'];

    const mockAppointments = [
        {
            id: 1,
            date: { day: '15', month: 'Apr' },
            doctor: 'Dr. Sharma',
            spec: 'Ayurveda',
            time: '10:30 AM',
            type: 'Video Consult',
            status: 'Confirmed',
            payment: 'Paid',
            amount: '₹500'
        },
        {
            id: 2,
            date: { day: '20', month: 'Apr' },
            doctor: 'Dr. Verma',
            spec: 'Nutrition',
            time: '02:00 PM',
            type: 'In-Person',
            status: 'Pending',
            payment: 'Pending Payment',
            amount: '₹800'
        }
    ];

    return (
        <AppScreen title="📅 Appointments" subtitle="Manage your upcoming and past consultations" showBack={true} navigation={navigation}>
            
            <TouchableOpacity style={styles.bookBtn} activeOpacity={0.8}>
                <Text style={styles.bookBtnText}>+ Book New Appointment</Text>
            </TouchableOpacity>

            <View style={styles.statsRow}>
                <View style={[styles.statBox, { borderColor: theme.colors.inputBorder }]}>
                    <Text style={styles.statIcon}>📅</Text>
                    <Text style={styles.statVal}>2</Text>
                    <Text style={styles.statLabel}>Confirmed</Text>
                </View>
                <View style={[styles.statBox, { borderColor: '#a9dfbf' }]}>
                    <Text style={styles.statIcon}>✅</Text>
                    <Text style={styles.statVal}>5</Text>
                    <Text style={styles.statLabel}>Completed</Text>
                </View>
                <View style={[styles.statBox, { borderColor: '#f5c6cb' }]}>
                    <Text style={styles.statIcon}>💳</Text>
                    <Text style={styles.statVal}>1</Text>
                    <Text style={styles.statLabel}>Pending</Text>
                </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContainer}>
                {filters.map(f => (
                    <TouchableOpacity 
                        key={f} 
                        style={[styles.filterChip, filter === f && styles.filterChipActive]}
                        onPress={() => setFilter(f)}
                    >
                        <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <View style={styles.listContainer}>
                {mockAppointments.map(appt => (
                    <View key={appt.id} style={styles.appointmentCard}>
                        <View style={styles.dateBlock}>
                            <Text style={styles.dateDay}>{appt.date.day}</Text>
                            <Text style={styles.dateMonth}>{appt.date.month}</Text>
                        </View>
                        
                        <View style={styles.cardContent}>
                            <Text style={styles.doctorName}>🌿 {appt.doctor}</Text>
                            <Text style={styles.metaText}>{appt.spec}  •  ⏰ {appt.time}  •  {appt.type}</Text>
                            
                            {appt.payment === 'Paid' && (
                                <View style={styles.unlockedBox}>
                                    <Text style={styles.unlockedTitle}>🔓 Doctor Contact (Unlocked)</Text>
                                    <Text style={styles.unlockedText}>📞 +91 9876543210</Text>
                                </View>
                            )}
                            
                            <View style={styles.pillsRow}>
                                <View style={[styles.pill, appt.payment === 'Paid' ? styles.pillGreen : styles.pillYellow]}>
                                    <Text style={styles.pillText}>{appt.payment}</Text>
                                </View>
                                <View style={[styles.pill, appt.status === 'Confirmed' ? styles.pillBlue : styles.pillGrey]}>
                                    <Text style={styles.pillText}>{appt.status}</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                ))}
            </View>
        </AppScreen>
    );
}

const styles = StyleSheet.create({
    bookBtn: {
        backgroundColor: theme.colors.primaryDark,
        padding: 14,
        borderRadius: 50,
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: theme.colors.primaryDark,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 6,
    },
    bookBtnText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    statBox: {
        flex: 1,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderRadius: 16,
        padding: 12,
        alignItems: 'center',
        marginHorizontal: 4,
        ...theme.layout.shadow,
        shadowOpacity: 0.08,
    },
    statIcon: { fontSize: 20, marginBottom: 4 },
    statVal: { fontSize: 20, fontWeight: 'bold', color: theme.colors.textDark },
    statLabel: { fontSize: 10, color: theme.colors.textMuted, marginTop: 2 },
    filterScroll: {
        marginBottom: 16,
    },
    filterContainer: {
        paddingVertical: 5,
        paddingHorizontal: 2,
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: theme.colors.inputBorder,
        marginRight: 10,
        backgroundColor: '#fff',
    },
    filterChipActive: {
        backgroundColor: theme.colors.primaryLight,
        borderColor: theme.colors.primaryLight,
    },
    filterText: {
        color: theme.colors.textMuted,
        fontWeight: '600',
        fontSize: 13,
    },
    filterTextActive: {
        color: '#fff',
    },
    listContainer: {
        marginTop: 10,
    },
    appointmentCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(45, 106, 79, 0.1)',
        ...theme.layout.shadow,
        shadowOpacity: 0.1,
    },
    dateBlock: {
        backgroundColor: '#f4faf6',
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
        borderWidth: 1,
        borderColor: '#eaf5ee',
        alignSelf: 'flex-start',
    },
    dateDay: {
        fontSize: 22,
        fontWeight: 'bold',
        color: theme.colors.primaryGreen,
    },
    dateMonth: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.primaryLight,
        textTransform: 'uppercase',
    },
    cardContent: {
        flex: 1,
    },
    doctorName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.textDark,
        marginBottom: 2,
    },
    metaText: {
        fontSize: 12,
        color: theme.colors.textMuted,
        marginBottom: 8,
    },
    unlockedBox: {
        backgroundColor: '#f0faf4',
        borderWidth: 1,
        borderColor: '#c8e6c9',
        borderRadius: 8,
        padding: 8,
        marginBottom: 10,
    },
    unlockedTitle: {
        fontSize: 11,
        fontWeight: 'bold',
        color: theme.colors.primaryGreen,
        marginBottom: 2,
    },
    unlockedText: {
        fontSize: 12,
        color: theme.colors.textDark,
    },
    pillsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    pill: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    pillGreen: { backgroundColor: 'rgba(39, 174, 96, 0.15)' },
    pillYellow: { backgroundColor: 'rgba(243, 156, 18, 0.15)' },
    pillBlue: { backgroundColor: 'rgba(41, 128, 185, 0.12)' },
    pillGrey: { backgroundColor: 'rgba(0, 0, 0, 0.05)' },
    pillText: {
        fontSize: 11,
        fontWeight: '600',
        color: theme.colors.textDark,
    }
});
