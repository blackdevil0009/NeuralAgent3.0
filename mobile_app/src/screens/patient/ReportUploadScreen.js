import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import AppScreen from '../../components/AppScreen';
import DashboardCard from '../../components/DashboardCard';
import theme from '../../styles/theme';

export default function ReportUploadScreen({ navigation }) {

    const mockReports = [
        { id: 1, name: 'Blood_Test_April.pdf', date: 'April 12, 2026', type: 'Pathology', status: 'Analyzed' },
        { id: 2, name: 'MRI_Scan_Lumbar.png', date: 'March 28, 2026', type: 'Radiology', status: 'Pending Review' }
    ];

    return (
        <AppScreen title="📄 Reports" subtitle="Upload and manage your medical records" showBack={true} navigation={navigation}>
            
            {/* Upload Area */}
            <TouchableOpacity style={styles.uploadBox} activeOpacity={0.7}>
                <View style={styles.uploadIconCircle}>
                    <Text style={styles.uploadIcon}>⬆️</Text>
                </View>
                <Text style={styles.uploadTitle}>Tap to Upload Report</Text>
                <Text style={styles.uploadSub}>Supports PDF, JPG, PNG (Max 10MB)</Text>
            </TouchableOpacity>

            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Uploads</Text>
                <View style={styles.sectionLine} />
            </View>

            {mockReports.map(report => (
                <View key={report.id} style={styles.reportCard}>
                    <View style={styles.reportIconBlock}>
                        <Text style={styles.reportIconText}>{report.type === 'Pathology' ? '🩸' : '🩻'}</Text>
                    </View>
                    <View style={styles.reportContent}>
                        <Text style={styles.reportName} numberOfLines={1}>{report.name}</Text>
                        <Text style={styles.reportMeta}>{report.date}  •  {report.type}</Text>
                        
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                            <View style={[styles.statusDot, { backgroundColor: report.status === 'Analyzed' ? theme.colors.successGreen : '#f39c12' }]} />
                            <Text style={styles.reportStatus}>{report.status}</Text>
                        </View>
                    </View>
                    <TouchableOpacity style={styles.actionBtn}>
                        <Text style={styles.actionIcon}>⋮</Text>
                    </TouchableOpacity>
                </View>
            ))}

        </AppScreen>
    );
}

const styles = StyleSheet.create({
    uploadBox: {
        borderWidth: 2,
        borderColor: '#b7d9c2',
        borderStyle: 'dashed',
        borderRadius: 20,
        padding: 30,
        alignItems: 'center',
        backgroundColor: '#f4faf6',
        marginBottom: 26,
    },
    uploadIconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: theme.colors.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: theme.colors.primaryLight,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    uploadIcon: { fontSize: 28 },
    uploadTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.primaryGreen,
        marginBottom: 4,
    },
    uploadSub: {
        fontSize: 12,
        color: theme.colors.textMuted,
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
    reportCard: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(45, 106, 79, 0.1)',
        ...theme.layout.shadow,
        shadowOpacity: 0.08,
    },
    reportIconBlock: {
        width: 50,
        height: 50,
        borderRadius: 12,
        backgroundColor: 'rgba(82, 183, 136, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    reportIconText: { fontSize: 24 },
    reportContent: { flex: 1 },
    reportName: {
        fontSize: 15,
        fontWeight: 'bold',
        color: theme.colors.textDark,
        marginBottom: 2,
    },
    reportMeta: {
        fontSize: 12,
        color: theme.colors.textMuted,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    reportStatus: {
        fontSize: 11,
        fontWeight: '600',
        color: theme.colors.textDark,
    },
    actionBtn: {
        padding: 8,
    },
    actionIcon: {
        fontSize: 20,
        color: theme.colors.textMuted,
        fontWeight: 'bold',
    }
});
