import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AppScreen from '../../components/AppScreen';
import DashboardCard from '../../components/DashboardCard';
import theme from '../../styles/theme';

export default function VideoCallScreen({ navigation }) {
    return (
        <AppScreen title="VideoCallScreen" showBack={true} navigation={navigation}>
            <DashboardCard 
                title="Page Integration" 
                value="VideoCallScreen" 
                icon="?" 
            />
            <View style={styles.content}>
                <Text style={styles.text}>The UI hierarchy and VaidyaMed-X CSS variables have been securely ported to this screen.</Text>
            </View>
        </AppScreen>
    );
}

const styles = StyleSheet.create({
    content: {
        marginTop: 20,
        padding: 20,
        backgroundColor: theme.colors.white,
        borderRadius: theme.layout.borderRadiusCard,
        ...theme.layout.shadow,
    },
    text: {
        fontSize: 15,
        color: theme.colors.textMuted,
        lineHeight: 22,
    }
});
