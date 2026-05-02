import { Navigate, useLocation } from 'react-router-dom';
import { Spin } from 'antd';
import { useSelector } from 'react-redux';

export default function ProtectedRoute({ children, adminOnly = false }) {
    const location = useLocation();
    const { user, token, loading } = useSelector(state => state.auth);

    if (token && !user && loading) {
        return <div className="page-container" style={{ textAlign: 'center', paddingTop: 80 }}><Spin size="large" /></div>;
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (adminOnly && user.role?.name !== 'Admin') {
        return <Navigate to="/" replace />;
    }

    return children;
}
