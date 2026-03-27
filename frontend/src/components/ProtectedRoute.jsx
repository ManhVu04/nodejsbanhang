import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

export default function ProtectedRoute({ children, adminOnly = false }) {
    const { user } = useSelector(state => state.auth);

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (adminOnly && user.role?.name !== 'Admin') {
        return <Navigate to="/" replace />;
    }

    return children;
}
