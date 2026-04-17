import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import AppScreen from '../../components/AppScreen';
import theme from '../../styles/theme';

export default function DoctorScheduleScreen({ navigation }) {
    const [selectedDay, setSelectedDay] = useState('Mon');
    
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    const schedule = [
        { time: '09:00 AM', status: 'Available' },
        { time: '10:00 AM', status: 'Booked', patient: 'Rahul Verma' },
        { time: '11:30 AM', status: 'Booked', patient: 'Priya Singh' },
        { time: '01:00 PM', status: 'Break' },
        { time: '02:15 PM', status: 'Booked', patient: 'Amit Kumar' },
        { time: '04:00 PM', status: 'Available' },
    ];

    return (
        <AppScreen title="Schedule" subtitle="Manage your availability" showBack={true} navigation={navigation}>
            
            {/* Week Calendar Strip */}
            <View style={styles.calendarStrip}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.calendarScroll}>
                    {days.map((d, i) => {
                        const dateNum = 10 + i; // mock date logic
                        const isActive = selectedDay === d;
                        return (
                            <TouchableOpacity 
                                key={d} 
                                style={[styles.dayCard, isActive && styles.dayCardActive]}
                                onPress={() => setSelectedDay(d)}
                            >
                                <Text style={[styles.dayText, isActive && styles.textWhite]}>{d}</Text>
                                <Text style={[styles.dateText, isActive && styles.textWhite]}>{dateNum}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            <View style={styles.headerRow}>
                <Text style={styles.sectionTitle}>Timeline for {selectedDay}</Text>
                <TouchableOpacity style={styles.editBtn}>
                    <Text style={styles.editBtnText}>Edit Slots</Text>
                </TouchableOpacity>
            </View>

            {/* Time Slots */}
            <View style={styles.slotsContainer}>
                {schedule.map((slot, idx) => (
                    <View key={idx} style={styles.slotRow}>
                        <Text style={styles.slotTime}>{slot.time}</Text>
                        
                        <View style={[
                            styles.slotCard, 
                            slot.status === 'Booked' ? styles.cardBooked :
                            slot.status === 'Break' ? styles.cardBreak : styles.cardAvailable
                        ]}>
                            <View>
                                <Text style={[
                                    styles.slotStatus, 
                                    slot.status === 'Booked' ? { color: '#1a4228' } :
                                    slot.status === 'Break' ? { color: '#856404'} : { color: theme.colors.primaryGreen }
                                ]}>
                                    {slot.status}
                                </Text>
                                {slot.patient && (
                                    <Text style={styles.slotPatient}>🌿 {slot.patient}</Text>
                                )}
                            </View>
                            
                            {slot.status === 'Available' && (
                                <View style={styles.availableIcon}>
                                    <Text style={{ color: theme.colors.primaryGreen, fontSize: 18 }}>+</Text>
                                </View>
                            )}
                        </View>
                    </View>
                ))}
            </View>

        </AppScreen>
    );
}

const styles = StyleSheet.create({
    calendarStrip: {
        marginBottom: 24,
    },
    calendarScroll: {
        gap: 12,
    },
    dayCard: {
        backgroundColor: '#fff',
        width: 60,
        paddingVertical: 14,
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(45, 106, 79, 0.1)',
    },
    dayCardActive: {
        backgroundColor: theme.colors.primaryDark,
        borderColor: theme.colors.primaryDark,
        ...theme.layout.shadow,
    },
    dayText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: theme.colors.textMuted,
        marginBottom: 4,
    },
    dateText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.textDark,
    },
    textWhite: {
        color: '#fff',
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.textDark,
    },
    editBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: 'rgba(82, 183, 136, 0.15)',
        borderRadius: 12,
    },
    editBtnText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: theme.colors.primaryGreen,
    },
    slotsContainer: {
        marginTop: 10,
    },
    slotRow: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    slotTime: {
        width: 75,
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textMuted,
        marginTop: 14,
    },
    slotCard: {
        flex: 1,
        padding: 16,
        borderRadius: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
    },
    cardBooked: {
        backgroundColor: '#f4faf6',
        borderColor: '#b7d9c2',
    },
    cardAvailable: {
        backgroundColor: '#fff',
        borderColor: 'rgba(45, 106, 79, 0.15)',
        borderStyle: 'dashed',
        borderWidth: 2,
    },
    cardBreak: {
        backgroundColor: '#fff3e0',
        borderColor: '#ffe0b2',
    },
    slotStatus: {
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    slotPatient: {
        fontSize: 15,
        fontWeight: 'bold',
        color: theme.colors.textDark,
        marginTop: 4,
    },
    availableIcon: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: 'rgba(82, 183, 136, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    }
});
