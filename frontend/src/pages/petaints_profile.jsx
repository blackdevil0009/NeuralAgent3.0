// This file now redirects to the new patient dashboard.
// The actual patient dashboard is at /patient/* with full sidebar navigation.
import { Navigate } from 'react-router-dom';
export default function PetaintsProfile() {
    return <Navigate to="/patient/health" replace />;
}
