import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Platform } from 'react-native';
import AppScreen from '../../components/AppScreen';
import theme from '../../styles/theme';

export default function PatientManagementScreen({ navigation }) {
    const [searchQuery, setSearchQuery] = useState('');

    const patients = [
        { id: 1, name: 'Rahul Verma', assigned: '10 April', status: 'Active', dosha: 'Vata', next: 'Tomorrow' },
        { id: 2, name: 'Priya Singh', assigned: '05 April', status: 'Stable', dosha: 'Pitta', next: 'Next Week' },
        { id: 3, name: 'Amit Kumar', assigned: '12 March', status: 'Critical', dosha: 'Kapha', next: 'Requires Action' }
    ];

    return (
        <AppScreen title="Patients" subtitle="Manage your assigned cases & records" showBack={true} navigation={navigation}>
            
            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput 
                    style={styles.searchInput}
                    placeholder="Search patients by name or ID..."
                    placeholderTextColor="#aec8b4"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            {/* List */}
            <View style={styles.listContainer}>
                {patients.map(p => (
                    <TouchableOpacity key={p.id} style={styles.patientCard} activeOpacity={0.7}>
                        <View style={styles.avatarRow}>
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>{p.name.charAt(0)}</Text>
                            </View>
                            <View style={styles.nameBlock}>
                                <Text style={styles.patientName}>{p.name}</Text>
                                <Text style={styles.patientMeta}>Assigned: {p.assigned}</Text>
                            </View>
                            <View style={[styles.statusPill, p.status === 'Critical' ? styles.pillRed : styles.pillGreen]}>
                                <Text style={styles.statusText}>{p.status}</Text>
                            </View>
                        </View>
                        
                        <View style={styles.cardDivider} />
                        
                        <View style={styles.infoRow}>
                            <View style={styles.infoBlock}>
                                <Text style={styles.infoLabel}>Dosha</Text>
                                <Text style={styles.infoValue}>{p.dosha}</Text>
                            </View>
                            <View style={styles.infoBlock}>
                                <Text style={styles.infoLabel}>Next Consult</Text>
                                <Text style={[styles.infoValue, p.status === 'Critical' && { color: theme.colors.errorRed }]}>
                                    {p.next}
                                </Text>
                            </View>
                            
                            <TouchableOpacity style={styles.actionBtn}>
                                <Text style={styles.actionBtnText}>View File</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                ))}
            </View>
        </AppScreen>
    );
}

const styles = StyleSheet.create({
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 50,
        paddingHorizontal: 16,
        paddingVertical:Platform.OS === 'android' ? 8 : 12,
        borderWidth: 1.5,
        borderColor: theme.colors.inputBorder,
        marginBottom: 20,
    },
    searchIcon: {
        fontSize: 18,
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: theme.colors.textDark,
    },
    listContainer: {
        marginTop: 5,
    },
    patientCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(45, 106, 79, 0.1)',
        ...theme.layout.shadow,
        shadowOpacity: 0.06,
    },
    avatarRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: theme.colors.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    avatarText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    nameBlock: { flex: 1 },
    patientName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.textDark,
    },
    patientMeta: {
        fontSize: 12,
        color: theme.colors.textMuted,
        marginTop: 2,
    },
    statusPill: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    pillGreen: { backgroundColor: 'rgba(39, 174, 96, 0.15)' },
    pillRed: { backgroundColor: 'rgba(231, 76, 60, 0.15)' },
    statusText: {
        fontSize: 11,
        fontWeight: '600',
        color: theme.colors.textDark,
    },
    cardDivider: {
        height: 1,
        backgroundColor: 'rgba(45, 106, 79, 0.08)',
        marginVertical: 14,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    infoBlock: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 11,
        color: theme.colors.textMuted,
        textTransform: 'uppercase',
        fontWeight: '600',
        marginBottom: 2,
    },
    infoValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: theme.colors.textDark,
    },
    actionBtn: {
        backgroundColor: 'rgba(82, 183, 136, 0.15)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    actionBtnText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: theme.colors.primaryGreen,
    }
});
